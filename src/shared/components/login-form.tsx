'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { useI18n } from '@/shared/hooks/use-i18n'
import { cn } from '@/shared/lib/utils'

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [isLoading, setIsLoading] = useState(false)
  const { t, isReady } = useI18n('auth')
  const searchParams = useSearchParams()

  const handleSignIn = async () => {
    if (isLoading) return // Prevents multiple clicks

    try {
      setIsLoading(true)
      // Preserve the original URL the user was trying to access
      let callbackUrl = searchParams.get('callbackUrl') || '/'

      // Security: Only allow internal URLs (starting with /)
      if (!callbackUrl.startsWith('/')) {
        callbackUrl = '/'
      }

      await signIn('azure-ad', { callbackUrl })
    } catch (error) {
      console.error('Login error:', error)
      // We only return the state to false in case of error
      setIsLoading(false)
    }
    // We removed the finally to keep the button disabled until redirection
  }

  // Show loading state while translations are loading to prevent flash
  if (!isReady) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card className="border-border/40 shadow-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to Cockpit</CardTitle>
            <CardDescription>
              Sign in using your Microsoft account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <Button
                variant="avanade-outline"
                className="flex w-full items-center justify-center gap-3 py-6"
                disabled
              >
                <span className="text-base font-medium">Login</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="text-balance text-center text-xs text-muted-foreground">
          This portal is exclusively for authorized collaborators. In case of
          access issues, contact IT support.
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="border-border/40 shadow-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('login.title')}</CardTitle>
          <CardDescription>{t('login.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <Button
              variant="avanade-outline"
              className={`flex w-full items-center justify-center gap-3 py-6 ${isLoading ? 'cursor-not-allowed hover:cursor-not-allowed' : ''}`}
              onClick={handleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg
                    className="-ml-1 mr-2 size-5 animate-spin text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{t('login.loadingButtonMessage')}</span>
                </div>
              ) : (
                <span className="text-base font-medium">
                  {t('login.loginButton')}
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground">
        {t('login.loginDescriptionFooter')}
      </div>
    </div>
  )
}
