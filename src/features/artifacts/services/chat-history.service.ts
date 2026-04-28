/**
 * Chat History Service
 *
 * Serviço para gerenciamento do histórico de chat do SDA
 * Utiliza a API de Artefatos do Cockpit para persistência
 *
 * Nomenclatura: history-{initiative-slug} (usa hífen ao invés de barra)
 *
 * IMPORTANTE: Este serviço usa tipos unificados de @/shared/types
 * e converte para/de formato de persistência internamente.
 */

import { v4 as uuidv4 } from 'uuid'

import {
  AddMessageInput,
  OperationResult,
  PersistedChatHistory,
  PersistedChatMessage,
  persistedToUnifiedHistory,
  persistedToUnifiedMessage,
  UnifiedChatHistory,
  UnifiedMessage,
  unifiedToPersistedMessage,
} from '@/shared/types'

import { type SDAServiceConfig } from '../types/sda-artifacts.types'
import {
  ArtifactAccessibility,
  ArtifactService,
  ArtifactUpdateDto,
} from './artifact.service'
import { getHistoryKey } from './initiative.service'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Deduplica mensagens por conteúdo (não apenas por ID)
 * Remove duplicatas baseadas em: autor + primeiros 100 chars do conteúdo + timestamp (até minuto)
 * Esta é a solução para a CAUSA RAIZ de duplicatas que ocorriam durante salvamento
 */
function deduplicateMessages(
  messages: PersistedChatMessage[]
): PersistedChatMessage[] {
  const seen = new Map<string, PersistedChatMessage>()

  for (const msg of messages) {
    // Criar chave única baseada em conteúdo para detectar duplicatas reais
    const contentKey = `${msg.sender?.type || 'unknown'}:${msg.content?.substring(0, 100) || ''}:${msg.timestamp?.substring(0, 16) || ''}`

    if (!seen.has(contentKey)) {
      seen.set(contentKey, msg)
    } else {
      console.log(
        `[ChatHistoryService.deduplicateMessages] 🔄 Removendo duplicata: ${msg.id} (key: ${contentKey.substring(0, 50)}...)`
      )
    }
  }

  const uniqueMessages = Array.from(seen.values())

  if (uniqueMessages.length !== messages.length) {
    console.log(
      `[ChatHistoryService.deduplicateMessages] ⚠️ DUPLICATAS REMOVIDAS: ${messages.length} → ${uniqueMessages.length} (${messages.length - uniqueMessages.length} removidas)`
    )
  }

  return uniqueMessages
}

// ============================================================================
// CHAT HISTORY SERVICE
// ============================================================================

export class ChatHistoryService {
  private artifactService: ArtifactService
  private config: SDAServiceConfig

  constructor(config: SDAServiceConfig) {
    this.config = config
    this.artifactService = new ArtifactService({
      baseUrl: config.baseUrl,
      accessToken: config.accessToken,
      licenseId: config.licenseId,
      namespaceId: config.namespaceId,
    })
  }

  /**
   * Obtém o histórico de chat de uma iniciativa
   * Retorna UnifiedChatHistory com mensagens no formato unificado
   */
  async getByInitiative(
    initiativeSlug: string
  ): Promise<OperationResult<UnifiedChatHistory>> {
    try {
      const key = getHistoryKey(initiativeSlug)
      console.log(
        `[ChatHistoryService.getByInitiative] Buscando histórico com key: ${key}`
      )

      // Usar getByKeyWithLatestVersion para pegar a versão mais recente
      const artifact = await this.artifactService.getByKeyWithLatestVersion(key)
      console.log(
        `[ChatHistoryService.getByInitiative] Artefato encontrado: ${artifact.id}, value length: ${artifact.value?.length || 0}`
      )

      // Parse do histórico no formato de persistência
      const persistedHistory = JSON.parse(
        artifact.value || '{}'
      ) as PersistedChatHistory

      console.log(
        `[ChatHistoryService.getByInitiative] Messages no histórico: ${persistedHistory.messages?.length || 0}`
      )

      // DEBUG: Verificar se mensagens têm artefatos no formato raw
      if (persistedHistory.messages && persistedHistory.messages.length > 0) {
        const messagesWithArtifacts = persistedHistory.messages.filter(
          m => m.isArtifact && m.artifactData
        )
        console.log(
          `[ChatHistoryService.getByInitiative] 📦 Mensagens com artefatos (raw): ${messagesWithArtifacts.length}`
        )

        persistedHistory.messages.forEach((m, idx) => {
          console.log(`[ChatHistoryService.getByInitiative] Msg[${idx}]:`, {
            id: m.id,
            sender: m.sender?.type,
            isArtifact: m.isArtifact,
            hasArtifactData: !!m.artifactData,
            artifactData: m.artifactData
              ? {
                  artifactId: m.artifactData.artifactId,
                  artifactName: m.artifactData.artifactName,
                  status: m.artifactData.status,
                }
              : null,
            contentPreview: m.content?.substring(0, 100),
          })
        })
      }

      // Converter para formato unificado
      const unifiedHistory = persistedToUnifiedHistory(persistedHistory)

      return {
        success: true,
        data: unifiedHistory,
      }
    } catch (error) {
      console.error('[ChatHistoryService.getByInitiative] ❌ Erro:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get chat history',
      }
    }
  }

