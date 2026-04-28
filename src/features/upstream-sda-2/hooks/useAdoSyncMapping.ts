/* eslint-disable no-console */
/**
 * Hook useAdoSyncMapping - Upstream SDA-2
 *
 * Hook para gerenciar a persistência de mapeamentos de sincronização
 * entre work items locais e Azure DevOps.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  AdoSyncMappingService,
  type SyncMappingEntry,
} from '../services/ado-sync-mapping.service'
import { useCockpitServices } from './useCockpitServices'

export interface UseAdoSyncMappingOptions {
  projectSlug?: string
  chatSlug?: string
  backlogVersion?: string
  /** Carregar automaticamente ao montar */
  autoLoad?: boolean
}

export interface UseAdoSyncMappingResult {
  /** Mapeamentos carregados */
  mappings: Record<string, SyncMappingEntry>
  /** Se está carregando */
  isLoading: boolean
  /** Se está salvando */
  isSaving: boolean
  /** Erro, se houver */
  error: string | null
  /** Se o serviço está pronto */
  isReady: boolean

  /** Carrega os mapeamentos do Cockpit */
  loadMappings: () => Promise<void>

  /** Adiciona novos mapeamentos após sync */
  addMappings: (
    items: Array<{
      localId: string
      adoId: number
      adoUrl?: string
      title: string
      type: 'epic' | 'feature' | 'userstory'
    }>
  ) => Promise<boolean>

  /** Remove um mapeamento */
  removeMapping: (localId: string) => Promise<boolean>

  /** Limpa todos os mapeamentos */
  clearMappings: () => Promise<boolean>

  /** Verifica se um item está sincronizado */
  isSynced: (localId: string) => boolean

  /** Obtém o adoId de um item */
  getAdoId: (localId: string) => string | null
}

export function useAdoSyncMapping(
  options: UseAdoSyncMappingOptions
): UseAdoSyncMappingResult {
  const { projectSlug, chatSlug, backlogVersion, autoLoad = true } = options

  const { config, isReady: isCockpitReady } = useCockpitServices()

  const [mappings, setMappings] = useState<Record<string, SyncMappingEntry>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Criar serviço quando config estiver disponível
  const service = useMemo(() => {
    if (!config) return null
    return new AdoSyncMappingService({
      baseUrl: config.baseUrl,
      accessToken: config.accessToken,
      licenseId: config.licenseId,
      namespaceId: config.namespaceId,
    })
  }, [config])

  const isReady = Boolean(service && projectSlug && chatSlug)

  // Carregar mapeamentos
  const loadMappings = useCallback(async () => {
    if (!service || !projectSlug || !chatSlug) {
      console.log(
        '⚠️ [useAdoSyncMapping] Não pode carregar: serviço ou slugs não disponíveis'
      )
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await service.loadSyncMappings(projectSlug, chatSlug)
      if (data) {
        setMappings(data.mappings)
        console.log(
          `✅ [useAdoSyncMapping] Carregados ${Object.keys(data.mappings).length} mapeamentos`
        )
      } else {
        setMappings({})
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Erro ao carregar mapeamentos'
      setError(errorMsg)
      console.error('❌ [useAdoSyncMapping] Erro:', err)
    } finally {
      setIsLoading(false)
    }
  }, [service, projectSlug, chatSlug])

  // Auto-carregar quando pronto
  useEffect(() => {
    if (autoLoad && isReady && isCockpitReady) {
      loadMappings()
    }
  }, [autoLoad, isReady, isCockpitReady, loadMappings])

  // Adicionar mapeamentos
  const addMappings = useCallback(
    async (
      items: Array<{
        localId: string
        adoId: number
        adoUrl?: string
        title: string
        type: 'epic' | 'feature' | 'userstory'
      }>
    ): Promise<boolean> => {
      if (!service || !projectSlug || !chatSlug) {
        console.error(
          '❌ [useAdoSyncMapping] Serviço não disponível para salvar'
        )
        return false
      }

      setIsSaving(true)
      setError(null)

      try {
        const result = await service.addSyncMappings(
          projectSlug,
          chatSlug,
          backlogVersion || '1.0.0',
          items
        )

        if (result.success) {
          // Atualizar estado local
          const now = new Date().toISOString()
          setMappings(prev => {
            const updated = { ...prev }
            for (const item of items) {
              updated[item.localId] = {
                adoId: item.adoId,
                adoUrl: item.adoUrl,
                syncedAt: now,
                title: item.title,
                type: item.type,
              }
            }
            return updated
          })
          console.log(
            `✅ [useAdoSyncMapping] ${items.length} mapeamentos salvos`
          )
          return true
        } else {
          setError(result.error || 'Erro ao salvar mapeamentos')
          return false
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Erro ao salvar mapeamentos'
        setError(errorMsg)
        console.error('❌ [useAdoSyncMapping] Erro:', err)
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [service, projectSlug, chatSlug, backlogVersion]
  )

  // Remover mapeamento
  const removeMapping = useCallback(
    async (localId: string): Promise<boolean> => {
      if (!service || !projectSlug || !chatSlug) return false

      setIsSaving(true)
      try {
        const result = await service.removeSyncMapping(
          projectSlug,
          chatSlug,
          localId
        )
        if (result.success) {
          setMappings(prev => {
            const updated = { ...prev }
            delete updated[localId]
            return updated
          })
          return true
        }
        return false
      } catch {
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [service, projectSlug, chatSlug]
  )

  // Limpar mapeamentos
  const clearMappings = useCallback(async (): Promise<boolean> => {
    if (!service || !projectSlug || !chatSlug) return false

    setIsSaving(true)
    try {
      const result = await service.clearSyncMappings(projectSlug, chatSlug)
      if (result.success) {
        setMappings({})
        return true
      }
      return false
    } catch {
      return false
    } finally {
      setIsSaving(false)
    }
  }, [service, projectSlug, chatSlug])

  // Verificar se está sincronizado
  const isSynced = useCallback(
    (localId: string): boolean => {
      return localId in mappings
    },
    [mappings]
  )

  // Obter adoId formatado
  const getAdoId = useCallback(
    (localId: string): string | null => {
      const mapping = mappings[localId]
      if (!mapping) return null
      return `ADO #${mapping.adoId}`
    },
    [mappings]
  )

  return {
    mappings,
    isLoading,
    isSaving,
    error,
    isReady,
    loadMappings,
    addMappings,
    removeMapping,
    clearMappings,
    isSynced,
    getAdoId,
  }
}
