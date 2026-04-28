import { McpServerTemplate } from '@/shared/lib/types/environment'

/**
 * MCP Server Templates
 *
 * Defines all supported MCP servers with their configurations.
 * This is the single source of truth for MCP server URLs and required headers.
 *
 * IMPORTANT: URLs are loaded from environment variables.
 * Set these in your .env file:
 * - NEXT_PUBLIC_MCP_SERVER_LEGACY_URL
 * - NEXT_PUBLIC_MCP_SERVER_UTILITY_AGENT_URL
 * - NEXT_PUBLIC_MCP_SERVER_SUITE_URL
 * - NEXT_PUBLIC_MCP_SERVER_METRICS_URL
 * - NEXT_PUBLIC_MCP_SERVER_TELEMETRY_URL
 *
 * To add a new MCP server:
 * 1. Add environment variable to .env
 * 2. Add a new entry to this array using the env var
 * 3. The UI will automatically include it in environment configuration
 */

/**
 * MCP Server URLs from environment variables
 * IMPORTANT: Must use static access (process.env.VAR_NAME) for Next.js Webpack replacement
 * Dynamic access (process.env[varName]) does NOT work with NEXT_PUBLIC_* variables
 */
const MCP_URLS = {
  legacy: process.env.NEXT_PUBLIC_MCP_SERVER_LEGACY_URL || '',
  utilityAgents: process.env.NEXT_PUBLIC_MCP_SERVER_UTILITY_AGENT_URL || '',
  suite: process.env.NEXT_PUBLIC_MCP_SERVER_SUITE_URL || '',
  metrics: process.env.NEXT_PUBLIC_MCP_SERVER_METRICS_URL || '',
  telemetry: process.env.NEXT_PUBLIC_MCP_SERVER_TELEMETRY_URL || '',
}

export const MCP_SERVER_TEMPLATES: McpServerTemplate[] = [
  {
    name: 'Artifacts (Legacy)',
    key: 'connection-mcp-server-legacy',
    url: MCP_URLS.legacy,
    type: 'http',
    requiredHeaders: [
      'x-api-key',
      'x-cockpit-api-key',
      'x-cockpit-license-id',
      'x-cockpit-namespace-id',
      'x-cockpit-utility-agent-id', // ← REQUIRED for legacy server
    ],
    description:
      'Legacy MCP server for artifact management and supervisor execution. ' +
      'Requires x-cockpit-utility-agent-id to specify which supervisor to execute.',
  },
  {
    name: 'Utility Agents',
    key: 'connection-mcp-utility-agents',
    url: MCP_URLS.utilityAgents,
    type: 'http',
    requiredHeaders: [
      'x-api-key',
      'x-cockpit-api-key',
      'x-cockpit-license-id',
      'x-cockpit-namespace-id',
      // ⚠️ NO x-cockpit-utility-agent-id
    ],
    description:
      'MCP server for utility agent CRUD operations (create, update, list, delete). ' +
      'Does NOT require x-cockpit-utility-agent-id.',
  },
  {
    name: 'Suite (Management)',
    key: 'connection-mcp-suite',
    url: MCP_URLS.suite,
    type: 'http',
    requiredHeaders: [
      'x-api-key',
      'x-cockpit-api-key',
      'x-cockpit-license-id',
      'x-cockpit-namespace-id',
    ],
    description:
      'Comprehensive MCP server for managing artifacts, management agents, and schedules. ' +
      'Provides CRUD operations for multiple Cockpit resources.',
  },
  {
    name: 'Metrics',
    key: 'connection-mcp-metrics',
    url: MCP_URLS.metrics,
    type: 'http',
    requiredHeaders: [
      'x-api-key',
      'x-cockpit-api-key',
      'x-cockpit-license-id',
      'x-cockpit-namespace-id',
    ],
    description:
      'MCP server for analytics and operational metrics. ' +
      'Provides insights into user productivity, artifact statistics, and executive dashboards.',
  },
  {
    name: 'Telemetry',
    key: 'connection-mcp-telemetry',
    url: MCP_URLS.telemetry,
    type: 'http',
    requiredHeaders: [
      'x-api-key',
      'x-cockpit-api-key',
      'x-cockpit-license-id',
      'x-cockpit-namespace-id',
    ],
    description:
      'MCP server for telemetry and observability. ' +
      'Handles logging, audit trails, and application monitoring.',
  },
]

/**
 * Get MCP server template by key
 *
 * @param key - Server key (e.g., "connection-mcp-server-legacy")
 * @returns Template if found, undefined otherwise
 */
export function getMcpServerTemplate(
  key: string
): McpServerTemplate | undefined {
  return MCP_SERVER_TEMPLATES.find(t => t.key === key)
}

/**
 * Get currently active MCP servers (enabled in UI)
 *
 * For now, only Legacy and Utility Agents are active.
 * Others are reserved for future use.
 *
 * @returns Array of active server templates
 */
export function getActiveMcpServers(): McpServerTemplate[] {
  return MCP_SERVER_TEMPLATES.slice(0, 2) // Legacy + Utility Agents
}

/**
 * Get all MCP server keys
 *
 * @returns Array of server keys
 */
export function getAllMcpServerKeys(): string[] {
  return MCP_SERVER_TEMPLATES.map(t => t.key)
}

/**
 * Check if a server key is valid
 *
 * @param key - Server key to validate
 * @returns true if valid, false otherwise
 */
export function isValidMcpServerKey(key: string): boolean {
  return MCP_SERVER_TEMPLATES.some(t => t.key === key)
}

/**
 * Get required headers for a specific server
 *
 * @param key - Server key
 * @returns Array of required header names, or empty array if server not found
 */
export function getRequiredHeaders(key: string): string[] {
  const template = getMcpServerTemplate(key)
  return template?.requiredHeaders || []
}

/**
 * Check if a server requires utility-agent-id header
 *
 * @param key - Server key
 * @returns true if utility-agent-id is required
 */
export function requiresUtilityAgentId(key: string): boolean {
  const headers = getRequiredHeaders(key)
  return headers.includes('x-cockpit-utility-agent-id')
}
