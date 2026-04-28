/**
 * Unified Configuration Types
 *
 * Canonical format for Copilot configuration that works across
 * all 3 universes: CopilotKit, LangGraph, DeepAgents
 */

import type { MCPToolCaller } from '../unified-prompt-resolver'

// =============================================================================
// CORE TYPES
// =============================================================================

export type ConfigSource = 'platform' | 'i18n'

export type ParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'string[]'

export interface ParameterDescription {
  name: string
  type: ParameterType
  description: string
  required: boolean
  enum?: string[]
  attributes?: ParameterDescription[]
}

export interface ActionDescription {
  name: string
  description: string
  parameters: ParameterDescription[]
  category: string
  isHITL: boolean
  hasRender: boolean
}

export interface SuggestionTemplate {
  key: string
  instructions: string
  contextVariables: string[]
  minSuggestions: number
  maxSuggestions: number
}

export interface ReadableDescription {
  key: string
  description: string
  contextKey: string
  category: 'user' | 'session' | 'navigation' | 'state' | 'data' | 'config'
}

export interface ConfigMetadata {
  version: string
  lastUpdated: string
  customizedFeatures: (
    | 'instructions'
    | 'actions'
    | 'suggestions'
    | 'readables'
  )[]
  subagentInstructions?: string
}

export interface UnifiedConfig {
  moduleId: string
  locale: string
  source: ConfigSource
  systemInstructions: string
  actions: ActionDescription[]
  suggestions: SuggestionTemplate[]
  readables: ReadableDescription[]
  metadata: ConfigMetadata
}

// =============================================================================
// RESOLVER OPTIONS
// =============================================================================

export interface ResolveOptions {
  locale: string
  callMCPTool?: MCPToolCaller
  useStore?: boolean
}

// =============================================================================
// ADAPTER TYPES
// =============================================================================

export interface LangGraphConfig {
  systemPrompt: string
}

export interface DeepAgentConfig {
  systemPrompt: string
  subagentInstructions?: string
}

export interface CopilotKitConfig {
  systemInstructions: string
  actionDescriptions: ActionDescription[]
  suggestionConfig: SuggestionTemplate | null
  readableDescriptions: ReadableDescription[]
  source: ConfigSource
  isLoading: boolean
}