  /**
   * Obtém histórico no formato raw (persistência) - para uso interno
   */
  private async getPersistedHistory(
    initiativeSlug: string
  ): Promise<PersistedChatHistory | null> {
    try {
      const key = getHistoryKey(initiativeSlug)
      console.log(
        `[ChatHistoryService.getPersistedHistory] 📥 CARREGANDO histórico para operação de escrita, key: ${key}`
      )
      const artifact = await this.artifactService.getByKeyWithLatestVersion(key)
      const history = JSON.parse(artifact.value || '{}') as PersistedChatHistory
      console.log(
        `[ChatHistoryService.getPersistedHistory] ✅ Histórico carregado: ${history.messages?.length || 0} mensagens`
      )
      return history
    } catch (error) {
      console.error(
        `[ChatHistoryService.getPersistedHistory] ❌ Erro ao carregar histórico:`,
        error
      )
      return null
    }
  }

  /**
   * Adiciona uma mensagem ao histórico usando formato unificado
   */
  async addMessage(
    initiativeSlug: string,
    messageData: AddMessageInput
  ): Promise<OperationResult<UnifiedMessage>> {
    try {
      console.log(
        `[ChatHistoryService.addMessage] Iniciando para slug: ${initiativeSlug}`
      )

      // Busca histórico atual (formato persistido)
      const persistedHistory = await this.getPersistedHistory(initiativeSlug)
      if (!persistedHistory) {
        console.error(
          `[ChatHistoryService.addMessage] ❌ Histórico não encontrado`
        )
        return {
          success: false,
          error: 'Chat history not found',
        }
      }

      console.log(
        `[ChatHistoryService.addMessage] Histórico encontrado. Messages antes: ${persistedHistory.messages?.length || 0}`
      )

      const now = new Date().toISOString()

      // Cria UnifiedMessage e converte para formato de persistência
      const unifiedMessage: UnifiedMessage = {
        id: uuidv4(),
        content: messageData.content,
        author: messageData.author,
        agentId: messageData.agentId,
        agentName: messageData.agentName,
        timestamp: now,
        status: 'sent',
        hasActions: messageData.isArtifact,
        isProposal: messageData.isArtifact,
        artifacts: messageData.artifacts?.map(a => ({
          id: a.id || uuidv4(),
          version: a.version || '1.0.0',
          name: a.name || 'Artefato',
          title: a.title || a.name || 'Artefato',
          content: a.content || '',
          type: a.type || 'document',
          category: a.category || 'pack-demanda',
          status: a.status || 'pending',
          stage: a.stage || 'cocreation',
          initiativeId: a.initiativeId || '',
          isProposal: true,
          createdAt: now,
          updatedAt: now,
        })),
      }

      // Converte para formato de persistência
      const persistedMessage = unifiedToPersistedMessage(
        unifiedMessage,
        this.config.userId,
        this.config.userName
      )

      // Adiciona mensagem ao histórico
      persistedHistory.messages = persistedHistory.messages || []
      persistedHistory.messages.push(persistedMessage)
      persistedHistory.totalMessages = persistedHistory.messages.length
      persistedHistory.updatedAt = now
      console.log(
        `[ChatHistoryService.addMessage] Messages após push: ${persistedHistory.messages.length}`
      )

      // Salva histórico atualizado
      await this.savePersistedHistory(initiativeSlug, persistedHistory)
      console.log(
        `[ChatHistoryService.addMessage] ✅ Mensagem salva com sucesso`
      )

      return {
        success: true,
        data: unifiedMessage,
      }
    } catch (error) {
      console.error('[ChatHistoryService] Error adding message:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add message',
      }
    }
  }

