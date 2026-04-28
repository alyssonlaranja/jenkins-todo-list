'use client'

/**
 * Task Result UI Components
 *
 * Beautiful UI components for rendering task action results in CopilotKit chat.
 * Provides visual components for:
 * - DaySummaryUI: Beautiful day planning/summary card
 * - TaskInsightsUI: Insights and analytics visualization
 * - TaskCreatedUI: Success card for created tasks
 * - TaskCompletedUI: Celebration card for completed tasks
 * - TaskMovedUI: Status change visualization
 * - TaskDeletedUI: Deletion confirmation
 */
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Flag,
  Flame,
  Lightbulb,
  ListTodo,
  PartyPopper,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Tag,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react'

import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from '@/features/my-tasks/types'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import { cn } from '@/shared/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface TaskSummary {
  id: string
  title: string
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
  daysOverdue?: number
}

export interface DaySummaryData {
  userName: string
  overdueTasks: TaskSummary[]
  todayTasks: TaskSummary[]
  inProgressTasks: TaskSummary[]
  highPriorityTasks: TaskSummary[]
  stats: {
    totalActive: number
    inProgress: number
    todo: number
    review: number
  }
  suggestion?: {
    type: 'overdue' | 'priority' | 'focus' | 'empty'
    taskTitle?: string
    message: string
  }
}

export interface TaskInsightsData {
  staleTasks: TaskSummary[]
  overdueTasks: TaskSummary[]
  upcomingDeadlines: TaskSummary[]
  inProgressCount: number
  criticalCount: number
  backlogCount: number
  metrics: {
    total: number
    completed: number
    completionRate: number
    active: number
  }
  allGood: boolean
}

export interface TaskCreatedData {
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
  tags?: string[]
}

export interface TaskCompletedData {
  title: string
  userName: string
}

