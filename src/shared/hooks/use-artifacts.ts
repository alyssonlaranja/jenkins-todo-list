import { useCallback, useState } from 'react'

import { Connection } from '@/features/connections/types/connection'

import { useProxyMCP } from './use-proxy-mcp'

interface Artifact {
  id?: string
  key: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
  description: string
  version: number
  artifactType?: string
  accessibility?: string
  tags?: string
}

interface CreateArtifactParams {
  key: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
  description: string
  artifactType?: string
  accessibility?: string
  tags?: string
}

export function useArtifacts(connection: Connection) {
  const { callTool, connected } = useProxyMCP({
    namespace: connection.environmentRef.namespaceName,
    autoConnect: true,
    skipToolsDiscovery: true,
    connection,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createArtifact = useCallback(
    async (params: CreateArtifactParams): Promise<Artifact> => {
      if (!connected) {
        throw new Error('Not connected to MCP server')
      }

      setLoading(true)
      setError(null)

      try {
        // Serialize value to JSON string
        const valueString =
          typeof params.value === 'string'
            ? params.value
            : JSON.stringify(params.value)

        const result = await callTool('create_artifact', {
          key: params.key,
          value: valueString,
          description: params.description,
          artifact_type_name: params.artifactType || 'JSON',
          accessibility: params.accessibility || 'Namespace',
          conflict_strategy: 'OVERWRITE',
          tags: params.tags || '',
        })

        // Parse response - handle flexible MCP response formats
        const data = result.content?.[0]?.text
          ? JSON.parse(result.content[0].text)
          : result.data || result.result || result.raw?.result

        const artifact = data.artifact || data

        // Parse value back to object if it's JSON
        let parsedValue = artifact.value
        try {
          parsedValue = JSON.parse(artifact.value)
        } catch {
          // Keep as string if not valid JSON
        }

        setLoading(false)
        return {
          ...artifact,
          value: parsedValue,
        }
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorMessage = (err as any).message || 'Failed to create artifact'
        setError(errorMessage)
        setLoading(false)
        throw new Error(errorMessage)
      }
    },
    [callTool, connected]
  )

  const getArtifact = useCallback(
    async (key: string): Promise<Artifact> => {
      if (!connected) {
        throw new Error('Not connected to MCP server')
      }

      setLoading(true)
      setError(null)

      try {
        // get_artifact returns an ARRAY of artifacts, even for exact key match
        const result = await callTool('get_artifact', { key_pattern: key })

        // Parse response - handle flexible MCP response formats
        const data = result.content?.[0]?.text
          ? JSON.parse(result.content[0].text)
          : result.data || result.result || result.raw?.result

        // get_artifact returns { artifacts: [], count: N }
        const artifacts = data.artifacts || []

        if (artifacts.length === 0) {
          throw new Error(`Artifact not found: ${key}`)
        }

        // Get first artifact (exact match should return only 1)
        const artifact = artifacts[0]

        // Parse value back to object if it's JSON
        let parsedValue = artifact.value
        try {
          parsedValue = JSON.parse(artifact.value)
        } catch {
          // Keep as string if not valid JSON
        }

        setLoading(false)
        return {
          ...artifact,
          value: parsedValue,
        }
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorMessage = (err as any).message || 'Failed to get artifact'
        setError(errorMessage)
        setLoading(false)
        throw new Error(errorMessage)
      }
    },
    [callTool, connected]
  )

  const updateArtifact = useCallback(
    async (
      key: string,
      params: Partial<CreateArtifactParams>
    ): Promise<Artifact> => {
      if (!connected) {
        throw new Error('Not connected to MCP server')
      }

      setLoading(true)
      setError(null)

      try {
        // Get current artifact first
        const current = await getArtifact(key)

        console.log('🔍 updateArtifact - Current artifact:', current)

        // Merge with updates
        const valueString = params.value
          ? typeof params.value === 'string'
            ? params.value
            : JSON.stringify(params.value)
          : current.value

        // Use artifact.id (UUID) not artifact.key!
        const artifactId = current.id || key

        console.log('🔍 updateArtifact - Calling MCP tool with:', {
          id: artifactId,
          value: valueString.substring(0, 100) + '...',
          description: params.description || current.description,
          promote_to_production: true,
        })

        const result = await callTool('update_artifact', {
          id: artifactId, // Use UUID id (not key!)
          value: valueString,
          description: params.description || current.description,
          promote_to_production: true, // Automatically promote new version to production
        })

        console.log('🔍 updateArtifact - MCP tool response:', result)

        // Parse response
        const data = result.content?.[0]?.text
          ? JSON.parse(result.content[0].text)
          : result.data || result.result || result.raw?.result

        console.log('🔍 updateArtifact - Parsed data:', data)

        const artifact = data.artifact || data

        let parsedValue = artifact.value
        try {
          parsedValue = JSON.parse(artifact.value)
        } catch {
          // Keep as string
        }

        setLoading(false)
        return {
          ...artifact,
          value: parsedValue,
        }
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorMessage = (err as any).message || 'Failed to update artifact'
        setError(errorMessage)
        setLoading(false)
        throw new Error(errorMessage)
      }
    },
    [callTool, connected, getArtifact]
  )

  const listArtifacts = useCallback(
    async (prefix?: string): Promise<Artifact[]> => {
      if (!connected) {
        throw new Error('Not connected to MCP server')
      }

      setLoading(true)
      setError(null)

      try {
        const result = await callTool(
          'list_artifacts',
          prefix ? { key_prefix: prefix } : {}
        )

        // Parse response
        const data = result.content?.[0]?.text
          ? JSON.parse(result.content[0].text)
          : result.data || result.result || result.raw?.result

        const artifacts = data.artifacts || data || []

        setLoading(false)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return artifacts.map((artifact: any) => {
          let parsedValue = artifact.value
          try {
            parsedValue = JSON.parse(artifact.value)
          } catch {
            // Keep as string
          }
          return {
            ...artifact,
            value: parsedValue,
          }
        })
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorMessage = (err as any).message || 'Failed to list artifacts'
        setError(errorMessage)
        setLoading(false)
        throw new Error(errorMessage)
      }
    },
    [callTool, connected]
  )

  const searchArtifactsByPattern = useCallback(
    async (keyPattern: string, version?: string): Promise<Artifact[]> => {
      if (!connected) {
        throw new Error('Not connected to MCP server')
      }

      setLoading(true)
      setError(null)

      try {
        const result = await callTool('get_artifact', {
          key_pattern: keyPattern,
          ...(version && { version }),
        })

        // Parse response
        const data = result.content?.[0]?.text
          ? JSON.parse(result.content[0].text)
          : result.data || result.result || result.raw?.result

        const artifacts = data.artifacts || []

        setLoading(false)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return artifacts.map((artifact: any) => {
          let parsedValue = artifact.value
          try {
            parsedValue = JSON.parse(artifact.value)
          } catch {
            // Keep as string
          }
          return {
            ...artifact,
            value: parsedValue,
          }
        })
      } catch (err) {
        const errorMessage =
          (err as any).message || 'Failed to search artifacts'
        setError(errorMessage)
        setLoading(false)
        throw new Error(errorMessage)
      }
    },
    [callTool, connected]
  )

  const setArtifactVersionProduction = useCallback(
    async (artifactId: string, versionNumber: number): Promise<void> => {
      if (!connected) {
        throw new Error('Not connected to MCP server')
      }

      setLoading(true)
      setError(null)

      try {
        await callTool('set_artifact_version_production', {
          artifact_id: artifactId,
          version_number: versionNumber,
        })

        setLoading(false)
      } catch (err) {
        const errorMessage =
          (err as any).message || 'Failed to set artifact version as production'
        setError(errorMessage)
        setLoading(false)
        throw new Error(errorMessage)
      }
    },
    [callTool, connected]
  )

  return {
    createArtifact,
    getArtifact,
    updateArtifact,
    listArtifacts,
    searchArtifactsByPattern,
    setArtifactVersionProduction,
    loading,
    error,
    isConnected: connected,
  }
}
