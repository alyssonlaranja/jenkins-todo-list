'use client'

/**
 * AtlasNotificationBadge
 *
 * Displays a notification badge with the total count of unread signals.
 * Shows different visual states for urgent/critical items.
 */
import { Bell } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import { Button } from '../ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'

interface AtlasNotificationBadgeProps {
  count: number
  urgentCount: number
  onClick?: () => void
  className?: string
}

export function AtlasNotificationBadge({
  count,
  urgentCount,
  onClick,
  className,
}: AtlasNotificationBadgeProps) {
  const hasNotifications = count > 0
  const hasUrgent = urgentCount > 0

  const displayCount = count > 99 ? '99+' : count.toString()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={cn(
              'relative h-9 w-9 rounded-lg transition-colors',
              hasUrgent && 'text-destructive hover:text-destructive',
              className
            )}
            aria-label={`${count} notifications${urgentCount > 0 ? `, ${urgentCount} urgent` : ''}`}
          >
            <Bell
              className={cn(
                'h-5 w-5',
                hasUrgent && 'animate-pulse',
                hasNotifications && !hasUrgent && 'text-primary'
              )}
            />

            {hasNotifications && (
              <span
                className={cn(
                  'absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                  hasUrgent
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                {displayCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {hasNotifications ? (
            <p>
              {count} unread signal{count !== 1 ? 's' : ''}
              {urgentCount > 0 && (
                <span className="text-destructive">
                  {' '}
                  ({urgentCount} urgent)
                </span>
              )}
            </p>
          ) : (
            <p>No new notifications</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default AtlasNotificationBadge
