/**
 * Types for SDA2 LangGraph Supervisor
 *
 * All types are designed to work dynamically with MCP Agent Card data.
 * No static agent configurations - everything comes from Cockpit.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { StructuredToolInterface } from '@langchain/core/tools'

// ============================================================================
// MCP Agent Card Types (from Cockpit)
// ============================================================================

/**
 * Team member from MCP Agent Card
 * Maps to the raw MCP response fields:
 * - name → name
 * - description → role
 * - objective → specialty (should contain artifact_type)
 * - id → id
 * - instruction → instruction (fetched separately via get_utility_agent_by_id)
 */
export interface MCPTeamMember {
  name: string
  role: string
  specialty?: string
  id?: string
  /** Type ID from Cockpit */
  typeId?: string
  /** Model used by this agent */
  model?: string
  /** Whether MCP is enabled for this agent */
  isMcpEnabled?: boolean
  /** Artifact type this agent produces - from MCP or extracted from objective */
  artifactType?: string
  /** Full instructions from Cockpit - fetched via get_utility_agent_by_id */
  instruction?: string
}

/**
 * Agent Card response from MCP get_agent_card
 */
export interface MCPAgentCard {
  name?: string
  description?: string
  instructions?: string
  capabilities?: string[]
  teamMembers?: MCPTeamMember[]
}

// ============================================================================
// LangGraph Agent Types
// ============================================================================

/**
 * Configuration for a LangGraph React Agent
 * Built dynamically from MCP team member data
 */
export interface DynamicAgentConfig {
  /** Normalized agent name (e.g., 'product_advisory_agent') */
  name: string
  /** Display name from MCP (e.g., 'Product Advisory Agent') */
  displayName: string
  /** Agent role/description */
  description: string
  /** System prompt for the agent */
  systemPrompt: string
  /** Optional specialty areas */
  specialties?: string[]
  /** Type of artifact this agent produces (extracted from MCP instructions) */
  artifactType?: string
  /** Optional tools for this agent */
  tools?: StructuredToolInterface[]
}

/**
 * Compiled agent ready for LangGraph
 */
export interface CompiledAgent {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workflow: any
  description?: string
}

// ============================================================================
// Supervisor Types
// ============================================================================

/**
 * Options for creating SDA2 Supervisor
 */
export interface CreateSDA2SupervisorOptions {
  /** Agent Card from MCP (required) */
  agentCard: MCPAgentCard
  /** LLM model to use */
  model: BaseChatModel
  /** Enable memory/checkpointing (default: true) */
  enableMemory?: boolean
  /** Project context for enriching prompts */
  projectContext?: {
    projectId: string
    projectName: string
    conversationId: string
  }
  /** Additional tools for supervisor */
  additionalTools?: StructuredToolInterface[]
}

/**
 * Result of supervisor creation
 */
export interface SDA2SupervisorResult {
  /** Compiled supervisor workflow */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supervisor: any
  /** Number of agents created */
  agentCount: number
  /** Names of agents created */
  agentNames: string[]
  /** Dynamic agent configs used */
  agentConfigs: DynamicAgentConfig[]
}

// ============================================================================
// State Types
// ============================================================================

/**
 * Artifact generated during conversation
 */
export interface ConversationArtifact {
  id: string
  type: string
  content: string
  agentName: string
  timestamp: number
}

/**
 * Handoff event between agents
 */
export interface HandoffEvent {
  from: string
  to: string
  reason: string
  timestamp: number
}

/**
 * Output mode for supervisor
 */
export type OutputMode = 'full_history' | 'last_message'
