// src/server/index.ts

import { FastMCP } from 'fastmcp'

import { registerProjectTools } from './tools/projects.js'
import { registerSlotTools } from './tools/slots.js'

/**
 * Create and configure the MCP Builder Server (DeepAgents version)
 */
export function createServer(): FastMCP {
  const server = new FastMCP({
    name: 'mcp-builder-deepagent',
    version: '1.0.0',
  })

  // Register tools
  registerProjectTools(server)
  registerSlotTools(server)

  return server
}

/**
 * Start the server
 */
export function startServer(): void {
  const server = createServer()
  server.start({ transportType: 'stdio' })
  console.error('MCP Builder (DeepAgents) Server started')
}

// Run if executed directly
const isMain =
  process.argv[1]?.endsWith('server/index.js') ||
  process.argv[1]?.endsWith('server/index.ts')

if (isMain) {
  startServer()
}