  /**
   * Adiciona múltiplas mensagens ao histórico de uma vez
   * IMPORTANTE: Este método evita o problema de race condition
   */
  async addMessages(
    initiativeSlug: string,
    messagesData: AddMessageInput[]
  ): Promise<OperationResult<UnifiedMessage[]>> {
    try {
      console.log(
        `[ChatHistoryService.addMessages] Iniciando para slug: ${initiativeSlug}, ${messagesData.length} mensagens`
      )

      if (messagesData.length === 0) {
        return { success: true, data: [] }
      }

      // Busca histórico atual (formato persistido)
      const persistedHistory = await this.getPersistedHistory(initiativeSlug)
      if (!persistedHistory) {
        console.error(
          `[ChatHistoryService.addMessages] ❌ Histórico não encontrado`
        )
        return {
          success: false,
          error: 'Chat history not found',
        }
      }

      console.log(
        `[ChatHistoryService.addMessages] Histórico encontrado. Messages antes: ${persistedHistory.messages?.length || 0}`
      )

      const now = new Date().toISOString()
      const newUnifiedMessages: UnifiedMessage[] = []

      // Cria todas as novas mensagens
      for (const messageData of messagesData) {
        // Debug: verificar dados de entrada
        console.log(`[ChatHistoryService.addMessages] Processando mensagem:`, {
          author: messageData.author,
          isArtifact: messageData.isArtifact,
          hasArtifactsInput: !!(
            messageData.artifacts && messageData.artifacts.length > 0
          ),
          artifactsCount: messageData.artifacts?.length || 0,
          artifactsData: messageData.artifacts?.map(a => ({
            id: a.id,
            name: a.name,
            title: a.title,
            type: a.type,
          })),
        })

        const unifiedMessage: UnifiedMessage = {
          id: uuidv4(),
          content: messageData.content,
          author: messageData.author,
          agentId: messageData.agentId,
          agentName: messageData.agentName,
          timestamp: now,
          status: 'sent',
          hasActions: messageData.isArtifact,
          isProposal: messageData.isArtifact,
          artifacts: messageData.artifacts?.map(a => ({
            id: a.id || uuidv4(),
            version: a.version || '1.0.0',
            name: a.name || 'Artefato',
            title: a.title || a.name || 'Artefato',
            content: a.content || '',
            type: a.type || 'document',
            category: a.category || 'pack-demanda',
            status: a.status || 'pending',
            stage: a.stage || 'cocreation',
            initiativeId: a.initiativeId || '',
            isProposal: true,
            createdAt: now,
            updatedAt: now,
          })),
        }

        // Debug: verificar artefatos criados
        if (unifiedMessage.artifacts && unifiedMessage.artifacts.length > 0) {
          console.log(
            `[ChatHistoryService.addMessages] ✅ Mensagem com artefatos criada:`,
            {
              messageId: unifiedMessage.id,
              artifactsCount: unifiedMessage.artifacts.length,
              artifacts: unifiedMessage.artifacts.map(a => ({
                id: a.id,
                name: a.name,
                title: a.title,
              })),
            }
          )
        }

        newUnifiedMessages.push(unifiedMessage)

        // Converte e adiciona ao histórico persistido
        const persistedMessage = unifiedToPersistedMessage(
          unifiedMessage,
          this.config.userId,
          this.config.userName
        )
        persistedHistory.messages = persistedHistory.messages || []
        persistedHistory.messages.push(persistedMessage)
      }

      persistedHistory.totalMessages = persistedHistory.messages.length
      persistedHistory.updatedAt = now

      console.log(
        `[ChatHistoryService.addMessages] Messages após push: ${persistedHistory.messages.length}`
      )

      // Salva histórico atualizado (UMA única vez)
      await this.savePersistedHistory(initiativeSlug, persistedHistory)
      console.log(
        `[ChatHistoryService.addMessages] ✅ ${newUnifiedMessages.length} mensagens salvas com sucesso`
      )

      return {
        success: true,
        data: newUnifiedMessages,
      }
    } catch (error) {
      console.error('[ChatHistoryService] Error adding messages:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to add messages',
      }
    }
  }

