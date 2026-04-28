/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

'use client'

import { useCallback, useState } from 'react'

import type {
  BlueprintSearchResult,
  FindSimilarAgentsRequest,
  SearchAgentResult,
  SearchAgentsByBlueprintRequest,
  SearchAgentsByInstructionRequest,
  SemanticArtifactResult,
  SemanticSearchArtifactsRequest,
} from '@/shared/lib/mcp/types'

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

export interface UseAgentSearchOptions {
  /**
   * Function to call MCP tools (from useProxyMCP)
   */
  callTool: (name: string, params: any) => Promise<any>

  /**
   * Auto-parse response
   * @default true
   */
  autoParse?: boolean
}

export interface UseAgentSearchReturn {
  // Search functions
  searchByInstruction: (
    params: SearchAgentsByInstructionRequest
  ) => Promise<SearchAgentResult[]>

  findSimilar: (
    params: FindSimilarAgentsRequest
  ) => Promise<SearchAgentResult[]>

  searchByBlueprint: (
    params: SearchAgentsByBlueprintRequest
  ) => Promise<BlueprintSearchResult[]>

  searchArtifacts: (
    params: SemanticSearchArtifactsRequest
  ) => Promise<SemanticArtifactResult[]>

  // State
  searchResults: SearchAgentResult[] | BlueprintSearchResult[]
  artifactResults: SemanticArtifactResult[]
  isSearching: boolean
  error: string | null
  totalSearched: number

  // Utilities
  clearResults: () => void
}

/**
 * useAgentSearch - Semantic Search Hook for Utility Agents
 *
 * Provides semantic search capabilities using MCP v2.0 tools:
 * - search_agents_by_instruction: Search by instruction text
 * - find_similar_agents: Find similar agents to a reference
 * - search_agents_by_blueprint: Deep search with complete context (NEXT-GEN)
 * - semantic_search_artifacts: Search artifacts semantically
 *
 * @example
 * ```tsx
 * const { searchByBlueprint, searchResults, isSearching } = useAgentSearch()
 *
 * const results = await searchByBlueprint({
 *   query: 'agents using gpt-4 that connect to Azure DevOps',
 *   top_k: 10,
 *   min_similarity: 0.5
 * })
 * ```
 */

