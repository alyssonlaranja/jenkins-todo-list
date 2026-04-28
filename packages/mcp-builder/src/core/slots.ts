// src/core/slots.ts

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

import type {
  ConnectedSlot,
  DiscoveredTool,
  McpSlotDefinition,
  McpTransportConfig,
} from './types.js'

/**
 * Manages connections to MCP slots
 */
export class SlotManager {
  private clients: Map<string, Client> = new Map()
  private connectedSlots: Map<string, ConnectedSlot> = new Map()

  /**
   * Connect to an MCP slot and discover its tools
   */
  async connect(
    slotName: string,
    definition: McpSlotDefinition
  ): Promise<ConnectedSlot> {
    try {
      const client = new Client(
        { name: 'mcp-builder-slot-client', version: '1.0.0' },
        { capabilities: {} }
      )

      const transport = this.createTransport(definition.transport)
      await client.connect(transport)

      // Get server info
      const serverInfo = client.getServerVersion()

      // Discover tools
      const toolsResult = await client.listTools()
      const allTools: DiscoveredTool[] = (toolsResult.tools || []).map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown>,
      }))

      // Filter tools
      const tools = this.filterTools(allTools, definition)

      const connectedSlot: ConnectedSlot = {
        ...definition,
        slotName,
        serverName: serverInfo?.name || 'unknown',
        serverVersion: serverInfo?.version || 'unknown',
        tools,
        allTools,
        status: 'connected',
      }

      this.clients.set(slotName, client)
      this.connectedSlots.set(slotName, connectedSlot)

      return connectedSlot
    } catch (error) {
      const connectedSlot: ConnectedSlot = {
        ...definition,
        slotName,
        serverName: 'unknown',
        serverVersion: 'unknown',
        tools: [],
        allTools: [],
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }

      this.connectedSlots.set(slotName, connectedSlot)
      return connectedSlot
    }
  }

  /**
   * Connect to multiple slots
   */
  async connectAll(
    slots: Record<string, McpSlotDefinition>
  ): Promise<Record<string, ConnectedSlot>> {
    const results: Record<string, ConnectedSlot> = {}

    for (const [name, definition] of Object.entries(slots)) {
      results[name] = await this.connect(name, definition)
    }

    return results
  }

  /**
   * Get a connected slot
   */
  getSlot(slotName: string): ConnectedSlot | undefined {
    return this.connectedSlots.get(slotName)
  }

  /**
   * Get all connected slots
   */
  getAllSlots(): Record<string, ConnectedSlot> {
    return Object.fromEntries(this.connectedSlots)
  }

  /**
   * Get MCP servers config for Claude Agent SDK
   */
  getMcpServersForSdk(): Record<string, McpTransportConfig> {
    const servers: Record<string, McpTransportConfig> = {}

    for (const [name, slot] of this.connectedSlots) {
      if (slot.status === 'connected') {
        servers[name] = slot.transport
      }
    }

    return servers
  }

  /**
   * Disconnect from a slot
   */
  async disconnect(slotName: string): Promise<void> {
    const client = this.clients.get(slotName)
    if (client) {
      await client.close()
      this.clients.delete(slotName)
      this.connectedSlots.delete(slotName)
    }
  }

  /**
   * Disconnect from all slots
   */
  async disconnectAll(): Promise<void> {
    for (const slotName of this.clients.keys()) {
      await this.disconnect(slotName)
    }
  }

  /**
   * Create transport based on config
   */
  private createTransport(config: McpTransportConfig) {
    if (config.type === 'stdio') {
      return new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      })
    } else {
      return new SSEClientTransport(new URL(config.url))
    }
  }

  /**
   * Filter tools based on include/exclude lists
   */
  private filterTools(
    tools: DiscoveredTool[],
    definition: McpSlotDefinition
  ): DiscoveredTool[] {
    if (definition.includeTools?.length) {
      return tools.filter(t => definition.includeTools!.includes(t.name))
    }

    if (definition.excludeTools?.length) {
      return tools.filter(t => !definition.excludeTools!.includes(t.name))
    }

    return tools
  }
}

/**
 * Discover tools from an MCP without keeping connection
 */
export async function discoverTools(
  transport: McpTransportConfig
): Promise<DiscoveredTool[]> {
  const manager = new SlotManager()
  const slot = await manager.connect('temp', { transport, instruction: '' })
  const tools = slot.allTools
  await manager.disconnectAll()
  return tools
}
