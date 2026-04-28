/**
 * Dynamic Agent i18n Hook
 *
 * Hook for loading agent configurations from i18n (static fallback)
 * This is used when platform is not available or as fallback
 *
 * @module hooks/use-dynamic-agent-i18n
 */
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AGENT_REGISTRY,
  getAgentConfig,
  getAgentForRoute,
  getAgentI18nKeys,
  type AgentConfig,
  type AgentId,
} from '@/shared/lib/dynamic-agents/agent-registry'

/**
 * Context variables that can be interpolated in agent instructions
 */
export interface AgentContext {
  USER_NAME?: string
  USER_ROLE?: string
  USER_EMAIL?: string
  CURRENT_NAMESPACE?: string
  CURRENT_LICENSE?: string
  CURRENT_MODULE?: string
  CURRENT_STAGE?: string
  CURRENT_ENV?: string
  EPIC_NAME?: string
  PROJECT_NAME?: string
  SOURCE_ENV?: string
  TARGET_ENV?: string
  TARGET_AGENT?: string
  AVAILABLE_MODELS?: string
  AVAILABLE_SERVERS?: string
  [key: string]: string | undefined
}

/**
 * Agent config with i18n values
 */
export interface ResolvedAgentConfig extends AgentConfig {
  /** The agent registry ID */
  agentId: AgentId
  /** The i18n path used */
  i18nPath: string
}

/**
 * Interpolate variables in a string
 */
function interpolate(template: string, context: AgentContext): string {
  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    return context[key] ?? match
  })
}

/**
 * Hook result type
 */
export interface UseDynamicAgentI18nResult {
  /** Resolved agent configuration with i18n values */
  agent: ResolvedAgentConfig | null
  /** Whether the i18n is ready */
  isReady: boolean
  /** Get agent config by ID */
  getAgent: (
    agentId: AgentId,
    context?: AgentContext
  ) => ResolvedAgentConfig | null
  /** Get agent for current route */
  getAgentByRoute: (
    pathname: string,
    context?: AgentContext
  ) => ResolvedAgentConfig | null
  /** All available agent IDs */
  agentIds: AgentId[]
  /** Get fallback config for useDynamicAgent hook */
  getFallbackConfig: (
    agentId: AgentId,
    context?: AgentContext
  ) => {
    name: string
    instruction: string
    description?: string
    objective?: string
    type?: 'standard' | 'supervisor'
    model?: string
  } | null
}

/**
 * Hook to load agent configuration from i18n (static fallback)
 *
 * This hook provides agent configurations from translation files.
 * Use this as a fallback when the platform is not available.
 *
 * @param agentId - The agent ID to load (optional)
 * @param context - Variables to interpolate in the instruction
 * @returns Agent configuration and helper functions
 *
 * @example
 * ```tsx
 * // Use with useDynamicAgent as fallback
 * const { getFallbackConfig } = useDynamicAgentI18n(undefined, {
 *   USER_NAME: user.name,
 *   CURRENT_NAMESPACE: namespace.name,
 * })
 *
 * const { agentConfig } = useDynamicAgent({
 *   agentName: 'Atlas Quick Agent',
 *   fallbackConfig: getFallbackConfig('ATLAS_QUICK'),
 * })
 * ```
 */
export function useDynamicAgentI18n(
  agentId?: AgentId,
  context: AgentContext = {}
): UseDynamicAgentI18nResult {
  const { t, ready } = useTranslation('agents')

  // Get language instruction from common section
  const languageInstruction = t('common.languageInstruction', '')

  // Merge language instruction into context
  const fullContext = useMemo(
    () => ({
      ...context,
      LANGUAGE_INSTRUCTION: languageInstruction,
    }),
    [context, languageInstruction]
  )

  /**
   * Load a specific agent by ID
   */
  const getAgent = useCallback(
    (id: AgentId, ctx?: AgentContext): ResolvedAgentConfig | null => {
      const config = getAgentConfig(id)
      if (!config) return null

      const keys = getAgentI18nKeys(config.i18nPath)
      const mergedContext = { ...fullContext, ...ctx }

      const name = t(keys.name.replace('agents:', ''), '')
      const description = t(keys.description.replace('agents:', ''), '')
      const objective = t(keys.objective.replace('agents:', ''), '')
      const instruction = t(keys.instruction.replace('agents:', ''), '')

      if (!name || !instruction) return null

      return {
        agentId: id,
        i18nPath: config.i18nPath,
        name,
        description,
        objective: objective || undefined,
        instruction: interpolate(instruction, mergedContext),
      }
    },
    [t, fullContext]
  )

  /**
   * Get agent for a route path
   */
  const getAgentByRoute = useCallback(
    (pathname: string, ctx?: AgentContext): ResolvedAgentConfig | null => {
      const id = getAgentForRoute(pathname)
      if (!id) return null
      return getAgent(id, ctx)
    },
    [getAgent]
  )

  /**
   * Get fallback config for useDynamicAgent hook
   */
  const getFallbackConfig = useCallback(
    (id: AgentId, ctx?: AgentContext) => {
      const agent = getAgent(id, ctx)
      if (!agent) return null

      return {
        name: agent.name,
        instruction: agent.instruction,
        description: agent.description,
        objective: agent.objective,
        type: 'supervisor' as const,
        model: 'azure-gpt-4o',
      }
    },
    [getAgent]
  )

  /**
   * Current agent if ID provided
   */
  const agent = useMemo(() => {
    if (!agentId || !ready) return null
    return getAgent(agentId)
  }, [agentId, ready, getAgent])

  /**
   * All agent IDs
   */
  const agentIds = useMemo(() => Object.keys(AGENT_REGISTRY) as AgentId[], [])

  return {
    agent,
    isReady: ready,
    getAgent,
    getAgentByRoute,
    agentIds,
    getFallbackConfig,
  }
}

/**
 * Hook to get agent for current route from i18n
 *
 * @param pathname - Current route pathname
 * @param context - Variables to interpolate
 * @returns Agent configuration for the route
 */
export function useDynamicAgentI18nForRoute(
  pathname: string,
  context: AgentContext = {}
): ResolvedAgentConfig | null {
  const { getAgentByRoute, isReady } = useDynamicAgentI18n(undefined, context)
  return useMemo(() => {
    if (!isReady) return null
    return getAgentByRoute(pathname, context)
  }, [getAgentByRoute, pathname, context, isReady])
}

export default useDynamicAgentI18n
