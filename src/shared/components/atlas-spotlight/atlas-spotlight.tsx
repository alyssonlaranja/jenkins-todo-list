'use client'

/**
 * AtlasSpotlight
 *
 * A Spotlight-style input component for the header that allows users
 * to quickly navigate and search from anywhere in the application.
 *
 * NOTE: This component does NOT use CopilotKit to avoid conflicts with
 * module-specific providers. Instead, it redirects to the Atlas page
 * where the full AI chat experience is available.
 *
 * Features:
 * - Keyboard shortcut (Cmd/Ctrl+K) to focus
 * - Context-aware suggestions
 * - Recent signals preview
 * - Notification badge integration
 * - Redirects to Atlas for AI chat
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Command,
  Globe,
  MessageCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react'

import { useAtlasNotifications } from '@/shared/hooks/use-atlas-notifications'
import { useI18n } from '@/shared/hooks/use-i18n'
import { cn } from '@/shared/lib/utils'

import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { AtlasNotificationBadge } from './atlas-notification-badge'
import { AtlasQuickAgent } from './atlas-quick-agent'

// ============================================================================
// TYPES
// ============================================================================

interface Suggestion {
  id: string
  icon: React.ReactNode
  label: string
  description: string
  action: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AtlasSpotlight() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { t } = useI18n('mcp')

  const notifications = useAtlasNotifications()

  // ========================================
  // KEYBOARD SHORTCUT
  // ========================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open/focus
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setQuery('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // ========================================
  // SUGGESTIONS
  // ========================================

  const getSuggestions = useCallback((): Suggestion[] => {
    const baseSuggestions: Suggestion[] = [
      {
        id: 'open-atlas-chat',
        icon: <Sparkles className="size-4 text-primary" />,
        label: t('spotlight.suggestions.openAtlasChat'),
        description: t('spotlight.suggestions.openAtlasChatDesc'),
        action: () => {
          router.push('/dashboard/atlas')
          setIsOpen(false)
        },
      },
      {
        id: 'show-critical',
        icon: <Sparkles className="size-4 text-destructive" />,
        label: t('spotlight.suggestions.showCritical'),
        description: t('spotlight.suggestions.showCriticalDesc'),
        action: () => {
          router.push('/dashboard/atlas?priority=critical')
          setIsOpen(false)
        },
      },
      {
        id: 'new-feedback',
        icon: <MessageCircle className="size-4 text-primary" />,
        label: t('spotlight.suggestions.submitFeedback'),
        description: t('spotlight.suggestions.submitFeedbackDesc'),
        action: () => {
          router.push('/dashboard/atlas?action=new-feedback')
          setIsOpen(false)
        },
      },
      {
        id: 'view-messages',
        icon: <Globe className="size-4 text-muted-foreground" />,
        label: t('spotlight.suggestions.viewMessages'),
        description: t('spotlight.suggestions.viewMessagesDesc'),
        action: () => {
          router.push('/dashboard/atlas?tab=messages')
          setIsOpen(false)
        },
      },
    ]

    // Filter by query if present
    if (query.trim()) {
      return baseSuggestions.filter(
        s =>
          s.label.toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase())
      )
    }

    return baseSuggestions
  }, [query, router, t])

  // ========================================
  // HANDLERS
  // ========================================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) return

    // Navigate to Atlas with search query
    router.push(`/dashboard/atlas?search=${encodeURIComponent(query)}`)
    setIsOpen(false)
    setQuery('')
  }

  const handleNotificationClick = () => {
    router.push('/dashboard/atlas')
    setIsOpen(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    setQuery('')
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      {/* Collapsed Trigger Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="hidden h-9 gap-2 rounded-lg bg-muted/50 px-3 text-muted-foreground shadow-none hover:bg-muted md:flex"
        >
          <Globe className="size-4" />
          <span className="text-sm">{t('spotlight.trigger')}</span>
          <kbd className="pointer-events-none ml-2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <Command className="size-3" />K
          </kbd>
        </Button>

        {/* Mobile trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="size-9 md:hidden"
        >
          <Search className="size-5" />
        </Button>

        {/* Atlas Quick Agent - CopilotKit powered */}
        <AtlasQuickAgent />

        {/* Notification Badge */}
        <AtlasNotificationBadge
          count={notifications.totalUnread}
          urgentCount={notifications.urgentCount}
          onClick={handleNotificationClick}
        />
      </div>

      {/* Spotlight Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('spotlight.title')}</DialogTitle>
            <DialogDescription>{t('spotlight.description')}</DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <form onSubmit={handleSubmit} className="border-b">
            <div className="flex items-center gap-2 px-4 py-3">
              <Globe className="size-5 shrink-0 text-primary" />
              <Input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('spotlight.searchPlaceholder')}
                className="flex-1 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
                autoFocus
              />
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => setQuery('')}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </form>

          {/* Suggestions / Quick Actions */}
          <div className="p-2">
            {/* Recent Notifications */}
            {notifications.recent.length > 0 && (
              <div className="mb-2 border-b pb-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  {t('spotlight.recentSignals')}
                </p>
                {notifications.recent.slice(0, 3).map(signal => (
                  <button
                    key={signal.id}
                    onClick={() => {
                      router.push(`/dashboard/atlas?signalId=${signal.id}`)
                      setIsOpen(false)
                    }}
                    className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted"
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        signal.priority === 'critical'
                          ? 'bg-destructive'
                          : signal.priority === 'high'
                            ? 'bg-orange-500'
                            : 'bg-primary'
                      )}
                    />
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">
                        {signal.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {signal.preview}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Suggestions */}
            <div>
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {t('spotlight.quickActions')}
              </p>
              {getSuggestions().map(suggestion => (
                <button
                  key={suggestion.id}
                  onClick={suggestion.action}
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted"
                >
                  {suggestion.icon}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{suggestion.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1.5 py-0.5">↵</kbd>
                {t('spotlight.shortcuts.search')}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1.5 py-0.5">esc</kbd>
                {t('spotlight.shortcuts.close')}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => {
                router.push('/dashboard/atlas')
                handleClose()
              }}
            >
              {t('spotlight.openAtlas')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AtlasSpotlight
