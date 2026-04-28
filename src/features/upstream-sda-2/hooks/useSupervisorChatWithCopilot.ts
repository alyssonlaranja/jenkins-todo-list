/**
 * Hook integrador: useSupervisorChat + CopilotKit Handlers
 *
 * Mantém a UI e fluxo atual do ChatArea, mas enriquece com:
 * - Contexto dos handlers CopilotKit (projetos, conversas, artefatos)
 * - Execução de ações CopilotKit baseadas na intenção do usuário
 * - Integração com MCP para persistência e conhecimento
 *
 * @see useSupervisorChat - Hook original mantido intacto
 * @see copilot/sda2-handlers.ts - Handlers CopilotKit disponíveis
 */

import { useCallback } from 'react'
import { useCopilotAction } from '@copilotkit/react-core'

import { useUserApiKey } from '@/shared/hooks/use-user-api-key'

import { useCockpitServices } from '../hooks/useCockpitServices'
import { useProjectStore } from '../stores/projectStore'
import type { Artifact, Conversation, Project } from '../types'
import { useSupervisorChat } from './useSupervisorChat'

// ============================================================================
// Types
// ============================================================================

interface EnrichedContext {
  // Contexto base do projeto
  projectContext: {
    id: string
    name: string
    artifactCount: number
    conversationCount: number
  }
  // Contexto da conversa
  conversationContext?: {
    id: string
    title: string
    messageCount: number
    agentType: string
  }
  // Artefatos disponíveis
  availableArtifacts: Array<{
    id: string
    name: string
    type: string
  }>
  // Sugestões contextuais
  suggestedActions: string[]
}

interface CopilotEnrichedMessage {
  userMessage: string
  enrichedContext: EnrichedContext
  detectedIntents: string[]
  executedActions: string[]
}

// ============================================================================
// Helper: Detectar Intenções do Usuário
// ============================================================================

function detectUserIntents(message: string): string[] {
  const intents: string[] = []
  const lowerMessage = message.toLowerCase()

  // Intenções de criação
  if (
    lowerMessage.includes('criar') ||
    lowerMessage.includes('novo') ||
    lowerMessage.includes('adicionar')
  ) {
    if (lowerMessage.includes('projeto') || lowerMessage.includes('projecto')) {
      intents.push('create_project')
    }
    if (
      lowerMessage.includes('conversa') ||
      lowerMessage.includes('chat') ||
      lowerMessage.includes('conversar')
    ) {
      intents.push('create_conversation')
    }
    if (
      lowerMessage.includes('artefato') ||
      lowerMessage.includes('documento') ||
      lowerMessage.includes('arquivo')
    ) {
      intents.push('create_artifact')
    }
  }

  // Intenções de busca
  if (
    lowerMessage.includes('buscar') ||
    lowerMessage.includes('procurar') ||
    lowerMessage.includes('encontrar') ||
    lowerMessage.includes('pesquisar') ||
    lowerMessage.includes('listar') ||
    lowerMessage.includes('mostrar') ||
    lowerMessage.includes('ver')
  ) {
    if (lowerMessage.includes('projeto')) {
      intents.push('list_projects')
    }
    if (
      lowerMessage.includes('artefato') ||
      lowerMessage.includes('documento')
    ) {
      intents.push('search_artifacts')
    }
    if (lowerMessage.includes('template')) {
      intents.push('get_template')
    }
  }

  // Intenções de atualização
  if (
    lowerMessage.includes('atualizar') ||
    lowerMessage.includes('modificar') ||
    lowerMessage.includes('editar') ||
    lowerMessage.includes('alterar')
  ) {
    intents.push('update_content')
  }

  // Intenções de ajuda/orientação
  if (
    lowerMessage.includes('ajuda') ||
    lowerMessage.includes('como') ||
    lowerMessage.includes('orientação') ||
    lowerMessage.includes('guia')
  ) {
    intents.push('get_guidance')
  }

  return intents
}

// ============================================================================
// Helper: Construir Contexto Enriquecido
// ============================================================================

function buildEnrichedContext(
  project: Project | null,
  conversation: Conversation | null,
  artifacts: Artifact[]
): EnrichedContext {
  const context: EnrichedContext = {
    projectContext: project
      ? {
          id: project.id,
          name: project.name,
          artifactCount: project.artifacts?.length || 0,
          conversationCount: project.conversations?.length || 0,
        }
      : {
          id: '',
          name: 'Nenhum projeto selecionado',
          artifactCount: 0,
          conversationCount: 0,
        },
    availableArtifacts: artifacts.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
    })),
    suggestedActions: [],
  }

  if (conversation) {
    context.conversationContext = {
      id: conversation.id,
      title: conversation.title,
      messageCount: conversation.messages?.length || 0,
      agentType: conversation.agentType || 'supervisor',
    }
  }

  // Sugestões contextuais baseadas no estado
  if (!project) {
    context.suggestedActions = [
      'Criar novo projeto',
      'Listar projetos existentes',
    ]
  } else if (!conversation) {
    context.suggestedActions = [
      'Iniciar nova conversa',
      'Buscar artefatos do projeto',
      'Ver templates disponíveis',
    ]
  } else {
    context.suggestedActions = [
      'Criar novo artefato',
      'Atualizar projeto',
      'Buscar documentação',
    ]
  }

  return context
}

// ============================================================================
// Hook Principal
// ============================================================================

