'use client'

/**
 * Task Actions for Atlas Quick Agent
 *
 * CopilotKit actions for managing personal tasks via chat.
 * Tasks are stored as MCP artifacts with Namespace_User accessibility.
 */
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core'

import {
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from '@/features/my-tasks/types'
import { useI18n } from '@/shared/hooks/use-i18n'

import { ActionStatusCard } from './action-status-render'
import { TaskListUI, type TaskItem } from './task-list-ui'
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
} from './task-result-ui'
import {
  callMCPToolWithParsing,
  generateId,
  type AtlasQuickAgentActionsProps,
} from './types'

// ============================================================================
// CONSTANTS
// ============================================================================

const TASK_ARTIFACT_PREFIX = 'task-'
const TASK_ARTIFACT_TYPE = 'JSON'

// Map CopilotKit status to our status type
function mapStatus(
  status: 'complete' | 'executing' | 'inProgress'
): 'complete' | 'executing' | 'error' {
  if (status === 'inProgress') return 'executing'
  return status
}

// ============================================================================
// HOOK
// ============================================================================

export function useTaskActions(props: AtlasQuickAgentActionsProps) {
  const { isConnected, callMCPTool, currentModule, userName } = props
  const { t } = useI18n('copilot')

  // ========================================
  // CREATE TASK
  // ========================================

  useCopilotAction({
    name: 'createTask',
    description: t('actions.spotlight.createTask.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'title',
        type: 'string',
        description: t('actions.spotlight.createTask.params.title'),
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        description: t('actions.spotlight.createTask.params.description'),
        required: false,
      },
      {
        name: 'priority',
        type: 'string',
        description: t('actions.spotlight.createTask.params.priority'),
        required: false,
      },
      {
        name: 'status',
        type: 'string',
        description: t('actions.spotlight.createTask.params.status'),
        required: false,
      },
      {
        name: 'dueDate',
        type: 'string',
        description: t('actions.spotlight.createTask.params.dueDate'),
        required: false,
      },
      {
        name: 'tags',
        type: 'string',
        description: t('actions.spotlight.createTask.params.tags'),
        required: false,
      },
    ],
    render: ({ status, args, result }) => {
      // Loading state
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

      // Error state
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

      // Success - render the beautiful card
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
    handler: async ({
      title,
      description,
      priority = 'medium',
      status = 'todo',
      dueDate,
      tags,
    }) => {
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

        // Return structured data for the render function
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
  })

  // ========================================
  // LIST MY TASKS
  // ========================================

  useCopilotAction({
    name: 'listMyTasks',
    description: t('actions.spotlight.listMyTasks.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'status',
        type: 'string',
        description: t('actions.spotlight.listMyTasks.params.status'),
        required: false,
      },
    ],
    render: ({ status, result, args }) => {
      // Show loading state
      if (status === 'inProgress' || status === 'executing') {
        return (
          <TaskListUI
            tasks={[]}
            status={status}
            groupByStatus={!args?.status || args.status === 'all'}
          />
        )
      }

      // If result is an error string, show it
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

      // If result is task data, render the UI
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

      // Fallback
      return <TaskListUI tasks={[]} status="complete" groupByStatus={true} />
    },
    handler: async ({ status: filterStatus }) => {
      if (!callMCPTool) {
        return '❌ Erro: Conexão MCP não disponível.'
      }

      try {
        const result = await callMCPToolWithParsing(
          callMCPTool,
          'get_artifact',
          { key_pattern: `^${TASK_ARTIFACT_PREFIX}.*` }
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

        // Parse tasks from artifacts
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

        // Filter by status if specified
        const filteredTasks =
          filterStatus && filterStatus !== 'all'
            ? tasks.filter(t => t.status === filterStatus)
            : tasks

        // Return structured data for the render function
        return {
          tasks: filteredTasks,
          totalCount: tasks.length,
        }
      } catch (error) {
        return `❌ Erro ao listar tarefas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    },
  })

  // ========================================
  // COMPLETE TASK
  // ========================================

  useCopilotAction({
    name: 'completeTask',
    description: t('actions.spotlight.completeTask.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'taskTitle',
        type: 'string',
        description: t('actions.spotlight.completeTask.params.taskTitle'),
        required: true,
      },
    ],
    render: ({ status, args, result }) => {
      // Loading state
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

      // Error/info state
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

      // Success - render the celebration card
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
    handler: async ({ taskTitle }) => {
      if (!callMCPTool) {
        return '❌ Erro: Conexão MCP não disponível.'
      }

      try {
        // Search for the task
        const result = await callMCPToolWithParsing(
          callMCPTool,
          'get_artifact',
          { key_pattern: `^${TASK_ARTIFACT_PREFIX}.*` }
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

        // Find matching task
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

        // Update the task
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

        // Return structured data for the celebration card
        return {
          title: matchingTask.title,
          userName: userName || 'Usuário',
        } as TaskCompletedData
      } catch (error) {
        return `❌ Erro ao completar tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    },
  })

  // ========================================
  // MOVE TASK (change status)
  // ========================================

  useCopilotAction({
    name: 'moveTask',
    description: t('actions.spotlight.moveTask.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'taskTitle',
        type: 'string',
        description: t('actions.spotlight.moveTask.params.taskTitle'),
        required: true,
      },
      {
        name: 'newStatus',
        type: 'string',
        description: t('actions.spotlight.moveTask.params.newStatus'),
        required: true,
      },
    ],
    render: ({ status, args, result }) => {
      // Loading state
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

      // Error/info state
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

      // Success - render the move visualization
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
    handler: async ({ taskTitle, newStatus }) => {
      if (!callMCPTool) {
        return '❌ Erro: Conexão MCP não disponível.'
      }

      // Validate status
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
        // Search for the task
        const result = await callMCPToolWithParsing(
          callMCPTool,
          'get_artifact',
          { key_pattern: `^${TASK_ARTIFACT_PREFIX}.*` }
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

        // Find matching task
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

        // Update the task
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

        // Return structured data for the move visualization
        return {
          title: matchingTask.title,
          fromStatus: oldStatus,
          toStatus: newStatus as TaskStatus,
        } as TaskMovedData
      } catch (error) {
        return `❌ Erro ao mover tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    },
  })

  // ========================================
  // DELETE TASK
  // ========================================

  useCopilotAction({
    name: 'deleteTask',
    description: t('actions.spotlight.deleteTask.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'taskTitle',
        type: 'string',
        description: t('actions.spotlight.deleteTask.params.taskTitle'),
        required: true,
      },
    ],
    render: ({ status, args, result }) => {
      // Loading state
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

      // Error state
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

      // Success - render the delete confirmation
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
    handler: async ({ taskTitle }) => {
      if (!callMCPTool) {
        return '❌ Erro: Conexão MCP não disponível.'
      }

      try {
        // Search for the task
        const result = await callMCPToolWithParsing(
          callMCPTool,
          'get_artifact',
          { key_pattern: `^${TASK_ARTIFACT_PREFIX}.*` }
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

        // Find matching task
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

        // Delete the artifact
        const deleteResult = await callMCPToolWithParsing(
          callMCPTool,
          'delete_artifact',
          { id: matchingArtifact.id }
        )

        if (!deleteResult.ok) {
          throw new Error(deleteResult.error)
        }

        // Return structured data for the delete confirmation
        return { deletedTitle: matchingTask.title }
      } catch (error) {
        return `❌ Erro ao excluir tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    },
  })

  // ========================================
  // SUMMARIZE DAY (Planning Assistido)
  // ========================================

  useCopilotAction({
    name: 'summarizeDay',
    description: t('actions.spotlight.summarizeDay.description'),
    disabled: !isConnected,
    parameters: [],
    render: ({ status, result }) => {
      // Loading state
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

      // Error state
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

      // Success - render the beautiful day summary
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
    handler: async () => {
      if (!callMCPTool) {
        return '❌ Erro: Conexão MCP não disponível.'
      }

      try {
        const result = await callMCPToolWithParsing(
          callMCPTool,
          'get_artifact',
          { key_pattern: `^${TASK_ARTIFACT_PREFIX}.*` }
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

        // Filter active tasks (not done)
        const activeTasks = tasks.filter(t => t.status !== 'done')

        // Check for overdue tasks with days calculation
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

        // Tasks due today
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

        // High priority tasks (not in progress)
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

        // In progress tasks
        const inProgressTasks = activeTasks
          .filter(t => t.status === 'in_progress')
          .map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate,
          }))

        // Stats
        const totalActive = activeTasks.length
        const todoCount = activeTasks.filter(t => t.status === 'todo').length
        const reviewCount = activeTasks.filter(
          t => t.status === 'review'
        ).length

        // Build suggestion
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

        // Return structured data for the beautiful UI
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
  })

  // ========================================
  // GET TASK INSIGHTS (Sugestões Proativas)
  // ========================================

  useCopilotAction({
    name: 'getTaskInsights',
    description: t('actions.spotlight.getTaskInsights.description'),
    disabled: !isConnected,
    parameters: [],
    render: ({ status, result }) => {
      // Loading state
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

      // Error/info state
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

      // Success - render the insights visualization
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
    handler: async () => {
      if (!callMCPTool) {
        return '❌ Erro: Conexão MCP não disponível.'
      }

      try {
        const result = await callMCPToolWithParsing(
          callMCPTool,
          'get_artifact',
          { key_pattern: `^${TASK_ARTIFACT_PREFIX}.*` }
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

        // Check for stale tasks (not updated in 7+ days)
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

        // Check for overdue
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

        // Check for upcoming deadlines (next 3 days)
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

        // Counts
        const inProgressCount = tasks.filter(
          t => t.status === 'in_progress'
        ).length
        const criticalCount = tasks.filter(
          t => t.priority === 'critical' && t.status !== 'done'
        ).length
        const backlogCount = tasks.filter(t => t.status === 'backlog').length

        // Metrics
        const completedTasks = tasks.filter(t => t.status === 'done').length
        const completionRate =
          tasks.length > 0
            ? Math.round((completedTasks / tasks.length) * 100)
            : 0

        // All good?
        const allGood =
          staleTasks.length === 0 &&
          overdueTasks.length === 0 &&
          inProgressCount <= 3 &&
          criticalCount === 0 &&
          backlogCount <= 10

        // Return structured data for the insights UI
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
  })

  // ========================================
  // CREATE CONTEXTUAL TASK
  // ========================================

  useCopilotAction({
    name: 'createContextualTask',
    description: t('actions.spotlight.createContextualTask.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'title',
        type: 'string',
        description: t('actions.spotlight.createContextualTask.params.title'),
        required: true,
      },
      {
        name: 'notes',
        type: 'string',
        description: t('actions.spotlight.createContextualTask.params.notes'),
        required: false,
      },
    ],
    render: ({ status, args, result }) => {
      // Loading state
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

      // Error state
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

      // Success - render the created card
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
    handler: async ({ title, notes }) => {
      if (!callMCPTool) {
        return '❌ Erro: Conexão MCP não disponível.'
      }

      try {
        const taskId = generateId('task')
        const now = new Date().toISOString()

        // Build description with context
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

        // Return structured data for the UI
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
  })

  // ========================================
  // PROVIDE TASK CONTEXT (useCopilotReadable)
  // ========================================

  // Provide active tasks as context for the AI
  useCopilotReadable({
    description: t('actions.spotlight.taskContext.description'),
    value: async () => {
      if (!callMCPTool) return null

      try {
        const result = await callMCPToolWithParsing(
          callMCPTool,
          'get_artifact',
          { key_pattern: `^${TASK_ARTIFACT_PREFIX}.*` }
        )

        if (!result.ok) return null

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
          .filter((t): t is TaskData => t !== null && t.status !== 'done')

        if (tasks.length === 0) return null

        const today = new Date()
        const overdue = tasks.filter(
          t => t.dueDate && new Date(t.dueDate) < today
        )
        const highPriority = tasks.filter(
          t => t.priority === 'critical' || t.priority === 'high'
        )
        const inProgress = tasks.filter(t => t.status === 'in_progress')

        return {
          totalActive: tasks.length,
          overdueCount: overdue.length,
          highPriorityCount: highPriority.length,
          inProgressCount: inProgress.length,
          topTasks: tasks.slice(0, 5).map(t => ({
            title: t.title,
            status: t.status,
            priority: t.priority,
            isOverdue: t.dueDate ? new Date(t.dueDate) < today : false,
          })),
        }
      } catch {
        return null
      }
    },
  })
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
