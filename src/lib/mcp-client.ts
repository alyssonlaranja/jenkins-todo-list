/**
 * MCP Client - Server-side only
 *
 * This module provides direct MCP server communication for use in API routes.
 * It bypasses the HTTP proxy and calls MCP directly, which is more efficient
 * and avoids authentication issues with internal API calls.
 *
 * IMPORTANT: This should only be used in server-side code (API routes, server components).
 * For client-side code, use the useProxyMCP hook instead.
 */

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
} as const

export interface MCPCallResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface MCPToolCallParams {
  mcpServerUrl: string
  mcpHeaders: Record<string, string>
  toolName: string
  toolArguments: Record<string, unknown>
}

/**
 * Call an MCP tool directly from server-side code
 *
 * @example
 * ```ts
 * const result = await callMCPTool({
 *   mcpServerUrl: 'https://mcp-dev.cockpit.avanade.ai/mcp',
 *   mcpHeaders: { 'x-namespace-id': '...', 'x-license-id': '...' },
 *   toolName: 'create_artifact',
 *   toolArguments: { key: 'my-key', value: '...' }
 * })
 * ```
 */
export async function callMCPTool<T = unknown>(
  params: MCPToolCallParams
): Promise<MCPCallResult<T>> {
  const { mcpServerUrl, mcpHeaders, toolName, toolArguments } = params

  if (!mcpServerUrl || !mcpHeaders) {
    return { success: false, error: 'MCP server URL and headers are required' }
  }

  try {
    const response = await fetch(mcpServerUrl, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        ...mcpHeaders,
      },
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
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const result = await response.json()

    // DEBUG: Log raw MCP response for get_agent_card
    if (toolName === 'get_agent_card') {
      console.log(
        '🔍 [MCP-CLIENT] get_agent_card RAW response:',
        JSON.stringify(result, null, 2)
      )
    }

    if (result.error) {
      return {
        success: false,
        error: result.error.message || result.error || 'MCP error',
      }
    }

    // Parse MCP response
    if (result.result?.content?.[0]?.text) {
      try {
        const parsed = JSON.parse(result.result.content[0].text)
        if (toolName === 'get_agent_card') {
          console.log(
            '🔍 [MCP-CLIENT] get_agent_card PARSED data:',
            JSON.stringify(parsed, null, 2)
          )
          // Log each team member field lengths to check for truncation
          const teamMembers = parsed.data?.team_member
          if (teamMembers && Array.isArray(teamMembers)) {
            console.log(
              '══════════════════════════════════════════════════════════════════════'
            )
            console.log(
              '📊 [MCP-CLIENT] TEAM MEMBER FIELD LENGTHS (checking for truncation):'
            )
            console.log(
              '══════════════════════════════════════════════════════════════════════'
            )
            teamMembers.forEach(
              (
                m: {
                  name?: string
                  description?: string
                  objective?: string
                  artifact_type?: string
                },
                i: number
              ) => {
                console.log(`  [${i + 1}] ${m.name}:`)
                console.log(
                  `      description.length = ${m.description?.length || 0}`
                )
                console.log(
                  `      objective.length   = ${m.objective?.length || 0}`
                )
                console.log(
                  `      artifact_type      = "${m.artifact_type || 'NOT PRESENT'}"`
                )
                console.log(`      description FULL   = "${m.description}"`)
                console.log(`      objective FULL     = "${m.objective}"`)
              }
            )
            console.log(
              '══════════════════════════════════════════════════════════════════════'
            )
          }
        }
        return { success: true, data: parsed as T }
      } catch {
        // Return raw text if not JSON
        if (toolName === 'get_agent_card') {
          console.log(
            '🔍 [MCP-CLIENT] get_agent_card RAW text (not JSON):',
            result.result.content[0].text
          )
        }
        return { success: true, data: result.result.content[0].text as T }
      }
    }

    // Return raw result if no content
    if (toolName === 'get_agent_card') {
      console.log(
        '⚠️ [MCP-CLIENT] get_agent_card NO content in response, returning raw result:',
        result.result
      )
    }
    return { success: true, data: result.result as T }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create an artifact in MCP
 */
export async function createMCPArtifact(params: {
  mcpServerUrl: string
  mcpHeaders: Record<string, string>
  key: string
  value: string
  description?: string
  artifactType?: string
  accessibility?: string
  tags?: string
}): Promise<MCPCallResult> {
  const {
    mcpServerUrl,
    mcpHeaders,
    key,
    value,
    description,
    artifactType = 'JSON',
    accessibility = 'Namespace',
    tags,
  } = params

  return callMCPTool({
    mcpServerUrl,
    mcpHeaders,
    toolName: 'create_artifact',
    toolArguments: {
      key,
      value,
      description,
      artifact_type_name: artifactType,
      accessibility,
      conflict_strategy: 'OVERWRITE',
      ...(tags && { tags }),
    },
  })
}

/**
 * Get artifacts from MCP by pattern
 */
export async function getMCPArtifacts(params: {
  mcpServerUrl: string
  mcpHeaders: Record<string, string>
  keyPattern: string
}): Promise<
  MCPCallResult<{ artifacts: Array<{ key: string; value: unknown }> }>
> {
  const { mcpServerUrl, mcpHeaders, keyPattern } = params

  return callMCPTool({
    mcpServerUrl,
    mcpHeaders,
    toolName: 'get_artifact',
    toolArguments: {
      key_pattern: keyPattern,
    },
  })
}
