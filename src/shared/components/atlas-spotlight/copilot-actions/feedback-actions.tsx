'use client'

/**
 * Feedback Actions for Atlas Quick Agent
 *
 * Quick actions for capturing user feedback aligned with Enhanced Feedback types.
 * Creates feedbacks compatible with the Atlas Kanban Board.
 *
 * Uses centralized types from: @/features/atlas/types/categories
 */
import { useCopilotAction } from '@copilotkit/react-core'

import {
  CATEGORY_DESCRIPTIONS_FOR_AI,
  type FeedbackCategoryMap,
} from '@/features/atlas/types/categories'
import { useActionI18n } from '@/shared/hooks/use-action-i18n'
import { useI18n } from '@/shared/hooks/use-i18n'
import { emitNotificationRefresh } from '@/shared/hooks/use-notification-events'

import {
  FeedbackCreatedUI,
  FeedbackLoading,
  getCategoryToActionType,
} from './feedback-result-ui'
import {
  callMCPToolWithParsing,
  generateId,
  getSourceFromModule,
  type AtlasQuickAgentActionsProps,
  type FeedbackSource,
  type SeverityLevel,
} from './types'

// Type alias for category keys
type FeedbackCategoryType = keyof FeedbackCategoryMap

// ============================================================================
// HELPER: Create CentralizedFeedback entry
// ============================================================================

interface CreateFeedbackParams {
  category: FeedbackCategoryType
  title: string
  description: string
  severity: SeverityLevel
  tags?: string[]
  // Context
  userName: string
  userEmail: string
  currentModule: string
  pathname: string
  namespaceId?: string
  namespaceName?: string
}

