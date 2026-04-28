// ============================================================================
// MCP Utility Agents Server - Complete TypeScript Types
// Server Version: 2.0
// Protocol: MCP 2024-11-05
// Total Tools: 18 (14 Core + 4 Semantic)
// Source: MCP_TOOLS_REFERENCE.md
// ============================================================================

// ============================================================================
// CORE ENUMS AND CONSTANTS
// ============================================================================

export type AgentType = 'standard' | 'supervisor'
export type AgentStatus = 'Active' | 'Inactive'
export type ExecutionMode = 'parallel' | 'sequential' | 'agno'
export type ArtifactsCatalogScope = 'full' | 'main_only' | 'none'
export type CheckStatus = 'pass' | 'fail' | 'warning'
export type CheckSeverity = 'error' | 'warning' | 'info'
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'
export type ModelSource = 'front_matter' | 'agent_field' | 'default'
export type ValueStatus = 'complete' | 'encrypted'

// ============================================================================
// MCP SERVER CONFIGURATION
// ============================================================================

export interface McpServerConfig {
  servers: {
    [key: string]: {
      url: string
      headers: {
        'Content-Type'?: string
        Accept?: string
        'x-api-key': string
        'x-cockpit-api-key'?: string
        'x-cockpit-license-id'?: string
        'x-cockpit-namespace-id': string
        'x-cockpit-utility-agent-id'?: string
      }
      type?: string
      transport?: string
    }
  }
}

export interface McpTool {
  name: string
  description: string
  inputSchema: any
}

// ============================================================================
// CORE AGENT TYPES
// ============================================================================

export interface UtilityAgent {
  id: string
  name: string
  description: string
  objective?: string
  type: AgentType
  instruction: string
  model: string
  temperature: number
  prompt_template?: string | null
  agent_status: AgentStatus
  productionVersion?: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  team_member_id: string
  team_member_name: string
  team_member_type: AgentType
}

export interface AgentVersion {
  id: string
  version: string
  instruction?: string
  created_at: string
  is_production: boolean
}

export interface AgentTypeInfo {
  id: string
  name: string
  description: string
}

// ============================================================================
// MCP CONNECTION TYPES
// ============================================================================

export interface MCPConnection {
  key: string
  description: string
  url?: string
  type?: string
  secret?: boolean
  fk_artifact_id?: string
  fk_utilityagent_id?: string
  artifact_version_id?: string
  value?: any
}

// ============================================================================
// FRONT MATTER TYPES
// ============================================================================

export interface FrontMatter {
  has_front_matter: boolean
  execution_mode?: ExecutionMode
  config: {
    model?: string
    temperature?: number
    max_tokens?: number
    tools?: string[]
    [key: string]: any
  }
}

export interface FrontMatterDetails {
  execution_mode?: ExecutionMode
  tools_configured?: string[]
  model_configured?: string
  uses_langgraph_supervisor?: boolean
  validation_errors: string[]
}

// ============================================================================
// ARTIFACT TYPES
// ============================================================================

export interface Artifact {
  id: string
  key: string
  value: string
  description: string
  type?: string
  artifact_type_name?: string
  accessibility?: string
  tags?: string[]
  version?: string
  productionVersion?: string
  secret?: boolean
  created_at?: string
  updated_at?: string
}

export interface ArtifactDependency {
  key: string
  description: string
  value: string
  type: string
  version: string
  productionVersion: string
  secret: boolean
  _value_status: ValueStatus
  _referenced_by?: string[]
  _reference_count?: number
}

export interface ArtifactPosition {
  line: number
  column: number
  key: string
  context: string
}

export interface ArtifactLocations {
  total_count: number
  in_front_matter: string[]
  in_instruction: string[]
  by_type: Record<string, number>
  missing: string[]
  positions: ArtifactPosition[]
}

