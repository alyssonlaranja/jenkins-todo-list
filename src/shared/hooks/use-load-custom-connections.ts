'use client'

import { useEffect, useRef, useState } from 'react'

import { useConnectionManager } from '@/features/connections/hooks/use-connection-manager'
import type { Connection } from '@/features/connections/types/connection'
import { useEnvironmentStore } from '@/shared/stores/environment-store'
import { usePermissionStore } from '@/shared/stores/permission-store'

import { useArtifacts } from './use-artifacts'

/**
 * Hook to load Custom Connections from MCP artifacts on login
 *
 * Strategy (following Upstream pattern):
 * 1. Wait for session connection to be ready
 * 2. Use useArtifacts hook with searchArtifactsByPattern
 * 3. Parse and validate each artifact
 * 4. Validate environment reference exists
 * 5. Add to connection manager (in-memory only)
 *
 * Dependencies:
 * - Custom environments loaded (to validate references)
 * - Session connection (for MCP access via useArtifacts)
 *
 * @example
 * ```tsx
 * // In layout.tsx or page.tsx
 * function DashboardLayout() {
 *   useAutoEnvironment() // Creates session env + connection
 *   useLoadCustomEnvironments() // Loads custom environments
 *   useLoadCustomConnections() // Loads custom connections
 *
 *   return <div>{children}</div>
 * }
 * ```
 */
