'use client'

/**
 * Action Status Render Components
 *
 * Provides visual feedback for CopilotKit actions.
 * Uses i18n for all labels to support platform customization.
 */
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/utils'

// ============================================================================
// ACTION STATUS CARD
// ============================================================================

export interface ActionStatusProps {
  label: string
  status: 'executing' | 'complete' | 'error'
  icon?: string
  description?: string
  result?: string
}

export function ActionStatusCard({
  label,
  status,
  icon = '🔄',
  description,
  result,
}: ActionStatusProps) {
  return (
    <div
      className={cn(
        'my-2 rounded-lg border p-3',
        status === 'executing' &&
          'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
        status === 'complete' &&
          'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
        status === 'error' &&
          'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="font-medium">{label}</span>
        {status === 'executing' && (
          <Loader2 className="ml-auto size-4 animate-spin text-blue-500" />
        )}
        {status === 'complete' && (
          <CheckCircle2 className="ml-auto size-4 text-green-500" />
        )}
        {status === 'error' && (
          <XCircle className="ml-auto size-4 text-red-500" />
        )}
      </div>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
      {result && status === 'complete' && (
        <p className="mt-2 text-sm">{result}</p>
      )}
    </div>
  )
}

// ============================================================================
// ACTION ICONS (static mapping)
// ============================================================================

const ACTION_ICONS: Record<string, string> = {
  navigateToPage: '🧭',
  createSignal: '✨',
  captureFeedback: '📝',
  quickBugReport: '🐛',
  suggestFeature: '💡',
  shareSuccess: '🏆',
  rateAgentResponse: '⭐',
  searchArtifacts: '🔍',
  listArtifacts: '📋',
  readArtifact: '📄',
  createArtifact: '📦',
  executeUtilityAgent: '🤖',
  listSignals: '📊',
  listFeedbacks: '📋',
  getFeedbackStatistics: '📊',
}

// ============================================================================
// ACTION LABEL HOOK (with i18n)
// ============================================================================

export function useActionLabel() {
  const { t } = useTranslation('copilot')

  return (actionName: string): { label: string; icon: string } => {
    const key = `actionLabels.spotlight.${actionName}`
    const translated = t(key, { defaultValue: '' })
    const label = translated || actionName.replace(/([A-Z])/g, ' $1').trim()
    const icon = ACTION_ICONS[actionName] || '⚙️'

    return { label, icon }
  }
}

/**
 * @deprecated Use useActionLabel hook instead for i18n support
 */
export function getActionLabel(actionName: string): {
  label: string
  icon: string
} {
  const icon = ACTION_ICONS[actionName] || '⚙️'
  return {
    label: actionName.replace(/([A-Z])/g, ' $1').trim(),
    icon,
  }
}

// ============================================================================
// DEFAULT ACTION RENDER
// ============================================================================

export interface DefaultActionRenderProps {
  name: string
  status: 'executing' | 'complete' | 'error'
  args?: Record<string, unknown>
}

export function DefaultActionRender({
  name,
  status,
}: DefaultActionRenderProps) {
  const { label, icon } = getActionLabel(name)
  return <ActionStatusCard label={label} status={status} icon={icon} />
}
