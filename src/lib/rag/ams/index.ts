/**
 * AMS RAG Module - Barrel export
 *
 * 🆕 VERSÃO AMS: Módulos RAG específicos para o AMS Portal
 *
 * Exports:
 * - types: Interfaces AMS-específicas (AMSIndexArtifactRequest, AMSDynamicSearchConfig)
 * - extract-knowledge-config: Extração de config com suporte ao campo instruction
 * - indexing-service: Serviço completo de embeddings, chunking, indexação e busca
 */

export * from './types'
export * from './extract-knowledge-config'
export * from './indexing-service'
