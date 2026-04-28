/**
 * Chat Message Converters
 *
 * Funções de conversão entre diferentes formatos de mensagem.
 * Centraliza toda lógica de transformação para garantir consistência.
 */

import type {
  AddMessageInput,
  MessageArtifactInfo,
  MessageAuthorType,
  PersistedChatHistory,
  PersistedChatMessage,
  UnifiedArtifact,
  UnifiedChatHistory,
  UnifiedMessage,
} from './unified-chat.types'

// ============================================================================
// CONVERSORES: UnifiedMessage <-> PersistedChatMessage
// ============================================================================

/**
 * Converte MessageAuthorType para formato de sender da API
 */
function authorTypeToSenderType(author: MessageAuthorType): 'user' | 'agent' {
  return author === 'user' ? 'user' : 'agent'
}

/**
 * Converte sender type da API para MessageAuthorType
 */
function senderTypeToAuthorType(
  senderType: string | undefined
): MessageAuthorType {
  // Normaliza diferentes formatos possíveis
  const normalized = (senderType || 'agent').toLowerCase()
  return normalized === 'user' ? 'user' : 'agent'
}

/**
 * Converte UnifiedMessage para PersistedChatMessage (para salvar na API)
 */
export function unifiedToPersistedMessage(
  message: UnifiedMessage,
  userId?: string,
  userName?: string
): PersistedChatMessage {
  const hasArtifacts = message.artifacts && message.artifacts.length > 0
  const firstArtifact = hasArtifacts ? message.artifacts![0] : null

  // Debug log para verificar artefatos sendo salvos
  if (hasArtifacts) {
    console.log('📦 [unifiedToPersistedMessage] Convertendo artefato:', {
      messageId: message.id,
      artifactId: firstArtifact?.id,
      artifactName: firstArtifact?.name,
      artifactTitle: firstArtifact?.title,
      artifactType: firstArtifact?.type,
      artifactStatus: firstArtifact?.status,
      hasContent: !!firstArtifact?.content,
      contentLength: firstArtifact?.content?.length || 0,
    })
  }

  return {
    id: message.id,
    timestamp: message.timestamp,
    sender: {
      type: authorTypeToSenderType(message.author),
      id:
        message.author === 'user'
          ? userId || 'unknown-user'
          : message.agentId || 'unknown-agent',
      name:
        message.author === 'user'
          ? userName || 'Usuário'
          : message.agentName || 'Agente',
    },
    content: message.content,
    isArtifact: hasArtifacts || false,
    artifactData: firstArtifact
      ? {
          artifactId: firstArtifact.id,
          artifactKey: firstArtifact.artifactKey || firstArtifact.id,
          artifactName: firstArtifact.name || firstArtifact.title || 'Artefato',
          artifactType: firstArtifact.type,
          artifactCategory: firstArtifact.category,
          version: firstArtifact.version || '1.0.0',
          status: firstArtifact.status || 'pending',
          approvedAt: null,
          approvedBy: null,
          approvedByName: null,
          rejectionReason: null,
        }
      : null,
  }
}

/**
 * Converte PersistedChatMessage para UnifiedMessage (ao carregar da API)
 */
export function persistedToUnifiedMessage(
  message: PersistedChatMessage
): UnifiedMessage {
  const author = senderTypeToAuthorType(message.sender?.type)

  const artifacts: UnifiedArtifact[] = []
  if (message.isArtifact && message.artifactData) {
    console.log('📥 [persistedToUnifiedMessage] Carregando artefato:', {
      messageId: message.id,
      artifactId: message.artifactData.artifactId,
      artifactName: message.artifactData.artifactName,
      artifactType: message.artifactData.artifactType,
      artifactCategory: message.artifactData.artifactCategory,
      status: message.artifactData.status,
      hasContent: !!message.content,
    })
    artifacts.push(artifactInfoToUnified(message.artifactData, message.content))
  }

  return {
    id: message.id,
    content: message.content,
    author,
    agentId: author === 'agent' ? message.sender?.id : undefined,
    agentName: author === 'agent' ? message.sender?.name : undefined,
    timestamp: message.timestamp,
    status: 'sent',
    hasActions: artifacts.length > 0,
    isProposal: artifacts.length > 0,
    artifacts: artifacts.length > 0 ? artifacts : undefined,
  }
}

/**
 * Converte MessageArtifactInfo para UnifiedArtifact
 */
