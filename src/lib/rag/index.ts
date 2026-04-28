/**
 * RAG Index Module - Barrel export
 *
 * Exports:
 * - Indexing: indexArtifact, generateEmbedding, chunkDocument
 * - Search: searchKnowledgeBase, formatRAGResultsForPrompt
 * - Config: extractKnowledgeAgentConfig, getSearchConfig
 * - Types: All RAG-related types
 */

export * from './types'
export * from './indexing-service'
export * from './extract-knowledge-config'
