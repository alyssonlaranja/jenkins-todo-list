/**
 * BFF (Backend for Frontend) Types
 *
 * Normalized types for BFF endpoints that transform MCP responses
 * into clean, consistent shapes for client consumption.
 */

// ============================================================================
// NORMALIZED UTILITY AGENT TYPES
// ============================================================================

export interface NormalizedUtilityAgent {
  id: string
  name: string
  description: string
  instruction: string
  objective: string
  model: string
  temperature: number
  typeName: 'Supervisor' | 'Standard'
  typeId: string
  isMcpEnabled: boolean
  isApproved: boolean
  isEnabled: boolean
  productionVersion: string | null
  team: NormalizedTeamMember[]
  createdAt: string
  updatedAt: string
}

export interface NormalizedTeamMember {
  id: string
  name: string
  type: 'Supervisor' | 'Standard'
}

// ============================================================================
// BFF RESPONSE TYPES
// ============================================================================

export interface BffPagination {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  hasMore: boolean
}

export interface BffMeta {
  cached: boolean
  cachedAt?: string
  serverProcessingMs: number
}

export interface BffUtilityAgentsResponse {
  success: boolean
  data: {
    agents: NormalizedUtilityAgent[]
    supervisors: NormalizedUtilityAgent[]
    standards: NormalizedUtilityAgent[]
    pagination: BffPagination
  }
  _meta: BffMeta
  error?: string
}

// ============================================================================
// MCP RAW RESPONSE TYPES (from MCP servers)
// ============================================================================

export interface McpUtilityAgentRaw {
  id: string
  name: string
  description?: string
  instruction?: string
  objective?: string
  model?: string
  temperature?: number
  type_id?: string
  type_name?: string
  is_mcp_enabled?: boolean
  is_approved?: boolean
  enabled?: boolean // Campo do Cockpit para habilitar/desabilitar agente
  agent_status?: 'Active' | 'Inactive' // Campo legado (deprecated)
  production_version_id?: string
  created_at?: string
  updated_at?: string
  versions?: Array<{
    id: string
    version: string
    is_production: boolean
    value?: string
  }>
  team?: Array<{
    team_member_id: string
    team_member_name: string
    team_member_type?: string
  }>
}

export interface McpListUtilityAgentsResponse {
  success: boolean
  utility_agents?: McpUtilityAgentRaw[]
  data?: McpUtilityAgentRaw[] | { data?: McpUtilityAgentRaw[] }
  total_count?: number
  page?: number
  page_size?: number
}

// ============================================================================
// BFF REQUEST TYPES
// ============================================================================

export interface BffUtilityAgentsParams {
  page?: number
  pageSize?: number
  type?: 'supervisor' | 'standard' | 'all'
  search?: string
}

// ============================================================================
// MCP CLIENT TYPES
// ============================================================================

export interface McpCallOptions {
  mcpServerUrl: string
  headers: Record<string, string>
  toolName: string
  toolArguments: Record<string, unknown>
  timeoutMs?: number
}

export interface McpCallResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  raw?: unknown
}

// ============================================================================
// AUTH CONTEXT TYPES
// ============================================================================

export interface BffAuthContext {
  apiKey: string
  cockpitApiKey: string
  licenseId: string
  namespaceId: string
}
