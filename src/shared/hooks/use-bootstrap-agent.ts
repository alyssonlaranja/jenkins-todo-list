'use client'

import { useState } from 'react'

import { cockpitApiClient } from '@/shared/lib/cockpit/api-client'
import type { UtilityAgent } from '@/shared/lib/cockpit/types'

/**
 * Hook to ensure at least one utility agent exists in the namespace
 *
 * Pattern: Uses cockpitApiClient.ensureBootstrapUtilityAgent()
 * Strategy:
 * 1. Check if namespace has existing utility agents
 * 2. If yes, return first agent
 * 3. If no, create "MCP Portal Agent" bootstrap agent
 *
 * Use case: Required for Custom Environments (MCP Legacy needs x-cockpit-utility-agent-id)
 *
 * @param namespaceId - Namespace UUID (usually activeNamespaceId from permission-store)
 * @returns { ensureAgent, isLoading, error }
 *
 * @example
 * ```typescript
 * const { ensureAgent } = useBootstrapAgent(activeNamespaceId)
 *
 * const handleSave = async () => {
 *   const agent = await ensureAgent()
 *   console.log('Bootstrap agent ID:', agent.id)
 *
 *   // Use agent.id for x-cockpit-utility-agent-id header
 *   await callTool('create_artifact', {...}, {
 *     'x-cockpit-utility-agent-id': agent.id
 *   })
 * }
 * ```
 */
export function useBootstrapAgent(namespaceId: string | null | undefined) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Ensures at least one utility agent exists in the namespace
   *
   * Flow:
   * 1. Checks if namespace has utility agents via API
   * 2. If agents exist, returns first one
   * 3. If no agents, creates "MCP Portal Agent" (type: Standard)
   * 4. Returns agent ID for MCP Legacy header
   *
   * @throws Error if namespaceId is missing or API call fails
   * @returns Promise<UtilityAgent> - Guaranteed utility agent
   */
  const ensureAgent = async (): Promise<UtilityAgent> => {
    if (!namespaceId) {
      const error = new Error(
        'Namespace ID is required to ensure utility agent'
      )
      setError(error)
      throw error
    }

    setIsLoading(true)
    setError(null)

    try {
      // Uses existing function from cockpitApiClient
      // Pattern: cockpit-portal pattern for bootstrap agent creation
      // Line reference: src/shared/lib/cockpit/api-client.ts:398-422
      const agent =
        await cockpitApiClient.ensureBootstrapUtilityAgent(namespaceId)

      console.log('[useBootstrapAgent] Ensured agent:', {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        namespaceId,
      })

      return agent
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Failed to ensure utility agent exists')

      console.error('[useBootstrapAgent] Error:', error)
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    /**
     * Ensures utility agent exists and returns it
     * Safe to call multiple times (idempotent)
     */
    ensureAgent,

    /**
     * Loading state during agent check/creation
     */
    isLoading,

    /**
     * Error if agent check/creation failed
     */
    error,
  }
}
