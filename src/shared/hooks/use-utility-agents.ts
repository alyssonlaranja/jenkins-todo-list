'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useUserApiKey } from '@/shared/hooks/use-user-api-key'
import { usePermissionStore } from '@/shared/stores/permission-store'

/**
 * Normalized Utility Agent type (from BFF)
 */
export interface NormalizedUtilityAgent {
  id: string
  name: string
  description: string
  instruction: string
  objective: string
  model: string
  temperature: number
  typeName: 'Supervisor' | 'Standard'
  typeId: string
  isMcpEnabled: boolean
  isApproved: boolean
  isEnabled: boolean
  productionVersion: string | null
  team: Array<{
    id: string
    name: string
    type: 'Supervisor' | 'Standard'
  }>
  createdAt: string
  updatedAt: string
}

/**
 * BFF Response type
 */
interface BffUtilityAgentsResponse {
  success: boolean
  data: {
    agents: NormalizedUtilityAgent[]
    supervisors: NormalizedUtilityAgent[]
    standards: NormalizedUtilityAgent[]
    pagination: {
      page: number
      pageSize: number
      totalPages: number
      totalItems: number
      hasMore: boolean
    }
  }
  _meta: {
    cached: boolean
    cachedAt?: string
    serverProcessingMs: number
  }
  error?: string
}

interface UseUtilityAgentsOptions {
  /**
   * Page number (1-indexed)
   */
  page?: number
  /**
   * Page size (max 100)
   */
  pageSize?: number
  /**
   * Filter by agent type
   */
  type?: 'supervisor' | 'standard' | 'all'
  /**
   * Search query
   */
  search?: string
  /**
   * Disable auto-fetch (manual trigger only)
   */
  disabled?: boolean
}

interface UseUtilityAgentsReturn {
  /**
   * All agents (filtered by type if specified)
   */
  agents: NormalizedUtilityAgent[]
  /**
   * Pre-filtered supervisors
   */
  supervisors: NormalizedUtilityAgent[]
  /**
   * Pre-filtered standard agents
   */
  standards: NormalizedUtilityAgent[]
  /**
   * Loading state
   */
  isLoading: boolean
  /**
   * Error message
   */
  error: string | null
  /**
   * Pagination info
   */
  pagination: {
    page: number
    pageSize: number
    totalPages: number
    totalItems: number
    hasMore: boolean
  } | null
  /**
   * Manually trigger a fetch
   */
  refetch: () => Promise<void>
  /**
   * Find agent by name
   */
  findAgentByName: (name: string) => NormalizedUtilityAgent | undefined
  /**
   * Find the bootstrap agent ("MCP Portal Agent")
   */
  findBootstrapAgent: () => NormalizedUtilityAgent | undefined
}

/**
 * Hook to fetch utility agents via BFF endpoint
 *
 * Features:
 * - Server-side normalization
 * - Pre-filtered supervisors/standards
 * - Automatic refetch on namespace change
 * - Manual refetch capability
 *
 * @example
 * ```tsx
 * const { agents, supervisors, isLoading, error } = useUtilityAgents()
 *
 * // With options
 * const { agents } = useUtilityAgents({
 *   type: 'supervisor',
 *   pageSize: 50,
 * })
 *
 * // Find bootstrap agent
 * const { findBootstrapAgent } = useUtilityAgents()
 * const bootstrapAgent = findBootstrapAgent()
 * ```
 */
