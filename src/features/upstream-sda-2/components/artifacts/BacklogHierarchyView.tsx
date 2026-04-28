/* eslint-disable no-console */
/**
 * BacklogHierarchyView - Upstream SDA-2
 *
 * Componente para visualização hierárquica de work items do backlog
 * com suporte a seleção, expansão e integração com Azure DevOps.
 *
 * Baseado no layout do sda-handoff.tsx do upstream-sda
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Package,
  RefreshCw,
  Settings,
  Square,
  Wrench,
  X,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { useI18n } from '@/shared/hooks/use-i18n'

import { useAdoSyncMapping } from '../../hooks/useAdoSyncMapping'
import { useBacklogWorkItems } from '../../hooks/useBacklogWorkItems'
import {
  azureDevOpsService,
  type SyncResult,
} from '../../services/azure-devops.service'
import type { ParsedWorkItem } from '../../services/backlog-parser.service'
import type { ProjectProcessInfo } from '../../types/azure-devops-process.types'
import { AzureDevOpsConfigModal } from './AzureDevOpsConfigModal'
import { AzureDevOpsSyncModal } from './AzureDevOpsSyncModal'

interface BacklogHierarchyViewProps {
  /** Conteúdo markdown do backlog */
  content: string
  /** Slug do projeto */
  projectId?: string
  /** Slug do chat */
  chatSlug?: string
  /** Versão do backlog */
  backlogVersion?: string
  /** Callback quando voltar para visualização de markdown */
  onBack?: () => void
  /** Título do artefato */
  artifactTitle?: string
  /** Info do processo Azure DevOps pré-detectada (cache do WorkspacePage) */
  processInfo?: ProjectProcessInfo | null
}

