'use client'

import { useCallback, useState } from 'react'

import { useConnectionManager } from '@/features/connections/hooks/use-connection-manager'

import { useActiveNamespace } from './use-active-namespace'
import { useProxyMCP } from './use-proxy-mcp'

/**
 * Artifact type from platform
 */
export interface PlatformArtifact {
  id?: string
  key: string
  value: string
  description?: string
  artifact_type?: string
  artifact_type_id?: string
  accessibility?: 'NAMESPACE' | 'LICENSE' | 'USER'
  secret?: boolean
  locked?: boolean
  tags?: string
  version?: string
  created_at?: string
  updated_at?: string
}

/**
 * Options for creating/updating artifacts
 */
export interface CreateArtifactOptions {
  key: string
  value: string
  description?: string
  artifact_type_name?: string
  artifact_type_id?: string
  accessibility?: 'NAMESPACE' | 'LICENSE' | 'USER'
  secret?: boolean
  tags?: string
  version?: string
  conflict_strategy?: 'OVERWRITE' | 'SKIP' | 'ERROR'
}

/**
 * Options for searching artifacts
 */
export interface SearchArtifactOptions {
  key_pattern?: string
  artifact_type?: string
}

/**
 * Hook for artifact CRUD operations via MCP
 *
 * Uses the same pattern as useBootstrapAgentMCP:
 * 1. Gets session connection from useConnectionManager
 * 2. Uses useProxyMCP to call MCP tools
 * 3. Wraps MCP responses for easy consumption
 *
 * @example
 * ```tsx
 * const { createArtifact, getArtifact, searchArtifacts, isLoading, error } = useArtifactMCP()
 *
 * // Create prompt artifact
 * await createArtifact({
 *   key: 'AGENT_PROMPT_ATLAS_PT_BR',
 *   value: 'You are a helpful assistant...',
 *   description: 'System prompt for Atlas module',
 *   artifact_type_name: 'string',
 *   accessibility: 'NAMESPACE',
 * })
 *
 * // Get existing artifact
 * const prompt = await getArtifact('AGENT_PROMPT_ATLAS_PT_BR')
 *
 * // Search artifacts by pattern
 * const prompts = await searchArtifacts({ key_pattern: 'AGENT_PROMPT_.*' })
 * ```
 */
