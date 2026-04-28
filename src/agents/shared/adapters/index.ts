/**
 * Copilot Configuration Adapters
 *
 * Universe-specific adapters that transform UnifiedConfig
 * into the format required by each universe.
 */

// LangGraph Adapter
export {
  resolveLangGraphPrompt,
  resolveLangGraphConfig,
} from './langgraph-adapter'

// DeepAgent Adapter
export {
  resolveDeepAgentPrompt,
  resolveDeepAgentConfig,
} from './deepagent-adapter'

// Re-export types
export type { LangGraphConfig, DeepAgentConfig } from '../types/unified-config'
