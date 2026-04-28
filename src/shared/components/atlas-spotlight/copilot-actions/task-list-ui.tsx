'use client'

/**
 * Task List UI Components
 *
 * Custom UI components for rendering tasks in CopilotKit chat.
 * Provides:
 * - TaskRow: Compact row showing task summary
 * - TaskDetailDialog: Modal with full task details
 * - TaskListUI: List of task rows with grouping by status
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Eye,
  Flag,
  ListTodo,
  Loader2,
  Tag,
} from 'lucide-react'

import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from '@/features/my-tasks/types'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { cn } from '@/shared/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface TaskItem {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  tags?: string[]
  source?: {
    module?: string
    referenceName?: string
  }
  createdAt?: string
  updatedAt?: string
  completedAt?: string
}

export interface TaskListUIProps {
  tasks: TaskItem[]
  status: 'inProgress' | 'executing' | 'complete'
  totalCount?: number
  groupByStatus?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { icon: string; color: string; bgColor: string }
> = {
  critical: {
    icon: '🔴',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  high: {
    icon: '🟠',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  medium: {
    icon: '🟡',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  low: {
    icon: '🟢',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  backlog: {
    icon: Circle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  todo: {
    icon: ListTodo,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  in_progress: {
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  review: {
    icon: Eye,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  done: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
}

// ============================================================================
// TASK ROW COMPONENT
// ============================================================================

interface TaskRowProps {
  task: TaskItem
  onClick: () => void
}

function TaskRow({ task, onClick }: TaskRowProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority]
  const statusConfig = STATUS_CONFIG[task.status]
  const StatusIcon = statusConfig.icon

  // Check if overdue
  const isOverdue =
    task.dueDate &&
    task.status !== 'done' &&
    new Date(task.dueDate) < new Date()

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-md border bg-card px-2 py-1.5 transition-all hover:border-primary/40 hover:bg-accent/50',
        isOverdue && 'border-red-300 dark:border-red-800'
      )}
      onClick={onClick}
    >
      {/* Status Icon */}
      <div
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded',
          statusConfig.bgColor
        )}
      >
        <StatusIcon className={cn('size-3', statusConfig.color)} />
      </div>

      {/* Title - takes maximum space */}
      <p className="min-w-0 flex-1 truncate text-xs font-medium">
        {task.title}
      </p>

      {/* Compact badges on the right */}
      <Badge
        variant="outline"
        className={cn(
          'h-4 shrink-0 px-1 text-[9px]',
          priorityConfig.color,
          priorityConfig.bgColor
        )}
      >
        {TASK_PRIORITY_LABELS[task.priority]}
      </Badge>

      {/* Due date indicator */}
      {task.dueDate && (
        <span
          className={cn(
            'flex shrink-0 items-center gap-0.5 text-[9px]',
            isOverdue ? 'text-red-500' : 'text-muted-foreground'
          )}
        >
          <Calendar className="size-2.5" />
          {new Date(task.dueDate).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
          })}
        </span>
      )}
    </div>
  )
}

// ============================================================================
// TASK DETAIL DIALOG
// ============================================================================

