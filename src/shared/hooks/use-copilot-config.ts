'use client'

/**
 * useCopilotConfig - Load Full Copilot Configuration from Platform
 *
 * Client-side hook that loads a complete Copilot configuration JSON artifact
 * from the platform. The artifact contains all Copilot settings for a module:
 * - System instructions
 * - Chat suggestions
 * - Context readables
 * - Action descriptions
 *
 * ## Artifact Pattern
 *
 * ```
 * COPILOT_CONFIG_{MODULE}_{LOCALE}
 * ```
 *
 * Examples:
 * - `COPILOT_CONFIG_ATLAS_PT_BR`
 * - `COPILOT_CONFIG_UPSTREAM_EN`
 * - `COPILOT_CONFIG_MIGRATION_JA`
 *
 * ## JSON Schema
 *
 * ```json
 * {
 *   "version": "1.0",
 *   "systemInstructions": "You are an AI assistant...",
 *   "chatSuggestions": {
 *     "instructions": "Generate helpful suggestions...",
 *     "examples": ["Example 1", "Example 2"]
 *   },
 *   "contextReadables": {
 *     "currentContext": {
 *       "description": "Current page context",
 *       "instructions": "Use this context to..."
 *     }
 *   },
 *   "actions": {
 *     "createFeedback": {
 *       "description": "Creates a new feedback item",
 *       "parameterLabels": {
 *         "title": "Feedback title",
 *         "description": "Detailed description"
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * @see docs/COPILOT_ARTIFACT_SCHEMA.md
 *
 * @example
 * ```tsx
 * function AtlasPage() {
 *   const { config, isLoading, error, source } = useCopilotConfig('ATLAS', 'pt-BR', {
 *     fallbackConfig: defaultAtlasConfig,
 *     variables: { USER_NAME: user.name }
 *   })
 *
 *   if (isLoading) return <Skeleton />
 *
 *   return (
 *     <CopilotSidebar
 *       instructions={config.systemInstructions}
 *       chatSuggestions={{
 *         instructions: config.chatSuggestions?.instructions
 *       }}
 *     >
 *       {source === 'platform' && <Badge>Customized</Badge>}
 *     </CopilotSidebar>
 *   )
 * }
 * ```
 */
import { useCallback, useEffect, useState } from 'react'

import { useActiveLicense } from '@/shared/hooks/use-active-license'
import { useActiveNamespace } from '@/shared/hooks/use-active-namespace'
import { useUserApiKey } from '@/shared/hooks/use-user-api-key'

// ============================================================================
// Types
// ============================================================================

/**
 * Action configuration in Copilot config
 */
export interface CopilotActionConfig {
  /** Description of what the action does */
  description: string
  /** Human-readable labels for parameters */
  parameterLabels?: Record<string, string>
}

/**
 * Readable configuration in Copilot config
 */
export interface CopilotReadableConfig {
  /** Description of the readable data */
  description: string
  /** Instructions for how to use this data */
  instructions?: string
}

/**
 * Chat suggestions configuration
 */
export interface CopilotChatSuggestionsConfig {
  /** Instructions for generating suggestions */
  instructions: string
  /** Example suggestions */
  examples?: string[]
}

/**
 * Full Copilot configuration structure
 */
export interface CopilotConfig {
  /** Schema version */
  version?: string
  /** System instructions for the AI */
  systemInstructions: string
  /** Chat suggestions configuration */
  chatSuggestions?: CopilotChatSuggestionsConfig
  /** Context readables configuration */
  contextReadables?: Record<string, CopilotReadableConfig>
  /** Action configurations */
  actions?: Record<string, CopilotActionConfig>
}

/**
 * Options for useCopilotConfig hook
 */
export interface UseCopilotConfigOptions {
  /** Skip platform lookup (use local only) */
  localOnly?: boolean
  /** Refresh interval in ms (0 = no auto-refresh) */
  refreshInterval?: number
  /** Custom fallback configuration */
  fallbackConfig?: CopilotConfig
  /** Variables to replace in text fields (e.g., {{VARIABLE_NAME}}) */
  variables?: Record<string, string | number>
}

/**
 * Result from useCopilotConfig hook
 */
export interface UseCopilotConfigResult {
  /** Resolved Copilot configuration */
  config: CopilotConfig
  /** Whether the config is still loading */
  isLoading: boolean
  /** Error if any occurred */
  error: Error | null
  /** Source of the config */
  source: 'platform' | 'local' | 'pending'
  /** Refresh the config */
  refresh: () => void
  /** Whether platform has custom config */
  isPlatformCustomized: boolean
  /** Get action description (with fallback) */
  getActionDescription: (actionName: string, fallback?: string) => string
  /** Get readable instructions (with fallback) */
  getReadableInstructions: (readableId: string, fallback?: string) => string
}

// ============================================================================
// Default Fallback Config
// ============================================================================

const DEFAULT_CONFIG: CopilotConfig = {
  version: '1.0',
  systemInstructions: 'You are a helpful AI assistant.',
  chatSuggestions: {
    instructions: 'Generate helpful suggestions based on the current context.',
  },
}

// ============================================================================
// Variable Replacement
// ============================================================================

/**
 * Replace {{VARIABLE}} placeholders in a string
 */
function replaceVariables(
  text: string | undefined,
  variables: Record<string, string | number>
): string {
  if (!text) return ''
  if (!variables || Object.keys(variables).length === 0) return text

  let result = text
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'),
      String(value)
    )
  }
  return result
}

/**
 * Replace variables in all string fields of the config
 */
