import { McpServerConfig } from './types'

export class ConfigParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigParseError'
  }
}

function validateServerConfig(server: any, serverName: string): void {
  if (!server.url) {
    throw new ConfigParseError(
      `Server "${serverName}" must have a "url" property`
    )
  }
  if (!server.headers) {
    throw new ConfigParseError(
      `Server "${serverName}" must have a "headers" object`
    )
  }
  if (!server.headers['x-cockpit-namespace-id']) {
    throw new ConfigParseError(
      `Server "${serverName}" headers must include "x-cockpit-namespace-id"`
    )
  }
}

export function parseMcpConfig(jsonString: string): McpServerConfig {
  try {
    const config = JSON.parse(jsonString)

    if (!config.servers || typeof config.servers !== 'object') {
      throw new ConfigParseError('Configuration must have a "servers" object')
    }

    const serverEntries = Object.entries(config.servers)
    if (serverEntries.length === 0) {
      throw new ConfigParseError('At least one server must be configured')
    }

    for (const [serverName, server] of serverEntries) {
      validateServerConfig(server, serverName)
    }

    return config as McpServerConfig
  } catch (error) {
    if (error instanceof ConfigParseError) {
      throw error
    }
    if (error instanceof SyntaxError) {
      throw new ConfigParseError('Invalid JSON format')
    }
    throw new ConfigParseError('Unknown parsing error')
  }
}

export function extractNamespaceId(config: McpServerConfig): string {
  const server = Object.values(config.servers)[0]
  return server?.headers?.['x-cockpit-namespace-id'] || 'Unknown'
}

export function extractAgentId(config: McpServerConfig): string {
  const server = Object.values(config.servers)[0]
  return server?.headers?.['x-cockpit-utility-agent-id'] || 'Unknown'
}

export function extractServerUrl(config: McpServerConfig): string {
  const server = Object.values(config.servers)[0]
  return server?.url || 'Unknown'
}