interface TaskDetailDialogProps {
  task: TaskItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function TaskDetailDialog({ task, open, onOpenChange }: TaskDetailDialogProps) {
  const router = useRouter()

  if (!task) return null

  const priorityConfig = PRIORITY_CONFIG[task.priority]
  const statusConfig = STATUS_CONFIG[task.status]
  const StatusIcon = statusConfig.icon

  const isOverdue =
    task.dueDate &&
    task.status !== 'done' &&
    new Date(task.dueDate) < new Date()

  const formattedCreatedAt = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null

  const handleNavigate = () => {
    router.push('/dashboard/my-tasks')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-lg',
                statusConfig.bgColor
              )}
            >
              <StatusIcon className={cn('size-5', statusConfig.color)} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base">{task.title}</DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    priorityConfig.color,
                    priorityConfig.bgColor
                  )}
                >
                  <Flag className="mr-1 size-2.5" />
                  {TASK_PRIORITY_LABELS[task.priority]}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-xs', statusConfig.color)}
                >
                  {TASK_STATUS_LABELS[task.status]}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                Descrição
              </h4>
              <ScrollArea className="max-h-32">
                <p className="whitespace-pre-wrap text-sm">
                  {task.description}
                </p>
              </ScrollArea>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Status</span>
              <p className="flex items-center gap-1 font-medium">
                <StatusIcon className={cn('size-3', statusConfig.color)} />
                {TASK_STATUS_LABELS[task.status]}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Prioridade</span>
              <p className="flex items-center gap-1 font-medium">
                <span>{priorityConfig.icon}</span>
                {TASK_PRIORITY_LABELS[task.priority]}
              </p>
            </div>
            {formattedDueDate && (
              <div>
                <span className="text-xs text-muted-foreground">
                  Vencimento
                </span>
                <p
                  className={cn(
                    'flex items-center gap-1 font-medium',
                    isOverdue && 'text-red-500'
                  )}
                >
                  <Calendar className="size-3" />
                  {formattedDueDate}
                  {isOverdue && (
                    <AlertCircle className="ml-1 size-3 text-red-500" />
                  )}
                </p>
              </div>
            )}
            {formattedCreatedAt && (
              <div>
                <span className="text-xs text-muted-foreground">Criada em</span>
                <p className="font-medium">{formattedCreatedAt}</p>
              </div>
            )}
          </div>

          {/* Source/Module */}
          {task.source?.module && (
            <div>
              <span className="text-xs text-muted-foreground">Origem</span>
              <p className="text-sm font-medium capitalize">
                {task.source.referenceName || task.source.module}
              </p>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Tag className="size-3" />
                Tags
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {task.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action */}
          <Button variant="outline" className="w-full" onClick={handleNavigate}>
            <ExternalLink className="mr-2 size-4" />
            Ver no Kanban
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT - TASK LIST UI
// ============================================================================

export function TaskListUI({
  tasks,
  status,
  totalCount,
  groupByStatus = true,
}: TaskListUIProps) {
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Loading state
  if (status === 'inProgress' || status === 'executing') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-4">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          Buscando tarefas...
        </span>
      </div>
    )
  }

  // Empty state
  if (!tasks || tasks.length === 0) {
    return (
      <div className="rounded-lg bg-muted/50 p-4 text-center">
        <ListTodo className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhuma tarefa encontrada
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use &quot;criar tarefa&quot; para começar!
        </p>
      </div>
    )
  }

  const handleRowClick = (task: TaskItem) => {
    setSelectedTask(task)
    setDialogOpen(true)
  }

  // Group tasks by status if enabled
  if (groupByStatus) {
    const statusOrder: TaskStatus[] = [
      'in_progress',
      'todo',
      'review',
      'backlog',
      'done',
    ]

    const byStatus: Record<string, TaskItem[]> = {}
    for (const task of tasks) {
      if (!byStatus[task.status]) {
        byStatus[task.status] = []
      }
      byStatus[task.status]!.push(task)
    }

    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''}
            {totalCount && totalCount > tasks.length && (
              <span className="text-muted-foreground"> de {totalCount}</span>
            )}
          </p>
        </div>

        {/* Grouped List */}
        <div className="space-y-3">
          {statusOrder.map(statusKey => {
            const statusTasks = byStatus[statusKey]
            if (!statusTasks || statusTasks.length === 0) return null

            const statusConfig = STATUS_CONFIG[statusKey]
            const StatusIcon = statusConfig.icon

            return (
              <div key={statusKey}>
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <StatusIcon className={cn('size-3', statusConfig.color)} />
                  {TASK_STATUS_LABELS[statusKey]} ({statusTasks.length})
                </div>
                <div className="flex flex-col gap-1">
                  {statusTasks.slice(0, 5).map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onClick={() => handleRowClick(task)}
                    />
                  ))}
                  {statusTasks.length > 5 && (
                    <p className="pl-2 text-xs text-muted-foreground">
                      ... e mais {statusTasks.length - 5} tarefa(s)
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail Dialog */}
        <TaskDetailDialog
          task={selectedTask}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    )
  }

  // Simple flat list
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''}
          {totalCount && totalCount > tasks.length && (
            <span className="text-muted-foreground"> de {totalCount}</span>
          )}
        </p>
      </div>

      {/* Flat List */}
      <div className="flex flex-col gap-1.5">
        {tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            onClick={() => handleRowClick(task)}
          />
        ))}
      </div>

      {/* Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}

export default TaskListUI
