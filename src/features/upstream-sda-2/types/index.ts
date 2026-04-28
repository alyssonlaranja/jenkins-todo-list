// ============================================================================
// Types for Upstream SDA 2.0
// ============================================================================

// Azure DevOps Process Detection Types
export * from './azure-devops-process.types'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

/** Membro da equipe de um projeto */
export interface ProjectTeamMember {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Owner' | 'Curador' | 'User'
}

export interface Project {
  id: string
  name: string
  /** Slug do projeto no Cockpit (identificador único legível) */
  slug?: string
  createdAt: string
  updatedAt: string
  artifacts: Artifact[]
  conversations: Conversation[]
  /** Equipe do projeto (inclui o criador e membros adicionados) */
  team?: ProjectTeamMember[]
  /** Indica se os detalhes (chats/artifacts) já foram carregados do Cockpit */
  detailsLoaded?: boolean
  /** Contador acumulativo para numerar novas conversas (nunca diminui) */
  conversationCounter?: number
}

export interface Artifact {
  id: string
  projectId: string
  title: string
  type: ArtifactType
  content: string
  agentName: string
  createdAt: string
  updatedAt: string
  version: number
  status: 'draft' | 'approved' | 'archived'
  /** Indica se o artefato foi marcado como versão final pelo usuário */
  finalized?: boolean
  /** Slug do chat onde o artefato foi aprovado (para buscar conteúdo) */
  chatSlug?: string
  /** Tipo do documento no Cockpit (briefing, prd, etc) */
  documentType?: string
  /** Slug do projeto */
  projectSlug?: string
  /** ID do usuário que criou/aprovou o artefato */
  ownerId?: string
  /** Email do usuário que criou o artefato */
  createdBy?: string
  /** Nome do usuário que criou o artefato */
  createdByName?: string
  /** Informações de compartilhamento com membros do time */
  sharedWith?: Array<{
    userId: string
    userName: string
    userEmail: string
    sharedVersion: string
    sharedAt: string
    sharedBy: string
    sharedByName: string
    /** Status da notificação para o destinatário */
    notificationStatus?: 'unread' | 'read' | 'deleted'
    /** Data em que a notificação foi lida (se foi) */
    readAt?: string
  }>
  /** Nome customizado dado pelo usuário (se renomeado) */
  customName?: string
  /** ID do usuário que editou o artefato pela última vez */
  editedBy?: string
  /** Nome do usuário que editou o artefato pela última vez */
  editedByName?: string
  /** Data/hora da última edição manual */
  editedAt?: string
}

export type ArtifactType =
  | 'prd-greenfield'
  | 'prd-brownfield'
  | 'architecture'
  | 'epics'
  | 'frontend-spec'
  | 'brief'
  | 'okrs'
  | 'prompts'
  | 'fragments'

/** Referência a um artefato aceito (sincronizado com Cockpit) */
export interface AcceptedArtifactInfo {
  artifactId: string
  artifactKey: string
  artifactName: string
  artifactType: string
  documentType: string
  version: string
  acceptedAt: string
  /** ID da mensagem de onde o artefato foi aceito */
  sourceMessageId?: string
}

/** Referência a um artefato rejeitado (sincronizado com Cockpit) */
export interface RejectedArtifactInfo {
  artifactId: string
  artifactKey: string
  artifactName: string
  artifactType: string
  documentType: string
  content: string
  rejectedAt: string
  rejectedBy?: string
  rejectedByName?: string
  rejectionReason?: string
}

export interface Conversation {
  id: string
  projectId: string
  title: string
  /** Slug do chat (identificador único legível) */
  slug?: string
  /** Tipo do chat - define o contexto/artefato produzido */
  type?: 'discovery' | 'prd' | 'backlog' | 'ux-design' | 'architecture'
  agentName: string
  agentType: AgentType
  messages: Message[]
  createdAt: string
  updatedAt: string
  /** ID do usuário que criou o chat */
  createdBy?: string
  /** Nome do usuário que criou o chat */
  createdByName?: string
  /** IDs dos artefatos aceitos nesta conversa (sincronizado com Cockpit) */
  acceptedArtifacts?: AcceptedArtifactInfo[]
  /** IDs dos artefatos rejeitados nesta conversa (sincronizado com Cockpit) */
  rejectedArtifacts?: RejectedArtifactInfo[]
}

