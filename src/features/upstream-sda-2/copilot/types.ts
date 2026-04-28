/**
 * Types for CopilotKit integration in Upstream SDA 2.0
 */

import type { Artifact, Conversation, Message, Project } from '../types'

/**
 * Minimal connection type used by SDA2 Copilot.
 * Extracted from @/features/connections to remove cross-feature dependency.
 */
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
// Handler Context
// ============================================================================

/**
 * Context provided to all SDA2 handlers
 * Contains state, setters, and MCP connection
 */
export interface SDA2HandlerContext {
  // Current state
  project: Project | null
  currentConversation: Conversation | null
  artifacts: Artifact[]

  // State setters
  setProject: (project: Project | null) => void
  setCurrentConversation: (conversation: Conversation | null) => void
  setArtifacts: (artifacts: Artifact[]) => void

  // MCP Connection
  mcpReady: boolean
  callMCPTool: (name: string, args: Record<string, unknown>) => Promise<unknown>

  // Services
  projectService: {
    createProject: (name: string, description?: string) => Promise<Project>
    getProject: (slug: string) => Promise<Project | null>
    updateProject: (slug: string, updates: Partial<Project>) => Promise<Project>
    listProjects: () => Promise<Project[]>
  }

  chatService: {
    createConversation: (
      projectId: string,
      title: string,
      agentType: string
    ) => Promise<Conversation>
    getConversation: (
      projectSlug: string,
      chatSlug: string
    ) => Promise<Conversation | null>
    addMessage: (
      conversation: Conversation,
      message: Message
    ) => Promise<Conversation>
  }

  artifactService: {
    createArtifact: (artifact: Partial<Artifact>) => Promise<Artifact>
    getArtifact: (id: string) => Promise<Artifact | null>
    updateArtifact: (
      id: string,
      updates: Partial<Artifact>
    ) => Promise<Artifact>
    searchArtifacts: (query: string, type?: string) => Promise<Artifact[]>
  }
}

// ============================================================================
// Handler Registry
// ============================================================================

/**
 * Action Handler definition
 */
export interface ActionHandler {
  name: string
  description: string
  parameters: Array<{
    name: string
    type: string
    description: string
    required: boolean
  }>
  execute: (args: Record<string, unknown>) => Promise<string>
  render?: (args: Record<string, unknown>) => React.ReactNode
}

/**
 * Handler Registry organized by category
 */
export interface ActionHandlerRegistry {
  // Project Management
  project_create: ActionHandler
  project_select: ActionHandler
  project_update: ActionHandler
  project_list: ActionHandler

  // Conversation Management
  conversation_create: ActionHandler
  conversation_select: ActionHandler
  conversation_addMessage: ActionHandler
  conversation_list: ActionHandler

  // Artifact Management
  artifact_create: ActionHandler
  artifact_update: ActionHandler
  artifact_search: ActionHandler
  artifact_view: ActionHandler

  // Agent Selection
  agent_select: ActionHandler

  // MCP Actions (cross-cutting)
  mcp_searchArtifacts: ActionHandler
  mcp_getTemplate: ActionHandler
  mcp_persistProject: ActionHandler
  mcp_listProjects: ActionHandler
  mcp_getMethodologyGuidance: ActionHandler
}

// ============================================================================
// MCP Integration
// ============================================================================

/**
 * MCP Action Props
 */
export interface MCPActionProps {
  mcpReady: boolean
  callMCPTool: (
    name: string,
    args: Record<string, unknown>,
    customHeaders?: Record<string, string>
  ) => Promise<unknown>
}

/**
 * MCP Tool Result
 */
export interface MCPToolResult {
  success: boolean
  data?: unknown
  error?: string
  localOnly?: boolean
}

// ============================================================================
// Context Readables
// ============================================================================

/**
 * Props for SDA2 Context Readables
 */
export interface SDA2ContextReadablesProps {
  project: Project | null
  currentConversation: Conversation | null
  artifacts: Artifact[]
}

// ============================================================================
// Provider Props
// ============================================================================

/**
 * Props for SDA2CopilotProvider
 */
export interface SDA2CopilotProviderProps {
  children: React.ReactNode

  // State from store
  project: Project | null
  currentConversation: Conversation | null
  artifacts: Artifact[]

  // State setters
  setProject: (project: Project | null) => void
  setCurrentConversation: (conversation: Conversation | null) => void
  setArtifacts: (artifacts: Artifact[]) => void

  // MCP Connection (optional) - Uses proper Connection type from connections feature
  connection?: Connection | null

  // Services
  projectService: SDA2HandlerContext['projectService']
  chatService: SDA2HandlerContext['chatService']
  artifactService: SDA2HandlerContext['artifactService']
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Persistence Result
 */
export interface PersistenceResult {
  success: boolean
  persisted: boolean
  localOnly?: boolean
  error?: string
}

/**
 * Search Result
 */
export interface SearchResult<T> {
  results: T[]
  total: number
  query: string
}
