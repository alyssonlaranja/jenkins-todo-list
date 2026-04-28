// src/core/mcp-slots-middleware.ts

/**
 * MCP Slots Middleware for DeepAgents
 *
 * This middleware converts tools discovered from connected MCP slots
 * into LangChain-compatible tools that can be used by DeepAgent.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

import type { SlotManager } from './slots.js'
import type { ConnectedSlot, DiscoveredTool } from './types.js'

// ============================================================================
// TYPES
// ============================================================================

export interface McpSlotsMiddlewareConfig {
  /**
   * Connected slots to create tools from
   */
  slots: Record<string, ConnectedSlot>

  /**
   * SlotManager for calling tools
   */
  slotManager: SlotManager

  /**
   * Optional prefix for tool names
   * @default true (uses slot name as prefix)
   */
  prefixWithSlotName?: boolean
}

/**
 * AgentMiddleware interface for DeepAgents
 * Note: DeepAgents middleware is just an object with a tools array
 */
export interface AgentMiddleware {
  name?: string
  tools: DynamicStructuredTool[]
}

// ============================================================================
// JSON SCHEMA TO ZOD CONVERTER
// ============================================================================

/**
 * Convert JSON Schema to Zod schema
 * This is a simplified converter that handles common cases
 */
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodTypeAny {
  const type = schema.type as string | undefined

  if (!type || type === 'object') {
    const properties = schema.properties as Record<string, unknown> | undefined
    const required = schema.required as string[] | undefined

    if (!properties) {
      return z.object({})
    }

    const shape: Record<string, z.ZodTypeAny> = {}

    for (const [key, propSchema] of Object.entries(properties)) {
      let zodType = jsonSchemaToZod(propSchema as Record<string, unknown>)

      // Add description if available
      const description = (propSchema as Record<string, unknown>)
        .description as string | undefined
      if (description) {
        zodType = zodType.describe(description)
      }

      // Make optional if not required
      if (!required?.includes(key)) {
        zodType = zodType.optional()
      }

      shape[key] = zodType
    }

    return z.object(shape)
  }

  switch (type) {
    case 'string': {
      const enumValues = schema.enum as string[] | undefined
      if (enumValues && enumValues.length > 0) {
        return z.enum(enumValues as [string, ...string[]])
      }
      return z.string()
    }
    case 'number':
    case 'integer':
      return z.number()
    case 'boolean':
      return z.boolean()
    case 'array': {
      const items = schema.items as Record<string, unknown> | undefined
      if (items) {
        return z.array(jsonSchemaToZod(items))
      }
      return z.array(z.unknown())
    }
    case 'null':
      return z.null()
    default:
      return z.unknown()
  }
}

// ============================================================================
// TOOL CONVERTER
// ============================================================================

/**
 * Convert a discovered MCP tool to a LangChain DynamicStructuredTool
 */
function convertMcpToolToLangChain(
  slotName: string,
  tool: DiscoveredTool,
  slotManager: SlotManager,
  prefixWithSlotName: boolean
): DynamicStructuredTool {
  // Build tool name
  const toolName = prefixWithSlotName ? `${slotName}__${tool.name}` : tool.name

  // Convert JSON Schema to Zod
  const zodSchema = jsonSchemaToZod(tool.inputSchema)

  return new DynamicStructuredTool({
    name: toolName,
    description:
      tool.description || `Tool ${tool.name} from MCP slot ${slotName}`,
    schema: zodSchema,
    func: async (args: Record<string, unknown>) => {
      try {
        const result = await slotManager.callTool(slotName, tool.name, args)
        return result
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        return `Error calling ${tool.name}: ${errorMessage}`
      }
    },
  })
}

// ============================================================================
// TOOLS FACTORY
// ============================================================================

/**
 * Create MCP slot tools for DeepAgent
 *
 * This function converts tools discovered from connected MCP slots
 * into LangChain-compatible tools that can be used by DeepAgent.
 *
 * @example
 * ```typescript
 * const slotManager = new SlotManager();
 * await slotManager.connectAll(slots);
 *
 * const mcpTools = createMcpSlotTools({
 *   slots: slotManager.getAllSlots(),
 *   slotManager,
 * });
 *
 * const agent = createDeepAgent({
 *   tools: mcpTools,
 * });
 * ```
 */
export function createMcpSlotTools(
  config: McpSlotsMiddlewareConfig
): DynamicStructuredTool[] {
  const { slots, slotManager, prefixWithSlotName = true } = config

  const tools: DynamicStructuredTool[] = []

  // Convert all tools from all slots
  for (const [slotName, slot] of Object.entries(slots)) {
    if (slot.status !== 'connected') {
      continue
    }

    for (const mcpTool of slot.tools) {
      try {
        const langchainTool = convertMcpToolToLangChain(
          slotName,
          mcpTool,
          slotManager,
          prefixWithSlotName
        )
        tools.push(langchainTool)
      } catch (error) {
        console.error(
          `Failed to convert MCP tool "${mcpTool.name}" from slot "${slotName}":`,
          error
        )
      }
    }
  }

  return tools
}

/**
 * Create an MCP Slots middleware for DeepAgent (legacy API)
 * @deprecated Use createMcpSlotTools instead
 */
export function createMcpSlotsMiddleware(
  config: McpSlotsMiddlewareConfig
): AgentMiddleware {
  const tools = createMcpSlotTools(config)
  return { name: 'mcp-slots', tools }
}

/**
 * Get all tool names from connected slots
 */
export function getSlotToolNames(
  slots: Record<string, ConnectedSlot>,
  prefixWithSlotName: boolean = true
): string[] {
  const names: string[] = []

  for (const [slotName, slot] of Object.entries(slots)) {
    if (slot.status !== 'connected') {
      continue
    }

    for (const tool of slot.tools) {
      const toolName = prefixWithSlotName
        ? `${slotName}__${tool.name}`
        : tool.name
      names.push(toolName)
    }
  }

  return names
}
