import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

import { authOptions } from '@/auth'

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
} as const
// ============================================================================
// MIGRATION ENRICHMENT HELPERS
// These functions enrich responses from create operations that don't return IDs
// ============================================================================
/**
 * Helper to make MCP tool calls
 */
async function callMcpTool(
  mcpServerUrl: string,
  headers: Record<string, string>,
  toolName: string,
  toolArguments: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch(mcpServerUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: toolArguments,
        },
      }),
    })
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }
    const result = await response.json()
    if (result.error) {
      return { success: false, error: result.error.message || 'MCP error' }
    }
    if (result.result?.content?.[0]?.text) {
      const parsed = JSON.parse(result.result.content[0].text)
      return { success: true, data: parsed }
    }
    return { success: false, error: 'No content in response' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
/**
 * Enrich create_utility_agent response with the created agent's ID
 * Uses search_utility_agents to find the agent by exact name match
 */
async function enrichCreateUtilityAgentResponse(
  mcpServerUrl: string,
  headers: Record<string, string>,
  agentName: string,
  originalResponse: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Wait for DB consistency
  await new Promise(resolve => setTimeout(resolve, 300))
  console.log(
    `[MCP Enrichment] Searching for created agent "${agentName}" to get ID...`
  )
  const searchResult = await callMcpTool(
    mcpServerUrl,
    headers,
    'search_utility_agents',
    {
      search_type: 'name',
      name_pattern: `^${escapeRegex(agentName)}$`,
      page_size: 1,
    }
  )
  if (
    searchResult.success &&
    searchResult.data &&
    typeof searchResult.data === 'object'
  ) {
    const data = searchResult.data as Record<string, unknown>
    const agents = data.utility_agents as Array<{ id: string }> | undefined
    if (agents && agents.length > 0 && agents[0] && agents[0].id) {
      console.log(`[MCP Enrichment] ✅ Found agent ID: ${agents[0].id}`)
      // Enrich the original response with the ID
      return {
        ...originalResponse,
        data: {
          ...(typeof originalResponse.data === 'object'
            ? originalResponse.data
            : {}),
          id: agents[0].id,
        },
        _enriched: true,
        _enrichment_source: 'search_utility_agents',
      }
    }
  }
  console.warn(
    `[MCP Enrichment] ⚠️ Could not find agent "${agentName}" after creation`
  )
  return originalResponse
}
/**
 * Enrich create_artifact response with the created artifact's ID
 * Uses get_artifact to find the artifact by exact key match
 */
async function enrichCreateArtifactResponse(
  mcpServerUrl: string,
  headers: Record<string, string>,
  artifactKey: string,
  originalResponse: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Wait for DB consistency
  await new Promise(resolve => setTimeout(resolve, 300))
  console.log(
    `[MCP Enrichment] Searching for created artifact "${artifactKey}" to get ID...`
  )
  const searchResult = await callMcpTool(
    mcpServerUrl,
    headers,
    'get_artifact',
    {
      key_pattern: `^${escapeRegex(artifactKey)}$`,
    }
  )
  if (
    searchResult.success &&
    searchResult.data &&
    typeof searchResult.data === 'object'
  ) {
    const data = searchResult.data as Record<string, unknown>
    const artifacts = data.artifacts as
      | Array<{ id: string; artifact_id?: string }>
      | undefined
    if (artifacts && artifacts.length > 0 && artifacts[0]) {
      const artifactId = artifacts[0].artifact_id || artifacts[0].id
      if (artifactId) {
        console.log(`[MCP Enrichment] ✅ Found artifact ID: ${artifactId}`)
        return {
          ...originalResponse,
          data: {
            ...(typeof originalResponse.data === 'object'
              ? originalResponse.data
              : {}),
            id: artifactId,
            artifact_id: artifactId,
          },
          _enriched: true,
          _enrichment_source: 'get_artifact',
        }
      }
    }
  }
  console.warn(
    `[MCP Enrichment] ⚠️ Could not find artifact "${artifactKey}" after creation`
  )
  return originalResponse
}
/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
// ============================================================================
// PAYLOAD OPTIMIZATION
// Reduce response size for list operations to improve browser performance
// ============================================================================
/**
 * Optimize utility agent for listing (remove heavy fields)
 * Reduces ~27KB per agent to ~2KB per agent
 */
function optimizeUtilityAgentForList(
  agent: Record<string, unknown>
): Record<string, unknown> {
  // Extract agentTeam from versions[0].value as fallback (if agentTeam not present)
  let agentTeam = agent.agentTeam || agent.team || []
  const versions = agent.versions as Array<Record<string, unknown>> | undefined
  if (
    (!agentTeam || (Array.isArray(agentTeam) && agentTeam.length === 0)) &&
    versions &&
    versions.length > 0
  ) {
    try {
      const firstVersion = versions[0]
      const value = firstVersion?.value as string
      if (value) {
        const valueData = JSON.parse(value) as Record<string, unknown>
        if (valueData.agentTeam && Array.isArray(valueData.agentTeam)) {
          agentTeam = valueData.agentTeam
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }
  // Return only essential fields (removes versions.value which is ~15KB per agent)
  return {
    id: agent.id,
    name: agent.name,
    type_id: agent.type_id,
    type_agent: agent.type_agent
      ? {
          id: (agent.type_agent as Record<string, unknown>).id,
          name: (agent.type_agent as Record<string, unknown>).name,
        }
      : undefined,
    description: agent.description, // Already truncated by MCP server
    instruction: agent.instruction, // Already truncated by MCP server
    objective: agent.objective, // Already truncated by MCP server
    model: agent.model,
    is_mcp_enabled: agent.is_mcp_enabled,
    approved: agent.approved,
    enabled: agent.enabled,
    created_at: agent.created_at,
    updated_at: agent.updated_at,
    productionVersion: agent.productionVersion,
    // Include extracted team data
    agentTeam: agentTeam,
    team: agentTeam,
    // Metadata (keep truncation status)
    _instruction_status: agent._instruction_status,
    _description_status: agent._description_status,
    _objective_status: agent._objective_status,
    _hint: agent._hint,
    // Exclude: versions (the biggest culprit - ~15KB each!)
  }
}
/**
 * Optimize list_utility_agents response to reduce payload size
 */
function optimizeListUtilityAgentsResponse(
  parsed: Record<string, unknown>
): Record<string, unknown> {
  const agents = parsed.utility_agents as
    | Array<Record<string, unknown>>
    | undefined
  if (!agents || !Array.isArray(agents)) {
    return parsed
  }
  const originalSize = JSON.stringify(parsed).length
  const optimizedAgents = agents.map(optimizeUtilityAgentForList)
  const optimizedParsed = {
    ...parsed,
    utility_agents: optimizedAgents,
    _optimized: true,
    _original_size_bytes: originalSize,
  }
  const optimizedSize = JSON.stringify(optimizedParsed).length
  console.log(
    `[MCP Orchestrator] Optimized list_utility_agents: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (${((1 - optimizedSize / originalSize) * 100).toFixed(0)}% reduction)`
  )
  return optimizedParsed
}
/**
 * Optimize artifact for listing (remove heavy fields like versions)
 * Reduces payload by removing versions array and keeping only essential fields
 */
function optimizeArtifactForList(
  artifact: Record<string, unknown>
): Record<string, unknown> {
  // Return only essential fields needed for UI display
  return {
    id: artifact.id,
    key: artifact.key,
    value: artifact.value, // Already truncated by MCP server (preview_size=200)
    description: artifact.description,
    type: artifact.type,
    accessibility: artifact.accessibility,
    secret: artifact.secret,
    created_at: artifact.created_at || artifact.createdAt,
    updated_at: artifact.updated_at || artifact.updatedAt,
    productionVersionId: artifact.productionVersionId,
    // Metadata (keep truncation status)
    _value_size_bytes: artifact._value_size_bytes,
    _value_status: artifact._value_status,
    _hint: artifact._hint,
    // Exclude: versions (can be large, not needed for listing)
  }
}
/**
 * Optimize list_artifacts response to reduce payload size
 */
function optimizeListArtifactsResponse(
  parsed: Record<string, unknown>
): Record<string, unknown> {
  const artifacts = parsed.artifacts as
    | Array<Record<string, unknown>>
    | undefined
  // Also check for data.artifacts (some responses wrap in data)
  const dataArtifacts = (parsed.data as Record<string, unknown>)?.artifacts as
    | Array<Record<string, unknown>>
    | undefined
  const items = artifacts || dataArtifacts
  if (!items || !Array.isArray(items)) {
    return parsed
  }
  const originalSize = JSON.stringify(parsed).length
  const optimizedArtifacts = items.map(optimizeArtifactForList)
  // Rebuild response preserving structure
  let optimizedParsed: Record<string, unknown>
  if (artifacts) {
    optimizedParsed = {
      ...parsed,
      artifacts: optimizedArtifacts,
      _optimized: true,
      _original_size_bytes: originalSize,
    }
  } else {
    // data.artifacts case
    optimizedParsed = {
      ...parsed,
      data: {
        ...(parsed.data as Record<string, unknown>),
        artifacts: optimizedArtifacts,
      },
      _optimized: true,
      _original_size_bytes: originalSize,
    }
  }
  const optimizedSize = JSON.stringify(optimizedParsed).length
  const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(0)
  // Only log if there was significant reduction
  if (originalSize > 10000) {
    console.log(
      `[MCP Orchestrator] Optimized list_artifacts: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (${reduction}% reduction)`
    )
  }
  return optimizedParsed
}
/**
 * Check if a response needs enrichment (success but no ID)
 */
function needsEnrichment(parsed: Record<string, unknown>): boolean {
  if (!parsed.success) return false
  // Check if ID is missing
  const data = parsed.data as Record<string, unknown> | undefined
  const dataData = data?.data as Record<string, unknown> | undefined
  const hasId =
    parsed.id ||
    data?.id ||
    dataData?.id ||
    parsed.artifact_id ||
    data?.artifact_id
  return !hasId
}
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const timings: Record<string, number> = {}
  try {
    // AUTHENTICATION: Validate session
    const authStart = Date.now()
    const session = await getServerSession(authOptions)
    timings.auth = Date.now() - authStart
    // Allow bypass in development mode only
    const isDevelopment = process.env.NODE_ENV === 'development'
    const disableAuth = process.env.DISABLE_AUTH === 'true'
    if (!session && !(isDevelopment && disableAuth)) {
      console.warn('MCP Orchestrator: Unauthorized access attempt')
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please sign in.',
        },
        { status: 401 }
      )
    }
    // Log authenticated user
    if (session) {
      // User authenticated
    } else if (isDevelopment && disableAuth) {
      console.warn(
        'MCP Orchestrator: Running in DEVELOPMENT mode with authentication DISABLED'
      )
    }
    const parseStart = Date.now()
    const {
      namespace,
      method,
      params,
      headers: customHeaders,
      mcpServerUrl,
    } = await request.json()
    timings.parse = Date.now() - parseStart
    if (!namespace) {
      return NextResponse.json(
        {
          success: false,
          error: 'Namespace is required',
        },
        { status: 400 }
      )
    }
    // Use only default headers - let customHeaders (from connection) provide all auth data
    const headers = {
      ...DEFAULT_HEADERS,
      'x-cockpit-namespace-id': namespace,
      ...customHeaders, // customHeaders contains the actual auth IDs from connection
    }
    const fetchStart = Date.now()
    const toolName = params?.name || 'unknown'
    console.log(
      `[MCP Orchestrator] ⏱️ Starting fetch to ${mcpServerUrl} for tool: ${toolName}`
    )
    const response = await fetch(mcpServerUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params: params || {},
      }),
    })
    timings.fetch = Date.now() - fetchStart
    // Log timing if fetch was slow (> 2 seconds)
    if (timings.fetch > 2000) {
      console.warn(
        `[MCP Orchestrator] ⚠️ SLOW FETCH: ${toolName} took ${timings.fetch}ms`
      )
    }
    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `MCP Server Error: ${response.status} ${response.statusText}`
      )
      console.error(`Error Body:`, errorText)
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} - ${errorText}`
      )
    }
    const result = await response.json()
    if (result.error) {
      const errorMessage =
        result.error.message || result.error || 'Unknown error'
      console.error(
        `MCP Server returned error for method ${method}:`,
        result.error
      )
      if (method === 'tools/call' && params?.name === 'get_agent_card') {
        console.warn(
          'get_agent_card tool call failed, this is non-critical:',
          result.error
        )
        return NextResponse.json({
          success: false,
          error: `get_agent_card failed: ${errorMessage}`,
          namespace,
          method,
          timestamp: new Date().toISOString(),
        })
      }
      if (
        errorMessage.includes('Method not found') &&
        method === 'list_artifacts'
      ) {
        throw new Error(
          `MCP Error: Method 'list_artifacts' not found. This method is not part of the standard MCP protocol. Try using 'resources/list' or implement 'list_artifacts' as a custom tool on the MCP server.`
        )
      }
      throw new Error(`MCP Error: ${errorMessage}`)
    }
    // ========================================================================
    // MIGRATION ENRICHMENT LOGIC
    // For create operations that don't return IDs, we fetch the ID separately
    // ========================================================================
    if (method === 'tools/call' && result.result?.content?.[0]?.text) {
      const toolName = params?.name
      const toolArgs = params?.arguments || {}
      try {
        const parsed = JSON.parse(result.result.content[0].text) as Record<
          string,
          unknown
        >
        // Check if this is a create operation that needs enrichment
        if (needsEnrichment(parsed)) {
          let enrichedParsed = parsed
          // Enrich create_utility_agent
          if (toolName === 'create_utility_agent' && toolArgs.name) {
            console.log(
              `[MCP Orchestrator] Enriching create_utility_agent response for "${toolArgs.name}"...`
            )
            enrichedParsed = await enrichCreateUtilityAgentResponse(
              mcpServerUrl,
              headers,
              toolArgs.name as string,
              parsed
            )
          }
          // Enrich create_artifact
          if (toolName === 'create_artifact' && toolArgs.key) {
            console.log(
              `[MCP Orchestrator] Enriching create_artifact response for "${toolArgs.key}"...`
            )
            enrichedParsed = await enrichCreateArtifactResponse(
              mcpServerUrl,
              headers,
              toolArgs.key as string,
              parsed
            )
          }
          // If enrichment happened, rebuild the result
          if (enrichedParsed !== parsed) {
            const enrichedResult = {
              ...result,
              result: {
                ...result.result,
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(enrichedParsed),
                  },
                ],
              },
            }
            return NextResponse.json({
              success: true,
              namespace,
              method,
              timestamp: new Date().toISOString(),
              ...enrichedResult.result,
              raw: enrichedResult,
            })
          }
        }
        // ====================================================================
        // PAYLOAD OPTIMIZATION for list operations
        // Reduces ~1.3MB response to ~100KB by removing versions.value
        // ====================================================================
        if (
          toolName === 'list_utility_agents' ||
          toolName === 'search_utility_agents'
        ) {
          const optimizedParsed = optimizeListUtilityAgentsResponse(parsed)
          // Rebuild result with optimized data
          const optimizedResult = {
            ...result,
            result: {
              ...result.result,
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(optimizedParsed),
                },
              ],
            },
          }
          return NextResponse.json({
            success: true,
            namespace,
            method,
            timestamp: new Date().toISOString(),
            ...optimizedResult.result,
            raw: optimizedResult,
          })
        }
        // ====================================================================
        // PAYLOAD OPTIMIZATION for list_artifacts operations
        // Removes versions array which can be heavy (not needed for listing)
        // ====================================================================
        if (toolName === 'list_artifacts' || toolName === 'search_artifacts') {
          const optimizedParsed = optimizeListArtifactsResponse(parsed)
          // Rebuild result with optimized data
          const optimizedResult = {
            ...result,
            result: {
              ...result.result,
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(optimizedParsed),
                },
              ],
            },
          }
          return NextResponse.json({
            success: true,
            namespace,
            method,
            timestamp: new Date().toISOString(),
            ...optimizedResult.result,
            raw: optimizedResult,
          })
        }
      } catch (parseError) {
        // If parsing fails, continue with original response
        console.warn(
          '[MCP Orchestrator] Could not parse response for enrichment:',
          parseError
        )
      }
    }
    timings.total = Date.now() - startTime
    const toolNameFinal = params?.name || method
    // Log timing summary for slow requests (> 3 seconds)
    if (timings.total > 3000) {
      console.warn(
        `[MCP Orchestrator] ⚠️ SLOW REQUEST: ${toolNameFinal} - Total: ${timings.total}ms | Auth: ${timings.auth}ms | Parse: ${timings.parse}ms | Fetch: ${timings.fetch}ms`
      )
    } else {
      console.log(
        `[MCP Orchestrator] ✅ ${toolNameFinal} completed in ${timings.total}ms (auth: ${timings.auth}ms, fetch: ${timings.fetch}ms)`
      )
    }
    return NextResponse.json({
      success: true,
      namespace,
      method,
      timestamp: new Date().toISOString(),
      ...result.result,
      raw: result,
    })
  } catch (error) {
    console.error('MCP Orchestrator API Route Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
export async function GET(request: NextRequest) {
  // AUTHENTICATION: Validate session
  const session = await getServerSession(authOptions)
  // Allow bypass in development mode only
  const isDevelopment = process.env.NODE_ENV === 'development'
  const disableAuth = process.env.DISABLE_AUTH === 'true'
  if (!session && !(isDevelopment && disableAuth)) {
    console.warn('MCP Orchestrator GET: Unauthorized access attempt')
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required. Please sign in.',
      },
      { status: 401 }
    )
  }
  const { searchParams } = new URL(request.url)
  const namespace = searchParams.get('namespace')
  if (!namespace) {
    return NextResponse.json(
      {
        success: false,
        error: 'Namespace parameter is required',
      },
      { status: 400 }
    )
  }
  try {
    const serverUrl = ''
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'x-cockpit-namespace-id': namespace,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
        params: {},
      }),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const result = await response.json()
    return NextResponse.json({
      success: true,
      namespace,
      connected: !result.error,
      timestamp: new Date().toISOString(),
      tools: result.result?.tools || [],
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        namespace,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  }
}
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
