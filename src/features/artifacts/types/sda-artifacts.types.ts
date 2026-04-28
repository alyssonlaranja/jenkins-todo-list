/**
 * SDA Initiative Types
 *
 * Tipos TypeScript para o sistema de persistência de iniciativas do SDA
 * Baseado na arquitetura documentada em docs/sda-artifacts-architecture.md
 */

// ============================================================================
// ENUMS
// ============================================================================

/** Status da iniciativa */
export enum InitiativeStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  VALIDATION = 'validation',
  COMPLETED = 'completed',
}

/** Status do projeto (nova estrutura) */
export enum ProjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  COMPLETED = 'completed',
}

/** Status do chat (nova estrutura) */
export enum ChatStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  COMPLETED = 'completed',
}

/**
 * Tipo do chat - define o contexto/tipo de artefato que o chat produz
 * Chats sem tipo identificado devem usar 'discovery' como padrão
 */
export type ChatType =
  | 'discovery'
  | 'prd'
  | 'backlog'
  | 'ux-design'
  | 'architecture'

/** Tipo de remetente da mensagem */
export enum SenderType {
  USER = 'user',
  AGENT = 'agent',
}

/** Status do artefato */
export enum ArtifactApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** Tipos de atividades rastreadas na iniciativa */
export enum ActivityType {
  CREATE_INITIATIVE = 'create_initiative',
  APPROVE_ARTIFACT = 'approve_artifact',
  PROMOTE_VERSION = 'promote_version',
  ADVANCE_STAGE = 'advance_stage',
  REJECT_ARTIFACT = 'reject_artifact',
  UPLOAD_FILE = 'upload_file',
}

/** Tipos de artefatos válidos da API Cockpit */
export enum SDArtifactType {
  JSON = 'JSON', // Para qualquer dado estruturado (iniciativas, histórico, etc.)
  STRING = 'string', // Para texto simples
  MCP_CLIENT = 'MCPClient', // Para configurações MCP
  CHAT_CONTEXT = 'CHAT_CONTEXT', // Para contexto de chat
}

/**
 * Tipos semânticos para uso interno - todos mapeiam para JSON na API
 * Use SDArtifactType.JSON ao criar artefatos na API
 */
export type SemanticArtifactType =
  | 'initiative' // Metadados da iniciativa
  | 'history' // Histórico de chat
  | 'prd' // Product Requirements Document
  | 'architecture' // Documentação de arquitetura
  | 'user_story' // User stories
  | 'epic' // Epics
  | 'document' // Documentos gerais
  | 'diagram' // Diagramas
  | 'config' // Configurações
/**
 * Tipos de documentos do SDA
 * Usado para identificar o tipo do artefato gerado pelo agente
 */
export type SDADocumentType =
  | 'briefing'
  | 'brief'
  | 'prd'
  | 'backlog'
  | 'architecture'
  | 'document'
  | 'user-story'
  | 'epic'
  | 'design'
  | 'requirements'
  | 'stakeholder-map'
  | 'personas'
// ============================================================================
// INITIATIVE TYPES
// ============================================================================

/** Metadados da iniciativa */
export interface InitiativeMetadata {
  totalMessages: number
  totalArtifacts: number
  approvedArtifacts: number
}

/** Status da notificação de compartilhamento */
export type NotificationStatus = 'unread' | 'read' | 'deleted'

/** Informação de compartilhamento de artefato */
export interface SharedWithInfo {
  userId: string
  userName: string
  userEmail: string
  /** Versão do artefato compartilhada */
  sharedVersion: string
  /** Data do compartilhamento */
  sharedAt: string
  /** Quem compartilhou */
  sharedBy: string
  sharedByName: string
  /** Status da notificação para o destinatário */
  notificationStatus?: NotificationStatus
  /** Data em que a notificação foi lida (se foi) */
  readAt?: string
}

