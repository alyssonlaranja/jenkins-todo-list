/**
 * Agent Registry - Complete Agent Configurations
 *
 * Unified registry for ALL agents in the platform:
 * - CopilotKit agents (frontend, i18n-based)
 * - LangGraph agents (backend, StateGraph)
 * - DeepAgents agents (backend, subagent orchestration)
 *
 * @module dynamic-agents/agent-registry
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Agent technology stack
 */
export type AgentTechnology = 'copilotkit' | 'langgraph' | 'deepagents'

/**
 * Agent type
 */
export type AgentType = 'standard' | 'supervisor' | 'analyzer' | 'orchestrator'

/**
 * Module where agent is used
 */
export type AgentModule =
  | 'global'
  | 'atlas'
  | 'kanban'
  | 'upstream'
  | 'downstream'
  | 'migration'
  | 'onboarding'
  | 'environment'
  | 'knowledge-base'
  | 'prompt-builder'
  | 'utility-agents'
  | 'artifacts'
  | 'mcp-servers'
  | 'training'
  | 'feedback'

/**
 * Agent configuration structure (for CopilotKit agents)
 * Instructions are loaded from i18n at runtime
 */
export interface AgentConfig {
  name: string
  description: string
  objective?: string
  instruction: string
}

/**
 * Tool definition for LangGraph/DeepAgents
 */
export interface AgentToolDef {
  name: string
  description: string
  category: 'analysis' | 'action' | 'query' | 'mutation'
}

/**
 * Complete agent registry entry
 */
export interface AgentRegistryEntry {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Description */
  description: string
  /** Technology stack */
  technology: AgentTechnology
  /** Agent type */
  type: AgentType
  /** Module where used */
  module: AgentModule
  /** i18n path for CopilotKit agents (agents.{path}) */
  i18nPath?: string
  /** i18n prompt key for LangGraph/DeepAgents (from AGENT_PROMPT_PATHS) */
  promptKey?:
    | 'feedback-analyzer'
    | 'training-analyzer'
    | 'feedback-deep-agent'
    | 'training-deep-agent'
  /** Source file path */
  sourceFile: string
  /** API route for LangGraph/DeepAgents */
  apiRoute?: string
  /** Tools available to this agent */
  tools?: AgentToolDef[]
  /** Subagents for DeepAgents orchestrators */
  subagents?: string[]
  /** Whether agent is currently active */
  isActive: boolean
}

/**
 * All agent identifiers
 */
export type AgentId =
  // CopilotKit Agents
  | 'ATLAS_QUICK'
  | 'ATLAS_FULL'
  | 'KANBAN'
  | 'UPSTREAM_WIZARD'
  | 'UPSTREAM_MIGRATION'
  | 'DOWNSTREAM_WIZARD'
  | 'MIGRATION_WIZARD'
  | 'ONBOARDING_WIZARD'
  | 'ONBOARDING_MANIFEST'
  | 'ENVIRONMENT'
  | 'KNOWLEDGE_BASE'
  | 'PROMPT_BUILDER'
  | 'UTILITY_AGENTS'
  | 'ARTIFACTS'
  | 'MCP_SERVERS'
  // LangGraph Agents
  | 'FEEDBACK_ANALYZER'
  | 'TRAINING_ANALYZER'
  // DeepAgents
  | 'FEEDBACK_DEEP_AGENT'
  | 'TRAINING_DEEP_AGENT'

// ============================================================================
// AGENT REGISTRY
// ============================================================================

/**
 * Complete Agent Registry
 *
 * Contains ALL agents used in the platform with their configurations
 */