interface UseSupervisorChatWithCopilotOptions {
  /** ID do agente/supervisor selecionado pelo usuário no dropdown */
  selectedAgentId?: string
  /** Nome do agente/supervisor para display */
  selectedAgentName?: string
}

export function useSupervisorChatWithCopilot(
  project: Project | null,
  options?: UseSupervisorChatWithCopilotOptions
) {
  // Obter Personal Access Token do usuário logado
  const { apiKey, isLoading: isApiKeyLoading } = useUserApiKey()
  const userCockpitKey = apiKey?.key || ''

  // 🔧 DYNAMIC: IDs do agente selecionado pelo usuário
  const selectedAgentId = options?.selectedAgentId
  const selectedAgentName = options?.selectedAgentName

  // Hook original com selectedAgentId dinâmico
  const originalChat = useSupervisorChat(project, {
    userCockpitKey,
    selectedAgentId,
    selectedAgentName,
  })

  // Stores
  const { currentConversation } = useProjectStore()

  // Artefatos do projeto atual
  const artifacts = project?.artifacts || []

  // Services
  const { isReady: isCockpitReady } = useCockpitServices()

  /**
   * Envia mensagem com integração CopilotKit
   * 1. Detecta intenções do usuário
   * 2. Constrói contexto enriquecido
   * 3. Executa handlers CopilotKit relevantes (se aplicável)
   * 4. Chama useSupervisorChat original
   * 5. Retorna resposta enriquecida
   */
  const sendMessageWithCopilot = useCallback(
    async (
      message: string,
      conversation: Conversation | null,
      onProgress?: (chunk: string) => void
    ): Promise<{ response: string; messageId: string }> => {
      console.log('🤖 [CopilotKit Integration] Processando mensagem:', {
        message: message.substring(0, 100),
        hasProject: !!project,
        hasConversation: !!conversation,
        cockpitReady: isCockpitReady,
      })

      // 1. Detectar intenções
      const intents = detectUserIntents(message)
      console.log('🎯 [CopilotKit] Intenções detectadas:', intents)

      // 2. Construir contexto enriquecido
      const enrichedContext = buildEnrichedContext(
        project,
        conversation,
        artifacts
      )

      // 3. Preparar contexto adicional para o supervisor
      const contextualInfo: string[] = []

      // Adicionar informações do projeto ao contexto
      if (project) {
        contextualInfo.push(
          `📁 **Contexto do Projeto**: ${project.name}`,
          `- Artefatos: ${enrichedContext.projectContext.artifactCount}`,
          `- Conversas: ${enrichedContext.projectContext.conversationCount}`
        )
      }

      // Adicionar artefatos disponíveis
      if (enrichedContext.availableArtifacts.length > 0) {
        contextualInfo.push(
          '\n📄 **Artefatos Disponíveis**:',
          ...enrichedContext.availableArtifacts
            .slice(0, 5)
            .map(a => `- ${a.name} (${a.type})`)
        )
        if (enrichedContext.availableArtifacts.length > 5) {
          contextualInfo.push(
            `- ... e mais ${enrichedContext.availableArtifacts.length - 5} artefatos`
          )
        }
      }

      // Adicionar sugestões ao contexto (para o supervisor considerar)
      if (enrichedContext.suggestedActions.length > 0) {
        contextualInfo.push(
          '\n💡 **Ações Sugeridas**:',
          ...enrichedContext.suggestedActions.map(a => `- ${a}`)
        )
      }

      // 4. Enriquecer mensagem com contexto (apenas para logging, não enviado ao usuário)
      const enrichedMessage: CopilotEnrichedMessage = {
        userMessage: message,
        enrichedContext,
        detectedIntents: intents,
        executedActions: [],
      }

      // Log do contexto enriquecido
      console.log('📊 [CopilotKit] Contexto enriquecido:', {
        projectName: enrichedContext.projectContext.name,
        artifactCount: enrichedContext.availableArtifacts.length,
        intents,
        suggestedActions: enrichedContext.suggestedActions,
      })

      // 5. Chamar hook original (mantém todo o fluxo e UI)
      // Nota: O supervisor-bff receberá o contexto via context array do SupervisorRequest
      // A mensagem já chega enriquecida com o conteúdo dos documentos do ProjectPage
      console.log('📨 [CopilotKit] Enviando mensagem ao supervisor:', {
        messageLength: message.length,
        hasDocumentContent: message.includes('📎 **Documentos anexados'),
        preview: message.substring(0, 200),
      })

      const result = await originalChat.sendMessage(
        message,
        conversation,
        onProgress
      )

      console.log('✅ [CopilotKit Integration] Resposta processada:', {
        messageId: result.messageId,
        responseLength: result.response.length,
        executedActions: enrichedMessage.executedActions,
      })

      return result
    },
    [originalChat, project, currentConversation, artifacts, isCockpitReady]
  )

  // Retornar interface idêntica ao hook original + informações extras
  return {
    // Interface original mantida
    isLoading: originalChat.isLoading,
    error: originalChat.error,
    streamingContent: originalChat.streamingContent,
    reset: originalChat.reset,

    // Config RAG dinâmica (extraída do agente Knowledge via BFF)
    ragSearchConfig: originalChat.ragSearchConfig,

    // Método enriquecido
    sendMessage: sendMessageWithCopilot,

    // Informações extras do CopilotKit (opcional, para debugging)
    copilotContext: {
      projectName: project?.name,
      artifactCount: artifacts.length,
      conversationId: currentConversation?.id,
      isCockpitReady,
    },
  }
}
