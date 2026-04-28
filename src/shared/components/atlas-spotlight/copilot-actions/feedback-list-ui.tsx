'use client'

/**
 * Feedback List UI Components
 *
 * Custom UI components for rendering feedbacks in CopilotKit chat.
 * Provides:
 * - FeedbackCard: Clickable card showing feedback summary
 * - FeedbackDetailDialog: Modal with full feedback details
 * - FeedbackListGrid: Grid of feedback cards
 */
import { useState } from 'react'
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lightbulb,
  Loader2,
  MessageSquare,
  Rocket,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Wrench,
  Zap,
} from 'lucide-react'

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

export interface FeedbackItem {
  id: string
  title: string
  description?: string
  category: string
  status: string
  severity: string
  source?: string
  createdAt?: string
  createdBy?: {
    name?: string
    email?: string
  }
  tags?: string[]
}

export interface FeedbackListUIProps {
  feedbacks: FeedbackItem[]
  status: 'inProgress' | 'executing' | 'complete'
  totalCount?: number
  onNavigateToFeedback?: (id: string) => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  bug: {
    icon: Bug,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  feature: {
    icon: Rocket,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  agent: {
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  tool: {
    icon: Wrench,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  workflow: {
    icon: TrendingUp,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  learning: {
    icon: Lightbulb,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  success: {
    icon: Star,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  security: {
    icon: Shield,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100 dark:bg-rose-900/30',
  },
  performance: {
    icon: Zap,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  innovation: {
    icon: Sparkles,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
}

const SEVERITY_CONFIG: Record<
  string,
  { color: string; bgColor: string; label: string }
> = {
  critical: {
    color: 'text-red-700',
    bgColor: 'bg-red-100 dark:bg-red-900/40',
    label: 'Critico',
  },
  high: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 dark:bg-orange-900/40',
    label: 'Alto',
  },
  medium: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/40',
    label: 'Medio',
  },
  low: {
    color: 'text-green-700',
    bgColor: 'bg-green-100 dark:bg-green-900/40',
    label: 'Baixo',
  },
}

const STATUS_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  new: { icon: MessageSquare, color: 'text-blue-500', label: 'Novo' },
  acknowledged: { icon: CheckCircle2, color: 'text-cyan-500', label: 'Visto' },
  in_progress: { icon: Clock, color: 'text-yellow-500', label: 'Em Progresso' },
  resolved: { icon: CheckCircle2, color: 'text-green-500', label: 'Resolvido' },
  wont_fix: {
    icon: AlertTriangle,
    color: 'text-gray-500',
    label: 'Nao Corrigir',
  },
}

// ============================================================================
// FEEDBACK CARD COMPONENT
// ============================================================================

interface FeedbackRowProps {
  feedback: FeedbackItem
  onClick: () => void
}

function FeedbackRow({ feedback, onClick }: FeedbackRowProps) {
  const categoryConfig = CATEGORY_CONFIG[feedback.category] ?? {
    icon: MessageSquare,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  }
  const severityConfig = SEVERITY_CONFIG[feedback.severity] ?? {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/40',
    label: 'Medio',
  }
  const statusConfig = STATUS_CONFIG[feedback.status] ?? {
    icon: MessageSquare,
    color: 'text-blue-500',
    label: 'Novo',
  }

  const CategoryIcon = categoryConfig.icon

  return (
    <div
      className="group flex cursor-pointer items-center gap-2 rounded-md border bg-card px-2 py-1.5 transition-all hover:border-primary/40 hover:bg-accent/50"
      onClick={onClick}
    >
      {/* Ícone da categoria */}
      <div
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded',
          categoryConfig.bgColor
        )}
      >
        <CategoryIcon className={cn('size-3', categoryConfig.color)} />
      </div>

      {/* Título - ocupa o máximo possível */}
      <p className="min-w-0 flex-1 truncate text-xs font-medium">
        {feedback.title}
      </p>

      {/* Badges compactos à direita */}
      <Badge
        variant="outline"
        className={cn(
          'h-4 shrink-0 px-1 text-[9px]',
          severityConfig.color,
          severityConfig.bgColor
        )}
      >
        {severityConfig.label}
      </Badge>

      <Badge
        variant="outline"
        className={cn('h-4 shrink-0 px-1 text-[9px]', statusConfig.color)}
      >
        {statusConfig.label}
      </Badge>
    </div>
  )
}

// ============================================================================
// FEEDBACK DETAIL DIALOG
// ============================================================================

interface FeedbackDetailDialogProps {
  feedback: FeedbackItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate?: () => void
}

function FeedbackDetailDialog({
  feedback,
  open,
  onOpenChange,
  onNavigate,
}: FeedbackDetailDialogProps) {
  if (!feedback) return null

  const categoryConfig = CATEGORY_CONFIG[feedback.category] ?? {
    icon: MessageSquare,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  }
  const severityConfig = SEVERITY_CONFIG[feedback.severity] ?? {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/40',
    label: 'Medio',
  }
  const statusConfig = STATUS_CONFIG[feedback.status] ?? {
    icon: MessageSquare,
    color: 'text-blue-500',
    label: 'Novo',
  }

  const CategoryIcon = categoryConfig.icon
  const StatusIcon = statusConfig.icon

  const formattedDate = feedback.createdAt
    ? new Date(feedback.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-lg',
                categoryConfig.bgColor
              )}
            >
              <CategoryIcon className={cn('size-5', categoryConfig.color)} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base">{feedback.title}</DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    severityConfig.color,
                    severityConfig.bgColor
                  )}
                >
                  {severityConfig.label}
                </Badge>
                <span className="flex items-center gap-1">
                  <StatusIcon className={cn('size-3', statusConfig.color)} />
                  {statusConfig.label}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Description */}
          {feedback.description && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                Descricao
              </h4>
              <ScrollArea className="max-h-32">
                <p className="text-sm">{feedback.description}</p>
              </ScrollArea>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Categoria</span>
              <p className="font-medium capitalize">{feedback.category}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Fonte</span>
              <p className="font-medium capitalize">
                {feedback.source || 'Geral'}
              </p>
            </div>
            {feedback.createdBy?.name && (
              <div>
                <span className="text-xs text-muted-foreground">
                  Criado por
                </span>
                <p className="flex items-center gap-1 font-medium">
                  <User className="size-3" />
                  {feedback.createdBy.name}
                </p>
              </div>
            )}
            {formattedDate && (
              <div>
                <span className="text-xs text-muted-foreground">Data</span>
                <p className="font-medium">{formattedDate}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {feedback.tags && feedback.tags.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Tags</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {feedback.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action */}
          {onNavigate && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onNavigate()
                onOpenChange(false)
              }}
            >
              <ExternalLink className="mr-2 size-4" />
              Ver no Feedback Hub
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT - FEEDBACK LIST GRID
// ============================================================================

export function FeedbackListUI({
  feedbacks,
  status,
  totalCount,
  onNavigateToFeedback,
}: FeedbackListUIProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(
    null
  )
  const [dialogOpen, setDialogOpen] = useState(false)

  // Loading state
  if (status === 'inProgress' || status === 'executing') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-4">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          Buscando feedbacks...
        </span>
      </div>
    )
  }

  // Empty state
  if (!feedbacks || feedbacks.length === 0) {
    return (
      <div className="rounded-lg bg-muted/50 p-4 text-center">
        <MessageSquare className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhum feedback encontrado
        </p>
      </div>
    )
  }

  const handleCardClick = (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback)
    setDialogOpen(true)
  }

  const handleNavigate = () => {
    if (selectedFeedback && onNavigateToFeedback) {
      onNavigateToFeedback(selectedFeedback.id)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {feedbacks.length} feedback{feedbacks.length !== 1 ? 's' : ''}
          {totalCount && totalCount > feedbacks.length && (
            <span className="text-muted-foreground"> de {totalCount}</span>
          )}
        </p>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-1.5">
        {feedbacks.map(feedback => (
          <FeedbackRow
            key={feedback.id}
            feedback={feedback}
            onClick={() => handleCardClick(feedback)}
          />
        ))}
      </div>

      {/* Detail Dialog */}
      <FeedbackDetailDialog
        feedback={selectedFeedback}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onNavigate={onNavigateToFeedback ? handleNavigate : undefined}
      />
    </div>
  )
}

export default FeedbackListUI
