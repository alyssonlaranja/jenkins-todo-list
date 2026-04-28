'use client'

import { useEffect, useRef, useState } from 'react'

import { useConnectionManager } from '@/features/connections/hooks/use-connection-manager'
import type { Connection } from '@/features/connections/types/connection'
import type { Environment } from '@/shared/lib/types/environment'
import { useEnvironmentStore } from '@/shared/stores/environment-store'
import { usePermissionStore } from '@/shared/stores/permission-store'

import { useArtifacts } from './use-artifacts'

/**
 * Hook to load Custom Environments from MCP artifacts on login
 *
 * Strategy:
 * 1. Wait for session environment and connection to exist
 * 2. Search artifacts with pattern CUSTOM_ENV_*
 * 3. Parse and validate each artifact
 * 4. Add to environment store (in-memory only)
 *
 * Dependencies:
 * - Session environment (for MCP connection)
 * - Session connection (for MCP access)
 * - Active namespace (for artifact access)
 *
 * @example
 * ```tsx
 * // In layout.tsx or page.tsx
 * function DashboardLayout() {
 *   useAutoEnvironment() // Creates session env + connection
 *   useLoadCustomEnvironments() // Loads custom environments
 *
 *   return <div>{children}</div>
 * }
 * ```
 */
export function useLoadCustomEnvironments() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [loadedCount, setLoadedCount] = useState(0)
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false)

  // Track previous namespace to detect changes
  const previousNamespaceId = useRef<string | null>(null)

  const { environments, addEnvironment } = useEnvironmentStore()
  const { activeNamespaceId } = usePermissionStore()

  // Reset hasAttemptedLoad when namespace changes
  useEffect(() => {
    if (
      previousNamespaceId.current !== null &&
      previousNamespaceId.current !== activeNamespaceId
    ) {
      console.log(
        '[useLoadCustomEnvironments] 🔄 Namespace changed, resetting load state...',
        previousNamespaceId.current,
        '→',
        activeNamespaceId
      )
      setHasAttemptedLoad(false)
      setLoadedCount(0)
      setError(null)
    }
    previousNamespaceId.current = activeNamespaceId
  }, [activeNamespaceId])

  // Get session environment for validation
  const sessionEnvironment = environments.find(env => env.type === 'session')

  // Get session connection for MCP operations (REACTIVE!)
  // (Session connection is created by useAutoEnvironment with proper environmentRef)
  const { connections } = useConnectionManager()
  const sessionConnection = connections.find(
    conn => conn.id === 'session-connection'
  )

  // Use useArtifacts hook (following Upstream pattern)
  const { searchArtifactsByPattern, isConnected } = useArtifacts(
    sessionConnection ||
      ({
        environmentRef: { namespaceName: '' },
      } as Connection)
  )

  useEffect(() => {
    // Prerequisites check
    if (!sessionEnvironment) {
      console.log(
        '[useLoadCustomEnvironments] ⏭️ Skip: Waiting for session environment...'
      )
      return
    }

    if (!sessionConnection) {
      console.log(
        '[useLoadCustomEnvironments] ⏭️ Skip: Waiting for session connection...'
      )
      return
    }

    console.log('[useLoadCustomEnvironments] 🔍 DEBUG Connection check:', {
      sessionConnectionId: sessionConnection.id,
      hasEnvironmentRef: !!sessionConnection.environmentRef,
      environmentRefId: sessionConnection.environmentRef?.environmentId,
    })

    if (!activeNamespaceId) {
      console.log(
        '[useLoadCustomEnvironments] ⏭️ Skip: Waiting for active namespace...'
      )
      return
    }

    // CRITICAL: Verify session namespace matches active namespace
    // This prevents loading with stale session during namespace change
    const sessionNamespaceId = sessionConnection.environmentRef?.namespaceId
    if (sessionNamespaceId && sessionNamespaceId !== activeNamespaceId) {
      console.log(
        '[useLoadCustomEnvironments] ⏭️ Skip: Session namespace mismatch (recreation in progress)',
        { sessionNamespaceId, activeNamespaceId }
      )
      return
    }

    // Prevent multiple loads
    if (isLoading) {
      console.log('[useLoadCustomEnvironments] ⏭️ Skip: Already loading...')
      return
    }

    // Only load once per session
    if (hasAttemptedLoad) {
      console.log(
        '[useLoadCustomEnvironments] ⏭️ Skip: Already attempted load in this session'
      )
      return
    }

    // Check if MCP is connected (following Upstream pattern)
    if (!isConnected) {
      console.log(
        '[useLoadCustomEnvironments] ⏭️ Skip: MCP not connected yet...'
      )
      return
    }

    console.log(
      '[useLoadCustomEnvironments] ✅ Starting to load custom environments...'
    )
    setIsLoading(true)
    setError(null)
    setHasAttemptedLoad(true)
    ;(async () => {
      try {
        // Search for CUSTOM_ENV_* artifacts (following Upstream pattern)
        console.log(
          '[useLoadCustomEnvironments] Searching for CUSTOM_ENV_* artifacts...'
        )
        const artifacts = await searchArtifactsByPattern('CUSTOM_ENV_*')

        console.log(
          `[useLoadCustomEnvironments] Found ${artifacts.length} custom environment artifacts`
        )

        // Process each artifact
        let loaded = 0
        let skipped = 0

        for (const artifact of artifacts) {
          try {
            // artifact.value is already parsed by useArtifacts hook
            const environment = artifact.value as Environment

            // Basic validation
            if (!environment.id || !environment.name) {
              console.warn(
                '[useLoadCustomEnvironments] ⏭️ Skipping invalid artifact (missing id or name):',
                artifact.key
              )
              skipped++
              continue
            }

            if (environment.type !== 'custom') {
              console.warn(
                '[useLoadCustomEnvironments] ⏭️ Skipping invalid artifact (not custom type):',
                artifact.key
              )
              skipped++
              continue
            }

            // Skip if deleted (soft delete - following upstream pattern)
            if ((environment as any).status === 'deleted') {
              console.log(
                '[useLoadCustomEnvironments] ⏭️ Skipping deleted environment:',
                environment.name
              )
              skipped++
              continue
            }

            // Check if already exists in store (prevent duplicates)
            const existsInStore = environments.find(
              env => env.id === environment.id
            )
            if (existsInStore) {
              console.log(
                '[useLoadCustomEnvironments] ⏭️ Environment already in store:',
                environment.name
              )
              skipped++
              continue
            }

            // Add to store (in-memory)
            addEnvironment(environment)
            loaded++

            console.log(
              '[useLoadCustomEnvironments] ✅ Loaded custom environment:',
              environment.name,
              'ID:',
              environment.id
            )
          } catch {
            // Catch-all for any unexpected errors
            console.warn(
              '[useLoadCustomEnvironments] ⏭️ Skipping artifact due to unexpected error:',
              artifact.key
            )
            skipped++
          }
        }

        setLoadedCount(loaded)

        // Success message
        if (loaded > 0) {
          console.log(
            `[useLoadCustomEnvironments] 🎉 Successfully loaded ${loaded} custom environments`
          )
          // toast.success(`Loaded ${loaded} custom environment${loaded === 1 ? '' : 's'}`) // Removed: too noisy on every page load
        } else {
          console.log(
            '[useLoadCustomEnvironments] No custom environments to load'
          )
        }

        if (skipped > 0) {
          console.log(
            `[useLoadCustomEnvironments] Skipped ${skipped} artifacts (deleted or invalid)`
          )
        }
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to load custom environments')
        console.error('[useLoadCustomEnvironments] ❌ Error:', error)
        setError(error)
        // Don't show error toast - fail silently
        // This is expected on first login when no custom environments exist
      } finally {
        setIsLoading(false)
      }
    })()
    // FIX: Use primitive values and lengths to prevent unnecessary effect re-runs
    // Objects from .find() create new references each render
    // Arrays change reference on every store update
  }, [
    sessionEnvironment?.id,
    sessionConnection?.id,
    activeNamespaceId,
    environments.length,
    isLoading,
    hasAttemptedLoad,
    isConnected,
    searchArtifactsByPattern,
    addEnvironment,
  ])

  return {
    /**
     * Whether custom environments are currently loading
     */
    isLoading,

    /**
     * Error if loading failed
     */
    error,

    /**
     * Number of custom environments loaded in current session
     */
    loadedCount,

    /**
     * Whether load has been attempted (prevents re-loading)
     */
    hasAttemptedLoad,
  }
}
