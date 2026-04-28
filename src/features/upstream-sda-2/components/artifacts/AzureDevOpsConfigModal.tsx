/* eslint-disable no-console */
'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Check, Loader2, X } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { useI18n } from '@/shared/hooks/use-i18n'

import {
  azureDevOpsService,
  type AzureDevOpsConfig,
} from '../../services/azure-devops.service'

interface AzureDevOpsConfigModalProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
  /** Callback quando configuração for salva com sucesso */
  onConfigSaved?: () => void
}

export function AzureDevOpsConfigModal({
  isOpen,
  onClose,
  projectId,
  onConfigSaved,
}: AzureDevOpsConfigModalProps) {
  const { t } = useI18n('pages')
  const [config, setConfig] = useState<AzureDevOpsConfig>({
    organization: '',
    project: '',
    areaPath: '',
  })
  const [pat, setPat] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Carregar configuração salva ao abrir o modal
  useEffect(() => {
    if (isOpen && projectId) {
      const loadConfig = async () => {
        const savedConfig =
          await azureDevOpsService.loadProjectConfig(projectId)
        if (savedConfig) {
          setConfig(savedConfig)
        }

        const savedPAT = azureDevOpsService.loadPAT()
        if (savedPAT) {
          setPat(savedPAT)
        }
      }
      loadConfig()
    }
  }, [isOpen, projectId])

  // Resetar estado ao fechar
  useEffect(() => {
    if (!isOpen) {
      setTestResult(null)
      setErrors({})
    }
  }, [isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!config.organization.trim()) {
      newErrors.organization = t(
        'sda2.workspace.azureDevOps.organizationRequired'
      )
    }

    if (!config.project.trim()) {
      newErrors.project = t('sda2.workspace.azureDevOps.projectRequired')
    }

    if (!pat.trim()) {
      newErrors.pat = t('sda2.workspace.azureDevOps.patRequired')
    } else if (pat.length < 20) {
      newErrors.pat = t('sda2.workspace.azureDevOps.patInvalid')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleTestConnection = async () => {
    if (!validateForm()) return

    setIsTesting(true)
    setTestResult(null)

    try {
      const success = await azureDevOpsService.testConnection(config, pat)
      setTestResult({
        success,
        message: success
          ? t('sda2.workspace.connectionSuccessful') + ' ✓'
          : t('sda2.workspace.connectionFailed'),
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: t('sda2.workspace.errorPrefix', {
          error:
            error instanceof Error
              ? error.message
              : t('sda2.workspace.azureDevOps.unknown'),
        }),
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setIsSaving(true)

    try {
      // Salvar PAT na sessão
      azureDevOpsService.savePAT(pat)

      // Definir config ativa
      azureDevOpsService.setConfig(config)

      // Salvar config do projeto se tiver projectId
      if (projectId) {
        await azureDevOpsService.saveProjectConfig(projectId, config)
      }

      console.log('✅ Configuração Azure DevOps salva com sucesso')
      onConfigSaved?.()
      onClose()
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-xl">
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
                  {t('sda2.workspace.azureDevOps.configTitle')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t('sda2.workspace.azureDevOps.configSubtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-0.5 w-full bg-primary" />
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <div className="space-y-4">
            {/* Form Fields */}
            <div className="space-y-3">
              {/* Organização */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                  {t('sda2.workspace.organization')}{' '}
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={config.organization}
                  onChange={e =>
                    setConfig(prev => ({
                      ...prev,
                      organization: e.target.value,
                    }))
                  }
                  placeholder={t('sda2.workspace.organizationPlaceholder')}
                  className={`w-full rounded-md border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 ${
                    errors.organization ? 'border-destructive' : 'border-border'
                  }`}
                />
                {errors.organization && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.organization}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('sda2.workspace.azureDevOps.organizationUrl')}
                </p>
              </div>

              {/* Projeto */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                  {t('sda2.workspace.project')}{' '}
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={config.project}
                  onChange={e =>
                    setConfig(prev => ({ ...prev, project: e.target.value }))
                  }
                  placeholder={t('sda2.workspace.projectPlaceholder')}
                  className={`w-full rounded-md border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 ${
                    errors.project ? 'border-destructive' : 'border-border'
                  }`}
                />
                {errors.project && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.project}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('sda2.workspace.azureDevOps.projectCreationHelp')}
                </p>
              </div>

              {/* Area Path */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {t('sda2.workspace.azureDevOps.areaPath')} (
                  {t('sda2.workspace.optional')})
                </label>
                <input
                  type="text"
                  value={config.areaPath || ''}
                  onChange={e =>
                    setConfig(prev => ({ ...prev, areaPath: e.target.value }))
                  }
                  placeholder={t(
                    'sda2.workspace.azureDevOps.areaPathPlaceholder'
                  )}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('sda2.workspace.azureDevOps.areaPathHelp')}
                </p>
              </div>

              {/* Personal Access Token */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                  {t('sda2.workspace.personalAccessToken')}{' '}
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="password"
                  value={pat}
                  onChange={e => setPat(e.target.value)}
                  placeholder={t('sda2.workspace.azureDevOps.patPlaceholder')}
                  className={`w-full rounded-md border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 ${
                    errors.pat ? 'border-destructive' : 'border-border'
                  }`}
                />
                {errors.pat && (
                  <p className="mt-1 text-xs text-destructive">{errors.pat}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('sda2.workspace.azureDevOps.patPermissionHelp')}
                </p>
              </div>
            </div>

            {/* Resultado do Teste de Conexão */}
            {testResult && (
              <div
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  testResult.success
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {testResult.success ? (
                  <Check className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                {testResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('sda2.workspace.cancel')}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleTestConnection}
              disabled={
                isTesting || !config.organization || !config.project || !pat
              }
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              {isTesting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  {t('sda2.workspace.testing')}
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  {t('sda2.workspace.testConnection')}
                </>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!testResult?.success || isSaving}
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  {t('sda2.workspace.saving')}
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  {t('sda2.workspace.azureDevOps.saveConfig')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
