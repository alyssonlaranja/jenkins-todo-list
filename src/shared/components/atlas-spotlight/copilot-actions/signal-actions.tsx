'use client'

/**
 * Signal Actions for Atlas Quick Agent
 *
 * Creates signals (insights, messages) in the Atlas system.
 * Based on: src/features/atlas/copilot-actions/
 */
import { useCopilotAction } from '@copilotkit/react-core'

import { useActionI18n } from '@/shared/hooks/use-action-i18n'
import { useI18n } from '@/shared/hooks/use-i18n'
import { emitNotificationRefresh } from '@/shared/hooks/use-notification-events'

import { SignalCreatedUI, SignalLoading } from './signal-result-ui'
import {
  callMCPToolWithParsing,
  generateId,
  type AtlasQuickAgentActionsProps,
  type SignalCategory,
  type SignalPriority,
  type SignalType,
} from './types'

// ============================================================================
// HOOK
// ============================================================================

export function useSignalActions(props: AtlasQuickAgentActionsProps) {
  const {
    userName,
    userEmail,
    currentModule,
    pathname,
    isConnected,
    namespaceId,
    namespaceName,
    licenseId,
    licenseName,
    callMCPTool,
    onSignalCreated,
  } = props
  const { t } = useI18n('copilot')

  useCopilotAction({
    name: 'createSignal',
    description: t('actions.spotlight.createSignal.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'type',
        type: 'string',
        description: t('actions.spotlight.createSignal.params.type'),
        required: true,
        enum: ['insight', 'message'],
      },
      {
        name: 'category',
        type: 'string',
        description: t('actions.spotlight.createSignal.params.category'),
        required: true,
      },
      {
        name: 'title',
        type: 'string',
        description: t('actions.spotlight.createSignal.params.title'),
        required: true,
      },
      {
        name: 'content',
        type: 'string',
        description: t('actions.spotlight.createSignal.params.content'),
        required: true,
      },
      {
        name: 'priority',
        type: 'string',
        description: t('actions.spotlight.createSignal.params.priority'),
        required: true,
      },
    ],
    render: ({ status, result, args }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as {
          id: string
          type: 'insight' | 'message'
          category: string
          title: string
          priority: string
        }
        return <SignalCreatedUI data={data} status={status} />
      }
      return (
        <SignalLoading
          type={(args?.type as 'insight' | 'message') || 'insight'}
        />
      )
    },
    handler: async ({ type, category, title, content, priority }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel. Conecte-se primeiro.'
      }

      try {
        const signalId = generateId('sig')
        const now = new Date().toISOString()
        const key = `ATLAS_${(type as string).toUpperCase()}_${signalId}`

        const signalEntry = {
          id: signalId,
          type: type as SignalType,
          category: category as SignalCategory,
          status: 'unread',
          priority: priority as SignalPriority,
          title,
          content,
          createdAt: now,
          updatedAt: now,
          author: {
            id: userEmail || 'anonymous',
            name: userName || 'Unknown',
            email: userEmail || '',
            type: 'user',
          },
          source: {
            module: currentModule,
            url: pathname,
            capturedAt: now,
            capturedVia: 'atlas-quick-agent',
          },
          namespaceId: namespaceId || '',
          namespaceName: namespaceName || '',
          licenseId: licenseId || '',
          licenseName: licenseName || '',
        }

        const result = await callMCPToolWithParsing(
          callMCPTool,
          'create_artifact',
          {
            key,
            value: JSON.stringify(signalEntry),
            description: `Atlas Signal [${type}]: ${category} - ${title}`,
            type: 'signal',
            accessibility: 'Namespace',
          }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        onSignalCreated?.()
        emitNotificationRefresh() // Trigger notification refresh
        return {
          id: signalId,
          type: type as 'insight' | 'message',
          category: category as string,
          title: title as string,
          priority: priority as string,
          userName,
        }
      } catch (error) {
        return `Erro ao criar signal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    },
  })
}
