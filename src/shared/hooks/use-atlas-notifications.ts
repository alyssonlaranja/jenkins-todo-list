'use client'

/**
 * useAtlasNotifications Hook
 *
 * Provides notification counts and summaries for the Atlas system.
 * Used by the AtlasSpotlight in the header to show badge counts.
 *
 * Features:
 * - Fetches feedbacks and signals from MCP artifacts
 * - Tracks read/unread state per user using USER_READ_STATE artifact
 * - Provides real-time notification counts
 *
 * NOTE: This hook does NOT use CopilotKit to avoid provider conflicts.
 * Instead, it makes direct API calls to /api/mcp-orchestrator.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

import type {
  AtlasSignal,
  AtlasSignalStats,
  SignalPriority,
  SignalStatus,
  SignalType,
} from '@/features/atlas/types/signals'
import { useConnectionManager } from '@/features/connections/hooks/use-connection-manager'
import {
  Connection,
  getLegacyServer,
} from '@/features/connections/types/connection'

import { useNotificationRefresh } from './use-notification-events'

// ============================================================================
// TYPES
// ============================================================================

export interface AtlasNotification {
  id: string
  type: SignalType
  title: string
  preview: string
  priority: SignalPriority
  createdAt: string
  isNew: boolean
}

/**
 * User Read State - Option 2 pattern
 * Stored as artifact: USER_READ_STATE_{userEmailHash}
 */
export interface UserReadState {
  userId: string
  /** IDs of read feedbacks */
  feedbacksRead: string[]
  /** IDs of read signals */
  signalsRead: string[]
  /** Last update timestamp */
  lastUpdated: string
}

export interface AtlasNotificationsReturn {
  /** Total count of unread signals */
  totalUnread: number

  /** Count of critical/high priority unread signals */
  urgentCount: number

  /** Breakdown by type */
  byType: {
    feedbacks: number
    insights: number
    messages: number
  }

  /** Recent notifications for preview */
  recent: AtlasNotification[]

  /** Full statistics */
  stats: AtlasSignalStats

  /** Loading state */
  loading: boolean

  /** Error state */
  error: string | null

  /** MCP connected state */
  isConnected: boolean

  /** Refresh notifications */
  refresh: () => Promise<void>

  /** Mark a notification as read */
  markAsRead: (signalId: string) => Promise<void>

