// src/server/tools/slots.ts

import type { FastMCP } from 'fastmcp'
import { z } from 'zod'

import { discoverTools, McpTransportConfigSchema } from '../../core/index.js'

/**
 * Register slot-related tools
 */
export function registerSlotTools(server: FastMCP): void {
  // discover_tools
  server.addTool({
    name: 'discover_tools',
    description: 'Connect to an MCP and discover its available tools',
    parameters: z.object({
      transport: McpTransportConfigSchema.describe(
        'MCP transport configuration'
      ),
    }),
    execute: async ({ transport }) => {
      try {
        const tools = await discoverTools(transport)

        return JSON.stringify({
          success: true,
          tools: tools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        })
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
  })
}
