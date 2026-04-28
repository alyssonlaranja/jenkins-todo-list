/* eslint-disable no-console */
/**
 * Hook useBacklogWorkItems - Upstream SDA-2
 *
 * Hook para gerenciar work items parseados de um artefato de backlog.
 * Faz o parse do conteúdo markdown e mantém estado da hierarquia
 * com seleção, expansão e estatísticas.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import { type SyncMappingEntry } from '../services/ado-sync-mapping.service'
import {
  AzureDevOpsService,
  type WorkItemCreate,
} from '../services/azure-devops.service'
import {
  flattenWorkItems,
  getAllChildrenIds,
  parseBacklogMarkdown,
  type ParsedWorkItem,
  type ParseResult,
} from '../services/backlog-parser.service'

export interface UseBacklogWorkItemsOptions {
  /** Conteúdo markdown do backlog */
  content: string
  /** ID do projeto para contexto */
  projectId?: string
  /** Se deve parsear automaticamente */
  autoParse?: boolean
  /** Mapeamentos de sincronização pré-carregados */
  initialSyncMappings?: Record<string, SyncMappingEntry>
}

export interface UseBacklogWorkItemsResult {
  // Estado
  workItems: ParsedWorkItem[]
  flatWorkItems: ParsedWorkItem[]
  isLoading: boolean
  error: string | null
  parseResult: ParseResult | null

  // Estatísticas
  epicCount: number
  featureCount: number
  userStoryCount: number
  totalCount: number
  selectedCount: number

  // Ações
  refreshParse: () => void
  toggleSelected: (itemId: string) => void
  toggleExpanded: (itemId: string) => void
  selectAll: () => void
  deselectAll: () => void
  getSelectedItems: () => ParsedWorkItem[]
  getSelectedItemsForSync: () => WorkItemCreate[]
  updateWorkItemsAfterSync: (
    createdItems: Array<{ id: number; localId?: string; title: string }>
  ) => void

  // Utilitários
  findItemById: (id: string) => ParsedWorkItem | undefined
}

