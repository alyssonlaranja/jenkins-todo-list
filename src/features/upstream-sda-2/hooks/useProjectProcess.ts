'use client'

// ============================================================================
// Hook: useProjectProcess
// ============================================================================
// Hook React para detecção de process template do Azure DevOps
// NOTA: Este hook usa API route server-side para evitar problemas de CSP
import { useCallback, useRef, useState } from 'react'

import { PROCESS_MAPPINGS } from '../services/azure-devops-process.service'
import type {
  GenericWorkItemType,
  ProcessCompatibilityResult,
  ProcessDetectionOptions,
  ProcessTemplate,
  ProjectInfoApiResponse,
  ProjectProcessInfo,
  UseProjectProcessReturn,
} from '../types/azure-devops-process.types'

// ============================================================================
// Cache para evitar requisições repetidas
// ============================================================================

interface CacheEntry {
  data: ProjectProcessInfo
  timestamp: number
}

const processCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

function getCacheKey(organization: string, projectId: string): string {
  return `${organization}:${projectId}`
}

function getFromCache(key: string): ProjectProcessInfo | null {
  const entry = processCache.get(key)
  if (!entry) return null

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL
  if (isExpired) {
    processCache.delete(key)
    return null
  }

  return entry.data
}

function setInCache(key: string, data: ProjectProcessInfo): void {
  processCache.set(key, {
    data,
    timestamp: Date.now(),
  })
}

// ============================================================================
// Função para calcular compatibilidade localmente (evita usar service no client)
// ============================================================================

type CompatibilityLevel = 'full' | 'partial' | 'none'

function compatibilityLevelToNumber(level: CompatibilityLevel): number {
  switch (level) {
    case 'full':
      return 100
    case 'partial':
      return 50
    case 'none':
      return 0
    default:
      return 0
  }
}

