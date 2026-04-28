/**
 * MCP Client for LangChain Integration
 *
 * Simplified MCP client that connects to MCP servers via stdio, SSE, or HTTP
 * and converts MCP tools to LangChain-compatible DynamicStructuredTool.
 *
 * This is an internalized version of @langchain/mcp-adapters to avoid
 * compatibility issues with different @langchain/* versions.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { TextContent, Tool } from '@modelcontextprotocol/sdk/types.js'

// ============================================================================
// TYPES
// ============================================================================

export interface StdioTransportConfig {
  type: 'stdio'
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
}

export interface SSETransportConfig {
  type: 'sse'
  url: string
  headers?: Record<string, string>
}

export interface HTTPTransportConfig {
  type: 'http'
  url: string
  headers?: Record<string, string>
}

export type TransportConfig =
  | StdioTransportConfig
  | SSETransportConfig
  | HTTPTransportConfig

export interface MCPServerConfig {
  transport: TransportConfig
  /** Optional name prefix for tools from this server */
  toolPrefix?: string
}

export interface MultiServerConfig {
  [serverName: string]: MCPServerConfig | TransportConfig
}

export interface ConnectedServer {
  name: string
  client: Client
  transport: Transport
  tools: Tool[]
}

// ============================================================================
// TRANSPORT FACTORY
// ============================================================================

function createTransport(config: TransportConfig): Transport {
  switch (config.type) {
    case 'stdio': {
      const env: Record<string, string> | undefined = config.env
        ? {
            ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
            ...config.env,
          }
        : undefined
      return new StdioClientTransport({
        command: config.command,
        args: config.args,
        cwd: config.cwd,
        env,
      })
    }

    case 'sse':
      return new SSEClientTransport(
        new URL(config.url),
        config.headers
          ? { requestInit: { headers: config.headers } }
          : undefined
      )

    case 'http':
      return new StreamableHTTPClientTransport(
        new URL(config.url),
        config.headers
          ? { requestInit: { headers: config.headers } }
          : undefined
      )

    default:
      throw new Error(
        `Unsupported transport type: ${(config as TransportConfig).type}`
      )
  }
}

// ============================================================================
// MCP CLIENT
// ============================================================================

/**
 * Multi-server MCP client that manages connections to multiple MCP servers.
 *
 * @example
 * ```typescript
 * const client = new MCPClient({
 *   'mcp-builder': {
 *     type: 'stdio',
 *     command: 'node',
 *     args: ['./dist/server/index.js'],
 *   },
 *   'cockpit-suite': {
 *     type: 'http',
 *     url: 'https://mcp-suite-dev.cockpit.avanade.ai/mcp',
 *     headers: { 'x-api-key': '...' },
 *   },
 * })
 *
 * await client.connect()
 * const tools = client.getTools() // LangChain DynamicStructuredTool[]
 * await client.close()
 * ```
 */
export class MCPClient {
  private config: MultiServerConfig
  private connections: Map<string, ConnectedServer> = new Map()

  constructor(config: MultiServerConfig) {
    this.config = config
  }

  /**
   * Connect to all configured MCP servers
   */
  async connect(): Promise<void> {
    const entries = Object.entries(this.config)

    for (const [serverName, serverConfig] of entries) {
      try {
        await this.connectServer(serverName, serverConfig)
      } catch (error) {
        console.error(`Failed to connect to MCP server "${serverName}":`, error)
        throw error
      }
    }
  }

  /**
   * Connect to a single MCP server
   */
  private async connectServer(
    serverName: string,
    config: MCPServerConfig | TransportConfig
  ): Promise<void> {
    // Normalize config - support both { transport: {...} } and direct transport config
    const transportConfig: TransportConfig =
      'transport' in config ? config.transport : config

    // Create transport
    const transport = createTransport(transportConfig)

    // Create and connect client
    const client = new Client(
      { name: 'cockpit-mcp-client', version: '1.0.0' },
      { capabilities: {} }
    )

    await client.connect(transport)

    // Discover tools
    const toolsResult = await client.listTools()
    const tools = toolsResult.tools || []

    // Store connection
    this.connections.set(serverName, {
      name: serverName,
      client,
      transport,
      tools,
    })

    console.log(
      `Connected to MCP server "${serverName}" with ${tools.length} tools`
    )
  }

  /**
   * Get all discovered MCP tools (raw format)
   */
  getMCPTools(): { serverName: string; tool: Tool }[] {
    const allTools: { serverName: string; tool: Tool }[] = []

    for (const [serverName, connection] of this.connections) {
      for (const tool of connection.tools) {
        allTools.push({ serverName, tool })
      }
    }

    return allTools
  }

  /**
   * Get the MCP client for a specific server
   */
  getClient(serverName: string): Client | undefined {
    return this.connections.get(serverName)?.client
  }

  /**
   * Get all connected server names
   */
  getServerNames(): string[] {
    return Array.from(this.connections.keys())
  }

  /**
   * Call a tool on a specific server
   */
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const connection = this.connections.get(serverName)
    if (!connection) {
      throw new Error(`MCP server "${serverName}" not connected`)
    }

    const result = await connection.client.callTool({
      name: toolName,
      arguments: args,
    })

    // Cast content to array of content objects
    const content = (result.content || []) as Array<{
      type: string
      text?: string
    }>

    if (result.isError) {
      const errorText = content
        .filter((c): c is TextContent => c.type === 'text')
        .map(c => c.text)
        .join('\n')
      throw new Error(`Tool "${toolName}" error: ${errorText}`)
    }

    // Extract text content
    const textContent = content
      .filter((c): c is TextContent => c.type === 'text')
      .map(c => c.text)
      .join('\n')

    return textContent
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    for (const [serverName, connection] of this.connections) {
      try {
        await connection.client.close()
        console.log(`Disconnected from MCP server "${serverName}"`)
      } catch (error) {
        console.error(
          `Error closing connection to MCP server "${serverName}":`,
          error
        )
      }
    }

    this.connections.clear()
  }
}
