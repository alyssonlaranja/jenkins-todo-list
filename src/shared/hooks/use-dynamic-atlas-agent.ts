/**
 * useDynamicAtlasAgent - Atlas Quick Agent with Dynamic Configuration
 *
 * This hook combines:
 * 1. Dynamic agent fetching from platform via useDynamicAgent
 * 2. Context variable substitution (${USER_NAME}, ${CURRENT_MODULE}, etc.)
 * 3. Fallback to AGENT_REGISTRY configuration if platform agent not found
 *
 * The instruction template from the platform uses placeholders like:
 * - ${USER_NAME}, ${USER_EMAIL}
 * - ${CURRENT_MODULE}, ${CURRENT_PAGE}
 * - ${NAMESPACE}, ${LICENSE}
 *
 * These are substituted at runtime with actual context values.
 *
 * @see DYNAMIC_AGENTS_MODULE_PROPOSAL.md
 */

'use client'

import { useMemo } from 'react'

import { useDynamicAgent } from '@/shared/hooks/use-dynamic-agent'
import { AGENT_REGISTRY } from '@/shared/lib/dynamic-agents/agent-registry'

// ============================================================================
// TYPES
// ============================================================================

export interface AtlasContext {
  userName: string
  userEmail: string
  currentModule: string
  currentPage: string
  namespace: string
  license: string
}

export interface UseDynamicAtlasAgentOptions {
  context: AtlasContext
}

export interface UseDynamicAtlasAgentReturn {
  /** Final instruction with context variables substituted */
  instruction: string
  /** Whether the agent is loading from platform */
  isLoading: boolean
  /** Error if platform fetch failed */
  error: string | null
  /** Whether using fallback (platform agent not found) */
  isUsingFallback: boolean
  /** Refresh agent from platform */
  refresh: () => Promise<void>
  /** Original config from platform or fallback */
  agentConfig: ReturnType<typeof useDynamicAgent>['agentConfig']
}

// ============================================================================
// CONTEXT SUBSTITUTION
// ============================================================================

/**
 * Substitute context variables in the instruction template
 *
 * Supports patterns like:
 * - ${USER_NAME} -> context.userName
 * - ${CURRENT_MODULE} -> context.currentModule
 * - \${varName} (escaped) -> kept as-is for artifact references
 */
function substituteContextVariables(
  instruction: string,
  context: AtlasContext
): string {
  // Map of variable names to context values
  const variables: Record<string, string> = {
    USER_NAME: context.userName,
    USER_EMAIL: context.userEmail,
    CURRENT_MODULE: context.currentModule,
    CURRENT_PAGE: context.currentPage,
    NAMESPACE: context.namespace,
    LICENSE: context.license,
  }

  let result = instruction

  // Replace ${VAR_NAME} patterns (but not \${VAR_NAME} which are escaped)
  // The artifact resolver already handles ${ARTIFACT_KEY} patterns for artifacts
  // This handles the context-specific variables
  for (const [key, value] of Object.entries(variables)) {
    // Use a simple string replace for exact matches
    // Pattern: ${KEY} where KEY matches our context keys
    const pattern = new RegExp(`\\$\\{${key}\\}`, 'g')
    result = result.replace(pattern, value)
  }

  return result
}

// ============================================================================
// HOOK
// ============================================================================

export function useDynamicAtlasAgent({
  context,
}: UseDynamicAtlasAgentOptions): UseDynamicAtlasAgentReturn {
  // Get the Atlas agent configuration from registry
  const atlasRegistry = AGENT_REGISTRY.ATLAS_QUICK

  if (!atlasRegistry) {
    throw new Error('ATLAS_QUICK not found in AGENT_REGISTRY')
  }

  // Fetch agent from platform (or use fallback)
  const { agentConfig, isLoading, error, isUsingFallback, refresh } =
    useDynamicAgent({
      agentName: atlasRegistry.platformName,
      fallbackConfig: atlasRegistry.fallbackConfig,
      resolveArtifacts: true, // Resolve ${ARTIFACT_KEY} placeholders
    })

  // Substitute context variables in the instruction
  const instruction = useMemo(() => {
    if (!agentConfig?.instruction) {
      return ''
    }

    return substituteContextVariables(agentConfig.instruction, context)
  }, [agentConfig?.instruction, context])

  return {
    instruction,
    isLoading,
    error,
    isUsingFallback,
    refresh,
    agentConfig,
  }
}
