'use client'

/**
 * QuickSignalDrawer
 *
 * A universal signal capture drawer that can be opened from anywhere.
 * Captures: Insights, Feedbacks, Ideas, Notes, Alerts
 *
 * Does NOT use CopilotKit to avoid provider conflicts.
 * Saves directly via MCP as Atlas Signals.
 *
 * Updated to use Enhanced Feedback Categories from @/features/atlas/types/categories
 */
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Bug,
  Loader2,
  MessageSquarePlus,
  Rocket,
  Send,
  Shield,
  Trophy,
  X,
  Zap,
} from 'lucide-react'

import type { FeedbackCategoryMap } from '@/features/atlas/types/categories'
import { useConnectionManager } from '@/features/connections/hooks/use-connection-manager'
import { useI18n } from '@/shared/hooks/use-i18n'
import { cn } from '@/shared/lib/utils'

import { Button } from '../ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'

// ============================================================================
// TYPES - Atlas Signal Types (Enhanced Categories)
// ============================================================================

// Quick feedback uses a subset of Enhanced categories for simplicity
type QuickCategory = keyof FeedbackCategoryMap

interface QuickCategoryOption {
  value: QuickCategory
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
  bgColor: string
}

// Quick categories - subset of enhanced categories most commonly used
// Note: Labels will be translated dynamically in the component
const QUICK_CATEGORIES_CONFIG: Omit<QuickCategoryOption, 'label'>[] = [
  {
    value: 'bug',
    icon: Bug,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 border-red-500/30',
  },
  {
    value: 'feature',
    icon: Rocket,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
  },
  {
    value: 'performance',
    icon: Zap,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
  },
  {
    value: 'insight',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
  },
  {
    value: 'learning',
    icon: BookOpen,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
  },
  {
    value: 'success',
    icon: Trophy,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 border-green-500/30',
  },
  {
    value: 'security',
    icon: Shield,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
  },
]

// ============================================================================
// HOOK - Quick Feedback
// ============================================================================

interface QuickFeedbackData {
  category: QuickCategory
  title: string
  description: string
}

function useQuickFeedback() {
  const { connections } = useConnectionManager()
  const { data: session } = useSession()
  const [isCreating, setIsCreating] = useState(false)

  const connection = connections.find(c => c.id === 'session-connection')

  const createFeedback = async (data: QuickFeedbackData): Promise<boolean> => {
    if (!connection) {
      // eslint-disable-next-line no-console
      console.error('[QuickFeedback] No connection available')
      return false
    }

    setIsCreating(true)

    try {
      const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      const now = new Date().toISOString()

      const key = `ATLAS_FEEDBACK_${feedbackId}`

      const feedbackEntry = {
        id: feedbackId,
        type: 'feedback',
        category: data.category,
        status: 'unread',
        priority: 'medium',
        title: data.title,
        content: data.description,
        createdAt: now,
        updatedAt: now,
        author: {
          id: session?.user?.email || 'anonymous',
          name: session?.user?.name || 'Unknown',
          email: session?.user?.email || '',
          type: 'user',
        },
        source: {
          module: 'quick-feedback',
          url: typeof window !== 'undefined' ? window.location.href : '',
          capturedAt: now,
          capturedVia: 'quick-feedback-drawer',
        },
        namespaceId: connection.environmentRef?.namespaceId || '',
        namespaceName: connection.environmentRef?.namespaceName || '',
        licenseId: connection.environmentRef?.licenseId || '',
        licenseName: connection.environmentRef?.licenseName || '',
      }

      const response = await fetch('/api/mcp-orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'create_artifact',
            arguments: {
              key,
              value: JSON.stringify(feedbackEntry),
              description: `Quick Feedback [${data.category}]: ${data.title}`,
              type: 'signal',
              accessibility: 'Namespace',
            },
          },
          connectionConfig: {
            serverUrl: connection.serverUrl,
            apiKey: connection.apiKey,
            licenseId: connection.environmentRef?.licenseId,
            namespaceId: connection.environmentRef?.namespaceId,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save feedback')
      }

      return true
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[QuickFeedback] Error:', error)
      return false
    } finally {
      setIsCreating(false)
    }
  }

  return {
    createFeedback,
    isCreating,
    isConnected: !!connection,
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

interface QuickFeedbackDrawerProps {
  className?: string
}

export function QuickFeedbackDrawer({ className }: QuickFeedbackDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState<QuickCategory | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [success, setSuccess] = useState(false)
  const { t } = useI18n('mcp')

  const { createFeedback, isCreating, isConnected } = useQuickFeedback()

  // Build category options with translations
  const QUICK_CATEGORIES: QuickCategoryOption[] = QUICK_CATEGORIES_CONFIG.map(
    cat => ({
      ...cat,
      label: t(`spotlight.quickFeedback.categories.${cat.value}`),
    })
  )

  const resetForm = () => {
    setCategory(null)
    setTitle('')
    setDescription('')
    setSuccess(false)
  }

  const handleSubmit = async () => {
    if (!category || !title.trim()) return

    const result = await createFeedback({
      category,
      title: title.trim(),
      description: description.trim(),
    })

    if (result) {
      setSuccess(true)
      setTimeout(() => {
        setIsOpen(false)
        resetForm()
      }, 1500)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      resetForm()
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('size-9', className)}
                disabled={!isConnected}
              >
                <MessageSquarePlus className="size-5" />
              </Button>
            </DrawerTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isConnected
              ? t('spotlight.quickFeedback.title')
              : t('spotlight.quickFeedback.connectToSubmit')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center gap-2">
                <MessageSquarePlus className="size-5 text-primary" />
                {t('spotlight.quickFeedback.title')}
              </DrawerTitle>
              <DrawerDescription>
                {t('spotlight.quickFeedback.description')}
              </DrawerDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="space-y-6 p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/20">
                <AlertTriangle className="size-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold">
                {t('spotlight.quickFeedback.successTitle')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('spotlight.quickFeedback.successMessage')}
              </p>
            </div>
          ) : (
            <>
              {/* Category Selection */}
              <div className="space-y-3">
                <Label>{t('spotlight.quickFeedback.feedbackType')}</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {QUICK_CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    const isSelected = category === cat.value
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border p-3 transition-all',
                          isSelected
                            ? `${cat.bgColor} border-2`
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-5',
                            isSelected ? cat.color : 'text-muted-foreground'
                          )}
                        />
                        <span
                          className={cn(
                            'text-xs font-medium',
                            isSelected ? cat.color : 'text-muted-foreground'
                          )}
                        >
                          {cat.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="quick-title">
                  {t('spotlight.quickFeedback.titleLabel')}
                </Label>
                <Input
                  id="quick-title"
                  placeholder={t('spotlight.quickFeedback.titlePlaceholder')}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="quick-desc">
                  {t('spotlight.quickFeedback.descriptionLabel')}
                </Label>
                <Textarea
                  id="quick-desc"
                  placeholder={t(
                    'spotlight.quickFeedback.descriptionPlaceholder'
                  )}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isCreating}
                >
                  {t('spotlight.quickFeedback.cancel')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!category || !title.trim() || isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t('spotlight.quickFeedback.submitting')}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 size-4" />
                      {t('spotlight.quickFeedback.submit')}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default QuickFeedbackDrawer
