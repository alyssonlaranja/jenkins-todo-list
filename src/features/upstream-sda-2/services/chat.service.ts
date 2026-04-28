/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/**
 * Chat Service
 *
 * Serviço para gerenciamento de chats vinculados a projetos
 * Estrutura: Project → Chat → History → Documents
 *
 * Keys de artefatos:
 * - Chat: chat-{projectSlug}-{chatSlug}
 * - Histórico: history-{projectSlug}-{chatSlug}
 * - Documento: document-{type}-{projectSlug}-{chatSlug}
 */

import { v4 as uuidv4 } from 'uuid'

import {
  ArtifactAccessibility,
  ArtifactCreateDto,
  ArtifactService,
  ArtifactUpdateDto,
  getArtifactTypeId,
} from '@/features/artifacts/services/artifact.service'
import {
  AcceptedArtifactRef,
  ChatCreateDto,
  ChatDto,
  ChatMetadata,
  ChatStatus,
  ChatType,
  DocumentDto,
  DocumentStatus,
  OperationResult,
  RejectedArtifactRef,
  SDADocumentType,
  SDAServiceConfig,
  SharedWithInfo,
} from '@/features/artifacts/types/sda-artifacts.types'

import {
  getChatHistoryKey,
  getChatKey,
  ProjectService,
  slugify,
} from './project.service'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gera key do documento
 * Padrão: document-{type}-{projectSlug}-{chatSlug}
 */
export function getDocumentKey(
  type: SDADocumentType,
  projectSlug: string,
  chatSlug: string
): string {
  return `document-${type}-${projectSlug}-${chatSlug}`
}

// ============================================================================
// CHAT SERVICE
// ============================================================================

export class ChatService {
  private artifactService: ArtifactService
  private projectService: ProjectService
  private config: SDAServiceConfig

  constructor(config: SDAServiceConfig) {
    this.config = config
    this.artifactService = new ArtifactService({
      baseUrl: config.baseUrl,
      accessToken: config.accessToken,
      licenseId: config.licenseId,
      namespaceId: config.namespaceId,
    })
    this.projectService = new ProjectService(config)
  }

  /**
   * Cria um novo chat vinculado a um projeto
   * Se o chat já existir, retorna o existente sem erro
   */
  async create(data: ChatCreateDto): Promise<OperationResult<ChatDto>> {
    try {
      // Use pre-generated slug if provided, otherwise generate a stable unique one
      // Slug is IMMUTABLE — renaming the chat only changes the display name, not the slug
      const chatSlug = data.slug || `${slugify(data.name)}-${uuidv4().split('-')[0]}`

      // ================================================================
      // VERIFICAR SE JÁ EXISTE ANTES DE TENTAR CRIAR
      // Evita o console.error do ArtifactService.create que o Next.js intercepta
      // ================================================================
      try {
        const existing = await this.getBySlug(data.projectSlug, chatSlug)
        if (existing.success && existing.data) {
          console.log(
            '[ChatService] Chat já existe, retornando existente:',
            getChatKey(data.projectSlug, chatSlug)
          )
          return { success: true, data: existing.data }
        }
      } catch {
        // Chat não existe, continuar para criação
      }

      const now = new Date().toISOString()
      const chatId = uuidv4()

      // Busca o artifactTypeId para o tipo JSON
      const jsonTypeId = await getArtifactTypeId(
        'JSON',
        this.config.baseUrl,
        this.config.accessToken,
        this.config.licenseId,
        this.config.namespaceId
      )

      if (!jsonTypeId) {
        throw new Error('Artifact type "JSON" not found in API')
      }

      // Gera keys do chat
      const chatKey = getChatKey(data.projectSlug, chatSlug)
      const historyKey = getChatHistoryKey(data.projectSlug, chatSlug)

      // Dados do chat
      const chat: ChatDto = {
        id: chatId,
        projectId: data.projectId,
        projectSlug: data.projectSlug,
        name: data.name,
        slug: chatSlug,
        description: data.description || '',
        type: data.type || 'discovery',
        createdAt: now,
        updatedAt: now,
        createdBy: this.config.userId,
        createdByName: this.config.userName,
        status: ChatStatus.ACTIVE,
        historyArtifactKey: historyKey,
        acceptedArtifacts: [],
        rejectedArtifacts: [],
        metadata: {
          totalMessages: 0,
          totalArtifacts: 0,
          acceptedArtifacts: 0,
          lastMessageAt: null,
        },
        tags: data.tags || [],
      }

      // Cria artefato do chat
      const chatArtifact: ArtifactCreateDto = {
        key: chatKey,
        description: `Chat SDA2: ${data.name} (Projeto: ${data.projectSlug})`,
        value: JSON.stringify(chat, null, 2),
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
        type: 'JSON',
        artifactTypeId: jsonTypeId,
        secret: false,
        metadata: '',
        tags: ['sda2', 'chat', data.projectSlug].join(','),
        version: '1.0.0',
      }

      console.log('[ChatService] Creating chat:', chatKey)
      try {
        await this.artifactService.create(chatArtifact)
      } catch (createError) {
        // Se o artefato já existe, buscar o existente e retornar sucesso
        const errMsg =
          createError instanceof Error
            ? createError.message
            : String(createError)
        if (
          errMsg.includes('already exists') ||
          errMsg.includes('Already exists')
        ) {
          console.log(
            '[ChatService] Chat já existe, buscando existente:',
            chatKey
          )
          const existing = await this.getBySlug(data.projectSlug, chatSlug)
          if (existing.success && existing.data) {
            return { success: true, data: existing.data }
          }
          // Se não encontrou, retornar o chat como se tivesse criado
          return { success: true, data: chat }
        }
        throw createError
      }

      // Cria artefato do histórico vazio
      const historyArtifact: ArtifactCreateDto = {
        key: historyKey,
        description: `Histórico de Chat SDA2: ${data.name}`,
        value: JSON.stringify({ messages: [] }, null, 2),
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
        type: 'JSON',
        artifactTypeId: jsonTypeId,
        secret: false,
        metadata: '',
        tags: ['sda2', 'history', data.projectSlug, chatSlug].join(','),
        version: '1.0.0',
      }

      console.log('[ChatService] Creating history:', historyKey)
      try {
        await this.artifactService.create(historyArtifact)
      } catch (historyError) {
        const errMsg =
          historyError instanceof Error
            ? historyError.message
            : String(historyError)
        if (
          errMsg.includes('already exists') ||
          errMsg.includes('Already exists')
        ) {
          console.log(
            '[ChatService] History já existe, continuando:',
            historyKey
          )
        } else {
          throw historyError
        }
      }

      // Adiciona referência do chat ao projeto
      await this.projectService.addChat(data.projectSlug, {
        chatId: chat.id,
        chatSlug: chat.slug,
        chatName: chat.name,
        createdAt: chat.createdAt,
        type: chat.type,
        createdBy: chat.createdBy,
        createdByName: chat.createdByName,
      })

      console.log('[ChatService] ✅ Chat created:', chatKey)

      return {
        success: true,
        data: chat,
      }
    } catch (error) {
      console.error('[ChatService] Error creating chat:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create chat',
      }
    }
  }