export function BacklogHierarchyView({
  content,
  projectId,
  chatSlug,
  backlogVersion,
  onBack,
  // artifactTitle usado para futuras features de título customizado

  artifactTitle: _artifactTitle = 'Backlog',
  processInfo,
}: BacklogHierarchyViewProps) {
  const { t } = useI18n('pages')
  const [isAzureConfigModalOpen, setIsAzureConfigModalOpen] = useState(false)
  const [isAzureSyncModalOpen, setIsAzureSyncModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [showSyncNotification, setShowSyncNotification] = useState(false)
  const [hasDevOpsConfig, setHasDevOpsConfig] = useState(false)
  const [devOpsConfigSummary, setDevOpsConfigSummary] = useState<{
    organization: string
    project: string
  } | null>(null)

  // Hook para carregar e salvar mapeamentos de sincronização
  const {
    mappings: syncMappings,
    isLoading: isLoadingMappings,
    addMappings: saveSyncMappings,
  } = useAdoSyncMapping({
    projectSlug: projectId,
    chatSlug,
    backlogVersion,
    autoLoad: true,
  })

  const {
    workItems,
    isLoading,
    error,
    epicCount,
    featureCount,
    userStoryCount,
    selectedCount,
    toggleSelected,
    toggleExpanded,
    getSelectedItemsForSync,
    deselectAll,
    updateWorkItemsAfterSync,
  } = useBacklogWorkItems({
    content,
    projectId,
    autoParse: true,
    initialSyncMappings: syncMappings,
  })

  // Combinar loading states (após useBacklogWorkItems)
  const isLoadingCombined = isLoading || isLoadingMappings

  // Limpar notificação após 5 segundos
  useEffect(() => {
    if (showSyncNotification) {
      const timer = setTimeout(() => {
        setShowSyncNotification(false)
        setSyncResult(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [showSyncNotification])

  // Carregar configuração do Azure DevOps ao montar
  useEffect(() => {
    const checkConfig = async () => {
      if (projectId) {
        const savedConfig =
          await azureDevOpsService.loadProjectConfig(projectId)
        if (savedConfig) {
          setHasDevOpsConfig(true)
          setDevOpsConfigSummary({
            organization: savedConfig.organization,
            project: savedConfig.project,
          })
        }
      }
    }
    checkConfig()
  }, [projectId])

  // Callback para quando config é salva - atualiza estado e mostra card
  const handleConfigSaved = useCallback(async () => {
    if (projectId) {
      const savedConfig = await azureDevOpsService.loadProjectConfig(projectId)
      if (savedConfig) {
        setHasDevOpsConfig(true)
        setDevOpsConfigSummary({
          organization: savedConfig.organization,
          project: savedConfig.project,
        })
      }
    }
  }, [projectId])

  // Handler para sincronização completa
  const handleSyncComplete = useCallback(
    async (result: SyncResult) => {
      console.log('✅ [BacklogHierarchyView] Sync complete:', result)
      setSyncResult(result)
      setShowSyncNotification(true)
      setIsSyncing(false)

      if (result.success && result.created.length > 0) {
        // Atualizar work items com os IDs do Azure DevOps
        updateWorkItemsAfterSync(result.created)

        // Persistir mapeamentos no Cockpit
        const mappingsToSave = result.created
          .filter(item => item.localId)
          .map(item => ({
            localId: item.localId!,
            adoId: item.id,
            adoUrl: item.url,
            title: item.title,
            type: (item.type || 'userstory') as
              | 'epic'
              | 'feature'
              | 'userstory',
          }))

        if (mappingsToSave.length > 0) {
          const saved = await saveSyncMappings(mappingsToSave)
          if (saved) {
            console.log(
              '✅ [BacklogHierarchyView] Mapeamentos persistidos no Cockpit'
            )
          } else {
            console.warn(
              '⚠️ [BacklogHierarchyView] Falha ao persistir mapeamentos'
            )
          }
        }
      } else if (result.success) {
        deselectAll()
      }
    },
    [deselectAll, updateWorkItemsAfterSync, saveSyncMappings]
  )

  // Handler para abrir modal de sync
  const handleOpenSyncModal = useCallback(() => {
    const items = getSelectedItemsForSync()

    if (items.length === 0) {
      console.warn('⚠️ [BacklogHierarchyView] No items selected for sync')
      return
    }

    setIsAzureSyncModalOpen(true)
  }, [getSelectedItemsForSync])

  // Renderizar ícone do tipo
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'epic':
        return <Package className="size-4 text-orange-600" />
      case 'feature':
        return <Wrench className="size-4 text-blue-600" />
      case 'userstory':
        return <FileText className="size-4 text-muted-foreground" />
      default:
        return <FileText className="size-4 text-muted-foreground" />
    }
  }

  // Renderizar status
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'not-started': {
        label: t('sda2.workspace.status.notStarted'),
        className: 'bg-muted text-muted-foreground border-border',
      },
      'in-progress': {
        label: t('sda2.workspace.backlog.statusInProgress'),
        className:
          'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
      },
      completed: {
        label: t('sda2.workspace.status.completed'),
        className:
          'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
      },
      'pronta-para-envio': {
        label: t('sda2.workspace.backlog.statusReady'),
        className:
          'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
      },
    }

    const config = statusConfig[status] ?? statusConfig['not-started']!

    return (
      <span
        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${config?.className ?? ''}`}
      >
        {config?.label ?? status}
      </span>
    )
  }

  // Renderizar status de integração
  const getIntegrationBadge = (item: ParsedWorkItem) => {
    if (item.adoId) {
      return (
        <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
          {item.adoId}
          <ExternalLink className="size-3" />
        </span>
      )
    }

    return (
      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        {t('sda2.workspace.backlog.notSent')}
      </span>
    )
  }

  // Renderizar árvore de work items
  const renderWorkItemTree = (items: ParsedWorkItem[], level = 0) => {
    return items.map(item => {
      const hasChildren = item.children && item.children.length > 0
      const isSelected = item.selected

      return (
        <div key={item.id} className="mb-0.5">
          <div
            className={`flex items-center border-b border-border/50 px-4 py-3 transition-colors hover:bg-muted/50 ${
              isSelected ? 'bg-primary/10' : ''
            }`}
            style={{ paddingLeft: `${16 + level * 24}px` }}
          >
            {/* Checkbox - oculto para items já sincronizados */}
            {item.adoId ? (
              <div className="mr-3 w-4 shrink-0" /> // Espaço reservado para manter alinhamento
            ) : (
              <button
                onClick={() => toggleSelected(item.id)}
                className="mr-3 shrink-0"
                title={
                  isSelected
                    ? t('sda2.workspace.backlog.deselectItem')
                    : t('sda2.workspace.backlog.selectItem')
                }
              >
                {isSelected ? (
                  <CheckSquare className="size-4 text-primary" />
                ) : (
                  <Square className="size-4 text-muted-foreground/60 hover:text-muted-foreground" />
                )}
              </button>
            )}

            {/* Expand/Collapse */}
            {hasChildren ? (
              <button
                onClick={() => toggleExpanded(item.id)}
                className="mr-2 shrink-0"
                title={
                  item.expanded
                    ? t('sda2.workspace.collapse')
                    : t('sda2.workspace.expand')
                }
              >
                {item.expanded ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div className="mr-2 w-4 shrink-0" />
            )}

            {/* Icon e Título */}
            <div className="flex min-w-0 flex-1 items-start gap-2">
              {getTypeIcon(item.type)}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {item.title}
                  </span>
                  {item.type === 'epic' && item.featureCount !== undefined && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.featureCount} features • {item.userStoryCount} user
                      stories
                    </span>
                  )}
                  {item.type === 'feature' &&
                    item.userStoryCount !== undefined && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {item.userStoryCount} user stories
                      </span>
                    )}
                </div>
                {/* Descrição da User Story - Como/Quero/Para */}
                {item.type === 'userstory' && item.description && (
                  <p className="mt-1 text-xs italic leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            </div>

            {/* Status e Integração */}
            <div className="ml-4 flex items-center gap-4">
              {getStatusBadge(item.status)}
              {getIntegrationBadge(item)}
            </div>
          </div>

          {/* Children */}
          {hasChildren && item.expanded && (
            <div>{renderWorkItemTree(item.children, level + 1)}</div>
          )}
        </div>
      )
    })
  }

  // Loading state
  if (isLoadingCombined) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">
            {isLoadingMappings
              ? t('sda2.workspace.backlog.loadingSyncs')
              : t('sda2.workspace.backlog.processingBacklog')}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background p-8">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <X className="mx-auto mb-4 size-10 text-destructive" />
          <h3 className="mb-2 text-lg font-semibold text-destructive">
            {t('sda2.workspace.backlog.errorProcessing')}
          </h3>
          <p className="mb-4 text-sm text-destructive/80">{error}</p>
          <Button variant="outline" onClick={onBack}>
            {t('sda2.workspace.backToView')}
          </Button>
        </div>
      </div>
    )
  }

  // Empty state
  if (workItems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background p-8">
        <div className="text-center">
          <Package className="mx-auto mb-4 size-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {t('sda2.workspace.backlog.noWorkItems')}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('sda2.workspace.backlog.noWorkItemsDesc')}
          </p>
          <Button variant="outline" onClick={onBack}>
            {t('sda2.workspace.backToView')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Notificação de Sync */}
      {showSyncNotification && syncResult && (
        <div className="fixed right-4 top-4 z-50">
          <div
            className={`flex items-center gap-3 rounded-lg px-5 py-3 text-white shadow-lg ${
              syncResult.success ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            <CheckSquare className="size-5" />
            <div>
              <p className="font-medium">
                {syncResult.success
                  ? t('sda2.workspace.backlog.syncComplete')
                  : t('sda2.workspace.backlog.syncError')}
              </p>
              <p className="text-xs opacity-90">
                {syncResult.created.length}{' '}
                {t('sda2.workspace.backlog.created')},{' '}
                {syncResult.errors.length}{' '}
                {t('sda2.workspace.backlog.errorsCount')}
              </p>
            </div>
            <button
              onClick={() => setShowSyncNotification(false)}
              className="ml-2 rounded-full p-1 hover:bg-white/20"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header com estatísticas e botões */}
      <div className="shrink-0 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="size-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t('sda2.workspace.backlog.title')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {epicCount} {t('sda2.workspace.backlog.epics')} • {featureCount}{' '}
                {t('sda2.workspace.backlog.features')} • {userStoryCount}{' '}
                {t('sda2.workspace.backlog.pbis')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Engrenagem de Configuração Azure DevOps - com tooltip de status */}
            <div className="group relative">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setIsAzureConfigModalOpen(true)}
                title={t('sda2.workspace.azureDevOps.configTitle')}
              >
                <Settings className="size-4" />
                {hasDevOpsConfig && devOpsConfigSummary && (
                  <span className="text-xs text-muted-foreground/70">
                    {devOpsConfigSummary.organization}/
                    {devOpsConfigSummary.project}
                  </span>
                )}
              </Button>
              {/* Indicador de status */}
              <span
                className={`absolute -right-0.5 -top-0.5 size-2 rounded-full ${
                  hasDevOpsConfig ? 'bg-green-500' : 'bg-amber-500'
                }`}
                title={
                  hasDevOpsConfig
                    ? t('sda2.workspace.backlog.configured')
                    : t('sda2.workspace.backlog.notConfigured')
                }
              />
            </div>

            {/* Contador de selecionados */}
            <span className="text-sm text-muted-foreground">
              {selectedCount} {t('sda2.workspace.backlog.selected')}
            </span>

            {/* Botão Sincronizar - ação direta */}
            <Button
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={selectedCount === 0 || isSyncing}
              onClick={() => {
                if (!hasDevOpsConfig) {
                  setIsAzureConfigModalOpen(true)
                } else {
                  handleOpenSyncModal()
                }
              }}
            >
              <RefreshCw
                className={`size-4 ${isSyncing ? 'animate-spin' : ''}`}
              />
              {isSyncing
                ? t('sda2.workspace.backlog.syncing')
                : t('sda2.workspace.syncWithAzureDevOps')}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela de Work Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="rounded-lg border border-border bg-card">
          {/* Header da tabela */}
          <div className="sticky top-0 z-10 border-b border-border bg-muted/50 px-6 py-3">
            <div className="flex items-center">
              <div className="mr-3 w-6" /> {/* Espaço para checkbox */}
              <div className="mr-2 w-4" /> {/* Espaço para expand */}
              <div className="flex-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('sda2.workspace.backlog.hierarchy')}
                </span>
              </div>
              <div className="flex gap-8">
                <span className="w-28 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('sda2.workspace.backlog.statusHeader')}
                </span>
                <span className="w-28 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('sda2.workspace.backlog.integrationHeader')}
                </span>
              </div>
            </div>
          </div>

          {/* Itens */}
          <div className="divide-y divide-border/50">
            {renderWorkItemTree(workItems)}
          </div>
        </div>
      </div>

      {/* Modal de Configuração Azure DevOps */}
      <AzureDevOpsConfigModal
        isOpen={isAzureConfigModalOpen}
        onClose={() => setIsAzureConfigModalOpen(false)}
        projectId={projectId}
        onConfigSaved={handleConfigSaved}
      />

      {/* Modal de Sincronização Azure DevOps */}
      <AzureDevOpsSyncModal
        isOpen={isAzureSyncModalOpen}
        onClose={() => setIsAzureSyncModalOpen(false)}
        projectId={projectId}
        workItems={getSelectedItemsForSync()}
        onSyncComplete={handleSyncComplete}
        cachedProcessInfo={processInfo}
        onOpenConfig={() => {
          setIsAzureSyncModalOpen(false)
          setIsAzureConfigModalOpen(true)
        }}
      />
    </div>
  )
}
