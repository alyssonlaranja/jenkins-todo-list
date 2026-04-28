'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { mutate } from 'swr'

import {
  getAllConnectionsFromMemory,
  useConnectionManager,
} from '@/features/connections/hooks/use-connection-manager'
import type { Connection } from '@/features/connections/types/connection'
import { buildSessionEnvironment } from '@/shared/lib/cockpit/environment-builder'
import { emitSessionEvent, SESSION_EVENTS } from '@/shared/lib/events'
import type { UtilityAgent } from '@/shared/lib/mcp/types'
// NOTE: fetchUtilityAgents removed - now using MCP search_utility_agents directly
// to find bootstrap agent instead of fetching entire list via REST API
import { useEnvironmentStore } from '@/shared/stores/environment-store'
import { usePermissionStore } from '@/shared/stores/permission-store'

import { useActiveLicense } from './use-active-license'
import { useActiveNamespace } from './use-active-namespace'
import { useMcpServerKey } from './use-mcp-server-key'
import { useUserApiKey } from './use-user-api-key'

// PERFORMANCE: Debug logging is disabled by default
// Set to true only when debugging session/connection issues
const DEBUG_AUTO_ENV = true

// Helper to conditionally log (reduces console noise in production)
const debugLog = (...args: unknown[]) => {
  if (DEBUG_AUTO_ENV) {
    console.log(...args)
  }
}

/**
 * Hook to auto-create Session Environment from authenticated session
 * Validates both API keys before creation
 * MCP Server URLs are validated inside buildSessionEnvironment()
 */