  /** Mark all as read */
  markAllAsRead: () => Promise<void>
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MCP_ORCHESTRATOR_URL = '/api/mcp-orchestrator'

/**
 * Generate a hash from user email for artifact key
 */
function hashEmail(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Generate the artifact key for user read state
 */
function getUserReadStateKey(userEmail: string): string {
  return `USER_READ_STATE_${hashEmail(userEmail)}`
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const defaultStats: AtlasSignalStats = {
  total: 0,
  byType: {
    feedback: 0,
    insight: 0,
    message: 0,
  },
  byStatus: {
    unread: 0,
    read: 0,
    acknowledged: 0,
    in_progress: 0,
    resolved: 0,
    archived: 0,
  },
  byPriority: {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  },
  unread: 0,
  critical: 0,
}

const defaultReadState: UserReadState = {
  userId: '',
  feedbacksRead: [],
  signalsRead: [],
  lastUpdated: new Date().toISOString(),
}

// ============================================================================
// MCP API HELPER
// ============================================================================

interface MCPResponse {
  ok: boolean
  result?: unknown
  error?: string
}

interface MCPCallConfig {
  connection: Connection | null
  toolName: string
  args: Record<string, unknown>
}

/**
 * Call MCP tool via orchestrator API
 * Uses connection to get serverUrl and headers (same pattern as other MCP calls)
 */
async function callMCPDirect({
  connection,
  toolName,
  args,
}: MCPCallConfig): Promise<MCPResponse> {
  try {
    // Must have connection to make MCP calls
    if (!connection) {
      return { ok: false, error: 'No connection available' }
    }

    // Get server config from connection
    const serverConfig = getLegacyServer(connection)
    if (!serverConfig) {
      return { ok: false, error: 'No server configuration available' }
    }

    const response = await fetch(MCP_ORCHESTRATOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        namespace: connection.id,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
        headers: serverConfig.headers,
        mcpServerUrl: serverConfig.url,
      }),
    })

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` }
    }

    const data = await response.json()

    // Parse MCP response
    if (data.error) {
      return { ok: false, error: data.error.message || 'MCP error' }
    }

    // Extract result from MCP response format
    let result
    if (data.result?.content?.[0]?.text) {
      try {
        result = JSON.parse(data.result.content[0].text)
      } catch {
        result = data.result.content[0].text
      }
    } else if (data.result) {
      result = data.result
    }

    return { ok: true, result }
  } catch (error) {
    console.error('[useAtlasNotifications] MCP call failed:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// HOOK
// ============================================================================

interface UseAtlasNotificationsProps {
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number
}

/**
 * Hook to get Atlas notification counts and summaries
 */
export function useAtlasNotifications(
  props?: UseAtlasNotificationsProps
): AtlasNotificationsReturn {
  const { refreshInterval = 60000 } = props || {}

  const { data: session } = useSession()
  const userEmail = session?.user?.email || ''

  // Get connection from connection manager
  const { connections } = useConnectionManager()
  const connection =
    connections.find(c => c.id === 'session-connection') || null

  // Use ref to track connection to avoid stale closure issues
  const connectionRef = useRef<Connection | null>(null)
  useEffect(() => {
    connectionRef.current = connection
  }, [connection])

  const [signals, setSignals] = useState<AtlasSignal[]>([])
  const [readState, setReadState] = useState<UserReadState>(defaultReadState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Update isConnected when connection changes
  useEffect(() => {
    setIsConnected(!!connection)
  }, [connection])

  // ========================================
  // FETCH USER READ STATE
  // ========================================

  const fetchReadState = useCallback(async (): Promise<UserReadState> => {
    if (!userEmail || !connectionRef.current) return defaultReadState

    const key = getUserReadStateKey(userEmail)
    const result = await callMCPDirect({
      connection: connectionRef.current,
      toolName: 'get_artifact',
      args: { key },
    })

    if (result.ok && result.result) {
      const data = result.result as { value?: string }
      if (data.value) {
        try {
          return JSON.parse(data.value) as UserReadState
        } catch {
          console.warn('[useAtlasNotifications] Failed to parse read state')
        }
      }
    }

    // Return default if not found
    return { ...defaultReadState, userId: userEmail }
  }, [userEmail])

  // ========================================
  // SAVE USER READ STATE
  // ========================================

  const saveReadState = useCallback(
    async (newState: UserReadState) => {
      if (!userEmail || !connectionRef.current) return

      const key = getUserReadStateKey(userEmail)
      const stateToSave = {
        ...newState,
        lastUpdated: new Date().toISOString(),
      }

      await callMCPDirect({
        connection: connectionRef.current,
        toolName: 'create_artifact',
        args: {
          key,
          value: JSON.stringify(stateToSave),
          description: `Read state for user ${userEmail}`,
          type: 'user_state',
          accessibility: 'User',
        },
      })

      setReadState(stateToSave)
    },
    [userEmail]
  )

  // ========================================
  // FETCH SIGNALS FROM MCP
  // ========================================

  const fetchSignals = useCallback(async (): Promise<AtlasSignal[]> => {
    if (!connectionRef.current) return []

    const allSignals: AtlasSignal[] = []
    const currentConnection = connectionRef.current

    // Fetch feedbacks (pattern: FEEDBACK_.*)
    const feedbackResult = await callMCPDirect({
      connection: currentConnection,
      toolName: 'get_artifact',
      args: { key_pattern: 'FEEDBACK_.*' },
    })

    if (feedbackResult.ok && feedbackResult.result) {
      const data = feedbackResult.result as {
        artifacts?: Array<{ key: string; value?: string }>
        matches?: Array<{ key: string; value?: string }>
      }
      const artifacts = data.artifacts || data.matches || []

      for (const artifact of artifacts) {
        try {
          const value = artifact.value
            ? typeof artifact.value === 'string'
              ? JSON.parse(artifact.value)
              : artifact.value
            : null

          if (value) {
            // Convert feedback to AtlasSignal format
            allSignals.push({
              id: value.id || artifact.key,
              type: 'feedback' as SignalType,
              category: value.category || 'insight',
              status: 'unread' as SignalStatus, // Will be updated based on read state
              priority: (value.severity || 'medium') as SignalPriority,
              title: value.title || 'Feedback',
              content: value.description || '',
              createdAt: value.createdAt || new Date().toISOString(),
              updatedAt: value.updatedAt,
              author: {
                id: value.createdBy || 'unknown',
                name: value.createdBy || 'Unknown',
                email: '',
                type: 'user',
              },
              source: {
                module: value.sourceName || value.source || 'general',
                url: value.sourceId || '',
                capturedAt: value.createdAt || new Date().toISOString(),
                capturedVia: 'feedback-hub',
              },
              namespaceId: currentConnection.environmentRef?.namespaceId || '',
              namespaceName:
                value.namespace ||
                currentConnection.environmentRef?.namespaceName ||
                '',
              licenseId: currentConnection.environmentRef?.licenseId || '',
              licenseName: currentConnection.environmentRef?.licenseName || '',
            })
          }
        } catch (e) {
          console.warn('[useAtlasNotifications] Failed to parse feedback:', e)
        }
      }
    }

    // Fetch signals (pattern: ATLAS_.*)
    const signalResult = await callMCPDirect({
      connection: currentConnection,
      toolName: 'get_artifact',
      args: { key_pattern: 'ATLAS_.*' },
    })

    if (signalResult.ok && signalResult.result) {
      const data = signalResult.result as {
        artifacts?: Array<{ key: string; value?: string }>
        matches?: Array<{ key: string; value?: string }>
      }
      const artifacts = data.artifacts || data.matches || []

      for (const artifact of artifacts) {
        try {
          const value = artifact.value
            ? typeof artifact.value === 'string'
              ? JSON.parse(artifact.value)
              : artifact.value
            : null

          if (value) {
            allSignals.push({
              id: value.id || artifact.key,
              type: (value.type || 'insight') as SignalType,
              category: value.category || 'discovery',
              status: 'unread' as SignalStatus,
              priority: (value.priority || 'medium') as SignalPriority,
              title: value.title || 'Signal',
              content: value.content || '',
              createdAt: value.createdAt || new Date().toISOString(),
              updatedAt: value.updatedAt,
              author: value.author || {
                id: 'system',
                name: 'System',
                email: '',
                type: 'system',
              },
              source: value.source || {
                module: 'atlas',
                url: '',
                capturedAt: new Date().toISOString(),
                capturedVia: 'atlas-quick-agent',
              },
              namespaceId: currentConnection.environmentRef?.namespaceId || '',
              namespaceName:
                value.namespaceName ||
                currentConnection.environmentRef?.namespaceName ||
                '',
              licenseId: currentConnection.environmentRef?.licenseId || '',
              licenseName:
                value.licenseName ||
                currentConnection.environmentRef?.licenseName ||
                '',
            })
          }
        } catch (e) {
          console.warn('[useAtlasNotifications] Failed to parse signal:', e)
        }
      }
    }

    return allSignals
  }, [])

  // ========================================
  // APPLY READ STATE TO SIGNALS
  // ========================================

  const signalsWithReadState = useMemo((): AtlasSignal[] => {
    return signals.map(signal => {
      const isRead =
        readState.feedbacksRead.includes(signal.id) ||
        readState.signalsRead.includes(signal.id)

      return {
        ...signal,
        status: isRead ? ('read' as SignalStatus) : signal.status,
      }
    })
  }, [signals, readState])

  // Calculate statistics from signals
  const stats = useMemo((): AtlasSignalStats => {
    if (signalsWithReadState.length === 0) return defaultStats

    const byType: Record<SignalType, number> = {
      feedback: 0,
      insight: 0,
      message: 0,
    }

    const byStatus: Record<SignalStatus, number> = {
      unread: 0,
      read: 0,
      acknowledged: 0,
      in_progress: 0,
      resolved: 0,
      archived: 0,
    }

    const byPriority: Record<SignalPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }

    let unread = 0
    let critical = 0

    for (const signal of signalsWithReadState) {
      byType[signal.type]++
      byStatus[signal.status]++
      byPriority[signal.priority]++

      if (signal.status === 'unread') {
        unread++
      }

      if (signal.priority === 'critical' && signal.status !== 'resolved') {
        critical++
      }
    }

    return {
      total: signalsWithReadState.length,
      byType,
      byStatus,
      byPriority,
      unread,
      critical,
    }
  }, [signalsWithReadState])

  // Calculate totals
  const totalUnread = stats.unread
  const urgentCount =
    stats.byPriority.critical +
    stats.byPriority.high -
    signalsWithReadState.filter(
      s =>
        (s.priority === 'critical' || s.priority === 'high') &&
        s.status === 'resolved'
    ).length

  const byType = {
    feedbacks: stats.byType.feedback,
    insights: stats.byType.insight,
    messages: stats.byType.message,
  }

  // Get recent notifications
  const recent = useMemo((): AtlasNotification[] => {
    return signalsWithReadState
      .filter(s => s.status === 'unread' || s.status === 'read')
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        type: s.type,
        title: s.title,
        preview:
          s.content.substring(0, 100) + (s.content.length > 100 ? '...' : ''),
        priority: s.priority,
        createdAt: s.createdAt,
        isNew: s.status === 'unread',
      }))
  }, [signalsWithReadState])

  // ========================================
  // REFRESH
  // ========================================

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch read state and signals in parallel
      const [fetchedReadState, fetchedSignals] = await Promise.all([
        fetchReadState(),
        fetchSignals(),
      ])

      setReadState(fetchedReadState)
      setSignals(fetchedSignals)
      setIsConnected(true)
    } catch (err) {
      console.error('[Atlas Notifications] Failed to refresh:', err)
      setError(err instanceof Error ? err.message : 'Failed to load')
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }, [fetchReadState, fetchSignals])

  // ========================================
  // MARK AS READ
  // ========================================

  const markAsRead = useCallback(
    async (signalId: string) => {
      const signal = signals.find(s => s.id === signalId)
      if (!signal) return

      const newReadState = { ...readState }

      if (signal.type === 'feedback') {
        if (!newReadState.feedbacksRead.includes(signalId)) {
          newReadState.feedbacksRead = [...newReadState.feedbacksRead, signalId]
        }
      } else {
        if (!newReadState.signalsRead.includes(signalId)) {
          newReadState.signalsRead = [...newReadState.signalsRead, signalId]
        }
      }

      // Update local state immediately for responsiveness
      setSignals(prev =>
        prev.map(s =>
          s.id === signalId ? { ...s, status: 'read' as SignalStatus } : s
        )
      )

      // Persist to MCP
      await saveReadState(newReadState)
    },
    [signals, readState, saveReadState]
  )

  // ========================================
  // MARK ALL AS READ
  // ========================================

  const markAllAsRead = useCallback(async () => {
    const feedbackIds = signals
      .filter(s => s.type === 'feedback')
      .map(s => s.id)
    const signalIds = signals.filter(s => s.type !== 'feedback').map(s => s.id)

    const newReadState: UserReadState = {
      ...readState,
      feedbacksRead: [...new Set([...readState.feedbacksRead, ...feedbackIds])],
      signalsRead: [...new Set([...readState.signalsRead, ...signalIds])],
    }

    // Update local state immediately
    setSignals(prev =>
      prev.map(s => ({ ...s, status: 'read' as SignalStatus }))
    )

    // Persist to MCP
    await saveReadState(newReadState)
  }, [signals, readState, saveReadState])

  // ========================================
  // INITIAL LOAD & AUTO-REFRESH
  // ========================================

  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return

    const interval = setInterval(refresh, refreshInterval)
    return () => clearInterval(interval)
  }, [refresh, refreshInterval])

  // Subscribe to notification refresh events (from Quick Agent, etc.)
  useNotificationRefresh(refresh)

  return {
    totalUnread,
    urgentCount,
    byType,
    recent,
    stats,
    loading,
    error,
    isConnected,
    refresh,
    markAsRead,
    markAllAsRead,
  }
}

export default useAtlasNotifications