export function useBacklogWorkItems(
  options: UseBacklogWorkItemsOptions
): UseBacklogWorkItemsResult {
  const { content, autoParse = true, initialSyncMappings } = options
  // projectId pode ser usado se necessário para persistência futura

  const [workItems, setWorkItems] = useState<ParsedWorkItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Flatten work items para busca e contagem
  const flatWorkItems = useMemo(() => flattenWorkItems(workItems), [workItems])

  // Estatísticas
  const stats = useMemo(() => {
    const epics = flatWorkItems.filter(item => item.type === 'epic')
    const features = flatWorkItems.filter(item => item.type === 'feature')
    const userStories = flatWorkItems.filter(item => item.type === 'userstory')

    return {
      epicCount: epics.length,
      featureCount: features.length,
      userStoryCount: userStories.length,
      totalCount: flatWorkItems.length,
      selectedCount: selectedIds.size,
    }
  }, [flatWorkItems, selectedIds])

  // Função auxiliar para aplicar mapeamentos de sincronização aos work items
  const applyInitialSyncMappings = useCallback(
    (items: ParsedWorkItem[]): ParsedWorkItem[] => {
      if (
        !initialSyncMappings ||
        Object.keys(initialSyncMappings).length === 0
      ) {
        return items
      }

      const applyMapping = (workItem: ParsedWorkItem): ParsedWorkItem => {
        const mapping = initialSyncMappings[workItem.id]
        return {
          ...workItem,
          adoId: mapping ? `ADO #${mapping.adoId}` : workItem.adoId,
          integrationStatus: mapping ? 'synced' : workItem.integrationStatus,
          status: mapping ? 'completed' : workItem.status,
          children: workItem.children.map(applyMapping),
        }
      }

      return items.map(applyMapping)
    },
    [initialSyncMappings]
  )

  // Função para parsear o conteúdo
  const refreshParse = useCallback(() => {
    if (!content || content.trim().length === 0) {
      setWorkItems([])
      setParseResult(null)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 [useBacklogWorkItems] Parsing backlog content...')
      const result = parseBacklogMarkdown(content)

      setParseResult(result)

      // Aplicar mapeamentos de sincronização se disponíveis
      const itemsWithMappings = applyInitialSyncMappings(result.workItems)
      setWorkItems(itemsWithMappings)

      if (!result.success) {
        setError(result.issues.join(', ') || 'Falha ao parsear backlog')
      }

      console.log('✅ [useBacklogWorkItems] Parse complete:', {
        success: result.success,
        items: result.metadata.totalItems,
        syncedItems: Object.keys(initialSyncMappings || {}).length,
      })
    } catch (err) {
      console.error('❌ [useBacklogWorkItems] Parse error:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setWorkItems([])
      setParseResult(null)
    } finally {
      setIsLoading(false)
    }
  }, [content, applyInitialSyncMappings, initialSyncMappings])

  // Auto-parse quando content ou mapeamentos mudarem
  useEffect(() => {
    if (autoParse) {
      refreshParse()
    }
  }, [autoParse, refreshParse])

  // Aplicar mapeamentos quando eles forem carregados (após o parse inicial)
  useEffect(() => {
    if (
      workItems.length > 0 &&
      initialSyncMappings &&
      Object.keys(initialSyncMappings).length > 0
    ) {
      console.log(
        '🔄 [useBacklogWorkItems] Aplicando mapeamentos carregados:',
        Object.keys(initialSyncMappings).length
      )
      setWorkItems(prevItems => applyInitialSyncMappings(prevItems))
    }
  }, [initialSyncMappings, applyInitialSyncMappings]) // Não inclui workItems para evitar loop

  // Limpar seleções quando o content mudar (nova versão ou edição)
  useEffect(() => {
    setSelectedIds(new Set())
  }, [content])

  // Encontrar item por ID
  const findItemById = useCallback(
    (id: string): ParsedWorkItem | undefined => {
      return flatWorkItems.find(item => item.id === id)
    },
    [flatWorkItems]
  )

  // Toggle seleção de item (com cascata para children)
  const toggleSelected = useCallback(
    (itemId: string) => {
      const item = findItemById(itemId)
      if (!item) return

      setSelectedIds(prev => {
        const newSelected = new Set(prev)
        const isCurrentlySelected = newSelected.has(itemId)

        if (isCurrentlySelected) {
          // Desmarcar item e todos os filhos
          newSelected.delete(itemId)
          const childrenIds = getAllChildrenIds(item)
          childrenIds.forEach(childId => newSelected.delete(childId))
        } else {
          // Marcar item e todos os filhos
          newSelected.add(itemId)
          const childrenIds = getAllChildrenIds(item)
          childrenIds.forEach(childId => newSelected.add(childId))
        }

        return newSelected
      })

      // Atualizar estado visual do item e todos os filhos
      setWorkItems(prev => {
        const updateItemAndChildren = (
          items: ParsedWorkItem[],
          idsToUpdate: Set<string>,
          newSelectedState: boolean
        ): ParsedWorkItem[] => {
          return items.map(wi => {
            const shouldUpdate = idsToUpdate.has(wi.id)
            const updatedChildren =
              wi.children.length > 0
                ? updateItemAndChildren(
                    wi.children,
                    idsToUpdate,
                    newSelectedState
                  )
                : wi.children

            if (shouldUpdate) {
              return {
                ...wi,
                selected: newSelectedState,
                children: updatedChildren,
              }
            }
            if (wi.children.length > 0) {
              return { ...wi, children: updatedChildren }
            }
            return wi
          })
        }

        // Coletar todos os IDs que precisam ser atualizados (item + filhos)
        const idsToUpdate = new Set<string>([itemId])
        const childrenIds = getAllChildrenIds(item)
        childrenIds.forEach(id => idsToUpdate.add(id))

        // Determinar o novo estado (inverso do atual)
        const newSelectedState = !item.selected

        return updateItemAndChildren(prev, idsToUpdate, newSelectedState)
      })
    },
    [findItemById]
  )

  // Toggle expansão de item
  const toggleExpanded = useCallback((itemId: string) => {
    setWorkItems(prev => {
      const updateItem = (items: ParsedWorkItem[]): ParsedWorkItem[] => {
        return items.map(wi => {
          if (wi.id === itemId) {
            return { ...wi, expanded: !wi.expanded }
          }
          if (wi.children.length > 0) {
            return { ...wi, children: updateItem(wi.children) }
          }
          return wi
        })
      }
      return updateItem(prev)
    })
  }, [])

  // Selecionar todos
  const selectAll = useCallback(() => {
    const allIds = new Set(flatWorkItems.map(item => item.id))
    setSelectedIds(allIds)

    setWorkItems(prev => {
      const updateItem = (items: ParsedWorkItem[]): ParsedWorkItem[] => {
        return items.map(wi => ({
          ...wi,
          selected: true,
          children: updateItem(wi.children),
        }))
      }
      return updateItem(prev)
    })
  }, [flatWorkItems])

  // Desmarcar todos
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())

    setWorkItems(prev => {
      const updateItem = (items: ParsedWorkItem[]): ParsedWorkItem[] => {
        return items.map(wi => ({
          ...wi,
          selected: false,
          children: updateItem(wi.children),
        }))
      }
      return updateItem(prev)
    })
  }, [])

  // Atualizar work items após sincronização com Azure DevOps
  const updateWorkItemsAfterSync = useCallback(
    (createdItems: Array<{ id: number; localId?: string; title: string }>) => {
      console.log(
        '🔄 [useBacklogWorkItems] Atualizando work items após sync:',
        createdItems.length
      )

      // Criar mapeamento de localId -> azureId
      const idMapping = new Map<string, number>()
      createdItems.forEach(item => {
        if (item.localId) {
          idMapping.set(item.localId, item.id)
          console.log(
            `📋 [useBacklogWorkItems] Mapeamento: ${item.localId} → ADO #${item.id}`
          )
        }
      })

      setWorkItems(prev => {
        const updateItem = (items: ParsedWorkItem[]): ParsedWorkItem[] => {
          return items.map(wi => {
            const azureId = idMapping.get(wi.id)
            const updatedItem = {
              ...wi,
              adoId: azureId ? `ADO #${azureId}` : wi.adoId,
              integrationStatus: azureId
                ? ('synced' as const)
                : wi.integrationStatus,
              status: azureId ? ('completed' as const) : wi.status,
              selected: azureId ? false : wi.selected, // Desmarcar itens sincronizados
              children: updateItem(wi.children),
            }

            if (azureId) {
              console.log(
                `✅ [useBacklogWorkItems] Work item "${wi.title}" atualizado com ADO #${azureId}`
              )
            }

            return updatedItem
          })
        }
        return updateItem(prev)
      })

      // Limpar seleção dos itens sincronizados
      setSelectedIds(prev => {
        const newSet = new Set(prev)
        createdItems.forEach(item => {
          if (item.localId) {
            newSet.delete(item.localId)
          }
        })
        return newSet
      })
    },
    []
  )

  // Obter itens selecionados
  const getSelectedItems = useCallback((): ParsedWorkItem[] => {
    return flatWorkItems.filter(item => selectedIds.has(item.id))
  }, [flatWorkItems, selectedIds])

  // Converter itens selecionados para formato Azure DevOps
  const getSelectedItemsForSync = useCallback((): WorkItemCreate[] => {
    const selected = getSelectedItems()
    const azureWorkItems: WorkItemCreate[] = []

    console.log('📦 [useBacklogWorkItems] Itens selecionados:', selected.length)
    console.log(
      '📦 [useBacklogWorkItems] IDs selecionados:',
      selected.map(i => ({ id: i.id, type: i.type, parentId: i.parentId }))
    )

    // Mapear para estrutura Azure DevOps
    selected.forEach(item => {
      const sdaTypeToAdo = AzureDevOpsService.convertSdaTypeToScrum(item.type)

      console.log(
        `📋 [useBacklogWorkItems] Convertendo: ${item.title} (${item.type}) → ${sdaTypeToAdo.type}, parentLocalId: ${item.parentId || 'N/A'}`
      )

      // Formatar critérios de aceite com prefixo "Aceite:" e quebras de linha
      const formattedCriteria = item.acceptanceCriteria
        ?.map(c => `Aceite: ${c}`)
        .join('\n')

      const workItem: WorkItemCreate = {
        type: sdaTypeToAdo.type,
        title: item.title,
        description: item.description || '',
        acceptanceCriteria: formattedCriteria,
        priority:
          item.priority === 'high' ? 1 : item.priority === 'medium' ? 2 : 3,
        localId: item.id,
        parentLocalId: item.parentId,
        // Sem tags - não adicionar tags aos work items exportados
        sdaType: item.type,
      }

      azureWorkItems.push(workItem)
    })

    console.log(
      '📦 [useBacklogWorkItems] Work items for sync:',
      azureWorkItems.length
    )

    return azureWorkItems
  }, [getSelectedItems])

  return {
    // Estado
    workItems,
    flatWorkItems,
    isLoading,
    error,
    parseResult,

    // Estatísticas
    epicCount: stats.epicCount,
    featureCount: stats.featureCount,
    userStoryCount: stats.userStoryCount,
    totalCount: stats.totalCount,
    selectedCount: stats.selectedCount,

    // Ações
    refreshParse,
    toggleSelected,
    toggleExpanded,
    selectAll,
    deselectAll,
    getSelectedItems,
    getSelectedItemsForSync,
    updateWorkItemsAfterSync,

    // Utilitários
    findItemById,
  }
}