export type AgentType =
  | 'pm'
  | 'architect'
  | 'po'
  | 'ux'
  | 'analyst'
  | 'supervisor'

/** Informação de arquivo anexado */
export interface MessageAttachment {
  id: string
  name: string
  size: number
  type: string
  artifactKey?: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  agentName?: string
  /** Arquivos anexados à mensagem */
  attachments?: MessageAttachment[]
  /** Indica se a mensagem contém artefato estruturado */
  isArtifact?: boolean
  /** Tipo do artefato detectado (briefing, prd, backlog, etc) */
  artifactType?: string
  /** Indica se o artefato foi aceito/aprovado pelo usuário */
  isAccepted?: boolean
  /** Data de aprovação do artefato */
  acceptedAt?: string
  /** ID do usuário que aprovou */
  acceptedBy?: string
  /** Nome do usuário que aprovou */
  acceptedByName?: string
  /** Indica se o artefato foi rejeitado pelo usuário */
  isRejected?: boolean
  /** Data de rejeição do artefato */
  rejectedAt?: string
  /** ID do usuário que rejeitou */
  rejectedBy?: string
  /** Nome do usuário que rejeitou */
  rejectedByName?: string
  /** Resumo dinâmico do artefato (gerado na aceitação e persistido) */
  artifactSummary?: string[]
}

export interface ArtifactTypeInfo {
  type: ArtifactType
  label: string
  icon: string
  color: string
}

export const ARTIFACT_TYPES: Record<ArtifactType, ArtifactTypeInfo> = {
  'prd-greenfield': {
    type: 'prd-greenfield',
    label: 'PRD (Greenfield)',
    icon: '📋',
    color: 'bg-orange-500',
  },
  'prd-brownfield': {
    type: 'prd-brownfield',
    label: 'PRD (Brownfield)',
    icon: '📋',
    color: 'bg-orange-400',
  },
  architecture: {
    type: 'architecture',
    label: 'Arquitetura full-stack',
    icon: '🏗️',
    color: 'bg-green-500',
  },
  epics: {
    type: 'epics',
    label: 'Épicos',
    icon: '📝',
    color: 'bg-pink-500',
  },
  'frontend-spec': {
    type: 'frontend-spec',
    label: 'Especificação de front-end',
    icon: '🎨',
    color: 'bg-red-500',
  },
  brief: {
    type: 'brief',
    label: 'Documento de Discovery',
    icon: '📄',
    color: 'bg-blue-500',
  },
  okrs: {
    type: 'okrs',
    label: 'OKRs',
    icon: '🎯',
    color: 'bg-purple-500',
  },
  prompts: {
    type: 'prompts',
    label: 'Prompts de pesquisa',
    icon: '🔍',
    color: 'bg-gray-500',
  },
  fragments: {
    type: 'fragments',
    label: 'Fragmentos de PRD',
    icon: '📎',
    color: 'bg-gray-400',
  },
}

export const AGENT_TYPES: Record<AgentType, { label: string; color: string }> =
  {
    pm: { label: 'PM Advisor', color: 'bg-orange-500' },
    architect: { label: 'Arquiteto Advisor', color: 'bg-green-500' },
    po: { label: 'PO Advisor', color: 'bg-pink-500' },
    ux: { label: 'UX Advisor', color: 'bg-red-500' },
    analyst: { label: 'Agente Analista Advisor', color: 'bg-blue-500' },
    supervisor: { label: 'Supervisor', color: 'bg-purple-500' },
  }
