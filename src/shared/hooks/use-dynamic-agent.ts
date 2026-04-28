/**
 * useDynamicAgent - Fetch Agent Configuration Dynamically
 *
 * Hook that fetches agent configuration from the Cockpit Platform
 * using MCP tools (search_utility_agents + inspect_agent).
 *
 * Features:
 * - Fetches agent by exact name match
 * - Resolves artifact placeholders ${KEY} → value
 * - Parses YAML front matter configuration
 * - Supports fallback config if agent not found
 * - Optional auto-refresh interval
 *
 * @see DYNAMIC_AGENTS_MODULE_PROPOSAL.md
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getAllConnectionsFromMemory,
  useConnectionManager,
} from '@/features/connections/hooks/use-connection-manager'
import {
  getUtilityAgentsServer,
  type Connection,
} from '@/features/connections/types/connection'

import type {
  ArtifactsCatalog,
  DynamicAgentConfig,
  UseDynamicAgentOptions,
  UseDynamicAgentReturn,
} from '../lib/dynamic-agents/types'
import {
  parseFrontMatter,
  parseMCPResponse,
  resolveArtifacts,
} from '../lib/dynamic-agents/utils'

/**
 * useDynamicAgent - Fetch Agent Configuration Dynamically
 *
 * Hook that fetches agent configuration from the Cockpit Platform
 * using MCP tools (search_utility_agents + inspect_agent).
 *
 * Features:
 * - Fetches agent by exact name match
 * - Resolves artifact placeholders ${KEY} → value
 * - Parses YAML front matter configuration
 * - Supports fallback config if agent not found
 * - Optional auto-refresh interval
 *
 * @see DYNAMIC_AGENTS_MODULE_PROPOSAL.md
 */

// ============================================================================
// EXTENDED OPTIONS (with optional connection override)
// ============================================================================

export interface UseDynamicAgentOptionsWithConnection extends UseDynamicAgentOptions {
  /**
   * Optional connection override. If not provided, uses session connection.
   */
  connection?: Connection | null
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useDynamicAgent({
  agentName,
  connection: connectionOverride,
  fallbackConfig,
  autoCreate = false,
  defaultConfig,
  refreshInterval = 0,
  resolveArtifacts: shouldResolve = true,
}: UseDynamicAgentOptionsWithConnection): UseDynamicAgentReturn {
  // State
  const [agentConfig, setAgentConfig] = useState<DynamicAgentConfig | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUsingFallback, setIsUsingFallback] = useState(false)

  // Get session connection from connection manager
  const { connections, mounted } = useConnectionManager()
  const sessionConnection =
    connectionOverride ||
    connections.find(c => c.id === 'session-connection') ||
    getAllConnectionsFromMemory().find(c => c.id === 'session-connection')

  // Check if utility agents server is configured
  const utilityAgentsServer = sessionConnection
    ? getUtilityAgentsServer(sessionConnection)
    : null
  const isReady = mounted && sessionConnection && utilityAgentsServer

