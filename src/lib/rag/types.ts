/**
 * RAG Types - Tipos e interfaces para indexação no Azure AI Search
 *
 * Este módulo define as interfaces para indexação de artefatos e feedback.
 * A BUSCA é feita pelo agente supervisor via tools MCP configuradas no front-matter.
 * Aqui definimos apenas a estrutura para INDEXAÇÃO.
 */

// ============================================================================
// TIPOS DE INDEXAÇÃO
// ============================================================================

/**
 * Tipo de feedback do usuário
 */
export type FeedbackType = 'positive' | 'negative'

/**
 * Tipos de artefatos que podem ser indexados
 */
export type ArtifactType =
  | 'briefing'
  | 'prd'
  | 'architecture'
  | 'backlog'
  | 'design'
  | 'document'

// ============================================================================
// REQUEST INTERFACES
// ============================================================================

/**
 * Request para indexar um artefato aceito/rejeitado
 */
export interface IndexArtifactRequest {
  /** ID único do artefato */
  artifactId: string
  /** ID do projeto */
  projectId: string
  /** Slug do projeto */
  projectSlug: string
  /** Slug do chat onde foi gerado */
  chatSlug: string
  /** Título do artefato */
  title: string
  /** Tipo do artefato (briefing, prd, architecture, backlog, design) */
  artifactType: ArtifactType
  /** Conteúdo completo do artefato */
  content: string
  /** Query/prompt do usuário que originou o artefato */
  userQuery?: string
  /** Nome do agente que gerou */
  agentName: string
  /** Tipo de feedback: positive (aceito) ou negative (rejeitado) */
  feedbackType: FeedbackType
  /** ID do usuário que aceitou/rejeitou */
  userId?: string
  /** Nome do usuário */
  userName?: string
  /** Motivo da rejeição (apenas para feedback negativo) */
  rejectionReason?: string
  /** Tags adicionais para categorização */
  tags?: string[]
}

/**
 * Request para indexar feedback de mensagem (não-artefato)
 */
export interface IndexFeedbackRequest {
  /** ID da mensagem */
  messageId: string
  /** Conteúdo da mensagem */
  content: string
  /** positive (like) ou negative (dislike) */
  feedbackType: FeedbackType
  /** Query/prompt do usuário */
  userQuery: string
  /** Nome do agente que respondeu */
  agentName?: string
  /** ID do projeto */
  projectId?: string
  /** Slug do projeto */
  projectSlug?: string
  /** Slug do chat */
  chatSlug?: string
  /** ID do usuário */
  userId?: string
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

/**
 * Resposta da API de indexação
 */
export interface IndexResponse {
  success: boolean
  /** ID do documento indexado */
  documentId?: string
  /** Número de chunks indexados (para documentos grandes) */
  chunkCount?: number
  /** Mensagem de erro, se houver */
  error?: string
  /** Timestamp da indexação */
  indexedAt?: string
}

// ============================================================================
// DOCUMENT SCHEMA (Azure AI Search)
// ============================================================================

/**
 * Schema do documento no Azure AI Search (índice: cockpit-knowledge)
 *
 * Este é o formato do documento que será indexado no Azure AI Search.
 * O índice deve ser criado no Azure Portal com estes campos.
 */
export interface KnowledgeDocument {
  /** ID único do documento (chave primária) */
  id: string
  /** ID do artefato original */
  artifactId: string
  /** ID do projeto */
  projectId: string
  /** Slug do projeto (para filtros) */
  projectSlug: string
  /** Slug do chat (para filtros) */
  chatSlug: string
  /** Título do artefato */
  title: string
  /** Tipo do artefato */
  artifactType: string
  /** Conteúdo do chunk */
  content: string
  /** Índice do chunk (0 para documento único) */
  chunkIndex: number
  /** Total de chunks do documento */
  totalChunks: number
  /** Contexto do header (para chunks) */
  headerContext?: string
  /** Query do usuário que originou */
  userQuery?: string
  /** Nome do agente */
  agentName: string
  /** Tipo de feedback: positive ou negative */
  feedbackType: string
  /** ID do usuário */
  userId?: string
  /** Nome do usuário */
  userName?: string
  /** Motivo da rejeição */
  rejectionReason?: string
  /** Tags para categorização */
  tags: string[]
  /** Timestamp de criação */
  createdAt: string
  /** Vetor de embedding (1536 dimensões para text-embedding-3-small) */
  contentVector?: number[]
}

/**
 * Configuração do Azure AI Search
 *
 * Pode vir de variáveis de ambiente OU dinamicamente do agente SDA 2 Knowledge
 */
export interface AzureSearchConfig {
  /** Endpoint do Azure AI Search (ex: https://xxx.search.windows.net) */
  endpoint: string
  /** Chave de API admin */
  apiKey: string
  /** Nome do índice para conhecimento/artefatos */
  knowledgeIndexName: string
}

/**
 * Configuração dinâmica extraída do agente SDA 2 Knowledge
 * Variáveis são parseadas do campo role/specialty do agente
 */
export interface DynamicSearchConfig {
  /** Endpoint do Azure AI Search */
  azure_search_endpoint: string
  /** Nome do índice */
  index_name: string
  /** Chave de API */
  azure_search_key: string
}

/**
 * Request de indexação com config dinâmica opcional
 */
export interface IndexArtifactWithConfigRequest extends IndexArtifactRequest {
  /** Configuração dinâmica do Azure Search (extraída do agente Knowledge) */
  searchConfig?: DynamicSearchConfig
}

/**
 * Configuração do Azure OpenAI para embeddings
 */
export interface AzureOpenAIConfig {
  /** Endpoint do Azure OpenAI */
  endpoint: string
  /** Chave de API */
  apiKey: string
  /** Nome do deployment de embeddings */
  embeddingDeployment: string
}
