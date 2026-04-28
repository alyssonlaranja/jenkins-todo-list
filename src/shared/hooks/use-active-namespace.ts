'use client'

import { useEffect } from 'react'
import useSWR from 'swr'

import type { Namespace } from '@/shared/lib/cockpit/types'
import { namespaceApi } from '@/shared/services/namespace-api'
import { usePermissionStore } from '@/shared/stores/permission-store'

import { useUserApiKey } from './use-user-api-key'

/**
 * Hook to manage the active namespace
 * Fetches namespaces available for the active license
 * Auto-selects first namespace if none is active
 * Synchronizes with permission-store
 */
export function useActiveNamespace() {
  // Get userId from decoded cockpit_api_token (not Azure AD token)
  const { userId } = useUserApiKey()

  const activeLicenseId = usePermissionStore(state => state.activeLicenseId)
  const activeNamespaceId = usePermissionStore(state => state.activeNamespaceId)
  // FIX: Wait for hydration before auto-selecting to avoid overwriting user's selection
  const hasHydrated = usePermissionStore(state => state.hasHydrated)

  const setActiveNamespace = usePermissionStore(
    state => state.setActiveNamespace
  )

  // Fetch namespaces for active license and user
  const { data, error, isLoading } = useSWR<Namespace[]>(
    activeLicenseId && userId
      ? `user-${userId}-license-namespaces-${activeLicenseId}`
      : null,
    async () => {
      if (!activeLicenseId || !userId) return []

      console.log('[useActiveNamespace] Fetching namespaces:', {
        userId,
        licenseId: activeLicenseId,
      })

      // Use the correct API method that requires userId
      const response = await namespaceApi.getUserNamespacesByLicense(
        userId,
        activeLicenseId
      )

      console.log('[useActiveNamespace] Raw response:', response)

      // Handle different response formats:

      // Format 1: Paginated response with items array
      if (response && typeof response === 'object' && 'items' in response) {
        console.log('[useActiveNamespace] Response is paginated format:', {
          hasItems: !!response.items,
          itemsLength: Array.isArray(response.items)
            ? response.items.length
            : 'not array',
          totalCount: response.totalCount,
        })

        if (Array.isArray(response.items)) {
          return response.items
        }

        console.warn(
          '[useActiveNamespace] items is not an array:',
          response.items
        )
        return []
      }

      // Format 2: ApiResponse with succeeded and data
      if (response && typeof response === 'object' && 'succeeded' in response) {
        console.log('[useActiveNamespace] Response is ApiResponse format:', {
          succeeded: response.succeeded,
          hasData: !!response.data,
          dataLength: Array.isArray(response.data)
            ? response.data.length
            : 'not array',
        })

        if (response.succeeded && response.data) {
          return response.data
        }

        console.warn(
          '[useActiveNamespace] Failed to fetch namespaces:',
          response.message
        )
        return []
      }

      // Format 3: Direct array of Namespace[]
      if (Array.isArray(response)) {
        console.log('[useActiveNamespace] Response is already array:', {
          length: response.length,
        })
        return response
      }

      console.warn('[useActiveNamespace] Unexpected response format:', response)
      return []
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  // Ensure namespaces is always an array
  const namespaces = Array.isArray(data) ? data : []

  // Derive activeNamespace object from activeNamespaceId
  const activeNamespace =
    namespaces.find(ns => ns.id === activeNamespaceId) || null

  // Auto-select first namespace if none is active
  // FIX: Wait for hydration to complete before auto-selecting
  // This prevents overwriting user's selection from localStorage during initial render
  useEffect(() => {
    // Don't auto-select until hydration is complete
    if (!hasHydrated) {
      console.log(
        '[useActiveNamespace] ⏳ Waiting for hydration before auto-select...'
      )
      return
    }

    if (namespaces.length > 0 && !activeNamespaceId && namespaces[0]) {
      console.log(
        '[useActiveNamespace] 🔄 Auto-selecting first namespace:',
        namespaces[0].id
      )
      setActiveNamespace(namespaces[0].id)
    }
  }, [namespaces, activeNamespaceId, setActiveNamespace, hasHydrated])

  return {
    namespaces,
    activeNamespace,
    activeNamespaceId,
    setActiveNamespace,
    isLoading,
    error,
    hasNamespaces: namespaces.length > 0,
  }
}
