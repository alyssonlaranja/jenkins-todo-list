import { useCallback, useEffect, useRef, useState } from 'react'

import {
  Connection,
  getLegacyServer,
} from '@/features/connections/types/connection'
import {
  Artifact,
  CursorPagination,
  MCP_ERROR_CODES,
  McpTool,
} from '@/shared/lib/mcp/types'
import { usePermissionStore } from '@/shared/stores/permission-store'

interface UseProxyMCPOptions {
  namespace: string
  autoConnect?: boolean
  autoFetchArtifacts?: boolean
  skipToolsDiscovery?: boolean
  connection?: Connection | null
}

interface UseProxyMCPReturn {
  connected: boolean
  connecting: boolean
  error: string | null
  sessionId: string | null
  artifacts: Artifact[]
  total: number
  pagination: CursorPagination | null
  tools: McpTool[]
  connect: () => Promise<void>
  disconnect: () => void

  callTool: (
    name: string,
    params: any,
    customHeaders?: Record<string, string>
  ) => Promise<any>
  listArtifacts: (cursor?: string) => Promise<void>
  refreshArtifacts: () => Promise<void>

  createArtifact: (
    data: Partial<Artifact>,
    customHeaders?: Record<string, string>
  ) => Promise<any>

  updateArtifact: (
    id: string,
    data: Partial<Artifact>,
    customHeaders?: Record<string, string>
  ) => Promise<any>

  deleteArtifact: (
    id: string,
    customHeaders?: Record<string, string>
  ) => Promise<any>
}

