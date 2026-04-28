/**
 * Environment Builder
 * Builds Session Environment from authenticated session data
 * Pattern: cockpit-portal/src/features/profile/hooks/use-environment-export.ts
 */
import type { Environment } from '@/shared/lib/types/environment'

import type { License, Namespace, UtilityAgent } from './types'

/**
 * Get MCP server URLs from environment variables ONLY
 * NO automatic derivation - all URLs must be explicitly configured
 *
 * @throws Error if any required MCP server URL is missing
 */
function getMcpServerUrls() {
  // Get runtime config from sessionStorage (if available)
  let runtimeConfig: any = null
  if (typeof window !== 'undefined') {
    try {
      const cachedConfig = sessionStorage.getItem('runtime-config')
      if (cachedConfig) {
        runtimeConfig = JSON.parse(cachedConfig)
      }
    } catch (error) {
      console.warn('[getMcpServerUrls] Failed to parse runtime config:', error)
    }
  }

  // Helper function to get URL with priority: runtime config > env var
  const getUrl = (
    runtimeKey: keyof any,
    envVar: string | undefined,
    label: string
  ): string => {
    const url = runtimeConfig?.[runtimeKey] || envVar
    if (!url) {
      const errorMsg = `Missing required MCP Server URL: ${label} (${runtimeKey})`
      console.error(`[getMcpServerUrls] ${errorMsg}`)
      throw new Error(errorMsg)
    }
    return url
  }

  const urls = {
    legacy: getUrl(
      'mcpServerLegacyUrl',
      process.env.NEXT_PUBLIC_MCP_SERVER_LEGACY_URL,
      'Legacy'
    ),
    utilityAgents: getUrl(
      'mcpServerUtilityAgentUrl',
      process.env.NEXT_PUBLIC_MCP_SERVER_UTILITY_AGENT_URL,
      'Utility Agents'
    ),
    suite: getUrl(
      'mcpServerSuiteUrl',
      process.env.NEXT_PUBLIC_MCP_SERVER_SUITE_URL,
      'Suite'
    ),
    metrics: getUrl(
      'mcpServerMetricsUrl',
      process.env.NEXT_PUBLIC_MCP_SERVER_METRICS_URL,
      'Metrics'
    ),
    telemetry: getUrl(
      'mcpServerTelemetryUrl',
      process.env.NEXT_PUBLIC_MCP_SERVER_TELEMETRY_URL,
      'Telemetry'
    ),
  }

  console.log('[getMcpServerUrls] ✅ All MCP Server URLs configured:', {
    legacy: urls.legacy,
    utilityAgents: urls.utilityAgents,
    suite: urls.suite,
    metrics: urls.metrics,
    telemetry: urls.telemetry,
  })

  console.log('[getMcpServerUrls] Source (runtime config vs env vars):', {
    legacy: runtimeConfig?.mcpServerLegacyUrl ? 'runtime' : 'env',
    utilityAgents: runtimeConfig?.mcpServerUtilityAgentUrl ? 'runtime' : 'env',
    suite: runtimeConfig?.mcpServerSuiteUrl ? 'runtime' : 'env',
    metrics: runtimeConfig?.mcpServerMetricsUrl ? 'runtime' : 'env',
    telemetry: runtimeConfig?.mcpServerTelemetryUrl ? 'runtime' : 'env',
  })

  return urls
}

/**
 * Build Session Environment from authenticated session data
 * Matches cockpit-portal's environment export structure
 *
 * NOTE: utilityAgents is optional because we now use MCP search_utility_agents
 * to find the bootstrap agent directly instead of fetching the full list.
 */
export function buildSessionEnvironment(params: {
  license: License
  namespace: Namespace
  utilityAgents?: UtilityAgent[] // Optional - bootstrap agent is found via MCP search
  userApiKey: string
  mcpServerApiKey: string
}): Environment {
  const {
    license,
    namespace,
    utilityAgents = [], // Default to empty array
    userApiKey,
    mcpServerApiKey,
  } = params

  // Get MCP server URLs from environment variables (no automatic derivation)
  const urls = getMcpServerUrls()

  return {
    id: 'session-current',
    name: `Session: ${license.name} - ${namespace.name}`,
    description: 'Auto-created from authenticated session',
    type: 'session', // Mark as ephemeral
    mcpServers: {
      'connection-mcp-server-legacy': {
        url: urls.legacy,
        type: 'http',
      },
      'connection-mcp-utility-agents': {
        url: urls.utilityAgents,
        type: 'http',
      },
      'mcp-suite': {
        url: urls.suite,
        type: 'http',
      },
      'mcp-metrics': {
        url: urls.metrics,
        type: 'http',
      },
      'mcp-telemetry': {
        url: urls.telemetry,
        type: 'http',
      },
    },
    licenses: {
      [license.id]: {
        licenseId: license.id,
        licenseName: license.name,
        namespaces: {
          [namespace.id]: {
            namespaceId: namespace.id,
            namespaceName: namespace.name,
            commonHeaders: {
              'x-api-key': mcpServerApiKey,
              'x-cockpit-api-key': userApiKey,
              'x-cockpit-license-id': license.id,
              'x-cockpit-namespace-id': namespace.id,
            },
            utilityAgents: utilityAgents.map(agent => ({
              id: agent.id,
              name: agent.name,
              type: agent.type,
            })),
          },
        },
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