function artifactInfoToUnified(
  info: MessageArtifactInfo,
  content: string
): UnifiedArtifact {
  return {
    id: info.artifactId,
    baseId: info.artifactId,
    version: info.version,
    name: info.artifactName,
    title: info.artifactName,
    content: content,
    type: (info.artifactType as UnifiedArtifact['type']) || 'document',
    category:
      (info.artifactCategory as UnifiedArtifact['category']) ||
      'documento-briefing',
    status: info.status,
    stage: 'cocreation',
    initiativeId: '',
    isProposal: info.status === 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    artifactKey: info.artifactKey,
  }
}

// ============================================================================
// CONVERSORES: UnifiedChatHistory <-> PersistedChatHistory
// ============================================================================

/**
 * Converte UnifiedChatHistory para PersistedChatHistory
 */
export function unifiedToPersistedHistory(
  history: UnifiedChatHistory,
  userId?: string,
  userName?: string
): PersistedChatHistory {
  return {
    initiativeId: history.initiativeId,
    initiativeName: history.initiativeName,
    initiativeSlug: history.initiativeSlug,
    createdAt: history.createdAt,
    updatedAt: history.updatedAt,
    totalMessages: history.messages.length,
    messages: history.messages.map(msg =>
      unifiedToPersistedMessage(msg, userId, userName)
    ),
  }
}

/**
 * Converte PersistedChatHistory para UnifiedChatHistory
 */
export function persistedToUnifiedHistory(
  history: PersistedChatHistory
): UnifiedChatHistory {
  return {
    initiativeId: history.initiativeId,
    initiativeName: history.initiativeName,
    initiativeSlug: history.initiativeSlug,
    createdAt: history.createdAt,
    updatedAt: history.updatedAt,
    totalMessages: history.totalMessages,
    messages: history.messages.map(persistedToUnifiedMessage),
  }
}

// ============================================================================
// CONVERSORES: Formatos legados
// ============================================================================

/**
 * Converte formato legado com 'role' para UnifiedMessage
 * Usado para compatibilidade com hooks antigos
 */
export function legacyRoleMessageToUnified(message: {
  id: string
  content: string
  role: 'user' | 'assistant'
  agentId?: string
  timestamp: Date | string
  status?: string
  artifacts?: any[]
}): UnifiedMessage {
  return {
    id: message.id,
    content: message.content,
    author: message.role === 'user' ? 'user' : 'agent',
    agentId: message.agentId,
    timestamp:
      message.timestamp instanceof Date
        ? message.timestamp.toISOString()
        : message.timestamp,
    status: (message.status as UnifiedMessage['status']) || 'sent',
    hasActions: message.artifacts && message.artifacts.length > 0,
    isProposal: message.artifacts && message.artifacts.length > 0,
    artifacts: message.artifacts?.map(legacyArtifactToUnified),
  }
}

/**
 * Converte UnifiedMessage para formato com 'role'
 */
export function unifiedToLegacyRoleMessage(message: UnifiedMessage): {
  id: string
  content: string
  role: 'user' | 'assistant'
  agentId?: string
  timestamp: Date
  status: string
  artifacts?: any[]
} {
  return {
    id: message.id,
    content: message.content,
    role: message.author === 'user' ? 'user' : 'assistant',
    agentId: message.agentId,
    timestamp: new Date(message.timestamp),
    status: message.status || 'sent',
    artifacts: message.artifacts,
  }
}

/**
 * Converte artefato legado para UnifiedArtifact
 */
