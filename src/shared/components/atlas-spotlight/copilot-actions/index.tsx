'use client'

/**
 * Atlas Quick Agent Actions
 *
 * Combines all CopilotKit actions for the Atlas Quick Agent.
 * This component must be rendered INSIDE CopilotKit provider.
 *
 * Migrated to unified Copilot pattern - uses CopilotActionsRegistrar
 * with spotlight handlers and i18n action descriptions.
 *
 * Actions: 25 handlers across navigation, signals, feedback, artifacts, agents, lists, and tasks.
 *
 * IMPORTANT: This component receives all context as PROPS to avoid
 * infinite re-render loops from hooks inside CopilotKit provider.
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CopilotActionsRegistrar } from '@/shared/components/copilot'
import { useActionDescriptions } from '@/shared/hooks/use-copilot'

import { createSpotlightHandlers } from '../copilot/spotlight-handlers'
import { useChatSuggestions } from './chat-suggestions'
import type { AtlasQuickAgentActionsProps } from './types'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AtlasQuickAgentActions(props: AtlasQuickAgentActionsProps) {
  const { t } = useTranslation(['copilot'])

  // Get action descriptions from registry with i18n
  const actionDescriptions = useActionDescriptions('atlas-spotlight')

  // Create spotlight handlers with context
  const spotlightHandlers = useMemo(
    () => createSpotlightHandlers({ ...props, t }),
    [props, t]
  )

  // Keep chat suggestions hook
  useChatSuggestions(props)

  // Use unified registrar pattern
  return (
    <CopilotActionsRegistrar
      descriptions={actionDescriptions}
      handlers={spotlightHandlers}
    />
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export { ActionStatusCard, getActionLabel } from './action-status-render'
export type { ActionStatusProps } from './action-status-render'
export type { AtlasQuickAgentActionsProps } from './types'

export default AtlasQuickAgentActions
