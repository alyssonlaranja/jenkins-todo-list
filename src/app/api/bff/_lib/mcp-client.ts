/**
 * BFF MCP Client
 *
 * Server-side MCP client for making tool calls from BFF endpoints.
 * Reuses patterns from mcp-orchestrator but with cleaner abstraction.
 */
import type { McpCallOptions, McpCallResult } from './types'

import { getServerEnv } from '@/shared/lib/server/get-server-env'

const DEFAULT_TIMEOUT_MS = 60000 // 60 seconds for slow MCP servers

/**
 * Make a JSON-RPC call to an MCP server
 */
export async function callMcpTool<T = unknown>(
  options: McpCallOptions
): Promise<McpCallResult<T>> {
  const {
    mcpServerUrl,
    headers,
    toolName,
    toolArguments,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options

  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(mcpServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
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
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error')
      console.error(
        `[BFF MCP Client] HTTP error ${response.status} for ${toolName}:`,
        errorBody
      )
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorBody.substring(0, 200)}`,
      }
    }

    const result = await response.json()

    // Check for JSON-RPC error
    if (result.error) {
      console.error(`[BFF MCP Client] MCP error for ${toolName}:`, result.error)
      return {
        success: false,
        error: result.error.message || 'MCP error',
        raw: result,
      }
    }

    // Parse text content from MCP response
    if (result.result?.content?.[0]?.text) {
      try {
        const parsed = JSON.parse(result.result.content[0].text)
        const elapsed = Date.now() - startTime
        console.log(`[BFF MCP Client] ${toolName} completed in ${elapsed}ms`)
        return {
          success: true,
          data: parsed as T,
          raw: result,
        }
      } catch (parseError) {
        console.error(
          `[BFF MCP Client] Failed to parse response for ${toolName}:`,
          parseError
        )
        return {
          success: false,
          error: 'Failed to parse MCP response',
          raw: result,
        }
      }
    }

    // No content in response
    console.warn(`[BFF MCP Client] No content in response for ${toolName}`)
    return {
      success: false,
      error: 'No content in MCP response',
      raw: result,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(
        `[BFF MCP Client] Timeout for ${toolName} after ${timeoutMs}ms`
      )
      return {
        success: false,
        error: `Request timeout after ${timeoutMs}ms`,
      }
    }

    console.error(`[BFF MCP Client] Error calling ${toolName}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Build MCP headers from auth context
 */
export function buildMcpHeaders(
  apiKey: string,
  cockpitApiKey: string,
  licenseId: string,
  namespaceId: string
): Record<string, string> {
  return {
    'x-api-key': apiKey,
    'x-cockpit-api-key': cockpitApiKey,
    'x-cockpit-license-id': licenseId,
    'x-cockpit-namespace-id': namespaceId,
  }
}

/**
 * Get MCP server URL for utility agents
 */
export function getUtilityAgentsServerUrl(): string {
  const url = getServerEnv('NEXT_PUBLIC_MCP_SERVER_UTILITY_AGENT_URL')
  if (!url) {
    throw new Error('NEXT_PUBLIC_MCP_SERVER_UTILITY_AGENT_URL not configured')
  }
  return url
}