  /**
   * Obtém um chat pelo projectSlug e chatSlug
   */
  async getBySlug(
    projectSlug: string,
    chatSlug: string
  ): Promise<OperationResult<ChatDto>> {
    try {
      const key = getChatKey(projectSlug, chatSlug)
      console.log('[ChatService] Getting chat by key:', key)

      const artifact = await this.artifactService.getByKeyWithLatestVersion(key)
      const chat = JSON.parse(artifact.value || '{}') as ChatDto

      // Backward compatibility: chats antigos sem type recebem 'discovery'
      if (!chat.type) {
        chat.type = 'discovery'
      }

      return {
        success: true,
        data: chat,
      }
    } catch (error) {
      // Not finding a chat is expected during creation flow — only warn, don't error
      const message =
        error instanceof Error ? error.message : 'Failed to get chat'
      if (message.includes('not found') || message.includes('Not found')) {
        console.log(
          '[ChatService] Chat not found (expected during create):',
          getChatKey(projectSlug, chatSlug)
        )
      } else {
        console.error('[ChatService] Error getting chat:', error)
      }
      return {
        success: false,
        error: message,
      }
    }
  }

  /**
   * Lista chats de um projeto de forma progressiva (um a um).
   * Cada chat válido é emitido via callback conforme é carregado e validado.
   * Chats inativos (soft-deleted) são filtrados ANTES de emitir ao callback.
   * Para robustez, SEMPRE busca a versão mais recente do artefato.
   *
   * @param projectSlug - slug do projeto
   * @param filterType - filtro opcional por tipo de chat
   * @param onChatLoaded - callback chamado para cada chat válido carregado
   * @returns Lista completa de chats ao final
   */
  async listByProject(
    projectSlug: string,
    filterType?: ChatType,
    onChatLoaded?: (chat: ChatDto) => void
  ): Promise<OperationResult<ChatDto[]>> {
    try {
      const prefix = `chat-${projectSlug}-`
      const result = await this.artifactService.getAll({
        search: prefix,
        pageSize: 1000,
      })

      console.log(
        `[ChatService] Found ${result.items.length} chat artifacts for project ${projectSlug}`
      )

      const chats: ChatDto[] = []
      const currentUserId = this.config.userId

      // Filtrar itens válidos primeiro (apenas os que começam com o prefixo correto)
      const validItems = result.items.filter(item =>
        item.key.startsWith(prefix)
      )

      for (const item of validItems) {
        try {
          // SEMPRE buscar versão mais recente para garantir dados atualizados
          // (especialmente status de soft-delete que pode não estar no getAll)
          let finalValue = item.value
          try {
            const artifact =
              await this.artifactService.getByKeyWithLatestVersion(item.key)
            finalValue = artifact.value
          } catch {
            // Se falhar ao buscar versão, usa o valor do getAll
            console.warn(
              `[ChatService] Fallback to getAll value for ${item.key}`
            )
          }

          const chat = JSON.parse(finalValue || '{}') as ChatDto

          if (chat.id && chat.slug) {
            // Backward compatibility: chats antigos sem type recebem 'discovery'
            if (!chat.type) {
              chat.type = 'discovery'
            }

            // === FILTROS PRÉ-EMISSÃO: aplicados ANTES de mostrar ao usuário ===

            // Filtrar chats inativos (soft-deleted) — prioridade máxima
            if (chat.status === ChatStatus.INACTIVE) {
              console.log(
                `[ChatService] ⏭️ Skipping INACTIVE chat: ${item.key}`
              )
              continue
            }

            // Filtrar por type se especificado
            if (filterType && chat.type !== filterType) continue

            // Filtrar por criador: só retornar chats do usuário atual
            if (chat.createdBy && chat.createdBy !== currentUserId) {
              continue
            }

            chats.push(chat)

            // Emitir chat válido via callback para renderização progressiva
            if (onChatLoaded) {
              onChatLoaded(chat)
              // Yield para permitir que o React renderize antes do próximo
              await new Promise(resolve => setTimeout(resolve, 80))
            }
          }
        } catch (error) {
          console.error(`[ChatService] Error parsing ${item.key}:`, error)
        }
      }

      console.log(
        `[ChatService] Returning ${chats.length} chats owned by user ${currentUserId}`
      )

      return {
        success: true,
        data: chats,
      }
    } catch (error) {
      console.error('[ChatService] Error listing chats:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list chats',
      }
    }
  }

  /**
   * Adiciona artefato aceito ao chat
   * IMPORTANTE: Este método NÃO incrementa a versão - usa a versão passada no artifactRef
   * O incremento de versão é feito em saveDocument
   */
  async addAcceptedArtifact(
    projectSlug: string,
    chatSlug: string,
    artifactRef: AcceptedArtifactRef
  ): Promise<OperationResult<ChatDto>> {
    try {
      const chatResult = await this.getBySlug(projectSlug, chatSlug)
      if (!chatResult.success || !chatResult.data) {
        return {
          success: false,
          error: `Chat not found: ${projectSlug}/${chatSlug}`,
        }
      }

      const chat = chatResult.data

      // Verifica se artefato do mesmo TIPO já existe no mesmo chat
      // - Mesmo tipo no mesmo chat = atualiza (usa versão do artifactRef)
      // (chat.service já é scoped por chat, então só precisa verificar documentType)
      const existingIndex = chat.acceptedArtifacts.findIndex(
        a => a.documentType === artifactRef.documentType
      )

      if (existingIndex >= 0) {
        // Atualiza existente - USA a versão que veio no artifactRef (já incrementada pelo saveDocument)
        const existingVersion =
          chat.acceptedArtifacts[existingIndex]?.version || '1.0.0'

        console.log(
          `[ChatService] Updating existing artifact of type ${artifactRef.documentType}:`,
          {
            oldVersion: existingVersion,
            newVersion: artifactRef.version,
          }
        )

        chat.acceptedArtifacts[existingIndex] = artifactRef
      } else {
        // Adiciona novo
        console.log(
          `[ChatService] Adding new artifact of type ${artifactRef.documentType}`
        )
        chat.acceptedArtifacts.push(artifactRef)
      }

      // Atualiza metadados
      chat.metadata.acceptedArtifacts = chat.acceptedArtifacts.length
      chat.updatedAt = new Date().toISOString()

      // Salva chat atualizado
      return await this.update(projectSlug, chatSlug, chat)
    } catch (error) {
      console.error('[ChatService] Error adding accepted artifact:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to add accepted artifact',
      }
    }
  }