export function useProxyMCP({
  namespace,
  autoConnect = false,
  autoFetchArtifacts = false,
  skipToolsDiscovery = false,
  connection,
}: UseProxyMCPOptions): UseProxyMCPReturn {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [total, setTotal] = useState(0)
  const [pagination, setPagination] = useState<CursorPagination | null>(null)
  const [tools, setTools] = useState<McpTool[]>([])

  // Get server config from connection
  const serverConfig = connection ? getLegacyServer(connection) : null

  // Use refs to avoid stale closure issues in callbacks
  // This ensures callTool always has the current connected/serverConfig values
  const connectedRef = useRef(connected)
  const serverConfigRef = useRef(serverConfig)

  // FIX: Track namespace from PERMISSION STORE (not connection) to detect changes
  // This is critical because during context switching:
  // 1. Permission store updates activeNamespaceId immediately
  // 2. Connection is recreated asynchronously
  // 3. If we track connection's namespaceId, we might miss the change
  const activeNamespaceId = usePermissionStore(state => state.activeNamespaceId)
  const prevNamespaceIdRef = useRef<string | null>(activeNamespaceId)

  // Keep refs in sync with state
  useEffect(() => {
    connectedRef.current = connected
  }, [connected])

  useEffect(() => {
    serverConfigRef.current = serverConfig

    const currentNamespaceId = activeNamespaceId
    const prevNamespaceId = prevNamespaceIdRef.current

    // FIX: Reset connected when namespace CHANGES (different ID) OR serverConfig becomes null
    // This ensures proper reconnection on context switch even with React batching
    const namespaceChanged =
      prevNamespaceId !== null &&
      currentNamespaceId !== null &&
      currentNamespaceId !== prevNamespaceId

    if (namespaceChanged || (!serverConfig && connected)) {
      console.log(
        '[useProxyMCP] 🔄 Namespace changed - resetting connected state:',
        {
          from: prevNamespaceId,
          to: currentNamespaceId,
          serverConfigNull: !serverConfig,
        }
      )
      setConnected(false)
    }

    // Update ref for next comparison
    prevNamespaceIdRef.current = currentNamespaceId
  }, [serverConfig, connected, activeNamespaceId])

  useEffect(() => {
    if (typeof window !== 'undefined' && namespace !== 'disabled') {
      const storageKey = `mcp-artifacts-${namespace}`
      try {
        const storedArtifacts = localStorage.getItem(storageKey)
        if (storedArtifacts) {
          const parsedArtifacts = JSON.parse(storedArtifacts)
          setArtifacts(parsedArtifacts)
          setTotal(parsedArtifacts.length)
        }
      } catch (error) {
        console.error('Error loading artifacts from localStorage:', error)
      }
    }
  }, [namespace])

  const callTool = useCallback(
    async (
      name: string,
      params: any = {},
      customHeaders?: Record<string, string>
    ): Promise<any> => {
      // Use refs to get current values (avoids stale closure issues)
      const currentConnected = connectedRef.current
      const currentServerConfig = serverConfigRef.current

      if (!currentConnected || !currentServerConfig) {
        console.error('[useProxyMCP] callTool failed - not connected:', {
          connected: currentConnected,
          hasServerConfig: !!currentServerConfig,
          toolName: name,
        })
        throw new Error('Not connected to MCP server')
      }

      // Merge serverConfig headers with custom headers and session ID
      const mergedHeaders: Record<string, string> = {
        ...currentServerConfig.headers,
        ...customHeaders,
      }

      // Add session ID if available
      if (sessionId) {
        mergedHeaders['Mcp-Session-Id'] = sessionId
      }

      const response = await fetch('/api/mcp-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespace,
          method: 'tools/call',
          params: { name, arguments: params },
          headers: mergedHeaders,
          mcpServerUrl: currentServerConfig.url || '',
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Check for new session ID in response headers
      const newSessionId = response.headers.get('mcp-session-id')
      if (newSessionId && newSessionId !== sessionId) {
        setSessionId(newSessionId)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: { success: boolean; error?: any; [key: string]: any } =
        await response.json()

      // Handle MCP error codes
      if (
        result.error &&
        typeof result.error === 'object' &&
        'code' in result.error
      ) {
        const errorCode = result.error.code
        let errorMessage = result.error.message || 'Tool call failed'

        if (errorCode === MCP_ERROR_CODES.METHOD_NOT_FOUND) {
          errorMessage = `Tool "${name}" is not available on this server`
        } else if (errorCode === MCP_ERROR_CODES.INVALID_REQUEST) {
          errorMessage = 'Invalid request format'
        } else if (errorCode === MCP_ERROR_CODES.INVALID_PARAMS) {
          errorMessage = 'Invalid parameters provided'
        }

        throw new Error(errorMessage)
      }

      if (!result.success) {
        throw new Error(result.error || 'Tool call failed')
      }

      return result
    },
    // Note: We use refs (connectedRef, serverConfigRef) to avoid stale closure issues,
    // so we don't need connected/serverConfig in dependencies. The refs are always current.
    [namespace, sessionId]
  )

  const connect = useCallback(async () => {
    console.log(
      '[useProxyMCP] connect() called, serverConfig:',
      serverConfig ? 'exists' : 'null',
      'skipToolsDiscovery:',
      skipToolsDiscovery
    )

    if (!serverConfig) {
      const errorMsg =
        'No MCP server configuration provided. Session environment may not be ready.'
      setError(errorMsg)
      console.error('[useProxyMCP]', errorMsg)
      throw new Error(errorMsg)
    }

    setConnecting(true)
    setError(null)

    // If skipToolsDiscovery is true, just mark as connected without calling tools/list
    // This saves ~42 seconds of latency for components that only need callTool
    if (skipToolsDiscovery) {
      console.log(
        '[useProxyMCP] ⚡ Skipping tools/list (skipToolsDiscovery=true)'
      )
      setConnected(true)
      setConnecting(false)
      return
    }

    console.log('[useProxyMCP] Attempting connection to:', serverConfig.url)

    const payload = {
      namespace,
      method: 'tools/list',
      params: {},
      headers: serverConfig.headers || {},
      mcpServerUrl: serverConfig.url || '',
    }

    // eslint-disable-next-line no-console
    console.log(
      '[useProxyMCP] 🔍 Connection Payload Preview:',
      JSON.stringify(payload, null, 2)
    )

    try {
      const response = await fetch('/api/mcp-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.statusText}`)
      }

      // Capture session ID from response headers
      const newSessionId = response.headers.get('mcp-session-id')
      if (newSessionId) {
        setSessionId(newSessionId)
        console.log(`[useProxyMCP] Session ID captured: ${newSessionId}`)
      }

      const result: { success: boolean; error?: string; tools?: McpTool[] } =
        await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Connection failed')
      }

      if (result.tools) {
        setTools(result.tools)
        console.log(
          `[useProxyMCP] Loaded ${result.tools.length} tools from server`
        )
      }

      setConnected(true)
      console.log('[useProxyMCP] ✅ Connection established successfully')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed'
      setError(errorMsg)
      setConnected(false)
      console.error('[useProxyMCP] ❌ Connection failed:', err)
    } finally {
      setConnecting(false)
      console.log(
        '[useProxyMCP] Connection attempt finished, connected:',
        connected
      )
    }
  }, [serverConfig, namespace, connected, skipToolsDiscovery])

  const disconnect = useCallback(() => {
    setConnected(false)
    setError(null)
    setSessionId(null)
    setArtifacts([])
    setTotal(0)
    setPagination(null)
    setTools([])

    if (typeof window !== 'undefined' && namespace !== 'disabled') {
      const storageKey = `mcp-artifacts-${namespace}`
      try {
        localStorage.removeItem(storageKey)
      } catch (error) {
        console.error('Error removing artifacts from localStorage:', error)
      }
    }
  }, [namespace])

  const listArtifacts = useCallback(
    async (cursor?: string) => {
      if (!connected) return

      try {
        const potentialArtifactTools = tools.filter(
          tool =>
            tool.name === 'list_artifacts' ||
            (tool.name.toLowerCase().includes('list') &&
              tool.name.toLowerCase().includes('artifact') &&
              !tool.name.toLowerCase().includes('type'))
        )

        let toolToUse = potentialArtifactTools.find(
          t => t.name === 'list_artifacts'
        )
        if (!toolToUse && potentialArtifactTools.length > 0) {
          toolToUse = potentialArtifactTools[0]!
        }

        if (!toolToUse) {
          setArtifacts([])
          setTotal(0)
          setPagination(null)
          return
        }

        // Use cursor-based pagination if cursor provided, otherwise fetch all
        if (cursor === undefined) {
          // Fetch all artifacts with cursor pagination
          console.log(`🔍 Fetching all artifacts for namespace ${namespace}...`)

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let allArtifacts: any[] = []
          let currentCursor: string | null = null
          let pageCount = 0
          const pageSize = 100

          while (pageCount < 10) {
            // Safety limit of 10 pages
            const result = await callTool(toolToUse.name, {
              cursor: currentCursor,
              page_size: pageSize,
            })

            // Parse nested MCP response structure
            let artifactsData = null

            if (result.content?.[0]?.text) {
              try {
                artifactsData = JSON.parse(result.content[0].text)
              } catch (parseError) {
                console.error('Failed to parse MCP response:', parseError)
              }
            }

            if (!artifactsData) {
              artifactsData = result
            }

            // Extract artifacts and pagination
            const items =
              artifactsData.artifacts ||
              artifactsData.data?.artifacts ||
              artifactsData.data ||
              []

            const pageArtifacts = Array.isArray(items) ? items : []
            allArtifacts = [...allArtifacts, ...pageArtifacts]

            // Check pagination (MCP v2.0 cursor-based)
            const paginationData =
              artifactsData.pagination || artifactsData.data?.pagination

            if (
              paginationData &&
              paginationData.has_more &&
              paginationData.next_cursor
            ) {
              currentCursor = paginationData.next_cursor
              pageCount++
            } else {
              // No more pages
              break
            }
          }

          console.log(
            `✅ Found ${allArtifacts.length} artifacts for namespace ${namespace}`
          )
          setArtifacts(allArtifacts)
          setTotal(allArtifacts.length)
          setPagination(null) // No pagination when fetching all

          // Save to localStorage
          if (typeof window !== 'undefined' && namespace !== 'disabled') {
            const storageKey = `mcp-artifacts-${namespace}`
            try {
              localStorage.setItem(storageKey, JSON.stringify(allArtifacts))
            } catch (error) {
              console.error('Error saving artifacts to localStorage:', error)
            }
          }
        } else {
          // Fetch single page with cursor
          const result = await callTool(toolToUse.name, {
            cursor,
            page_size: 100,
          })

          // Parse response
          let artifactsData = null

          if (result.content?.[0]?.text) {
            try {
              artifactsData = JSON.parse(result.content[0].text)
            } catch (parseError) {
              console.error('Failed to parse MCP response:', parseError)
            }
          }

          if (!artifactsData) {
            artifactsData = result
          }

          // Extract artifacts and pagination
          const items =
            artifactsData.artifacts ||
            artifactsData.data?.artifacts ||
            artifactsData.data ||
            []

          const pageArtifacts = Array.isArray(items) ? items : []
          const paginationData =
            artifactsData.pagination || artifactsData.data?.pagination

          setArtifacts(pageArtifacts)
          setTotal(paginationData?.total_count || pageArtifacts.length)
          setPagination(paginationData || null)
        }
      } catch (err) {
        console.error('Failed to load artifacts:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to load artifacts'
        )
        setArtifacts([])
        setTotal(0)
        setPagination(null)

        if (typeof window !== 'undefined' && namespace !== 'disabled') {
          const storageKey = `mcp-artifacts-${namespace}`
          try {
            localStorage.removeItem(storageKey)
          } catch (error) {
            console.error('Error removing artifacts from localStorage:', error)
          }
        }
      }
    },
    [connected, namespace, tools, callTool]
  )

  const refreshArtifacts = useCallback(async () => {
    await listArtifacts()
  }, [listArtifacts])

  const createArtifact = useCallback(
    async (data: Partial<Artifact>, customHeaders?: Record<string, string>) => {
      return await callTool('create_artifact', data, customHeaders)
    },
    [callTool]
  )

  const updateArtifact = useCallback(
    async (
      id: string,
      data: Partial<Artifact>,
      customHeaders?: Record<string, string>
    ) => {
      return await callTool('update_artifact', { id, ...data }, customHeaders)
    },
    [callTool]
  )

  const deleteArtifact = useCallback(
    async (id: string, customHeaders?: Record<string, string>) => {
      return await callTool('delete_artifact', { id }, customHeaders)
    },
    [callTool]
  )

  useEffect(() => {
    if (autoConnect && !connected && !connecting && serverConfig && namespace) {
      connect()
    }
  }, [autoConnect, connected, connecting, serverConfig, namespace, connect])

  useEffect(() => {
    if (connected && autoFetchArtifacts) {
      listArtifacts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, autoFetchArtifacts]) // Only trigger on connected/autoFetchArtifacts change

  // FIX: Report as connected only if BOTH connected state AND serverConfig are valid
  // During context switching, serverConfig might be null even if connected state is true
  const isFullyConnected = connected && !!serverConfig

  return {
    connected: isFullyConnected,
    connecting,
    error,
    sessionId,
    artifacts,
    total,
    pagination,
    tools,
    connect,
    disconnect,
    callTool,
    listArtifacts,
    refreshArtifacts,
    createArtifact,
    updateArtifact,
    deleteArtifact,
  }
}
