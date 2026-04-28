/**
 * Dynamic Agents Module - Type Definitions
 *
 * Types for dynamic agent configuration fetched from the Cockpit Platform.
 * Agents are no longer hardcoded - they are fetched/created at runtime.
 *
 * @see DYNAMIC_AGENTS_MODULE_PROPOSAL.md
 */
import type {
  ArtifactDependency,
  FrontMatterDetails,
  MCPConnection,
  ModelConfiguration,
} from '@/shared/lib/mcp/types'

// ============================================================================
// ARTIFACT CATALOG TYPES
// ============================================================================

/**
 * Artifact catalog entry from inspect_agent response
 * Note: artifacts_catalog is an OBJECT indexed by key, not an array!
 */
export interface ArtifactCatalogEntry {
  key: string
  artifact_id?: string
  value?: string
  description?: string
  type?: string
  accessibility?: string
  secret?: boolean
  version?: string
  productionVersion?: string
  tags?: string
  _value_status?: 'complete' | 'encrypted'
  _is_mcp?: boolean
  missing?: boolean
  error?: string
}

/**
 * Artifacts catalog - object indexed by artifact key
 */
export type ArtifactsCatalog = Record<string, ArtifactCatalogEntry>

// ============================================================================
// FRONT MATTER TYPES
// ============================================================================

/**
 * Parsed front matter configuration
 */
export interface ParsedFrontMatter {
  // Model configuration
  model?: string
  temperature?: number
  max_tokens?: number

  // LangGraph Supervisor settings
  langgraph_supervisor?: {
    use_compressed_prompt?: boolean
    output_mode?: 'full_history' | 'last_message'
    add_handoff_messages?: boolean
    handoff_tool_prefix?: string
    trim_history?: {
      enabled?: boolean
      max_tokens?: number
      strategy?: 'last' | 'first'
    }
  }

  // Other settings
  include_datetime?: boolean
  execution_mode?: 'parallel' | 'sequential' | 'agno'
  tools?: string[]

  // Custom fields
  [key: string]: unknown
}

// ============================================================================
// DYNAMIC AGENT CONFIG
// ============================================================================

/**
 * Team member info from blueprint
 */
export interface TeamMemberInfo {
  id: string
  name: string
  type: 'standard' | 'supervisor'
  description?: string
  instruction?: string
  artifacts?: Array<{ key: string }>
  mcp_connections?: Array<{ key: string }>
}

/**
 * Dynamic agent configuration fetched from the platform
 */
export interface DynamicAgentConfig {
  // Identity
  id: string
  name: string
  type: 'standard' | 'supervisor'

  // Content (with artifacts resolved)
  instruction: string
  rawInstruction: string // Original with ${KEY} placeholders
  description: string
  objective: string

  // Model configuration
  model: ModelConfiguration

  // Front matter (parsed YAML)
  frontMatter: ParsedFrontMatter
  hasFrontMatter: boolean
  frontMatterDetails?: FrontMatterDetails

  // Artifacts
  artifacts: ArtifactDependency[]
  artifactsCatalog: ArtifactsCatalog
  artifactsCount: number

  // MCP Connections
  mcpConnections: MCPConnection[]
  mcpConnectionsCount: number

  // Team (if supervisor)
  team: TeamMemberInfo[]
  teamMembersCount: number

  // Versions
  versions: {
    production: string
    total: number
    latest: string
  }

  // Timestamps
  createdAt: string
  updatedAt: string
}

// ============================================================================
// DEFAULT AGENT CONFIG (FALLBACK)
// ============================================================================

/**
 * Default configuration for creating an agent if it doesn't exist
 */
export interface DefaultAgentConfig {
  name: string
  description: string
  instruction: string
  objective: string
  model?: string
  isMcpEnabled?: boolean
  type?: 'standard' | 'supervisor'
}

// ============================================================================
// HOOK OPTIONS
// ============================================================================

/**
 * Options for useDynamicAgent hook
 */
export interface UseDynamicAgentOptions {
  /**
   * Agent name to fetch (exact match)
   */
  agentName: string

  /**
   * Fallback config if agent doesn't exist and autoCreate is false
   */
  fallbackConfig?: DefaultAgentConfig

  /**
   * Auto-create agent if it doesn't exist
   * @default false
   */
  autoCreate?: boolean

  /**
   * Default config for auto-creation
   */
  defaultConfig?: DefaultAgentConfig

  /**
   * Refresh interval in milliseconds
   * @default 0 (no auto-refresh)
   */
  refreshInterval?: number

  /**
   * Whether to resolve artifact placeholders
   * @default true
   */
  resolveArtifacts?: boolean
}

/**
 * Options for useEnsureAgent hook
 */
export interface UseEnsureAgentOptions {
  /**
   * Maximum retry attempts for searching after creation
   * @default 5
   */
  maxRetries?: number

  /**
   * Initial delay between retries in ms
   * @default 500
   */
  initialDelayMs?: number
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useDynamicAgent hook
 */
export interface UseDynamicAgentReturn {
  agentConfig: DynamicAgentConfig | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  isUsingFallback: boolean
}

/**
 * Return type for useEnsureAgent hook
 */
export interface UseEnsureAgentReturn {
  ensureAgent: () => Promise<{ id: string; created: boolean }>
  isEnsuring: boolean
  error: string | null
}

// ============================================================================
// AGENT TYPE INFO (from list_agent_types)
// ============================================================================

export interface AgentTypeInfo {
  id: string
  name: string
  description?: string
}

// ============================================================================
// PORTAL AGENT NAMES
// ============================================================================

/**
 * Standard agent names for portal modules
 */
export const PORTAL_AGENT_NAMES = {
  ATLAS_QUICK: 'MCP_PORTAL_ATLAS_AGENT',
  KANBAN: 'MCP_PORTAL_KANBAN_AGENT',
  UPSTREAM: 'MCP_PORTAL_UPSTREAM_AGENT',
  DOWNSTREAM: 'MCP_PORTAL_DOWNSTREAM_AGENT',
  MIGRATION: 'MCP_PORTAL_MIGRATION_AGENT',
  ONBOARDING: 'MCP_PORTAL_ONBOARDING_AGENT',
  FEEDBACK: 'MCP_PORTAL_FEEDBACK_AGENT',
} as const

export type PortalAgentName =
  (typeof PORTAL_AGENT_NAMES)[keyof typeof PORTAL_AGENT_NAMES]
