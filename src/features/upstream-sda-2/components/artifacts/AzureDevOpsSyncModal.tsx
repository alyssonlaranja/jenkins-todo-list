/* eslint-disable no-console */
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  Settings,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { useI18n } from '@/shared/hooks/use-i18n'

import { useProjectProcess } from '../../hooks/useProjectProcess'
import {
  azureDevOpsService,
  AzureDevOpsService,
  type AzureDevOpsConfig,
  type SyncResult,
  type WorkItemCreate,
} from '../../services/azure-devops.service'
import type {
  ProcessTemplate,
  ProjectProcessInfo,
} from '../../types/azure-devops-process.types'

/** Tipo do processo do backlog gerado pela SDA (sempre Agile) */
const BACKLOG_PROCESS_TYPE: ProcessTemplate = 'Agile'

interface AzureDevOpsSyncModalProps {
  isOpen: boolean
  onClose: () => void
  onSyncComplete?: (result: SyncResult) => void
  projectId?: string
  /** Work items para sincronização */
  workItems: WorkItemCreate[]
  /** Callback para abrir modal de configuração */
  onOpenConfig?: () => void
  /** Info do processo pré-detectada pelo WorkspacePage (evita re-detecção) */
  cachedProcessInfo?: ProjectProcessInfo | null
}

