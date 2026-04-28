/**
 * Unified Copilot Hook for Frontend Modules
 *
 * Single entry point for loading CopilotKit configuration.
 * Uses the manifest to determine if config comes from platform or i18n.
 *
 * Flow:
 * 1. Check manifest (cached in Zustand)
 * 2. If not customized → return i18n config (ZERO API calls)
 * 3. If customized → fetch COPILOT_CONFIG_{MODULE} from platform
 *
 * @module shared/hooks/use-copilot
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

// ============================================================================
// Unified Config Exports (for Registrar Components)
// ============================================================================

import type {
  ActionDescription,
  ReadableDescription,
  SuggestionTemplate,
} from '@/agents/shared/types/unified-config'
import { useConnectionManager } from '@/features/connections/hooks/use-connection-manager'
import {
  getActionsByModule,
  getAgentConfig,
  getReadablesForModule,
  getSuggestionsForModule,
  type ActionModule,
  type ActionRegistryEntry,
  type AgentId,
  type ReadableModule,
  type ReadableRegistryEntry,
  type SuggestionModule,
  type SuggestionRegistryEntry,
} from '@/shared/lib/dynamic-agents'
import {
  useCopilotManifestStore,
  type ManifestToolCaller,
} from '@/shared/stores/copilot-manifest-store'

import { useActiveNamespace } from './use-active-namespace'
import { useProxyMCP } from './use-proxy-mcp'

// ============================================================================
// Types
// ============================================================================

export interface CopilotAction {
  name: string
  description: string
  parameters?: Record<string, string>
}

export interface CopilotReadable {
  key: string
  description: string
}

export interface CopilotSuggestions {
  instructions?: string
  initial?: string[]
  contextual?: Record<string, string[]>
}

export interface CopilotModuleConfig {
  /** System instructions for the AI */
  systemInstructions: string
  /** Chat suggestions configuration */
  chatSuggestions?: CopilotSuggestions
  /** Available actions */
  actions?: Record<string, CopilotAction>
  /** Context readables */
  contextReadables?: Record<string, CopilotReadable>
  /** Raw config for advanced usage */
  raw?: Record<string, unknown>
}

export interface UseCopilotResult {
  /** The resolved configuration */
  config: CopilotModuleConfig
  /** Whether configuration is loading */
  isLoading: boolean
  /** Error if loading failed */
  error: Error | null
  /** Source of the configuration */
  source: 'platform' | 'local' | 'pending'
  /** Whether this module is customized on the platform */
  isCustomized: boolean
  /** Force refresh the configuration */
  refresh: () => Promise<void>
}

export interface UseCopilotOptions {
  /** Variables to replace in the prompt (e.g., {{VARIABLE_NAME}}) */
  variables?: Record<string, string | number>
}

// ============================================================================
// Variable Replacement
// ============================================================================

/**
 * Replace simple template variables in text.
 * Uses {{VARIABLE}} pattern (Mustache-style).
 */
function replaceVariables(
  template: string,
  variables?: Record<string, string | number>
): string {
  if (!variables || Object.keys(variables).length === 0) {
    return template
  }

  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'),
      String(value)
    )
  }
  return result
}

// ============================================================================
// Module ID type
// ============================================================================

export type CopilotModuleId =
  | 'atlas'
  | 'atlas-kanban'
  | 'atlas-spotlight'
  | 'upstream'
  | 'downstream'
  | 'migration-wizard'
  | 'onboarding-instructor'
  | 'onboarding-creator'
  | 'my-tasks'

// Mapping from CopilotModuleId to AgentId
const MODULE_ID_TO_AGENT_ID: Record<string, AgentId> = {
  atlas: 'ATLAS_FULL',
  'atlas-quick': 'ATLAS_QUICK',
  'atlas-kanban': 'KANBAN',
  upstream: 'UPSTREAM_WIZARD',
  downstream: 'DOWNSTREAM_WIZARD',
  'migration-wizard': 'MIGRATION_WIZARD',
  'onboarding-instructor': 'ONBOARDING_WIZARD',
  'onboarding-creator': 'ONBOARDING_MANIFEST',
  environment: 'ENVIRONMENT',
  'knowledge-base': 'KNOWLEDGE_BASE',
  'prompt-builder': 'PROMPT_BUILDER',
  'utility-agents': 'UTILITY_AGENTS',
  artifacts: 'ARTIFACTS',
  'mcp-servers': 'MCP_SERVERS',
}