  /**
   * Adiciona artefato rejeitado ao chat
   * NÃO incrementa versão - apenas registra a rejeição para persistência
   */
  async addRejectedArtifact(
    projectSlug: string,
    chatSlug: string,
    artifactRef: RejectedArtifactRef
  ): Promise<OperationResult<ChatDto>> {
    try {
      const chatResult = await this.getBySlug(projectSlug, chatSlug)
      if (!chatResult.success || !chatResult.data) {
        return {
          success: false,
          error: `Chat not found: ${projectSlug}/${chatSlug}`,
        }
      }

      const chat = chatResult.data

      // Inicializar rejectedArtifacts se não existir (migração)
      if (!chat.rejectedArtifacts) {
        chat.rejectedArtifacts = []
      }

      // Verifica se artefato do mesmo TIPO já foi rejeitado no mesmo chat
      // - Mesmo tipo no mesmo chat = substitui (mantém apenas o mais recente)
      const existingIndex = chat.rejectedArtifacts.findIndex(
        a => a.documentType === artifactRef.documentType
      )

      if (existingIndex >= 0) {
        console.log(
          `[ChatService] Updating existing rejected artifact of type ${artifactRef.documentType}`
        )
        chat.rejectedArtifacts[existingIndex] = artifactRef
      } else {
        console.log(
          `[ChatService] Adding new rejected artifact of type ${artifactRef.documentType}`
        )
        chat.rejectedArtifacts.push(artifactRef)
      }

      // Atualiza metadados
      chat.updatedAt = new Date().toISOString()

      // Salva chat atualizado
      return await this.update(projectSlug, chatSlug, chat)
    } catch (error) {
      console.error('[ChatService] Error adding rejected artifact:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to add rejected artifact',
      }
    }
  }

  /**
   * Remove artefato aceito do chat
   */
  async removeAcceptedArtifact(
    projectSlug: string,
    chatSlug: string,
    artifactKey: string
  ): Promise<OperationResult<ChatDto>> {
    try {
      const chatResult = await this.getBySlug(projectSlug, chatSlug)
      if (!chatResult.success || !chatResult.data) {
        return {
          success: false,
          error: `Chat not found: ${projectSlug}/${chatSlug}`,
        }
      }

      const chat = chatResult.data

      // Remove artefato
      chat.acceptedArtifacts = chat.acceptedArtifacts.filter(
        a => a.artifactKey !== artifactKey
      )

      // Atualiza metadados
      chat.metadata.acceptedArtifacts = chat.acceptedArtifacts.length
      chat.updatedAt = new Date().toISOString()

      // Salva chat atualizado
      return await this.update(projectSlug, chatSlug, chat)
    } catch (error) {
      console.error('[ChatService] Error removing accepted artifact:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to remove accepted artifact',
      }
    }
  }

  /**
   * Atualiza metadados do chat (ex: após mensagem)
   */
  async updateMetadata(
    projectSlug: string,
    chatSlug: string,
    metadata: Partial<ChatMetadata>
  ): Promise<OperationResult<ChatDto>> {
    try {
      const chatResult = await this.getBySlug(projectSlug, chatSlug)
      if (!chatResult.success || !chatResult.data) {
        return {
          success: false,
          error: `Chat not found: ${projectSlug}/${chatSlug}`,
        }
      }

      const chat = chatResult.data

      // Merge metadados
      chat.metadata = {
        ...chat.metadata,
        ...metadata,
      }
      chat.updatedAt = new Date().toISOString()

      return await this.update(projectSlug, chatSlug, chat)
    } catch (error) {
      console.error('[ChatService] Error updating metadata:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update chat metadata',
      }
    }
  }

  /**
   * Obtém histórico de mensagens do chat
   * Retorna array vazio se histórico não existir
   */
  async getHistory(
    projectSlug: string,
    chatSlug: string
  ): Promise<OperationResult<{ messages: unknown[] }>> {
    try {
      const historyKey = getChatHistoryKey(projectSlug, chatSlug)
      console.log('[ChatService] Getting history:', historyKey)

      try {
        const artifact =
          await this.artifactService.getByKeyWithLatestVersion(historyKey)
        const history = JSON.parse(artifact.value || '{"messages":[]}')

        // DEBUG: Log detalhado do histórico carregado
        console.log('[ChatService] 🔍 Histórico carregado:', {
          historyKey,
          messageCount: history.messages?.length,
          messagesWithIsRejected: history.messages?.filter(
            (m: { isRejected?: boolean }) => m.isRejected === true
          )?.length,
          rejectedMessages: history.messages
            ?.filter((m: { isRejected?: boolean }) => m.isRejected === true)
            ?.map(
              (m: {
                id: string
                isRejected?: boolean
                rejectedAt?: string
                artifactType?: string
              }) => ({
                id: m.id,
                isRejected: m.isRejected,
                rejectedAt: m.rejectedAt,
                artifactType: m.artifactType,
              })
            ),
        })

        return {
          success: true,
          data: history,
        }
      } catch {
        // Histórico não existe, retorna vazio
        console.log(
          '[ChatService] History not found, returning empty:',
          historyKey
        )
        return {
          success: true,
          data: { messages: [] },
        }
      }
    } catch (error) {
      console.error('[ChatService] Error getting history:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get history',
      }
    }
  }

  /**
   * Salva histórico de mensagens do chat
   * Cria o artefato se não existir
   */
  async saveHistory(
    projectSlug: string,
    chatSlug: string,
    messages: unknown[]
  ): Promise<OperationResult<void>> {
    try {
      const historyKey = getChatHistoryKey(projectSlug, chatSlug)
      console.log('[ChatService] Saving history:', historyKey)

      // Tenta obter artefato existente
      let existing: { id: string } | null = null
      try {
        existing = await this.artifactService.getByKey(historyKey)
      } catch {
        // Artefato não existe, vamos criar
        console.log(
          '[ChatService] History artifact not found, creating:',
          historyKey
        )
      }

      if (existing) {
        // Atualiza artefato existente
        const updateDto: ArtifactUpdateDto = {
          id: existing.id,
          value: JSON.stringify({ messages }, null, 2),
          description: `Histórico de Chat SDA2 (${messages.length} mensagens)`,
          secret: false,
          accessibility: ArtifactAccessibility.NAMESPACE_USER,
        }

        await this.artifactService.update(updateDto)
      } else {
        // Cria novo artefato de histórico
        const jsonTypeId = await getArtifactTypeId(
          'JSON',
          this.config.baseUrl,
          this.config.accessToken,
          this.config.licenseId,
          this.config.namespaceId
        )

        if (!jsonTypeId) {
          throw new Error('Artifact type "JSON" not found in API')
        }

        const historyArtifact: ArtifactCreateDto = {
          key: historyKey,
          description: `Histórico de Chat SDA2 (${messages.length} mensagens)`,
          value: JSON.stringify({ messages }, null, 2),
          accessibility: ArtifactAccessibility.NAMESPACE_USER,
          type: 'JSON',
          artifactTypeId: jsonTypeId,
          secret: false,
          metadata: '',
          tags: ['sda2', 'history', projectSlug, chatSlug].join(','),
          version: '1.0.0',
        }

        await this.artifactService.create(historyArtifact)
      }

      // Atualiza metadados do chat (se o chat existir)
      try {
        await this.updateMetadata(projectSlug, chatSlug, {
          totalMessages: messages.length,
          lastMessageAt: new Date().toISOString(),
        })
      } catch {
        // Chat pode não existir ainda, ignora erro
        console.log(
          '[ChatService] Could not update chat metadata (chat may not exist)'
        )
      }

      console.log('[ChatService] ✅ History saved:', historyKey)

      return { success: true }
    } catch (error) {
      console.error('[ChatService] Error saving history:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to save history',
      }
    }
  }

