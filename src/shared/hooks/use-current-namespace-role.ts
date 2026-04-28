'use client'

import { useMemo } from 'react'

import { Role, usePermissionStore } from '@/shared/stores/permission-store'

/**
 * Hook to get the current user's role for the active namespace
 *
 * This hook resolves the role based on:
 * 1. Active namespace ID from permission store
 * 2. User's namespace roles (fetched from API)
 * 3. Falls back to currentNamespaceRole if no match found
 *
 * Pattern: cockpit-portal/src/hooks/use-current-namespace-role.ts
 */
export function useCurrentNamespaceRole() {
  const activeNamespaceId = usePermissionStore(state => state.activeNamespaceId)
  const namespaceRoles = usePermissionStore(state => state.namespaceRoles)
  const currentNamespaceRole = usePermissionStore(
    state => state.currentNamespaceRole
  )
  const hasHydrated = usePermissionStore(state => state.hasHydrated)

  // Calculate the current role from namespace roles
  const resolvedRole = useMemo<Role | null>(() => {
    if (!activeNamespaceId || !namespaceRoles.length || !hasHydrated) {
      return null
    }

    const namespaceRole = namespaceRoles.find(
      nr => nr.namespaceId === activeNamespaceId
    )

    if (namespaceRole?.roleName) {
      return namespaceRole.roleName as Role
    }

    return null
  }, [activeNamespaceId, namespaceRoles, hasHydrated])

  // Use resolved role, fallback to store's currentNamespaceRole
  const effectiveRole = hasHydrated
    ? resolvedRole || currentNamespaceRole
    : null

  // DEBUG: Log role resolution
  console.log('[useCurrentNamespaceRole] 🔍 Role:', {
    activeNamespaceId,
    namespaceRolesCount: namespaceRoles.length,
    resolvedRole,
    currentNamespaceRole,
    effectiveRole,
    hasHydrated,
  })

  return {
    currentRole: effectiveRole,
    isLoading: !hasHydrated,
    hasRole: Boolean(effectiveRole),
  }
}