export function AzureDevOpsSyncModal({
  isOpen,
  onClose,
  onSyncComplete,
  projectId,
  workItems,
  onOpenConfig,
  cachedProcessInfo,
}: AzureDevOpsSyncModalProps) {
  const { t } = useI18n('pages')
  const [config, setConfig] = useState<AzureDevOpsConfig | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 })
  const [configError, setConfigError] = useState<string | null>(null)

  // Estado para controlar sincronização concluída com incompatibilidade
  const [syncCompleted, setSyncCompleted] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  // Estado para erros gerais (erros de rede, exceções, etc.)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Hook para detecção de processo do Azure DevOps
  const pat = azureDevOpsService.loadPAT()
  const {
    processInfo: hookProcessInfo,
    isLoading: isLoadingProcess,
    detectProcess,
  } = useProjectProcess(pat || undefined)

  // Usar processInfo do cache (pré-detectado no WorkspacePage) ou do hook local
  const processInfo = cachedProcessInfo ?? hookProcessInfo

  // Carregar configuração salva ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      // Reset estados ao abrir
      setSyncCompleted(false)
      setSyncResult(null)

      const loadConfig = async () => {
        let loadedConfig: AzureDevOpsConfig | null = null

        if (projectId) {
          const savedConfig =
            await azureDevOpsService.loadProjectConfig(projectId)
          if (savedConfig) {
            loadedConfig = savedConfig
            setConfig(savedConfig)
            setConfigError(null)
          } else {
            setConfigError(t('sda2.workspace.azureDevOps.configNotFound'))
            return
          }
        } else {
          const currentConfig = azureDevOpsService.getConfig()
          if (currentConfig?.organization && currentConfig?.project) {
            loadedConfig = currentConfig
            setConfig(currentConfig)
            setConfigError(null)
          } else {
            setConfigError(t('sda2.workspace.azureDevOps.configNotFound'))
            return
          }
        }

        // Verificar PAT
        const currentPat = azureDevOpsService.loadPAT()
        if (!currentPat) {
          setConfigError(t('sda2.workspace.azureDevOps.patNotConfigured'))
          return
        }

        // Detectar processo apenas se não veio pré-detectado do WorkspacePage
        if (
          !cachedProcessInfo &&
          loadedConfig?.organization &&
          loadedConfig?.project
        ) {
          console.log('🔍 Detectando processo do Azure DevOps...')
          try {
            const detectedInfo = await detectProcess(
              loadedConfig.organization,
              loadedConfig.project
            )

            console.log('✅ Processo detectado:', detectedInfo.processTemplate)
          } catch (err) {
            console.warn(
              '⚠️ Não foi possível detectar processo do DevOps:',
              err
            )
          }
        }
      }
      loadConfig()
    }
  }, [isOpen, projectId, detectProcess, cachedProcessInfo])

  // Verificar se processo é compatível
  const isProcessCompatible =
    processInfo?.processTemplate === BACKLOG_PROCESS_TYPE
  const detectedProcessName =
    processInfo?.processTemplate || t('sda2.workspace.azureDevOps.unknown')

  // Resetar estado ao fechar
  useEffect(() => {
    if (!isOpen) {
      setSyncProgress({ current: 0, total: 0 })
      setSyncCompleted(false)
      setSyncResult(null)
      setSyncError(null)
    }
  }, [isOpen])

  const handleConfirmSync = useCallback(async () => {
    if (!config) return

    setIsSyncing(true)
    setSyncProgress({ current: 0, total: workItems.length })

    try {
      console.log(
        '🚀 Iniciando sincronização de',
        workItems.length,
        'work items'
      )

      // Incluir processo detectado na config para mapeamento de estados
      const configWithProcess: AzureDevOpsConfig = {
        ...config,
        targetProcess: processInfo?.processTemplate,
        baseProcess: processInfo?.baseProcessTemplate, // Processo base para Custom
      }

      console.log('🔄 Config com processo:', configWithProcess)

      const result = await azureDevOpsService.syncWorkItems(
        workItems,
        configWithProcess
      )

      console.log('✅ Sincronização concluída:', result)

      // Verificar se houve erros na sincronização
      if (result.errors && result.errors.length > 0) {
        console.warn('⚠️ Erros na sincronização:', result.errors)
      }

      if (result.success && result.created.length > 0) {
        console.log(
          'Sincronização concluída',
          `${result.created.length} item(s) criado(s) no Azure DevOps`
        )
      } else if (!result.success) {
        console.error('❌ Sincronização falhou:', result.errors)
        setSyncError(
          result.errors?.[0]?.error ||
            t('sda2.workspace.azureDevOps.syncFailed')
        )
      }

      // Sempre mostrar resultado para o usuário
      setSyncResult(result)
      setSyncCompleted(true)

      // Chamar callback apenas se teve algum sucesso
      if (result.created.length > 0) {
        onSyncComplete?.(result)
      }

      // DEBUG: Log para verificar detecção de processo
      console.log('🔍 [DEBUG] processInfo:', processInfo)
      console.log(
        '🔍 [DEBUG] processInfo?.processTemplate:',
        processInfo?.processTemplate
      )
      console.log('🔍 [DEBUG] BACKLOG_PROCESS_TYPE:', BACKLOG_PROCESS_TYPE)
      console.log('🔍 [DEBUG] isProcessCompatible:', isProcessCompatible)

      // Sempre manter modal aberto para mostrar resultado ao usuário
      // Não fechar automaticamente - deixar usuário ver o resultado
    } catch (error) {
      console.error('❌ Erro na sincronização:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido'
      setSyncError(errorMessage)
      setSyncCompleted(true)
      const firstItem = workItems[0] ?? {
        type: 'Epic' as const,
        title: 'Erro de sincronização',
        localId: 'error-placeholder',
      }
      setSyncResult({
        success: false,
        created: [],
        errors: [{ item: firstItem, error: errorMessage }],
        skipped: [],
      })
    } finally {
      setIsSyncing(false)
      setSyncProgress({ current: 0, total: 0 })
    }
  }, [
    config,
    workItems,
    onSyncComplete,
    onClose,
    isProcessCompatible,
    processInfo,
  ])

  const handleOpenAzureDevOps = () => {
    const url = config?.organization
      ? `https://dev.azure.com/${config.organization}/${config.project || ''}`
      : 'https://dev.azure.com'
    window.open(url, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="relative">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <svg
                  className="size-5 text-primary"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M0 8.877L2.247 5.91l8.405-3.416V.022l7.37 5.393L2.966 8.338v8.225L0 15.707V8.877zm21.034 6.246l-8.405 3.416v2.472l-7.37-5.393 15.056-2.923v-8.225L24 5.326v6.83l-2.966 2.967z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {syncCompleted
                    ? t('sda2.workspace.azureDevOps.syncCompleted')
                    : t('sda2.workspace.syncWithAzureDevOps')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {syncCompleted
                    ? t('sda2.workspace.azureDevOps.checkWarnings')
                    : t('sda2.workspace.azureDevOps.confirmAndSend')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSyncing}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:text-muted-foreground/30"
            >
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-0.5 w-full bg-border">
            <div
              className={`h-0.5 w-full ${syncCompleted ? 'bg-green-500' : 'bg-primary'}`}
            />
          </div>
        </div>

        {/* Aviso de Incompatibilidade de Processo - Após sincronização */}
        {syncCompleted && !isProcessCompatible && processInfo && (
          <div className="mx-5 mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div>
                <h3 className="font-semibold text-amber-600 dark:text-amber-400">
                  {t('sda2.workspace.azureDevOps.differentProcesses')}
                </h3>
                <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-400/80">
                  {t('sda2.workspace.azureDevOps.processWarning', {
                    backlogProcess: BACKLOG_PROCESS_TYPE,
                    detectedProcess: detectedProcessName,
                  })}
                </p>
                <p className="mt-2 text-sm text-amber-600/70 dark:text-amber-400/70">
                  {t('sda2.workspace.azureDevOps.processAdapted')}
                </p>
                {syncResult && syncResult.errors.length > 0 && (
                  <div className="mt-3 rounded border border-destructive/30 bg-destructive/10 p-2">
                    <p className="text-xs font-medium text-destructive">
                      {t('sda2.workspace.azureDevOps.syncErrors', {
                        count: syncResult.errors.length,
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {syncCompleted ? (
            /* Resultado da sincronização */
            <div className="space-y-4">
              {/* Erro geral (exceção, rede, etc.) */}
              {syncError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="size-5" />
                    <span className="font-medium">
                      {t('sda2.workspace.azureDevOps.syncErrorTitle')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-destructive/80">
                    {syncError}
                  </p>
                </div>
              )}

              {/* Resultado com sucesso parcial ou total */}
              {syncResult && syncResult.created.length > 0 ? (
                <div
                  className={`rounded-lg border p-4 ${
                    syncResult.errors.length > 0
                      ? 'border-amber-500/30 bg-amber-500/10'
                      : 'border-green-500/30 bg-green-500/10'
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 ${
                      syncResult.errors.length > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {syncResult.errors.length > 0 ? (
                      <AlertTriangle className="size-5" />
                    ) : (
                      <Check className="size-5" />
                    )}
                    <span className="font-medium">
                      {t('sda2.workspace.azureDevOps.workItemsCreated', {
                        count: syncResult.created.length,
                      })}
                      {syncResult.errors.length > 0 &&
                        ` ${t('sda2.workspace.azureDevOps.withErrors', { count: syncResult.errors.length })}`}
                    </span>
                  </div>
                  {syncResult.skipped.length > 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('sda2.workspace.azureDevOps.itemsSkipped', {
                        count: syncResult.skipped.length,
                      })}
                    </p>
                  )}
                </div>
              ) : syncResult && !syncResult.success ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="size-5" />
                    <span className="font-medium">
                      {t('sda2.workspace.azureDevOps.syncFailed')}
                    </span>
                  </div>
                </div>
              ) : null}

              {syncResult && syncResult.errors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                  <h4 className="mb-2 font-medium text-destructive">
                    {t('sda2.workspace.azureDevOps.errorsTitle')}
                  </h4>
                  <ul className="space-y-1 text-sm text-destructive/80">
                    {syncResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        •{' '}
                        {err.item?.title ||
                          t('sda2.workspace.azureDevOps.unknownItem')}
                        : {err.error}
                      </li>
                    ))}
                    {syncResult.errors.length > 5 && (
                      <li className="text-destructive/60">
                        {t('sda2.workspace.azureDevOps.andMoreErrors', {
                          count: syncResult.errors.length - 5,
                        })}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <button
                onClick={handleOpenAzureDevOps}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                {t('sda2.workspace.azureDevOps.viewInAzureDevOps')}{' '}
                <ExternalLink className="size-4" />
              </button>
            </div>
          ) : configError ? (
            /* Erro de configuração */
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-5" />
                  <span className="font-medium">{configError}</span>
                </div>
                <p className="mt-2 text-sm text-destructive/80">
                  {t('sda2.workspace.azureDevOps.configureBeforeSync')}
                </p>
              </div>

              <Button
                onClick={() => {
                  onClose()
                  onOpenConfig?.()
                }}
                className="w-full gap-2"
              >
                <Settings className="size-4" />
                {t('sda2.workspace.azureDevOps.configTitle')}
              </Button>
            </div>
          ) : (
            /* Preview e Sincronização */
            <div className="space-y-4">
              {/* Destino */}
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Check className="size-5 text-primary" />
                  <span className="font-medium text-foreground">
                    {t('sda2.workspace.azureDevOps.destinationConfirmed')}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-foreground/80">
                  <p>
                    <strong>{t('sda2.workspace.organization')}:</strong>{' '}
                    {config?.organization}
                  </p>
                  <p>
                    <strong>{t('sda2.workspace.project')}:</strong>{' '}
                    {config?.project}
                  </p>
                  {config?.areaPath && (
                    <p>
                      <strong>
                        {t('sda2.workspace.azureDevOps.areaPath')}:
                      </strong>{' '}
                      {config.areaPath}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleOpenAzureDevOps}
                  className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {t('sda2.workspace.azureDevOps.openInAzureDevOps')}{' '}
                  <ExternalLink className="size-3" />
                </button>
              </div>

              {/* Lista de Work Items */}
              <div>
                <h3 className="mb-2 font-medium text-foreground">
                  {t('sda2.workspace.azureDevOps.workItemsToCreate', {
                    count: workItems.length,
                  })}
                </h3>
                {workItems.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                    {workItems.map((item, index) => {
                      // Determinar label e cor baseado no tipo
                      const typeLabel = AzureDevOpsService.getTypeLabel(
                        item.type,
                        item.sdaType
                      )
                      const badgeColor = AzureDevOpsService.getTypeBadgeColor(
                        item.type,
                        item.sdaType
                      )

                      return (
                        <div
                          key={`${item.type}-${item.localId || index}`}
                          className="border-b border-border/50 p-3 last:border-b-0"
                        >
                          <div className="flex items-start gap-2">
                            <Check className="mt-0.5 size-4 shrink-0 text-green-500" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {item.title}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${badgeColor}`}
                                >
                                  {typeLabel}
                                </span>
                                {item.parentLocalId && (
                                  <span className="text-xs text-muted-foreground">
                                    → parent:{' '}
                                    {item.parentLocalId.substring(0, 20)}...
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
                    <Settings className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {t('sda2.workspace.azureDevOps.noWorkItemsSelected')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {t('sda2.workspace.azureDevOps.selectWorkItemsFirst')}
                    </p>
                  </div>
                )}
              </div>

              {/* O que acontecerá */}
              <div>
                <h3 className="mb-2 font-medium text-foreground">
                  {t('sda2.workspace.azureDevOps.whatWillHappen')}
                </h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• {t('sda2.workspace.azureDevOps.eachItemCreated')}</li>
                  <li>
                    • {t('sda2.workspace.azureDevOps.hierarchyPreserved')}
                  </li>
                  <li>• {t('sda2.workspace.azureDevOps.titleDescSynced')}</li>
                  <li>• {t('sda2.workspace.azureDevOps.adoIdDisplayed')}</li>
                </ul>
              </div>

              {/* Aviso */}
              <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-500" />
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {t('sda2.workspace.azureDevOps.alreadySyncedSkipped')}
                </p>
              </div>

              {/* Progress durante sincronização */}
              {isSyncing && (
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <div className="mb-2 flex items-center gap-3">
                    <Loader2 className="size-5 animate-spin text-primary" />
                    <span className="font-medium text-foreground">
                      {t('sda2.workspace.azureDevOps.syncingProgress', {
                        current: syncProgress.current,
                        total: syncProgress.total,
                      })}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${
                          syncProgress.total > 0
                            ? (syncProgress.current / syncProgress.total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          {syncCompleted ? (
            /* Footer após sincronização concluída */
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isLoadingProcess ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('sda2.workspace.azureDevOps.detectingProcess')}
                  </>
                ) : processInfo ? (
                  <>
                    {t('sda2.workspace.azureDevOps.devOpsProcess')}{' '}
                    <strong>{detectedProcessName}</strong>
                  </>
                ) : null}
              </div>
              <Button onClick={onClose} size="sm" className="gap-2">
                <Check className="size-4" />
                {t('sda2.workspace.close')}
              </Button>
            </>
          ) : (
            /* Footer normal */
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isLoadingProcess ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('sda2.workspace.azureDevOps.detectingProcess')}
                  </>
                ) : processInfo ? (
                  <>
                    {t('sda2.workspace.azureDevOps.process')}{' '}
                    <strong>{detectedProcessName}</strong>
                  </>
                ) : (
                  <span className="text-amber-500">
                    {t('sda2.workspace.azureDevOps.processNotDetected')}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={isSyncing}
                >
                  {t('sda2.workspace.cancel')}
                </Button>
                {!configError && (
                  <Button
                    onClick={handleConfirmSync}
                    disabled={
                      isSyncing || workItems.length === 0 || isLoadingProcess
                    }
                    size="sm"
                    className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {t('sda2.workspace.backlog.syncing')}
                      </>
                    ) : (
                      <>
                        <ExternalLink className="size-4" />
                        {t('sda2.workspace.azureDevOps.confirmAndSync')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
