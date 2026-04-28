'use client'

/* eslint-disable no-console */
/**
 * useUserTasks Hook
 *
 * Hook for managing personal user tasks stored as MCP artifacts.
 * Uses Namespace_User accessibility to ensure tasks are private to each user.
 *
 * Based on: use-artifacts.ts pattern
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import {
  CreateTaskInput,
  getTaskArtifactName,
  groupTasksByStatus,
  TASK_STATUS_ORDER,
  TaskFilters,
  TaskSort,
  UpdateTaskInput,
  UserTask,
} from '@/features/my-tasks/types'

import {
  callMCPToolWithParsing,
  type CallMCPToolFn,
} from '../components/atlas-spotlight/copilot-actions/types'

// ============================================================================
// CONSTANTS
// ============================================================================

const TASK_ARTIFACT_PREFIX = 'task-'
const TASK_ARTIFACT_TYPE = 'JSON'

// ============================================================================
// TYPES
// ============================================================================

interface UseUserTasksOptions {
  callMCPTool?: CallMCPToolFn
  autoLoad?: boolean
}

interface UseUserTasksReturn {
  // State
  tasks: UserTask[]
  loading: boolean
  error: string | null

  // Computed
  tasksByStatus: ReturnType<typeof groupTasksByStatus>
  activeCount: number
  completedCount: number

  // CRUD Operations
  loadTasks: () => Promise<void>
  createTask: (input: CreateTaskInput) => Promise<UserTask>
  updateTask: (taskId: string, input: UpdateTaskInput) => Promise<UserTask>
  deleteTask: (taskId: string) => Promise<boolean>

  // Convenience methods
  moveTask: (taskId: string, newStatus: UserTask['status']) => Promise<UserTask>
  completeTask: (taskId: string) => Promise<UserTask>
  reorderTasks: (status: UserTask['status'], taskIds: string[]) => Promise<void>
}

// ============================================================================
// HOOK
// ============================================================================

export function useUserTasks({
  callMCPTool,
  autoLoad = true,
}: UseUserTasksOptions = {}): UseUserTasksReturn {
  const [tasks, setTasks] = useState<UserTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ========================================
  // COMPUTED VALUES
  // ========================================

  const tasksByStatus = useMemo(() => groupTasksByStatus(tasks), [tasks])

  const activeCount = useMemo(
    () => tasks.filter(t => t.status !== 'done').length,
    [tasks]
  )

  const completedCount = useMemo(
    () => tasks.filter(t => t.status === 'done').length,
    [tasks]
  )

  // ========================================
  // LOAD TASKS
  // ========================================

  const loadTasks = useCallback(async () => {
    if (!callMCPTool) {
      setError('Conexão MCP não disponível')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Search for task artifacts using pattern
      const result = await callMCPToolWithParsing(callMCPTool, 'get_artifact', {
        key_pattern: `^${TASK_ARTIFACT_PREFIX}.*`,
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      const data = result.result as {
        artifacts?: Array<{
          key: string
          value: string | UserTask
          type?: string
          accessibility?: string
        }>
      }

      const artifacts = data.artifacts || []

      // Filter to tasks by key prefix (type is JSON now)
      const taskArtifacts = artifacts.filter(a =>
        a.key.startsWith(TASK_ARTIFACT_PREFIX)
      )

      // Parse task data from artifacts
      const loadedTasks: UserTask[] = taskArtifacts
        .map(artifact => {
          try {
            const taskData =
              typeof artifact.value === 'string'
                ? JSON.parse(artifact.value)
                : artifact.value
            return taskData as UserTask
          } catch {
            console.warn(
              `[useUserTasks] Failed to parse task artifact: ${artifact.key}`
            )
            return null
          }
        })
        .filter((t): t is UserTask => t !== null)

      setTasks(loadedTasks)
      console.log(`[useUserTasks] Loaded ${loadedTasks.length} tasks`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load tasks'
      setError(message)
      console.error('[useUserTasks] Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [callMCPTool])

  // ========================================
  // CREATE TASK
  // ========================================

  const createTask = useCallback(
    async (input: CreateTaskInput): Promise<UserTask> => {
      if (!callMCPTool) {
        throw new Error('Conexão MCP não disponível')
      }

      const now = new Date().toISOString()
      const taskId = uuidv4()

      const newTask: UserTask = {
        id: taskId,
        title: input.title,
        description: input.description,
        status: input.status || 'todo',
        priority: input.priority || 'medium',
        dueDate: input.dueDate,
        tags: input.tags || [],
        source: input.source,
        createdAt: now,
        updatedAt: now,
      }

      const artifactKey = getTaskArtifactName(taskId)

      const result = await callMCPToolWithParsing(
        callMCPTool,
        'create_artifact',
        {
          key: artifactKey,
          value: JSON.stringify(newTask),
          description: `Tarefa: ${input.title}`,
          type: TASK_ARTIFACT_TYPE,
          accessibility: 'NAMESPACE_USER', // Private to user
          conflict_strategy: 'OVERWRITE',
          tags: input.tags?.join(',') || '',
        }
      )

      if (!result.ok) {
        throw new Error(result.error)
      }

      // Update local state
      setTasks(prev => [...prev, newTask])
      console.log(`[useUserTasks] Created task: ${newTask.title}`)

      return newTask
    },
    [callMCPTool]
  )

  // ========================================
  // UPDATE TASK
  // ========================================

  const updateTask = useCallback(
    async (taskId: string, input: UpdateTaskInput): Promise<UserTask> => {
      if (!callMCPTool) {
        throw new Error('Conexão MCP não disponível')
      }

      // Find existing task
      const existingTask = tasks.find(t => t.id === taskId)
      if (!existingTask) {
        throw new Error(`Task not found: ${taskId}`)
      }

      const now = new Date().toISOString()

      // Merge updates, converting null to undefined for dueDate
      const updatedTask: UserTask = {
        ...existingTask,
        title: input.title ?? existingTask.title,
        description: input.description ?? existingTask.description,
        status: input.status ?? existingTask.status,
        priority: input.priority ?? existingTask.priority,
        dueDate:
          input.dueDate === null
            ? undefined
            : (input.dueDate ?? existingTask.dueDate),
        tags: input.tags ?? existingTask.tags,
        updatedAt: now,
        // Handle completedAt
        completedAt:
          input.status === 'done' && existingTask.status !== 'done'
            ? now
            : input.status !== 'done'
              ? undefined
              : existingTask.completedAt,
      }

      const artifactKey = getTaskArtifactName(taskId)

      // First get the artifact ID
      const getResult = await callMCPToolWithParsing(
        callMCPTool,
        'get_artifact',
        { key_pattern: `^${artifactKey}$` }
      )

      if (!getResult.ok) {
        throw new Error(getResult.error)
      }

      const artifacts = (
        getResult.result as { artifacts?: Array<{ id: string }> }
      ).artifacts
      if (!artifacts || artifacts.length === 0) {
        throw new Error(`Task artifact not found: ${artifactKey}`)
      }

      const artifactId = artifacts[0]!.id

      // Update the artifact
      const result = await callMCPToolWithParsing(
        callMCPTool,
        'update_artifact',
        {
          id: artifactId,
          value: JSON.stringify(updatedTask),
          description: `Tarefa: ${updatedTask.title}`,
          promote_to_production: true,
        }
      )

      if (!result.ok) {
        throw new Error(result.error)
      }

      // Update local state
      setTasks(prev => prev.map(t => (t.id === taskId ? updatedTask : t)))
      console.log(`[useUserTasks] Updated task: ${updatedTask.title}`)

      return updatedTask
    },
    [callMCPTool, tasks]
  )

  // ========================================
  // DELETE TASK
  // ========================================

  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      if (!callMCPTool) {
        throw new Error('Conexão MCP não disponível')
      }

      const artifactKey = getTaskArtifactName(taskId)

      // First get the artifact ID
      const getResult = await callMCPToolWithParsing(
        callMCPTool,
        'get_artifact',
        { key_pattern: `^${artifactKey}$` }
      )

      if (!getResult.ok) {
        throw new Error(getResult.error)
      }

      const artifacts = (
        getResult.result as { artifacts?: Array<{ id: string }> }
      ).artifacts
      if (!artifacts || artifacts.length === 0) {
        // Task already doesn't exist - consider it deleted
        setTasks(prev => prev.filter(t => t.id !== taskId))
        return true
      }

      const artifactId = artifacts[0]!.id

      // Delete the artifact
      const result = await callMCPToolWithParsing(
        callMCPTool,
        'delete_artifact',
        { id: artifactId }
      )

      if (!result.ok) {
        throw new Error(result.error)
      }

      // Update local state
      setTasks(prev => prev.filter(t => t.id !== taskId))
      console.log(`[useUserTasks] Deleted task: ${taskId}`)

      return true
    },
    [callMCPTool]
  )

  // ========================================
  // MOVE TASK (change status)
  // ========================================

  const moveTask = useCallback(
    async (
      taskId: string,
      newStatus: UserTask['status']
    ): Promise<UserTask> => {
      return updateTask(taskId, { status: newStatus })
    },
    [updateTask]
  )

  // ========================================
  // COMPLETE TASK
  // ========================================

  const completeTask = useCallback(
    async (taskId: string): Promise<UserTask> => {
      return moveTask(taskId, 'done')
    },
    [moveTask]
  )

  // ========================================
  // REORDER TASKS (for drag & drop)
  // ========================================

  const reorderTasks = useCallback(
    async (_status: UserTask['status'], _taskIds: string[]): Promise<void> => {
      // TODO: Implement order persistence
      // For now, tasks are ordered by urgency (priority + due date)
      console.log('[useUserTasks] Reorder not yet implemented')
    },
    []
  )

  // ========================================
  // AUTO LOAD
  // ========================================

  useEffect(() => {
    if (autoLoad && callMCPTool) {
      loadTasks()
    }
  }, [autoLoad, callMCPTool, loadTasks])

  // ========================================
  // RETURN
  // ========================================

  return {
    // State
    tasks,
    loading,
    error,

    // Computed
    tasksByStatus,
    activeCount,
    completedCount,

    // CRUD Operations
    loadTasks,
    createTask,
    updateTask,
    deleteTask,

    // Convenience methods
    moveTask,
    completeTask,
    reorderTasks,
  }
}

// ============================================================================
// FILTER & SORT HELPERS
// ============================================================================

export function filterTasks(
  tasks: UserTask[],
  filters: TaskFilters
): UserTask[] {
  return tasks.filter(task => {
    // Status filter
    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status]
      if (!statuses.includes(task.status)) return false
    }

    // Priority filter
    if (filters.priority) {
      const priorities = Array.isArray(filters.priority)
        ? filters.priority
        : [filters.priority]
      if (!priorities.includes(task.priority)) return false
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      if (!task.tags || !filters.tags.some(t => task.tags!.includes(t))) {
        return false
      }
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase()
      const matchesTitle = task.title.toLowerCase().includes(search)
      const matchesDescription = task.description
        ?.toLowerCase()
        .includes(search)
      if (!matchesTitle && !matchesDescription) return false
    }

    // Due date filters
    if (filters.dueBefore && task.dueDate) {
      if (new Date(task.dueDate) > new Date(filters.dueBefore)) return false
    }
    if (filters.dueAfter && task.dueDate) {
      if (new Date(task.dueDate) < new Date(filters.dueAfter)) return false
    }

    return true
  })
}

export function sortTasks(tasks: UserTask[], sort: TaskSort): UserTask[] {
  return [...tasks].sort((a, b) => {
    let comparison = 0

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

    switch (sort.field) {
      case 'createdAt':
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'updatedAt':
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) comparison = 0
        else if (!a.dueDate) comparison = 1
        else if (!b.dueDate) comparison = -1
        else
          comparison =
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        break
      case 'priority':
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
        break
      case 'status':
        comparison =
          TASK_STATUS_ORDER.indexOf(a.status) -
          TASK_STATUS_ORDER.indexOf(b.status)
        break
    }

    return sort.direction === 'desc' ? -comparison : comparison
  })
}
