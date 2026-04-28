/**
 * BFF Utility Agents Endpoint
 *
 * GET /api/bff/utility-agents
 *
 * Fetches utility agents from REST API (cockpit-portal-api) with:
 * - Server-side normalization
 * - Pre-filtered supervisors/standards
 * - Unified response format
 *
 * NOTE: Uses REST API instead of MCP because MCP server has timeout issues (>30s).
 * Can switch to MCP in future when server performance improves.
 *
 * Headers required:
 * - x-cockpit-api-key: User API key (used as Bearer token for REST API)
 * - x-cockpit-license-id: License UUID
 * - x-cockpit-namespace-id: Namespace UUID
 */
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

import { authOptions } from '@/auth'

import { normalizeUtilityAgentsList } from '../_lib/normalizers/utility-agent'
import type {
  BffUtilityAgentsResponse,
  McpUtilityAgentRaw,
} from '../_lib/types'

// ============================================================================
// REST API HELPERS
// ============================================================================

function getPortalApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL not configured')
  }
  return url
}

interface RestApiUtilityAgent {
  id: string
  name: string
  description?: string
  instruction?: string
  objective?: string
  model?: string
  temperature?: number
  type_name?: string
  type_id?: string
  is_mcp_enabled?: boolean
  is_approved?: boolean
  enabled?: boolean // Campo do Cockpit para habilitar/desabilitar agente
  approved?: boolean // Campo do Cockpit para aprovar agente
  agent_status?: string // Campo legado (deprecated)
  production_version_id?: string
  team?: Array<{
    team_member_id: string
    team_member_name: string
    team_member_type: string
  }>
  created_at?: string
  updated_at?: string
}

interface RestApiResponse {
  data?: { items: RestApiUtilityAgent[] }
  items?: RestApiUtilityAgent[]
}

/**
 * Call REST API to get utility agents
 */
async function fetchUtilityAgentsFromRestApi(options: {
  apiUrl: string
  accessToken: string
  namespaceId: string
  licenseId: string
  page: number
  pageSize: number
}): Promise<{
  success: boolean
  data?: McpUtilityAgentRaw[]
  error?: string
}> {
  const { apiUrl, accessToken, namespaceId, licenseId, page, pageSize } =
    options

  const url = `${apiUrl}/api/ArtifactUtilityAgent/GetAllUtilityAgents?namespaceId=${namespaceId}&page=${page}&pageSize=${pageSize}`

  console.log(`[BFF utility-agents] REST API URL: ${url}`)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        LicenseId: licenseId,
        NamespaceId: namespaceId,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error')
      console.error(
        `[BFF utility-agents] REST API error ${response.status}:`,
        errorBody.substring(0, 200)
      )
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorBody.substring(0, 100)}`,
      }
    }

    const result: RestApiResponse = await response.json()

    // Handle different response formats
    let agents: RestApiUtilityAgent[] = []
    if (result?.data?.items) {
      agents = result.data.items
    } else if (result?.items) {
      agents = result.items
    }

    // DEBUG: Log agent types from REST API
    console.log(
      `[BFF utility-agents] REST API returned ${agents.length} agents`
    )
    const typeStats = agents.reduce(
      (acc, agent) => {
        const typeName = agent.type_name || 'undefined'
        acc[typeName] = (acc[typeName] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    console.log(`[BFF utility-agents] Agent types from REST API:`, typeStats)

    // Log first few agents with their type_name for debugging
    if (agents.length > 0) {
      console.log(
        `[BFF utility-agents] Sample agents:`,
        agents.slice(0, 3).map(a => ({
          name: a.name,
          type_name: a.type_name,
          type_id: a.type_id,
        }))
      )
    }

    // Convert REST API format to MCP format for normalizer
    const mcpAgents: McpUtilityAgentRaw[] = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      instruction: agent.instruction,
      objective: agent.objective,
      model: agent.model,
      temperature: agent.temperature,
      type_name: agent.type_name,
      type_id: agent.type_id,
      is_mcp_enabled: agent.is_mcp_enabled,
      is_approved: agent.is_approved ?? agent.approved, // Suporte a ambos os formatos
      enabled: agent.enabled, // Campo do Cockpit para habilitar/desabilitar
      agent_status: agent.agent_status as 'Active' | 'Inactive' | undefined,
      production_version_id: agent.production_version_id,
      team: agent.team,
      created_at: agent.created_at,
      updated_at: agent.updated_at,
    }))

    return { success: true, data: mcpAgents }
  } catch (error) {
    console.error('[BFF utility-agents] REST API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// GET HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // 1. Validate session
  const session = await getServerSession(authOptions)

  // Allow bypass in development
  const disableAuth = process.env.DISABLE_AUTH === 'true'
  if (!session && !disableAuth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // 2. Extract headers
  const authHeader = request.headers.get('authorization')
  const licenseId = request.headers.get('x-cockpit-license-id')
  const namespaceId = request.headers.get('x-cockpit-namespace-id')

  // Extract Bearer token
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!accessToken || !licenseId || !namespaceId) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Missing required headers: Authorization (Bearer token), x-cockpit-license-id, x-cockpit-namespace-id',
      },
      { status: 400 }
    )
  }

  // 3. Extract query params
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = Math.min(
    parseInt(searchParams.get('pageSize') || '100', 10),
    100
  )
  const type = searchParams.get('type') as
    | 'supervisor'
    | 'standard'
    | 'all'
    | null

  // 4. Get REST API URL
  let apiUrl: string

  try {
    apiUrl = getPortalApiUrl()
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Portal API URL not configured',
      },
      { status: 500 }
    )
  }

  // 5. Call REST API
  console.log(
    `[BFF utility-agents] Fetching agents for namespace ${namespaceId}...`
  )

  const result = await fetchUtilityAgentsFromRestApi({
    apiUrl,
    accessToken, // JWT from Authorization header
    namespaceId,
    licenseId,
    page,
    pageSize,
  })

  if (!result.success || !result.data) {
    console.error('[BFF utility-agents] REST API call failed:', result.error)
    return NextResponse.json(
      {
        success: false,
        error: result.error || 'Failed to fetch utility agents',
      },
      { status: 502 }
    )
  }

  // 6. Normalize response (reuse same normalizer)
  const normalized = normalizeUtilityAgentsList({
    success: true,
    utility_agents: result.data,
    total_count: result.data.length,
  })

  // 7. Filter by type if requested
  let filteredAgents = normalized.agents
  if (type === 'supervisor') {
    filteredAgents = normalized.supervisors
  } else if (type === 'standard') {
    filteredAgents = normalized.standards
  }

  // 8. Build response
  const processingMs = Date.now() - startTime

  const response: BffUtilityAgentsResponse = {
    success: true,
    data: {
      agents: filteredAgents,
      supervisors: normalized.supervisors,
      standards: normalized.standards,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(normalized.totalCount / pageSize),
        totalItems: normalized.totalCount,
        hasMore: page * pageSize < normalized.totalCount,
      },
    },
    _meta: {
      cached: false,
      serverProcessingMs: processingMs,
    },
  }

  console.log(
    `[BFF utility-agents] Returned ${filteredAgents.length} agents (${normalized.supervisors.length} supervisors, ${normalized.standards.length} standards) in ${processingMs}ms`
  )

  return NextResponse.json(response)
}
