// src/index.ts

/**
 * @cockpit/mcp-builder-deepagent
 *
 * MCP Builder Agent using DeepAgents + Azure OpenAI
 *
 * This package generates MCP server projects using:
 * - DeepAgents with FilesystemBackend for writing files
 * - McpSlotsMiddleware for accessing external MCP servers
 * - AzureChatOpenAI as the LLM
 */

// Re-export everything from core
export * from './core/index.js'

// Re-export server creation (for programmatic use)
export { createServer, startServer } from './server/index.js'
