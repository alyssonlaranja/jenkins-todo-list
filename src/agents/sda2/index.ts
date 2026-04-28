/**
 * SDA2 LangGraph Supervisor
 *
 * Exports for the dynamic multi-agent supervisor system.
 * All agents are created dynamically from MCP Agent Card data.
 */

// Main factory
export {
  createSDA2Supervisor,
  createDefaultSDA2Model,
} from './create-sda2-supervisor'

// Handoff tools
export {
  createDynamicHandoffTools,
  createSingleHandoffTool,
  normalizeAgentName,
} from './handoff-tools'

// State schema
export { SDA2StateAnnotation, type SDA2State } from './state-schema'

// Types
export type {
  MCPAgentCard,
  MCPTeamMember,
  DynamicAgentConfig,
  CompiledAgent,
  CreateSDA2SupervisorOptions,
  SDA2SupervisorResult,
  ConversationArtifact,
  HandoffEvent,
  OutputMode,
} from './types'
