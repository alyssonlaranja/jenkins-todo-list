'use client'

/**
 * DynamicAgentProvider - Context-based Agent Configuration Provider
 *
 * Provides agent configuration through React Context, allowing deeply nested
 * components to access the agent config without prop drilling.
 *
 * Features:
 * - Fetches agent config on mount
 * - Provides context for child components
 * - Supports fallback configuration
 * - Auto-create missing agents (optional)
 *
 * @see DYNAMIC_AGENTS_MODULE_PROPOSAL.md
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { useDynamicAgent } from '@/shared/hooks/use-dynamic-agent'

import type { DefaultAgentConfig, DynamicAgentConfig } from './types'

// ============================================================================
// CONTEXT TYPE
// ============================================================================

export interface DynamicAgentContextValue {
  agentConfig: DynamicAgentConfig | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  isUsingFallback: boolean
  agentName: string
}

// ============================================================================
// CONTEXT
// ============================================================================

const DynamicAgentContext = createContext<DynamicAgentContextValue | null>(null)

// ============================================================================
// PROVIDER PROPS
// ============================================================================

export interface DynamicAgentProviderProps {
  /**
   * Agent name to fetch from the platform
   */
  agentName: string

  /**
   * Fallback configuration if agent doesn't exist
   */
  fallbackConfig?: DefaultAgentConfig

  /**
   * Auto-create agent if it doesn't exist
   * @default false
   */
  autoCreate?: boolean

  /**
   * Default config for auto-creation
   * Required if autoCreate is true
   */
  defaultConfig?: DefaultAgentConfig

  /**
   * Refresh interval in milliseconds
   * @default 0 (no auto-refresh)
   */
  refreshInterval?: number

  /**
   * Whether to resolve artifact placeholders in instruction
   * @default true
   */
  resolveArtifacts?: boolean

  /**
   * Children components
   */
  children: ReactNode

  /**
   * Loading component to show while fetching
   */
  loadingComponent?: ReactNode

  /**
   * Error component to show on error
   * If not provided, children are rendered with error in context
   */
  errorComponent?: ReactNode | ((error: string) => ReactNode)
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function DynamicAgentProvider({
  agentName,
  fallbackConfig,
  autoCreate = false,
  defaultConfig,
  refreshInterval = 0,
  resolveArtifacts: shouldResolveArtifacts = true,
  children,
  loadingComponent,
  errorComponent,
}: DynamicAgentProviderProps) {
  const { agentConfig, isLoading, error, refresh, isUsingFallback } =
    useDynamicAgent({
      agentName,
      fallbackConfig,
      autoCreate,
      defaultConfig,
      refreshInterval,
      resolveArtifacts: shouldResolveArtifacts,
    })

  const value = useMemo<DynamicAgentContextValue>(
    () => ({
      agentConfig,
      isLoading,
      error,
      refresh,
      isUsingFallback,
      agentName,
    }),
    [agentConfig, isLoading, error, refresh, isUsingFallback, agentName]
  )

  // Show loading component if provided and loading
  if (isLoading && loadingComponent) {
    return <>{loadingComponent}</>
  }

  // Show error component if provided and there's an error
  if (error && errorComponent) {
    if (typeof errorComponent === 'function') {
      return <>{errorComponent(error)}</>
    }
    return <>{errorComponent}</>
  }

  return (
    <DynamicAgentContext.Provider value={value}>
      {children}
    </DynamicAgentContext.Provider>
  )
}

// ============================================================================
// CONTEXT HOOK
// ============================================================================

/**
 * Hook to access the dynamic agent context
 *
 * @throws Error if used outside of DynamicAgentProvider
 */
export function useDynamicAgentContext(): DynamicAgentContextValue {
  const context = useContext(DynamicAgentContext)

  if (!context) {
    throw new Error(
      'useDynamicAgentContext must be used within a DynamicAgentProvider'
    )
  }

  return context
}

/**
 * Hook to optionally access the dynamic agent context
 * Returns null if not within a provider
 */
export function useDynamicAgentContextSafe(): DynamicAgentContextValue | null {
  return useContext(DynamicAgentContext)
}