// Mapping from CopilotModuleId to registry module types
const MODULE_MAPPING: Record<
  CopilotModuleId,
  {
    action?: ActionModule
    suggestion?: SuggestionModule
    readable?: ReadableModule
  }
> = {
  atlas: { action: 'atlas', suggestion: 'atlas', readable: 'atlas' },
  'atlas-kanban': {
    action: 'kanban',
    suggestion: 'kanban',
    readable: 'kanban',
  },
  'atlas-spotlight': {
    action: 'atlas',
    suggestion: 'atlas',
    readable: 'atlas',
  },
  upstream: {
    action: 'upstream',
    suggestion: 'upstream',
    readable: 'upstream',
  },
  downstream: {
    action: 'downstream',
    suggestion: 'downstream',
    readable: 'downstream',
  },
  'migration-wizard': {
    action: 'migration',
    suggestion: 'migration',
    readable: 'migration',
  },
  'onboarding-instructor': {
    action: 'onboarding',
    suggestion: 'onboarding',
    readable: 'onboarding',
  },
  'onboarding-creator': {
    action: 'onboarding',
    suggestion: 'onboarding',
    readable: 'onboarding',
  },
  'my-tasks': {
    action: 'my-tasks',
    suggestion: 'my-tasks',
    readable: 'my-tasks',
  },
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCopilot(
  moduleId: CopilotModuleId | string,
  options: UseCopilotOptions = {}
): UseCopilotResult {
  const { variables } = options
  const { t } = useTranslation(['mcp', 'agents'])
  const { activeNamespace } = useActiveNamespace()

  // Get session connection for MCP calls
  const { getConnection } = useConnectionManager()
  const sessionConnection = getConnection('session-connection')

  // Get MCP tool caller
  const { callTool, connected } = useProxyMCP({
    namespace: activeNamespace?.id || '',
    connection: sessionConnection,
    autoConnect: true,
  })

  // Create manifest tool caller wrapper
  const manifestCallTool: ManifestToolCaller | undefined = useMemo(() => {
    if (!connected || !callTool) return undefined
    return async (toolName: string, args: Record<string, unknown>) => {
      return callTool(toolName, args)
    }
  }, [connected, callTool])

  const {
    isLoading: isManifestLoading,
    isLoaded: isManifestLoaded,
    loadManifest,
    isModuleCustomized,
    getModuleConfigKey,
  } = useCopilotManifestStore()

  const [platformConfig, setPlatformConfig] =
    useState<CopilotModuleConfig | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [source, setSource] = useState<'platform' | 'local' | 'pending'>(
    'pending'
  )

  // Check if module is customized
  const isCustomized = useMemo(
    () => isModuleCustomized(moduleId),
    [moduleId, isModuleCustomized]
  )

  // ========================================================================
  // i18n Config Builder
  // ========================================================================

  const getI18nConfig = useCallback((): CopilotModuleConfig => {
    // Resolve AgentId from moduleId
    const agentId = MODULE_ID_TO_AGENT_ID[moduleId]
    // @ts-expect-error - getAgentConfig expects AgentId but we might pass undefined if not mapped
    const agentConfig = agentId ? getAgentConfig(agentId) : undefined

    const mapping = MODULE_MAPPING[moduleId as CopilotModuleId]

    // Get suggestions if module has suggestion registry
    let suggestions: SuggestionRegistryEntry[] = []
    if (mapping?.suggestion) {
      suggestions = getSuggestionsForModule(mapping.suggestion)
    }

    // Get actions if module has action registry
    let actions: ActionRegistryEntry[] = []
    if (mapping?.action) {
      actions = getActionsByModule(mapping.action)
    }

    // Get readables if module has readable registry
    let readables: ReadableRegistryEntry[] = []
    if (mapping?.readable) {
      readables = getReadablesForModule(mapping.readable)
    }

    // Get system instructions from agent config or i18n
    const systemInstructions =
      (agentConfig?.i18nPath
        ? t(`agents:${agentConfig.i18nPath}.instruction`, { defaultValue: '' })
        : '') ||
      t(`agents:${moduleId}.systemInstructions`, { defaultValue: '' }) ||
      t(`mcp:agents.${moduleId}.systemInstructions`, { defaultValue: '' })

    // Build suggestions
    const chatSuggestions: CopilotSuggestions = {
      instructions: t(`agents:${moduleId}.chatSuggestions.instructions`, {
        defaultValue: '',
      }),
      initial: suggestions
        .map(s => {
          const translated = t(s.i18nInstructionsPath, { defaultValue: '' })
          return translated || s.fallbackInstructions
        })
        .filter(Boolean),
    }

    // Build actions from registry
    const actionsMap: Record<string, CopilotAction> = {}
    for (const action of actions) {
      actionsMap[action.name] = {
        name: action.name,
        description: t(action.i18nDescPath, {
          defaultValue: action.fallbackDescription,
        }),
      }
    }

    // Build readables from registry
    const readablesMap: Record<string, CopilotReadable> = {}
    for (const readable of readables) {
      readablesMap[readable.key] = {
        key: readable.key,
        description: t(readable.i18nDescPath, {
          defaultValue: readable.fallbackDescription,
        }),
      }
    }

    return {
      systemInstructions,
      chatSuggestions,
      actions: actionsMap,
      contextReadables: readablesMap,
    }
  }, [moduleId, t])

  // ========================================================================
  // Platform Config Fetcher
  // ========================================================================

  const fetchPlatformConfig =
    useCallback(async (): Promise<CopilotModuleConfig | null> => {
      const configKey = getModuleConfigKey(moduleId)
      if (!configKey) return null

      try {
        const response = await fetch('/api/mcp-orchestrator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'tools/call',
            params: {
              name: 'get_artifact',
              arguments: { key: configKey },
            },
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.status}`)
        }

        const data = await response.json()
        const artifact = data?.content?.[0]?.text
          ? JSON.parse(data.content[0].text)
          : null

        if (artifact?.value) {
          const config = JSON.parse(artifact.value)
          return {
            systemInstructions: config.systemInstructions || '',
            chatSuggestions: config.chatSuggestions,
            actions: config.actions,
            contextReadables: config.contextReadables,
            raw: config,
          }
        }

        return null
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to fetch config')
      }
    }, [moduleId, getModuleConfigKey])

  // ========================================================================
  // Load Effect
  // ========================================================================

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      // 1. Ensure manifest is loaded (requires connection)
      if (!isManifestLoaded && activeNamespace?.id && manifestCallTool) {
        await loadManifest(activeNamespace.id, manifestCallTool)
      }

      // Wait for manifest to be loaded
      if (!isManifestLoaded) {
        return
      }

      // 2. Check if module is customized
      const customized = isModuleCustomized(moduleId)

      if (!customized) {
        // Use i18n - ZERO additional API calls
        if (!cancelled) {
          setPlatformConfig(null)
          setSource('local')
          setIsLoadingConfig(false)
          setError(null)
        }
        return
      }

      // 3. Fetch platform config
      if (!cancelled) {
        setIsLoadingConfig(true)
        setError(null)
      }

      try {
        const config = await fetchPlatformConfig()

        if (!cancelled) {
          if (config) {
            setPlatformConfig(config)
            setSource('platform')
          } else {
            // Fallback to i18n if platform config not found
            setPlatformConfig(null)
            setSource('local')
          }
          setIsLoadingConfig(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error('Failed to load config')
          )
          setPlatformConfig(null)
          setSource('local')
          setIsLoadingConfig(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [
    moduleId,
    activeNamespace?.id,
    isManifestLoaded,
    loadManifest,
    isModuleCustomized,
    fetchPlatformConfig,
    manifestCallTool,
  ])

  // ========================================================================
  // Refresh Function
  // ========================================================================

  const refresh = useCallback(async () => {
    setSource('pending')
    setIsLoadingConfig(true)
    setError(null)
    setPlatformConfig(null)

    // Reload manifest first (requires callTool)
    if (manifestCallTool) {
      const { reloadManifest } = useCopilotManifestStore.getState()
      await reloadManifest(manifestCallTool)
    }

    // Then reload config if customized
    if (isModuleCustomized(moduleId)) {
      try {
        const config = await fetchPlatformConfig()
        if (config) {
          setPlatformConfig(config)
          setSource('platform')
        } else {
          setSource('local')
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to refresh'))
        setSource('local')
      }
    } else {
      setSource('local')
    }

    setIsLoadingConfig(false)
  }, [moduleId, isModuleCustomized, fetchPlatformConfig, manifestCallTool])

  // ========================================================================
  // Final Config
  // ========================================================================

  const baseConfig = useMemo((): CopilotModuleConfig => {
    if (source === 'platform' && platformConfig) {
      return platformConfig
    }
    return getI18nConfig()
  }, [source, platformConfig, getI18nConfig])

  // Apply variable substitution to config
  const config = useMemo((): CopilotModuleConfig => {
    if (!variables || Object.keys(variables).length === 0) {
      return baseConfig
    }

    return {
      ...baseConfig,
      systemInstructions: replaceVariables(
        baseConfig.systemInstructions,
        variables
      ),
      chatSuggestions: baseConfig.chatSuggestions
        ? {
            ...baseConfig.chatSuggestions,
            instructions: baseConfig.chatSuggestions.instructions
              ? replaceVariables(
                  baseConfig.chatSuggestions.instructions,
                  variables
                )
              : undefined,
          }
        : undefined,
    }
  }, [baseConfig, variables])

  const isLoading = isManifestLoading || isLoadingConfig || source === 'pending'

  return {
    config,
    isLoading,
    error,
    source,
    isCustomized,
    refresh,
  }
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Get only the system instructions for a module
 */
export function useCopilotInstructions(
  moduleId: CopilotModuleId | string
): string {
  const { config } = useCopilot(moduleId)
  return config.systemInstructions
}

/**
 * Get only the suggestions for a module
 */
export function useCopilotSuggestions(
  moduleId: CopilotModuleId | string
): string[] {
  const { config } = useCopilot(moduleId)
  return config.chatSuggestions?.initial || []
}

/**
 * Check if a module has platform customization
 */
export function useIsModuleCustomized(
  moduleId: CopilotModuleId | string
): boolean {
  const { isModuleCustomized } = useCopilotManifestStore()
  return isModuleCustomized(moduleId)
}

/**
 * Convert hook actions to ActionDescription format for registrars
 */
export function useActionDescriptions(
  moduleId: CopilotModuleId | string
): ActionDescription[] {
  const { t } = useTranslation(['mcp', 'agents', 'copilot'])
  const mapping = MODULE_MAPPING[moduleId as CopilotModuleId]

  if (!mapping?.action) return []

  const actions = getActionsByModule(mapping.action)

  return actions.map(action => ({
    name: action.name,
    description: t(action.i18nDescPath, {
      defaultValue: action.fallbackDescription,
    }),
    parameters: action.parameters.map(p => ({
      name: p.name,
      type: p.type,
      description: t(p.i18nDescPath || '', {
        defaultValue: p.fallbackDescription,
      }),
      required: p.required ?? false,
      enum: p.enum,
    })),
    category: action.category,
    isHITL: action.isHITL,
    hasRender: action.hasRender,
  }))
}

/**
 * Get suggestion template for a module
 */
export function useSuggestionTemplate(
  moduleId: CopilotModuleId | string,
  step?: number
): SuggestionTemplate | null {
  const { t } = useTranslation(['mcp', 'agents', 'copilot'])
  const mapping = MODULE_MAPPING[moduleId as CopilotModuleId]
  if (!mapping?.suggestion) return null

  const suggestions = getSuggestionsForModule(mapping.suggestion)

  // Find suggestion for step or get first one
  const suggestion = step
    ? suggestions.find(s => s.step === step)
    : suggestions[0]

  if (!suggestion) return null

  return {
    key: suggestion.key,
    instructions: t(suggestion.i18nInstructionsPath, {
      defaultValue: suggestion.fallbackInstructions,
    }),
    contextVariables: suggestion.contextVariables,
    minSuggestions: suggestion.minSuggestions,
    maxSuggestions: suggestion.maxSuggestions,
  }
}

/**
 * Convert hook readables to ReadableDescription format for registrars
 */
export function useReadableDescriptions(
  moduleId: CopilotModuleId | string
): ReadableDescription[] {
  const { t } = useTranslation(['mcp', 'agents', 'copilot'])
  const mapping = MODULE_MAPPING[moduleId as CopilotModuleId]
  if (!mapping?.readable) return []

  const readables = getReadablesForModule(mapping.readable)

  return readables.map(readable => ({
    key: readable.key,
    description: t(readable.i18nDescPath, {
      defaultValue: readable.fallbackDescription,
    }),
    contextKey: readable.contextKey,
    category: readable.category,
  }))
}
