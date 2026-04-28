/**
 * Dynamic Agents Module
 *
 * This module provides infrastructure for dynamically loading agent configurations
 * from the Cockpit Platform instead of having them hardcoded in the frontend.
 *
 * @see DYNAMIC_AGENTS_MODULE_PROPOSAL.md for full documentation
 *
 * Usage:
 *
 * 1. Basic usage with useDynamicAgent:
 * ```typescript
 * import { useDynamicAgent } from '@/shared/lib/dynamic-agents'
 *
 * function MyComponent() {
 *   const { agentConfig, isLoading, error, isFromFallback, refresh } = useDynamicAgent({
 *     agentName: 'atlas',
 *     fallback: { ... },
 *   })
 *
 *   if (isLoading) return <Spinner />
 *   if (error) return <ErrorMessage error={error} />
 *
 *   return <Agent config={agentConfig} />
 * }
 * ```
 *
 * 2. Auto-create missing agents with useEnsureAgent:
 * ```typescript
 * import { useEnsureAgent } from '@/shared/lib/dynamic-agents'
 *
 * function MySetup() {
 *   const { ensureAgent, isEnsuring } = useEnsureAgent({
 *     defaultConfig: {
 *       name: 'atlas',
 *       description: 'Atlas assistant',
 *       instruction: 'You are Atlas...',
 *       objective: 'Help users...',
 *       type: 'Supervisor',
 *       model: 'azure-gpt-4o',
 *     },
 *   })
 *
 *   useEffect(() => {
 *     ensureAgent()
 *   }, [ensureAgent])
 * }
 * ```
 *
 * 3. With DynamicAgentProvider (context-based):
 * ```typescript
 * import { DynamicAgentProvider, useDynamicAgentContext } from '@/shared/lib/dynamic-agents'
 *
 * function App() {
 *   return (
 *     <DynamicAgentProvider agentName="atlas" fallback={...}>
 *       <MyFeature />
 *     </DynamicAgentProvider>
 *   )
 * }
 *
 * function MyFeature() {
 *   const { agentConfig, isLoading, isFromFallback } = useDynamicAgentContext()
 *   // ...
 * }
 * ```
 */

// Types
export type {
  AgentTypeInfo,
  ArtifactCatalogEntry,
  ArtifactsCatalog,
  DynamicAgentConfig,
  ParsedFrontMatter,
  PortalAgentName,
  TeamMemberInfo,
  UseEnsureAgentOptions,
  UseEnsureAgentReturn,
} from './types'

export { PORTAL_AGENT_NAMES } from './types'

// Agent Registry (i18n-based)
export {
  AGENT_REGISTRY,
  getAllAgentIds,
  getAgentConfig,
  getAgentForRoute,
  getAgentI18nKeys,
  getAgentsByModule,
  getAgentsByTechnology,
  getAgentsByType,
  getActiveAgents,
  getCopilotKitAgents,
  getLangGraphAgents,
  getDeepAgents,
  getAllAgentTools,
  countAgentsByTechnology,
  getRegistryStats,
  hasAgent,
  MODULE_AGENT_MAP,
} from './agent-registry'

export type {
  AgentConfig,
  AgentId,
  AgentModule,
  AgentRegistryEntry,
  AgentTechnology,
  AgentToolDef,
  AgentType,
} from './agent-registry'

// Action Registry
export {
  ACTION_NAMES,
  ACTION_REGISTRY,
  countActionsByModule,
  getActionByKey,
  getActionByName,
  getActionNamesForModule,
  getActionsByCategory,
  getActionsByModule,
  getActionsWithRender,
  getHITLActions,
} from './action-registry'

export type {
  ActionCategory,
  ActionModule,
  ActionParameter,
  ActionRegistryEntry,
} from './action-registry'

// Suggestion Registry
export {
  SUGGESTION_KEYS,
  SUGGESTION_REGISTRY,
  countSuggestionsByModule,
  getRequiredContextVariables,
  getSuggestionByKey,
  getSuggestionConfig,
  getSuggestionKeysForModule,
  getSuggestionsForModule,
  interpolateSuggestionInstructions,
} from './suggestion-registry'

export type {
  SuggestionI18nPath,
  SuggestionModule,
  SuggestionRegistryEntry,
} from './suggestion-registry'

// Readable Registry
export {
  READABLE_KEYS,
  READABLE_REGISTRY,
  countReadablesByCategory,
  countReadablesByModule,
  getChildReadables,
  getGlobalReadables,
  getParentReadables,
  getReadableByKey,
  getReadablesByCategory,
  getReadablesForModule,
} from './readable-registry'

export type {
  ReadableCategory,
  ReadableModule,
  ReadableRegistryEntry,
} from './readable-registry'

// Provider will be added in next step
export {
  DynamicAgentProvider,
  useDynamicAgentContext,
  useDynamicAgentContextSafe,
} from './dynamic-agent-provider'

export type {
  DynamicAgentContextValue,
  DynamicAgentProviderProps,
} from './dynamic-agent-provider'

// Utilities
export {
  delay,
  parseFrontMatter,
  parseMCPResponse,
  resolveArtifacts,
} from './utils'

// i18n Utilities for Agent Translations
export {
  AGENT_DEPLOY_LOCALES,
  DEFAULT_AGENT_DEPLOY_LOCALE,
  createDeployLocaleArtifact,
  getAgentTranslation,
  getDeployLocaleArtifactKey,
  getLanguageInstruction,
  interpolateInstruction,
  parseDeployLocaleArtifact,
  resolveAgentConfig,
} from './i18n-utils'

export type {
  AgentContextVariables,
  AgentTranslationPath,
  DeployLocaleConfig,
  ResolvedAgentTranslation,
} from './i18n-utils'

// Agent Prompts Utility (for LangGraph/DeepAgents)
export {
  AGENT_PROMPT_PATHS,
  getAgentInstruction,
  getAgentPrompts,
  getAgentPromptsAsync,
  getAgentSystemPrompt,
  getLanguageInstruction as getAgentLanguageInstruction,
  getSubagentSystemPrompt,
  interpolatePrompt,
} from './agent-prompts'

export type { AgentPromptId, PromptContext } from './agent-prompts'

// Hooks (re-exported from shared/hooks for convenience)
export { useDynamicAgent } from '@/shared/hooks/use-dynamic-agent'
export type { UseDynamicAgentOptions, UseDynamicAgentReturn } from './types'
export { useEnsureAgent } from '@/shared/hooks/use-ensure-agent'

// i18n-aware hooks
export {
  useDynamicAgentWithLocale,
  useDynamicRegistryAgent,
} from '@/shared/hooks/use-dynamic-agent-with-locale'

export type {
  UseDynamicAgentWithLocaleOptions,
  UseDynamicAgentWithLocaleReturn,
} from '@/shared/hooks/use-dynamic-agent-with-locale'

// i18n Static Agent Configuration Hook
export {
  useDynamicAgentI18n,
  useDynamicAgentI18nForRoute,
} from '@/shared/hooks/use-dynamic-agent-i18n'

export type {
  AgentContext as AgentI18nContext,
  ResolvedAgentConfig,
  UseDynamicAgentI18nResult,
} from '@/shared/hooks/use-dynamic-agent-i18n'
