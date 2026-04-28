'use client'

import { AlertCircle, CheckCircle, Server } from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import { useI18n } from '@/shared/hooks/use-i18n'
import { cn } from '@/shared/lib/utils'

interface SystemStatusProps {
  sessionEnvironment?: {
    id: string
    name: string
    type: 'session'
  } | null
  sessionConnection?: {
    id: string
    title: string
    status: 'connected' | 'disconnected' | 'error' | 'connecting'
    environmentRef: {
      environmentName: string
      licenseName: string
      namespaceName: string
    }
  } | null
  isCreatingEnvironment?: boolean
}

/**
 * System Status Indicator
 * Shows session environment and connection status as compact infrastructure info
 * Not part of user content - this is system/infrastructure level
 */
export function SystemStatus({
  sessionEnvironment: _sessionEnvironment,
  sessionConnection,
  isCreatingEnvironment,
}: SystemStatusProps) {
  const { t } = useI18n('common')
  const isConnected = sessionConnection?.status === 'connected'
  const isError = sessionConnection?.status === 'error'
  const isDisconnected = sessionConnection?.status === 'disconnected'

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-2 backdrop-blur-sm">
      {/* System Icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-md p-1.5',
          isConnected && 'bg-green-500/10',
          isError && 'bg-destructive/10',
          (isDisconnected || !sessionConnection) && 'bg-muted'
        )}
      >
        <Server
          className={cn(
            'size-4',
            isConnected && 'text-green-600',
            isError && 'text-destructive',
            (isDisconnected || !sessionConnection) && 'text-muted-foreground'
          )}
        />
      </div>

      {/* Status Info */}
      <div className="flex flex-1 items-center gap-2 text-xs">
        {/* Connection Status */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                {isConnected && (
                  <>
                    <CheckCircle className="size-3.5 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      {t('systemStatus.mcpConnected')}
                    </span>
                  </>
                )}
                {isError && (
                  <>
                    <AlertCircle className="size-3.5 text-destructive" />
                    <span className="font-medium text-destructive">
                      {t('systemStatus.mcpError')}
                    </span>
                  </>
                )}
                {(isDisconnected || !sessionConnection) &&
                  !isCreatingEnvironment && (
                    <>
                      <AlertCircle className="size-3.5 text-muted-foreground" />
                      <span className="font-medium text-muted-foreground">
                        {t('systemStatus.mcpDisconnected')}
                      </span>
                    </>
                  )}
                {isCreatingEnvironment && (
                  <>
                    <div className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="font-medium text-primary">
                      {t('systemStatus.initializing')}
                    </span>
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('systemStatus.connectionStatusTooltip')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Separator */}
        {sessionConnection && (
          <>
            <div className="h-3 w-px bg-border" />

            {/* Environment Name */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="h-5 border-primary/30 bg-primary/5 py-0 text-xs font-normal text-primary"
                  >
                    {sessionConnection.environmentRef.environmentName}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('systemStatus.portalEnvironment')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* License */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="h-5 py-0 text-xs font-normal"
                  >
                    {sessionConnection.environmentRef.licenseName}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('systemStatus.activeLicense')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Namespace */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="h-5 py-0 text-xs font-normal"
                  >
                    {sessionConnection.environmentRef.namespaceName}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('systemStatus.activeNamespace')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>

      {/* System Label */}
      <div className="text-xs text-muted-foreground">
        {t('systemStatus.systemLabel')}
      </div>
    </div>
  )
}