export function useArtifactMCP() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Get session connection from connection manager
  const { getConnection } = useConnectionManager()
  const sessionConnection = getConnection('session-connection')

  // Get active namespace for MCP
  const { activeNamespace } = useActiveNamespace()

  // Get MCP tool caller
  const { callTool, connected } = useProxyMCP({
    namespace: activeNamespace?.id || '',
    connection: sessionConnection,
    autoConnect: true,
  })

  /**
   * Parse MCP response to extract data
   */
  const parseMCPResponse = useCallback(
    <T>(
      result: unknown
    ): { success: boolean; data?: T; error?: string; count?: number } => {
      try {
        // Handle various response formats
        const rawResult = result as Record<string, unknown>

        // Format 1: { content: [{ text: JSON }] }
        if (
          rawResult?.content &&
          Array.isArray(rawResult.content) &&
          rawResult.content[0]?.text
        ) {
          const parsed = JSON.parse(
            (rawResult.content[0] as { text: string }).text
          )
          return {
            success: parsed.success ?? !parsed.error,
            data: parsed.data ?? parsed.artifacts ?? parsed.artifact,
            error: parsed.error ?? parsed.message,
            count: parsed.count,
          }
        }

        // Format 2: { data: ... }
        if (rawResult?.data) {
          return {
            success: true,
            data: rawResult.data as T,
          }
        }

        // Format 3: { success, artifacts/artifact, ... }
        if ('success' in rawResult) {
          const data =
            (rawResult.artifacts as T) ??
            (rawResult.artifact as T) ??
            (rawResult.data as T)
          return {
            success: rawResult.success as boolean,
            data,
            error: rawResult.error as string | undefined,
            count: rawResult.count as number | undefined,
          }
        }

        // Format 4: Direct data
        return { success: true, data: result as T }
      } catch {
        return {
          success: false,
          error: 'Failed to parse response',
        }
      }
    },
    []
  )

  /**
   * Result types for artifact operations
   */
  type CreateResult = {
    success: boolean
    artifact?: PlatformArtifact
    error?: string
  }

  type GetResult = {
    success: boolean
    artifacts?: PlatformArtifact[]
    error?: string
  }

  type DeleteResult = {
    success: boolean
    error?: string
  }

  /**
   * Create or update an artifact on the platform
   */
  const createArtifact = useCallback(
    async (options: CreateArtifactOptions): Promise<CreateResult> => {
      if (!connected || !callTool) {
        return { success: false, error: 'MCP not connected' }
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await callTool('create_artifact', {
          key: options.key,
          value: options.value,
          description: options.description || options.key,
          artifact_type_name: options.artifact_type_name || 'string',
          artifact_type_id: options.artifact_type_id,
          accessibility: options.accessibility || 'NAMESPACE',
          secret: options.secret ?? false,
          tags: options.tags || '',
          version: options.version || '1',
          conflict_strategy: options.conflict_strategy || 'OVERWRITE',
        })

        const parsed = parseMCPResponse<PlatformArtifact>(result)

        if (parsed.success) {
          return { success: true, artifact: parsed.data }
        } else {
          const err = new Error(parsed.error || 'Failed to create artifact')
          setError(err)
          return { success: false, error: parsed.error }
        }
      } catch (err) {
        const errObj =
          err instanceof Error ? err : new Error('Failed to create artifact')
        setError(errObj)
        return { success: false, error: errObj.message }
      } finally {
        setIsLoading(false)
      }
    },
    [connected, callTool, parseMCPResponse]
  )

  /**
   * Get artifact(s) by key pattern
   */
  const getArtifact = useCallback(
    async (keyPattern: string): Promise<GetResult> => {
      if (!connected || !callTool) {
        return { success: false, error: 'MCP not connected' }
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await callTool('get_artifact', {
          key_pattern: keyPattern,
        })

        const parsed = parseMCPResponse<PlatformArtifact[]>(result)

        if (parsed.success) {
          const artifacts = Array.isArray(parsed.data)
            ? parsed.data
            : parsed.data
              ? [parsed.data]
              : []
          return { success: true, artifacts }
        } else {
          // Not finding artifacts is not necessarily an error
          if (parsed.count === 0 || parsed.error?.includes('not found')) {
            return { success: true, artifacts: [] }
          }
          return { success: false, error: parsed.error }
        }
      } catch (err) {
        const errObj =
          err instanceof Error ? err : new Error('Failed to get artifact')
        setError(errObj)
        return { success: false, error: errObj.message }
      } finally {
        setIsLoading(false)
      }
    },
    [connected, callTool, parseMCPResponse]
  )

  /**
   * Search artifacts by pattern or type
   */
  const searchArtifacts = useCallback(
    async (options: SearchArtifactOptions = {}): Promise<GetResult> => {
      // Default to matching all if no pattern provided
      const keyPattern = options.key_pattern || '.*'
      return getArtifact(keyPattern)
    },
    [getArtifact]
  )

  /**
   * Delete an artifact
   */
  const deleteArtifact = useCallback(
    async (key: string): Promise<DeleteResult> => {
      if (!connected || !callTool) {
        return { success: false, error: 'MCP not connected' }
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await callTool('delete_artifact', { key })
        const parsed = parseMCPResponse(result)

        if (parsed.success) {
          return { success: true }
        } else {
          return { success: false, error: parsed.error }
        }
      } catch (err) {
        const errObj =
          err instanceof Error ? err : new Error('Failed to delete artifact')
        setError(errObj)
        return { success: false, error: errObj.message }
      } finally {
        setIsLoading(false)
      }
    },
    [connected, callTool, parseMCPResponse]
  )

  return {
    // CRUD operations
    createArtifact,
    getArtifact,
    searchArtifacts,
    deleteArtifact,

    // State
    isLoading,
    error,
    isConnected: connected,
  }
}
