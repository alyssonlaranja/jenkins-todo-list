'use client'

/**
 * Visual UI Components for Signal List and Statistics Results
 *
 * Beautiful visual components for displaying signals and statistics
 * in the chat interface.
 */
import {
  BarChart3,
  Bell,
  Lightbulb,
  Loader2,
  MessageCircle,
  TrendingUp,
} from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'

// ============================================================================
// TYPES
// ============================================================================

export interface SignalItem {
  id: string
  type: 'insight' | 'message' | 'feedback'
  category: string
  title: string
  priority: string
  createdAt?: string
}

export interface StatisticsData {
  total: number
  pending: number
  resolved: number
  resolutionRate: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
}

// ============================================================================
// CONFIG
// ============================================================================

const DEFAULT_SIGNAL_CONFIG = {
  icon: <Bell className="size-4" />,
  color: 'text-blue-600',
  bgColor: 'bg-blue-50',
}

const SIGNAL_TYPE_CONFIG: Record<
  string,
  {
    icon: React.ReactNode
    color: string
    bgColor: string
  }
> = {
  insight: {
    icon: <Lightbulb className="size-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  message: {
    icon: <Bell className="size-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  feedback: {
    icon: <MessageCircle className="size-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
}

function getSignalTypeConfig(type: string) {
  return SIGNAL_TYPE_CONFIG[type] || DEFAULT_SIGNAL_CONFIG
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
}

// ============================================================================
// SIGNAL LIST UI
// ============================================================================

interface SignalListUIProps {
  signals?: SignalItem[]
  status: 'complete' | 'inProgress' | 'executing'
  filterType?: string
}

export function SignalListUI({
  signals,
  status,
  filterType,
}: SignalListUIProps) {
  if (status !== 'complete' || !signals) {
    return (
      <Card className="border-indigo-200 bg-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="size-5 animate-pulse text-indigo-600" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Listando signals...
              </span>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (signals.length === 0) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Bell className="size-5 text-gray-400" />
            <span className="text-sm text-muted-foreground">
              Nenhum signal encontrado
              {filterType && filterType !== 'all' && ` do tipo ${filterType}`}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-indigo-200">
      <CardHeader className="border-b border-indigo-100 bg-indigo-50 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="size-4 text-indigo-600" />
          <span>
            {signals.length} signal(s)
            {filterType && filterType !== 'all' && ` do tipo ${filterType}`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {signals.slice(0, 15).map((signal, index) => {
            const typeConfig = getSignalTypeConfig(signal.type)
            const priorityClass =
              PRIORITY_COLORS[signal.priority] || PRIORITY_COLORS.medium

            return (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50"
              >
                <div
                  className={`shrink-0 rounded p-1.5 ${typeConfig.bgColor} ${typeConfig.color}`}
                >
                  {typeConfig.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{signal.title}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {signal.category}
                    </Badge>
                  </div>
                </div>
                <Badge className={`shrink-0 border text-xs ${priorityClass}`}>
                  {signal.priority}
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// STATISTICS UI
// ============================================================================

interface StatisticsUIProps {
  data?: StatisticsData
  status: 'complete' | 'inProgress' | 'executing'
}

export function StatisticsUI({ data, status }: StatisticsUIProps) {
  if (status !== 'complete' || !data) {
    return (
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="size-5 animate-pulse text-purple-600" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Calculando estatísticas...
              </span>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-purple-200">
      <CardHeader className="border-b border-purple-100 bg-purple-50 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-purple-700">
          <BarChart3 className="size-4" />
          <span>Estatísticas de Feedbacks</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {/* Main stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{data.total}</p>
            <p className="text-xs text-blue-700">Total</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{data.pending}</p>
            <p className="text-xs text-amber-700">Pendentes</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{data.resolved}</p>
            <p className="text-xs text-green-700">Resolvidos</p>
          </div>
        </div>

        {/* Resolution rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Taxa de Resolução</span>
            <span className="font-medium">{data.resolutionRate}%</span>
          </div>
          <Progress value={data.resolutionRate} className="h-2" />
        </div>

        {/* By Status */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Por Status
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data.byStatus).map(([status, count]) => (
              <Badge key={status} variant="outline" className="text-xs">
                {status}: {count}
              </Badge>
            ))}
          </div>
        </div>

        {/* By Category */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Por Categoria
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data.byCategory).map(([category, count]) => (
              <Badge key={category} variant="secondary" className="text-xs">
                {category}: {count}
              </Badge>
            ))}
          </div>
        </div>

        {/* By Severity */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Por Severidade
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data.bySeverity).map(([severity, count]) => {
              const colorClass =
                PRIORITY_COLORS[severity] || PRIORITY_COLORS.medium
              return (
                <Badge
                  key={severity}
                  className={`border text-xs ${colorClass}`}
                >
                  {severity}: {count}
                </Badge>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
