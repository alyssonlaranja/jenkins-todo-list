'use client'

import { useState } from 'react'

import type { Connection } from '@/features/connections/types/connection'
import type { UtilityAgent } from '@/shared/lib/cockpit/types'

/**
 * Hook to ensure bootstrap utility agent via MCP Utility Agents
 *
 * NEW APPROACH: Uses MCP Utility Agents instead of direct API calls
 *
 * Strategy:
 * 1. Use MCP connection to list existing utility agents
 * 2. Search for "MCP Portal Agent" by name
 * 3. If not found, get agent types and create bootstrap agent
 * 4. Return agent for use in Custom Environments
 *
 * Use case: Required for Custom Environments (MCP Legacy needs x-cockpit-utility-agent-id)
 *
 * @param connection - MCP connection to Utility Agents server
 * @param callTool - Function to call MCP tools
 * @returns { ensureAgent, isLoading, error }
 *
 * @example
 * ```typescript
 * const { callTool } = useProxyMCP({ connection: sessionConnection })
 * const { ensureAgent } = useBootstrapAgentMCP(sessionConnection, callTool)
 *
 * const agent = await ensureAgent()
 * console.log('Bootstrap agent ID:', agent.id)
 * ```
 */
export function useBootstrapAgentMCP(
  connection: Connection | null,
  callTool: (
    name: string,
    params: any,
    headers?: Record<string, string>
  ) => Promise<any>
) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Ensures bootstrap agent exists using MCP Utility Agents
   *
   * Flow:
   * 1. List all utility agents via MCP
   * 2. Search for "MCP Portal Agent"
   * 3. If found, return it
   * 4. If not found, list agent types to get Standard type ID
   * 5. Create "MCP Portal Agent" with Standard type
   * 6. Return newly created agent
   *
   * @throws Error if connection is missing or MCP call fails
   * @returns Promise<UtilityAgent> - Guaranteed utility agent
   */
  const ensureAgent = async (): Promise<UtilityAgent> => {
    if (!connection) {
      const error = new Error(
        'MCP connection is required to ensure utility agent'
      )
      setError(error)
      throw error
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[useBootstrapAgentMCP] Starting bootstrap agent check...')

      // Step 1: List existing utility agents (MCP v2.0 cursor pagination)
      console.log('[useBootstrapAgentMCP] Listing utility agents via MCP...')
      const listResult = await callTool('list_utility_agents', {
        cursor: undefined, // Start from beginning
        page_size: 100,
      })

      // Parse response (MCP v2.0 standardized format)
      let agents: UtilityAgent[] = []
      if (listResult.content?.[0]?.text) {
        const parsed = JSON.parse(listResult.content[0].text)
        // MCP v2.0: always uses 'success', never 'succeeded'
        if (parsed.success && parsed.data?.data) {
          agents = parsed.data.data
        }
      } else if (listResult.data?.data) {
        agents = listResult.data.data
      } else if (listResult.data) {
        agents = Array.isArray(listResult.data) ? listResult.data : []
      }

      console.log(
        `[useBootstrapAgentMCP] Found ${agents.length} utility agents`
      )

      // Step 2: Search for "MCP Portal Agent"
      const bootstrapAgent = agents.find(
        (agent: UtilityAgent) => agent.name === 'MCP Portal Agent'
      )

      if (bootstrapAgent) {
        console.log('[useBootstrapAgentMCP] Bootstrap agent already exists:', {
          id: bootstrapAgent.id,
          name: bootstrapAgent.name,
        })
        return bootstrapAgent
      }

      console.log(
        '[useBootstrapAgentMCP] Bootstrap agent not found, creating...'
      )

      // Step 3: Get agent types (MCP v2.0 - no longer need type_id)
      console.log(
        '[useBootstrapAgentMCP] Using MCP v2.0 - type is direct string, not type_id'
      )

      // Step 4: Create bootstrap agent via MCP v2.0
      // IMPORTANT: Must be Supervisor type to use utility-agent-id in headers
      console.log(
        '[useBootstrapAgentMCP] Creating bootstrap agent (Supervisor)...'
      )
      const createResult = await callTool('create_utility_agent', {
        name: 'MCP Portal Agent',
        description:
          'Auto-created utility agent for MCP Portal artifact management',
        type: 'supervisor', // MCP v2.0: use direct type string, not type_id
        instruction: 'Default agent for MCP Portal operations',
        objective: 'Manage artifacts and configurations for MCP Portal',
        model: 'azure-gpt-4o',
        temperature: 0.7, // MCP v2.0: temperature is optional param
        agent_status: 'Active', // MCP v2.0: use agent_status instead of is_mcp_enabled
      })

      // Parse create response
      let createdAgent: UtilityAgent | null = null
      if (createResult.content?.[0]?.text) {
        const parsed = JSON.parse(createResult.content[0].text)
        createdAgent = parsed.data
      } else if (createResult.data) {
        createdAgent = createResult.data
      }

      if (!createdAgent || !createdAgent.id) {
        throw new Error('Failed to create bootstrap agent: Invalid response')
      }

      console.log('[useBootstrapAgentMCP] Bootstrap agent created:', {
        id: createdAgent.id,
        name: createdAgent.name,
      })

      return createdAgent
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Failed to ensure utility agent exists')

      console.error('[useBootstrapAgentMCP] Error:', error)
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    /**
     * Ensures utility agent exists and returns it
     * Safe to call multiple times (idempotent)
     */
    ensureAgent,

    /**
     * Loading state during agent check/creation
     */
    isLoading,

    /**
     * Error if agent check/creation failed
     */
    error,
  }
}
