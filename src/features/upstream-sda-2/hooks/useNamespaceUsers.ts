'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { usePermissionStore } from '@/shared/stores/permission-store'

import type { TeamMember } from '../components/projects/TeamMemberSelect'

/**
 * Response from the namespace-users API
 */
interface NamespaceUsersResponse {
  users: {
    id: string
    name: string
    email: string
    role: 'Admin' | 'Owner' | 'Curador' | 'User'
  }[]
  totalCount: number
  page: number
  pageSize: number
}

interface UseNamespaceUsersOptions {
  /** Disable auto-fetch on mount */
  disabled?: boolean
  /** Search term for filtering users */
  search?: string
}

interface UseNamespaceUsersResult {
  /** List of users in the current namespace */
  users: TeamMember[]
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refetch users */
  refetch: () => Promise<void>
}

/**
 * Hook to fetch users that belong to the current namespace.
 * Uses the active license and namespace from permission-store.
 *
 * @example
 * ```tsx
 * const { users, isLoading, error } = useNamespaceUsers()
 *
 * <TeamMemberSelect
 *   availableMembers={users}
 *   // ...
 * />
 * ```
 */
export function useNamespaceUsers(
  options: UseNamespaceUsersOptions = {}
): UseNamespaceUsersResult {
  const { disabled = false, search = '' } = options

  const [users, setUsers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeLicenseId = usePermissionStore(state => state.activeLicenseId)
  const activeNamespaceId = usePermissionStore(state => state.activeNamespaceId)
  const hasHydrated = usePermissionStore(state => state.hasHydrated)

  const fetchUsers = useCallback(async () => {
    if (!hasHydrated) {
      console.log(
        '[useNamespaceUsers] Waiting for permission store hydration...'
      )
      return
    }
    if (!activeLicenseId || !activeNamespaceId) {
      console.log(
        '[useNamespaceUsers] Skipping fetch - no license/namespace:',
        {
          activeLicenseId,
          activeNamespaceId,
        }
      )
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        licenseId: activeLicenseId,
        namespaceId: activeNamespaceId,
        pageSize: '100', // Fetch more users for selection
      })

      if (search) {
        params.set('search', search)
      }

      const response = await fetch(`/api/namespace-users?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data: NamespaceUsersResponse = await response.json()

      console.log('[useNamespaceUsers] Fetched users:', {
        count: data.users.length,
        totalCount: data.totalCount,
      })

      // Map to TeamMember format
      const teamMembers: TeamMember[] = data.users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }))

      setUsers(teamMembers)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch users'
      console.error('[useNamespaceUsers] Error:', message)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [activeLicenseId, activeNamespaceId, hasHydrated, search])

  // Auto-fetch on mount and when dependencies change
  // Retry mechanism: if store hasn't hydrated yet, retry shortly
  useEffect(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    if (!disabled) {
      if (!hasHydrated) {
        // Store not hydrated yet — retry in 500ms
        retryTimeoutRef.current = setTimeout(() => {
          fetchUsers()
        }, 500)
      } else {
        fetchUsers()
      }
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [disabled, fetchUsers, hasHydrated])

  return {
    users,
    isLoading: isLoading || (!hasHydrated && !disabled),
    error,
    refetch: fetchUsers,
  }
}
