'use client'

import { SessionProvider } from 'next-auth/react'

const basePath = process.env.NEXT_PUBLIC_CUSTOM_BASE_PATH?.trim()

const getBaseAuthCallbackPath = () => {
  if (!basePath) {
    return '/api/auth'
  }
  return `/${basePath}/api/auth`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const baseAuthCallbackPath = getBaseAuthCallbackPath()

  return (
    <SessionProvider basePath={baseAuthCallbackPath}>
      {children}
    </SessionProvider>
  )
}
