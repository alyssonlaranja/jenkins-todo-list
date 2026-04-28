/**
 * useDynamicAgentWithLocale - Dynamic Agent with i18n Support
 *
 * Extends useDynamicAgent to support locale-aware fallback configurations.
 * The locale can be:
 * 1. Specified explicitly via options
 * 2. Retrieved from deploy artifact (AGENT_DEPLOY_LOCALE_{agentName})
 * 3. Fallback to user's current locale
 *
 * @see DYNAMIC_AGENTS_MODULE_PROPOSAL.md
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  useDynamicAgent,
  type UseDynamicAgentOptionsWithConnection,
} from '@/shared/hooks/use-dynamic-agent'
import type { SupportedLanguage } from '@/shared/i18n'
// ============================================================================
// CONVENIENCE HOOK FOR REGISTRY AGENTS
// ============================================================================

import { AGENT_REGISTRY } from '@/shared/lib/dynamic-agents/agent-registry'
import {
  DEFAULT_AGENT_DEPLOY_LOCALE,
  resolveAgentConfig,
  type AgentContextVariables,
  type AgentTranslationPath,
} from '@/shared/lib/dynamic-agents/i18n-utils'
import type {
  DefaultAgentConfig,
  DynamicAgentConfig,
} from '@/shared/lib/dynamic-agents/types'

// ============================================================================
// TYPES
// ============================================================================

export interface UseDynamicAgentWithLocaleOptions extends Omit<
  UseDynamicAgentOptionsWithConnection,
  'fallbackConfig'
> {
  /**
   * i18n path for this agent's translations
   * Used to resolve fallback config from i18n files
   */
  i18nPath: AgentTranslationPath

  /**
   * Static fallback config (overrides i18n-resolved config)
   */
  staticFallbackConfig?: DefaultAgentConfig

  /**
   * Deploy locale override
   * If not provided, uses current user locale
   */
  deployLocale?: SupportedLanguage

  /**
   * Context variables for instruction interpolation
   * Variables like ${USER_NAME}, ${CURRENT_MODULE} etc.
   */
  contextVariables?: AgentContextVariables
}

export interface UseDynamicAgentWithLocaleReturn {
  /** Resolved agent configuration */
  agentConfig: DynamicAgentConfig | null
  /** Whether agent is loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Manual refresh function */
  refresh: () => Promise<void>
  /** Whether using fallback configuration */
  isUsingFallback: boolean
  /** Resolved locale being used */
  resolvedLocale: SupportedLanguage
  /** Whether fallback was resolved from i18n */
  isFromI18n: boolean
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useDynamicAgentWithLocale({
  agentName,
  i18nPath,
  staticFallbackConfig,
  deployLocale,
  contextVariables = {},
  connection,
  autoCreate,
  defaultConfig,
  refreshInterval,
  resolveArtifacts,
}: UseDynamicAgentWithLocaleOptions): UseDynamicAgentWithLocaleReturn {
  // Get current user locale from i18n
  const { i18n } = useTranslation()
  const userLocale = (i18n.language || 'en') as SupportedLanguage

  // Resolve which locale to use
  const resolvedLocale =
    deployLocale || userLocale || DEFAULT_AGENT_DEPLOY_LOCALE

  // State for i18n-resolved fallback
  const [i18nFallbackConfig, setI18nFallbackConfig] =
    useState<DefaultAgentConfig | null>(null)
  const [isFromI18n, setIsFromI18n] = useState(false)
  const [i18nLoading, setI18nLoading] = useState(true)

  // Load i18n fallback config
  useEffect(() => {
    async function loadI18nConfig() {
      setI18nLoading(true)
      try {
        const resolved = await resolveAgentConfig(
          i18nPath,
          resolvedLocale,
          contextVariables
        )

        if (resolved) {
          setI18nFallbackConfig({
            name: resolved.name,
            description: resolved.description,
            objective: resolved.objective,
            instruction: resolved.instruction,
            model: 'azure-gpt-4o', // Default model
            type: 'supervisor', // Default type
          })
          setIsFromI18n(true)
        } else {
          setI18nFallbackConfig(null)
          setIsFromI18n(false)
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          `[useDynamicAgentWithLocale] Failed to load i18n config for ${i18nPath}:`,
          error
        )
        setI18nFallbackConfig(null)
        setIsFromI18n(false)
      } finally {
        setI18nLoading(false)
      }
    }

    loadI18nConfig()
  }, [i18nPath, resolvedLocale, contextVariables])

  // Determine which fallback to use (static takes precedence)
  const effectiveFallback = useMemo(() => {
    if (staticFallbackConfig) {
      return staticFallbackConfig
    }
    return i18nFallbackConfig || undefined
  }, [staticFallbackConfig, i18nFallbackConfig])

  // Use the base dynamic agent hook
  const {
    agentConfig,
    isLoading: baseIsLoading,
    error,
    refresh,
    isUsingFallback,
  } = useDynamicAgent({
    agentName,
    connection,
    fallbackConfig: effectiveFallback,
    autoCreate,
    defaultConfig,
    refreshInterval,
    resolveArtifacts,
  })

  // Combined loading state
  const isLoading = i18nLoading || baseIsLoading

  // Refresh with context update
  const refreshWithContext = useCallback(async () => {
    // Reload i18n config with current context
    const resolved = await resolveAgentConfig(
      i18nPath,
      resolvedLocale,
      contextVariables
    )

    if (resolved) {
      setI18nFallbackConfig({
        name: resolved.name,
        description: resolved.description,
        objective: resolved.objective,
        instruction: resolved.instruction,
        model: 'azure-gpt-4o',
        type: 'supervisor',
      })
    }

    // Then refresh the base hook
    await refresh()
  }, [i18nPath, resolvedLocale, contextVariables, refresh])

  return {
    agentConfig,
    isLoading,
    error,
    refresh: refreshWithContext,
    isUsingFallback,
    resolvedLocale,
    isFromI18n: isUsingFallback && isFromI18n,
  }
}

/**
 * useDynamicRegistryAgent - Use an agent from the registry with i18n support
 *
 * @example
 * ```typescript
 * const { agentConfig, isLoading } = useDynamicRegistryAgent('ATLAS_QUICK', {
 *   contextVariables: {
 *     USER_NAME: user.name,
 *     CURRENT_MODULE: 'dashboard'
 *   }
 * })
 * ```
 */
export function useDynamicRegistryAgent(
  registryKey: keyof typeof AGENT_REGISTRY,
  options: {
    deployLocale?: SupportedLanguage
    contextVariables?: AgentContextVariables
    connection?: UseDynamicAgentWithLocaleOptions['connection']
  } = {}
): UseDynamicAgentWithLocaleReturn {
  const entry = AGENT_REGISTRY[registryKey]

  if (!entry) {
    throw new Error(`Agent "${registryKey}" not found in registry`)
  }

  return useDynamicAgentWithLocale({
    agentName: entry.platformName,
    i18nPath: entry.i18nPath,
    staticFallbackConfig: entry.fallbackConfig,
    deployLocale: options.deployLocale,
    contextVariables: options.contextVariables,
    connection: options.connection,
  })
}
