/**
 * Environment Type Definitions
 *
 * Represents the multi-tenancy structure for MCP server configurations:
 * Environment → License → Namespace → (Utility Agents)
 */

/**
 * Template for MCP Server configuration
 * Defines the structure and required headers for each MCP server type
 */
export interface McpServerTemplate {
  /** Display name (e.g., "Artifacts (Legacy)") */
  name: string

  /** Unique key (e.g., "connection-mcp-server-legacy") */
  key: string

  /** Pre-defined server URL */
  url: string

  /** Transport type */
  type: 'http'

  /** List of required header names for this server */
  requiredHeaders: string[]

  /** Optional description */
  description?: string
}

/**
 * Reference to a Utility Agent within a namespace
 */
export interface UtilityAgentReference {
  /** UUID of the utility agent */
  id: string

  /** Display name */
  name: string

  /** Agent type */
  type: 'Supervisor' | 'Standard'
}

/**
 * Configuration for a namespace within a license
 */
export interface NamespaceConfig {
  /** Namespace UUID */
  namespaceId: string

  /** Display name (e.g., "Team A - DEV") */
  namespaceName: string

  /** Headers shared by all MCP servers in this namespace */
  commonHeaders: {
    'x-api-key': string
    'x-cockpit-api-key': string
    'x-cockpit-license-id': string
    'x-cockpit-namespace-id': string
  }

  /** Utility Agents available in this namespace */
  utilityAgents: UtilityAgentReference[]
}

/**
 * Configuration for a license (can contain multiple namespaces)
 */
export interface LicenseConfig {
  /** License UUID */
  licenseId: string

  /** Display name (e.g., "Avanade Main") */
  licenseName: string

  /** Namespaces within this license */
  namespaces: {
    [namespaceId: string]: NamespaceConfig
  }
}

/**
 * MCP Server base configuration (URL + type)
 */
export interface McpServerBase {
  /** Server URL */
  url: string

  /** Transport type */
  type: 'http'
}

/**
 * Complete Environment configuration
 *
 * An environment represents a deployment target (dev, staging, prod)
 * and contains the MCP server URLs plus multi-tenant configuration
 * (licenses → namespaces → utility agents)
 */
export interface Environment {
  /** Unique identifier */
  id: string

  /** Environment name (e.g., "DEV", "PROD") */
  name: string

  /** Optional description */
  description?: string

  /**
   * Environment type discriminator
   * - 'session': Auto-created from auth session, ephemeral (in-memory only)
   * - 'custom': Manually created via wizard, persisted as MCP artifact
   */
  type?: 'session' | 'custom'

  /** MCP Server URLs (global, not editable by user) */
  mcpServers: {
    [serverKey: string]: McpServerBase
  }

  /** Licenses in this environment */
  licenses: {
    [licenseId: string]: LicenseConfig
  }

  /** Timestamp of creation */
  createdAt: Date

  /** Timestamp of last update */
  updatedAt: Date
}

/**
 * Helper type for flattened namespace view
 * Used in UI components for easier rendering
 */
export interface FlattenedNamespace {
  environment: Environment
  license: LicenseConfig
  namespace: NamespaceConfig
}

/**
 * Validation result for environment operations
 */
export interface EnvironmentValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Statistics about an environment
 */
export interface EnvironmentStats {
  licenseCount: number
  namespaceCount: number
  utilityAgentCount: number
  mcpServerCount: number
}