/** Referência a um artefato aprovado */
export interface ApprovedArtifactRef {
  artifactId: string
  artifactKey: string
  artifactName: string
  artifactType: string
  version: string
  approvedAt: string
  approvedBy: string
  approvedByName: string
  /** Tipo do documento (prd, briefing, etc.) - Nova estrutura */
  documentType?: string
  /** ID do chat de origem - Nova estrutura */
  chatId?: string
  /** Slug do chat de origem - Nova estrutura */
  chatSlug?: string
  /** ID do usuário dono do artefato (quem criou/aprovou) */
  ownerId?: string
  /** Lista de usuários com quem o artefato foi compartilhado */
  sharedWith?: SharedWithInfo[]
  /** Nome customizado dado pelo usuário (se renomeado) */
  customName?: string
  /** Status do artefato aprovado (undefined ou 'active' = ativo, 'inactive' = excluído/desativado) */
  status?: 'active' | 'inactive'
  /** Indica se o artefato foi marcado como versão final pelo usuário */
  finalized?: boolean
}

// ============================================================================
// PROJECT TYPES (Nova Estrutura)
// ============================================================================

/** Referência a um chat dentro do projeto */
export interface ChatRef {
  chatId: string
  chatSlug: string
  chatName: string
  createdAt: string
  /** Tipo do chat (default: 'discovery') */
  type?: ChatType
  /** ID do usuário que criou o chat */
  createdBy?: string
  /** Nome do usuário que criou o chat */
  createdByName?: string
  /** Status do chat (undefined ou 'active' = ativo, 'inactive' = excluído/desativado) */
  status?: 'active' | 'inactive'
}

/** Membro da equipe de um projeto */
export interface ProjectTeamMemberDto {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Owner' | 'Curador' | 'User'
}

/** Metadados do projeto */
export interface ProjectMetadata {
  totalChats: number
  totalArtifacts: number
  approvedArtifacts: number
}

/** DTO do Projeto - armazenado em project-{slug} */
export interface ProjectDto {
  id: string
  name: string
  slug: string
  description: string
  createdAt: string
  updatedAt: string
  createdBy: string
  createdByName: string
  status: ProjectStatus
  /** Lista de chats associados ao projeto */
  chats: ChatRef[]
  /** Artefatos aprovados (agregado de todos os chats) */
  approvedArtifacts: ApprovedArtifactRef[]
  metadata: ProjectMetadata
  tags: string[]
  /** Equipe do projeto (criador + membros convidados) */
  team?: ProjectTeamMemberDto[]
}

/** DTO para criação de projeto */
export interface ProjectCreateDto {
  name: string
  description: string
  tags?: string[]
  /** Equipe do projeto */
  team?: ProjectTeamMemberDto[]
}

/** DTO para atualização de projeto */
export interface ProjectUpdateDto {
  id: string
  name?: string
  description?: string
  status?: ProjectStatus
  tags?: string[]
}

// ============================================================================
// CHAT TYPES (Nova Estrutura)
// ============================================================================

/** Metadados do chat */
export interface ChatMetadata {
  totalMessages: number
  totalArtifacts: number
  acceptedArtifacts: number
  lastMessageAt: string | null
}

/** Referência a um artefato aceito no chat */
export interface AcceptedArtifactRef {
  artifactId: string
  artifactKey: string
  artifactName: string
  artifactType: string
  documentType: SDADocumentType | string
  version: string
  acceptedAt: string
  acceptedBy: string
  acceptedByName: string
  /** Lista de usuários com quem o artefato foi compartilhado */
  sharedWith?: SharedWithInfo[]
  /** Slug do chat para facilitar navegação */
  chatSlug?: string
  /** Nome customizado dado pelo usuário (se renomeado) */
  customName?: string
  /** Indica se o artefato foi marcado como versão final pelo usuário */
  finalized?: boolean
}

/** Referência a um artefato rejeitado no chat */
export interface RejectedArtifactRef {
  artifactId: string
  artifactKey: string
  artifactName: string
  artifactType: string
  documentType: SDADocumentType | string
  content: string
  rejectedAt: string
  rejectedBy: string
  rejectedByName: string
  rejectionReason?: string
}

/** DTO do Chat - armazenado em chat-{projectSlug}-{chatSlug} */
export interface ChatDto {
  id: string
  name: string
  slug: string
  description: string
  /** Tipo do chat - define o contexto/artefato produzido (default: 'discovery') */
  type: ChatType
  /** ID do projeto pai */
  projectId: string
  /** Slug do projeto pai */
  projectSlug: string
  createdAt: string
  updatedAt: string
  createdBy: string
  createdByName: string
  status: ChatStatus
  /** Key do artefato de histórico */
  historyArtifactKey: string
  /** Artefatos aceitos neste chat */
  acceptedArtifacts: AcceptedArtifactRef[]
  /** Artefatos rejeitados neste chat */
  rejectedArtifacts: RejectedArtifactRef[]
  metadata: ChatMetadata
  tags: string[]
}

