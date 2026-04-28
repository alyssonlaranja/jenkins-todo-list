/**
 * SDA2 Handlers - Action Handlers Registry
 *
 * Organizes all CopilotKit actions for Upstream SDA 2.0
 * Categories: Project, Conversation, Artifact, Agent, Navigation
 */

import { v4 as uuidv4 } from 'uuid'

import type { Artifact, Conversation, Message, Project } from '../types'
import type {
  ActionHandlerRegistry,
  PersistenceResult,
  SDA2HandlerContext,
} from './types'

// ============================================================================
// Helper: Persist to MCP with localStorage fallback
// ============================================================================

async function persistToMCP(
  ctx: SDA2HandlerContext,
  key: string,
  data: unknown
): Promise<PersistenceResult> {
  try {
    if (ctx.mcpReady) {
      await ctx.callMCPTool('create_artifact', {
        key,
        value: JSON.stringify(data),
        description: `SDA2 data: ${key}`,
        accessibility: 'Namespace_User',
      })

      console.log('✅ [SDA2] Persisted to MCP:', key)
      return { success: true, persisted: true }
    } else {
      // Fallback to localStorage
      localStorage.setItem(key, JSON.stringify(data))
      console.warn('⚠️ [SDA2] MCP offline, using localStorage:', key)
      return { success: true, persisted: false, localOnly: true }
    }
  } catch (error) {
    console.error('❌ [SDA2] Persistence failed:', error)

    // Emergency fallback
    try {
      localStorage.setItem(key, JSON.stringify(data))
      return {
        success: true,
        persisted: false,
        localOnly: true,
        error: String(error),
      }
    } catch (fallbackError) {
      return { success: false, persisted: false, error: String(fallbackError) }
    }
  }
}

// ============================================================================
// Create Handler Registry
// ============================================================================