export function useLoadCustomConnections() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [loadedCount, setLoadedCount] = useState(0)
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false)
  const [lastCustomEnvCount, setLastCustomEnvCount] = useState(0)

  // Track previous namespace to detect changes
  const previousNamespaceId = useRef<string | null>(null)

  const { environments } = useEnvironmentStore()
  const { addConnection, connections } = useConnectionManager()
  const { activeNamespaceId } = usePermissionStore()

  // Reset hasAttemptedLoad when namespace changes
  useEffect(() => {
    if (
      previousNamespaceId.current !== null &&
      previousNamespaceId.current !== activeNamespaceId
    ) {
      console.log(
        '[useLoadCustomConnections] 🔄 Namespace changed, resetting load state...',
        previousNamespaceId.current,
        '→',
        activeNamespaceId
      )
      setHasAttemptedLoad(false)
      setLoadedCount(0)
      setLastCustomEnvCount(0)
      setError(null)
    }
    previousNamespaceId.current = activeNamespaceId
  }, [activeNamespaceId])

  // Get session environment for validation
  const sessionEnvironment = environments.find(env => env.type === 'session')

  // Get session connection for MCP operations (REACTIVE!)
  // (Session connection is created by useAutoEnvironment with proper environmentRef)
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
    const customEnvironmentsCount = environments.filter(
      e => e.type === 'custom'
    ).length

    console.log('[useLoadCustomConnections] 🔄 useEffect triggered', {
      hasSessionEnvironment: !!sessionEnvironment,
      hasSessionConnection: !!sessionConnection,
      sessionConnectionId: sessionConnection?.id,
      hasActiveNamespaceId: !!activeNamespaceId,
      isLoading,
      hasAttemptedLoad,
      isConnected,
      environmentsCount: environments.length,
      customEnvironmentsCount,
      connectionsCount: connections.length,
    })

    // Prerequisites check
    if (!sessionEnvironment) {
      console.log(
        '[useLoadCustomConnections] ⏭️ Skip: Waiting for session environment...'
      )
      return
    }

    if (!sessionConnection) {
      console.log(
        '[useLoadCustomConnections] ⏭️ Skip: Waiting for session connection...'
      )
      return
    }

    console.log('[useLoadCustomConnections] 🔍 DEBUG Connection check:', {
      sessionConnectionId: sessionConnection.id,
      hasEnvironmentRef: !!sessionConnection.environmentRef,
      environmentRefId: sessionConnection.environmentRef?.environmentId,
    })

    if (!activeNamespaceId) {
      console.log(
        '[useLoadCustomConnections] ⏭️ Skip: Waiting for active namespace...'
      )
      return
    }

    // CRITICAL: Verify session namespace matches active namespace
    // This prevents loading with stale session during namespace change
    const sessionNamespaceId = sessionConnection.environmentRef?.namespaceId
    if (sessionNamespaceId && sessionNamespaceId !== activeNamespaceId) {
      console.log(
        '[useLoadCustomConnections] ⏭️ Skip: Session namespace mismatch (recreation in progress)',
        { sessionNamespaceId, activeNamespaceId }
      )
      return
    }

    // Prevent multiple loads
    if (isLoading) {
      console.log('[useLoadCustomConnections] ⏭️ Skip: Already loading...')
      return
    }

    // Only load once per session, BUT retry if custom environments count changed
    // This handles the timing issue where connections load before custom environments
    if (hasAttemptedLoad) {
      if (customEnvironmentsCount === lastCustomEnvCount) {
        console.log(
          '[useLoadCustomConnections] ⏭️ Skip: Already attempted load (customEnvs:',
          customEnvironmentsCount,
          ')'
        )
        return
      } else {
        console.log(
          '[useLoadCustomConnections] ✅ Retrying load because custom environments changed:',
          lastCustomEnvCount,
          '→',
          customEnvironmentsCount
        )
        // Don't return, continue to reload
      }
    }

    // Check if MCP is connected (following Upstream pattern)
    if (!isConnected) {
      console.log(
        '[useLoadCustomConnections] ⏭️ Skip: MCP not connected yet...'
      )
      return
    }

    console.log(
      '[useLoadCustomConnections] ✅ Starting to load custom connections...'
    )
    setIsLoading(true)
    setError(null)
    setHasAttemptedLoad(true)
    setLastCustomEnvCount(customEnvironmentsCount)
    ;(async () => {
      try {
        // Search for CUSTOM_CONN_* artifacts (following Upstream pattern)
        console.log(
          '[useLoadCustomConnections] Searching for CUSTOM_CONN_* artifacts...'
        )
        const artifacts = await searchArtifactsByPattern('CUSTOM_CONN_*')

        console.log(
          `[useLoadCustomConnections] Found ${artifacts.length} custom connection artifacts`
        )

        // Process each artifact
        let loaded = 0
        let skipped = 0

        for (const artifact of artifacts) {
          try {
            // artifact.value is already parsed by useArtifacts hook
            const connection = artifact.value as Connection

            console.log(
              '[useLoadCustomConnections] 🔍 Processing artifact:',
              artifact.key,
              {
                hasId: !!connection.id,
                hasTitle: !!connection.title,
                type: connection.type,
                status: (connection as any).status,
                artifactStatus: (connection as any).artifactStatus,
              }
            )

            // Basic validation
            if (!connection.id || !connection.title) {
              console.warn(
                '[useLoadCustomConnections] ⚠️ Invalid connection artifact (missing id or title):',
                artifact.key
              )
              skipped++
              continue
            }

            // Accept connections without explicit type (backward compatibility)
            // OR with type='custom'
            if (connection.type && connection.type !== 'custom') {
              console.warn(
                '[useLoadCustomConnections] ⚠️ Invalid connection artifact (wrong type):',
                artifact.key,
                'type:',
                connection.type
              )
              skipped++
              continue
            }

            // Set type to 'custom' if not present (backward compatibility)
            if (!connection.type) {
              console.log(
                '[useLoadCustomConnections] 📝 Setting type=custom for artifact:',
                artifact.key
              )
              connection.type = 'custom'
            }

            // Skip if deleted (soft delete - following upstream pattern)
            // Support both old format (status) and new format (artifactStatus)
            const deletionStatus =
              (connection as any).artifactStatus || (connection as any).status
            if (deletionStatus === 'deleted') {
              console.log(
                '[useLoadCustomConnections] ⏭️ Skipping deleted connection:',
                connection.title
              )
              skipped++
              continue
            }

            // Validate environment reference exists
            console.log(
              '[useLoadCustomConnections] 🔍 Looking for environment:',
              connection.environmentRef.environmentId,
              'Available environments:',
              environments.map(e => ({ id: e.id, name: e.name, type: e.type }))
            )

            const referencedEnvironment = environments.find(
              env => env.id === connection.environmentRef.environmentId
            )

            if (!referencedEnvironment) {
              console.warn(
                '[useLoadCustomConnections] ⚠️ Environment not found for connection:',
                connection.title,
                'environmentId:',
                connection.environmentRef.environmentId,
                '(Connection will be skipped - orphaned)'
              )
              skipped++
              continue
            }

            // Check if already exists in store (prevent duplicates)
            const existsInStore = connections.find(
              conn => conn.id === connection.id
            )
            if (existsInStore) {
              console.log(
                '[useLoadCustomConnections] ⏭️ Connection already in store:',
                connection.title
              )
              skipped++
              continue
            }

            // Add to connection manager (in-memory)
            // Clean up artifact-specific fields and fix status if needed
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { artifactStatus, status, ...cleanConnection } =
              connection as any

            // If status is 'active' (from old artifact format), set to disconnected
            const validStatus =
              status === 'active' ||
              status === 'deleted' ||
              !['connected', 'disconnected', 'error', 'connecting'].includes(
                status
              )
                ? 'disconnected'
                : status

            const connectionToAdd = {
              ...cleanConnection,
              status: validStatus,
              _loadedFromArtifact: true, // Flag to prevent re-saving
            }

            await addConnection(connectionToAdd)
            loaded++

            console.log(
              '[useLoadCustomConnections] ✅ Loaded custom connection:',
              connection.title,
              'fixed status:',
              '→',
              validStatus
            )
          } catch {
            // Catch-all for any unexpected errors
            console.warn(
              '[useLoadCustomConnections] ⏭️ Skipping artifact due to unexpected error:',
              artifact.key
            )
            skipped++
          }
        }

        setLoadedCount(loaded)

        // Success message
        if (loaded > 0) {
          console.log(
            `[useLoadCustomConnections] 🎉 Successfully loaded ${loaded} custom connections`
          )
          // toast.success(`Loaded ${loaded} custom connection${loaded === 1 ? '' : 's'}`) // Removed: too noisy on every page load
        } else {
          console.log(
            '[useLoadCustomConnections] No custom connections to load'
          )
        }

        if (skipped > 0) {
          console.log(
            `[useLoadCustomConnections] Skipped ${skipped} artifacts (deleted, invalid, or orphaned)`
          )
        }
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to load custom connections')
        console.error('[useLoadCustomConnections] ❌ Error:', error)
        setError(error)
        // Don't show error toast - fail silently
        // This is expected on first login when no custom connections exist
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
    connections.length,
    isLoading,
    hasAttemptedLoad,
    lastCustomEnvCount,
    isConnected,
    searchArtifactsByPattern,
    addConnection,
  ])

  return {
    /**
     * Whether custom connections are currently loading
     */
    isLoading,

    /**
     * Error if loading failed
     */
    error,

    /**
     * Number of custom connections loaded in current session
     */
    loadedCount,

    /**
     * Whether load has been attempted (prevents re-loading)
     */
    hasAttemptedLoad,
  }
}
