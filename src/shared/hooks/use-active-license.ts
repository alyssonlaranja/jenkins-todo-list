'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'

import { cockpitApiClient } from '@/shared/lib/cockpit/api-client'
import type { License } from '@/shared/lib/cockpit/types'
import { usePermissionStore } from '@/shared/stores/permission-store'

import { useUserApiKey } from './use-user-api-key'

interface ExtendedSession {
  accessToken?: string
  [key: string]: unknown
}

/**
 * Hook to manage the active license
 * Fetches licenses available to the current user
 * Auto-selects first license if none is active
 * Synchronizes with permission-store
 * Pattern: cockpit-portal/src/features/users/hooks/use-active-license.ts
 */
export function useActiveLicense() {
  const { data: session } = useSession()
  // Get userId from decoded cockpit_api_token (not Azure AD token)
  const { userId } = useUserApiKey()

  const activeLicenseId = usePermissionStore(state => state.activeLicenseId)
  const setActiveLicense = usePermissionStore(state => state.setActiveLicense)
  // FIX: Wait for hydration before auto-selecting to avoid overwriting user's selection
  const hasHydrated = usePermissionStore(state => state.hasHydrated)

  // Fetch user licenses
  const { data, error, isLoading } = useSWR<License[]>(
    userId ? `user-licenses-${userId}` : null,
    async () => {
      if (!userId) return []

      // Get accessToken from session to pass to cockpitApiClient
      const sessionWithToken = session as unknown as ExtendedSession
      const accessToken = sessionWithToken?.accessToken

      return cockpitApiClient.getUserLicenses(userId, accessToken)
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  // Ensure licenses is always an array
  const licenses = Array.isArray(data) ? data : []

  // Derive activeLicense object from activeLicenseId
  const activeLicense = licenses.find(l => l.id === activeLicenseId) || null

  // Auto-select first license if none is active
  // FIX: Wait for hydration to complete before auto-selecting
  // This prevents overwriting user's selection from localStorage during initial render
  useEffect(() => {
    // Don't auto-select until hydration is complete
    if (!hasHydrated) {
      console.log(
        '[useActiveLicense] ⏳ Waiting for hydration before auto-select...'
      )
      return
    }

    if (licenses.length > 0 && !activeLicenseId && licenses[0]) {
      console.log(
        '[useActiveLicense] 🔄 Auto-selecting first license:',
        licenses[0].id
      )
      setActiveLicense(licenses[0].id)
    }
  }, [licenses, activeLicenseId, setActiveLicense, hasHydrated])

  return {
    licenses,
    activeLicense,
    activeLicenseId,
    setActiveLicense,
    isLoading,
    error,
    hasLicenses: licenses.length > 0,
  }
}
