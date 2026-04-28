'use client'

/**
 * Navigation Actions for Atlas Quick Agent
 *
 * Allows navigating to different pages/modules.
 * Based on: src/features/upstream/components/wizard/copilot-actions/
 */
import { useCopilotAction } from '@copilotkit/react-core'

import { useActionI18n } from '@/shared/hooks/use-action-i18n'
import { useI18n } from '@/shared/hooks/use-i18n'

import { ActionStatusCard } from './action-status-render'
import type { AtlasQuickAgentActionsProps } from './types'

// ============================================================================
// ROUTES MAP
// ============================================================================

const ROUTES: Record<string, string> = {
  dashboard: '/dashboard',
  upstream: '/dashboard/upstream',
  downstream: '/dashboard/downstream',
  migration: '/dashboard/migration',
  onboarding: '/dashboard/onboarding',
  atlas: '/dashboard/atlas',
  messages: '/dashboard/messages',
  settings: '/dashboard/settings',
}

// ============================================================================
// HOOK
// ============================================================================

export function useNavigationActions(props: AtlasQuickAgentActionsProps) {
  const { onNavigate } = props
  const { t } = useI18n('copilot')

  useCopilotAction({
    name: 'navigateToPage',
    description: t('actions.spotlight.navigateToPage.description'),
    parameters: [
      {
        name: 'destination',
        type: 'string',
        description: t('actions.spotlight.navigateToPage.params.destination'),
        required: true,
      },
      {
        name: 'subpath',
        type: 'string',
        description: t('actions.spotlight.navigateToPage.params.subpath'),
        required: false,
      },
    ],
    render: ({ status, args }) => (
      <ActionStatusCard
        label="Navegando..."
        status={status}
        icon="🧭"
        description={`Destino: ${args?.destination || 'dashboard'}${args?.subpath ? ` (${args.subpath})` : ''}`}
      />
    ),
    handler: async ({ destination, subpath }) => {
      const basePath = ROUTES[destination as string] || '/dashboard'
      const fullPath = subpath ? `${basePath}${subpath}` : basePath

      onNavigate(fullPath)
      return `Navegando para ${destination}${subpath ? ` (${subpath})` : ''}...`
    },
  })
}
