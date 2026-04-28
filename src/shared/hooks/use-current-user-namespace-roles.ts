'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

import {
  NamespaceUserRole,
  usePermissionStore,
} from '@/shared/stores/permission-store'

/**
 * BFF Response type
 */
interface BffNamespaceRolesResponse {
  success: boolean
  data: {
    namespaceRoles: NamespaceUserRole[]
  }
  error?: string
}

/**
 * Hook to fetch the current user's namespace roles from the BFF endpoint
 *
 * This hook:
 * 1. Fetches namespace roles from /api/bff/user-namespace-roles
 * 2. Populates the permission store with the roles
 * 3. Auto-updates current role when active namespace changes
 *
 * Pattern: cockpit-portal/src/features/users/hooks/use-current-user.ts
 */
export function useCurrentUserNamespaceRoles() {
  const { data: session, status } = useSession()
  const [namespaceRoles, setNamespaceRoles] = useState<NamespaceUserRole[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setStoreNamespaceRoles = usePermissionStore(
    state => state.setNamespaceRoles
  )
  const setHasHydrated = usePermissionStore(state => state.setHasHydrated)

  useEffect(() => {
    // Don't fetch if not authenticated
    if (status !== 'authenticated' || !session) {
      return
    }

    const fetchRoles = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/bff/user-namespace-roles', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const data: BffNamespaceRolesResponse = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch namespace roles')
        }

        const roles = data.data.namespaceRoles

        // Update local state
        setNamespaceRoles(roles)

        // Update permission store
        setStoreNamespaceRoles(roles)
        setHasHydrated(true)

        console.log(
          `[useCurrentUserNamespaceRoles] Fetched ${roles.length} namespace roles`
        )
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        console.error('[useCurrentUserNamespaceRoles] Error:', errorMessage)
        setError(errorMessage)

        // Even on error, mark as hydrated to prevent infinite loading
        setHasHydrated(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRoles()
  }, [session, status, setStoreNamespaceRoles, setHasHydrated])

  return {
    namespaceRoles,
    isLoading,
    error,
    hasNamespaceRoles: namespaceRoles.length > 0,
  }
}
