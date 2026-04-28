import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

import { authOptions } from '@/auth'
import { LanguageSelector } from '@/shared/components/language-selector'
import { LoginForm } from '@/shared/components/login-form'
import { LogoStatic } from '@/shared/components/logo-static'

import { ErrorArea } from './components/error-login-message'

interface PageProps {
  searchParams: Promise<{
    error?: string
    callbackUrl?: string
  }>
}

const customPath = process.env.NEXT_PUBLIC_CUSTOM_BASE_PATH || ''

export default async function LoginPage({ searchParams }: PageProps) {
  // Access searchParams securely
  const params = await searchParams
  const error = params?.error
  let callbackUrl = params?.callbackUrl

  // Security: Only allow internal URLs (starting with /)
  if (callbackUrl && !callbackUrl.startsWith('/')) {
    callbackUrl = undefined
  }

  // Check if the user is already authenticated
  const session = await getServerSession(authOptions)

  // If the user is authenticated, redirect to callbackUrl or default dashboard
  // Handle empty NEXT_PUBLIC_CUSTOM_BASE_PATH to avoid redirect loops
  if (session) {
    if (callbackUrl) {
      // Preserve the original URL the user was trying to access
      redirect(callbackUrl)
    } else {
      // Default dashboard path
      const dashboardPath = customPath ? `/${customPath}/sda2` : '/sda2'
      redirect(dashboardPath)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="absolute right-4 top-4">
        <LanguageSelector />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <LogoStatic className="scale-150 self-center" />
        <LoginForm />
        {error && <ErrorArea errorCode={error} />}
      </div>
    </div>
  )
}
