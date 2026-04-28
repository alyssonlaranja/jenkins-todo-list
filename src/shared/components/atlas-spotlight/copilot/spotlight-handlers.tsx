'use client'

/**
 * Atlas Spotlight Copilot Handlers
 *
 * Global utility agent handlers - uses isolated CopilotKit provider.
 * Contains 25 handlers across navigation, signals, feedback, artifacts, agents, lists, and tasks.
 */
import {
  CATEGORY_DESCRIPTIONS_FOR_AI,
  type FeedbackCategoryMap,
} from '@/features/atlas/types/categories'
import {
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from '@/features/my-tasks/types'
import type { ActionHandlerRegistry } from '@/shared/components/copilot'
import { emitNotificationRefresh } from '@/shared/hooks/use-notification-events'

import {
  ActionStatusCard,
  type ActionStatusProps,
} from '../copilot-actions/action-status-render'
import { AgentExecutionUI } from '../copilot-actions/agent-result-ui'
import {
  ArtifactCreatedUI,
  ArtifactListUI,
  ArtifactReadUI,
  ArtifactSearchUI,
} from '../copilot-actions/artifact-result-ui'
import {
  FeedbackListUI,
  type FeedbackItem,
} from '../copilot-actions/feedback-list-ui'
import {
  FeedbackCreatedUI,
  FeedbackLoading,
  getCategoryToActionType,
} from '../copilot-actions/feedback-result-ui'
import {
  SignalListUI,
  StatisticsUI,
  type SignalItem,
  type StatisticsData,
} from '../copilot-actions/signal-list-ui'
import {
  SignalCreatedUI as SignalCreatedCard,
  SignalLoading,
} from '../copilot-actions/signal-result-ui'
import { TaskListUI, type TaskItem } from '../copilot-actions/task-list-ui'
import {
  DaySummaryUI,
  TaskCompletedUI,
  TaskCreatedUI,
  TaskDeletedUI,
  TaskInsightsUI,
  TaskMovedUI,
  type DaySummaryData,
  type TaskCompletedData,
  type TaskCreatedData,
  type TaskInsightsData,
  type TaskMovedData,
} from '../copilot-actions/task-result-ui'
import {
  callMCPToolWithParsing,
  generateId,
  getSourceFromModule,
  type FeedbackSource,
  type SeverityLevel,
  type SignalCategory,
  type SignalPriority,
  type SignalType,
} from '../copilot-actions/types'

// ============================================================================
// TYPES
// ============================================================================

export interface SpotlightHandlerContext {
  userName: string
  userEmail: string
  currentModule: string
  pathname: string
  isConnected: boolean
  namespaceId?: string
  namespaceName?: string
  licenseId?: string
  licenseName?: string
  callMCPTool?: (
    toolName: string,
    args: Record<string, unknown>
  ) => Promise<unknown>
  onNavigate: (path: string) => void
  onSignalCreated: () => void
  t: (key: string, params?: Record<string, unknown>) => string
}

// ============================================================================
// CONSTANTS
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

const TASK_ARTIFACT_PREFIX = 'task-'
const TASK_ARTIFACT_TYPE = 'JSON'

type FeedbackCategoryType = keyof FeedbackCategoryMap

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapStatus(
  status: 'complete' | 'executing' | 'inProgress'
): 'complete' | 'executing' | 'error' {
  if (status === 'inProgress') return 'executing'
  return status
}

function getModuleLabel(module: string): string {
  const labels: Record<string, string> = {
    upstream: 'Upstream Framework',
    downstream: 'Downstream',
    migration: 'Migração',
    atlas: 'Atlas Hub',
    messages: 'Mensagens',
    environments: 'Ambientes',
    connections: 'Conexões',
    chat: 'Chat',
  }
  return labels[module] || module
}

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

  return {
    id: feedbackId,
    artifactKey,
    title: title.substring(0, 100),
    description,
    category,
    severity,
    status: 'new' as const,
    source,
    sourceId: pathname,
    sourceName: currentModule,
    relatedItemId: pathname,
    relatedItemName: currentModule,
    createdBy: userName || 'Unknown',
    createdAt: now,
    updatedAt: now,
    namespace: namespaceName || '',
    tags: [...tags, source, 'quick-agent'],
  }
}

// ============================================================================
// HANDLER REGISTRY
// ============================================================================