function replaceVariablesInConfig(
  config: CopilotConfig,
  variables: Record<string, string | number>
): CopilotConfig {
  if (!variables || Object.keys(variables).length === 0) return config

  const resolved: CopilotConfig = {
    ...config,
    systemInstructions: replaceVariables(config.systemInstructions, variables),
  }

  // Replace in chat suggestions
  if (config.chatSuggestions) {
    resolved.chatSuggestions = {
      instructions: replaceVariables(
        config.chatSuggestions.instructions,
        variables
      ),
      examples: config.chatSuggestions.examples?.map(ex =>
        replaceVariables(ex, variables)
      ),
    }
  }

  // Replace in readables
  if (config.contextReadables) {
    resolved.contextReadables = {}
    for (const [key, readable] of Object.entries(config.contextReadables)) {
      resolved.contextReadables[key] = {
        description: replaceVariables(readable.description, variables),
        instructions: replaceVariables(readable.instructions, variables),
      }
    }
  }

  // Replace in actions
  if (config.actions) {
    resolved.actions = {}
    for (const [key, action] of Object.entries(config.actions)) {
      resolved.actions[key] = {
        description: replaceVariables(action.description, variables),
        parameterLabels: action.parameterLabels,
      }
    }
  }

  return resolved
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook to load Copilot configuration from platform artifact
 *
 * @param module - Module name (e.g., 'ATLAS', 'UPSTREAM')
 * @param locale - Locale code (e.g., 'en', 'pt-BR')
 * @param options - Hook options
 * @returns Copilot configuration and utilities
 */
export function useCopilotConfig(
  module: string,
  locale: string = 'en',
  options: UseCopilotConfigOptions = {}
): UseCopilotConfigResult {
  const {
    localOnly = false,
    refreshInterval = 0,
    fallbackConfig = DEFAULT_CONFIG,
    variables = {},
  } = options

  const { activeLicense } = useActiveLicense()
  const { activeNamespace } = useActiveNamespace()
  const { apiKey } = useUserApiKey()

  const [config, setConfig] = useState<CopilotConfig>(fallbackConfig)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [source, setSource] = useState<'platform' | 'local' | 'pending'>(
    'pending'
  )

  // Get fallback with variables replaced
  const getFallback = useCallback((): CopilotConfig => {
    return replaceVariablesInConfig(fallbackConfig, variables)
  }, [fallbackConfig, variables])

  // Fetch config from platform
  const fetchConfig = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Skip platform if localOnly or missing credentials
      if (
        localOnly ||
        !activeLicense?.id ||
        !activeNamespace?.id ||
        !apiKey?.key
      ) {
        const localConfig = getFallback()
        setConfig(localConfig)
        setSource('local')
        return
      }

      // Try to fetch from platform
      const platformConfig = await fetchConfigFromPlatform(
        module,
        locale,
        activeNamespace.id,
        activeLicense.id,
        apiKey.key
      )

      if (platformConfig) {
        // Replace variables and set
        const resolvedConfig = replaceVariablesInConfig(
          platformConfig,
          variables
        )
        setConfig(resolvedConfig)
        setSource('platform')
        return
      }

      // Fallback to local
      const localConfig = getFallback()
      setConfig(localConfig)
      setSource('local')
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      // Provide fallback on error
      const localConfig = getFallback()
      setConfig(localConfig)
      setSource('local')
    } finally {
      setIsLoading(false)
    }
  }, [
    module,
    locale,
    localOnly,
    activeLicense?.id,
    activeNamespace?.id,
    apiKey?.key,
    getFallback,
    variables,
  ])

  // Initial fetch and refresh
  useEffect(() => {
    fetchConfig()

    if (refreshInterval > 0) {
      const interval = setInterval(fetchConfig, refreshInterval)
      return () => clearInterval(interval)
    }
    return undefined
  }, [fetchConfig, refreshInterval])

  // Helper to get action description
  const getActionDescription = useCallback(
    (actionName: string, fallback: string = ''): string => {
      return config.actions?.[actionName]?.description || fallback
    },
    [config]
  )

  // Helper to get readable instructions
  const getReadableInstructions = useCallback(
    (readableId: string, fallback: string = ''): string => {
      return config.contextReadables?.[readableId]?.instructions || fallback
    },
    [config]
  )

  return {
    config,
    isLoading,
    error,
    source,
    refresh: fetchConfig,
    isPlatformCustomized: source === 'platform',
    getActionDescription,
    getReadableInstructions,
  }
}

// ============================================================================
// Platform Fetching
// ============================================================================

/**
 * Fetch Copilot config artifact from platform
 */
async function fetchConfigFromPlatform(
  module: string,
  locale: string,
  namespaceId: string,
  licenseId: string,
  apiKey: string
): Promise<CopilotConfig | null> {
  const artifactKey = `COPILOT_CONFIG_${module.toUpperCase()}_${locale.replace('-', '_').toUpperCase()}`

  try {
    const response = await fetch('/api/mcp-orchestrator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cockpit-license-id': licenseId,
        'x-cockpit-namespace-id': namespaceId,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        serverKey: 'connection-mcp-server-legacy',
        method: 'callTool',
        params: {
          name: 'get_artifact',
          arguments: { key: artifactKey },
        },
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const artifact = data?.content?.[0]?.text
      ? JSON.parse(data.content[0].text)
      : null

    if (!artifact?.value) return null

    // Parse the JSON value
    const configValue =
      typeof artifact.value === 'string'
        ? JSON.parse(artifact.value)
        : artifact.value

    // Validate basic structure
    if (!configValue.systemInstructions) {
      return null
    }

    return configValue as CopilotConfig
  } catch {
    return null
  }
}

export default useCopilotConfig
