/**
 * Connection Manager Hook
 *
 * In-memory connection management. Connections are ephemeral (not persisted)
 * and stored in a module-level array. The hook provides reactive access via
 * a custom event pattern for cross-component synchronization.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'

import type { Connection } from '../types/connection'

// ============================================================================
// Module-level in-memory storage
// ============================================================================

let allConnections: Connection[] = []

/**
 * Get all connections from memory (non-reactive, for direct access)
 */
export function getAllConnectionsFromMemory(): Connection[] {
  return [...allConnections]
}

/**
 * Clear all connections from memory
 */
export function clearAllConnectionsFromMemory(): void {
  allConnections = []
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('connections-changed'))
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useConnectionManager() {
  const [connections, setConnections] = useState<Connection[]>([
    ...allConnections,
  ])
  const [mounted, setMounted] = useState(false)

  // Sync with module-level storage on mount and on change events
  useEffect(() => {
    setMounted(true)
    setConnections([...allConnections])

    const handleChange = () => {
      setConnections([...allConnections])
    }

    window.addEventListener('connections-changed', handleChange)
    return () => {
      window.removeEventListener('connections-changed', handleChange)
    }
  }, [])

  const addConnection = useCallback(async (connection: Connection) => {
    // Remove existing with same id
    allConnections = allConnections.filter(c => c.id !== connection.id)
    allConnections.push(connection)
    setConnections([...allConnections])
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connections-changed'))
    }
  }, [])

  const removeConnection = useCallback((connectionId: string) => {
    allConnections = allConnections.filter(c => c.id !== connectionId)
    setConnections([...allConnections])
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connections-changed'))
    }
  }, [])

  const updateConnection = useCallback(
    (connectionId: string, updates: Partial<Connection>) => {
      allConnections = allConnections.map(c =>
        c.id === connectionId ? { ...c, ...updates } : c
      )
      setConnections([...allConnections])
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('connections-changed'))
      }
    },
    []
  )

  const getConnection = useCallback((connectionId: string) => {
    return allConnections.find(c => c.id === connectionId) || null
  }, [])

  const testConnection = useCallback(async (_connection: Connection) => {
    // Placeholder - always succeeds for now
    return true
  }, [])

  const refreshConnections = useCallback(async () => {
    setConnections([...allConnections])
  }, [])

  return {
    connections,
    mounted,
    addConnection,
    removeConnection,
    updateConnection,
    getConnection,
    testConnection,
    refreshConnections,
  }
}