export function useUtilityAgents(
  options: UseUtilityAgentsOptions = {}
): UseUtilityAgentsReturn {
  const {
    page = 1,
    pageSize = 100,
    type = 'all',
    search,
    disabled = false,
  } = options

  const [agents, setAgents] = useState<NormalizedUtilityAgent[]>([])
  const [supervisors, setSupervisors] = useState<NormalizedUtilityAgent[]>([])
  const [standards, setStandards] = useState<NormalizedUtilityAgent[]>([])
  const [pagination, setPagination] =
    useState<UseUtilityAgentsReturn['pagination']>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get auth context
  const { apiKey } = useUserApiKey()
  const { activeLicenseId, activeNamespaceId } = usePermissionStore()

  // Track previous namespace to detect changes
  const previousNamespaceId = useRef<string | null>(null)

  // Fetch function
  const fetchAgents = useCallback(async () => {
    if (!apiKey || !activeLicenseId || !activeNamespaceId) {
      console.log('[useUtilityAgents] Skip: Missing auth context')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(type !== 'all' && { type }),
        ...(search && { search }),
      })

      const response = await fetch(`/api/bff/utility-agents?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-cockpit-api-key': apiKey,
          'x-cockpit-license-id': activeLicenseId,
          'x-cockpit-namespace-id': activeNamespaceId,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data: BffUtilityAgentsResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch utility agents')
      }

      setAgents(data.data.agents)
      setSupervisors(data.data.supervisors)
      setStandards(data.data.standards)
      setPagination(data.data.pagination)

      console.log(
        `[useUtilityAgents] Fetched ${data.data.agents.length} agents (${data.data.supervisors.length} supervisors, ${data.data.standards.length} standards) in ${data._meta.serverProcessingMs}ms`
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('[useUtilityAgents] Error:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [apiKey, activeLicenseId, activeNamespaceId, page, pageSize, type, search])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (disabled) {
      console.log('[useUtilityAgents] Skip: Disabled')
      return
    }

    // Reset on namespace change
    if (
      previousNamespaceId.current !== null &&
      previousNamespaceId.current !== activeNamespaceId
    ) {
      console.log('[useUtilityAgents] Namespace changed, resetting...')
      setAgents([])
      setSupervisors([])
      setStandards([])
      setPagination(null)
      setError(null)
    }
    previousNamespaceId.current = activeNamespaceId

    fetchAgents()
  }, [disabled, fetchAgents, activeNamespaceId])

  // Helper: Find agent by name
  const findAgentByName = useCallback(
    (name: string): NormalizedUtilityAgent | undefined => {
      return agents.find(
        agent => agent.name.toLowerCase() === name.toLowerCase()
      )
    },
    [agents]
  )

  // Helper: Find bootstrap agent
  const findBootstrapAgent = useCallback(():
    | NormalizedUtilityAgent
    | undefined => {
    return findAgentByName('MCP Portal Agent')
  }, [findAgentByName])

  return {
    agents,
    supervisors,
    standards,
    isLoading,
    error,
    pagination,
    refetch: fetchAgents,
    findAgentByName,
    findBootstrapAgent,
  }
}

/**
 * Fetch utility agents directly (non-hook version for use in effects)
 *
 * @example
 * ```tsx
 * const agents = await fetchUtilityAgents({
 *   accessToken: 'jwt-token-from-azure-ad',
 *   apiKey: 'cockpit-api-key',
 *   licenseId: 'xxx',
 *   namespaceId: 'xxx',
 * })
 * ```
 */
export async function fetchUtilityAgents(options: {
  accessToken: string // JWT from Azure AD (for REST API auth)
  apiKey: string // Cockpit API key (for MCP headers)
  licenseId: string
  namespaceId: string
  page?: number
  pageSize?: number
  type?: 'supervisor' | 'standard' | 'all'
  search?: string
}): Promise<BffUtilityAgentsResponse> {
  const {
    accessToken,
    apiKey,
    licenseId,
    namespaceId,
    page = 1,
    pageSize = 100,
    type = 'all',
    search,
  } = options

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(type !== 'all' && { type }),
    ...(search && { search }),
  })

  const response = await fetch(`/api/bff/utility-agents?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`, // JWT for REST API auth
      'x-cockpit-api-key': apiKey, // Cockpit API key for MCP headers
      'x-cockpit-license-id': licenseId,
      'x-cockpit-namespace-id': namespaceId,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }

  return response.json()
}
