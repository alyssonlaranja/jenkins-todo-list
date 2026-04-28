/**
 * Shared agents utilities
 *
 * This module provides shared utilities for all agent types.
 */

// Server-side prompt loading (i18n-based)
export {
  AgentPrompts,
  getAgentInstruction,
  getDeepAgentSystemPrompt,
  getSubagentPrompt,
  getSystemPrompt,
  interpolatePrompt,
  type PromptContext,
  type ServerLocale,
} from './prompts'

// Unified Prompt Resolver (manifest-based, recommended)
export {
  clearUnifiedPromptCache,
  createPromptGetter,
  getAgentPromptContent,
  invalidateAgentCache,
  invalidateManifestCache,
  resolveAgentPrompt,
  resolveSubagentPrompt,
  type MCPToolCaller,
  type ResolvedPromptResult,
  type UnifiedPromptResolverConfig,
} from './unified-prompt-resolver'

// Legacy resolvers (deprecated - use unified-prompt-resolver instead)
export {
  clearPlatformPromptCache,
  resolvePlatformPrompt,
  resolveSubagentPrompt as resolvePlatformSubagentPrompt,
  type MCPToolCaller as LegacyMCPToolCaller,
  type PlatformPromptResolverConfig,
  type ResolvedPromptResult as LegacyResolvedPromptResult,
} from './platform-prompt-resolver'
