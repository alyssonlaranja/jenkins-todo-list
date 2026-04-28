/**
 * Unified Chat Types
 *
 * Tipos centralizados para chat e mensagens usados em toda a aplicação.
 * Este arquivo é a ÚNICA fonte de verdade para tipos de chat.
 *
 * IMPORTANTE: Não criar tipos de mensagem em outros arquivos!
 * Sempre importar daqui.
 */

// ============================================================================
// ENUMS - Valores padronizados
// ============================================================================

/**
 * Tipo de autor da mensagem
 * Padronizado como 'user' | 'agent' em toda aplicação
 */
export type MessageAuthorType = 'user' | 'agent'

/**
 * Status de envio da mensagem
 */
export type MessageStatus = 'sending' | 'sent' | 'error'

/**
 * Status de aprovação de artefatos
 */
export type ArtifactStatus = 'pending' | 'approved' | 'rejected'

/**
 * Tipos de artefatos suportados
 */
export type ArtifactType =
  | 'briefing'
  | 'prd'
  | 'backlog'
  | 'architecture'
  | 'design'
  | 'feasibility'
  | 'requirements'
  | 'document'
  | 'user-story'
  | 'epic'
  | 'diagram'
  | 'config'

/**
 * Categorias de artefatos
 */
export type ArtifactCategory =
  | 'documento-briefing'
  | 'mapa-stakeholders'
  | 'personas'
  | 'requisitos-negocio'
  | 'user-stories'
  | 'criterios-aceitacao'
  | 'backlog-produto'
  | 'documento-tecnico'
  | 'especificacao-tecnica'
  | 'mapa-jornada-usuario'
  | 'arquitetura-alto-nivel'
  | 'prd-documento'

/**
 * Estágios do workflow SDA
 */
export type WorkflowStage = 'cocreation' | 'validation' | 'sincronizacao'

// ============================================================================
// INTERFACES - Artefatos
// ============================================================================

/**
 * Artefato unificado - usado em mensagens e persistência
 */
export interface UnifiedArtifact {
  /** ID único do artefato */
  id: string
  /** ID base (para versionamento) */
  baseId?: string
  /** Versão do artefato */
  version: string
  /** Nome do artefato */
  name: string
  /** Título para exibição */
  title: string
  /** Conteúdo do artefato */
  content: string
  /** Tipo do artefato */
  type: ArtifactType
  /** Categoria do artefato */
  category: ArtifactCategory
  /** Status de aprovação */
  status: ArtifactStatus
  /** Estágio atual */
  stage: WorkflowStage
  /** ID do agente que gerou */
  agentId?: string
  /** ID da iniciativa */
  initiativeId: string
  /** ID da mensagem associada */
  messageId?: string
  /** Se é uma proposta */
  isProposal: boolean
  /** Data de criação */
  createdAt: string
  /** Data de atualização */
  updatedAt: string
  /** Descrição opcional */
  description?: string
  /** Key do artefato na API */
  artifactKey?: string
}

// ============================================================================
// INTERFACES - Mensagens
// ============================================================================

/**
 * Mensagem unificada - usada em todo o sistema
 *
 * Esta é a interface principal de mensagem.
 * Todos os componentes e serviços devem usar este tipo.
 */
export interface UnifiedMessage {
  /** ID único da mensagem */
  id: string
  /** Conteúdo da mensagem */
  content: string
  /** Autor: 'user' ou 'agent' */
  author: MessageAuthorType
  /** ID do agente (quando author === 'agent') */
  agentId?: string
  /** Nome do agente para exibição */
  agentName?: string
  /** Timestamp ISO 8601 */
  timestamp: string
  /** Status de envio */
  status?: MessageStatus
  /** Se a mensagem tem ações disponíveis */
  hasActions?: boolean
  /** Se é uma proposta de artefato */
  isProposal?: boolean
  /** Artefatos associados à mensagem */
  artifacts?: UnifiedArtifact[]
  /** Ações de proposta */
  proposalActions?: {
    onAccept?: () => void
    onReject?: () => void
    onModify?: () => void
  }
}

/**
 * Dados do remetente (compatibilidade com API legada)
 */
export interface MessageSenderData {
  type: MessageAuthorType
  id: string
  name: string
}

/**
 * Dados de artefato na mensagem (compatibilidade com API)
 */
export interface MessageArtifactInfo {
  artifactId: string
  artifactKey: string
  artifactName: string
  artifactType: string
  artifactCategory?: string // Categoria do artefato (ex: 'arquitetura-alto-nivel')
  version: string
  status: ArtifactStatus
  approvedAt: string | null
  approvedBy: string | null
  approvedByName: string | null
  rejectionReason: string | null
}

/**
 * Mensagem no formato de persistência (API Cockpit)
 * Usado apenas internamente nos serviços de persistência
 */
export interface PersistedChatMessage {
  id: string
  timestamp: string
  sender: MessageSenderData
  content: string
  isArtifact: boolean
  artifactData: MessageArtifactInfo | null
}

// ============================================================================
// INTERFACES - Histórico
// ============================================================================

/**
 * Histórico de chat unificado
 */
export interface UnifiedChatHistory {
  initiativeId: string
  initiativeName: string
  initiativeSlug: string
  createdAt: string
  updatedAt: string
  totalMessages: number
  messages: UnifiedMessage[]
}

/**
 * Histórico no formato de persistência
 */
export interface PersistedChatHistory {
  initiativeId: string
  initiativeName: string
  initiativeSlug: string
  createdAt: string
  updatedAt: string
  totalMessages: number
  messages: PersistedChatMessage[]
}

// ============================================================================
// INTERFACES - Agentes
// ============================================================================

/**
 * Agente unificado
 */
export interface UnifiedAgent {
  id: string
  name: string
  role: string
  type?: string
  description?: string
  avatar?: string
  icon?: string
  color: string
  status: 'online' | 'offline' | 'busy' | 'active'
  capabilities?: string[]
  specializations?: string[]
}

// ============================================================================
// INTERFACES - Sessão de Chat
// ============================================================================

/**
 * Sessão de chat
 */
export interface ChatSession {
  id: string
  title: string
  messages: UnifiedMessage[]
  activeAgent?: string
  createdAt: string
  updatedAt: string
}

// ============================================================================
// INTERFACES - DTOs para operações
// ============================================================================

/**
 * DTO para adicionar mensagem
 */
export interface AddMessageInput {
  content: string
  author: MessageAuthorType
  agentId?: string
  agentName?: string
  isArtifact?: boolean
  artifacts?: Partial<UnifiedArtifact>[]
}

/**
 * Resultado de operação
 */
export interface OperationResult<T = void> {
  success: boolean
  data?: T
  error?: string
}
