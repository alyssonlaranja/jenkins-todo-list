/**
 * Hook para chat com o Avanade Supervisor via sda2-bff
 *
 * Integra com o endpoint /api/sda2-bff para comunicação com CopilotKit
 */

import { useCallback, useState } from 'react'

import { useI18n } from '@/shared/hooks/use-i18n'

import type { DynamicSearchConfig } from '@/lib/rag/types'

import type { Conversation, Project } from '../types'

// ============================================================================
// Types
// ============================================================================

interface SupervisorMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface SupervisorRequest {
  runId: string
  threadId: string
  messages: SupervisorMessage[]
  context: Array<{ key: string; value: string }>
  forwardedProps: {
    utilityAgentId: string
    supervisorName: string
    mcpServerUrl?: string
    mcpHeaders?: Record<string, string>
  }
}

interface ChatState {
  isLoading: boolean
  error: string | null
  streamingContent: string
  /** Config dinâmica do Azure AI Search (extraída do agente Knowledge) */
  ragSearchConfig: DynamicSearchConfig | null
}

// ============================================================================
// Constants - Valores enviados no request body ao BFF
// ============================================================================

// NOTA: Estes valores são enviados no mcpHeaders do request body, mas o BFF
// (sda2-bff/route.ts) os IGNORA e usa suas próprias credenciais SDA2_* lidas
// via getServerEnv(). Apenas 'x-cockpit-api-key' (token pessoal) é extraído.
// Mantemos aqui por compatibilidade e para debug/log no frontend.
//
// Os valores reais que importam estão nas variáveis SDA2_* no server:
// - SDA2_MCP_SERVER_URL, SDA2_MCP_API_KEY, SDA2_MCP_LICENSE_ID, etc.
// Configuradas em: .env (local), dev.json (dev), prd.json (prod)
const SUPERVISOR_ID =
  process.env.NEXT_PUBLIC_MCP_UTILITY_AGENT_ID ||
  '75819ebb-eaa7-4010-a5f8-d6e3353329e7'
const MCP_SERVER_URL =
  process.env.NEXT_PUBLIC_MCP_SERVER_URL ||
  'https://mcp-agent.br.avanade.ai/mcp'

// Credenciais enviadas no body - BFF as ignora (usa SDA2_* server-side)
const MCP_API_KEY =
  process.env.NEXT_PUBLIC_MCP_API_KEY ||
  'cFf4IwGhwy38llzPNxpnv1EUrrs92GWN5mM6xBbNAPMy4Dr6DrjhOA00EnmVTQho'
const MCP_LICENSE_ID =
  process.env.NEXT_PUBLIC_MCP_LICENSE_ID ||
  '14234418-f40d-41e5-8915-47f8b2007fbc'
const MCP_NAMESPACE_ID =
  process.env.NEXT_PUBLIC_MCP_NAMESPACE_ID ||
  'f1a9bb1c-5d4b-41bf-b23d-c21d66ef2ca9'

// ============================================================================
// Hook
// ============================================================================

interface UseSupervisorChatOptions {
  /** Personal Access Token do usuário logado (x-cockpit-api-key) */
  userCockpitKey?: string
  /** ID do agente/supervisor selecionado pelo usuário no dropdown */
  selectedAgentId?: string
  /** Nome do agente/supervisor para display */
  selectedAgentName?: string
}