export function createSpotlightHandlers(
  ctx: SpotlightHandlerContext
): ActionHandlerRegistry {
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
    onNavigate,
    onSignalCreated,
    t,
  } = ctx

  return {
    // ========================================================================
    // NAVIGATION (1 handler)
    // ========================================================================

    spotlight_navigateToPage: {
      execute: async args => {
        const { destination, subpath } = args
        const basePath = ROUTES[destination as string] || '/dashboard'
        const fullPath = subpath ? `${basePath}${subpath}` : basePath

        onNavigate(fullPath)
        return `Navegando para ${destination}${subpath ? ` (${subpath})` : ''}...`
      },
      render: ({ status, args }) => (
        <ActionStatusCard
          label="Navegando..."
          status={status}
          icon="🧭"
          description={`Destino: ${args?.destination || 'dashboard'}${args?.subpath ? ` (${args.subpath})` : ''}`}
        />
      ),
    },

    // ========================================================================
    // SIGNAL (1 handler)
    // ========================================================================

    spotlight_createSignal: {
      execute: async args => {
        const { type, category, title, content, priority } = args

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
          emitNotificationRefresh()
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
      render: ({ status, result, args }) => {
        if (status === 'complete' && result && typeof result === 'object') {
          const data = result as {
            id: string
            type: 'insight' | 'message'
            category: string
            title: string
            priority: string
          }
          return <SignalCreatedCard data={data} status={status} />
        }
        return (
          <SignalLoading
            type={(args?.type as 'insight' | 'message') || 'insight'}
          />
        )
      },
    },

    // ========================================================================
    // FEEDBACK (7 handlers)
    // ========================================================================

    spotlight_captureFeedback: {
      execute: async args => {
        const { category, title, description, severity, tags } = args

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
      render: ({ status, result, args }) => {
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
              (args?.category as string) || 'feedback'
            )}
          />
        )
      },
    },

    spotlight_quickBugReport: {
      execute: async args => {
        const { issue, severity } = args

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
      render: ({ status, result }) => {
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
    },

    spotlight_suggestFeature: {
      execute: async args => {
        const { suggestion, benefit } = args

        if (!callMCPTool) {
          return 'Erro: Conexao MCP nao disponivel.'
        }

        try {
          const fullDescription = benefit
            ? `${suggestion}\n\nBeneficio esperado: ${benefit}`
            : (suggestion as string)

          const feedbackEntry = createCentralizedFeedback({
            category: 'feature',
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
    },

    spotlight_shareSuccess: {
      execute: async args => {
        const { success, impact } = args

        if (!callMCPTool) {
          return 'Erro: Conexao MCP nao disponivel.'
        }

        try {
          const fullDescription = impact
            ? `${success}\n\nImpacto: ${impact}`
            : (success as string)

          const feedbackEntry = createCentralizedFeedback({
            category: 'success',
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
    },

    spotlight_askQuestion: {
      execute: async args => {
        const { question, context } = args

        if (!callMCPTool) {
          return 'Erro: Conexao MCP nao disponivel.'
        }

        try {
          const fullDescription = context
            ? `${question}\n\nContexto: ${context}`
            : (question as string)

          const feedbackEntry = createCentralizedFeedback({
            category: 'learning',
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
    },

    spotlight_shareInsight: {
      execute: async args => {
        const { insight, implication } = args

        if (!callMCPTool) {
          return 'Erro: Conexao MCP nao disponivel.'
        }

        try {
          const fullDescription = implication
            ? `${insight}\n\nImplicacao: ${implication}`
            : (insight as string)

          const feedbackEntry = createCentralizedFeedback({
            category: 'insight',
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
    },

    spotlight_reportError: {
      execute: async args => {
        const { errorMessage, context, severity } = args

        if (!callMCPTool) {
          return 'Erro: Conexao MCP nao disponivel.'
        }

        try {
          const fullDescription = context
            ? `Erro: ${errorMessage}\n\nContexto: ${context}`
            : `Erro: ${errorMessage}`

          const feedbackEntry = createCentralizedFeedback({
            category: 'bug',
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
      render: ({ status, result }) => {
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
    },

    // ========================================================================
    // ARTIFACTS (4 handlers)
    // ========================================================================

    spotlight_searchArtifacts: {
      execute: async args => {
        const { searchTerm } = args

        if (!callMCPTool) {
          return 'Erro: Conexao MCP nao disponivel.'
        }

        try {
          const escapedTerm = (searchTerm as string).replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          )
          const keyPattern = `(?i).*${escapedTerm}.*`

          const result = await callMCPToolWithParsing(
            callMCPTool,
            'get_artifact',
            {
              key_pattern: keyPattern,
            }
          )

          if (!result.ok) {
            throw new Error(result.error)
          }

          const data = result.result as {
            artifacts?: Array<{
              key: string
              description?: string
              type?: string
            }>
            matches?: Array<{
              key: string
              description?: string
              type?: string
            }>
          }
          const artifacts = data.artifacts || data.matches || []

          if (artifacts.length === 0) {
            return { artifacts: [], searchTerm: searchTerm as string }
          }

          return {
            artifacts: artifacts.slice(0, 10),
            searchTerm: searchTerm as string,
          }
        } catch (error) {
          return `Erro na busca: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }
      },
      render: ({ status, result }) => {
        if (status === 'complete' && result && typeof result === 'object') {
          const data = result as {
            artifacts: Array<{
              key: string
              type?: string
              description?: string
            }>
            searchTerm: string
          }
          return <ArtifactSearchUI data={data} status={status} />
        }
        return <ArtifactSearchUI status={status} />
      },
    },

    spotlight_listArtifacts: {
      execute: async () => {
        if (!callMCPTool) {
          return 'Erro: Conexao MCP nao disponivel.'
        }

        try {
          const result = await callMCPToolWithParsing(
            callMCPTool,
            'list_artifacts',
            {}
          )

          if (!result.ok) {
            throw new Error(result.error)
          }

          const data = result.result as {
            artifacts?: Array<{ key: string; type?: string }>
          }
          const artifacts = data.artifacts || []

          if (artifacts.length === 0) {
            return []
          }

          return artifacts.slice(0, 20)
        } catch (error) {
          return `Erro ao listar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }
      },
      render: ({ status, result }) => {
        if (status === 'complete' && result && typeof result === 'object') {
          const artifacts = result as Array<{ key: string; type?: string }>
          return <ArtifactListUI artifacts={artifacts} status={status} />
        }
        return <ArtifactListUI status={status} />
      },
    },

    spotlight_readArtifact: {
      execute: async args => {
        const { key } = args

        if (!callMCPTool) {
          return 'Erro: Conexao MCP nao disponivel.'
        }

        try {
          const result = await callMCPToolWithParsing(
            callMCPTool,
            'get_artifact',
            { key }
          )

          if (!result.ok) {
            throw new Error(result.error)
          }

          const data = result.result as {
            key?: string
            value?: string | object
            type?: string
            description?: string
          }

          if (!data.value && !data.key) {
            return `Artefato "${key}" nao encontrado.`
          }

          let value = data.value || ''
          if (typeof value === 'object') {
            value = JSON.stringify(value, null, 2)
          }

          return {
            key: (data.key || key) as string,
            type: data.type,
            description: data.description,
            value: value as string,
          }
        } catch (error) {
          return `Erro ao ler: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }
      },
      render: ({ status, result }) => {
        if (status === 'complete' && result && typeof result === 'object') {
          const data = result as {
            key: string
            type?: string
            description?: string
            value: string
          }
          return <ArtifactReadUI data={data} status={status} />
        }
        return <ArtifactReadUI status={status} />
      },
    },

    spotlight_createArtifact: {
      execute: async args => {
        const { key, value, description, type = 'general' } = args

        if (!callMCPTool) {
          return 'Erro: Conexao MCP nao disponivel.'
        }

        try {
          const result = await callMCPToolWithParsing(
            callMCPTool,
            'create_artifact',
            {
              key,
              value,
              description,
              type,
              accessibility: 'Namespace',
            }
          )

          if (!result.ok) {
            throw new Error(result.error)
          }

          return {
            key: key as string,
            type: type as string,
            description: description as string,
          }
        } catch (error) {
          return `❌ Erro: ${error instanceof Error ? error.message : 'Erro'}`
        }
      },
      render: ({ status, result }) => {
        if (status === 'complete' && result && typeof result === 'object') {
          const data = result as {
            key: string
            type: string
            description?: string
          }
          return <ArtifactCreatedUI data={data} status={status} />
        }
        return <ArtifactCreatedUI status={status} />
      },
    },

    // ========================================================================
    // AGENT (1 handler)
    // ========================================================================

    spotlight_executeUtilityAgent: {
      execute: async args => {
        const { user_input } = args

        if (!callMCPTool) {
          return 'Erro: Conexao MCP nao disponivel.'
        }

        try {
          const result = await callMCPToolWithParsing(
            callMCPTool,
            'execute_agent',
            {
              user_input,
            }
          )

          if (!result.ok) {
            return {
              success: false,
              input: user_input as string,
              output: '',
              error: result.error,
            }
          }

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
          <AgentExecutionUI
            status={status}
            input={args?.user_input as string}
          />
        )
      },
    },

    // ========================================================================
    // LIST (3 handlers)
    // ========================================================================

    spotlight_listSignals: {
      execute: async args => {
        const { type = 'all' } = args

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
            {
              key_pattern: pattern,
            }
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
        return (
          <SignalListUI status={status} filterType={args?.type as string} />
        )
      },
    },

    spotlight_listFeedbacks: {
      execute: async args => {
        const {
          status = 'all',
          category = 'all',
          severity = 'all',
          limit = 20,
        } = args

        if (!callMCPTool) {
          return {
            feedbacks: [],
            totalCount: 0,
            error: 'Conexao MCP nao disponivel.',
          }
        }

        try {
          const pattern = 'FEEDBACK_.*'
          const result = await callMCPToolWithParsing(
            callMCPTool,
            'get_artifact',
            {
              key_pattern: pattern,
            }
          )

          if (!result.ok) {
            return { feedbacks: [], totalCount: 0, error: result.error }
          }

          const data = result.result as Record<string, unknown>
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

          const feedbacks = artifacts
            .map((a: { key: string; value: unknown }) => {
              try {
                const parsed =
                  typeof a.value === 'string' ? JSON.parse(a.value) : a.value
                return parsed as FeedbackItem
              } catch {
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

          return {
            feedbacks,
            totalCount: artifacts.length,
          }
        } catch (error) {
          return {
            feedbacks: [],
            totalCount: 0,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          }
        }
      },
      render: ({ status, result }) => {
        if (status === 'complete' && result) {
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
                  onNavigate(`/dashboard/atlas?selected=${id}`)
                }}
              />
            )
          }
          return (
            <ActionStatusCard
              label="Resultado"
              status={status}
              icon="📋"
              description={String(result)}
            />
          )
        }
        return <FeedbackListUI feedbacks={[]} status={status} totalCount={0} />
      },
    },

    spotlight_getFeedbackStatistics: {
      execute: async () => {
        if (!callMCPTool) {
          return 'Erro: Conexao MCP nao disponivel.'
        }

        try {
          const pattern = 'FEEDBACK_.*'
          const result = await callMCPToolWithParsing(
            callMCPTool,
            'get_artifact',
            {
              key_pattern: pattern,
            }
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
                return typeof a.value === 'string'
                  ? JSON.parse(a.value)
                  : a.value
              } catch {
                return null
              }
            })
            .filter((f: unknown) => f !== null)

          if (feedbacks.length === 0) {
            return 'Nenhum feedback encontrado para calcular estatisticas.'
          }

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
      render: ({ status, result }) => {
        if (status === 'complete' && result && typeof result === 'object') {
          const data = result as StatisticsData
          return <StatisticsUI data={data} status={status} />
        }
        return <StatisticsUI status={status} />
      },
    },

    // ========================================================================
    // TASKS (9 handlers)
    // ========================================================================

    spotlight_createTask: {
      execute: async args => {
        const {
          title,
          description,
          priority = 'medium',
          status = 'todo',
          dueDate,
          tags,
        } = args

        if (!callMCPTool) {
          return '❌ Erro: Conexão MCP não disponível.'
        }

        try {
          const taskId = generateId('task')
          const now = new Date().toISOString()

          const task = {
            id: taskId,
            title: title as string,
            description: description as string | undefined,
            status: (status as TaskStatus) || 'todo',
            priority: (priority as TaskPriority) || 'medium',
            dueDate: dueDate as string | undefined,
            tags: tags ? (tags as string).split(',').map(t => t.trim()) : [],
            source: {
              module: currentModule || 'chat',
              referenceName: `Criado via Atlas Quick Agent`,
            },
            createdAt: now,
            updatedAt: now,
          }

          const artifactKey = `${TASK_ARTIFACT_PREFIX}${taskId}`

          const result = await callMCPToolWithParsing(
            callMCPTool,
            'create_artifact',
            {
              key: artifactKey,
              value: JSON.stringify(task),
              description: `Tarefa: ${title}`,
              type: TASK_ARTIFACT_TYPE,
              accessibility: 'NAMESPACE_USER',
              conflict_strategy: 'OVERWRITE',
              tags: tags || '',
            }
          )

          if (!result.ok) {
            throw new Error(result.error)
          }

          return {
            title: title as string,
            description: description as string | undefined,
            priority: (priority as TaskPriority) || 'medium',
            status: (status as TaskStatus) || 'todo',
            dueDate: dueDate as string | undefined,
            tags: tags
              ? (tags as string).split(',').map(t => t.trim())
              : undefined,
          } as TaskCreatedData
        } catch (error) {
          return `❌ Erro ao criar tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }
      },
      render: ({ status, args, result }) => {
        if (status === 'inProgress' || status === 'executing') {
          return (
            <ActionStatusCard
              label="Criando tarefa..."
              status={mapStatus(status)}
              icon="✅"
              description={`"${args?.title || ''}"`}
            />
          )
        }

        if (typeof result === 'string' && result.startsWith('❌')) {
          return (
            <ActionStatusCard
              label="Erro ao criar tarefa"
              status="error"
              icon="❌"
              description={result.replace('❌ ', '')}
            />
          )
        }

        if (result && typeof result === 'object' && 'title' in result) {
          return <TaskCreatedUI data={result as TaskCreatedData} />
        }

        return (
          <ActionStatusCard
            label="Processando..."
            status="complete"
            icon="✓"
            description=""
          />
        )
      },
    },

    spotlight_listMyTasks: {
      execute: async args => {
        const { status: filterStatus } = args

        if (!callMCPTool) {
          return '❌ Erro: Conexão MCP não disponível.'
        }

        try {
          const result = await callMCPToolWithParsing(
            callMCPTool,
            'get_artifact',
            {
              key_pattern: `^${TASK_ARTIFACT_PREFIX}.*`,
            }
          )

          if (!result.ok) {
            throw new Error(result.error)
          }

          interface TaskArtifact {
            key: string
            value: string | object
            type?: string
          }

          const data = result.result as { artifacts?: TaskArtifact[] }
          const artifacts = data.artifacts || []

          const tasks: TaskItem[] = artifacts
            .map(artifact => {
              try {
                const parsed =
                  typeof artifact.value === 'string'
                    ? JSON.parse(artifact.value)
                    : artifact.value
                return parsed as TaskItem
              } catch {
                return null
              }
            })
            .filter((t): t is TaskItem => t !== null)

          const filteredTasks =
            filterStatus && filterStatus !== 'all'
              ? tasks.filter(t => t.status === filterStatus)
              : tasks

          return {
            tasks: filteredTasks,
            totalCount: tasks.length,
          }
        } catch (error) {
          return `❌ Erro ao listar tarefas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }
      },
      render: ({ status, result, args }) => {
        if (status === 'inProgress' || status === 'executing') {
          return (
            <TaskListUI
              tasks={[]}
              status={status}
              groupByStatus={!args?.status || args.status === 'all'}
            />
          )
        }

        if (typeof result === 'string' && result.startsWith('❌')) {
          return (
            <ActionStatusCard
              label="Erro ao buscar tarefas"
              status="error"
              icon="❌"
              description={result.replace('❌ ', '')}
            />
          )
        }

        if (result && typeof result === 'object' && 'tasks' in result) {
          const data = result as { tasks: TaskItem[]; totalCount: number }
          return (
            <TaskListUI
              tasks={data.tasks}
              status="complete"
              totalCount={data.totalCount}
              groupByStatus={!args?.status || args.status === 'all'}
            />
          )
        }

        return <TaskListUI tasks={[]} status="complete" groupByStatus={true} />
      },
    },

    spotlight_completeTask: {
      execute: async args => {
        const { taskTitle } = args

        if (!callMCPTool) {
          return '❌ Erro: Conexão MCP não disponível.'
        }

        try {
          const result = await callMCPToolWithParsing(
            callMCPTool,
            'get_artifact',
            {
              key_pattern: `^${TASK_ARTIFACT_PREFIX}.*`,
            }
          )

          if (!result.ok) {
            throw new Error(result.error)
          }

          interface TaskArtifact {
            id: string
            key: string
            value: string | object
          }

          interface TaskData {
            id: string
            title: string
            status: TaskStatus
            updatedAt?: string
            completedAt?: string
          }

          const data = result.result as { artifacts?: TaskArtifact[] }
          const artifacts = data.artifacts || []

          let matchingArtifact: TaskArtifact | undefined
          let matchingTask: TaskData | undefined

          for (const artifact of artifacts) {
            try {
              const task =
                typeof artifact.value === 'string'
                  ? JSON.parse(artifact.value)
                  : artifact.value

              if (
                task.title
                  .toLowerCase()
                  .includes((taskTitle as string).toLowerCase())
              ) {
                matchingArtifact = artifact
                matchingTask = task
                break
              }
            } catch {
              continue
            }
          }

          if (!matchingArtifact || !matchingTask) {
            return `❌ Tarefa não encontrada: "${taskTitle}". Use "listar tarefas" para ver suas tarefas.`
          }

          if (matchingTask.status === 'done') {
            return `ℹ️ A tarefa "${matchingTask.title}" já está concluída!`
          }

          const now = new Date().toISOString()
          const updatedTask = {
            ...matchingTask,
            status: 'done' as TaskStatus,
            updatedAt: now,
            completedAt: now,
          }

          const updateResult = await callMCPToolWithParsing(
            callMCPTool,
            'update_artifact',
            {
              id: matchingArtifact.id,
              value: JSON.stringify(updatedTask),
              description: `Tarefa: ${matchingTask.title}`,
              promote_to_production: true,
            }
          )

          if (!updateResult.ok) {
            throw new Error(updateResult.error)
          }

          return {
            title: matchingTask.title,
            userName: userName || 'Usuário',
          } as TaskCompletedData
        } catch (error) {
          return `❌ Erro ao completar tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }
      },
      render: ({ status, args, result }) => {
        if (status === 'inProgress' || status === 'executing') {
          return (
            <ActionStatusCard
              label="Completando tarefa..."
              status={mapStatus(status)}
              icon="🎉"
              description={`"${args?.taskTitle || ''}"`}
            />
          )
        }

        if (typeof result === 'string') {
          if (result.startsWith('❌')) {
            return (
              <ActionStatusCard
                label="Erro"
                status="error"
                icon="❌"
                description={result.replace('❌ ', '')}
              />
            )
          }
          if (result.startsWith('ℹ️')) {
            return (
              <ActionStatusCard
                label="Info"
                status="complete"
                icon="ℹ️"
                description={result.replace('ℹ️ ', '')}
              />
            )
          }
        }

        if (result && typeof result === 'object' && 'title' in result) {
          return <TaskCompletedUI data={result as TaskCompletedData} />
        }

        return (
          <ActionStatusCard
            label="Processando..."
            status="complete"
            icon="✓"
            description=""
          />
        )
      },
    },

    spotlight_moveTask: {
      execute: async args => {
        const { taskTitle, newStatus } = args

        if (!callMCPTool) {
          return '❌ Erro: Conexão MCP não disponível.'
        }

        const validStatuses: TaskStatus[] = [
          'backlog',
          'todo',
          'in_progress',
          'review',
          'done',
        ]
        if (!validStatuses.includes(newStatus as TaskStatus)) {
          return `❌ Status inválido: "${newStatus}". Use: backlog, todo, in_progress, review, done.`
        }

        try {
          const result = await callMCPToolWithParsing(
            callMCPTool,
            'get_artifact',
            {
              key_pattern: `^${TASK_ARTIFACT_PREFIX}.*`,
            }
          )

          if (!result.ok) {
            throw new Error(result.error)
          }

          interface TaskArtifact {
            id: string
            key: string
            value: string | object
          }

          interface TaskData {
            id: string
            title: string
            status: TaskStatus
            updatedAt?: string
            completedAt?: string
          }

          const data = result.result as { artifacts?: TaskArtifact[] }
          const artifacts = data.artifacts || []

          let matchingArtifact: TaskArtifact | undefined
          let matchingTask: TaskData | undefined

          for (const artifact of artifacts) {
            try {
              const task =
                typeof artifact.value === 'string'
                  ? JSON.parse(artifact.value)
                  : artifact.value

              if (
                task.title
                  .toLowerCase()
                  .includes((taskTitle as string).toLowerCase())
              ) {
                matchingArtifact = artifact
                matchingTask = task
                break
              }
            } catch {
              continue
            }
          }

          if (!matchingArtifact || !matchingTask) {
            return `❌ Tarefa não encontrada: "${taskTitle}". Use "listar tarefas" para ver suas tarefas.`
          }

          if (matchingTask.status === newStatus) {
            return `ℹ️ A tarefa "${matchingTask.title}" já está em "${TASK_STATUS_LABELS[newStatus as TaskStatus]}".`
          }

          const oldStatus = matchingTask.status

          const now = new Date().toISOString()
          const updatedTask = {
            ...matchingTask,
            status: newStatus as TaskStatus,
            updatedAt: now,
            completedAt: newStatus === 'done' ? now : undefined,
          }

          const updateResult = await callMCPToolWithParsing(
            callMCPTool,
            'update_artifact',
            {
              id: matchingArtifact.id,
              value: JSON.stringify(updatedTask),
              description: `Tarefa: ${matchingTask.title}`,
              promote_to_production: true,
            }
          )

          if (!updateResult.ok) {
            throw new Error(updateResult.error)
          }

          return {
            title: matchingTask.title,
            fromStatus: oldStatus,
            toStatus: newStatus as TaskStatus,
          } as TaskMovedData
        } catch (error) {
          return `❌ Erro ao mover tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }
      },
      render: ({ status, args, result }) => {
        if (status === 'inProgress' || status === 'executing') {
          return (
            <ActionStatusCard
              label="Movendo tarefa..."
              status={mapStatus(status)}
              icon="📦"
              description={`"${args?.taskTitle || ''}" → ${args?.newStatus || ''}`}
            />
          )
        }

        if (typeof result === 'string') {
          if (result.startsWith('❌')) {
            return (
              <ActionStatusCard
                label="Erro"
                status="error"
                icon="❌"
                description={result.replace('❌ ', '')}
              />
            )
          }
          if (result.startsWith('ℹ️')) {
            return (
              <ActionStatusCard
                label="Info"
                status="complete"
                icon="ℹ️"
                description={result.replace('ℹ️ ', '')}
              />
            )
          }
        }

        if (result && typeof result === 'object' && 'fromStatus' in result) {
          return <TaskMovedUI data={result as TaskMovedData} />
        }

        return (
          <ActionStatusCard
            label="Processando..."
            status="complete"
            icon="✓"
            description=""
          />
        )
      },
    },

    spotlight_deleteTask: {
      execute: async args => {
        const { taskTitle } = args

        if (!callMCPTool) {
          return '❌ Erro: Conexão MCP não disponível.'
        }

        try {
          const result = await callMCPToolWithParsing(
            callMCPTool,
            'get_artifact',
            {
              key_pattern: `^${TASK_ARTIFACT_PREFIX}.*`,
            }
          )

          if (!result.ok) {
            throw new Error(result.error)
          }

          interface TaskArtifact {
            id: string
            key: string
            value: string | object
          }

          interface TaskData {
            id: string
            title: string
          }

          const data = result.result as { artifacts?: TaskArtifact[] }
          const artifacts = data.artifacts || []

          let matchingArtifact: TaskArtifact | undefined
          let matchingTask: TaskData | undefined

          for (const artifact of artifacts) {
            try {
              const task =
                typeof artifact.value === 'string'
                  ? JSON.parse(artifact.value)
                  : artifact.value

              if (
                task.title
                  .toLowerCase()
                  .includes((taskTitle as string).toLowerCase())
              ) {
                matchingArtifact = artifact
                matchingTask = task
                break
              }
            } catch {
              continue
            }
          }

          if (!matchingArtifact || !matchingTask) {
            return `❌ Tarefa não encontrada: "${taskTitle}". Use "listar tarefas" para ver suas tarefas.`
          }

          const deleteResult = await callMCPToolWithParsing(
            callMCPTool,
            'delete_artifact',
            {
              id: matchingArtifact.id,
            }
          )

          if (!deleteResult.ok) {
            throw new Error(deleteResult.error)
          }

          return { deletedTitle: matchingTask.title }
        } catch (error) {
          return `❌ Erro ao excluir tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }
      },
      render: ({ status, args, result }) => {
        if (status === 'inProgress' || status === 'executing') {
          return (
            <ActionStatusCard
              label="Excluindo tarefa..."
              status={mapStatus(status)}
              icon="🗑️"
              description={`"${args?.taskTitle || ''}"`}
            />
          )
        }

        if (typeof result === 'string' && result.startsWith('❌')) {
          return (
            <ActionStatusCard
              label="Erro"
              status="error"
              icon="❌"
              description={result.replace('❌ ', '')}
            />
          )
        }

        if (result && typeof result === 'object' && 'deletedTitle' in result) {
          return (
            <TaskDeletedUI
              title={(result as { deletedTitle: string }).deletedTitle}
            />
          )
        }

        return (
          <ActionStatusCard
            label="Processando..."
            status="complete"
            icon="✓"
            description=""
          />
        )
      },
    },

    spotlight_summarizeDay: {
      execute: async () => {
        if (!callMCPTool) {
          return '❌ Erro: Conexão MCP não disponível.'
        }

        try {
          const result = await callMCPToolWithParsing(
            callMCPTool,
            'get_artifact',
            {
              key_pattern: `^${TASK_ARTIFACT_PREFIX}.*`,
            }
          )

          if (!result.ok) {
            throw new Error(result.error)
          }

          interface TaskArtifact {
            key: string
            value: string | object
          }

          interface TaskData {
            id: string
            title: string
            description?: string
            status: TaskStatus
            priority: TaskPriority
            dueDate?: string
            updatedAt?: string
            createdAt?: string
          }

          const data = result.result as { artifacts?: TaskArtifact[] }
          const artifacts = data.artifacts || []

          const tasks: TaskData[] = artifacts
            .map(artifact => {
              try {
                return typeof artifact.value === 'string'
                  ? JSON.parse(artifact.value)
                  : artifact.value
              } catch {
                return null
              }
            })
            .filter((t): t is TaskData => t !== null)

          const today = new Date()
          today.setHours(0, 0, 0, 0)

          const activeTasks = tasks.filter(t => t.status !== 'done')

          const overdueTasks = activeTasks
            .filter(t => {
              if (!t.dueDate) return false
              const dueDate = new Date(t.dueDate)
              dueDate.setHours(0, 0, 0, 0)
              return dueDate < today
            })
            .map(t => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              status: t.status,
              dueDate: t.dueDate,
              daysOverdue: Math.floor(
                (today.getTime() - new Date(t.dueDate!).getTime()) /
                  (1000 * 60 * 60 * 24)
              ),
            }))

          const todayTasks = activeTasks
            .filter(t => {
              if (!t.dueDate) return false
              const dueDate = new Date(t.dueDate)
              dueDate.setHours(0, 0, 0, 0)
              return dueDate.getTime() === today.getTime()
            })
            .map(t => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              status: t.status,
              dueDate: t.dueDate,
            }))

          const highPriorityTasks = activeTasks
            .filter(
              t =>
                (t.priority === 'critical' || t.priority === 'high') &&
                t.status !== 'in_progress'
            )
            .map(t => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              status: t.status,
              dueDate: t.dueDate,
            }))

          const inProgressTasks = activeTasks
            .filter(t => t.status === 'in_progress')
            .map(t => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              status: t.status,
              dueDate: t.dueDate,
            }))

          const totalActive = activeTasks.length
          const todoCount = activeTasks.filter(t => t.status === 'todo').length
          const reviewCount = activeTasks.filter(
            t => t.status === 'review'
          ).length

          let suggestion: DaySummaryData['suggestion'] = undefined
          if (activeTasks.length === 0) {
            suggestion = {
              type: 'empty',
              message:
                'Você está com a caixa zerada! Aproveite para planejar novas tarefas.',
            }
          } else if (overdueTasks.length > 0) {
            const topOverdue = overdueTasks[0]
            suggestion = {
              type: 'overdue',
              taskTitle: topOverdue?.title,
              message: `Comece resolvendo "${topOverdue?.title}" que está atrasada.`,
            }
          } else if (
            inProgressTasks.length === 0 &&
            highPriorityTasks.length > 0
          ) {
            const topPriority = highPriorityTasks[0]
            suggestion = {
              type: 'priority',
              taskTitle: topPriority?.title,
              message: `Que tal começar com "${topPriority?.title}"? É alta prioridade!`,
            }
          } else if (inProgressTasks.length > 0) {
            suggestion = {
              type: 'focus',
              message:
                'Continue focando nas tarefas em andamento antes de pegar novas.',
            }
          }

          return {
            userName: userName || 'Usuário',
            overdueTasks,
            todayTasks,
            inProgressTasks,
            highPriorityTasks,
            stats: {
              totalActive,
              inProgress: inProgressTasks.length,
              todo: todoCount,
              review: reviewCount,
            },
            suggestion,
          } as DaySummaryData
        } catch (error) {
          return `❌ Erro ao gerar resumo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }
      },
      render: ({ status, result }) => {
        if (status === 'inProgress' || status === 'executing') {
          return (
            <ActionStatusCard
              label="Preparando seu resumo..."
              status={mapStatus(status)}
              icon="📊"
              description="Analisando tarefas e prioridades"
            />
          )
        }

        if (typeof result === 'string' && result.startsWith('❌')) {
          return (
            <ActionStatusCard
              label="Erro"
              status="error"
              icon="❌"
              description={result.replace('❌ ', '')}
            />
          )
        }

        if (result && typeof result === 'object' && 'userName' in result) {
          return <DaySummaryUI data={result as DaySummaryData} />
        }

        return (
          <ActionStatusCard
            label="Processando..."
            status="complete"
            icon="✓"
            description=""
          />
        )
      },
    },

    spotlight_getTaskInsights: {
      execute: async () => {
        if (!callMCPTool) {
          return '❌ Erro: Conexão MCP não disponível.'
        }

        try {
          const result = await callMCPToolWithParsing(
            callMCPTool,
            'get_artifact',
            {
              key_pattern: `^${TASK_ARTIFACT_PREFIX}.*`,
            }
          )

          if (!result.ok) {
            throw new Error(result.error)
          }

          interface TaskArtifact {
            key: string
            value: string | object
          }

          interface TaskData {
            id: string
            title: string
            status: TaskStatus
            priority: TaskPriority
            dueDate?: string
            updatedAt?: string
            createdAt?: string
            tags?: string[]
          }

          const data = result.result as { artifacts?: TaskArtifact[] }
          const artifacts = data.artifacts || []

          const tasks: TaskData[] = artifacts
            .map(artifact => {
              try {
                return typeof artifact.value === 'string'
                  ? JSON.parse(artifact.value)
                  : artifact.value
              } catch {
                return null
              }
            })
            .filter((t): t is TaskData => t !== null)

          if (tasks.length === 0) {
            return `📊 Você ainda não tem tarefas para analisar. Crie algumas tarefas primeiro!`
          }

          const today = new Date()

          const staleTasks = tasks
            .filter(t => {
              if (t.status === 'done') return false
              if (!t.updatedAt) return false
              const lastUpdate = new Date(t.updatedAt)
              const daysSinceUpdate = Math.floor(
                (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
              )
              return daysSinceUpdate >= 7
            })
            .map(t => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              status: t.status,
            }))

          const overdueTasks = tasks
            .filter(t => {
              if (t.status === 'done' || !t.dueDate) return false
              return new Date(t.dueDate) < today
            })
            .map(t => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              status: t.status,
              dueDate: t.dueDate,
            }))

          const upcomingDeadlines = tasks
            .filter(t => {
              if (t.status === 'done' || !t.dueDate) return false
              const dueDate = new Date(t.dueDate)
              const daysUntilDue = Math.floor(
                (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              )
              return daysUntilDue >= 0 && daysUntilDue <= 3
            })
            .map(t => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              status: t.status,
              dueDate: t.dueDate,
            }))

          const inProgressCount = tasks.filter(
            t => t.status === 'in_progress'
          ).length
          const criticalCount = tasks.filter(
            t => t.priority === 'critical' && t.status !== 'done'
          ).length
          const backlogCount = tasks.filter(t => t.status === 'backlog').length

          const completedTasks = tasks.filter(t => t.status === 'done').length
          const completionRate =
            tasks.length > 0
              ? Math.round((completedTasks / tasks.length) * 100)
              : 0

          const allGood =
            staleTasks.length === 0 &&
            overdueTasks.length === 0 &&
            inProgressCount <= 3 &&
            criticalCount === 0 &&
            backlogCount <= 10

          return {
            staleTasks,
            overdueTasks,
            upcomingDeadlines,
            inProgressCount,
            criticalCount,
            backlogCount,
            metrics: {
              total: tasks.length,
              completed: completedTasks,
              completionRate,
              active: tasks.length - completedTasks,
            },
            allGood,
          } as TaskInsightsData
        } catch (error) {
          return `❌ Erro ao analisar tarefas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }
      },
      render: ({ status, result }) => {
        if (status === 'inProgress' || status === 'executing') {
          return (
            <ActionStatusCard
              label="Analisando suas tarefas..."
              status={mapStatus(status)}
              icon="🔍"
              description="Gerando insights"
            />
          )
        }

        if (typeof result === 'string') {
          if (result.startsWith('❌')) {
            return (
              <ActionStatusCard
                label="Erro"
                status="error"
                icon="❌"
                description={result.replace('❌ ', '')}
              />
            )
          }
          if (result.startsWith('📊')) {
            return (
              <ActionStatusCard
                label="Info"
                status="complete"
                icon="📊"
                description={result.replace('📊 ', '')}
              />
            )
          }
        }

        if (result && typeof result === 'object' && 'metrics' in result) {
          return <TaskInsightsUI data={result as TaskInsightsData} />
        }

        return (
          <ActionStatusCard
            label="Processando..."
            status="complete"
            icon="✓"
            description=""
          />
        )
      },
    },

    spotlight_createContextualTask: {
      execute: async args => {
        const { title, notes } = args

        if (!callMCPTool) {
          return '❌ Erro: Conexão MCP não disponível.'
        }

        try {
          const taskId = generateId('task')
          const now = new Date().toISOString()

          let description = ''
          if (currentModule) {
            description += `Criada a partir do módulo: ${getModuleLabel(currentModule)}\n`
          }
          if (notes) {
            description += `\n${notes}`
          }

          const task = {
            id: taskId,
            title: title as string,
            description: description || undefined,
            status: 'todo' as TaskStatus,
            priority: 'medium' as TaskPriority,
            tags: currentModule ? [currentModule] : [],
            source: {
              module: currentModule || 'chat',
              referenceName: `Contexto: ${getModuleLabel(currentModule || 'chat')}`,
            },
            createdAt: now,
            updatedAt: now,
          }

          const artifactKey = `${TASK_ARTIFACT_PREFIX}${taskId}`

          const result = await callMCPToolWithParsing(
            callMCPTool,
            'create_artifact',
            {
              key: artifactKey,
              value: JSON.stringify(task),
              description: `Tarefa: ${title}`,
              type: TASK_ARTIFACT_TYPE,
              accessibility: 'NAMESPACE_USER',
              conflict_strategy: 'OVERWRITE',
              tags: currentModule || '',
            }
          )

          if (!result.ok) {
            throw new Error(result.error)
          }

          return {
            title: title as string,
            description: description || undefined,
            priority: 'medium' as TaskPriority,
            status: 'todo' as TaskStatus,
            tags: currentModule ? [currentModule] : undefined,
          } as TaskCreatedData
        } catch (error) {
          return `❌ Erro ao criar tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }
      },
      render: ({ status, args, result }) => {
        if (status === 'inProgress' || status === 'executing') {
          return (
            <ActionStatusCard
              label="Criando tarefa contextual..."
              status={mapStatus(status)}
              icon="🎯"
              description={`${currentModule || 'Chat'}: ${args?.title || ''}`}
            />
          )
        }

        if (typeof result === 'string' && result.startsWith('❌')) {
          return (
            <ActionStatusCard
              label="Erro"
              status="error"
              icon="❌"
              description={result.replace('❌ ', '')}
            />
          )
        }

        if (result && typeof result === 'object' && 'title' in result) {
          return <TaskCreatedUI data={result as TaskCreatedData} />
        }

        return (
          <ActionStatusCard
            label="Processando..."
            status="complete"
            icon="✓"
            description=""
          />
        )
      },
    },
  }
}