  /**
   * Atualiza o status de aprovação de um artefato no histórico
   */
  async updateArtifactStatus(
    initiativeSlug: string,
    messageId: string,
    status: 'pending' | 'approved' | 'rejected',
    approverInfo?: { userId: string; userName: string },
    rejectionReason?: string
  ): Promise<OperationResult<UnifiedMessage>> {
    try {
      const persistedHistory = await this.getPersistedHistory(initiativeSlug)
      if (!persistedHistory) {
        return {
          success: false,
          error: 'Chat history not found',
        }
      }

      const now = new Date().toISOString()

      // Encontra a mensagem
      const messageIndex = (persistedHistory.messages || []).findIndex(
        m => m.id === messageId
      )
      if (messageIndex === -1) {
        return {
          success: false,
          error: 'Message not found',
        }
      }

      const message = persistedHistory.messages[messageIndex]!
      if (!message.isArtifact || !message.artifactData) {
        return {
          success: false,
          error: 'Message is not an artifact',
        }
      }

      // Atualiza dados do artefato
      message.artifactData.status = status

      if (status === 'approved' && approverInfo) {
        message.artifactData.approvedAt = now
        message.artifactData.approvedBy = approverInfo.userId
        message.artifactData.approvedByName = approverInfo.userName
      } else if (status === 'rejected') {
        message.artifactData.rejectionReason = rejectionReason || null
      }

      persistedHistory.messages[messageIndex] = message
      persistedHistory.updatedAt = now

      // Salva histórico atualizado
      await this.savePersistedHistory(initiativeSlug, persistedHistory)

      // Retorna mensagem no formato unificado
      return {
        success: true,
        data: persistedToUnifiedMessage(message),
      }
    } catch (error) {
      console.error(
        '[ChatHistoryService] Error updating artifact status:',
        error
      )
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update artifact status',
      }
    }
  }

  /**
   * Obtém todas as mensagens que contêm artefatos
   */
  async getArtifactMessages(
    initiativeSlug: string,
    statusFilter?: 'pending' | 'approved' | 'rejected'
  ): Promise<OperationResult<UnifiedMessage[]>> {
    try {
      const historyResult = await this.getByInitiative(initiativeSlug)
      if (!historyResult.success || !historyResult.data) {
        return {
          success: false,
          error: 'Chat history not found',
        }
      }

      let artifactMessages = historyResult.data.messages.filter(
        m => m.isProposal || (m.artifacts && m.artifacts.length > 0)
      )

      if (statusFilter) {
        artifactMessages = artifactMessages.filter(m =>
          m.artifacts?.some(a => a.status === statusFilter)
        )
      }

      return {
        success: true,
        data: artifactMessages,
      }
    } catch (error) {
      console.error(
        '[ChatHistoryService] Error getting artifact messages:',
        error
      )
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get artifact messages',
      }
    }
  }

  /**
   * Obtém mensagens paginadas
   */
  async getMessages(
    initiativeSlug: string,
    options?: {
      page?: number
      pageSize?: number
      fromTimestamp?: string
    }
  ): Promise<
    OperationResult<{
      messages: UnifiedMessage[]
      total: number
      page: number
      pageSize: number
    }>
  > {
    try {
      const historyResult = await this.getByInitiative(initiativeSlug)
      if (!historyResult.success || !historyResult.data) {
        return {
          success: false,
          error: 'Chat history not found',
        }
      }

      const { page = 1, pageSize = 50, fromTimestamp } = options || {}
      let messages = [...historyResult.data.messages]

      // Filtra por timestamp se fornecido
      if (fromTimestamp) {
        messages = messages.filter(m => m.timestamp >= fromTimestamp)
      }

      // Ordena por timestamp (mais recente primeiro)
      messages.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      // Paginação
      const total = messages.length
      const start = (page - 1) * pageSize
      const paginatedMessages = messages.slice(start, start + pageSize)

      return {
        success: true,
        data: {
          messages: paginatedMessages,
          total,
          page,
          pageSize,
        },
      }
    } catch (error) {
      console.error('[ChatHistoryService] Error getting messages:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get messages',
      }
    }
  }

  /**
   * Cria um snapshot do histórico (útil para transições de stage)
   */
  async createSnapshot(
    initiativeSlug: string
  ): Promise<OperationResult<string>> {
    try {
      const persistedHistory = await this.getPersistedHistory(initiativeSlug)
      if (!persistedHistory) {
        return {
          success: false,
          error: 'Chat history not found',
        }
      }

      // Busca o artefato existente para pegar o ID
      const existingArtifact = await this.artifactService.getByKey(
        getHistoryKey(initiativeSlug)
      )

      // Incrementa versão com snapshot
      const versionParts = String(existingArtifact.version || '1.0.0').split(
        '.'
      )
      const newPatch = parseInt(versionParts[2] || '0') + 1
      const newVersion = `${versionParts[0]}.${versionParts[1]}.${newPatch}`

      // Atualiza com nova versão
      const updateDto: ArtifactUpdateDto = {
        id: existingArtifact.id,
        value: JSON.stringify(persistedHistory, null, 2),
        description: existingArtifact.description || '',
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
        version: newVersion,
      }

      await this.artifactService.update(updateDto)

      return {
        success: true,
        data: newVersion,
      }
    } catch (error) {
      console.error('[ChatHistoryService] Error creating snapshot:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create snapshot',
      }
    }
  }

  /**
   * UTILITÁRIO: Limpa duplicatas de um histórico existente
   * Útil para corrigir dados que foram salvos com duplicatas
   * Chama savePersistedHistory que já aplica deduplicação
   */
  async cleanupDuplicates(
    initiativeSlug: string
  ): Promise<OperationResult<{ before: number; after: number }>> {
    try {
      console.log(
        `[ChatHistoryService.cleanupDuplicates] 🧹 Iniciando limpeza para: ${initiativeSlug}`
      )

      const persistedHistory = await this.getPersistedHistory(initiativeSlug)
      if (!persistedHistory) {
        return {
          success: false,
          error: 'Chat history not found',
        }
      }

      const beforeCount = persistedHistory.messages?.length || 0
      console.log(
        `[ChatHistoryService.cleanupDuplicates] 📊 Mensagens antes: ${beforeCount}`
      )

      // savePersistedHistory já aplica deduplicação automaticamente
      await this.savePersistedHistory(initiativeSlug, persistedHistory)

      // Recarregar para verificar resultado
      const afterHistory = await this.getPersistedHistory(initiativeSlug)
      const afterCount = afterHistory?.messages?.length || 0

      console.log(
        `[ChatHistoryService.cleanupDuplicates] ✅ Limpeza concluída: ${beforeCount} → ${afterCount}`
      )

      return {
        success: true,
        data: {
          before: beforeCount,
          after: afterCount,
        },
      }
    } catch (error) {
      console.error('[ChatHistoryService] Error cleaning duplicates:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to clean duplicates',
      }
    }
  }

  /**
   * Salva o histórico no artefato (formato persistido)
   * IMPORTANTE: Aplica deduplicação antes de salvar para evitar duplicatas
   */
  private async savePersistedHistory(
    initiativeSlug: string,
    history: PersistedChatHistory
  ): Promise<void> {
    const key = getHistoryKey(initiativeSlug)
    console.log(
      `[ChatHistoryService.savePersistedHistory] 📝 SALVANDO histórico com key: ${key}`
    )

    // DEDUPLICAÇÃO: Aplicar antes de salvar para evitar duplicatas na persistência
    const originalCount = history.messages?.length || 0
    if (history.messages && history.messages.length > 0) {
      history.messages = deduplicateMessages(history.messages)
      history.totalMessages = history.messages.length

      if (history.messages.length !== originalCount) {
        console.log(
          `[ChatHistoryService.savePersistedHistory] 🧹 Deduplicação aplicada: ${originalCount} → ${history.messages.length}`
        )
      }
    }

    console.log(
      `[ChatHistoryService.savePersistedHistory] 📊 Mensagens a salvar (após dedup): ${history.messages?.length || 0}`
    )

    // LOG: Mostrar IDs das mensagens sendo salvas para rastreamento
    if (history.messages && history.messages.length > 0) {
      console.log(
        `[ChatHistoryService.savePersistedHistory] 📋 IDs das mensagens:`,
        history.messages.map(m => m.id).join(', ')
      )
      console.log(
        `[ChatHistoryService.savePersistedHistory] 📋 Última mensagem:`,
        {
          id: history.messages[history.messages.length - 1]?.id,
          sender: history.messages[history.messages.length - 1]?.sender,
          contentPreview: history.messages[
            history.messages.length - 1
          ]?.content?.substring(0, 50),
        }
      )
    }

    try {
      const existingArtifact = await this.artifactService.getByKey(key)
      console.log(
        `[ChatHistoryService.savePersistedHistory] Artefato encontrado: ${existingArtifact.id}, versão atual: ${existingArtifact.version}`
      )

      // Seguir o padrão do cockpit-portal UpdateArtifactRequest
      // NÃO enviar: key, type, artifactTypeId - causam falha silenciosa na API
      const updateDto: ArtifactUpdateDto = {
        id: existingArtifact.id,
        value: JSON.stringify(history, null, 2),
        description: `Histórico de chat da iniciativa: ${history.initiativeName || initiativeSlug}`,
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
      }

      console.log(
        `[ChatHistoryService.savePersistedHistory] Atualizando artefato. Messages: ${history.messages?.length || 0}, valueLength: ${updateDto.value?.length || 0}`
      )

      await this.artifactService.update(updateDto)
      console.log(
        `[ChatHistoryService.savePersistedHistory] ✅ Artefato atualizado com sucesso (${history.messages?.length || 0} mensagens)`
      )
    } catch (error) {
      console.error(
        `[ChatHistoryService.savePersistedHistory] ❌ Erro ao salvar histórico:`,
        error
      )
      throw error
    }
  }
}