  /**
   * Atualiza o status de um artefato em uma mensagem do histórico
   * Define isAccepted=true quando aprovado
   */
  async updateMessageArtifactStatus(
    projectSlug: string,
    chatSlug: string,
    messageId: string,
    artifactType: string,
    status: 'pending' | 'approved' | 'rejected',
    approverInfo?: { userId: string; userName: string },
    artifactSummary?: string[]
  ): Promise<OperationResult<void>> {
    try {
      console.log('[ChatService] Atualizando status do artefato:', {
        projectSlug,
        chatSlug,
        artifactType,
        status,
      })

      // Obter histórico atual
      const historyResult = await this.getHistory(projectSlug, chatSlug)
      if (!historyResult.success || !historyResult.data) {
        console.error('[ChatService] Histórico não encontrado')
        return { success: false, error: 'History not found' }
      }

      const messages = historyResult.data.messages as Array<{
        id: string
        isArtifact?: boolean
        artifactType?: string
        isAccepted?: boolean
        isRejected?: boolean
        acceptedAt?: string
        acceptedBy?: string
        acceptedByName?: string
        rejectedAt?: string
        rejectedBy?: string
        rejectedByName?: string
        artifactSummary?: string[]
        content?: string
        sender?: { type?: string }
      }>

      console.log(
        '[ChatService] Total de mensagens no histórico:',
        messages.length
      )

      // Buscar a última mensagem do agente que seja artefato ou contenha conteúdo de artefato
      let messageIndex = -1

      // Normalizar o tipo do artefato para busca por padrões
      const normalizeTypeForPatterns = (type: string): string => {
        const typeMap: Record<string, string> = {
          'documento de discovery': 'briefing',
          'discovery document': 'briefing',
          discovery: 'briefing',
          briefing: 'briefing',
          brief: 'briefing',
          prd: 'prd',
          'prd(product requirements document)': 'prd',
          'product requirements document': 'prd',
          backlog: 'backlog',
          'backlog do produto': 'backlog',
          'product backlog': 'backlog',
          architecture: 'architecture',
          'documento de arquitetura': 'architecture',
          'architecture document': 'architecture',
          design: 'design',
          'especificação de design': 'design',
          'especificacao de design': 'design',
        }
        return typeMap[type.toLowerCase().trim()] || type.toLowerCase().trim()
      }
      const normalizedTypeKey = normalizeTypeForPatterns(artifactType)
      console.log('[ChatService] Tipo normalizado para busca:', {
        original: artifactType,
        normalized: normalizedTypeKey,
        totalMessages: messages.length,
      })

      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]

        // Verificar se já tem artifactType definido (compara normalizado ou exato)
        if (msg?.artifactType) {
          const msgTypeNormalized = normalizeTypeForPatterns(msg.artifactType)
          if (
            msg.artifactType === artifactType ||
            msgTypeNormalized === normalizedTypeKey
          ) {
            messageIndex = i
            console.log('[ChatService] Encontrou mensagem por artifactType:', i)
            break
          }
        }

        // Verificar se é mensagem marcada como artefato
        if (msg?.isArtifact === true && msg?.sender?.type === 'agent') {
          messageIndex = i
          console.log(
            '[ChatService] Encontrou mensagem por isArtifact=true:',
            i
          )
          break
        }

        // Verificar se é mensagem do agente com conteúdo de artefato (padrões no conteúdo)
        if (msg?.sender?.type === 'agent' && msg?.content) {
          const content = msg.content.toLowerCase()
          const typePatterns: Record<string, RegExp[]> = {
            briefing: [
              /briefing/i,
              /discovery/i,
              /contexto do projeto/i,
              /artifact_metadata/i,
            ],
            prd: [
              /prd/i,
              /requisitos de produto/i,
              /product requirements/i,
              /artifact_metadata/i,
            ],
            backlog: [
              /backlog/i,
              /épico/i,
              /user stor/i,
              /feature/i,
              /artifact_metadata/i,
            ],
            architecture: [
              /arquitetura/i,
              /architecture/i,
              /microserviç/i,
              /artifact_metadata/i,
            ],
            design: [/design/i, /ux/i, /interface/i, /artifact_metadata/i],
          }

          const patterns = typePatterns[normalizedTypeKey]
          if (patterns && patterns.some(p => p.test(content))) {
            messageIndex = i
            console.log(
              '[ChatService] Encontrou mensagem por padrão de conteúdo:',
              i
            )
            break
          }
        }
      }

      if (messageIndex === -1) {
        console.error(
          '[ChatService] Nenhuma mensagem encontrada para tipo:',
          artifactType
        )
        return {
          success: false,
          error: `Message with artifact type "${artifactType}" not found`,
        }
      }

      const message = messages[messageIndex]!
      const now = new Date().toISOString()

      // Atualizar campos simplificados
      message.isArtifact = true
      message.artifactType = artifactType
      message.isAccepted = status === 'approved'
      message.isRejected = status === 'rejected'

      if (status === 'approved' && approverInfo) {
        message.acceptedAt = now
        message.acceptedBy = approverInfo.userId
        message.acceptedByName = approverInfo.userName
      }

      if (status === 'rejected') {
        message.rejectedAt = now
        message.rejectedBy = approverInfo?.userId
        message.rejectedByName = approverInfo?.userName
      }

      // Persistir resumo dinâmico do artefato (gerado no momento da aceitação)
      if (artifactSummary && artifactSummary.length > 0) {
        message.artifactSummary = artifactSummary
      }

      console.log('[ChatService] Mensagem atualizada:', {
        id: message.id,
        isArtifact: message.isArtifact,
        artifactType: message.artifactType,
        isAccepted: message.isAccepted,
        isRejected: message.isRejected,
        acceptedBy: message.acceptedByName,
        rejectedBy: message.rejectedByName,
      })

      messages[messageIndex] = message

      // Salvar histórico atualizado
      const saveResult = await this.saveHistory(projectSlug, chatSlug, messages)

      if (saveResult.success) {
        console.log(
          '[ChatService] ✅ Histórico salvo com isAccepted =',
          message.isAccepted,
          'isRejected =',
          message.isRejected
        )
      }

