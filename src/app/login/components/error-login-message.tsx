'use client'

import { useEffect } from 'react'

import { useAuthError } from '@/shared/hooks/use-auth-error'
import { toast } from '@/shared/hooks/use-toast'

interface ErrorAreaProps {
  errorCode?: string
}

/**
 * Component that displays authentication error messages
 * Shows both a visual alert and a toast notification
 */
export function ErrorArea({ errorCode = 'default' }: ErrorAreaProps) {
  const { getErrorMessage } = useAuthError()

  useEffect(() => {
    // Display toast on component mount
    toast({
      title: 'Authentication Error',
      description: getErrorMessage(errorCode),
      variant: 'destructive',
    })
  }, [errorCode, getErrorMessage])

  // Render a visual error message
  return (
    <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
      {getErrorMessage(errorCode)}
    </div>
  )
}