/** DTO para criação de chat */
export interface ChatCreateDto {
  name: string
  description: string
  projectId: string
  projectSlug: string
  /** Pre-generated immutable slug. If omitted, one will be auto-generated from name + unique suffix */
  slug?: string
  /** Tipo do chat (default: 'discovery' se não informado) */
  type?: ChatType
  tags?: string[]
}

/** DTO para atualização de chat */
export interface ChatUpdateDto {
  id: string
  name?: string
  description?: string
  status?: ChatStatus
  tags?: string[]
}

// ============================================================================
// DOCUMENT TYPES (Nova Estrutura)
// ============================================================================

/** Status do documento */
export enum DocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INACTIVE = 'inactive',
}

/** DTO do Documento - armazenado em document-{type}-{projectSlug}-{chatSlug} */
export interface DocumentDto {
  id: string
  /** ID do projeto */
  projectId: string
  /** Slug do projeto */
  projectSlug: string
  /** ID do chat de origem */
  chatId: string
  /** Slug do chat de origem */
  chatSlug: string
  /** Tipo do documento (briefing, prd, etc.) */
  documentType: SDADocumentType
  /** Nome do documento */
  documentName: string
  /** Conteúdo do documento */
  content: string
  /** Versão do documento */
  version: string
  /** Se tem versão oficial aprovada */
  hasOfficialVersion: boolean
  /** Status do documento */
  status: DocumentStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  createdByName: string
  /** Quando foi aprovado */
  approvedAt: string | null
  /** Quem aprovou */
  approvedBy: string | null
  approvedByName: string | null
  /** Informações de compartilhamento com membros do time */
  sharedWith?: SharedWithInfo[]
  /** Nome customizado dado pelo usuário (se renomeado) */
  customName?: string
  /** Indica se o artefato foi marcado como versão final pelo usuário */
  finalized?: boolean
}

/** DTO para criação de documento */
export interface DocumentCreateDto {
  projectId: string
  projectSlug: string
  chatId: string
  chatSlug: string
  documentType: SDADocumentType
  documentName: string
  content: string
  version?: string
  tags?: string[]
}

/** Marco alcançado na iniciativa */
export interface InitiativeMilestone {
  stage: number
  stageName: string
  progress: number
  achievedAt: string
  achievedBy: string
  achievedByName: string
}

/** Registro de atividade do usuário */
export interface ActivityRecord {
  id: string
  type: ActivityType
  description: string
  timestamp: string
  userId: string
  userName: string
  metadata?: Record<string, unknown>
}

/** Referência a um arquivo de upload convertido em artefato */
export interface UploadedFileRef {
  /** ID do artefato criado para o arquivo */
  artifactId: string
  /** Key do artefato (upload-{initiativeSlug}-{filename}) */
  artifactKey: string
  /** Nome original do arquivo */
  originalFileName: string
  /** Tipo MIME do arquivo */
  mimeType: string
  /** Tamanho do arquivo em bytes */
  fileSize: number
  /** Timestamp do upload */
  uploadedAt: string
  /** ID do usuário que fez upload */
  uploadedBy: string
  /** Nome do usuário que fez upload */
  uploadedByName: string
  /** Origem do upload: modal de criação ou clip da co-criação */
  uploadSource: 'modal' | 'workspace'
}

/** DTO da Iniciativa - armazenado em initiative/{slug} */
export interface InitiativeDto {
  id: string
  name: string
  slug: string
  description: string
  createdAt: string
  updatedAt: string
  createdBy: string
  createdByName: string
  status: InitiativeStatus
  currentStage: number
  metadata: InitiativeMetadata
  approvedArtifacts: ApprovedArtifactRef[]
  tags: string[]
  /** Percentual de progresso (0-100) */
  progress: number
  /** Marcos alcançados com timestamps */
  milestones: InitiativeMilestone[]
  /** Atividades recentes do usuário (máximo 8) */
  recentActivities: ActivityRecord[]
  /** Arquivos de upload convertidos em artefatos */
  uploadedFiles?: UploadedFileRef[]
}

/** DTO para criação de iniciativa */
export interface InitiativeCreateDto {
  name: string
  description: string
  tags?: string[]
}

