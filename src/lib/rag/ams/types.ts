/**
 * AMS RAG Types - Extensão dos tipos RAG com suporte a campos opcionais
 *
 * Este módulo estende os tipos base do SDA2 com campos adicionais específicos do AMS.
 * NÃO modifica os arquivos do SDA2 - mantém compatibilidade total.
 */

import type { ArtifactType, FeedbackType } from '../types'

// Re-exportar tipos base do SDA2 que não foram modificados
export type { FeedbackType, ArtifactType, IndexResponse } from '../types'

/**
 * Interface AMS-específica para indexação de artefatos
 * Usa ticketId/ticketSlug em vez de projectId/projectSlug
 */
export interface AMSIndexArtifactRequest {
  /** ID único do artefato */
  artifactId: string
  /** ID do ticket */
  ticketId: string
  /** Slug do ticket */
  ticketSlug: string
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
 * Configuração dinâmica AMS (simplificada)
 * Variáveis são parseadas do campo instruction/role/specialty do agente AMS Knowledge
 *
 * CAMPOS EXTRAÍDOS DA INSTRUÇÃO:
 * - azure_search_endpoint (obrigatório)
 * - index_name (obrigatório)
 * - azure_search_key (obrigatório)
 * - search_type (obrigatório: 'semantic' | 'keyword')
 * - semantic_configuration_name (obrigatório para semantic search)
 *
 * DIFERENÇAS vs SDA2 DynamicSearchConfig:
 * - Busca em instruction (artifacts resolvidos) além de role/specialty
 * - Foco em semantic/keyword search (sem necessidade de Azure OpenAI)
 */
export interface AMSDynamicSearchConfig {
  /** Endpoint do Azure AI Search */
  azure_search_endpoint: string
  /** Nome do índice */
  index_name: string
  /** Chave de API do Azure Search */
  azure_search_key: string
  /** Valor padrão de topK definido no artefato do agente */
  k?: number
  /** Tipo de busca: 'semantic' (reranking L2) ou 'keyword' (BM25) */
  search_type: 'semantic' | 'keyword'
  /** Nome da configuração semântica do índice (obrigatório para semantic) */
  semantic_configuration_name?: string
}