  // Refs for state management
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)

  /**
   * Call MCP tool via orchestrator
   */
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

  /**
   * Search for agent by exact name match
   */
  const searchAgentByName = useCallback(
    async (name: string): Promise<{ id?: string }> => {
      const result = await callMCP('search_utility_agents', {
        name_pattern: `^${name}$`, // Exact match regex
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

  /**
   * Inspect agent to get complete blueprint
   */
  const inspectAgent = useCallback(
    async (agentId: string) => {
      const result = await callMCP('inspect_agent', {
        utility_agent_id: agentId,
        artifacts_catalog_scope: 'full', // Include ALL artifacts
        include_versions_details: false, // Skip version history
        include_versions_team_details: false, // Skip team enrichment
      })

      return parseMCPResponse<{
        success: boolean
        agent: Record<string, unknown>
        artifacts_catalog: ArtifactsCatalog
        summary: Record<string, unknown>
      }>(result)
    },
    [callMCP]
  )

  /**
   * Load agent configuration from platform
   */
  const loadAgent = useCallback(
    async (force = false) => {
      // Prevent concurrent calls and duplicate loads
      if (isLoadingRef.current) {
        return
      }

      // Skip if already loaded (unless forced refresh)
      if (hasLoadedRef.current && !force) {
        return
      }

      // Wait for session connection and utility agents server to be ready
      if (!isReady) {
        return
      }

      isLoadingRef.current = true
      setIsLoading(true)
      setError(null)

      try {
        // 1. Search for agent by name
        const searchResult = await searchAgentByName(agentName)

        if (!searchResult.id) {
          // Agent not found
          if (autoCreate && defaultConfig) {
            // TODO: Implement auto-creation with useEnsureAgent
            throw new Error(
              `Agent "${agentName}" not found. Auto-create not yet implemented.`
            )
          }

          if (fallbackConfig) {
            // Use fallback config
            setAgentConfig({
              id: 'fallback',
              name: fallbackConfig.name,
              type: fallbackConfig.type || 'supervisor',
              instruction: fallbackConfig.instruction,
              rawInstruction: fallbackConfig.instruction,
              description: fallbackConfig.description,
              objective: fallbackConfig.objective,
              model: {
                configured: fallbackConfig.model,
                fallback: 'azure-gpt-4o',
                effective: fallbackConfig.model || 'azure-gpt-4o',
                source: 'default',
              },
              frontMatter: {},
              hasFrontMatter: false,
              artifacts: [],
              artifactsCatalog: {},
              artifactsCount: 0,
              mcpConnections: [],
              mcpConnectionsCount: 0,
              team: [],
              teamMembersCount: 0,
              versions: { production: '1', total: 1, latest: '1' },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            setIsUsingFallback(true)
            hasLoadedRef.current = true
            return
          }

          throw new Error(`Agent "${agentName}" not found`)
        }

        // 2. Inspect agent to get complete blueprint
        const blueprint = await inspectAgent(searchResult.id)
        const agent = blueprint.agent as Record<string, unknown>
        const catalog = blueprint.artifacts_catalog

        // 3. Resolve artifacts in instruction
        const rawInstruction = (agent.instruction as string) || ''
        const resolvedInstruction = shouldResolve
          ? resolveArtifacts(rawInstruction, catalog)
          : rawInstruction

        // 4. Parse front matter
        const { frontMatter, content, hasFrontMatter } =
          parseFrontMatter(resolvedInstruction)

        // 5. Extract model configuration
        const modelConfig = agent.model as Record<string, unknown> | undefined
        const model = {
          configured: modelConfig?.configured as string | undefined,
          fallback: (modelConfig?.fallback as string) || 'azure-gpt-4o',
          effective: (modelConfig?.effective as string) || 'azure-gpt-4o',
          source:
            (modelConfig?.source as
              | 'front_matter'
              | 'agent_field'
              | 'default') || 'default',
        }

        // 6. Build final config
        const config: DynamicAgentConfig = {
          id: agent.id as string,
          name: agent.name as string,
          type: (agent.type as 'standard' | 'supervisor') || 'supervisor',
          instruction: content,
          rawInstruction,
          description: (agent.description as string) || '',
          objective: (agent.objective as string) || '',
          model,
          frontMatter,
          hasFrontMatter,
          frontMatterDetails:
            agent.front_matter_details as DynamicAgentConfig['frontMatterDetails'],
          artifacts: (agent.artifacts as DynamicAgentConfig['artifacts']) || [],
          artifactsCatalog: catalog,
          artifactsCount: (agent.artifacts_count as number) || 0,
          mcpConnections:
            (agent.mcp_connections as DynamicAgentConfig['mcpConnections']) ||
            [],
          mcpConnectionsCount: (agent.mcp_connections_count as number) || 0,
          team: (agent.team as DynamicAgentConfig['team']) || [],
          teamMembersCount: (agent.team_members_count as number) || 0,
          versions: {
            production:
              ((agent.versions as Record<string, unknown>)
                ?.production as string) || '1',
            total:
              ((agent.versions as Record<string, unknown>)?.total as number) ||
              1,
            latest:
              ((agent.versions as Record<string, unknown>)?.latest as string) ||
              '1',
          },
          createdAt: (agent.created_at as string) || new Date().toISOString(),
          updatedAt: (agent.updated_at as string) || new Date().toISOString(),
        }

        setAgentConfig(config)
        setIsUsingFallback(false)
        hasLoadedRef.current = true
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to load agent'
        setError(errorMsg)

        // Try fallback on error
        if (fallbackConfig) {
          setAgentConfig({
            id: 'fallback',
            name: fallbackConfig.name,
            type: fallbackConfig.type || 'supervisor',
            instruction: fallbackConfig.instruction,
            rawInstruction: fallbackConfig.instruction,
            description: fallbackConfig.description,
            objective: fallbackConfig.objective,
            model: {
              configured: fallbackConfig.model,
              fallback: 'azure-gpt-4o',
              effective: fallbackConfig.model || 'azure-gpt-4o',
              source: 'default',
            },
            frontMatter: {},
            hasFrontMatter: false,
            artifacts: [],
            artifactsCatalog: {},
            artifactsCount: 0,
            mcpConnections: [],
            mcpConnectionsCount: 0,
            team: [],
            teamMembersCount: 0,
            versions: { production: '1', total: 1, latest: '1' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          setIsUsingFallback(true)
          hasLoadedRef.current = true
        }
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    },
    [
      agentName,
      isReady,
      searchAgentByName,
      inspectAgent,
      shouldResolve,
      autoCreate,
      defaultConfig,
      fallbackConfig,
    ]
  )

  /**
   * Refresh agent config manually (forces reload)
   */
  const refresh = useCallback(async () => {
    await loadAgent(true) // force = true
  }, [loadAgent])

  // Initial load
  useEffect(() => {
    loadAgent()
  }, [loadAgent])

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        loadAgent(true) // force = true for interval refresh
      }, refreshInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [refreshInterval, loadAgent])

  return {
    agentConfig,
    isLoading,
    error,
    refresh,
    isUsingFallback,
  }
}
