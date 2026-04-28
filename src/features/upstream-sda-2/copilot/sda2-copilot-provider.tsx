/**
 * SDA2 Copilot Provider
 *
 * Main provider that registers all handlers, MCP actions, and context readables
 * Wraps the SDA2 app to enable CopilotKit integration
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCopilotAction } from '@copilotkit/react-core'

import { useProxyMCP } from '@/shared/hooks/use-proxy-mcp'

import { useSDA2ContextReadables } from './sda2-context-readables'
import { createSDA2Handlers } from './sda2-handlers'
import { SDA2MCPIntegration } from './sda2-mcp-integration'
import type { SDA2CopilotProviderProps, SDA2HandlerContext } from './types'

// ============================================================================
// SDA2 Copilot Provider
// ============================================================================

export function SDA2CopilotProvider({
  children,
  project,
  currentConversation,
  artifacts,
  setProject,
  setCurrentConversation,
  setArtifacts,
  connection,
  projectService,
  chatService,
  artifactService,
}: SDA2CopilotProviderProps) {
  // ==========================================================================
  // MCP Connection State - Using useProxyMCP hook
  // ==========================================================================

  // Get namespace from connection or use 'disabled' if no connection
  const namespace = connection?.environmentRef?.namespaceName || 'disabled'

  // Use the proper MCP hook that handles real MCP calls
  const { callTool: callMCPTool, connected: mcpConnected } = useProxyMCP({
    namespace,
    autoConnect: true,
    skipToolsDiscovery: true, // Skip tools/list to save latency - we know our tools
    connection: connection || null,
  })

  const [mcpReady, setMcpReady] = useState(false)

  // Sync MCP readiness with useProxyMCP hook state
  useEffect(() => {
    if (mcpConnected) {
      setMcpReady(true)
      console.log('✅ [SDA2 Provider] MCP connected via useProxyMCP')
    } else {
      setMcpReady(false)
      console.warn('⚠️ [SDA2 Provider] MCP not connected, using local fallback')
    }
  }, [mcpConnected])

  // ==========================================================================
  // Handler Context
  // ==========================================================================

  const handlerContext: SDA2HandlerContext = useMemo(
    () => ({
      project,
      currentConversation,
      artifacts,
      setProject,
      setCurrentConversation,
      setArtifacts,
      mcpReady,
      callMCPTool,
      projectService,
      chatService,
      artifactService,
    }),
    [
      project,
      currentConversation,
      artifacts,
      setProject,
      setCurrentConversation,
      setArtifacts,
      mcpReady,
      callMCPTool,
      projectService,
      chatService,
      artifactService,
    ]
  )

  // ==========================================================================
  // Create Handlers
  // ==========================================================================

  const handlers = useMemo(
    () => createSDA2Handlers(handlerContext),
    [handlerContext]
  )

  // ==========================================================================
  // Register All Handlers as CopilotActions
  // ==========================================================================

  // Project Handlers
  useCopilotAction({
    name: handlers.project_create.name,
    description: handlers.project_create.description,
    parameters: handlers.project_create.parameters as any,
    handler: handlers.project_create.execute,
  })

  useCopilotAction({
    name: handlers.project_select.name,
    description: handlers.project_select.description,
    parameters: handlers.project_select.parameters as any,
    handler: handlers.project_select.execute,
  })

  useCopilotAction({
    name: handlers.project_update.name,
    description: handlers.project_update.description,
    parameters: handlers.project_update.parameters as any,
    handler: handlers.project_update.execute,
  })

  useCopilotAction({
    name: handlers.project_list.name,
    description: handlers.project_list.description,
    parameters: handlers.project_list.parameters as any,
    handler: handlers.project_list.execute,
  })

  // Conversation Handlers
  useCopilotAction({
    name: handlers.conversation_create.name,
    description: handlers.conversation_create.description,
    parameters: handlers.conversation_create.parameters as any,
    handler: handlers.conversation_create.execute,
  })

  useCopilotAction({
    name: handlers.conversation_select.name,
    description: handlers.conversation_select.description,
    parameters: handlers.conversation_select.parameters as any,
    handler: handlers.conversation_select.execute,
  })

  useCopilotAction({
    name: handlers.conversation_addMessage.name,
    description: handlers.conversation_addMessage.description,
    parameters: handlers.conversation_addMessage.parameters as any,
    handler: handlers.conversation_addMessage.execute,
  })

  useCopilotAction({
    name: handlers.conversation_list.name,
    description: handlers.conversation_list.description,
    parameters: handlers.conversation_list.parameters as any,
    handler: handlers.conversation_list.execute,
  })

  // Artifact Handlers
  useCopilotAction({
    name: handlers.artifact_create.name,
    description: handlers.artifact_create.description,
    parameters: handlers.artifact_create.parameters as any,
    handler: handlers.artifact_create.execute,
  })

  useCopilotAction({
    name: handlers.artifact_update.name,
    description: handlers.artifact_update.description,
    parameters: handlers.artifact_update.parameters as any,
    handler: handlers.artifact_update.execute,
  })

  useCopilotAction({
    name: handlers.artifact_search.name,
    description: handlers.artifact_search.description,
    parameters: handlers.artifact_search.parameters as any,
    handler: handlers.artifact_search.execute,
  })

  useCopilotAction({
    name: handlers.artifact_view.name,
    description: handlers.artifact_view.description,
    parameters: handlers.artifact_view.parameters as any,
    handler: handlers.artifact_view.execute,
  })

  // Agent Handler
  useCopilotAction({
    name: handlers.agent_select.name,
    description: handlers.agent_select.description,
    parameters: handlers.agent_select.parameters as any,
    handler: handlers.agent_select.execute,
  })

  // ==========================================================================
  // Register Context Readables
  // ==========================================================================

  useSDA2ContextReadables({
    project,
    currentConversation,
    artifacts,
  })

  // ==========================================================================
  // MCP Integration (separate component)
  // ==========================================================================

  const mcpProps = useMemo(
    () => ({
      mcpReady,
      callMCPTool,
    }),
    [mcpReady, callMCPTool]
  )

  // ==========================================================================
  // Debug Logging
  // ==========================================================================

  useEffect(() => {
    console.log('🎯 [SDA2 Provider] State:', {
      hasProject: !!project,
      projectName: project?.name,
      hasConversation: !!currentConversation,
      conversationTitle: currentConversation?.title,
      artifactsCount: artifacts.length,
      mcpReady,
    })
  }, [project, currentConversation, artifacts, mcpReady])

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <>
      {/* MCP Integration Actions */}
      <SDA2MCPIntegration {...mcpProps} />

      {/* Children (actual app) */}
      {children}
    </>
  )
}
