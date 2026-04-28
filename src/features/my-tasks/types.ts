/**
 * My Tasks Types (Stub)
 *
 * Minimal type stubs for my-tasks types referenced by shared components.
 * Placeholder types retained for build compatibility after
 * the my-tasks feature was removed during SDA2 isolation.
 */

// ============================================================================
// Types
// ============================================================================

export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked'
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

export interface UserTask {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignee?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
  tags?: string[]
}

export interface CreateTaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignee?: string
  dueDate?: string
  tags?: string[]
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignee?: string
  dueDate?: string
  tags?: string[]
}

export interface TaskFilters {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  assignee?: string
  search?: string
}

export interface TaskSort {
  field: 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt'
  direction: 'asc' | 'desc'
}

// ============================================================================
// Constants
// ============================================================================

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'todo',
  'in-progress',
  'blocked',
  'done',
]

// ============================================================================
// Functions
// ============================================================================

export function getTaskArtifactName(taskId: string): string {
  return `TASK_${taskId}`
}

export function groupTasksByStatus(
  tasks: UserTask[]
): Record<TaskStatus, UserTask[]> {
  const groups: Record<TaskStatus, UserTask[]> = {
    todo: [],
    'in-progress': [],
    done: [],
    blocked: [],
  }
  for (const task of tasks) {
    if (groups[task.status]) {
      groups[task.status].push(task)
    }
  }
  return groups
}
