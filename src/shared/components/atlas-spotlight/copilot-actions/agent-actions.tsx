'use client'

/**
 * Agent Actions for Atlas Quick Agent
 *
 * Execute utility agents via MCP.
 * Based on: src/features/upstream/components/wizard/copilot-actions/mcp-integration-actions.tsx
 */
import { useCopilotAction } from '@copilotkit/react-core'

import { useActionI18n } from '@/shared/hooks/use-action-i18n'
import { useI18n } from '@/shared/hooks/use-i18n'

import { AgentExecutionUI } from './agent-result-ui'
import {
  callMCPToolWithParsing,
  type AtlasQuickAgentActionsProps,
} from './types'

// ============================================================================
// HOOK
// ============================================================================

export function useAgentActions(props: AtlasQuickAgentActionsProps) {
  const { isConnected, callMCPTool } = props
  const { t } = useI18n('copilot')

  useCopilotAction({
    name: 'executeUtilityAgent',
    description: t('actions.spotlight.executeUtilityAgent.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'user_input',
        type: 'string',
        description: t(
          'actions.spotlight.executeUtilityAgent.params.user_input'
        ),
        required: true,
      },
    ],
    render: ({ status, result, args }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as {
          success: boolean
          input: string
          output: string
          error?: string
        }
        return <AgentExecutionUI data={data} status={status} />
      }
      return (
        <AgentExecutionUI status={status} input={args?.user_input as string} />
      )
    },
    handler: async ({ user_input }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const result = await callMCPToolWithParsing(
          callMCPTool,
          'execute_agent',
          { user_input }
        )

        if (!result.ok) {
          return {
            success: false,
            input: user_input as string,
            output: '',
            error: result.error,
          }
        }

        // Format response
        let responseText = ''
        if (typeof result.result === 'string') {
          responseText = result.result
        } else {
          responseText = JSON.stringify(result.result, null, 2)
        }

        return {
          success: true,
          input: user_input as string,
          output: responseText.substring(0, 3000),
        }
      } catch (error) {
        return {
          success: false,
          input: user_input as string,
          output: '',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
  })
}