export interface TaskMovedData {
  title: string
  fromStatus: TaskStatus
  toStatus: TaskStatus
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
    icon: ListTodo,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  todo: {
    icon: Target,
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
// HELPER COMPONENTS
// ============================================================================

function getGreetingIcon() {
  const hour = new Date().getHours()
  if (hour < 12) return <Sunrise className="size-5 text-amber-500" />
  if (hour < 18) return <Sun className="size-5 text-yellow-500" />
  return <Sunset className="size-5 text-orange-500" />
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function TaskMiniRow({
  task,
  showOverdue = false,
}: {
  task: TaskSummary
  showOverdue?: boolean
}) {
  const priorityConfig = PRIORITY_CONFIG[task.priority]

  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1">
      <span className="text-xs">{priorityConfig.icon}</span>
      <span className="flex-1 truncate text-xs font-medium">{task.title}</span>
      {showOverdue &&
        task.daysOverdue !== undefined &&
        task.daysOverdue > 0 && (
          <Badge variant="destructive" className="h-4 px-1 text-[9px]">
            {task.daysOverdue}d atraso
          </Badge>
        )}
      {task.dueDate && !showOverdue && (
        <span className="text-[10px] text-muted-foreground">
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
// DAY SUMMARY UI
// ============================================================================

export function DaySummaryUI({ data }: { data: DaySummaryData }) {
  const hasAlerts = data.overdueTasks.length > 0
  const isEmpty = data.stats.totalActive === 0

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      {/* Header with greeting */}
      <CardHeader
        className={cn(
          'pb-3',
          hasAlerts
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30'
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30'
        )}
      >
        <div className="flex items-center gap-3">
          {getGreetingIcon()}
          <div>
            <h3 className="text-base font-semibold">
              {getGreeting()}, {data.userName}! 👋
            </h3>
            <p className="text-xs text-muted-foreground">
              Resumo do seu dia de trabalho
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Overdue Alert */}
        {data.overdueTasks.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-500" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                {data.overdueTasks.length} tarefa(s) atrasada(s)
              </span>
            </div>
            <div className="space-y-1">
              {data.overdueTasks.slice(0, 3).map(task => (
                <TaskMiniRow key={task.id} task={task} showOverdue />
              ))}
              {data.overdueTasks.length > 3 && (
                <p className="text-[10px] text-red-600">
                  ... e mais {data.overdueTasks.length - 3}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Today's Tasks */}
        {data.todayTasks.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Calendar className="size-3.5 text-blue-500" />
              <span className="text-xs font-medium">
                Vence hoje ({data.todayTasks.length})
              </span>
            </div>
            <div className="space-y-1">
              {data.todayTasks.slice(0, 3).map(task => (
                <TaskMiniRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* In Progress */}
        {data.inProgressTasks.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Clock className="size-3.5 text-yellow-500" />
              <span className="text-xs font-medium">
                Em andamento ({data.inProgressTasks.length})
              </span>
            </div>
            <div className="space-y-1">
              {data.inProgressTasks.slice(0, 3).map(task => (
                <TaskMiniRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* High Priority */}
        {data.highPriorityTasks.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Flame className="size-3.5 text-orange-500" />
              <span className="text-xs font-medium">
                Alta prioridade ({data.highPriorityTasks.length})
              </span>
            </div>
            <div className="space-y-1">
              {data.highPriorityTasks.slice(0, 3).map(task => (
                <TaskMiniRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 rounded-lg bg-muted/50 p-3">
          <div className="text-center">
            <p className="text-lg font-bold text-primary">
              {data.stats.totalActive}
            </p>
            <p className="text-[10px] text-muted-foreground">Ativas</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-yellow-500">
              {data.stats.inProgress}
            </p>
            <p className="text-[10px] text-muted-foreground">Em prog.</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-500">{data.stats.todo}</p>
            <p className="text-[10px] text-muted-foreground">A fazer</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-purple-500">
              {data.stats.review}
            </p>
            <p className="text-[10px] text-muted-foreground">Revisão</p>
          </div>
        </div>

        {/* Suggestion */}
        {data.suggestion && (
          <div
            className={cn(
              'flex items-start gap-2 rounded-lg p-3',
              data.suggestion.type === 'empty'
                ? 'bg-green-50 dark:bg-green-950/30'
                : 'bg-blue-50 dark:bg-blue-950/30'
            )}
          >
            <Lightbulb
              className={cn(
                'mt-0.5 size-4 shrink-0',
                data.suggestion.type === 'empty'
                  ? 'text-green-500'
                  : 'text-blue-500'
              )}
            />
            <div>
              <p className="text-xs font-medium">Sugestão</p>
              <p className="text-xs text-muted-foreground">
                {data.suggestion.message}
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="py-4 text-center">
            <Sparkles className="mx-auto mb-2 size-8 text-green-500" />
            <p className="text-sm font-medium text-green-600">
              Caixa zerada! ✨
            </p>
            <p className="text-xs text-muted-foreground">
              Aproveite para planejar novas tarefas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TASK INSIGHTS UI
// ============================================================================

export function TaskInsightsUI({ data }: { data: TaskInsightsData }) {
  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 pb-3 dark:from-indigo-950/30 dark:to-purple-950/30">
        <div className="flex items-center gap-3">
          <TrendingUp className="size-5 text-indigo-500" />
          <div>
            <h3 className="text-base font-semibold">Insights das Tarefas</h3>
            <p className="text-xs text-muted-foreground">
              Análise da sua produtividade
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* All good message */}
        {data.allGood && (
          <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-950/30">
            <CheckCircle2 className="mx-auto mb-1 size-6 text-green-500" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Tudo sob controle!
            </p>
            <p className="text-xs text-green-600 dark:text-green-500">
              Suas tarefas estão bem organizadas
            </p>
          </div>
        )}

        {/* Stale tasks */}
        {data.staleTasks.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="mb-2 flex items-center gap-2">
              <Clock className="size-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                {data.staleTasks.length} tarefa(s) parada(s) há 7+ dias
              </span>
            </div>
            <div className="space-y-1">
              {data.staleTasks.slice(0, 3).map(task => (
                <div
                  key={task.id}
                  className="truncate text-xs text-amber-600 dark:text-amber-500"
                >
                  • {task.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue */}
        {data.overdueTasks.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 dark:bg-red-950/30">
            <AlertTriangle className="size-4 text-red-500" />
            <span className="text-xs text-red-700 dark:text-red-400">
              <strong>{data.overdueTasks.length}</strong> tarefa(s) atrasadas
            </span>
          </div>
        )}

        {/* Upcoming deadlines */}
        {data.upcomingDeadlines.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2 dark:bg-blue-950/30">
            <Calendar className="size-4 text-blue-500" />
            <span className="text-xs text-blue-700 dark:text-blue-400">
              <strong>{data.upcomingDeadlines.length}</strong> tarefa(s) vencem
              em 3 dias
            </span>
          </div>
        )}

        {/* Too many in progress */}
        {data.inProgressCount > 3 && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-2 dark:bg-yellow-950/30">
            <Flame className="size-4 text-yellow-500" />
            <span className="text-xs text-yellow-700 dark:text-yellow-400">
              <strong>{data.inProgressCount}</strong> tarefas em progresso -
              considere focar!
            </span>
          </div>
        )}

        {/* Critical tasks */}
        {data.criticalCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 dark:bg-red-950/30">
            <Flag className="size-4 text-red-500" />
            <span className="text-xs text-red-700 dark:text-red-400">
              <strong>{data.criticalCount}</strong> tarefa(s) crítica(s)
              aguardando
            </span>
          </div>
        )}

        {/* Backlog warning */}
        {data.backlogCount > 10 && (
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
            <ListTodo className="size-4 text-gray-500" />
            <span className="text-xs text-gray-700 dark:text-gray-400">
              Backlog grande: <strong>{data.backlogCount}</strong> itens
            </span>
          </div>
        )}

        {/* Metrics */}
        <div className="space-y-2 rounded-lg bg-muted/50 p-3">
          <h4 className="text-xs font-medium">Métricas</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold">{data.metrics.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-500">
                {data.metrics.completed}
              </p>
              <p className="text-[10px] text-muted-foreground">Concluídas</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-500">
                {data.metrics.active}
              </p>
              <p className="text-[10px] text-muted-foreground">Ativas</p>
            </div>
          </div>
          <div className="pt-2">
            <div className="mb-1 flex justify-between text-[10px]">
              <span>Taxa de conclusão</span>
              <span className="font-medium">
                {data.metrics.completionRate}%
              </span>
            </div>
            <Progress value={data.metrics.completionRate} className="h-1.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TASK CREATED UI
// ============================================================================

export function TaskCreatedUI({ data }: { data: TaskCreatedData }) {
  const priorityConfig = PRIORITY_CONFIG[data.priority]
  const statusConfig = STATUS_CONFIG[data.status]
  const StatusIcon = statusConfig.icon

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-3 dark:from-green-950/30 dark:to-emerald-950/30">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
            <CheckCircle2 className="size-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Tarefa criada!</h3>
            <p className="text-xs text-muted-foreground">
              Adicionada ao seu quadro
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        {/* Title */}
        <div className="rounded-lg bg-muted/50 p-3">
          <h4 className="text-sm font-semibold">{data.title}</h4>
          {data.description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {data.description}
            </p>
          )}
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground">Prioridade</p>
            <p className="flex items-center gap-1 text-xs font-medium">
              <span>{priorityConfig.icon}</span>
              {TASK_PRIORITY_LABELS[data.priority]}
            </p>
          </div>
          <div className="rounded-lg bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground">Status</p>
            <p className="flex items-center gap-1 text-xs font-medium">
              <StatusIcon className={cn('size-3', statusConfig.color)} />
              {TASK_STATUS_LABELS[data.status]}
            </p>
          </div>
        </div>

        {/* Due date */}
        {data.dueDate && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2 dark:bg-blue-950/30">
            <Calendar className="size-4 text-blue-500" />
            <span className="text-xs">
              Vencimento:{' '}
              <strong>
                {new Date(data.dueDate).toLocaleDateString('pt-BR')}
              </strong>
            </span>
          </div>
        )}

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <Tag className="size-3 text-muted-foreground" />
            {data.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Hint */}
        <p className="text-center text-[10px] text-muted-foreground">
          Veja suas tarefas em &quot;Minhas Tarefas&quot; ou pergunte
          &quot;mostre minhas tarefas&quot;
        </p>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TASK COMPLETED UI
// ============================================================================

export function TaskCompletedUI({ data }: { data: TaskCompletedData }) {
  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <CardContent className="py-6 text-center">
        <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50">
          <PartyPopper className="size-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold">Tarefa concluída! 🎉</h3>
        <div className="mx-auto my-3 max-w-[200px] rounded-lg bg-muted/50 p-2">
          <p className="text-sm font-medium text-green-600">✓ {data.title}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Parabéns, {data.userName}! Continue assim! 💪
        </p>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TASK MOVED UI
// ============================================================================

export function TaskMovedUI({ data }: { data: TaskMovedData }) {
  const fromConfig = STATUS_CONFIG[data.fromStatus]
  const toConfig = STATUS_CONFIG[data.toStatus]
  const FromIcon = fromConfig.icon
  const ToIcon = toConfig.icon

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <CardContent className="py-4">
        <div className="mb-3 text-center">
          <h3 className="text-sm font-semibold">Tarefa movida!</h3>
          <p className="mx-auto mt-1 max-w-[200px] truncate text-xs text-muted-foreground">
            {data.title}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <div
            className={cn(
              'flex flex-col items-center rounded-lg p-2',
              fromConfig.bgColor
            )}
          >
            <FromIcon className={cn('size-5', fromConfig.color)} />
            <span className="mt-1 text-[10px] font-medium">
              {TASK_STATUS_LABELS[data.fromStatus]}
            </span>
          </div>

          <ArrowRight className="size-5 text-muted-foreground" />

          <div
            className={cn(
              'flex flex-col items-center rounded-lg p-2',
              toConfig.bgColor
            )}
          >
            <ToIcon className={cn('size-5', toConfig.color)} />
            <span className="mt-1 text-[10px] font-medium">
              {TASK_STATUS_LABELS[data.toStatus]}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TASK DELETED UI
// ============================================================================

export function TaskDeletedUI({ title }: { title: string }) {
  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <CardContent className="py-4 text-center">
        <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Trash2 className="size-5 text-gray-500" />
        </div>
        <h3 className="text-sm font-semibold">Tarefa excluída</h3>
        <p className="mx-auto mt-1 max-w-[200px] truncate text-xs text-muted-foreground line-through">
          {title}
        </p>
      </CardContent>
    </Card>
  )
}

export default {
  DaySummaryUI,
  TaskInsightsUI,
  TaskCreatedUI,
  TaskCompletedUI,
  TaskMovedUI,
  TaskDeletedUI,
}
