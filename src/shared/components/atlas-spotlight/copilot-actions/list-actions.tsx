'use client'

/**
 * List Actions for Atlas Quick Agent
 *
 * Actions for listing signals and feedbacks with statistics.
 * Based on: src/features/atlas/copilot-actions/data-actions.tsx
 */
import { useCopilotAction } from '@copilotkit/react-core'

import { useActionI18n } from '@/shared/hooks/use-action-i18n'
import { useI18n } from '@/shared/hooks/use-i18n'

import { ActionStatusCard } from './action-status-render'
import { FeedbackListUI, type FeedbackItem } from './feedback-list-ui'
import {
  SignalListUI,
  StatisticsUI,
  type SignalItem,
  type StatisticsData,
} from './signal-list-ui'
import {
  callMCPToolWithParsing,
  type AtlasQuickAgentActionsProps,
} from './types'

// ============================================================================
// HOOK
// ============================================================================

export function useListActions(props: AtlasQuickAgentActionsProps) {
  const { isConnected, callMCPTool } = props
  const { t } = useI18n('copilot')

  // ========================================
  // LIST SIGNALS
  // ========================================

  useCopilotAction({
    name: 'listSignals',
    description: t('actions.spotlight.listSignals.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'type',
        type: 'string',
        description: t('actions.spotlight.listSignals.params.type'),
        required: false,
      },
    ],
    render: ({ status, result, args }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as { signals: SignalItem[]; filterType: string }
        return (
          <SignalListUI
            signals={data.signals}
            status={status}
            filterType={data.filterType}
          />
        )
      }
      return <SignalListUI status={status} filterType={args?.type as string} />
    },
    handler: async ({ type = 'all' }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const pattern =
          type === 'all'
            ? 'ATLAS_.*'
            : `ATLAS_${(type as string).toUpperCase()}_.*`

        const result = await callMCPToolWithParsing(
          callMCPTool,
          'get_artifact',
          { key_pattern: pattern }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        const data = result.result as {
          artifacts?: Array<{ key: string; value: string }>
          matches?: Array<{ key: string; value: string }>
        }
        const artifacts = data.artifacts || data.matches || []

        if (artifacts.length === 0) {
          return { signals: [], filterType: type as string }
        }

        const signals = artifacts
          .slice(0, 15)
          .map((a: { key: string; value: string }) => {
            try {
              const signal =
                typeof a.value === 'string' ? JSON.parse(a.value) : a.value
              return {
                id: signal.id || a.key,
                type: signal.type || 'message',
                category: signal.category || 'unknown',
                title: signal.title || 'Sem titulo',
                priority: signal.priority || 'medium',
                createdAt: signal.createdAt,
              } as SignalItem
            } catch {
              return null
            }
          })
          .filter((s): s is SignalItem => s !== null)

        return { signals, filterType: type as string }
      } catch (error) {
        return `Erro ao listar signals: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    },
  })

  // ========================================
  // LIST FEEDBACKS (with Rich UI)
  // ========================================

  useCopilotAction({
    name: 'listFeedbacks',
    description: t('actions.spotlight.listFeedbacks.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'status',
        type: 'string',
        description: t('actions.spotlight.listFeedbacks.params.status'),
        required: false,
      },
      {
        name: 'category',
        type: 'string',
        description: t('actions.spotlight.listFeedbacks.params.category'),
        required: false,
      },
      {
        name: 'severity',
        type: 'string',
        description: t('actions.spotlight.listFeedbacks.params.severity'),
        required: false,
      },
      {
        name: 'limit',
        type: 'number',
        description: t('actions.spotlight.listFeedbacks.params.limit'),
        required: false,
      },
    ],
    render: ({ status, result }) => {
      // When complete and we have feedbacks, show the rich UI
      if (status === 'complete' && result) {
        // Handle both structured result and string error messages
        if (typeof result === 'object' && 'feedbacks' in result) {
          const feedbackResult = result as {
            feedbacks: FeedbackItem[]
            totalCount: number
          }
          return (
            <FeedbackListUI
              feedbacks={feedbackResult.feedbacks}
              status={status}
              totalCount={feedbackResult.totalCount}
              onNavigateToFeedback={id => {
                // Navigate to feedback hub with selected feedback
                props.onNavigate(`/dashboard/atlas?selected=${id}`)
              }}
            />
          )
        }
        // If result is a string (error message), show action card
        return (
          <ActionStatusCard
            label="Resultado"
            status={status}
            icon="📋"
            description={String(result)}
          />
        )
      }

      // Loading state
      return <FeedbackListUI feedbacks={[]} status={status} totalCount={0} />
    },
    handler: async ({
      status = 'all',
      category = 'all',
      severity = 'all',
      limit = 20,
    }) => {
      if (!callMCPTool) {
        return {
          feedbacks: [],
          totalCount: 0,
          error: 'Conexao MCP nao disponivel.',
        }
      }

      try {
        // Use regex pattern to match all FEEDBACK_ artifacts
        const pattern = 'FEEDBACK_.*'
        console.log('[listFeedbacks] Searching with pattern:', pattern)

        const result = await callMCPToolWithParsing(
          callMCPTool,
          'get_artifact',
          { key_pattern: pattern }
        )

        if (!result.ok) {
          console.error('[listFeedbacks] MCP call failed:', result.error)
          return { feedbacks: [], totalCount: 0, error: result.error }
        }

        // Handle different response structures
        const data = result.result as Record<string, unknown>

        // Try to get artifacts from various possible response structures
        const artifacts = ((data?.artifacts as Array<{
          key: string
          value: unknown
        }>) ||
          (data?.matches as Array<{ key: string; value: unknown }>) ||
          (Array.isArray(data) ? data : [])) as Array<{
          key: string
          value: unknown
        }>

        if (artifacts.length === 0) {
          return { feedbacks: [], totalCount: 0 }
        }

        // Parse and filter feedbacks
        const feedbacks = artifacts
          .map((a: { key: string; value: unknown }) => {
            try {
              const parsed =
                typeof a.value === 'string' ? JSON.parse(a.value) : a.value
              return parsed as FeedbackItem
            } catch (e) {
              console.warn('[listFeedbacks] Failed to parse:', a.key, e)
              return null
            }
          })
          .filter((f): f is FeedbackItem => f !== null)
          .filter(f => {
            if (status !== 'all' && f.status !== status) return false
            if (category !== 'all' && f.category !== category) return false
            if (severity !== 'all' && f.severity !== severity) return false
            return true
          })
          .slice(0, limit as number)

        console.log('[listFeedbacks] Found feedbacks:', feedbacks.length)

        // Return structured data for the UI
        return {
          feedbacks,
          totalCount: artifacts.length,
        }
      } catch (error) {
        console.error('[listFeedbacks] Exception:', error)
        return {
          feedbacks: [],
          totalCount: 0,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
  })

  // ========================================
  // GET FEEDBACK STATISTICS
  // ========================================

  useCopilotAction({
    name: 'getFeedbackStatistics',
    description: t('actions.spotlight.getFeedbackStatistics.description'),
    disabled: !isConnected,
    parameters: [],
    render: ({ status, result }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as StatisticsData
        return <StatisticsUI data={data} status={status} />
      }
      return <StatisticsUI status={status} />
    },
    handler: async () => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const pattern = 'FEEDBACK_.*'
        const result = await callMCPToolWithParsing(
          callMCPTool,
          'get_artifact',
          { key_pattern: pattern }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        const data = result.result as {
          artifacts?: Array<{ value: string }>
          matches?: Array<{ value: string }>
        }
        const artifacts = data.artifacts || data.matches || []

        const feedbacks = artifacts
          .map((a: { value: string }) => {
            try {
              return typeof a.value === 'string' ? JSON.parse(a.value) : a.value
            } catch {
              return null
            }
          })
          .filter((f: unknown) => f !== null)

        if (feedbacks.length === 0) {
          return 'Nenhum feedback encontrado para calcular estatisticas.'
        }

        // Calculate stats
        const byStatus: Record<string, number> = {}
        const byCategory: Record<string, number> = {}
        const bySeverity: Record<string, number> = {}

        feedbacks.forEach(
          (f: { status?: string; category?: string; severity?: string }) => {
            byStatus[f.status || 'unknown'] =
              (byStatus[f.status || 'unknown'] || 0) + 1
            byCategory[f.category || 'unknown'] =
              (byCategory[f.category || 'unknown'] || 0) + 1
            bySeverity[f.severity || 'unknown'] =
              (bySeverity[f.severity || 'unknown'] || 0) + 1
          }
        )

        const pending =
          (byStatus.new || 0) +
          (byStatus.acknowledged || 0) +
          (byStatus.in_progress || 0)
        const resolved = (byStatus.resolved || 0) + (byStatus.wont_fix || 0)
        const resolutionRate =
          feedbacks.length > 0
            ? Number(((resolved / feedbacks.length) * 100).toFixed(1))
            : 0

        return {
          total: feedbacks.length,
          pending,
          resolved,
          resolutionRate,
          byStatus,
          byCategory,
          bySeverity,
        } as StatisticsData
      } catch (error) {
        return `Erro: ${error instanceof Error ? error.message : 'Erro'}`
      }
    },
  })
}
