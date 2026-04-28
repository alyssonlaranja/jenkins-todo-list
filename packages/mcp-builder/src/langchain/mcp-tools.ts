/**
 * MCP to LangChain Tools Adapter
 *
 * Converts MCP tools to LangChain DynamicStructuredTool instances.
 * This allows MCP tools to be used seamlessly with LangGraph agents.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

import type { MCPClient } from './mcp-client.js'

// ============================================================================
// TYPES
// ============================================================================

export interface LoadToolsOptions {
  /**
   * Prefix tool names with server name (e.g., "mcp_builder__create_project")
   * @default false
   */
  prefixWithServerName?: boolean

  /**
   * Additional prefix for all tool names
   */
  additionalPrefix?: string

  /**
   * Filter tools by name (only include matching tools)
   */
  includeTools?: string[]

  /**
   * Filter tools by name (exclude matching tools)
   */
  excludeTools?: string[]
}

// ============================================================================
// JSON SCHEMA HELPERS
// ============================================================================

/**
 * Dereference $ref pointers in JSON Schema by inlining definitions from $defs.
 * Required because some validators don't automatically resolve $ref references.
 */
function dereferenceJsonSchema(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const definitions =
    (schema.$defs as Record<string, unknown>) ||
    (schema.definitions as Record<string, unknown>) ||
    {}

  function resolveRefs(
    obj: unknown,
    visited: Set<string> = new Set()
  ): unknown {
    if (typeof obj !== 'object' || obj === null) return obj

    const record = obj as Record<string, unknown>

    // Handle $ref
    if (record.$ref && typeof record.$ref === 'string') {
      const refPath = record.$ref as string
      const match =
        refPath.match(/^#\/\$defs\/(.+)$/) ||
        refPath.match(/^#\/definitions\/(.+)$/)

      if (match) {
        const defName = match[1]
        const definition = definitions[defName]

        if (definition) {
          if (visited.has(refPath)) {
            // Circular reference - return empty object
            return { type: 'object' }
          }

          const newVisited = new Set(visited)
          newVisited.add(refPath)

          const { $ref: _, ...rest } = record
          const resolved = resolveRefs(definition, newVisited)

          return {
            ...(resolved as Record<string, unknown>),
            ...rest,
          }
        }
      }

      return obj
    }

    // Recursively process object
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(record)) {
      if (key === '$defs' || key === 'definitions') continue

      if (Array.isArray(value)) {
        result[key] = value.map(item =>
          typeof item === 'object' && item !== null
            ? resolveRefs(item, visited)
            : item
        )
      } else if (typeof value === 'object' && value !== null) {
        result[key] = resolveRefs(value, visited)
      } else {
        result[key] = value
      }
    }

    return result
  }

  return resolveRefs(schema) as Record<string, unknown>
}

/**
 * Ensure schema has properties object (required by DynamicStructuredTool)
 */
function normalizeSchema(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const dereferenced = dereferenceJsonSchema(schema)

  if (!dereferenced.properties) {
    dereferenced.properties = {}
  }

  return dereferenced
}

// ============================================================================
// TOOL CONVERSION
// ============================================================================

/**
 * Convert a single MCP tool to a LangChain DynamicStructuredTool
 */
function convertMCPToolToLangChain(
  serverName: string,
  tool: Tool,
  client: MCPClient,
  options: LoadToolsOptions = {}
): DynamicStructuredTool {
  const { prefixWithServerName = false, additionalPrefix = '' } = options

  // Build tool name with optional prefixes
  let toolName = tool.name
  if (prefixWithServerName) {
    toolName = `${serverName}__${toolName}`
  }
  if (additionalPrefix) {
    toolName = `${additionalPrefix}__${toolName}`
  }

  // Normalize the input schema
  const schema = normalizeSchema(
    (tool.inputSchema as Record<string, unknown>) || { type: 'object' }
  )

  return new DynamicStructuredTool({
    name: toolName,
    description:
      tool.description || `Tool ${tool.name} from MCP server ${serverName}`,
    schema,
    func: async (args: Record<string, unknown>) => {
      try {
        const result = await client.callTool(serverName, tool.name, args)

        // Return string result for LangChain
        if (typeof result === 'string') {
          return result
        }

        return JSON.stringify(result)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        return `Error calling tool ${tool.name}: ${errorMessage}`
      }
    },
  })
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Load all tools from an MCPClient and convert to LangChain tools
 *
 * @example
 * ```typescript
 * const mcpClient = new MCPClient({
 *   'mcp-builder': { type: 'stdio', command: 'node', args: ['./server.js'] }
 * })
 * await mcpClient.connect()
 *
 * const tools = loadMCPToolsAsLangChain(mcpClient, {
 *   prefixWithServerName: true,
 *   excludeTools: ['internal_tool']
 * })
 *
 * // Use with LangGraph
 * const agent = createReactAgent({ llm, tools })
 * ```
 */
export function loadMCPToolsAsLangChain(
  client: MCPClient,
  options: LoadToolsOptions = {}
): DynamicStructuredTool[] {
  const { includeTools, excludeTools } = options

  const mcpTools = client.getMCPTools()
  const langchainTools: DynamicStructuredTool[] = []

  for (const { serverName, tool } of mcpTools) {
    // Apply filters
    if (includeTools && !includeTools.includes(tool.name)) {
      continue
    }
    if (excludeTools && excludeTools.includes(tool.name)) {
      continue
    }

    try {
      const langchainTool = convertMCPToolToLangChain(
        serverName,
        tool,
        client,
        options
      )
      langchainTools.push(langchainTool)
    } catch (error) {
      console.error(
        `Failed to convert MCP tool "${tool.name}" from server "${serverName}":`,
        error
      )
    }
  }

  return langchainTools
}

/**
 * Load tools from a specific server only
 */
export function loadMCPToolsFromServer(
  client: MCPClient,
  serverName: string,
  options: LoadToolsOptions = {}
): DynamicStructuredTool[] {
  const { includeTools, excludeTools } = options

  const mcpTools = client.getMCPTools().filter(t => t.serverName === serverName)

  const langchainTools: DynamicStructuredTool[] = []

  for (const { serverName: sn, tool } of mcpTools) {
    // Apply filters
    if (includeTools && !includeTools.includes(tool.name)) {
      continue
    }
    if (excludeTools && excludeTools.includes(tool.name)) {
      continue
    }

    try {
      const langchainTool = convertMCPToolToLangChain(sn, tool, client, options)
      langchainTools.push(langchainTool)
    } catch (error) {
      console.error(
        `Failed to convert MCP tool "${tool.name}" from server "${sn}":`,
        error
      )
    }
  }

  return langchainTools
}