export function createSDA2Handlers(
  ctx: SDA2HandlerContext
): ActionHandlerRegistry {
  // ==========================================================================
  // PROJECT HANDLERS
  // ==========================================================================

  const project_create: ActionHandlerRegistry['project_create'] = {
    name: 'sda2_project_create',
    description: 'Create a new SDA2 project with name and optional description',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Project name (required)',
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        description: 'Project description (optional)',
        required: false,
      },
    ],
    execute: async ({ name, description }) => {
      console.log('🎯 [SDA2] Creating project:', name)

      try {
        const project = await ctx.projectService.createProject(
          String(name),
          description ? String(description) : undefined
        )

        // Persist to MCP
        await persistToMCP(ctx, `sda2:project:${project.id}`, project)

        // Update state
        ctx.setProject(project)

        return `✅ Project "${project.name}" created successfully! ID: ${project.id}`
      } catch (error) {
        console.error('❌ [SDA2] Create project failed:', error)
        return `❌ Failed to create project: ${error}`
      }
    },
  }

  const project_select: ActionHandlerRegistry['project_select'] = {
    name: 'sda2_project_select',
    description: 'Select an existing project by ID or name',
    parameters: [
      {
        name: 'identifier',
        type: 'string',
        description: 'Project ID or name',
        required: true,
      },
    ],
    execute: async ({ identifier }) => {
      console.log('🎯 [SDA2] Selecting project:', identifier)

      try {
        // Try to get by slug first
        const project = await ctx.projectService.getProject(String(identifier))

        if (!project) {
          return `❌ Project "${identifier}" not found`
        }

        ctx.setProject(project)
        return `✅ Project "${project.name}" selected!`
      } catch (error) {
        console.error('❌ [SDA2] Select project failed:', error)
        return `❌ Failed to select project: ${error}`
      }
    },
  }

  const project_update: ActionHandlerRegistry['project_update'] = {
    name: 'sda2_project_update',
    description: 'Update current project properties',
    parameters: [
      {
        name: 'updates',
        type: 'object',
        description: 'Project updates (name, description, etc)',
        required: true,
      },
    ],
    execute: async ({ updates }) => {
      console.log('🎯 [SDA2] Updating project:', updates)

      if (!ctx.project) {
        return '❌ No project selected'
      }

      try {
        const updated = await ctx.projectService.updateProject(
          ctx.project.id,
          updates as Partial<Project>
        )

        // Persist to MCP
        await persistToMCP(ctx, `sda2:project:${updated.id}`, updated)

        ctx.setProject(updated)
        return `✅ Project updated successfully!`
      } catch (error) {
        console.error('❌ [SDA2] Update project failed:', error)
        return `❌ Failed to update project: ${error}`
      }
    },
  }

  const project_list: ActionHandlerRegistry['project_list'] = {
    name: 'sda2_project_list',
    description: 'List all available projects',
    parameters: [],
    execute: async () => {
      console.log('🎯 [SDA2] Listing projects')

      try {
        const projects = await ctx.projectService.listProjects()

        if (projects.length === 0) {
          return '📋 No projects found. Create one with "create new project".'
        }

        const list = projects
          .map((p, i) => `${i + 1}. ${p.name} (ID: ${p.id})`)
          .join('\n')

        return `📋 Available projects:\n${list}`
      } catch (error) {
        console.error('❌ [SDA2] List projects failed:', error)
        return `❌ Failed to list projects: ${error}`
      }
    },
  }

  // ==========================================================================
  // CONVERSATION HANDLERS
  // ==========================================================================

  const conversation_create: ActionHandlerRegistry['conversation_create'] = {
    name: 'sda2_conversation_create',
    description: 'Create a new conversation/chat in current project',
    parameters: [
      {
        name: 'title',
        type: 'string',
        description: 'Conversation title',
        required: true,
      },
      {
        name: 'agentType',
        type: 'string',
        description: 'Agent type: pm, architect, po, ux, analyst, supervisor',
        required: true,
      },
    ],
    execute: async ({ title, agentType }) => {
      console.log('🎯 [SDA2] Creating conversation:', title, agentType)

      if (!ctx.project) {
        return '❌ No project selected. Select or create a project first.'
      }

      try {
        const conversation = await ctx.chatService.createConversation(
          ctx.project.id,
          String(title),
          String(agentType)
        )

        // Persist to MCP
        await persistToMCP(
          ctx,
          `sda2:conversation:${conversation.id}`,
          conversation
        )

        ctx.setCurrentConversation(conversation)
        return `✅ Conversation "${conversation.title}" created with ${conversation.agentName}!`
      } catch (error) {
        console.error('❌ [SDA2] Create conversation failed:', error)
        return `❌ Failed to create conversation: ${error}`
      }
    },
  }

  const conversation_select: ActionHandlerRegistry['conversation_select'] = {
    name: 'sda2_conversation_select',
    description: 'Select an existing conversation',
    parameters: [
      {
        name: 'conversationId',
        type: 'string',
        description: 'Conversation ID',
        required: true,
      },
    ],
    execute: async ({ conversationId }) => {
      console.log('🎯 [SDA2] Selecting conversation:', conversationId)

      if (!ctx.project) {
        return '❌ No project selected'
      }

      try {
        const conversation = await ctx.chatService.getConversation(
          ctx.project.id,
          String(conversationId)
        )

        if (!conversation) {
          return `❌ Conversation "${conversationId}" not found`
        }

        ctx.setCurrentConversation(conversation)
        return `✅ Conversation "${conversation.title}" selected!`
      } catch (error) {
        console.error('❌ [SDA2] Select conversation failed:', error)
        return `❌ Failed to select conversation: ${error}`
      }
    },
  }

  const conversation_addMessage: ActionHandlerRegistry['conversation_addMessage'] =
    {
      name: 'sda2_conversation_addMessage',
      description: 'Add a message to current conversation',
      parameters: [
        {
          name: 'content',
          type: 'string',
          description: 'Message content',
          required: true,
        },
        {
          name: 'role',
          type: 'string',
          description: 'Message role: user or assistant',
          required: true,
        },
      ],
      execute: async ({ content, role }) => {
        console.log('🎯 [SDA2] Adding message to conversation')

        if (!ctx.currentConversation) {
          return '❌ No conversation selected'
        }

        try {
          const message: Message = {
            id: uuidv4(),
            conversationId: ctx.currentConversation.id,
            role: String(role) as 'user' | 'assistant',
            content: String(content),
            timestamp: new Date().toISOString(),
          }

          const updated = await ctx.chatService.addMessage(
            ctx.currentConversation,
            message
          )

          // Persist to MCP
          await persistToMCP(ctx, `sda2:conversation:${updated.id}`, updated)

          ctx.setCurrentConversation(updated)
          return `✅ Message added to conversation`
        } catch (error) {
          console.error('❌ [SDA2] Add message failed:', error)
          return `❌ Failed to add message: ${error}`
        }
      },
    }

  const conversation_list: ActionHandlerRegistry['conversation_list'] = {
    name: 'sda2_conversation_list',
    description: 'List all conversations in current project',
    parameters: [],
    execute: async () => {
      console.log('🎯 [SDA2] Listing conversations')

      if (!ctx.project) {
        return '❌ No project selected'
      }

      try {
        const conversations = ctx.project.conversations || []

        if (conversations.length === 0) {
          return '📋 No conversations found. Create one with "start new chat".'
        }

        const list = conversations
          .map((c, i) => `${i + 1}. ${c.title} (Agent: ${c.agentName})`)
          .join('\n')

        return `📋 Conversations in ${ctx.project.name}:\n${list}`
      } catch (error) {
        console.error('❌ [SDA2] List conversations failed:', error)
        return `❌ Failed to list conversations: ${error}`
      }
    },
  }

  // ==========================================================================
  // ARTIFACT HANDLERS
  // ==========================================================================

  const artifact_create: ActionHandlerRegistry['artifact_create'] = {
    name: 'sda2_artifact_create',
    description: 'Create a new artifact (PRD, Architecture, etc)',
    parameters: [
      {
        name: 'title',
        type: 'string',
        description: 'Artifact title',
        required: true,
      },
      {
        name: 'type',
        type: 'string',
        description: 'Artifact type: prd-greenfield, architecture, epics, etc',
        required: true,
      },
      {
        name: 'content',
        type: 'string',
        description: 'Artifact content',
        required: true,
      },
    ],
    execute: async ({ title, type, content }) => {
      console.log('🎯 [SDA2] Creating artifact:', title, type)

      if (!ctx.project) {
        return '❌ No project selected'
      }

      try {
        const artifact: Partial<Artifact> = {
          id: uuidv4(),
          projectId: ctx.project.id,
          title: String(title),
          type: String(type) as Artifact['type'],
          content: String(content),
          agentName: ctx.currentConversation?.agentName || 'Supervisor',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          status: 'draft',
        }

        const created = await ctx.artifactService.createArtifact(artifact)

        // Persist to MCP
        await persistToMCP(ctx, `sda2:artifact:${created.id}`, created)

        // Add to artifacts list
        ctx.setArtifacts([...ctx.artifacts, created])

        return `✅ Artifact "${created.title}" created successfully!`
      } catch (error) {
        console.error('❌ [SDA2] Create artifact failed:', error)
        return `❌ Failed to create artifact: ${error}`
      }
    },
  }

  const artifact_update: ActionHandlerRegistry['artifact_update'] = {
    name: 'sda2_artifact_update',
    description: 'Update an existing artifact',
    parameters: [
      {
        name: 'artifactId',
        type: 'string',
        description: 'Artifact ID',
        required: true,
      },
      {
        name: 'updates',
        type: 'object',
        description: 'Artifact updates (title, content, status, etc)',
        required: true,
      },
    ],
    execute: async ({ artifactId, updates }) => {
      console.log('🎯 [SDA2] Updating artifact:', artifactId)

      try {
        const updated = await ctx.artifactService.updateArtifact(
          String(artifactId),
          updates as Partial<Artifact>
        )

        // Persist to MCP
        await persistToMCP(ctx, `sda2:artifact:${updated.id}`, updated)

        // Update artifacts list
        const newArtifacts = ctx.artifacts.map(a =>
          a.id === updated.id ? updated : a
        )
        ctx.setArtifacts(newArtifacts)

        return `✅ Artifact updated successfully!`
      } catch (error) {
        console.error('❌ [SDA2] Update artifact failed:', error)
        return `❌ Failed to update artifact: ${error}`
      }
    },
  }

  const artifact_search: ActionHandlerRegistry['artifact_search'] = {
    name: 'sda2_artifact_search',
    description: 'Search artifacts by query and optional type filter',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'Search query',
        required: true,
      },
      {
        name: 'type',
        type: 'string',
        description: 'Artifact type filter (optional)',
        required: false,
      },
    ],
    execute: async ({ query, type }) => {
      console.log('🎯 [SDA2] Searching artifacts:', query, type)

      try {
        const results = await ctx.artifactService.searchArtifacts(
          String(query),
          type ? String(type) : undefined
        )

        if (results.length === 0) {
          return `🔍 No artifacts found for "${query}"`
        }

        const list = results
          .map((a, i) => `${i + 1}. ${a.title} (${a.type})`)
          .join('\n')

        return `🔍 Found ${results.length} artifacts:\n${list}`
      } catch (error) {
        console.error('❌ [SDA2] Search artifacts failed:', error)
        return `❌ Failed to search artifacts: ${error}`
      }
    },
  }

  const artifact_view: ActionHandlerRegistry['artifact_view'] = {
    name: 'sda2_artifact_view',
    description: 'View an artifact by ID',
    parameters: [
      {
        name: 'artifactId',
        type: 'string',
        description: 'Artifact ID',
        required: true,
      },
    ],
    execute: async ({ artifactId }) => {
      console.log('🎯 [SDA2] Viewing artifact:', artifactId)

      try {
        const artifact = await ctx.artifactService.getArtifact(
          String(artifactId)
        )

        if (!artifact) {
          return `❌ Artifact "${artifactId}" not found`
        }

        return `📄 **${artifact.title}** (${artifact.type})\n\n${artifact.content.substring(0, 500)}...`
      } catch (error) {
        console.error('❌ [SDA2] View artifact failed:', error)
        return `❌ Failed to view artifact: ${error}`
      }
    },
  }

  // ==========================================================================
  // AGENT HANDLER
  // ==========================================================================

  const agent_select: ActionHandlerRegistry['agent_select'] = {
    name: 'sda2_agent_select',
    description: 'Select an agent for the current conversation',
    parameters: [
      {
        name: 'agentType',
        type: 'string',
        description: 'Agent type: pm, architect, po, ux, analyst, supervisor',
        required: true,
      },
    ],
    execute: async ({ agentType }) => {
      console.log('🎯 [SDA2] Selecting agent:', agentType)

      if (!ctx.currentConversation) {
        return '❌ No conversation selected'
      }

      const agentNames: Record<string, string> = {
        pm: 'João - Project Manager',
        architect: 'Wilson - Software Architect',
        po: 'Paula - Product Owner',
        ux: 'Sofia - UX Designer',
        analyst: 'Maria - Business Analyst',
        supervisor: 'Avanade Supervisor',
      }

      const agentName = agentNames[String(agentType)] || 'Unknown Agent'

      // Update conversation with new agent
      const updated = {
        ...ctx.currentConversation,
        agentType: String(agentType) as Conversation['agentType'],
        agentName,
      }

      await persistToMCP(ctx, `sda2:conversation:${updated.id}`, updated)
      ctx.setCurrentConversation(updated)

      return `✅ Agent selected: ${agentName}`
    },
  }

  // ==========================================================================
  // MCP ACTIONS (Placeholders - implemented in sda2-mcp-integration.tsx)
  // ==========================================================================

  const mcp_searchArtifacts: ActionHandlerRegistry['mcp_searchArtifacts'] = {
    name: 'sda2_mcp_searchArtifacts',
    description: 'Search artifacts in MCP knowledge base',
    parameters: [
      {
        name: 'searchTerm',
        type: 'string',
        description: 'Search term',
        required: true,
      },
    ],
    execute: async ({ searchTerm }) => {
      return `🔍 MCP search for "${searchTerm}" - Use mcp-integration.tsx`
    },
  }

  const mcp_getTemplate: ActionHandlerRegistry['mcp_getTemplate'] = {
    name: 'sda2_mcp_getTemplate',
    description: 'Get template from MCP',
    parameters: [
      {
        name: 'templateType',
        type: 'string',
        description: 'Template type',
        required: true,
      },
    ],
    execute: async ({ templateType }) => {
      return `📄 Getting template "${templateType}" - Use mcp-integration.tsx`
    },
  }

  const mcp_persistProject: ActionHandlerRegistry['mcp_persistProject'] = {
    name: 'sda2_mcp_persistProject',
    description: 'Persist project to MCP',
    parameters: [
      {
        name: 'project',
        type: 'object',
        description: 'Project data',
        required: true,
      },
    ],
    execute: async () => {
      return `💾 Persisting project - Use mcp-integration.tsx`
    },
  }

  const mcp_listProjects: ActionHandlerRegistry['mcp_listProjects'] = {
    name: 'sda2_mcp_listProjects',
    description: 'List all projects from MCP',
    parameters: [],
    execute: async () => {
      return `📋 Listing MCP projects - Use mcp-integration.tsx`
    },
  }

  const mcp_getMethodologyGuidance: ActionHandlerRegistry['mcp_getMethodologyGuidance'] =
    {
      name: 'sda2_mcp_getMethodologyGuidance',
      description: 'Get methodology guidance from MCP knowledge base',
      parameters: [
        {
          name: 'topic',
          type: 'string',
          description: 'Guidance topic',
          required: true,
        },
      ],
      execute: async ({ topic }) => {
        return `🧠 Getting guidance on "${topic}" - Use mcp-integration.tsx`
      },
    }

  // ==========================================================================
  // RETURN REGISTRY
  // ==========================================================================

  return {
    project_create,
    project_select,
    project_update,
    project_list,
    conversation_create,
    conversation_select,
    conversation_addMessage,
    conversation_list,
    artifact_create,
    artifact_update,
    artifact_search,
    artifact_view,
    agent_select,
    mcp_searchArtifacts,
    mcp_getTemplate,
    mcp_persistProject,
    mcp_listProjects,
    mcp_getMethodologyGuidance,
  }
}
