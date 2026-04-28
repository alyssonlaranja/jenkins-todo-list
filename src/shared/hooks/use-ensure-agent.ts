/**
 * useEnsureAgent - Ensure Agent Exists on Platform
 *
 * Hook that ensures a utility agent exists on the Cockpit Platform.
 * If the agent doesn't exist, it will be created with the provided defaults.
 *
 * Features:
 * - Searches for agent by exact name match
 * - Creates agent if not found (with Supervisor type)
 * - Dynamically fetches type_id via list_agent_types
 * - Retry with exponential backoff for DB propagation
 *
 * @see DYNAMIC_AGENTS_MODULE_PROPOSAL.md - Apêndice A.3
 */

'use client'

import { useCallback, useState } from 'react'

import {
  getAllConnectionsFromMemory,
  useConnectionManager,
} from '@/features/connections/hooks/use-connection-manager'
import {
  getUtilityAgentsServer,
  type Connection,
} from '@/features/connections/types/connection'

import type {
  AgentTypeInfo,
  DefaultAgentConfig,
  UseEnsureAgentOptions,
  UseEnsureAgentReturn,
} from '../lib/dynamic-agents/types'
import { delay, parseMCPResponse } from '../lib/dynamic-agents/utils'

/**
 * useEnsureAgent - Ensure Agent Exists on Platform
 *
 * Hook that ensures a utility agent exists on the Cockpit Platform.
 * If the agent doesn't exist, it will be created with the provided defaults.
 *
 * Features:
 * - Searches for agent by exact name match
 * - Creates agent if not found (with Supervisor type)
 * - Dynamically fetches type_id via list_agent_types
 * - Retry with exponential backoff for DB propagation
 *
 * @see DYNAMIC_AGENTS_MODULE_PROPOSAL.md - Apêndice A.3
 */

export interface UseEnsureAgentOptionsWithConnection extends UseEnsureAgentOptions {
  defaultConfig: DefaultAgentConfig
  connection?: Connection | null
}

export function useEnsureAgent({
  defaultConfig,
  connection: connectionOverride,
  maxRetries = 5,
  initialDelayMs = 500,
}: UseEnsureAgentOptionsWithConnection): UseEnsureAgentReturn {
  const [isEnsuring, setIsEnsuring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { connections } = useConnectionManager()
  const sessionConnection =
    connectionOverride ||
    connections.find(c => c.id === 'session-connection') ||
    getAllConnectionsFromMemory().find(c => c.id === 'session-connection')

  const callMCP = useCallback(
    async (toolName: string, args: Record<string, unknown>) => {
      if (!sessionConnection) {
        throw new Error('Session connection not available')
      }

      const server = getUtilityAgentsServer(sessionConnection)
      if (!server) {
        throw new Error('Utility Agents server not configured')
      }

      const response = await fetch('/api/mcp-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespace: sessionConnection.id,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
          headers: server.headers,
          mcpServerUrl: server.url,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    },
    [sessionConnection]
  )

  const searchAgentByName = useCallback(
    async (name: string): Promise<{ id?: string }> => {
      const result = await callMCP('search_utility_agents', {
        name_pattern: `^${name}$`,
        search_type: 'name',
        page: 1,
        page_size: 1,
      })

      const parsed = parseMCPResponse<{
        success: boolean
        utility_agents?: Array<{ id: string }>
      }>(result)

      if (parsed.utility_agents && parsed.utility_agents.length > 0) {
        return { id: parsed.utility_agents[0]!.id }
      }

      return {}
    },
    [callMCP]
  )

  const searchWithRetry = useCallback(
    async (name: string): Promise<{ id?: string }> => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) {
          const delayMs = initialDelayMs * Math.pow(2, attempt - 1)
          await delay(delayMs)
        }

        const result = await searchAgentByName(name)

        if (result.id) {
          return result
        }
      }

      return {}
    },
    [maxRetries, initialDelayMs, searchAgentByName]
  )

  const getAgentTypeId = useCallback(
    async (typeName: string): Promise<{ typeId?: string; error?: string }> => {
      const result = await callMCP('list_agent_types', {})

      const parsed = parseMCPResponse<{
        success: boolean
        agent_types?: AgentTypeInfo[]
      }>(result)

      if (parsed.agent_types) {
        const agentType = parsed.agent_types.find(
          t => t.name.toLowerCase() === typeName.toLowerCase()
        )
        if (agentType) {
          return { typeId: agentType.id }
        }
      }

      return { error: `Agent type "${typeName}" not found` }
    },
    [callMCP]
  )

  const ensureAgent = useCallback(async (): Promise<{
    id: string
    created: boolean
  }> => {
    if (!sessionConnection) {
      throw new Error('Session connection not available')
    }

    setIsEnsuring(true)
    setError(null)

    try {
      const existing = await searchAgentByName(defaultConfig.name)

      if (existing.id) {
        return { id: existing.id, created: false }
      }

      const typeName = defaultConfig.type || 'Supervisor'
      const typeResult = await getAgentTypeId(typeName)

      if (!typeResult.typeId) {
        throw new Error(typeResult.error || 'Failed to get agent type ID')
      }

      await callMCP('create_utility_agent', {
        name: defaultConfig.name,
        description: defaultConfig.description,
        instruction: defaultConfig.instruction,
        objective: defaultConfig.objective,
        type_id: typeResult.typeId,
        model: defaultConfig.model || 'azure-gpt-4o',
        is_mcp_enabled: defaultConfig.isMcpEnabled ?? false,
      })

      const created = await searchWithRetry(defaultConfig.name)

      if (!created.id) {
        throw new Error(
          `Agent "${defaultConfig.name}" was created but could not be found after ${maxRetries} retries`
        )
      }

      return { id: created.id, created: true }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to ensure agent'
      setError(errorMsg)
      throw err
    } finally {
      setIsEnsuring(false)
    }
  }, [
    sessionConnection,
    defaultConfig,
    maxRetries,
    searchAgentByName,
    searchWithRetry,
    getAgentTypeId,
    callMCP,
  ])

  return {
    ensureAgent,
    isEnsuring,
    error,
  }
}