function createCentralizedFeedback(params: CreateFeedbackParams) {
  const {
    category,
    title,
    description,
    severity,
    tags = [],
    userName,
    currentModule,
    pathname,
    namespaceName,
  } = params

  const feedbackId = generateId('fb')
  const now = new Date().toISOString()
  const source: FeedbackSource = getSourceFromModule(currentModule)
  const artifactKey = `FEEDBACK_${category.toUpperCase()}_${feedbackId}`

  // CentralizedFeedback structure (from atlas/types/index.ts)
  return {
    // Core identification
    id: feedbackId,
    artifactKey,

    // Content
    title: title.substring(0, 100),
    description,
    category,
    severity,
    status: 'new' as const,

    // Source tracking
    source,
    sourceId: pathname, // Use pathname as sourceId for traceability
    sourceName: currentModule,
    relatedItemId: pathname,
    relatedItemName: currentModule,

    // Attribution
    createdBy: userName || 'Unknown', // String, not object!
    createdAt: now,
    updatedAt: now,

    // Namespace
    namespace: namespaceName || '',

    // Tags
    tags: [...tags, source, 'quick-agent'],
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useFeedbackActions(props: AtlasQuickAgentActionsProps) {
  const {
    userName,
    userEmail,
    currentModule,
    pathname,
    isConnected,
    namespaceId,
    namespaceName,
    callMCPTool,
    onSignalCreated,
  } = props
  const { t } = useI18n('copilot')

  // ========================================
  // FULL FEEDBACK CAPTURE
  // ========================================

  useCopilotAction({
    name: 'captureFeedback',
    description: t('actions.spotlight.captureFeedback.description', {
      categories: Object.entries(CATEGORY_DESCRIPTIONS_FOR_AI)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; '),
    }),
    disabled: !isConnected,
    parameters: [
      {
        name: 'category',
        type: 'string',
        description: t('actions.spotlight.captureFeedback.params.category'),
        required: true,
        enum: Object.keys(CATEGORY_DESCRIPTIONS_FOR_AI),
      },
      {
        name: 'title',
        type: 'string',
        description: t('actions.spotlight.captureFeedback.params.title'),
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        description: t('actions.spotlight.captureFeedback.params.description'),
        required: true,
      },
      {
        name: 'severity',
        type: 'string',
        description: t('actions.spotlight.captureFeedback.params.severity'),
        required: true,
        enum: ['critical', 'high', 'medium', 'low'],
      },
      {
        name: 'tags',
        type: 'string[]',
        description: t('actions.spotlight.captureFeedback.params.tags'),
        required: false,
      },
    ],
    render: ({ status, result, args: _args }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as {
          id: string
          category: string
          title: string
          severity: string
        }
        return (
          <FeedbackCreatedUI
            type={getCategoryToActionType(data.category)}
            data={{
              id: data.id,
              category: data.category,
              title: data.title,
              severity: data.severity,
              userName,
            }}
            status={status}
          />
        )
      }
      return (
        <FeedbackLoading
          type={getCategoryToActionType(
            (_args?.category as string) || 'feedback'
          )}
        />
      )
    },
    handler: async ({ category, title, description, severity, tags }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const feedbackEntry = createCentralizedFeedback({
          category: category as FeedbackCategoryType,
          title: title as string,
          description: description as string,
          severity: severity as SeverityLevel,
          tags: tags as string[] | undefined,
          userName,
          userEmail,
          currentModule,
          pathname,
          namespaceId,
          namespaceName,
        })

        const result = await callMCPToolWithParsing(
          callMCPTool,
          'create_artifact',
          {
            key: feedbackEntry.artifactKey,
            value: JSON.stringify(feedbackEntry),
            description: `Feedback [${category}]: ${feedbackEntry.title}`,
            type: 'feedback',
            accessibility: 'Namespace',
          }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        onSignalCreated?.()
        emitNotificationRefresh()
        return {
          id: feedbackEntry.id,
          category: category as string,
          title: feedbackEntry.title,
          severity: severity as string,
        }
      } catch (error) {
        return `Erro ao registrar feedback: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    },
  })

  // ========================================
  // QUICK BUG REPORT
  // ========================================

  useCopilotAction({
    name: 'quickBugReport',
    description: t('actions.spotlight.quickBugReport.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'issue',
        type: 'string',
        description: t('actions.spotlight.quickBugReport.params.issue'),
        required: true,
      },
      {
        name: 'severity',
        type: 'string',
        description: t('actions.spotlight.quickBugReport.params.severity'),
        required: true,
        enum: ['critical', 'high', 'medium', 'low'],
      },
    ],
    render: ({ status, result, args: _args }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as { id: string; title: string; severity: string }
        return (
          <FeedbackCreatedUI
            type="bug"
            data={{
              id: data.id,
              category: 'bug',
              title: data.title,
              severity: data.severity,
              userName,
            }}
            status={status}
          />
        )
      }
      return <FeedbackLoading type="bug" />
    },
    handler: async ({ issue, severity }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const feedbackEntry = createCentralizedFeedback({
          category: 'bug',
          title: (issue as string).substring(0, 100),
          description: issue as string,
          severity: severity as SeverityLevel,
          tags: ['quick-report', 'bug'],
          userName,
          userEmail,
          currentModule,
          pathname,
          namespaceId,
          namespaceName,
        })

        const result = await callMCPToolWithParsing(
          callMCPTool,
          'create_artifact',
          {
            key: feedbackEntry.artifactKey,
            value: JSON.stringify(feedbackEntry),
            description: `Bug Report: ${feedbackEntry.title.substring(0, 50)}`,
            type: 'feedback',
            accessibility: 'Namespace',
          }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        onSignalCreated?.()
        emitNotificationRefresh()
        return {
          id: feedbackEntry.id,
          title: feedbackEntry.title,
          severity: severity as string,
        }
      } catch (error) {
        return `Erro ao reportar bug: ${error instanceof Error ? error.message : 'Erro'}`
      }
    },
  })

  // ========================================
  // SUGGEST FEATURE / IMPROVEMENT
  // ========================================

  useCopilotAction({
    name: 'suggestFeature',
    description: t('actions.spotlight.suggestFeature.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'suggestion',
        type: 'string',
        description: t('actions.spotlight.suggestFeature.params.suggestion'),
        required: true,
      },
      {
        name: 'benefit',
        type: 'string',
        description: t('actions.spotlight.suggestFeature.params.benefit'),
        required: false,
      },
    ],
    render: ({ status, result }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as { id: string; title: string }
        return (
          <FeedbackCreatedUI
            type="feature"
            data={{
              id: data.id,
              category: 'feature',
              title: data.title,
              severity: 'medium',
              userName,
            }}
            status={status}
          />
        )
      }
      return <FeedbackLoading type="feature" />
    },
    handler: async ({ suggestion, benefit }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const fullDescription = benefit
          ? `${suggestion}\n\nBeneficio esperado: ${benefit}`
          : (suggestion as string)

        const feedbackEntry = createCentralizedFeedback({
          category: 'feature', // Aligned with Enhanced Feedback Types
          title: (suggestion as string).substring(0, 100),
          description: fullDescription,
          severity: 'medium',
          tags: ['feature', 'feature-request'],
          userName,
          userEmail,
          currentModule,
          pathname,
          namespaceId,
          namespaceName,
        })

        const result = await callMCPToolWithParsing(
          callMCPTool,
          'create_artifact',
          {
            key: feedbackEntry.artifactKey,
            value: JSON.stringify(feedbackEntry),
            description: `Feature Suggestion: ${feedbackEntry.title.substring(0, 50)}`,
            type: 'feedback',
            accessibility: 'Namespace',
          }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        onSignalCreated?.()
        emitNotificationRefresh()
        return {
          id: feedbackEntry.id,
          title: feedbackEntry.title,
        }
      } catch (error) {
        return `Erro: ${error instanceof Error ? error.message : 'Erro'}`
      }
    },
  })

  // ========================================
  // SHARE SUCCESS / PRAISE
  // ========================================

  useCopilotAction({
    name: 'shareSuccess',
    description: t('actions.spotlight.shareSuccess.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'success',
        type: 'string',
        description: t('actions.spotlight.shareSuccess.params.success'),
        required: true,
      },
      {
        name: 'impact',
        type: 'string',
        description: t('actions.spotlight.shareSuccess.params.impact'),
        required: false,
      },
    ],
    render: ({ status, result }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as { id: string; title: string }
        return (
          <FeedbackCreatedUI
            type="success"
            data={{
              id: data.id,
              category: 'success',
              title: data.title,
              severity: 'low',
              userName,
            }}
            status={status}
          />
        )
      }
      return <FeedbackLoading type="success" />
    },
    handler: async ({ success, impact }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const fullDescription = impact
          ? `${success}\n\nImpacto: ${impact}`
          : (success as string)

        const feedbackEntry = createCentralizedFeedback({
          category: 'success', // Aligned with Enhanced Feedback Types
          title: (success as string).substring(0, 100),
          description: fullDescription,
          severity: 'low',
          tags: ['success-story', 'positive'],
          userName,
          userEmail,
          currentModule,
          pathname,
          namespaceId,
          namespaceName,
        })

        const result = await callMCPToolWithParsing(
          callMCPTool,
          'create_artifact',
          {
            key: feedbackEntry.artifactKey,
            value: JSON.stringify(feedbackEntry),
            description: `Success Story: ${feedbackEntry.title.substring(0, 50)}`,
            type: 'feedback',
            accessibility: 'Namespace',
          }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        onSignalCreated?.()
        emitNotificationRefresh()
        return {
          id: feedbackEntry.id,
          title: feedbackEntry.title,
        }
      } catch (error) {
        return `Erro: ${error instanceof Error ? error.message : 'Erro'}`
      }
    },
  })

  // ========================================
  // ASK QUESTION / DOUBT
  // ========================================

  useCopilotAction({
    name: 'askQuestion',
    description: t('actions.spotlight.askQuestion.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'question',
        type: 'string',
        description: t('actions.spotlight.askQuestion.params.question'),
        required: true,
      },
      {
        name: 'context',
        type: 'string',
        description: t('actions.spotlight.askQuestion.params.context'),
        required: false,
      },
    ],
    render: ({ status, result }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as { id: string; title: string }
        return (
          <FeedbackCreatedUI
            type="question"
            data={{
              id: data.id,
              category: 'learning',
              title: data.title,
              severity: 'low',
              userName,
            }}
            status={status}
          />
        )
      }
      return <FeedbackLoading type="question" />
    },
    handler: async ({ question, context }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const fullDescription = context
          ? `${question}\n\nContexto: ${context}`
          : (question as string)

        const feedbackEntry = createCentralizedFeedback({
          category: 'learning', // Aligned with Enhanced Feedback Types
          title: (question as string).substring(0, 100),
          description: fullDescription,
          severity: 'low',
          tags: ['question', 'learning', 'clarification'],
          userName,
          userEmail,
          currentModule,
          pathname,
          namespaceId,
          namespaceName,
        })

        const result = await callMCPToolWithParsing(
          callMCPTool,
          'create_artifact',
          {
            key: feedbackEntry.artifactKey,
            value: JSON.stringify(feedbackEntry),
            description: `Question: ${feedbackEntry.title.substring(0, 50)}`,
            type: 'feedback',
            accessibility: 'Namespace',
          }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        onSignalCreated?.()
        emitNotificationRefresh()
        return {
          id: feedbackEntry.id,
          title: feedbackEntry.title,
        }
      } catch (error) {
        return `Erro: ${error instanceof Error ? error.message : 'Erro'}`
      }
    },
  })

  // ========================================
  // SHARE INSIGHT
  // ========================================

  useCopilotAction({
    name: 'shareInsight',
    description: t('actions.spotlight.shareInsight.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'insight',
        type: 'string',
        description: t('actions.spotlight.shareInsight.params.insight'),
        required: true,
      },
      {
        name: 'implication',
        type: 'string',
        description: t('actions.spotlight.shareInsight.params.implication'),
        required: false,
      },
    ],
    render: ({ status, result }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as { id: string; title: string }
        return (
          <FeedbackCreatedUI
            type="insight"
            data={{
              id: data.id,
              category: 'insight',
              title: data.title,
              severity: 'medium',
              userName,
            }}
            status={status}
          />
        )
      }
      return <FeedbackLoading type="insight" />
    },
    handler: async ({ insight, implication }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const fullDescription = implication
          ? `${insight}\n\nImplicacao: ${implication}`
          : (insight as string)

        const feedbackEntry = createCentralizedFeedback({
          category: 'insight', // Aligned with CentralizedFeedback
          title: (insight as string).substring(0, 100),
          description: fullDescription,
          severity: 'medium',
          tags: ['insight', 'discovery', 'learning'],
          userName,
          userEmail,
          currentModule,
          pathname,
          namespaceId,
          namespaceName,
        })

        const result = await callMCPToolWithParsing(
          callMCPTool,
          'create_artifact',
          {
            key: feedbackEntry.artifactKey,
            value: JSON.stringify(feedbackEntry),
            description: `Insight: ${feedbackEntry.title.substring(0, 50)}`,
            type: 'feedback',
            accessibility: 'Namespace',
          }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        onSignalCreated?.()
        emitNotificationRefresh()
        return {
          id: feedbackEntry.id,
          title: feedbackEntry.title,
        }
      } catch (error) {
        return `Erro: ${error instanceof Error ? error.message : 'Erro'}`
      }
    },
  })

  // ========================================
  // REPORT ERROR (runtime)
  // ========================================

  useCopilotAction({
    name: 'reportError',
    description: t('actions.spotlight.reportError.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'errorMessage',
        type: 'string',
        description: t('actions.spotlight.reportError.params.errorMessage'),
        required: true,
      },
      {
        name: 'context',
        type: 'string',
        description: t('actions.spotlight.reportError.params.context'),
        required: false,
      },
      {
        name: 'severity',
        type: 'string',
        description: t('actions.spotlight.reportError.params.severity'),
        required: true,
        enum: ['critical', 'high', 'medium', 'low'],
      },
    ],
    render: ({ status, result, args: _args }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as { id: string; title: string; severity: string }
        return (
          <FeedbackCreatedUI
            type="error"
            data={{
              id: data.id,
              category: 'bug',
              title: data.title,
              severity: data.severity,
              userName,
            }}
            status={status}
          />
        )
      }
      return <FeedbackLoading type="error" />
    },
    handler: async ({ errorMessage, context, severity }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const fullDescription = context
          ? `Erro: ${errorMessage}\n\nContexto: ${context}`
          : `Erro: ${errorMessage}`

        const feedbackEntry = createCentralizedFeedback({
          category: 'bug', // Aligned with Enhanced Feedback Types (errors are bugs with high severity)
          title: (errorMessage as string).substring(0, 100),
          description: fullDescription,
          severity: severity as SeverityLevel,
          tags: ['bug', 'runtime', 'exception', 'error'],
          userName,
          userEmail,
          currentModule,
          pathname,
          namespaceId,
          namespaceName,
        })

        const result = await callMCPToolWithParsing(
          callMCPTool,
          'create_artifact',
          {
            key: feedbackEntry.artifactKey,
            value: JSON.stringify(feedbackEntry),
            description: `Error Report: ${feedbackEntry.title.substring(0, 50)}`,
            type: 'feedback',
            accessibility: 'Namespace',
          }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        onSignalCreated?.()
        emitNotificationRefresh()
        return {
          id: feedbackEntry.id,
          title: feedbackEntry.title,
          severity: severity as string,
        }
      } catch (error) {
        return `Erro ao reportar: ${error instanceof Error ? error.message : 'Erro'}`
      }
    },
  })
}
