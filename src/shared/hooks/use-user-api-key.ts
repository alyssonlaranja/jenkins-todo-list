import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { jwtDecode } from 'jwt-decode'
import useSWR from 'swr'

import { cockpitApiClient } from '@/shared/lib/cockpit/api-client'
import type { APIKey } from '@/shared/lib/cockpit/types'

interface ExtendedSession {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
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
 * Hook to extract userId from cockpit_api_token (accessToken)
 * Pattern: cockpit-portal/src/features/users/hooks/use-current-user.ts
 */
function useCurrentUserId() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const sessionWithToken = session as ExtendedSession
    if (sessionWithToken?.accessToken) {
      try {
        // Decode the cockpit_api_token (accessToken) to get userId
        // Pattern: cockpit-portal uses payload.sub || payload.nameid
        const payload = jwtDecode<JwtPayload>(sessionWithToken.accessToken)
        const potentialId = payload.sub || payload.nameid
        if (potentialId) {
          console.log('[DEBUG useCurrentUserId] Decoded userId:', potentialId)
          setUserId(potentialId)
        }
      } catch (e) {
        console.warn('[DEBUG useCurrentUserId] Failed to decode JWT:', e)
      }
    }
  }, [session])

  return { userId, isLoading }
}

/**
 * Hook to fetch and cache User Personal API Key
 * Pattern: cockpit-portal/src/features/profile/hooks/use-api-key.ts
 * Calls Cockpit API directly from client-side (same as cockpit-portal)
 */
export function useUserApiKey() {
  const { data: session } = useSession()
  const { userId } = useCurrentUserId()

  const { data, error, isLoading, mutate } = useSWR<APIKey | null>(
    userId ? `user-api-key-${userId}` : null,
    async () => {
      console.log('[DEBUG useUserApiKey] Fetching for userId:', userId)
      if (!userId) return null

      // Get accessToken from session to avoid getSession() HTTP call in cockpitFetch
      const sessionWithToken = session as ExtendedSession
      const accessToken = sessionWithToken?.accessToken

      console.log('[DEBUG useUserApiKey] Has accessToken:', !!accessToken)
      if (!accessToken) {
        console.warn(
          '[DEBUG useUserApiKey] No accessToken in session, cannot fetch API key'
        )
        return null
      }

      try {
        // Call Cockpit API directly from client-side (cockpit-portal pattern)
        // Pass accessToken directly to avoid getSession() HTTP call
        const apiKey = await cockpitApiClient.getUserApiKey(userId, accessToken)

        console.log('[DEBUG useUserApiKey] Success:', {
          hasKey: !!apiKey,
          keyId: apiKey?.id,
          hasKeyProperty: !!apiKey?.key,
          keyPreview: apiKey?.key?.substring(0, 20),
          apiKeyStructure: apiKey ? Object.keys(apiKey) : [],
        })
        return apiKey
      } catch (err) {
        console.error('[DEBUG useUserApiKey] Error:', err)
        throw err
      }
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: false,
      shouldRetryOnError: false,
      errorRetryCount: 2,
    }
  )

  const hasFetched = !!data || (!isLoading && data === null)

  // DEBUG: Log only when state actually changes (not on every render)
  // Commented out to reduce console noise - uncomment for debugging
  // useEffect(() => {
  //   console.log('[DEBUG useUserApiKey] State changed:', {
  //     userId,
  //     hasData: !!data,
  //     isLoading,
  //     hasError: !!error,
  //     hasFetched,
  //   })
  // }, [userId, data, isLoading, error, hasFetched])

  return {
    apiKey: data,
    userId,
    isLoading,
    error,
    mutate,
    hasFetched,
  }
}