export function useAgentSearch({
  callTool,
  autoParse = true,
}: UseAgentSearchOptions): UseAgentSearchReturn {
  const [searchResults, setSearchResults] = useState<
    SearchAgentResult[] | BlueprintSearchResult[]
  >([])
  const [artifactResults, setArtifactResults] = useState<
    SemanticArtifactResult[]
  >([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalSearched, setTotalSearched] = useState(0)

  /**
   * Parse MCP response with nested structure
   */
  const parseMCPResponse = useCallback((result: any): any => {
    if (result.content?.[0]?.text) {
      try {
        const parsed = JSON.parse(result.content[0].text)
        // MCP v2.0: always uses 'success'
        if (parsed.success) {
          return parsed
        }
        throw new Error(parsed.error || 'Search failed')
      } catch (parseError) {
        console.error('[useAgentSearch] Parse error:', parseError)
        throw parseError
      }
    }

    // Direct response format
    if (result.success) {
      return result
    }

    throw new Error(result.error || 'Search failed')
  }, [])

  /**
   * Search agents by instruction text
   * Fast search (~1-2s for 50 agents)
   */
  const searchByInstruction = useCallback(
    async (
      params: SearchAgentsByInstructionRequest
    ): Promise<SearchAgentResult[]> => {
      setIsSearching(true)
      setError(null)

      try {
        console.log('[useAgentSearch] Searching by instruction:', params.query)

        const result = await callTool('search_agents_by_instruction', params)
        const parsed = autoParse ? parseMCPResponse(result) : result

        const matched = parsed.matched_agents || []
        const total = parsed.total_searched || 0

        console.log(
          `[useAgentSearch] Found ${matched.length} agents (searched ${total})`
        )

        setSearchResults(matched)
        setTotalSearched(total)

        return matched
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Search by instruction failed'
        console.error('[useAgentSearch] Error:', errorMsg)
        setError(errorMsg)
        setSearchResults([])
        return []
      } finally {
        setIsSearching(false)
      }
    },
    [callTool, autoParse, parseMCPResponse]
  )

  /**
   * Find agents similar to a reference agent
   * Fast search (~1-2s for 50 agents)
   */
  const findSimilar = useCallback(
    async (params: FindSimilarAgentsRequest): Promise<SearchAgentResult[]> => {
      setIsSearching(true)
      setError(null)

      try {
        console.log('[useAgentSearch] Finding similar agents:', params.agent_id)

        const result = await callTool('find_similar_agents', params)
        const parsed = autoParse ? parseMCPResponse(result) : result

        const similar = parsed.similar_agents || []
        const total = parsed.total_compared || 0

        console.log(
          `[useAgentSearch] Found ${similar.length} similar agents (compared ${total})`
        )

        setSearchResults(similar)
        setTotalSearched(total)

        return similar
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Find similar agents failed'
        console.error('[useAgentSearch] Error:', errorMsg)
        setError(errorMsg)
        setSearchResults([])
        return []
      } finally {
        setIsSearching(false)
      }
    },
    [callTool, autoParse, parseMCPResponse]
  )

  /**
   * Search agents by blueprint (NEXT-GEN)
   * Deep search with complete context (~3-5s for 50 agents)
   *
   * Searches:
   * - Model configuration
   * - Artifact dependencies
   * - MCP connections
   * - Team relationships
   * - Front matter configuration
   * - Instruction content
   */
  const searchByBlueprint = useCallback(
    async (
      params: SearchAgentsByBlueprintRequest
    ): Promise<BlueprintSearchResult[]> => {
      setIsSearching(true)
      setError(null)

      try {
        console.log('[useAgentSearch] Searching by blueprint:', params.query)

        const result = await callTool('search_agents_by_blueprint', params)
        const parsed = autoParse ? parseMCPResponse(result) : result

        const matched = parsed.matched_agents || []
        const total = parsed.total_searched || 0
        const searchType = parsed.search_type || 'rich_blueprint'

        console.log(
          `[useAgentSearch] Found ${matched.length} agents via ${searchType} (searched ${total})`
        )

        // Log tips if available
        if (parsed.tips && parsed.tips.length > 0) {
          console.log('[useAgentSearch] Tips:')
          parsed.tips.forEach((tip: string) => console.log(`  ${tip}`))
        }

        setSearchResults(matched)
        setTotalSearched(total)

        return matched
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Search by blueprint failed'
        console.error('[useAgentSearch] Error:', errorMsg)
        setError(errorMsg)
        setSearchResults([])
        return []
      } finally {
        setIsSearching(false)
      }
    },
    [callTool, autoParse, parseMCPResponse]
  )

  /**
   * Search artifacts semantically
   * Fast search (~2s for 1000 artifacts)
   */
  const searchArtifacts = useCallback(
    async (
      params: SemanticSearchArtifactsRequest
    ): Promise<SemanticArtifactResult[]> => {
      setIsSearching(true)
      setError(null)

      try {
        console.log('[useAgentSearch] Searching artifacts:', params.query)

        const result = await callTool('semantic_search_artifacts', params)
        const parsed = autoParse ? parseMCPResponse(result) : result

        const matched = parsed.matched_artifacts || []
        const total = parsed.total_searched || 0

        console.log(
          `[useAgentSearch] Found ${matched.length} artifacts (searched ${total})`
        )

        setArtifactResults(matched)
        setTotalSearched(total)

        return matched
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Search artifacts failed'
        console.error('[useAgentSearch] Error:', errorMsg)
        setError(errorMsg)
        setArtifactResults([])
        return []
      } finally {
        setIsSearching(false)
      }
    },
    [callTool, autoParse, parseMCPResponse]
  )

  /**
   * Clear all search results
   */
  const clearResults = useCallback(() => {
    setSearchResults([])
    setArtifactResults([])
    setError(null)
    setTotalSearched(0)
  }, [])

  return {
    // Search functions
    searchByInstruction,
    findSimilar,
    searchByBlueprint,
    searchArtifacts,

    // State
    searchResults,
    artifactResults,
    isSearching,
    error,
    totalSearched,

    // Utilities
    clearResults,
  }
}
