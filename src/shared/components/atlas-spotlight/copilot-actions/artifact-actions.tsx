'use client'

/**
 * Artifact Actions for Atlas Quick Agent
 *
 * Actions for searching, reading, and creating MCP artifacts.
 * Based on: src/features/upstream/components/wizard/copilot-actions/mcp-integration-actions.tsx
 */
import { useCopilotAction } from '@copilotkit/react-core'

import { useActionI18n } from '@/shared/hooks/use-action-i18n'
import { useI18n } from '@/shared/hooks/use-i18n'

import {
  ArtifactCreatedUI,
  ArtifactListUI,
  ArtifactReadUI,
  ArtifactSearchUI,
} from './artifact-result-ui'
import {
  callMCPToolWithParsing,
  type AtlasQuickAgentActionsProps,
} from './types'

// ============================================================================
// HOOK
// ============================================================================

export function useArtifactActions(props: AtlasQuickAgentActionsProps) {
  const { isConnected, callMCPTool } = props
  const { t } = useI18n('copilot')

  // ========================================
  // SEARCH ARTIFACTS
  // ========================================

  useCopilotAction({
    name: 'searchArtifacts',
    description: t('actions.spotlight.searchArtifacts.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'searchTerm',
        type: 'string',
        description: t('actions.spotlight.searchArtifacts.params.searchTerm'),
        required: true,
      },
    ],
    render: ({ status, result, args: _args }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as {
          artifacts: Array<{ key: string; type?: string; description?: string }>
          searchTerm: string
        }
        return <ArtifactSearchUI data={data} status={status} />
      }
      return <ArtifactSearchUI status={status} />
    },
    handler: async ({ searchTerm }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const escapedTerm = (searchTerm as string).replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        )
        const keyPattern = `(?i).*${escapedTerm}.*`

        const result = await callMCPToolWithParsing(
          callMCPTool,
          'get_artifact',
          { key_pattern: keyPattern }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        const data = result.result as {
          artifacts?: Array<{
            key: string
            description?: string
            type?: string
          }>
          matches?: Array<{ key: string; description?: string; type?: string }>
        }
        const artifacts = data.artifacts || data.matches || []

        if (artifacts.length === 0) {
          return { artifacts: [], searchTerm: searchTerm as string }
        }

        return {
          artifacts: artifacts.slice(0, 10),
          searchTerm: searchTerm as string,
        }
      } catch (error) {
        return `Erro na busca: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    },
  })

  // ========================================
  // LIST ARTIFACTS
  // ========================================

  useCopilotAction({
    name: 'listArtifacts',
    description: t('actions.spotlight.listArtifacts.description'),
    disabled: !isConnected,
    parameters: [],
    render: ({ status, result }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const artifacts = result as Array<{ key: string; type?: string }>
        return <ArtifactListUI artifacts={artifacts} status={status} />
      }
      return <ArtifactListUI status={status} />
    },
    handler: async () => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const result = await callMCPToolWithParsing(
          callMCPTool,
          'list_artifacts',
          {}
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        const data = result.result as {
          artifacts?: Array<{ key: string; type?: string }>
        }
        const artifacts = data.artifacts || []

        if (artifacts.length === 0) {
          return []
        }

        return artifacts.slice(0, 20)
      } catch (error) {
        return `Erro ao listar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    },
  })

  // ========================================
  // READ ARTIFACT
  // ========================================

  useCopilotAction({
    name: 'readArtifact',
    description: t('actions.spotlight.readArtifact.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'key',
        type: 'string',
        description: t('actions.spotlight.readArtifact.params.key'),
        required: true,
      },
    ],
    render: ({ status, result }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as {
          key: string
          type?: string
          description?: string
          value: string
        }
        return <ArtifactReadUI data={data} status={status} />
      }
      return <ArtifactReadUI status={status} />
    },
    handler: async ({ key }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const result = await callMCPToolWithParsing(
          callMCPTool,
          'get_artifact',
          { key }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        const data = result.result as {
          key?: string
          value?: string | object
          type?: string
          description?: string
        }

        if (!data.value && !data.key) {
          return `Artefato "${key}" nao encontrado.`
        }

        let value = data.value || ''
        if (typeof value === 'object') {
          value = JSON.stringify(value, null, 2)
        }

        return {
          key: (data.key || key) as string,
          type: data.type,
          description: data.description,
          value: value as string,
        }
      } catch (error) {
        return `Erro ao ler: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    },
  })

  // ========================================
  // CREATE ARTIFACT
  // ========================================

  useCopilotAction({
    name: 'createArtifact',
    description: t('actions.spotlight.createArtifact.description'),
    disabled: !isConnected,
    parameters: [
      {
        name: 'key',
        type: 'string',
        description: t('actions.spotlight.createArtifact.params.key'),
        required: true,
      },
      {
        name: 'value',
        type: 'string',
        description: t('actions.spotlight.createArtifact.params.value'),
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        description: t('actions.spotlight.createArtifact.params.description'),
        required: true,
      },
      {
        name: 'type',
        type: 'string',
        description: t('actions.spotlight.createArtifact.params.type'),
        required: false,
      },
    ],
    render: ({ status, result }) => {
      if (status === 'complete' && result && typeof result === 'object') {
        const data = result as {
          key: string
          type: string
          description?: string
        }
        return <ArtifactCreatedUI data={data} status={status} />
      }
      return <ArtifactCreatedUI status={status} />
    },
    handler: async ({ key, value, description, type = 'general' }) => {
      if (!callMCPTool) {
        return 'Erro: Conexao MCP nao disponivel.'
      }

      try {
        const result = await callMCPToolWithParsing(
          callMCPTool,
          'create_artifact',
          {
            key,
            value,
            description,
            type,
            accessibility: 'Namespace',
          }
        )

        if (!result.ok) {
          throw new Error(result.error)
        }

        return {
          key: key as string,
          type: type as string,
          description: description as string,
        }
      } catch (error) {
        return `❌ Erro: ${error instanceof Error ? error.message : 'Erro'}`
      }
    },
  })
}