function legacyArtifactToUnified(artifact: any): UnifiedArtifact {
  return {
    id: artifact.id || artifact.artifactId || `artifact-${Date.now()}`,
    baseId: artifact.base_id || artifact.baseId,
    version: artifact.version || '1.0.0',
    name: artifact.name || artifact.title || 'Artefato',
    title: artifact.title || artifact.name || 'Artefato',
    content: artifact.content || '',
    type: artifact.type || 'document',
    category: artifact.category || 'pack-demanda',
    status: artifact.status || 'pending',
    stage: artifact.stage || 'cocreation',
    agentId: artifact.agentId,
    initiativeId: artifact.initiativeId || '',
    messageId: artifact.messageId,
    isProposal: artifact.isProposal ?? artifact.status === 'pending',
    createdAt: artifact.createdAt || new Date().toISOString(),
    updatedAt: artifact.updatedAt || new Date().toISOString(),
    description: artifact.description,
    artifactKey: artifact.artifactKey || artifact.key,
  }
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Cria uma UnifiedMessage a partir de input do usuário
 */
export function createUserMessage(
  content: string,
  _userId?: string
): UnifiedMessage {
  return {
    id: `msg-${Date.now()}-user`,
    content,
    author: 'user',
    timestamp: new Date().toISOString(),
    status: 'sending',
  }
}

/**
 * Cria uma UnifiedMessage de resposta do agente
 */
export function createAgentMessage(
  content: string,
  agentId: string,
  agentName?: string,
  artifacts?: UnifiedArtifact[]
): UnifiedMessage {
  return {
    id: `msg-${Date.now()}-agent`,
    content,
    author: 'agent',
    agentId,
    agentName,
    timestamp: new Date().toISOString(),
    status: 'sent',
    hasActions: artifacts && artifacts.length > 0,
    isProposal: artifacts && artifacts.length > 0,
    artifacts,
  }
}

/**
 * Converte AddMessageInput para UnifiedMessage
 */
export function addMessageInputToUnified(
  input: AddMessageInput
): UnifiedMessage {
  const now = new Date().toISOString()

  return {
    id: `msg-${Date.now()}-${input.author}`,
    content: input.content,
    author: input.author,
    agentId: input.agentId,
    agentName: input.agentName,
    timestamp: now,
    status: 'sent',
    hasActions: input.artifacts && input.artifacts.length > 0,
    isProposal: input.isArtifact,
    artifacts: input.artifacts?.map(partial => ({
      id: partial.id || `artifact-${Date.now()}`,
      baseId: partial.baseId,
      version: partial.version || '1.0.0',
      name: partial.name || 'Artefato',
      title: partial.title || partial.name || 'Artefato',
      content: partial.content || '',
      type: partial.type || 'document',
      category: partial.category || 'pack-demanda',
      status: partial.status || 'pending',
      stage: partial.stage || 'cocreation',
      agentId: partial.agentId,
      initiativeId: partial.initiativeId || '',
      messageId: partial.messageId,
      isProposal: partial.isProposal ?? true,
      createdAt: partial.createdAt || now,
      updatedAt: partial.updatedAt || now,
      description: partial.description,
      artifactKey: partial.artifactKey,
    })),
  }
}

/**
 * Valida se um objeto é uma UnifiedMessage válida
 */
export function isValidUnifiedMessage(obj: unknown): obj is UnifiedMessage {
  if (!obj || typeof obj !== 'object') return false

  const msg = obj as Record<string, unknown>

  return (
    typeof msg.id === 'string' &&
    typeof msg.content === 'string' &&
    (msg.author === 'user' || msg.author === 'agent') &&
    typeof msg.timestamp === 'string'
  )
}

/**
 * Normaliza uma mensagem de qualquer formato para UnifiedMessage
 */
export function normalizeMessage(message: unknown): UnifiedMessage | null {
  if (!message || typeof message !== 'object') return null

  const msg = message as Record<string, unknown>

  // Já é UnifiedMessage
  if (isValidUnifiedMessage(msg)) {
    return msg
  }

  // Formato com 'role' (assistant/user)
  if ('role' in msg && (msg.role === 'user' || msg.role === 'assistant')) {
    return {
      id: (msg.id as string) || `msg-${Date.now()}`,
      content: (msg.content as string) || '',
      author: msg.role === 'user' ? 'user' : 'agent',
      agentId: msg.agentId as string | undefined,
      timestamp:
        msg.timestamp instanceof Date
          ? msg.timestamp.toISOString()
          : (msg.timestamp as string) || new Date().toISOString(),
      status: (msg.status as UnifiedMessage['status']) || 'sent',
    }
  }

  // Formato com 'sender' (PersistedChatMessage)
  if ('sender' in msg && typeof msg.sender === 'object') {
    return persistedToUnifiedMessage(msg as unknown as PersistedChatMessage)
  }

  // Formato com 'author' mas faltando campos
  if ('author' in msg) {
    return {
      id: (msg.id as string) || `msg-${Date.now()}`,
      content: (msg.content as string) || '',
      author: msg.author === 'user' ? 'user' : 'agent',
      agentId: msg.agentId as string | undefined,
      timestamp: (msg.timestamp as string) || new Date().toISOString(),
      status: 'sent',
    }
  }

  return null
}

/**
 * Normaliza array de mensagens de qualquer formato
 */
export function normalizeMessages(messages: unknown[]): UnifiedMessage[] {
  return messages.map(normalizeMessage).filter(Boolean) as UnifiedMessage[]
}
