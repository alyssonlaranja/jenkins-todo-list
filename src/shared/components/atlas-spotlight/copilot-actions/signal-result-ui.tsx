'use client'

/**
 * Visual UI Components for Signal Action Results
 *
 * Beautiful visual components for displaying signal creation results
 * in the chat interface.
 */
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Lightbulb,
  Loader2,
  MessageCircle,
} from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'

// ============================================================================
// TYPES
// ============================================================================

export interface SignalCreatedData {
  id: string
  type: 'insight' | 'message'
  category: string
  title: string
  priority: string
  userName?: string
}

// ============================================================================
// CONFIG
// ============================================================================

const SIGNAL_TYPE_CONFIG: Record<
  'insight' | 'message',
  {
    icon: React.ReactNode
    label: string
    color: string
    bgColor: string
    borderColor: string
    emoji: string
  }
> = {
  insight: {
    icon: <Lightbulb className="size-5" />,
    label: 'Insight',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    emoji: '💡',
  },
  message: {
    icon: <Bell className="size-5" />,
    label: 'Mensagem',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    emoji: '🔔',
  },
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  discovery: <Lightbulb className="size-4" />,
  pattern: <MessageCircle className="size-4" />,
  opportunity: <Lightbulb className="size-4" />,
  risk: <AlertTriangle className="size-4" />,
  innovation: <Lightbulb className="size-4" />,
  alert: <Bell className="size-4" />,
  note: <MessageCircle className="size-4" />,
}

const PRIORITY_CONFIG: Record<
  string,
  {
    label: string
    variant: 'destructive' | 'default' | 'secondary' | 'outline'
  }
> = {
  critical: { label: '🔴 Crítico', variant: 'destructive' },
  high: { label: '🟠 Alto', variant: 'destructive' },
  medium: { label: '🟡 Médio', variant: 'default' },
  low: { label: '🟢 Baixo', variant: 'secondary' },
}

// ============================================================================
// LOADING STATE
// ============================================================================

interface SignalLoadingProps {
  type?: 'insight' | 'message'
}

export function SignalLoading({ type = 'insight' }: SignalLoadingProps) {
  const config = SIGNAL_TYPE_CONFIG[type]

  return (
    <Card className={`border ${config.borderColor} ${config.bgColor}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`${config.color} animate-pulse`}>{config.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Criando signal...
              </span>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SIGNAL CREATED UI
// ============================================================================

interface SignalCreatedUIProps {
  data: SignalCreatedData
  status: 'complete' | 'inProgress' | 'executing'
}

export function SignalCreatedUI({ data, status }: SignalCreatedUIProps) {
  const typeConfig = SIGNAL_TYPE_CONFIG[data.type]
  const priorityConfig = PRIORITY_CONFIG[data.priority]
  const categoryIcon = CATEGORY_ICONS[data.category]

  if (status !== 'complete') {
    return <SignalLoading type={data.type} />
  }

  return (
    <Card className={`border ${typeConfig.borderColor} overflow-hidden`}>
      {/* Success header */}
      <div
        className={`${typeConfig.bgColor} border-b px-4 py-3 ${typeConfig.borderColor}`}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-green-600" />
          <span className="font-medium text-green-700">
            Signal criado com sucesso!
          </span>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`rounded-lg p-2 ${typeConfig.bgColor} ${typeConfig.color} shrink-0`}
          >
            {typeConfig.icon}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`${typeConfig.color} border-current`}
              >
                {typeConfig.emoji} {typeConfig.label}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                {categoryIcon}
                {data.category}
              </Badge>
              {priorityConfig && (
                <Badge variant={priorityConfig.variant}>
                  {priorityConfig.label}
                </Badge>
              )}
            </div>

            <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">
              {data.title}
            </p>

            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>ID: {data.id}</span>
              {data.userName && (
                <>
                  <span>•</span>
                  <span>Por: {data.userName}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