export function useAutoEnvironment() {
  const { data: session, status: sessionStatus } = useSession()
  const userId = session?.user?.id || null

  // Load API keys
  const {
    apiKey,
    isLoading: isLoadingUserKey,
    hasFetched,
  } = useUserApiKey(userId)
  const { mcpServerKey, isLoading: isLoadingMcpKey } = useMcpServerKey()

  // Get active license/namespace data (using hooks that already fetch this data)
  const { activeLicense, isLoading: isLoadingLicense } = useActiveLicense()
  const { activeNamespace, isLoading: isLoadingNamespace } =
    useActiveNamespace()

  // State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [isCreatingEnvironment, setIsCreatingEnvironment] = useState(false)
  const [environmentCreationFailed, setEnvironmentCreationFailed] =
    useState(false)
  const [isCreatingConnection, setIsCreatingConnection] = useState(false)
  const [connectionCreationFailed, setConnectionCreationFailed] =
    useState(false)
  const [isLoadingCustomEnvironments] = useState(false)

  // Reset failure flags when conditions change (allow retry after hot reload fixes)
  useEffect(() => {
    if (
      environmentCreationFailed &&
      apiKey &&
      mcpServerKey &&
      activeLicense &&
      activeNamespace
    ) {
      debugLog(
        '[useAutoEnvironment] Resetting environmentCreationFailed flag (conditions improved)'
      )
      setEnvironmentCreationFailed(false)
    }
    // FIX: Use primitive values to prevent unnecessary effect re-runs
  }, [
    apiKey?.key,
    mcpServerKey,
    activeLicense?.id,
    activeNamespace?.id,
    environmentCreationFailed,
  ])
  const {
    addEnvironment,
    getEnvironmentById,
    environments,
    deleteEnvironment,
  } = useEnvironmentStore()
  const { addConnection, getConnection, removeConnection } =
    useConnectionManager()

  // Track which license/namespace was used to create the current session
  const currentSessionLicenseId = useRef<string | null>(null)
  const currentSessionNamespaceId = useRef<string | null>(null)

  // Check if session environment already exists
  const sessionEnvironmentExists = !!getEnvironmentById('session-current')
  const sessionEnvironment = environments.find(env => env.type === 'session')

  // Extract current session's license/namespace IDs from the environment itself
  // This is critical: useRef loses values on refresh, but the environment persists
  const sessionLicenseId = useMemo(() => {
    if (!sessionEnvironment?.licenses) return null
    const licenseIds = Object.keys(sessionEnvironment.licenses)
    return licenseIds[0] || null
  }, [sessionEnvironment?.licenses])

  const sessionNamespaceId = useMemo(() => {
    if (!sessionEnvironment?.licenses || !sessionLicenseId) return null
    const license = sessionEnvironment.licenses[sessionLicenseId]
    if (!license?.namespaces) return null
    const namespaceIds = Object.keys(license.namespaces)
    return namespaceIds[0] || null
  }, [sessionEnvironment?.licenses, sessionLicenseId])

  // Check if session connection already exists
  const sessionConnectionExists = !!getConnection('session-connection')

  // Get context switching state from permission store
  const isContextSwitching = usePermissionStore(
    state => state.isContextSwitching
  )

  // ========================================================================
  // EFFECT: Clean up session when context is switching
  // When isContextSwitching is true, ALWAYS delete old session and let it recreate
  // CRITICAL: Uses DIRECT state access (not hook values) to avoid stale closures
  // ========================================================================
  useEffect(() => {
    if (!isContextSwitching) return

    console.log(
      '[useAutoEnvironment] 🔄 Context switching detected - cleaning up old session...'
    )

    // Toast to inform user
    toast.info('Switching context...')

    // Reset refs
    currentSessionLicenseId.current = null
    currentSessionNamespaceId.current = null

    // Reset creation flags to allow recreation
    setEnvironmentCreationFailed(false)
    setConnectionCreationFailed(false)

    // CRITICAL: Use DIRECT state access to avoid stale closures
    // Hook values (getConnection, getEnvironmentById) may be stale due to React batching
    const connectionsInMemory = getAllConnectionsFromMemory()
    const hasConnection = connectionsInMemory.some(
      c => c.id === 'session-connection'
    )

    const environmentState = useEnvironmentStore.getState()
    const hasEnvironment =
      !!environmentState.getEnvironmentById('session-current')

    console.log('[useAutoEnvironment] 🔍 State check:', {
      hasConnection,
      hasEnvironment,
      connectionCount: connectionsInMemory.length,
    })

    if (hasConnection) {
      console.log('[useAutoEnvironment] 🗑️ Removing old session connection...')
      // Call removeConnection - it will update the module-level allConnections
      removeConnection('session-connection')
    }

    if (hasEnvironment) {
      console.log('[useAutoEnvironment] 🗑️ Removing old session environment...')
      // Use direct store access to delete
      environmentState.deleteEnvironment('session-current')
    }

    // Invalidate SWR cache for namespace-specific data
    console.log('[useAutoEnvironment] 🗑️ Invalidating SWR cache...')
    mutate(
      key =>
        typeof key === 'string' &&
        (key.includes('artifacts') ||
          key.includes('utility-agents') ||
          key.includes('mcp-')),
      undefined,
      { revalidate: false }
    )

    // NOTE: We do NOT reset isContextSwitching here - it will be reset
    // after the new session connection is fully created (in the connection callback)
    // This keeps the overlay visible during the entire transition
    console.log('[useAutoEnvironment] ✅ Old session cleaned up, will recreate')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isContextSwitching])

  // Validate User API Key
  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (!session) return
    if (!hasFetched) return
    if (sessionEnvironmentExists) return

    // Block if no user API key
    if (!apiKey && !isLoadingUserKey) {
      setShowApiKeyModal(true)
    }
  }, [
    session,
    apiKey,
    isLoadingUserKey,
    hasFetched,
    sessionStatus,
    sessionEnvironmentExists,
  ])

  // Create Session Environment
  useEffect(() => {
    // FIX: Check DIRECTLY in store to avoid stale hook values
    // During context switching, the hook value may be stale even after deleteEnvironment
    const environmentState = useEnvironmentStore.getState()
    const sessionEnvironmentExistsInStore =
      !!environmentState.getEnvironmentById('session-current')

    // Debug: Log preconditions
    debugLog('[DEBUG useAutoEnvironment] Preconditions:', {
      sessionStatus,
      hasSession: !!session,
      hasAccessToken: !!(session as any)?.accessToken,
      sessionEnvironmentExists,
      sessionEnvironmentExistsInStore,
      isCreatingEnvironment,
      hasApiKey: !!apiKey,
      hasMcpServerKey: !!mcpServerKey,
      isLoadingUserKey,
      isLoadingMcpKey,
      isLoadingLicense,
      isLoadingNamespace,
      hasActiveLicense: !!activeLicense,
      hasActiveNamespace: !!activeNamespace,
    })

    if (sessionStatus === 'loading') return
    if (!session) return

    // IMPORTANT: Wait for accessToken to be available
    const accessToken = (session as unknown as { accessToken: string })
      ?.accessToken
    if (!accessToken) {
      debugLog('[DEBUG useAutoEnvironment] Waiting for accessToken...', {
        sessionKeys: Object.keys(session || {}),
        hasUser: !!(session as unknown as { user: unknown })?.user,
      })
      return
    }

    debugLog('[DEBUG useAutoEnvironment] ✅ accessToken available:', {
      tokenPreview: accessToken.substring(0, 30) + '...',
      tokenLength: accessToken.length,
    })
    // FIX: Use store check instead of potentially stale hook value
    if (sessionEnvironmentExistsInStore) {
      debugLog(
        '[DEBUG useAutoEnvironment] ⏭️ Skip: sessionEnvironmentExistsInStore is true'
      )
      return
    }
    if (isCreatingEnvironment) {
      debugLog(
        '[DEBUG useAutoEnvironment] ⏭️ Skip: isCreatingEnvironment is true'
      )
      return
    }
    if (environmentCreationFailed) {
      debugLog(
        '[DEBUG useAutoEnvironment] ⏭️ Skip: environmentCreationFailed (previous attempt failed)'
      )
      return
    }

    // Wait for both API keys
    if (!apiKey || !apiKey.key || !mcpServerKey) {
      debugLog('[DEBUG useAutoEnvironment] Waiting for API keys...', {
        hasApiKey: !!apiKey,
        hasApiKeyKey: !!apiKey?.key,
        hasMcpServerKey: !!mcpServerKey,
      })
      return
    }
    if (isLoadingUserKey || isLoadingMcpKey) {
      debugLog('[DEBUG useAutoEnvironment] Still loading keys...')
      return
    }

    // Wait for license/namespace data to load
    if (isLoadingLicense || isLoadingNamespace) {
      debugLog('[DEBUG useAutoEnvironment] Still loading license/namespace...')
      return
    }

    // Need active license and namespace objects
    if (!activeLicense || !activeNamespace) {
      debugLog(
        '[DEBUG useAutoEnvironment] Active license/namespace not available'
      )
      return
    }

    // Create Session Environment
    setIsCreatingEnvironment(true)

    // IMPORTANT: Capture values at the start to avoid closure issues
    const userApiKey = apiKey.key
    const capturedMcpServerKey = mcpServerKey
    const capturedActiveLicense = activeLicense
    const capturedActiveNamespace = activeNamespace

    // Build Session Environment directly (no need to fetch utility agents anymore)
    // Bootstrap agent will be found via MCP search_utility_agents in the next effect
    try {
      debugLog('[useAutoEnvironment] Building Session Environment with:', {
        licenseId: capturedActiveLicense.id,
        licenseName: capturedActiveLicense.name,
        namespaceId: capturedActiveNamespace.id,
        namespaceName: capturedActiveNamespace.name,
        userApiKey: userApiKey.substring(0, 20) + '...',
        mcpServerApiKey: capturedMcpServerKey.substring(0, 20) + '...',
        note: 'Bootstrap agent will be found via MCP search_utility_agents',
      })

      // Build Session Environment (MCP URLs will be validated inside)
      // utilityAgents is now optional - bootstrap agent is found via MCP search
      const sessionEnv = buildSessionEnvironment({
        license: capturedActiveLicense,
        namespace: capturedActiveNamespace,
        // utilityAgents omitted - will use MCP search_utility_agents instead
        userApiKey: userApiKey,
        mcpServerApiKey: capturedMcpServerKey,
      })

      debugLog('[useAutoEnvironment] Built Session Environment:', {
        id: sessionEnv.id,
        name: sessionEnv.name,
        type: sessionEnv.type,
        licensesKeys: Object.keys(sessionEnv.licenses),
        licenseData: Object.entries(sessionEnv.licenses).map(([id, lic]) => ({
          id,
          name: lic.licenseName,
          namespacesKeys: Object.keys(lic.namespaces),
        })),
      })

      debugLog(
        '[useAutoEnvironment] 🎉 Calling addEnvironment for session environment'
      )
      addEnvironment(sessionEnv)
      emitSessionEvent(SESSION_EVENTS.ENVIRONMENT_CREATED, sessionEnv)

      // Update refs to track which license/namespace was used
      currentSessionLicenseId.current = capturedActiveLicense.id
      currentSessionNamespaceId.current = capturedActiveNamespace.id
      debugLog('[useAutoEnvironment] 📝 Updated session refs:', {
        licenseId: currentSessionLicenseId.current,
        namespaceId: currentSessionNamespaceId.current,
      })
    } catch (error) {
      console.error('Failed to create Session Environment:', error)
      toast.error('Failed to create Session Environment')
      setEnvironmentCreationFailed(true) // Prevent infinite retry loop
    } finally {
      setIsCreatingEnvironment(false)
    }
    // FIX: Use primitive values to prevent unnecessary effect re-runs
    // session object is stable from next-auth, but activeLicense/activeNamespace are derived objects
  }, [
    session,
    apiKey?.key,
    mcpServerKey,
    isLoadingUserKey,
    isLoadingMcpKey,
    isLoadingLicense,
    isLoadingNamespace,
    sessionStatus,
    sessionEnvironmentExists,
    isCreatingEnvironment,
    activeLicense?.id,
    activeNamespace?.id,
    addEnvironment,
    environmentCreationFailed,
  ])

  // Create Session Connection (after Session Environment exists)
  useEffect(() => {
    // FIX: Check DIRECTLY in memory/store to avoid stale hook values
    // During context switching, hook values may be stale even after cleanup
    const connectionsInMemory = getAllConnectionsFromMemory()
    const sessionConnectionExistsInMemory = connectionsInMemory.some(
      c => c.id === 'session-connection'
    )

    // FIX: Also get sessionEnvironment directly from store (not from hook)
    // The hook's `sessionEnvironment` may be stale during context switching
    const environmentState = useEnvironmentStore.getState()
    const sessionEnvironmentFromStore = environmentState.environments.find(
      env => env.type === 'session'
    )

    debugLog('[DEBUG useAutoEnvironment] Session Connection useEffect:', {
      sessionEnvironmentExists,
      hasSessionEnvironment: !!sessionEnvironment,
      hasSessionEnvironmentFromStore: !!sessionEnvironmentFromStore,
      sessionConnectionExists,
      sessionConnectionExistsInMemory,
      isCreatingConnection,
      hasLicense: !!activeLicense,
      hasNamespace: !!activeNamespace,
      // NOTE: connections removed from dependency array to prevent loop
    })

    // FIX: Use store value instead of potentially stale hook value
    if (!sessionEnvironmentFromStore) {
      debugLog(
        '[DEBUG] ⏭️ Skip: sessionEnvironmentFromStore is null (waiting for new environment)'
      )
      return
    }
    // FIX: Use memory check instead of potentially stale hook value
    if (sessionConnectionExistsInMemory) {
      debugLog(
        '[DEBUG] ⏭️ Skip: sessionConnectionExistsInMemory is true (already exists)'
      )
      return
    }
    if (isCreatingConnection) {
      debugLog(
        '[DEBUG] ⏭️ Skip: isCreatingConnection is true (already creating)'
      )
      return
    }
    if (connectionCreationFailed) {
      debugLog(
        '[DEBUG] ⏭️ Skip: connectionCreationFailed is true (previous attempt failed)'
      )
      return
    }
    if (!activeLicense || !activeNamespace) {
      debugLog('[DEBUG] ⏭️ Skip: missing activeLicense or activeNamespace')
      return
    }

    debugLog('[useAutoEnvironment] ✅ Creating Session Connection...')
    setIsCreatingConnection(true)

    // IMPORTANT: We need to use the bootstrap agent "MCP Portal Agent" (Supervisor type)
    // This agent is required for using x-cockpit-utility-agent-id in MCP Legacy headers

    // Strategy (Chicken-Egg Problem Solution):
    // 1. Create TEMPORARY Session Connection (without utility-agent-id)
    //    - Points to mcp-utility-agents server only
    //    - Used only to call list_utility_agents and create_utility_agent tools
    // 2. Use this temporary connection with useBootstrapAgentMCP
    //    - List agents via MCP
    //    - Create "MCP Portal Agent" if not exists via MCP
    // 3. Update Session Connection with bootstrap agent ID

    debugLog(
      '[useAutoEnvironment] Step 1: Creating temporary connection for MCP Utility Agents...'
    )

    // Create temporary connection (no utility-agent-id needed for mcp-utility-agents)
    const tempConnection: Connection = {
      id: 'session-connection-temp',
      title: 'Session Connection (Temporary)',
      subtitle: activeNamespace.name,
      status: 'connected',
      type: 'session',
      environmentRef: {
        environmentId: 'session-current',
        environmentName: 'Current Session',
        licenseId: activeLicense.id,
        licenseName: activeLicense.name,
        namespaceId: activeNamespace.id,
        namespaceName: activeNamespace.name,
        utilityAgentId: '', // No agent yet!
        utilityAgentName: '',
      },
    }

    debugLog('[useAutoEnvironment] Step 2: Ensuring bootstrap agent via MCP...')

    // Get MCP server config for utility-agents
    // FIX: Use sessionEnvironmentFromStore (already fetched at the top of this useEffect)
    // instead of sessionEnvironment from hook which may be stale during context switching
    const env = sessionEnvironmentFromStore
    debugLog('[useAutoEnvironment] sessionEnvironment:', {
      exists: !!env,
      id: env?.id,
      name: env?.name,
      licensesKeys: env ? Object.keys(env.licenses) : [],
    })

    if (!env) {
      throw new Error('Session environment not found')
    }

    debugLog('[useAutoEnvironment] MCP Servers:', {
      servers: Object.keys(env.mcpServers),
      hasUtilityAgents: !!env.mcpServers['connection-mcp-utility-agents'],
    })

    const utilityAgentsServer = env.mcpServers['connection-mcp-utility-agents']
    if (!utilityAgentsServer) {
      throw new Error('MCP Utility Agents server not configured')
    }

    debugLog('[useAutoEnvironment] Utility Agents Server URL:', {
      url: utilityAgentsServer.url,
      type: utilityAgentsServer.type,
    })

    // Get namespace config for headers
    debugLog('[useAutoEnvironment] Environment structure:', {
      environmentId: env.id,
      licensesCount: Object.keys(env.licenses).length,
      licenseIds: Object.keys(env.licenses),
      lookingForLicenseId: activeLicense.id,
    })

    const license = env.licenses[activeLicense.id]
    if (!license) {
      console.error('[useAutoEnvironment] License not found!', {
        availableLicenses: Object.keys(env.licenses),
        requestedLicenseId: activeLicense.id,
      })
      throw new Error(`License not found in environment: ${activeLicense.id}`)
    }

    debugLog('[useAutoEnvironment] License found:', {
      licenseId: license.licenseId,
      licenseName: license.licenseName,
      namespacesCount: Object.keys(license.namespaces).length,
      namespaceIds: Object.keys(license.namespaces),
      lookingForNamespaceId: activeNamespace.id,
    })

    const namespace = license.namespaces[activeNamespace.id]
    if (!namespace) {
      console.error('[useAutoEnvironment] Namespace not found!', {
        availableNamespaces: Object.keys(license.namespaces),
        requestedNamespaceId: activeNamespace.id,
      })
      throw new Error(`Namespace not found in license: ${activeNamespace.id}`)
    }

    debugLog('[useAutoEnvironment] Namespace found:', {
      namespaceId: namespace.namespaceId,
      namespaceName: namespace.namespaceName,
      hasCommonHeaders: !!namespace.commonHeaders,
    })

    // Step 2.1: Search for bootstrap agent via MCP (more efficient than listing all)
    // Uses search_utility_agents with exact name match regex
    fetch('/api/mcp-orchestrator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namespace: tempConnection.id,
        method: 'tools/call',
        params: {
          name: 'search_utility_agents',
          arguments: {
            name_pattern: '^MCP Portal Agent$', // Exact match regex
            search_type: 'name',
            case_sensitive: false,
            page_size: 1,
          },
        },
        headers: namespace.commonHeaders,
        mcpServerUrl: utilityAgentsServer.url,
      }),
    })
      .then(response => response.json())
      .then(result => {
        debugLog('[useAutoEnvironment] search_utility_agents result:', result)

        // Parse search result - MCP returns: { success, utility_agents, data }
        let agents: UtilityAgent[] = []
        if (result.content?.[0]?.text) {
          const parsed = JSON.parse(result.content[0].text)
          agents = parsed.utility_agents || parsed.data?.data || []
        }

        // Check if bootstrap agent was found
        const bootstrapAgent = agents.length > 0 ? agents[0] : null

        if (bootstrapAgent && bootstrapAgent.name === 'MCP Portal Agent') {
          debugLog(
            '[useAutoEnvironment] ✅ Bootstrap agent found via search:',
            bootstrapAgent.id
          )
          return bootstrapAgent
        }

        // Step 2.2: Get agent types (MCP v1.0 - local server requires type_id)
        debugLog(
          '[useAutoEnvironment] Bootstrap agent not found, fetching agent types...'
        )

        return fetch('/api/mcp-orchestrator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            namespace: tempConnection.id,
            method: 'tools/call',
            params: {
              name: 'list_agent_types',
              arguments: {},
            },
            headers: namespace.commonHeaders,
            mcpServerUrl: utilityAgentsServer.url,
          }),
        })
          .then(response => response.json())
          .then(typesResult => {
            debugLog(
              '[useAutoEnvironment] list_agent_types result:',
              typesResult
            )

            // Parse agent types - MCP returns: { success, agent_types, total_count }
            let agentTypes: any[] = []
            if (typesResult.content?.[0]?.text) {
              const parsed = JSON.parse(typesResult.content[0].text)
              agentTypes = parsed.agent_types || [] // ✅ Field is "agent_types", not "data"
            }

            debugLog(
              '[useAutoEnvironment] 🔍 Available agent types:',
              agentTypes
            )
            debugLog(
              '[useAutoEnvironment] 🔍 Type names:',
              agentTypes.map((t: { name: string }) => t.name)
            )

            // Find Standard type (for bootstrap agent)
            const standardType = agentTypes.find(
              (t: { name: string; id: string }) => t.name === 'Standard'
            )

            if (!standardType || !standardType.id) {
              console.warn(
                '[useAutoEnvironment] ⚠️ Standard type not found. Available types:',
                agentTypes.map((t: { name: string }) => t.name)
              )
              // Return a fallback agent so the connection can still be created
              // The app will function without a bootstrap agent (limited MCP features)
              return {
                id: '',
                name: 'MCP Portal Agent (Fallback)',
              } as UtilityAgent
            }

            debugLog(
              '[useAutoEnvironment] Found Standard type:',
              standardType.id
            )

            // Step 2.3: Create bootstrap agent with type_id (MCP v1.0)
            return fetch('/api/mcp-orchestrator', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                namespace: tempConnection.id,
                method: 'tools/call',
                params: {
                  name: 'create_utility_agent',
                  arguments: {
                    name: 'MCP Portal Agent',
                    description:
                      'Auto-created utility agent for MCP Portal artifact management',
                    instruction: 'Default agent for MCP Portal operations',
                    objective:
                      'Manage artifacts and configurations for MCP Portal',
                    type_id: standardType.id, // ✅ MCP v1.0: Use type_id from list_agent_types
                    model: 'azure-gpt-4o',
                    is_mcp_enabled: false, // ✅ MCP v1.0: Use is_mcp_enabled instead of agent_status
                  },
                },
                headers: namespace.commonHeaders,
                mcpServerUrl: utilityAgentsServer.url,
              }),
            })
              .then(response => response.json())
              .then(createResult => {
                debugLog(
                  '[useAutoEnvironment] create_utility_agent response:',
                  createResult
                )

                let createdAgent: UtilityAgent | null = null
                if (createResult.content?.[0]?.text) {
                  const parsed = JSON.parse(createResult.content[0].text)
                  debugLog('[useAutoEnvironment] Parsed create result:', parsed)
                  createdAgent = parsed.data?.data || parsed.data
                } else {
                  debugLog(
                    '[useAutoEnvironment] ❌ No content in create response:',
                    createResult
                  )
                }

                if (!createdAgent || !createdAgent.id) {
                  debugLog(
                    '[useAutoEnvironment] ❌ createdAgent:',
                    createdAgent
                  )
                  throw new Error('Failed to create bootstrap agent via MCP')
                }

                debugLog(
                  '[useAutoEnvironment] ✅ Bootstrap agent created:',
                  createdAgent.id
                )
                return createdAgent
              })
          })
      })
      .then(bootstrapAgent => {
        debugLog(
          '[useAutoEnvironment] Step 3: Creating final Session Connection with bootstrap agent...'
        )

        // Build final Session Connection
        const sessionConnection: Connection = {
          id: 'session-connection',
          title: 'Session Connection',
          subtitle: activeNamespace.name,
          status: 'connected',
          type: 'session', // Mark as session connection (ephemeral)
          environmentRef: {
            environmentId: 'session-current',
            environmentName: 'Current Session',
            licenseId: activeLicense.id,
            licenseName: activeLicense.name,
            namespaceId: activeNamespace.id,
            namespaceName: activeNamespace.name,
            utilityAgentId: bootstrapAgent.id,
            utilityAgentName: bootstrapAgent.name,
          },
        }

        debugLog('[useAutoEnvironment] Session Connection created:', {
          id: sessionConnection.id,
          utilityAgentId: bootstrapAgent.id,
          utilityAgentName: bootstrapAgent.name,
        })

        // Add to connection manager
        debugLog(
          '[useAutoEnvironment] About to call addConnection with:',
          sessionConnection
        )

        addConnection(sessionConnection)
          .then(() => {
            debugLog(
              '[useAutoEnvironment] ✅ Session Connection added to manager successfully'
            )
            emitSessionEvent(
              SESSION_EVENTS.CONNECTION_CREATED,
              sessionConnection
            )

            // FIX: Dispatch event to force immediate refresh of all useConnectionManager hooks
            // This ensures hooks like useModuleAccess see the new connection immediately
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('connections-changed'))
              debugLog(
                '[useAutoEnvironment] 📢 Dispatched connections-changed event'
              )
            }

            // FIX: Reset context switching flag - session is ready
            usePermissionStore.getState().setIsContextSwitching(false)
            debugLog('[useAutoEnvironment] ✅ Context switching complete')

            // toast.success('Session Connection created') // Removed: too noisy on every page load
          })
          .catch(error => {
            console.error(
              '[useAutoEnvironment] ❌ Failed to add Session Connection:',
              error
            )
            console.error('[useAutoEnvironment] Error details:', {
              message: error.message,
              stack: error.stack,
            })
            toast.error(`Failed to create Session Connection: ${error.message}`)
          })
      })
      .catch(error => {
        console.error(
          '[useAutoEnvironment] Failed to create Session Connection:',
          error
        )
        setConnectionCreationFailed(true) // Prevent infinite retry loop
        toast.error(`Failed to create Session Connection: ${error.message}`)

        // FIX: Reset context switching flag even on error
        usePermissionStore.getState().setIsContextSwitching(false)
      })
      .finally(() => {
        setIsCreatingConnection(false)
      })
    // FIX: Use primitive values to prevent unnecessary effect re-runs
    // sessionEnvironment is derived from .find(), activeLicense/activeNamespace are also derived
  }, [
    sessionEnvironmentExists,
    sessionEnvironment?.id,
    sessionConnectionExists,
    isCreatingConnection,
    activeLicense?.id,
    activeNamespace?.id,
    addConnection,
    connectionCreationFailed,
    // REMOVED: connections - was causing loop because addConnection updates connections array
    // which re-triggers this useEffect
  ])

  // TODO: Load Custom Environments (after Session Connection is created)
  // Will be implemented using Session Connection + MCP Utility Agents
  // Pattern: useBootstrapAgentMCP + useProxyMCP

  return {
    showApiKeyModal,
    setShowApiKeyModal,
    isCreatingEnvironment,
    isCreatingConnection,
    isLoadingCustomEnvironments,
    sessionEnvironmentExists,
    sessionConnectionExists,
    // FIX: Expose context switching state for UI blocking
    isContextSwitching,
  }
}

/**
 * Read-only hook to get environment/connection states without triggering creation logic.
 * Use this in child components (Upstream, Migration, Downstream) instead of useAutoEnvironment()
 * to avoid duplicate hook executions.
 *
 * The main useAutoEnvironment() should only be called once in the dashboard layout.
 */
export function useAutoEnvironmentState() {
  const { getEnvironmentById, environments } = useEnvironmentStore()
  const { getConnection } = useConnectionManager()

  // Check if session environment already exists
  const sessionEnvironmentExists = !!getEnvironmentById('session-current')
  const sessionEnvironment = environments.find(env => env.type === 'session')

  // Check if session connection already exists
  const sessionConnectionExists = !!getConnection('session-connection')

  return {
    sessionEnvironmentExists,
    sessionEnvironment,
    sessionConnectionExists,
  }
}