export const AGENT_REGISTRY: Record<AgentId, AgentRegistryEntry> = {
  // ==========================================================================
  // COPILOTKIT AGENTS - Frontend, i18n-based
  // ==========================================================================

  ATLAS_QUICK: {
    id: 'ATLAS_QUICK',
    name: 'Atlas Quick Agent',
    description: 'Quick AI assistant for navigation and general questions',
    technology: 'copilotkit',
    type: 'standard',
    module: 'atlas',
    i18nPath: 'atlas.quick',
    sourceFile: 'src/features/atlas/components/chat/atlas-chat.tsx',
    isActive: true,
  },

  ATLAS_FULL: {
    id: 'ATLAS_FULL',
    name: 'Atlas Full Agent',
    description: 'Comprehensive AI assistant with advanced capabilities',
    technology: 'copilotkit',
    type: 'supervisor',
    module: 'atlas',
    i18nPath: 'atlas.full',
    sourceFile: 'src/features/atlas/components/chat/atlas-chat.tsx',
    isActive: true,
  },

  KANBAN: {
    id: 'KANBAN',
    name: 'Kanban Agent',
    description: 'AI assistant for feedback Kanban board management',
    technology: 'copilotkit',
    type: 'standard',
    module: 'kanban',
    i18nPath: 'kanban.main',
    sourceFile: 'src/features/kanban/components/kanban-chat.tsx',
    tools: [
      {
        name: 'moveFeedback',
        description: 'Move feedback between columns',
        category: 'mutation',
      },
      {
        name: 'analyzeFeedback',
        description: 'Analyze feedback patterns',
        category: 'analysis',
      },
    ],
    isActive: true,
  },

  UPSTREAM_WIZARD: {
    id: 'UPSTREAM_WIZARD',
    name: 'Upstream Wizard Agent',
    description: 'AI assistant for 7-stage epic creation wizard',
    technology: 'copilotkit',
    type: 'supervisor',
    module: 'upstream',
    i18nPath: 'upstream.wizard',
    sourceFile: 'src/features/upstream/components/wizard/wizard-chat.tsx',
    tools: [
      {
        name: 'navigateToStep',
        description: 'Navigate wizard steps',
        category: 'action',
      },
      {
        name: 'fillField',
        description: 'Fill epic fields with AI',
        category: 'mutation',
      },
      {
        name: 'generateContent',
        description: 'Generate content for fields',
        category: 'mutation',
      },
    ],
    isActive: true,
  },

  UPSTREAM_MIGRATION: {
    id: 'UPSTREAM_MIGRATION',
    name: 'Upstream Migration Agent',
    description: 'AI assistant for epic migration between environments',
    technology: 'copilotkit',
    type: 'standard',
    module: 'upstream',
    i18nPath: 'upstream.migration',
    sourceFile: 'src/features/upstream/components/migration/migration-chat.tsx',
    isActive: true,
  },

  DOWNSTREAM_WIZARD: {
    id: 'DOWNSTREAM_WIZARD',
    name: 'Downstream Wizard Agent',
    description: 'AI assistant for downstream project execution',
    technology: 'copilotkit',
    type: 'standard',
    module: 'downstream',
    i18nPath: 'downstream.wizard',
    sourceFile: 'src/features/downstream/components/wizard/wizard-chat.tsx',
    isActive: true,
  },

  MIGRATION_WIZARD: {
    id: 'MIGRATION_WIZARD',
    name: 'Migration Wizard Agent',
    description: 'AI assistant for 5-step migration process',
    technology: 'copilotkit',
    type: 'supervisor',
    module: 'migration',
    i18nPath: 'migration.wizard',
    sourceFile: 'src/features/migration/components/wizard/migration-chat.tsx',
    tools: [
      {
        name: 'selectEnvironment',
        description: 'Select source/target environment',
        category: 'action',
      },
      {
        name: 'discoverItems',
        description: 'Discover items to migrate',
        category: 'query',
      },
      {
        name: 'executeMigration',
        description: 'Execute migration',
        category: 'mutation',
      },
    ],
    isActive: true,
  },

  ONBOARDING_WIZARD: {
    id: 'ONBOARDING_WIZARD',
    name: 'Onboarding Wizard Agent',
    description: 'AI assistant for new user onboarding',
    technology: 'copilotkit',
    type: 'supervisor',
    module: 'onboarding',
    i18nPath: 'onboarding.wizard',
    sourceFile: 'src/features/onboarding/components/wizard/onboarding-chat.tsx',
    isActive: true,
  },

  ONBOARDING_MANIFEST: {
    id: 'ONBOARDING_MANIFEST',
    name: 'Manifest Creator Agent',
    description: 'AI assistant for creating agent manifests',
    technology: 'copilotkit',
    type: 'standard',
    module: 'onboarding',
    i18nPath: 'onboarding.manifest',
    sourceFile: 'src/features/onboarding/components/manifest/manifest-chat.tsx',
    isActive: true,
  },

  ENVIRONMENT: {
    id: 'ENVIRONMENT',
    name: 'Environment Agent',
    description: 'AI assistant for environment management',
    technology: 'copilotkit',
    type: 'standard',
    module: 'environment',
    i18nPath: 'environment.main',
    sourceFile: 'src/features/environment/components/environment-chat.tsx',
    isActive: true,
  },

  KNOWLEDGE_BASE: {
    id: 'KNOWLEDGE_BASE',
    name: 'Knowledge Base Agent',
    description: 'AI assistant for documentation and knowledge management',
    technology: 'copilotkit',
    type: 'standard',
    module: 'knowledge-base',
    i18nPath: 'knowledgeBase.main',
    sourceFile: 'src/features/knowledge-base/components/kb-chat.tsx',
    isActive: true,
  },

  PROMPT_BUILDER: {
    id: 'PROMPT_BUILDER',
    name: 'Prompt Builder Agent',
    description: 'AI assistant for prompt engineering',
    technology: 'copilotkit',
    type: 'standard',
    module: 'prompt-builder',
    i18nPath: 'promptBuilder.main',
    sourceFile: 'src/features/prompt-builder/components/prompt-chat.tsx',
    isActive: true,
  },

  UTILITY_AGENTS: {
    id: 'UTILITY_AGENTS',
    name: 'Utility Agents Manager',
    description: 'AI assistant for creating and managing utility agents',
    technology: 'copilotkit',
    type: 'supervisor',
    module: 'utility-agents',
    i18nPath: 'utilityAgents.main',
    sourceFile: 'src/features/utility-agents/components/agents-chat.tsx',
    isActive: true,
  },

  ARTIFACTS: {
    id: 'ARTIFACTS',
    name: 'Artifacts Agent',
    description: 'AI assistant for artifact management',
    technology: 'copilotkit',
    type: 'standard',
    module: 'artifacts',
    i18nPath: 'artifacts.main',
    sourceFile: 'src/features/artifacts/components/artifacts-chat.tsx',
    isActive: true,
  },

  MCP_SERVERS: {
    id: 'MCP_SERVERS',
    name: 'MCP Servers Agent',
    description: 'AI assistant for MCP server configuration',
    technology: 'copilotkit',
    type: 'standard',
    module: 'mcp-servers',
    i18nPath: 'mcpServers.main',
    sourceFile: 'src/features/mcp-servers/components/mcp-chat.tsx',
    isActive: true,
  },

  // ==========================================================================
  // LANGGRAPH AGENTS - Backend, StateGraph
  // ==========================================================================

  FEEDBACK_ANALYZER: {
    id: 'FEEDBACK_ANALYZER',
    name: 'Feedback Analyzer Agent',
    description: 'LangGraph agent for analyzing and categorizing feedback',
    technology: 'langgraph',
    type: 'analyzer',
    module: 'feedback',
    promptKey: 'feedback-analyzer',
    sourceFile: 'src/agents/feedback-analyzer/graph.ts',
    apiRoute: '/api/agents/feedback-analyzer',
    tools: [
      {
        name: 'analyze_feedback',
        description:
          'Analyze feedback content, extract category/severity/keywords',
        category: 'analysis',
      },
      {
        name: 'check_duplicates',
        description: 'Check for duplicate feedbacks',
        category: 'query',
      },
      {
        name: 'calculate_priority',
        description: 'Calculate priority score',
        category: 'analysis',
      },
      {
        name: 'suggest_resolution',
        description: 'Suggest resolution steps',
        category: 'analysis',
      },
      {
        name: 'suggest_kanban_column',
        description: 'Suggest Kanban column transition',
        category: 'action',
      },
      {
        name: 'get_kanban_summary',
        description: 'Get Kanban board summary',
        category: 'query',
      },
      {
        name: 'add_comment',
        description: 'Add comment to feedback',
        category: 'mutation',
      },
      {
        name: 'suggest_transition_with_comment',
        description: 'Suggest transition with comment',
        category: 'action',
      },
      {
        name: 'get_feedback_comments',
        description: 'Get feedback comments',
        category: 'query',
      },
      {
        name: 'get_feedback_history',
        description: 'Get feedback history',
        category: 'query',
      },
      {
        name: 'get_related_feedbacks',
        description: 'Get related feedbacks',
        category: 'query',
      },
      {
        name: 'mention_user_or_agent',
        description: 'Mention user or agent',
        category: 'action',
      },
    ],
    isActive: true,
  },

  TRAINING_ANALYZER: {
    id: 'TRAINING_ANALYZER',
    name: 'Training Analyzer Agent',
    description:
      'LangGraph agent for analyzing documents and generating training structures',
    technology: 'langgraph',
    type: 'analyzer',
    module: 'training',
    promptKey: 'training-analyzer',
    sourceFile: 'src/agents/training-analyzer/graph.ts',
    apiRoute: '/api/agents/training-analyzer',
    tools: [
      {
        name: 'extract_document_content',
        description: 'Extract content from documents',
        category: 'analysis',
      },
      {
        name: 'propose_training_structure',
        description: 'Propose training structure',
        category: 'analysis',
      },
      {
        name: 'generate_quiz',
        description: 'Generate quiz questions',
        category: 'mutation',
      },
    ],
    isActive: true,
  },

  // ==========================================================================
  // DEEPAGENTS - Backend, Subagent Orchestration
  // ==========================================================================

  FEEDBACK_DEEP_AGENT: {
    id: 'FEEDBACK_DEEP_AGENT',
    name: 'Feedback Deep Agent',
    description:
      'DeepAgents orchestrator for complex feedback analysis with subagents',
    technology: 'deepagents',
    type: 'orchestrator',
    module: 'feedback',
    promptKey: 'feedback-deep-agent',
    sourceFile: 'src/agents/deep-agent/feedback-deep-agent.ts',
    apiRoute: '/api/agents/feedback-deep-agent',
    subagents: ['pattern-analyzer', 'resolution-advisor'],
    tools: [
      {
        name: 'get_bulk_feedbacks',
        description: 'Fetch multiple feedbacks',
        category: 'query',
      },
      {
        name: 'generate_report',
        description: 'Generate formatted report',
        category: 'mutation',
      },
      {
        name: 'save_analysis_state',
        description: 'Save analysis state to artifact',
        category: 'mutation',
      },
      {
        name: 'load_analysis_state',
        description: 'Load previous analysis state',
        category: 'query',
      },
    ],
    isActive: true,
  },

  TRAINING_DEEP_AGENT: {
    id: 'TRAINING_DEEP_AGENT',
    name: 'Training Deep Agent',
    description: 'DeepAgents orchestrator for comprehensive training analysis',
    technology: 'deepagents',
    type: 'orchestrator',
    module: 'training',
    promptKey: 'training-deep-agent',
    sourceFile: 'src/agents/training-deep-agent/training-deep-agent.ts',
    apiRoute: '/api/agents/training-deep-agent',
    subagents: [
      'content-analyzer',
      'path-optimizer',
      'effectiveness-evaluator',
    ],
    isActive: false, // In development
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get agent config keys for i18n (CopilotKit agents only)
 */
export function getAgentI18nKeys(i18nPath: string) {
  return {
    name: `agents:${i18nPath}.name`,
    description: `agents:${i18nPath}.description`,
    objective: `agents:${i18nPath}.objective`,
    instruction: `agents:${i18nPath}.instruction`,
  }
}

/**
 * Get agent by ID
 */
export function getAgentConfig(agentId: AgentId): AgentRegistryEntry {
  return AGENT_REGISTRY[agentId]
}

/**
 * Get all agent IDs
 */
export function getAllAgentIds(): AgentId[] {
  return Object.keys(AGENT_REGISTRY) as AgentId[]
}

/**
 * Check if agent exists
 */
export function hasAgent(agentId: string): agentId is AgentId {
  return agentId in AGENT_REGISTRY
}

/**
 * Get agents by technology
 */
export function getAgentsByTechnology(
  technology: AgentTechnology
): AgentRegistryEntry[] {
  return Object.values(AGENT_REGISTRY).filter(a => a.technology === technology)
}

/**
 * Get agents by module
 */
export function getAgentsByModule(module: AgentModule): AgentRegistryEntry[] {
  return Object.values(AGENT_REGISTRY).filter(a => a.module === module)
}

/**
 * Get agents by type
 */
export function getAgentsByType(type: AgentType): AgentRegistryEntry[] {
  return Object.values(AGENT_REGISTRY).filter(a => a.type === type)
}

/**
 * Get active agents only
 */
export function getActiveAgents(): AgentRegistryEntry[] {
  return Object.values(AGENT_REGISTRY).filter(a => a.isActive)
}

/**
 * Get CopilotKit agents (for frontend use)
 */
export function getCopilotKitAgents(): AgentRegistryEntry[] {
  return getAgentsByTechnology('copilotkit')
}

/**
 * Get LangGraph agents (for backend use)
 */
export function getLangGraphAgents(): AgentRegistryEntry[] {
  return getAgentsByTechnology('langgraph')
}

/**
 * Get DeepAgents (for backend use)
 */
export function getDeepAgents(): AgentRegistryEntry[] {
  return getAgentsByTechnology('deepagents')
}

/**
 * Get all tools from all agents
 */
export function getAllAgentTools(): Array<AgentToolDef & { agentId: AgentId }> {
  const tools: Array<AgentToolDef & { agentId: AgentId }> = []

  for (const [id, agent] of Object.entries(AGENT_REGISTRY)) {
    if (agent.tools) {
      for (const tool of agent.tools) {
        tools.push({ ...tool, agentId: id as AgentId })
      }
    }
  }

  return tools
}

/**
 * Count agents by technology
 */
export function countAgentsByTechnology(): Record<AgentTechnology, number> {
  const counts: Record<AgentTechnology, number> = {
    copilotkit: 0,
    langgraph: 0,
    deepagents: 0,
  }

  for (const agent of Object.values(AGENT_REGISTRY)) {
    counts[agent.technology]++
  }

  return counts
}

/**
 * Module to agent mapping (for route-based agent selection)
 */
export const MODULE_AGENT_MAP: Record<string, AgentId> = {
  '/': 'ATLAS_QUICK',
  '/kanban': 'KANBAN',
  '/upstream': 'UPSTREAM_WIZARD',
  '/upstream/migration': 'UPSTREAM_MIGRATION',
  '/downstream': 'DOWNSTREAM_WIZARD',
  '/migration': 'MIGRATION_WIZARD',
  '/onboarding': 'ONBOARDING_WIZARD',
  '/onboarding/manifest': 'ONBOARDING_MANIFEST',
  '/environment': 'ENVIRONMENT',
  '/knowledge-base': 'KNOWLEDGE_BASE',
  '/prompt-builder': 'PROMPT_BUILDER',
  '/utility-agents': 'UTILITY_AGENTS',
  '/artifacts': 'ARTIFACTS',
  '/mcp-servers': 'MCP_SERVERS',
}

/**
 * Get agent for current route
 */
export function getAgentForRoute(pathname: string): AgentId | undefined {
  // Try exact match first
  if (pathname in MODULE_AGENT_MAP) {
    return MODULE_AGENT_MAP[pathname]
  }

  // Try prefix match for nested routes
  const sortedPaths = Object.keys(MODULE_AGENT_MAP).sort(
    (a, b) => b.length - a.length
  )

  for (const path of sortedPaths) {
    if (pathname.startsWith(path) && path !== '/') {
      return MODULE_AGENT_MAP[path]
    }
  }

  // Default to Atlas for root and unknown paths
  return 'ATLAS_QUICK'
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get registry statistics
 */
export function getRegistryStats() {
  const agents = Object.values(AGENT_REGISTRY)
  const activeAgents = agents.filter(a => a.isActive)
  const byTechnology = countAgentsByTechnology()
  const totalTools = getAllAgentTools().length

  const byModule: Record<string, number> = {}
  for (const agent of agents) {
    byModule[agent.module] = (byModule[agent.module] || 0) + 1
  }

  const byType: Record<string, number> = {}
  for (const agent of agents) {
    byType[agent.type] = (byType[agent.type] || 0) + 1
  }

  return {
    totalAgents: agents.length,
    activeAgents: activeAgents.length,
    inactiveAgents: agents.length - activeAgents.length,
    byTechnology,
    byModule,
    byType,
    totalTools,
  }
}

export default AGENT_REGISTRY