export function useSupervisorChat(
  project: Project | null,
  options?: UseSupervisorChatOptions
) {
  const { t } = useI18n('pages')
  const [state, setState] = useState<ChatState>({
    isLoading: false,
    error: null,
    streamingContent: '',
    ragSearchConfig: null,
  })

  // Personal Access Token do usuário logado (obrigatório para autenticação MCP)
  const userCockpitKey = options?.userCockpitKey || ''
  // 🔧 DYNAMIC: ID e nome do agente selecionado pelo usuário
  const selectedAgentId = options?.selectedAgentId || SUPERVISOR_ID
  const selectedAgentName =
    options?.selectedAgentName || 'Avanade Supervisor SDA2'

  /**
   * Envia mensagem para o supervisor e retorna a resposta via streaming
   */
  const sendMessage = useCallback(
    async (
      message: string,
      conversation: Conversation | null,
      onProgress?: (chunk: string) => void
    ): Promise<{ response: string; messageId: string }> => {
      if (!project) {
        throw new Error('Projeto não selecionado')
      }

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        streamingContent: '',
      }))

      try {
        // Preparar contexto do projeto (igual ao upstream-sda)
        const context = [
          { key: 'projeto_id', value: project.id },
          { key: 'projeto_nome', value: project.name },
          { key: 'conversa_id', value: conversation?.id || 'new' },
          {
            key: 'conversa_titulo',
            value: conversation?.title || 'Nova conversa',
          },
        ]

        // Construir histórico de mensagens da conversa para contexto
        // Inclui todas as mensagens anteriores para que o agente tenha contexto completo
        const conversationHistory: SupervisorMessage[] = []

        // Adicionar mensagens anteriores da conversa como contexto
        if (conversation?.messages && conversation.messages.length > 0) {
          for (const msg of conversation.messages) {
            conversationHistory.push({
              id: msg.id,
              role: msg.role,
              content: msg.content,
            })
          }
        }

        // Adicionar a mensagem atual do usuário
        conversationHistory.push({
          id: `msg-${Date.now()}`,
          role: 'user',
          content: message,
        })

        // Enviar histórico completo para que o agente tenha contexto
        const requestBody: SupervisorRequest = {
          runId: `run-${Date.now()}`,
          threadId: conversation?.id || `thread-${project.id}-${Date.now()}`,
          messages: conversationHistory,
          context,
          forwardedProps: {
            // 🔧 DYNAMIC: ID e nome do agente selecionado pelo usuário no dropdown
            utilityAgentId: selectedAgentId,
            supervisorName: selectedAgentName,
            mcpServerUrl: MCP_SERVER_URL,
            mcpHeaders: {
              'Content-Type': 'application/json',
              // Valores FIXOS do ambiente do Supervisor (licença/namespace onde o agente existe)
              'x-api-key': MCP_API_KEY,
              'x-cockpit-license-id': MCP_LICENSE_ID,
              'x-cockpit-namespace-id': MCP_NAMESPACE_ID,
              // 🔧 DYNAMIC: ID do agente selecionado
              'x-cockpit-utility-agent-id': selectedAgentId,
              // Valor DINÂMICO - Personal Access Token do usuário logado
              'x-cockpit-api-key': userCockpitKey,
            },
          },
        }

        console.log('🎯 [SDA2] Agent selection in request:', {
          selectedAgentId,
          selectedAgentName,
          isDefaultAgent: selectedAgentId === SUPERVISOR_ID,
        })

        console.log('📤 [SDA2] Enviando para sda2-bff:', {
          projectName: project.name,
          conversationId: conversation?.id,
          totalMessages: conversationHistory.length,
          historyMessages: conversationHistory.length - 1,
          currentMessageLength: message.length,
          hasDocumentContent: message.includes('📎 **Documentos anexados'),
          messagePreview: message.substring(0, 300),
        })

        const response = await fetch('/api/sda2-bff', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(
            `Erro na requisição: ${response.status} - ${errorText}`
          )
        }

        // Processar SSE stream
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let supervisorResponse = ''
        const messageId = `msg-${Date.now()}`

        if (reader) {
          try {
            let done = false
            // Buffer para linhas parciais entre chunks
            let sseBuffer = ''

            while (!done) {
              const { value, done: readerDone } = await reader.read()
              done = readerDone

              if (value) {
                // Acumular no buffer (stream: true para chunked decoding correto)
                sseBuffer += decoder.decode(value, { stream: true })

                // Processar apenas linhas completas (terminadas com \n)
                // Manter o restante no buffer para o próximo chunk
                const lastNewlineIndex = sseBuffer.lastIndexOf('\n')
                if (lastNewlineIndex === -1) continue // Sem linha completa ainda

                const completePart = sseBuffer.substring(
                  0,
                  lastNewlineIndex + 1
                )
                sseBuffer = sseBuffer.substring(lastNewlineIndex + 1)

                const lines = completePart.split('\n')

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const eventData = line.slice(6)
                      if (eventData.trim() === '[DONE]') {
                        done = true
                        break
                      }

                      const data = JSON.parse(eventData)

                      // Capturar config RAG do agente Knowledge (enviada no início do stream)
                      if (data.type === 'RAG_CONFIG' && data.config) {
                        console.log('📥 [SDA2] RAG config received from BFF:', {
                          endpoint: data.config.azure_search_endpoint,
                          indexName: data.config.index_name,
                        })
                        setState(prev => ({
                          ...prev,
                          ragSearchConfig: data.config,
                        }))
                      }

                      // Processar diferentes tipos de eventos
                      if (data.type === 'TEXT_MESSAGE_CONTENT' && data.delta) {
                        supervisorResponse += data.delta
                        setState(prev => ({
                          ...prev,
                          streamingContent: supervisorResponse,
                        }))
                        onProgress?.(data.delta)
                      }

                      // Tratar erros do supervisor com mensagens amigáveis
                      if (data.type === 'RUN_ERROR') {
                        const msg = data.message || ''
                        let errorMessage: string

                        if (msg.includes('401') || msg.includes('API Key') || msg.includes('authentication')) {
                          errorMessage = `⚠️ **${t('sda2.workspace.communicationError' as any)}**\n\n${t('sda2.workspace.orchestratorAuthError' as any)}`
                        } else if (msg.includes('500') || msg.includes('503') || msg.includes('MCP is unavailable') || msg.includes('Agent card could not be fetched') || msg.includes('timeout') || msg.includes('Timeout')) {
                          errorMessage = `⚠️ **${t('sda2.workspace.communicationError' as any)}**\n\n${t('sda2.workspace.orchestratorServerError' as any)}`
                        } else {
                          errorMessage = `⚠️ **${t('sda2.workspace.communicationError' as any)}**\n\n${t('sda2.workspace.orchestratorGenericError' as any)}`
                        }

                        console.error('❌ [SDA2] RUN_ERROR original:', msg)
                        supervisorResponse = errorMessage
                        onProgress?.(errorMessage)
                        done = true
                        break
                      }
                    } catch {
                      // Ignorar linhas malformadas
                    }
                  }
                }
              }
            }

            // Processar dados restantes no buffer (flush final)
            if (sseBuffer.trim()) {
              const remainingLines = sseBuffer.split('\n')
              for (const line of remainingLines) {
                if (line.startsWith('data: ')) {
                  try {
                    const eventData = line.slice(6)
                    if (eventData.trim() === '[DONE]') break

                    const data = JSON.parse(eventData)

                    if (data.type === 'TEXT_MESSAGE_CONTENT' && data.delta) {
                      supervisorResponse += data.delta
                      setState(prev => ({
                        ...prev,
                        streamingContent: supervisorResponse,
                      }))
                      onProgress?.(data.delta)
                    }
                  } catch {
                    // Ignorar linhas malformadas
                  }
                }
              }
            }
          } catch (readerError) {
            console.warn('⚠️ [SDA2] Erro ao processar stream:', readerError)
          }
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          streamingContent: '',
        }))

        console.log('✅ [SDA2] Resposta do supervisor recebida:', {
          responseLength: supervisorResponse.length,
        })

        return { response: supervisorResponse, messageId }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido'
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          streamingContent: '',
        }))
        throw error
      }
    },
    [project, userCockpitKey, selectedAgentId, selectedAgentName]
  )

  /**
   * Reseta o estado do chat
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      streamingContent: '',
      ragSearchConfig: null,
    })
  }, [])

  return {
    // Estado
    isLoading: state.isLoading,
    error: state.error,
    streamingContent: state.streamingContent,
    /** Config dinâmica do Azure AI Search (extraída do agente Knowledge) */
    ragSearchConfig: state.ragSearchConfig,

    // Ações
    sendMessage,
    reset,
  }
}