/** DTO para atualização de iniciativa */
export interface InitiativeUpdateDto {
  id: string
  name?: string
  description?: string
  status?: InitiativeStatus
  currentStage?: number
  tags?: string[]
}

// ============================================================================
// CHAT HISTORY TYPES
// ============================================================================
// ⚠️ DEPRECATED: Esses tipos são mantidos para retrocompatibilidade.
// Novos desenvolvimentos devem usar os tipos de @/shared/types:
// - UnifiedMessage
// - UnifiedChatHistory
// - PersistedChatMessage
// - AddMessageInput
// ============================================================================

/**
 * Remetente da mensagem
 * @deprecated Use MessageSenderData de @/shared/types
 */
export interface MessageSender {
  type: SenderType
  id: string
  name: string
}

/**
 * Dados do artefato na mensagem
 * @deprecated Use MessageArtifactInfo de @/shared/types
 */
export interface MessageArtifactData {
  artifactId: string
  artifactKey: string
  artifactName: string
  artifactType: string
  version: string
  status: ArtifactApprovalStatus
  approvedAt: string | null
  approvedBy: string | null
  approvedByName: string | null
  rejectionReason: string | null
}

/**
 * Mensagem do chat
 * @deprecated Use UnifiedMessage de @/shared/types
 */
export interface ChatMessage {
  id: string
  timestamp: string
  sender: MessageSender
  content: string
  isArtifact: boolean
  artifactData: MessageArtifactData | null
}

/**
 * DTO do Histórico de Chat - armazenado em history/{slug}
 * @deprecated Use UnifiedChatHistory de @/shared/types
 */
export interface ChatHistoryDto {
  initiativeId: string
  initiativeName: string
  initiativeSlug: string
  createdAt: string
  updatedAt: string
  totalMessages: number
  messages: ChatMessage[]
}

/**
 * DTO para adicionar mensagem ao histórico
 * @deprecated Use AddMessageInput de @/shared/types
 */
export interface AddMessageDto {
  sender: MessageSender
  content: string
  isArtifact: boolean
  timestamp?: string // Opcional - se não fornecido, usa data atual
  artifactData?: Omit<
    MessageArtifactData,
    | 'status'
    | 'approvedAt'
    | 'approvedBy'
    | 'approvedByName'
    | 'rejectionReason'
  > & {
    status?: ArtifactApprovalStatus
  }
}

// ============================================================================
// ARTIFACT TYPES (SDA-specific)
// ============================================================================

/** Versão do artefato SDA */
export interface SDArtifactVersion {
  version: string
  createdAt: string
  createdBy: string
  createdByName: string
  isProduction: boolean
  changelog: string
}

/** Metadados do artefato SDA */
export interface SDArtifactMetadata {
  generatedBy: string
  generatedByName: string
  sourceMessageId: string
}

/** DTO do Artefato SDA - armazenado em document-{initiative}-{name} */
export interface SDArtifactDto {
  id: string
  key: string
  name: string
  description: string
  type: SDArtifactType
  initiativeId: string
  initiativeSlug: string
  content: string
  contentType: 'markdown' | 'json' | 'yaml' | 'text'
  version: string
  hasOfficialVersion: boolean
  versionHistory: SDArtifactVersion[]
  status: ArtifactApprovalStatus
  approvedAt: string | null
  approvedBy: string | null
  approvedByName: string | null
  metadata: SDArtifactMetadata
  tags: string[]
  createdAt: string
  updatedAt: string
}

/** DTO para criação de artefato SDA */
export interface SDArtifactCreateDto {
  name: string
  description: string
  type: SDArtifactType
  initiativeSlug: string
  content: string
  contentType: 'markdown' | 'json' | 'yaml' | 'text'
  metadata: SDArtifactMetadata
  tags?: string[]
}

/** DTO para aprovação de artefato */
export interface ApproveArtifactDto {
  artifactKey: string
  version?: string
  changelog?: string
}

/** DTO para rejeição de artefato */
export interface RejectArtifactDto {
  artifactKey: string
  reason: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Configuração do serviço SDA */
export interface SDAServiceConfig {
  baseUrl: string
  accessToken: string
  licenseId: string
  namespaceId: string
  userId: string
  userName: string
  userEmail: string
}

/** Resposta de operação */
export interface OperationResult<T = void> {
  success: boolean
  data?: T
  error?: string
}