      return saveResult
    } catch (error) {
      console.error('[ChatService] Erro ao atualizar status:', error)
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
   * Atualiza chat existente
   */
  private async update(
    projectSlug: string,
    chatSlug: string,
    chat: ChatDto
  ): Promise<OperationResult<ChatDto>> {
    try {
      const key = getChatKey(projectSlug, chatSlug)

      // Busca artefato existente para obter o ID
      const existing = await this.artifactService.getByKey(key)

      const updateDto: ArtifactUpdateDto = {
        id: existing.id,
        value: JSON.stringify(chat, null, 2),
        description: `Chat SDA2: ${chat.name} (Projeto: ${projectSlug})`,
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
      }

      await this.artifactService.update(updateDto)

      console.log('[ChatService] ✅ Chat updated:', key)

      return {
        success: true,
        data: chat,
      }
    } catch (error) {
      console.error('[ChatService] Error updating chat:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update chat',
      }
    }
  }

  /**
   * Desativa um chat (soft-delete)
   * Altera o status para INACTIVE, mantendo o artefato para histórico
   */
  async softDelete(
    projectSlug: string,
    chatSlug: string
  ): Promise<OperationResult<void>> {
    try {
      const chatResult = await this.getBySlug(projectSlug, chatSlug)
      if (!chatResult.success || !chatResult.data) {
        return {
          success: false,
          error: `Chat not found: ${projectSlug}/${chatSlug}`,
        }
      }

      const chat = chatResult.data
      chat.status = ChatStatus.INACTIVE
      chat.updatedAt = new Date().toISOString()

      await this.update(projectSlug, chatSlug, chat)

      console.log(
        '[ChatService] ✅ Chat soft-deleted (status=inactive):',
        getChatKey(projectSlug, chatSlug)
      )

      return { success: true }
    } catch (error) {
      console.error('[ChatService] Error soft-deleting chat:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to soft-delete chat',
      }
    }
  }

  /**
   * Deleta um chat (hard delete - uso interno/admin)
   */
  async delete(
    projectSlug: string,
    chatSlug: string
  ): Promise<OperationResult<void>> {
    try {
      const chatKey = getChatKey(projectSlug, chatSlug)
      const historyKey = getChatHistoryKey(projectSlug, chatSlug)

      // Deleta chat
      try {
        const chatArtifact = await this.artifactService.getByKey(chatKey)
        await this.artifactService.delete(chatArtifact.id)
        console.log('[ChatService] Deleted chat artifact:', chatKey)
      } catch {
        console.warn('[ChatService] Chat artifact not found:', chatKey)
      }

      // Deleta histórico
      try {
        const historyArtifact = await this.artifactService.getByKey(historyKey)
        await this.artifactService.delete(historyArtifact.id)
        console.log('[ChatService] Deleted history artifact:', historyKey)
      } catch {
        console.warn('[ChatService] History artifact not found:', historyKey)
      }

      // TODO: Também deletar documentos do chat (document-{type}-{projectSlug}-{chatSlug})
      // E remover referência do chat do projeto

      console.log('[ChatService] ✅ Chat deleted:', chatKey)

      return { success: true }
    } catch (error) {
      console.error('[ChatService] Error deleting chat:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete chat',
      }
    }
  }

  // ============================================================================
  // DOCUMENT METHODS
  // ============================================================================

  /**
   * Salva um arquivo de upload como artefato
   * Key: upload-{fileName}-{projectSlug}-{chatSlug}
   */
  async saveUploadDocument(data: {
    projectId: string
    projectSlug: string
    chatId: string
    chatSlug: string
    fileName: string
    documentName: string
    content: string
    version?: string
    tags?: string[]
    originalFileName: string
    originalFileType: string
    originalFileSize: number
  }): Promise<OperationResult<{ key: string; id: string }>> {
    try {
      const now = new Date().toISOString()
      const documentId = uuidv4()

      // Busca o artifactTypeId para o tipo JSON
      const jsonTypeId = await getArtifactTypeId(
        'JSON',
        this.config.baseUrl,
        this.config.accessToken,
        this.config.licenseId,
        this.config.namespaceId
      )

      if (!jsonTypeId) {
        throw new Error('Artifact type "JSON" not found in API')
      }

      // Key: upload-{fileName}-{projectSlug}-{chatSlug}
      const uploadKey = `upload-${data.fileName}-${data.projectSlug}-${data.chatSlug}`

      // Estrutura do upload
      const uploadDocument = {
        id: documentId,
        key: uploadKey,
        projectId: data.projectId,
        projectSlug: data.projectSlug,
        chatId: data.chatId,
        chatSlug: data.chatSlug,
        type: 'upload',
        documentName: data.documentName,
        name: data.originalFileName,
        content: data.content,
        version: data.version || '1.0.0',
        originalFileName: data.originalFileName,
        originalFileType: data.originalFileType,
        originalFileSize: data.originalFileSize,
        createdAt: now,
        updatedAt: now,
        createdBy: this.config.userId,
        createdByName: this.config.userName,
      }

      // Verificar se upload já existe
      let existingArtifact
      try {
        existingArtifact =
          await this.artifactService.getByKeyWithLatestVersion(uploadKey)
      } catch {
        existingArtifact = null
      }

      if (existingArtifact) {
        // Atualizar upload existente
        console.log('[ChatService] Updating existing upload:', uploadKey)

        const updateDto: ArtifactUpdateDto = {
          id: existingArtifact.id,
          value: JSON.stringify(uploadDocument, null, 2),
          description: `Upload: ${data.originalFileName}`,
          secret: false,
          accessibility: ArtifactAccessibility.NAMESPACE_USER,
        }

        await this.artifactService.update(updateDto)
        console.log('[ChatService] ✅ Upload updated:', uploadKey)
      } else {
        // Criar novo upload
        console.log('[ChatService] Creating new upload:', uploadKey)

        const createDto: ArtifactCreateDto = {
          key: uploadKey,
          description: `Upload: ${data.originalFileName}`,
          value: JSON.stringify(uploadDocument, null, 2),
          accessibility: ArtifactAccessibility.NAMESPACE_USER,
          type: 'JSON',
          artifactTypeId: jsonTypeId,
          secret: false,
          metadata: '',
          tags: ['sda2', 'upload', ...(data.tags || [])].join(','),
          version: data.version || '1.0.0',
        }

        await this.artifactService.create(createDto)
        console.log('[ChatService] ✅ Upload created:', uploadKey)
      }

      return {
        success: true,
        data: { key: uploadKey, id: documentId },
      }
    } catch (error) {
      console.error('[ChatService] Error saving upload:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save upload',
      }
    }
  }

  /**
   * Salva um documento como artefato separado
   * Key: document-{type}-{projectSlug}-{chatSlug}
   */
  async saveDocument(data: {
    projectId: string
    projectSlug: string
    chatId: string
    chatSlug: string
    documentType: SDADocumentType
    documentName: string
    content: string
    version?: string
    tags?: string[]
  }): Promise<OperationResult<DocumentDto>> {
    try {
      const now = new Date().toISOString()
      const documentId = uuidv4()

      // Busca o artifactTypeId para o tipo JSON
      const jsonTypeId = await getArtifactTypeId(
        'JSON',
        this.config.baseUrl,
        this.config.accessToken,
        this.config.licenseId,
        this.config.namespaceId
      )

      if (!jsonTypeId) {
        throw new Error('Artifact type "JSON" not found in API')
      }

      const documentKey = getDocumentKey(
        data.documentType,
        data.projectSlug,
        data.chatSlug
      )

      // Estrutura do documento
      const document: DocumentDto = {
        id: documentId,
        projectId: data.projectId,
        projectSlug: data.projectSlug,
        chatId: data.chatId,
        chatSlug: data.chatSlug,
        documentType: data.documentType,
        documentName: data.documentName,
        content: data.content,
        version: data.version || '1.0.0',
        hasOfficialVersion: false,
        status: DocumentStatus.PENDING,
        createdAt: now,
        updatedAt: now,
        createdBy: this.config.userId,
        createdByName: this.config.userName,
        approvedAt: null,
        approvedBy: null,
        approvedByName: null,
      }

      // Verificar se documento já existe
      let existingArtifact
      try {
        existingArtifact =
          await this.artifactService.getByKeyWithLatestVersion(documentKey)
      } catch {
        existingArtifact = null
      }

      if (existingArtifact) {
        // Atualizar documento existente
        console.log('[ChatService] Updating existing document:', documentKey)

        const existingDoc = JSON.parse(
          existingArtifact.value || '{}'
        ) as DocumentDto
        document.id = existingDoc.id
        document.createdAt = existingDoc.createdAt
        document.createdBy = existingDoc.createdBy
        document.createdByName = existingDoc.createdByName

        // ✅ Preservar customName: buscar em múltiplas fontes (prioridade: doc > project.approvedArtifacts > chat.acceptedArtifacts)
        if (existingDoc.customName) {
          document.customName = existingDoc.customName
          document.documentName = existingDoc.customName
          console.log(
            '[ChatService] 📝 Preserving customName from doc:',
            existingDoc.customName
          )
        } else {
          // Fallback 1: Buscar customName das references (approvedArtifacts do projeto)
          try {
            const projectArtifact =
              await this.artifactService.getByKeyWithLatestVersion(
                `project-${data.projectSlug}`
              )
            if (projectArtifact?.value) {
              const project = JSON.parse(projectArtifact.value)
              const approved = project.approvedArtifacts?.find(
                (a: any) =>
                  a.documentType === data.documentType &&
                  a.chatSlug === data.chatSlug
              )
              if (approved?.customName) {
                document.customName = approved.customName
                document.documentName = approved.customName
                console.log(
                  '[ChatService] 📝 Injecting customName from project.approvedArtifacts:',
                  approved.customName
                )
              } else {
                // Fallback 2: Buscar em chat.acceptedArtifacts
                const chatArtifact =
                  await this.artifactService.getByKeyWithLatestVersion(
                    `chat-${data.projectSlug}-${data.chatSlug}`
                  )
                if (chatArtifact?.value) {
                  const chat = JSON.parse(chatArtifact.value)
                  const acceptedArtifact = chat.acceptedArtifacts?.find(
                    (a: any) => a.documentType === data.documentType
                  )
                  if (acceptedArtifact?.customName) {
                    document.customName = acceptedArtifact.customName
                    document.documentName = acceptedArtifact.customName
                    console.log(
                      '[ChatService] 📝 Injecting customName from chat.acceptedArtifacts:',
                      acceptedArtifact.customName
                    )
                  }
                }
              }
            }
          } catch (err) {
            console.warn(
              '[ChatService] ⚠️ Could not fetch customName from references:',
              err
            )
          }
        }

        // ✅ Preservar finalized: buscar em múltiplas fontes (prioridade: doc > project.approvedArtifacts > chat.acceptedArtifacts)
        if (existingDoc.finalized !== undefined) {
          document.finalized = existingDoc.finalized
          console.log(
            '[ChatService] 🔒 Preserving finalized from doc:',
            existingDoc.finalized
          )
        } else {
          // Fallback 1: Buscar finalized das references (approvedArtifacts do projeto)
          try {
            const projectArtifact =
              await this.artifactService.getByKeyWithLatestVersion(
                `project-${data.projectSlug}`
              )
            if (projectArtifact?.value) {
              const project = JSON.parse(projectArtifact.value)
              const approved = project.approvedArtifacts?.find(
                (a: any) =>
                  a.documentType === data.documentType &&
                  a.chatSlug === data.chatSlug
              )
              if (approved?.finalized !== undefined) {
                document.finalized = approved.finalized
                console.log(
                  '[ChatService] 🔒 Injecting finalized from project.approvedArtifacts:',
                  approved.finalized
                )
              } else {
                // Fallback 2: Buscar em chat.acceptedArtifacts
                const chatArtifact =
                  await this.artifactService.getByKeyWithLatestVersion(
                    `chat-${data.projectSlug}-${data.chatSlug}`
                  )
                if (chatArtifact?.value) {
                  const chat = JSON.parse(chatArtifact.value)
                  const acceptedArtifact = chat.acceptedArtifacts?.find(
                    (a: any) => a.documentType === data.documentType
                  )
                  if (acceptedArtifact?.finalized !== undefined) {
                    document.finalized = acceptedArtifact.finalized
                    console.log(
                      '[ChatService] 🔒 Injecting finalized from chat.acceptedArtifacts:',
                      acceptedArtifact.finalized
                    )
                  }
                }
              }
            }
          } catch (err) {
            console.warn(
              '[ChatService] ⚠️ Could not fetch finalized from references:',
              err
            )
          }
        }

        // Incrementar versão quando atualiza documento existente
        const existingVersion = String(
          existingArtifact.version || existingDoc.version || '1.0.0'
        )
        const versionParts = existingVersion.split('.')
        const majorVersion = parseInt(versionParts[0] || '1', 10)
        const newVersion = `${majorVersion + 1}.0.0`
        document.version = newVersion

        console.log('[ChatService] Incrementing version:', {
          oldVersion: existingVersion,
          newVersion: newVersion,
        })

        const updateDto: ArtifactUpdateDto = {
          id: existingArtifact.id,
          value: JSON.stringify(document, null, 2),
          description: `Documento ${data.documentName} - ${data.documentType}`,
          secret: false,
          accessibility: ArtifactAccessibility.NAMESPACE,
          version: newVersion,
        }

        await this.artifactService.update(updateDto)
        console.log(
          '[ChatService] ✅ Document updated:',
          documentKey,
          'Version:',
          newVersion
        )
      } else {
        // Criar novo documento
        console.log('[ChatService] Creating new document:', documentKey)

        const createDto: ArtifactCreateDto = {
          key: documentKey,
          description: `Documento ${data.documentName} - ${data.documentType}`,
          value: JSON.stringify(document, null, 2),
          accessibility: ArtifactAccessibility.NAMESPACE,
          type: 'JSON',
          artifactTypeId: jsonTypeId,
          secret: false,
          metadata: '',
          tags: [
            'sda2',
            'document',
            data.documentType,
            ...(data.tags || []),
          ].join(','),
          version: data.version || '1.0.0',
        }

        await this.artifactService.create(createDto)
        console.log('[ChatService] ✅ Document created:', documentKey)
      }

      return {
        success: true,
        data: document,
      }
    } catch (error) {
      console.error('[ChatService] Error saving document:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to save document',
      }
    }
  }

  /**
   * Obtém um documento pelo tipo
   */
  async getDocument(
    projectSlug: string,
    chatSlug: string,
    documentType: SDADocumentType
  ): Promise<OperationResult<DocumentDto>> {
    try {
      const documentKey = getDocumentKey(documentType, projectSlug, chatSlug)
      console.log('[ChatService] Getting document:', documentKey)

      let artifact
      try {
        artifact =
          await this.artifactService.getByKeyWithLatestVersion(documentKey)
      } catch {
        return {
          success: false,
          error: 'Document not found',
        }
      }

      const document = JSON.parse(artifact.value || '{}') as DocumentDto

      return {
        success: true,
        data: document,
      }
    } catch (error) {
      console.error('[ChatService] Error getting document:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get document',
      }
    }
  }

  /**
   * Busca todos os documentos e uploads de um projeto
   * Busca artefatos com prefixos: document-*-{projectSlug}-* e upload-*-{projectSlug}-*
   */
  async searchDocuments(
    projectSlug: string,
    _searchPattern?: string
  ): Promise<
    OperationResult<
      Array<{
        id: string
        key: string
        name: string
        type: string
        description?: string
      }>
    >
  > {
    try {
      console.log('[ChatService] Searching uploads for project:', projectSlug)

      // Busca apenas artefatos upload-
      const uploadResult = await this.artifactService.getAll({
        search: `upload-`,
        pageSize: 1000,
      })

      console.log(
        `[ChatService] Found ${uploadResult.items.length} upload- artifacts`
      )

      // Filtra apenas os que pertencem ao projeto
      const projectDocuments = uploadResult.items
        .filter(item => {
          // Garantir que começa com upload-
          if (!item.key.startsWith('upload-')) {
            return false
          }

          // Verificar se o projectSlug está contido na key
          // Pattern: upload-{fileName}-{projectSlug}-{chatSlug}
          return item.key.includes(`-${projectSlug}-`)
        })
        .map(item => {
          const parts = item.key.split('-')

          // Tenta extrair nome do upload
          let name = ''
          let description: string | undefined

          try {
            const parsed = JSON.parse(item.value || '{}')
            // Upload: usa nome original do arquivo
            name =
              parsed.originalFileName ||
              parsed.name ||
              parsed.documentName ||
              'Upload'
            description = `Upload: ${parsed.originalFileName || 'arquivo'}`
          } catch {
            // Fallback se não conseguir parsear
            name = parts[1] || 'Upload'
          }

          return {
            id: item.id,
            key: item.key,
            name,
            type: 'upload',
            description,
          }
        })

      console.log(
        `[ChatService] Found ${projectDocuments.length} uploads for project ${projectSlug}`
      )

      return {
        success: true,
        data: projectDocuments,
      }
    } catch (error) {
      console.error('[ChatService] Error searching documents:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to search documents',
      }
    }
  }

  /**
   * Carrega o conteúdo de um documento específico pela key
   */
  async getDocumentContent(
    documentKey: string
  ): Promise<OperationResult<{ content: string; name: string; type: string }>> {
    try {
      console.log('[ChatService] Loading document content for:', documentKey)

      const artifact =
        await this.artifactService.getByKeyWithLatestVersion(documentKey)

      if (!artifact || !artifact.value) {
        return {
          success: false,
          error: `Document not found: ${documentKey}`,
        }
      }

      const parsed = JSON.parse(artifact.value)
      const isUpload = documentKey.startsWith('upload-')

      let content = ''
      let name = ''
      let type = ''

      if (isUpload) {
        // Upload: conteúdo está em parsed.content
        content = parsed.content || ''
        name = parsed.originalFileName || parsed.documentName || 'Upload'
        type = 'upload'
      } else {
        // Document: conteúdo pode estar em parsed.content ou parsed.value
        content =
          parsed.content || parsed.value || JSON.stringify(parsed, null, 2)
        name = parsed.documentName || parsed.name || 'Documento'
        type = parsed.type || 'document'
      }

      console.log(
        `[ChatService] ✅ Document loaded: ${name} (${content.length} chars)`
      )

      return {
        success: true,
        data: { content, name, type },
      }
    } catch (error) {
      console.error('[ChatService] Error loading document content:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to load document',
      }
    }
  }

  // ============================================================================
  // SHARING METHODS
  // ============================================================================

  /**
   * Compartilha um artefato com membros específicos
   * Substitui completamente a lista de compartilhamentos
   * Atualiza tanto o chat quanto o documento real
   */
  async shareArtifact(
    projectSlug: string,
    chatSlug: string,
    artifactKey: string,
    userIdsToShare: string[],
    teamMembers: Array<{ id: string; name: string; email: string }>
  ): Promise<OperationResult<void>> {
    try {
      console.log('[ChatService] Sharing artifact:', {
        artifactKey,
        userCount: userIdsToShare.length,
      })

      // Buscar o chat atual
      const chatResult = await this.getBySlug(projectSlug, chatSlug)
      if (!chatResult.success || !chatResult.data) {
        return {
          success: false,
          error: 'Chat not found',
        }
      }

      const chat = chatResult.data

      // Buscar o artefato nos acceptedArtifacts do chat
      const artifactIndex = chat.acceptedArtifacts.findIndex(
        a => a.artifactKey === artifactKey
      )

      if (artifactIndex === -1) {
        return {
          success: false,
          error: 'Artifact not found in chat',
        }
      }

      const artifact = chat.acceptedArtifacts[artifactIndex]!
      const now = new Date().toISOString()

      // Construir NOVA lista de compartilhamentos (substituindo completamente)

      const newSharedWith: SharedWithInfo[] = []

      for (const userId of userIdsToShare) {
        // Buscar informações do membro
        const member = teamMembers.find(m => m.id === userId)
        if (!member) {
          console.warn(`[ChatService] Member ${userId} not found in team`)
          continue
        }

        // Verificar se já existia compartilhamento anterior
        const previousShare = artifact.sharedWith?.find(
          s => s.userId === userId
        )

        // Criar/atualizar entrada de compartilhamento

        const shareInfo: SharedWithInfo = previousShare
          ? {
              ...previousShare,
              // Manter dados originais mas atualizar versão/data
              sharedVersion: artifact.version,
              sharedAt: now,
              // Re-compartilhamento: resetar notificação para 'unread'
              notificationStatus: 'unread',
            }
          : {
              // Novo compartilhamento
              userId: member.id,
              userName: member.name,
              userEmail: member.email,
              sharedVersion: artifact.version,
              sharedAt: now,
              sharedBy: this.config.userId,
              sharedByName: this.config.userName,
              // Garantir que notificationStatus é setado explicitamente
              notificationStatus: 'unread',
            }

        newSharedWith.push(shareInfo)
      }

      // SUBSTITUIR completamente a lista de compartilhamentos
      artifact.sharedWith = newSharedWith

      console.log('[ChatService] New sharing list:', {
        total: newSharedWith.length,
        users: newSharedWith.map(s => s.userName),
      })

      // Atualizar artefato no array do chat
      chat.acceptedArtifacts[artifactIndex] = artifact

      // ======================================================================
      // ATUALIZAR O DOCUMENTO REAL (incrementando versão)
      // ======================================================================
      try {
        // Buscar o documento atual
        const documentArtifact =
          await this.artifactService.getByKeyWithLatestVersion(artifactKey)

        if (documentArtifact) {
          const document = JSON.parse(
            documentArtifact.value || '{}'
          ) as DocumentDto

          // Atualizar lista completa de sharedWith no documento
          document.sharedWith = newSharedWith
          document.updatedAt = now

          // Incrementar versão PATCH do documento (sharing é metadata, não conteúdo)
          const currentVersion = String(
            documentArtifact.version || document.version || '1.0.0'
          )
          const versionParts = currentVersion.split('.')
          const majorVersion = parseInt(versionParts[0] || '1', 10)
          const minorVersion = parseInt(versionParts[1] || '0', 10)
          const patchVersion = parseInt(versionParts[2] || '0', 10)
          const newVersion = `${majorVersion}.${minorVersion}.${patchVersion + 1}`

          console.log('[ChatService] Updating document with shared info:', {
            oldVersion: currentVersion,
            newVersion,
            sharedWithCount: newSharedWith.length,
          })

          // Atualizar documento no Cockpit
          const updateDto: ArtifactUpdateDto = {
            id: documentArtifact.id,
            value: JSON.stringify(document, null, 2),
            description: `Documento ${document.documentName} - ${document.documentType} (Compartilhado com ${newSharedWith.length} membros)`,
            secret: false,
            accessibility: ArtifactAccessibility.NAMESPACE,
            version: newVersion,
          }

          await this.artifactService.update(updateDto)
          console.log(
            '[ChatService] ✅ Document updated with sharing info:',
            newVersion
          )

          // Atualizar também a versão no artifact do chat
          artifact.version = newVersion
          chat.acceptedArtifacts[artifactIndex] = artifact
        } else {
          console.warn(
            '[ChatService] ⚠️ Document artifact not found, only updating chat'
          )
        }
      } catch (docError) {
        console.error(
          '[ChatService] ❌ Error updating document, continuing with chat update:',
          docError
        )
        // Continuar mesmo se falhar a atualização do documento
      }

      // Salvar chat atualizado
      const updateResult = await this.update(projectSlug, chatSlug, chat)

      if (!updateResult.success) {
        return {
          success: false,
          error: 'Failed to save chat with sharing data',
        }
      }

      // ======================================================================
      // ATUALIZAR A REFERÊNCIA NO PROJETO (approvedArtifacts)
      // Este passo é CRÍTICO: loadProjects usa project.approvedArtifacts.sharedWith
      // para determinar visibilidade. Se falhar, o artefato compartilhado NÃO
      // será visível para o destinatário.
      // ======================================================================
      try {
        const projectResult = await this.projectService.updateArtifactSharing(
          projectSlug,
          artifactKey,
          newSharedWith
        )
        if (!projectResult.success) {
          console.error(
            '[ChatService] ❌ Project sharing update returned failure:',
            projectResult.error
          )
          return {
            success: false,
            error: `Compartilhamento salvo no chat mas falhou no projeto: ${projectResult.error}`,
          }
        }
        console.log(
          '[ChatService] ✅ Project approvedArtifacts updated with sharing info'
        )
      } catch (projectError) {
        console.error(
          '[ChatService] ❌ Error updating project sharing (critical):',
          projectError
        )
        return {
          success: false,
          error:
            'Compartilhamento salvo no chat mas falhou ao atualizar o projeto. O destinatário pode não ver o artefato.',
        }
      }

      if (updateResult.success) {
        console.log(
          `[ChatService] ✅ Artifact shared successfully with ${newSharedWith.length} users`
        )
      }

      return { success: updateResult.success, error: updateResult.error }
    } catch (error) {
      console.error('[ChatService] Error sharing artifact:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to share artifact',
      }
    }
  }

  /**
   * Atualiza o status de notificação de um artefato compartilhado
   * Usado para marcar como lido/não lido/excluído
   */
  async updateNotificationStatus(
    projectSlug: string,
    chatSlug: string,
    artifactKey: string,
    userId: string,
    notificationStatus: 'read' | 'unread' | 'deleted',
    readAt?: string
  ): Promise<OperationResult<void>> {
    try {
      console.log('[ChatService] Updating notification status:', {
        artifactKey,
        userId,
        notificationStatus,
      })

      // Buscar o chat atual
      const chatResult = await this.getBySlug(projectSlug, chatSlug)
      if (!chatResult.success || !chatResult.data) {
        return {
          success: false,
          error: 'Chat not found',
        }
      }

      const chat = chatResult.data

      // Buscar o artefato nos acceptedArtifacts do chat
      const artifactIndex = chat.acceptedArtifacts.findIndex(
        a => a.artifactKey === artifactKey
      )

      if (artifactIndex === -1) {
        return {
          success: false,
          error: 'Artifact not found in chat',
        }
      }

      const artifact = chat.acceptedArtifacts[artifactIndex]!

      // Encontrar o registro de compartilhamento do usuário
      const shareIndex = artifact.sharedWith?.findIndex(
        s => s.userId === userId
      )

      if (shareIndex === undefined || shareIndex === -1) {
        return {
          success: false,
          error: 'Share info not found for user',
        }
      }

      // Atualizar o status de notificação
      const updatedSharedWith = [...(artifact.sharedWith || [])]
      updatedSharedWith[shareIndex] = {
        ...updatedSharedWith[shareIndex]!,
        notificationStatus,
        readAt: readAt || updatedSharedWith[shareIndex]!.readAt,
      }

      artifact.sharedWith = updatedSharedWith

      // Atualizar artefato no array do chat
      chat.acceptedArtifacts[artifactIndex] = artifact

      // Salvar chat atualizado
      const updateResult = await this.update(projectSlug, chatSlug, chat)

      if (!updateResult.success) {
        return {
          success: false,
          error: 'Failed to save chat with notification status',
        }
      }

      // Atualizar também no projeto (approvedArtifacts)
      try {
        await this.projectService.updateArtifactSharing(
          projectSlug,
          artifactKey,
          updatedSharedWith
        )
        console.log('[ChatService] ✅ Notification status updated in project')
      } catch (projectError) {
        console.warn(
          '[ChatService] ⚠️ Failed to update project, chat is already updated:',
          projectError
        )
        // Não falhar se apenas o projeto falhar
      }

      console.log(
        `[ChatService] ✅ Notification status updated to ${notificationStatus}`
      )
      return { success: true }
    } catch (error) {
      console.error('[ChatService] Error updating notification status:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update notification status',
      }
    }
  }
}

/**
 * Retorna nome amigável do tipo de documento
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _getDocumentTypeName(type: string): string {
  const names: Record<string, string> = {
    briefing: 'Briefing',
    prd: 'PRD (Product Requirements Document)',
    requirements: 'Requisitos',
    backlog: 'Backlog',
    architecture: 'Arquitetura',
    design: 'Design',
    document: 'Documento',
    upload: 'Upload',
  }
  return (
    names[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1)
  )
}

// Re-export types for convenience
export type {
  DocumentDto,
  DocumentCreateDto,
} from '@/features/artifacts/types/sda-artifacts.types'
export { DocumentStatus } from '@/features/artifacts/types/sda-artifacts.types'
