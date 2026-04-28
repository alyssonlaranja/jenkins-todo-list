/**
 * Connection Types & Server Config Helpers
 *
 * Core infrastructure used across the application for MCP server access.
 * Connections reference Environments (from environment-store) and provide
 * resolved server configurations with proper headers.
 */

import { useEnvironmentStore } from '@/shared/stores/environment-store'

// ============================================================================
// Connection Interface
// ============================================================================

export interface Connection {
  id: string
  title: string
  subtitle: string
  status?: 'connected' | 'disconnected' | 'connecting' | 'error'
  type?: 'session' | 'custom'
  environmentRef: {
    environmentId: string
    environmentName: string
    licenseId: string
    licenseName: string
    namespaceId: string
    namespaceName: string
    utilityAgentId: string
    utilityAgentName: string
  }
}

// ============================================================================
// Server Config
// ============================================================================

export interface ServerConfig {
  url: string
  type: string
  headers: Record<string, string>
}

export type ServerKey =
  | 'connection-mcp-server-legacy'
  | 'connection-mcp-utility-agents'
  | 'mcp-suite'
  | 'mcp-metrics'
  | 'mcp-telemetry'

/**
 * Get server configuration for a connection by server key.
 * Resolves the environment from the store and builds headers.
 */
export function getServerConfig(
  connection: Connection,
  serverKey: ServerKey
): ServerConfig | null {
  const env = useEnvironmentStore.getState().getEnvironmentById(
    connection.environmentRef.environmentId
  )
  if (!env) return null

  const server = env.mcpServers[serverKey]
  if (!server) return null

  const license = env.licenses[connection.environmentRef.licenseId]
  if (!license) return null

  const namespace = license.namespaces[connection.environmentRef.namespaceId]
  if (!namespace) return null

  const headers: Record<string, string> = {
    ...namespace.commonHeaders,
  }

  // Add utility agent header for servers that need it
  if (connection.environmentRef.utilityAgentId) {
    headers['x-cockpit-utility-agent-id'] =
      connection.environmentRef.utilityAgentId
  }

  return {
    url: server.url,
    type: server.type,
    headers,
  }
}

/**
 * Get Legacy MCP server config (artifacts, orchestration)
 */
export function getLegacyServer(connection: Connection): ServerConfig | null {
  return getServerConfig(connection, 'connection-mcp-server-legacy')
}

/**
 * Get Utility Agents MCP server config
 */
export function getUtilityAgentsServer(
  connection: Connection
): ServerConfig | null {
  return getServerConfig(connection, 'connection-mcp-utility-agents')
}

/**
 * Check if a connection has a specific server configured
 */
export function hasServer(
  connection: Connection,
  serverKey: ServerKey
): boolean {
  return getServerConfig(connection, serverKey) !== null
}

/**
 * Get all configured servers for a connection
 */
export function getAllServers(
  connection: Connection
): Record<string, ServerConfig> {
  const keys: ServerKey[] = [
    'connection-mcp-server-legacy',
    'connection-mcp-utility-agents',
    'mcp-suite',
    'mcp-metrics',
    'mcp-telemetry',
  ]

  const result: Record<string, ServerConfig> = {}
  for (const key of keys) {
    const config = getServerConfig(connection, key)
    if (config) result[key] = config
  }
  return result
}

/**
 * Get environment object for a connection
 */
export function getEnvironment(connection: Connection) {
  return useEnvironmentStore
    .getState()
    .getEnvironmentById(connection.environmentRef.environmentId)
}

/**
 * Validate that the environment referenced by a connection exists and is properly configured
 */
export function validateEnvironmentForConnection(
  connection: Connection
): { valid: boolean; error?: string } {
  const env = getEnvironment(connection)
  if (!env) {
    return {
      valid: false,
      error: `Environment ${connection.environmentRef.environmentId} not found`,
    }
  }

  const license = env.licenses[connection.environmentRef.licenseId]
  if (!license) {
    return {
      valid: false,
      error: `License ${connection.environmentRef.licenseId} not found in environment`,
    }
  }

  const namespace = license.namespaces[connection.environmentRef.namespaceId]
  if (!namespace) {
    return {
      valid: false,
      error: `Namespace ${connection.environmentRef.namespaceId} not found in license`,
    }
  }

  return { valid: true }
}
