'use client'

/**
 * Visual UI Components for Feedback Action Results
 *
 * Beautiful visual components for displaying feedback creation results
 * in the chat interface.
 */
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  Trophy,
} from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'

// ============================================================================
// TYPES
// ============================================================================

export interface FeedbackCreatedData {
  id: string
  category: string
  title: string
  severity?: string
  userName?: string
}

export type FeedbackActionType =
  | 'feedback'
  | 'bug'
  | 'feature'
  | 'success'
  | 'question'
  | 'insight'
  | 'error'

// ============================================================================
// CONFIG
// ============================================================================

const FEEDBACK_CONFIG: Record<
  FeedbackActionType,
  {
    icon: React.ReactNode
    label: string
    color: string
    bgColor: string
    borderColor: string
    emoji: string
    successMessage: string
  }
> = {
  feedback: {
    icon: <MessageSquarePlus className="size-5" />,
    label: 'Feedback',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    emoji: '📝',
    successMessage: 'Feedback registrado com sucesso!',
  },
  bug: {
    icon: <Bug className="size-5" />,
    label: 'Bug Report',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    emoji: '🐛',
    successMessage: 'Bug reportado! Nossa equipe irá analisar.',
  },
  feature: {
    icon: <Lightbulb className="size-5" />,
    label: 'Sugestão',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    emoji: '💡',
    successMessage: 'Sugestão registrada! Obrigado pela contribuição.',
  },
  success: {
    icon: <Trophy className="size-5" />,
    label: 'Caso de Sucesso',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    emoji: '🏆',
    successMessage: 'Parabéns pela conquista! Caso registrado.',
  },
  question: {
    icon: <HelpCircle className="size-5" />,
    label: 'Dúvida',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    emoji: '❓',
    successMessage: 'Dúvida registrada! Vamos providenciar esclarecimentos.',
  },
  insight: {
    icon: <Sparkles className="size-5" />,
    label: 'Insight',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    emoji: '✨',
    successMessage: 'Insight registrado! Obrigado por compartilhar.',
  },
  error: {
    icon: <AlertCircle className="size-5" />,
    label: 'Erro',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    emoji: '❌',
    successMessage: 'Erro reportado! Nossa equipe irá investigar.',
  },
}

const SEVERITY_CONFIG: Record<
  string,
  {
    label: string
    variant: 'destructive' | 'default' | 'secondary' | 'outline'
  }
> = {
  critical: { label: 'Crítico', variant: 'destructive' },
  high: { label: 'Alto', variant: 'destructive' },
  medium: { label: 'Médio', variant: 'default' },
  low: { label: 'Baixo', variant: 'secondary' },
}

// ============================================================================
// LOADING STATE
// ============================================================================

interface FeedbackLoadingProps {
  type: FeedbackActionType
}

export function FeedbackLoading({ type }: FeedbackLoadingProps) {
  const config = FEEDBACK_CONFIG[type]

  return (
    <Card className={`border ${config.borderColor} ${config.bgColor}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`${config.color} animate-pulse`}>{config.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Registrando {config.label.toLowerCase()}...
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
// FEEDBACK CREATED UI
// ============================================================================

interface FeedbackCreatedUIProps {
  type: FeedbackActionType
  data: FeedbackCreatedData
  status: 'complete' | 'inProgress' | 'executing'
}

export function FeedbackCreatedUI({
  type,
  data,
  status,
}: FeedbackCreatedUIProps) {
  const config = FEEDBACK_CONFIG[type]
  const severityConfig = data.severity ? SEVERITY_CONFIG[data.severity] : null

  if (status !== 'complete') {
    return <FeedbackLoading type={type} />
  }

  return (
    <Card className={`border ${config.borderColor} overflow-hidden`}>
      {/* Success header */}
      <div
        className={`${config.bgColor} border-b px-4 py-3 ${config.borderColor}`}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-green-600" />
          <span className="font-medium text-green-700">
            {config.successMessage}
          </span>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`rounded-lg p-2 ${config.bgColor} ${config.color} shrink-0`}
          >
            {config.icon}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`${config.color} border-current`}
              >
                {config.emoji} {config.label}
              </Badge>
              {severityConfig && (
                <Badge variant={severityConfig.variant}>
                  {severityConfig.label}
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

// ============================================================================
// EXPORT HELPER
// ============================================================================

export function getCategoryToActionType(category: string): FeedbackActionType {
  switch (category) {
    case 'bug':
      return 'bug'
    case 'feature':
      return 'feature'
    case 'success':
      return 'success'
    case 'learning':
      return 'question'
    case 'insight':
      return 'insight'
    default:
      return 'feedback'
  }
}