export interface ArtifactUsage {
  referenced_artifacts: string[]
  placeholder_count: number
  locations: ArtifactLocations
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

export interface ModelConfiguration {
  configured?: string
  fallback: string
  effective: string
  source: ModelSource
}

// ============================================================================
// VERSION INFORMATION
// ============================================================================

export interface VersionInfo {
  production: string
  total: number
  latest: string
  history?: AgentVersion[]
}

// ============================================================================
// PAGINATION TYPES (MCP Cursor-Based)
// ============================================================================

export interface CursorPagination {
  current_cursor: string
  next_cursor: string | null
  has_more: boolean
  total_count: number
  page_size: number
}

export interface PageBasedPagination {
  current_page: number
  total_pages: number
  total_items: number
  page_size: number
  has_more: boolean
}

// ============================================================================
// REQUEST TYPES - CORE CRUD
// ============================================================================

export interface CreateAgentRequest {
  name: string
  description: string
  type: AgentType
  instruction: string
  objective?: string
  model?: string
  temperature?: number
  prompt_template?: string | null
  mcp_connections?: string[]
  agent_status?: AgentStatus
}

export interface UpdateAgentRequest {
  agent_id: string
  name?: string
  description?: string
  instruction?: string
  objective?: string
  model?: string
  temperature?: number
  prompt_template?: string | null
  agent_status?: AgentStatus
  artifact_version_id?: string
}

export interface GetAgentByIdRequest {
  agent_id: string
}

export interface GetAgentVersionRequest {
  agent_id: string
  version_number: string
}

export interface ListAgentsRequest {
  cursor?: string
  page_size?: number
  agent_type?: AgentType | 'all'
}

export interface SearchAgentsRequest {
  name_pattern?: string
  agent_type?: AgentType | 'all'
  cursor?: string
  page_size?: number
}

export interface CreateAgentTeamRequest {
  supervisor_id: string
  member_id: string
  supervisor_version?: string
}

export interface DeleteAgentTeamRequest {
  supervisor_id: string
  member_id: string
}

export interface CreateMCPConnectionRequest {
  utility_agent_id: string
  artifact_key: string
  agent_version?: string
}

export interface DeleteMCPConnectionRequest {
  utility_agent_id: string
  artifact_key: string
}

export interface GetMCPConnectionsByAgentRequest {
  utility_agent_id: string
}

export interface SetVersionProductionRequest {
  agent_id: string
  version_number: string
}

// ============================================================================
// REQUEST TYPES - SEMANTIC SEARCH
// ============================================================================

export interface SearchAgentsByInstructionRequest {
  query: string
  top_k?: number
  min_similarity?: number
  agent_type?: AgentType | 'all'
}

export interface FindSimilarAgentsRequest {
  agent_id: string
  top_k?: number
  min_similarity?: number
  same_type_only?: boolean
}

export interface SemanticSearchArtifactsRequest {
  query: string
  top_k?: number
  min_similarity?: number
  include_secrets?: boolean
  accessibility_level?: 'all' | 'user' | 'namespace' | 'license'
}

export interface SearchAgentsByBlueprintRequest {
  query: string
  top_k?: number
  min_similarity?: number
  agent_type?: AgentType | 'all'
  agent_ids?: string[]
}

// ============================================================================
// REQUEST TYPES - VALIDATION
// ============================================================================

export interface InspectAgentRequest {
  utility_agent_id: string
  artifacts_catalog_scope?: ArtifactsCatalogScope
  include_versions_details?: boolean
  include_versions_team_details?: boolean
}

export interface ValidateAgentInstructionRequest {
  instruction: string
}

export interface ValidateFrontMatterRequest {
  instruction: string
}

export interface CheckAgentHealthRequest {
  utility_agent_id: string
}

// ============================================================================
// RESPONSE TYPES - BASE
// ============================================================================

export interface MCPToolResponse<T = any> {
  success: boolean
  message?: string
  error?: string
  data?: T
}

export interface ApiResponse<T = any> {
  success: boolean
  error?: string
  message?: string
  data?: T
}

// ============================================================================
// RESPONSE TYPES - CORE CRUD
// ============================================================================

export interface CreateAgentResponse {
  success: true
  message: string
  data: UtilityAgent
}

export interface UpdateAgentResponse {
  success: true
  message: string
  data: UtilityAgent
}

export interface GetAgentByIdResponse {
  success: true
  data: {
    id: string
    name: string
    description: string
    objective: string
    type: AgentType
    instruction: string
    model: string
    temperature: number
    prompt_template: string | null
    agent_status: AgentStatus
    productionVersion: string
    team_members: TeamMember[]
    versions: AgentVersion[]
    mcp_connections: MCPConnection[]
    front_matter: FrontMatter
    artifact_dependencies: {
      keys: string[]
      total_count: number
      in_front_matter: string[]
      in_instruction: string[]
      by_type: Record<string, number>
      missing: string[]
      positions: ArtifactPosition[]
    }
    created_at: string
    updated_at: string
  }
}

export interface GetAgentVersionResponse {
  success: true
  data: AgentVersion
}

export interface ListAgentsResponse {
  success: true
  data: {
    data: UtilityAgent[]
    pagination: CursorPagination
  }
}

export interface SearchAgentsResponse {
  success: true
  data: {
    data: UtilityAgent[]
    pagination: CursorPagination
  }
}

export interface ListAgentTypesResponse {
  success: true
  data: AgentTypeInfo[]
}

export interface CreateAgentTeamResponse {
  success: true
  message: string
}

export interface DeleteAgentTeamResponse {
  success: true
  message: string
}

export interface CreateMCPConnectionResponse {
  success: true
  message: string
}

export interface DeleteMCPConnectionResponse {
  success: true
  message: string
}

export interface ListMCPConnectionsResponse {
  success: true
  data: MCPConnection[]
}

export interface GetMCPConnectionsByAgentResponse {
  success: true
  data: MCPConnection[]
}

export interface SetVersionProductionResponse {
  success: true
  message: string
}

// ============================================================================
// RESPONSE TYPES - SEMANTIC SEARCH
// ============================================================================

export interface SearchAgentResult {
  agent_id: string
  name: string
  description: string
  type: AgentType
  similarity_score: number
  instruction_preview: string
  model: string
}

export interface SearchAgentsByInstructionResponse {
  success: true
  message: string
  matched_agents: SearchAgentResult[]
  total_searched: number
  query: string
  search_params: {
    top_k: number
    min_similarity: number
    agent_type: AgentType | 'all'
  }
}

export interface FindSimilarAgentsResponse {
  success: true
  message: string
  reference_agent: {
    agent_id: string
    name: string
    description: string
    type: AgentType
  }
  similar_agents: SearchAgentResult[]
  total_compared: number
  search_params: {
    top_k: number
    min_similarity: number
    same_type_only: boolean
  }
}

export interface SemanticArtifactResult {
  artifact_id: string
  key: string
  description: string
  value: string
  type: string
  secret: boolean
  similarity_score: number
  accessibility: string
}

export interface SemanticSearchArtifactsResponse {
  success: true
  message: string
  matched_artifacts: SemanticArtifactResult[]
  total_searched: number
  query: string
  search_params: {
    top_k: number
    min_similarity: number
    include_secrets: boolean
    accessibility_level: string
  }
}

export interface BlueprintSearchResult {
  agent_id: string
  name: string
  description: string
  objective: string
  type: AgentType
  similarity_score: number
  model: string
  artifacts_count: number
  mcp_connections_count: number
  team_members_count: number
  instruction_preview: string
  rich_context: {
    artifacts: string[]
    mcps: string[]
    tools: string[]
  }
  versions: {
    production: string
    total: number
    latest: string
  }
}

export interface SearchAgentsByBlueprintResponse {
  success: true
  message: string
  matched_agents: BlueprintSearchResult[]
  total_searched: number
  query: string
  search_params: {
    top_k: number
    min_similarity: number
    agent_type: AgentType | 'all'
    used_agent_ids_filter: boolean
  }
  search_type: string
  tips: string[]
  next_steps: Array<{
    action: string
    description: string
    tool: string
  }>
}

// ============================================================================
// RESPONSE TYPES - VALIDATION
// ============================================================================

export interface InspectAgentResponse {
  success: true
  agent: {
    id: string
    name: string
    description: string
    objective: string
    type: AgentType
    instruction: string
    model: ModelConfiguration
    has_front_matter: boolean
    front_matter_details?: FrontMatterDetails
    artifacts: ArtifactDependency[]
    artifacts_count: number
    artifact_usage: ArtifactUsage
    mcp_connections: MCPConnection[]
    mcp_connections_count: number
    team: any[]
    team_members_count: number
    versions: VersionInfo
    created_at: string
    updated_at: string
  }
  artifacts_catalog: Record<string, ArtifactDependency>
  summary: {
    agent_type: AgentType
    has_front_matter: boolean
    total_knowledge_artifacts: number
    total_mcp_connections: number
    total_team_members: number
    team_types?: {
      supervisor: number
      standard: number
    }
    versions_processed: number
    total_versions: number
    unique_artifacts_in_catalog: number
  }
}

export interface ValidationError {
  severity: 'error' | 'warning'
  message: string
  line?: number
  suggestion?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  front_matter?: {
    valid: boolean
    parsed_config?: any
  }
  artifacts?: {
    valid: boolean
    found_placeholders: string[]
    missing: string[]
    available: number
  }
  warnings?: string[]
}

export interface ValidateFrontMatterResponse {
  success: true
  valid: boolean
  parsed_config?: any
  errors: ValidationError[]
}

export interface HealthCheck {
  check: string
  status: CheckStatus
  severity: CheckSeverity
  message: string
  details?: any
}

export interface HealthCheckResult {
  status: HealthStatus
  agent_id: string
  agent_name: string
  checks: HealthCheck[]
  issues: number
  total_checks: number
  summary: {
    errors: number
    warnings: number
    info: number
  }
}

// ============================================================================
// TOOL CALL TYPES
// ============================================================================

export interface ToolCallRequest {
  name: string
  arguments: Record<string, any>
}

export interface ToolCallResponse {
  content: any
  isError: boolean
}

// ============================================================================
// ARTIFACT LIST TYPES (Legacy - for backward compatibility)
// ============================================================================

export interface ArtifactListParams {
  page?: number
  page_size?: number
  cursor?: string
  search?: string
  type?: string
}

export interface ArtifactListResponse {
  artifacts: Artifact[]
  total: number
  page?: number
  page_size?: number
  pagination?: CursorPagination
}

// ============================================================================
// MCP PROTOCOL TYPES
// ============================================================================

export interface MCPInitializeParams {
  protocolVersion: string
  capabilities: {
    tools?: Record<string, any>
    resources?: Record<string, any>
    prompts?: Record<string, any>
  }
  clientInfo: {
    name: string
    version: string
  }
}

export interface MCPInitializeResponse {
  protocolVersion: string
  capabilities: {
    tools?: Record<string, any>
    resources?: Record<string, any>
    prompts?: Record<string, any>
  }
  serverInfo: {
    name: string
    version: string
  }
}

export interface MCPErrorCode {
  PARSE_ERROR: -32700
  INVALID_REQUEST: -32600
  METHOD_NOT_FOUND: -32601
  INVALID_PARAMS: -32602
  INTERNAL_ERROR: -32603
}

export interface MCPError {
  code: number
  message: string
  data?: any
}

export interface MCPResponse<T = any> {
  jsonrpc: '2.0'
  result?: T
  error?: MCPError
  id: number | string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isAgentType(value: string): value is AgentType {
  return value === 'standard' || value === 'supervisor'
}

export function isAgentStatus(value: string): value is AgentStatus {
  return value === 'Active' || value === 'Inactive'
}

export function isExecutionMode(value: string): value is ExecutionMode {
  return value === 'parallel' || value === 'sequential' || value === 'agno'
}

export function isMCPError(response: any): response is MCPResponse<never> {
  return response && 'error' in response && response.jsonrpc === '2.0'
}

export function isCursorPagination(
  pagination: any
): pagination is CursorPagination {
  return (
    pagination &&
    'current_cursor' in pagination &&
    'next_cursor' in pagination &&
    'has_more' in pagination
  )
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const MCP_ERROR_CODES: MCPErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
}

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100
export const DEFAULT_TOP_K = 5
export const MAX_TOP_K = 20
export const DEFAULT_MIN_SIMILARITY = 0.3
export const DEFAULT_BLUEPRINT_MIN_SIMILARITY = 0.4

// ============================================================================
// TOOL NAMES (for type safety)
// ============================================================================

export const MCP_TOOLS = {
  // Core CRUD
  CREATE_UTILITY_AGENT: 'create_utility_agent',
  UPDATE_UTILITY_AGENT: 'update_utility_agent',
  GET_UTILITY_AGENT_BY_ID: 'get_utility_agent_by_id',
  GET_UTILITY_AGENT_VERSION: 'get_utility_agent_version',
  LIST_UTILITY_AGENTS: 'list_utility_agents',
  SEARCH_UTILITY_AGENTS: 'search_utility_agents',
  CREATE_AGENT_TEAM: 'create_agent_team',
  DELETE_AGENT_TEAM: 'delete_agent_team',
  CREATE_MCP_CONNECTION: 'create_mcp_connection',
  DELETE_MCP_CONNECTION: 'delete_mcp_connection',
  LIST_MCP_CONNECTIONS: 'list_mcp_connections',
  GET_MCP_CONNECTIONS_BY_AGENT: 'get_mcp_connections_by_agent',
  LIST_AGENT_TYPES: 'list_agent_types',
  SET_VERSION_PRODUCTION: 'set_version_production',

  // Semantic Search
  SEARCH_AGENTS_BY_INSTRUCTION: 'search_agents_by_instruction',
  FIND_SIMILAR_AGENTS: 'find_similar_agents',
  SEMANTIC_SEARCH_ARTIFACTS: 'semantic_search_artifacts',
  SEARCH_AGENTS_BY_BLUEPRINT: 'search_agents_by_blueprint',

  // Validation
  INSPECT_AGENT: 'inspect_agent',
  VALIDATE_AGENT_INSTRUCTION: 'validate_agent_instruction',
  VALIDATE_FRONT_MATTER: 'validate_front_matter',
  CHECK_AGENT_HEALTH: 'check_agent_health',

  // Artifacts (Legacy - from mcp-suite)
  LIST_ARTIFACTS: 'list_artifacts',
  CREATE_ARTIFACT: 'create_artifact',
  GET_ARTIFACT: 'get_artifact',
  UPDATE_ARTIFACT: 'update_artifact',
  DELETE_ARTIFACT: 'delete_artifact',
} as const

export type MCPToolName = (typeof MCP_TOOLS)[keyof typeof MCP_TOOLS]
