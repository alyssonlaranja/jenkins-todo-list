/**
 * SDA2 MCP Integration Actions
 *
 * Provides 5 MCP-specific actions for knowledge base and persistence
 */

'use client'

import { useCopilotAction } from '@copilotkit/react-core'

import type { MCPActionProps } from './types'

// ============================================================================
// MCP Integration Actions Component
// ============================================================================

export function SDA2MCPIntegration({ mcpReady, callMCPTool }: MCPActionProps) {
  // ==========================================================================
  // 1. Search Artifacts in MCP
  // ==========================================================================

  useCopilotAction({
    name: 'sda2_mcp_searchArtifacts',
    description:
      'Search for artifacts in MCP knowledge base by term and optional type filter',
    parameters: [
      {
        name: 'searchTerm',
        type: 'string',
        description: 'Search term to find artifacts',
        required: true,
      },
      {
        name: 'artifactType',
        type: 'string',
        description:
          'Filter by artifact type (prd, architecture, epics, etc) - optional',
        required: false,
      },
    ],
    handler: async ({ searchTerm, artifactType }) => {
      console.log(
        '🔍 [SDA2 MCP] Searching artifacts:',
        searchTerm,
        artifactType
      )

      if (!mcpReady) {
        return {
          success: false,
          message: '❌ MCP not connected. Cannot search artifacts.',
        }
      }

      try {
        const result = await callMCPTool('search_artifacts', {
          query: searchTerm,
          artifact_type_name: artifactType || undefined,
          tags: 'sda2',
        })

        console.log('✅ [SDA2 MCP] Search results:', result)

        return {
          success: true,
          message: `🔍 Found artifacts for "${searchTerm}"`,
          data: result,
        }
      } catch (error) {
        console.error('❌ [SDA2 MCP] Search failed:', error)
        return {
          success: false,
          message: `❌ Search failed: ${error}`,
        }
      }
    },
  })

  // ==========================================================================
  // 2. Get Template from MCP
  // ==========================================================================

  useCopilotAction({
    name: 'sda2_mcp_getTemplate',
    description:
      'Retrieve a template from MCP by type (prd, architecture, epics, etc)',
    parameters: [
      {
        name: 'templateType',
        type: 'string',
        description:
          'Type of template to retrieve (prd, architecture, epics, brief, etc)',
        required: true,
      },
    ],
    handler: async ({ templateType }) => {
      console.log('📄 [SDA2 MCP] Getting template:', templateType)

      if (!mcpReady) {
        return {
          success: false,
          message: '❌ MCP not connected. Cannot get template.',
        }
      }

      try {
        const result = await callMCPTool('get_artifact', {
          key: `sda2:template:${templateType}`,
        })

        console.log('✅ [SDA2 MCP] Template retrieved:', templateType)

        return {
          success: true,
          message: `📄 Template "${templateType}" retrieved successfully`,
          data: result,
        }
      } catch (error) {
        console.error('❌ [SDA2 MCP] Get template failed:', error)
        return {
          success: false,
          message: `❌ Template not found: ${error}`,
        }
      }
    },
  })

  // ==========================================================================
  // 3. Persist Project to MCP
  // ==========================================================================

  useCopilotAction({
    name: 'sda2_mcp_persistProject',
    description: 'Persist a project to MCP for long-term storage',
    parameters: [
      {
        name: 'project',
        type: 'object',
        description: 'Project object to persist',
        required: true,
      },
    ],
    handler: async ({ project }) => {
      console.log('💾 [SDA2 MCP] Persisting project:', project)

      if (!mcpReady) {
        console.warn('⚠️ [SDA2 MCP] MCP offline, using localStorage fallback')

        try {
          // @ts-expect-error - project is unknown type
          localStorage.setItem(
            `sda2:project:${project.id}`,
            JSON.stringify(project)
          )
          return {
            success: true,
            localOnly: true,
            message: '⚠️ Project saved locally (MCP offline)',
          }
        } catch (error) {
          return {
            success: false,
            message: `❌ Local save failed: ${error}`,
          }
        }
      }

      try {
        const projectData = project as { id: string; name?: string }

        await callMCPTool('create_artifact', {
          key: `sda2:project:${projectData.id}`,
          value: JSON.stringify(project),
          description: `SDA2 Project: ${projectData.name || 'Unnamed'}`,
          accessibility: 'Namespace_User',
          tags: 'sda2,project',
          artifact_type_name: 'JSON',
        })

        console.log('✅ [SDA2 MCP] Project persisted to MCP')

        return {
          success: true,
          persisted: true,
          message: '✅ Project saved to MCP',
        }
      } catch (error) {
        console.error('❌ [SDA2 MCP] Persist failed:', error)

        // Emergency fallback
        try {
          // @ts-expect-error - project is unknown type
          localStorage.setItem(
            `sda2:project:${project.id}`,
            JSON.stringify(project)
          )
          return {
            success: true,
            localOnly: true,
            message: '⚠️ MCP failed, saved locally instead',
            error: String(error),
          }
        } catch (fallbackError) {
          return {
            success: false,
            message: `❌ All persistence methods failed: ${fallbackError}`,
          }
        }
      }
    },
  })

  // ==========================================================================
  // 4. List Projects from MCP
  // ==========================================================================

  useCopilotAction({
    name: 'sda2_mcp_listProjects',
    description: 'List all SDA2 projects stored in MCP',
    parameters: [],
    handler: async () => {
      console.log('📋 [SDA2 MCP] Listing projects from MCP')

      if (!mcpReady) {
        return {
          success: false,
          message: '❌ MCP not connected. Cannot list projects.',
        }
      }

      try {
        const result = await callMCPTool('search_artifacts', {
          query: '',
          tags: 'sda2,project',
          artifact_type_name: 'JSON',
        })

        console.log('✅ [SDA2 MCP] Projects listed:', result)

        return {
          success: true,
          message: '📋 Projects retrieved from MCP',
          data: result,
        }
      } catch (error) {
        console.error('❌ [SDA2 MCP] List projects failed:', error)
        return {
          success: false,
          message: `❌ Failed to list projects: ${error}`,
        }
      }
    },
  })

  // ==========================================================================
  // 5. Get Methodology Guidance from Knowledge Base
  // ==========================================================================

  useCopilotAction({
    name: 'sda2_mcp_getMethodologyGuidance',
    description:
      'Get Avanade Method guidance from MCP knowledge base for specific topics',
    parameters: [
      {
        name: 'topic',
        type: 'string',
        description:
          'Topic to get guidance on (e.g., "prd-writing", "architecture-patterns", "agile-practices")',
        required: true,
      },
    ],
    handler: async ({ topic }) => {
      console.log('🧠 [SDA2 MCP] Getting methodology guidance:', topic)

      if (!mcpReady) {
        return {
          success: false,
          message: '❌ MCP not connected. Cannot access knowledge base.',
        }
      }

      try {
        const result = await callMCPTool('search_artifacts', {
          query: topic,
          tags: 'methodology,guidance,avanade-method',
          artifact_type_name: 'MARKDOWN',
        })

        console.log('✅ [SDA2 MCP] Guidance retrieved:', topic)

        return {
          success: true,
          message: `🧠 Guidance found for "${topic}"`,
          data: result,
        }
      } catch (error) {
        console.error('❌ [SDA2 MCP] Get guidance failed:', error)
        return {
          success: false,
          message: `❌ Guidance not found: ${error}`,
        }
      }
    },
  })

  // No render needed - these are utility actions
  return null
}