function calculateCompatibility(
  processInfo: ProjectProcessInfo,
  expectedProcess: ProcessTemplate
): ProcessCompatibilityResult {
  const actualProcess = processInfo.processTemplate
  const isExactMatch = actualProcess === expectedProcess
  const mapping = PROCESS_MAPPINGS[expectedProcess] || PROCESS_MAPPINGS['Agile']

  // Se for processo customizado, precisa verificar work items
  if (processInfo.isCustomProcess) {
    const expectedMapping = PROCESS_MAPPINGS[expectedProcess]
    if (!expectedMapping) {
      return {
        isCompatible: false,
        detectedProcess: 'Custom',
        expectedProcess,
        compatibilityLevel: 0,
        mapping,
        missingTypes: [],
        warnings: [`Processo esperado '${expectedProcess}' não encontrado`],
        suggestions: [],
      }
    }

    // Verificar quais tipos estão faltando
    const actualTypes = new Set(
      processInfo.workItemTypes.map(t => t.name.toLowerCase())
    )
    const expectedTypes = expectedMapping.mappings.map(m =>
      m.azureDevOpsType.toLowerCase()
    )

    const missingTypes = expectedTypes.filter(t => !actualTypes.has(t))

    const hasAllRequired = missingTypes.length === 0
    const level: CompatibilityLevel = hasAllRequired
      ? 'full'
      : missingTypes.length <= 1
        ? 'partial'
        : 'none'

    return {
      isCompatible: hasAllRequired,
      detectedProcess: 'Custom',
      expectedProcess,
      compatibilityLevel: compatibilityLevelToNumber(level),
      mapping: expectedMapping,
      missingTypes,
      warnings: missingTypes.map(t => `Work item type '${t}' não encontrado`),
      suggestions: hasAllRequired
        ? []
        : [
            `Configure os tipos de work item faltantes: ${missingTypes.join(', ')}`,
          ],
    }
  }

  // Para processos padrão
  if (isExactMatch) {
    return {
      isCompatible: true,
      detectedProcess: actualProcess,
      expectedProcess,
      compatibilityLevel: 100,
      mapping,
      missingTypes: [],
      warnings: [],
      suggestions: [],
    }
  }

  // Processos diferentes - verificar compatibilidade
  const compatibilityMatrix: Record<
    ProcessTemplate,
    Record<ProcessTemplate, CompatibilityLevel>
  > = {
    Agile: {
      Agile: 'full',
      Scrum: 'partial',
      CMMI: 'partial',
      Basic: 'none',
      Custom: 'partial',
    },
    Scrum: {
      Agile: 'partial',
      Scrum: 'full',
      CMMI: 'partial',
      Basic: 'none',
      Custom: 'partial',
    },
    CMMI: {
      Agile: 'partial',
      Scrum: 'partial',
      CMMI: 'full',
      Basic: 'none',
      Custom: 'partial',
    },
    Basic: {
      Agile: 'none',
      Scrum: 'none',
      CMMI: 'none',
      Basic: 'full',
      Custom: 'none',
    },
    Custom: {
      Agile: 'partial',
      Scrum: 'partial',
      CMMI: 'partial',
      Basic: 'none',
      Custom: 'full',
    },
  }

  const level = compatibilityMatrix[actualProcess]?.[expectedProcess] || 'none'

  return {
    isCompatible: level !== 'none',
    detectedProcess: actualProcess,
    expectedProcess,
    compatibilityLevel: compatibilityLevelToNumber(level),
    mapping: PROCESS_MAPPINGS[actualProcess] || mapping,
    missingTypes: [],
    warnings:
      level === 'partial'
        ? [
            `Processo '${actualProcess}' tem compatibilidade parcial com '${expectedProcess}'`,
          ]
        : level === 'none'
          ? [
              `Processo '${actualProcess}' não é compatível com '${expectedProcess}'`,
            ]
          : [],
    suggestions:
      level !== 'full'
        ? [
            `Considere usar um projeto com processo '${expectedProcess}' para melhor compatibilidade`,
          ]
        : [],
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useProjectProcess(pat?: string): UseProjectProcessReturn {
  // State
  const [processInfo, setProcessInfo] = useState<ProjectProcessInfo | null>(
    null
  )
  const [compatibility, setCompatibility] =
    useState<ProcessCompatibilityResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Refs
  const currentPatRef = useRef<string | undefined>(pat)

  // Atualizar ref quando PAT mudar
  if (pat !== currentPatRef.current) {
    currentPatRef.current = pat
  }

  /**
   * Detectar processo do projeto via API route (server-side)
   * Isso evita problemas de CSP ao chamar dev.azure.com diretamente do browser
   */
  const detectProcess = useCallback(
    async (
      organization: string,
      projectId: string,
      options: ProcessDetectionOptions = {}
    ): Promise<ProjectProcessInfo> => {
      // Verificar cache primeiro (se não for forceRefresh)
      const cacheKey = getCacheKey(organization, projectId)
      if (!options.forceRefresh) {
        const cached = getFromCache(cacheKey)
        if (cached) {
          setProcessInfo(cached)
          setIsLoaded(true)
          return cached
        }
      }

      const currentPat = currentPatRef.current
      if (!currentPat) {
        throw new Error('PAT (Personal Access Token) não fornecido')
      }

      setIsLoading(true)
      setError(null)

      try {
        // Chamar API route server-side (evita CSP)
        const params = new URLSearchParams({
          organization,
          projectId,
          pat: currentPat,
          forceRefresh: options.forceRefresh ? 'true' : 'false',
          includeDisabled: options.includeDisabled ? 'true' : 'false',
        })

        const response = await fetch(
          `/api/mcp/azure-devops/project-info?${params.toString()}`
        )

        const result: ProjectInfoApiResponse = await response.json()

        if (!result.success || !result.data) {
          throw new Error(
            result.error || 'Erro ao detectar processo do projeto'
          )
        }

        const info = result.data

        // Salvar no cache
        setInCache(cacheKey, info)

        setProcessInfo(info)
        setIsLoaded(true)

        return info
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('Erro ao detectar processo do projeto')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Verificar compatibilidade com backlog (cálculo local, sem chamar API)
   */
  const checkCompatibility = useCallback(
    (
      expectedProcess: ProcessTemplate = 'Agile'
    ): ProcessCompatibilityResult | null => {
      if (!processInfo) {
        return null
      }

      // Calcular compatibilidade localmente (não precisa de service)
      const result = calculateCompatibility(processInfo, expectedProcess)

      setCompatibility(result)
      return result
    },
    [processInfo]
  )

  /**
   * Obter tipo mapeado para um tipo genérico
   */
  const getMappedType = useCallback(
    (genericType: GenericWorkItemType): string | null => {
      if (!processInfo) {
        return null
      }

      const template = processInfo.isCustomProcess
        ? 'Custom'
        : processInfo.processTemplate
      const mapping = PROCESS_MAPPINGS[template]

      if (!mapping) {
        return null
      }

      const typeMapping = mapping.mappings.find(m => m.generic === genericType)
      return typeMapping?.azureDevOpsType || null
    },
    [processInfo]
  )

  /**
   * Limpar estado
   */
  const reset = useCallback(() => {
    setProcessInfo(null)
    setCompatibility(null)
    setError(null)
    setIsLoading(false)
    setIsLoaded(false)
  }, [])

  return {
    // State
    processInfo,
    compatibility,
    isLoading,
    error,
    isLoaded,
    // Actions
    detectProcess,
    checkCompatibility,
    getMappedType,
    reset,
  }
}

// ============================================================================
// Utility Hook for Quick Check
// ============================================================================

/**
 * Hook simplificado para verificar rapidamente se processo é compatível
 */
export function useProcessCompatibilityCheck(
  pat: string | undefined,
  organization: string | undefined,
  projectId: string | undefined,
  autoDetect: boolean = false
) {
  const {
    processInfo,
    compatibility,
    isLoading,
    error,
    detectProcess,
    checkCompatibility,
  } = useProjectProcess(pat)

  // Auto-detectar quando parâmetros estiverem disponíveis
  const hasDetected = useRef(false)

  if (
    autoDetect &&
    pat &&
    organization &&
    projectId &&
    !hasDetected.current &&
    !isLoading
  ) {
    hasDetected.current = true
    detectProcess(organization, projectId).then(() => {
      checkCompatibility('Agile')
    })
  }

  return {
    processTemplate: processInfo?.processTemplate || null,
    isCompatible: compatibility?.isCompatible ?? null,
    compatibilityLevel: compatibility?.compatibilityLevel ?? null,
    warnings: compatibility?.warnings || [],
    isLoading,
    error,
  }
}
