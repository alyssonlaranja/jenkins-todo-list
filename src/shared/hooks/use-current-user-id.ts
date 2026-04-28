'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { jwtDecode } from 'jwt-decode'

// Extended NextAuth Session type
interface ExtendedSession {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    id?: string
    sub?: string
  } | null
  accessToken?: string
  error?: string
}

interface JwtPayload {
  sub?: string
  nameid?: string
  [key: string]: unknown
}

/**
 * Hook to get the current user ID from the JWT token
 * Extracts the user ID from the 'sub' or 'nameid' claim in the access token
 * @returns Object containing userId and loading state
 */
export function useCurrentUserId() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Cast to safely access accessToken
    const sessionWithToken = session as ExtendedSession
    if (sessionWithToken?.accessToken) {
      try {
        const payload = jwtDecode<JwtPayload>(sessionWithToken.accessToken)
        const potentialId = payload.sub || payload.nameid
        if (potentialId) setUserId(potentialId)
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to decode JWT', e)
        }
      }
    }
  }, [session])

  return {
    userId,
    isLoading,
  }
}
