/**
 * Hook: useRagIndexing
 *
 * Hook para indexar artefatos no Azure AI Search via RAG API.
 * Usado quando o usuário aceita ou rejeita um artefato.
 *
 * A BUSCA é feita pelo agente supervisor via MCP (front-matter).
 * Este hook cuida apenas da INDEXAÇÃO no frontend.
 *
 * Suporta configuração dinâmica do Azure AI Search extraída do agente SDA 2 Knowledge.
 */

'use client'

import { useCallback, useState } from 'react'

import type {
  ArtifactType,
  DynamicSearchConfig,
  FeedbackType,
  IndexResponse,
} from '@/lib/rag/types'

// ============================================================================
// INTERFACES
// ============================================================================

export interface IndexArtifactParams {
  /** ID único do artefato */
  artifactId: string
  /** ID do projeto */
  projectId: string
  /** Slug do projeto */
  projectSlug: string
  /** Slug do chat */
  chatSlug: string
  /** Título do artefato */
  title: string
  /** Tipo do artefato */
  artifactType: ArtifactType
  /** Conteúdo do artefato */
  content: string
  /** Nome do agente que gerou */
  agentName: string
  /** Tipo de feedback: positive ou negative */
  feedbackType: FeedbackType
  /** Query do usuário (opcional) */
  userQuery?: string
  /** ID do usuário (opcional) */
  userId?: string
  /** Nome do usuário (opcional) */
  userName?: string
  /** Motivo da rejeição (opcional, apenas para negative) */
  rejectionReason?: string
  /** Tags adicionais (opcional) */
  tags?: string[]
  /** Configuração dinâmica do Azure Search (do agente SDA 2 Knowledge) */
  searchConfig?: DynamicSearchConfig
}

export interface UseRagIndexingResult {
  /** Função para indexar artefato */
  indexArtifact: (params: IndexArtifactParams) => Promise<IndexResponse>
  /** Indica se está indexando */
  isIndexing: boolean
  /** Último erro, se houver */
  error: string | null
  /** Limpar erro */
  clearError: () => void
}

// ============================================================================
// HOOK
// ============================================================================

export function useRagIndexing(): UseRagIndexingResult {
  const [isIndexing, setIsIndexing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const indexArtifact = useCallback(
    async (params: IndexArtifactParams): Promise<IndexResponse> => {
      // =========================================================================
      // FEATURE FLAG: RAG_ENABLED
      // Se RAG_ENABLED=false, pula a indexação silenciosamente
      // Para reativar: definir RAG_ENABLED=true no .env.local
      // =========================================================================
      const ragEnabled = process.env.NEXT_PUBLIC_RAG_ENABLED ?? 'false'
      if (ragEnabled === 'false') {
        console.log(
          '⏸️ [useRagIndexing] RAG desativado (RAG_ENABLED=false) - indexação ignorada'
        )
        return {
          success: true,
          documentId: 'rag-disabled',
          chunkCount: 0,
        }
      }

      setIsIndexing(true)
      setError(null)

      try {
        console.log(`📤 [useRagIndexing] Indexando artefato:`, {
          artifactId: params.artifactId,
          type: params.artifactType,
          feedbackType: params.feedbackType,
          hasDynamicConfig: !!params.searchConfig,
          indexName: params.searchConfig?.index_name || 'env default',
        })

        const response = await fetch('/api/rag/index', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        })

        const result: IndexResponse = await response.json()

        if (!response.ok || !result.success) {
          const errorMsg = result.error || `HTTP ${response.status}`
          console.error(`❌ [useRagIndexing] Erro:`, errorMsg)
          setError(errorMsg)
          return result
        }

        console.log(`✅ [useRagIndexing] Indexação concluída:`, {
          documentId: result.documentId,
          chunkCount: result.chunkCount,
        })

        return result
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Erro desconhecido'
        console.error(`❌ [useRagIndexing] Exceção:`, errorMsg)
        setError(errorMsg)

        return {
          success: false,
          error: errorMsg,
        }
      } finally {
        setIsIndexing(false)
      }
    },
    []
  )

  return {
    indexArtifact,
    isIndexing,
    error,
    clearError,
  }
}

// ============================================================================
// HELPER PARA MAPEAR TIPO DE DOCUMENTO PARA ARTIFACT TYPE
// ============================================================================

/**
 * Mapear tipo de documento detectado para ArtifactType do RAG
 */
export function mapDocumentTypeToArtifactType(
  documentType: string
): ArtifactType {
  const typeMap: Record<string, ArtifactType> = {
    briefing: 'briefing',
    discovery: 'briefing',
    prd: 'prd',
    requirements: 'prd',
    architecture: 'architecture',
    tech: 'architecture',
    backlog: 'backlog',
    stories: 'backlog',
    design: 'design',
    ux: 'design',
  }

  const lowerType = documentType.toLowerCase()

  // Busca exata
  if (typeMap[lowerType]) {
    return typeMap[lowerType]
  }

  // Busca parcial
  for (const [key, value] of Object.entries(typeMap)) {
    if (lowerType.includes(key)) {
      return value
    }
  }

  return 'document'
}
