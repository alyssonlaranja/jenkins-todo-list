/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

'use client'

import { useCallback, useState } from 'react'

import type {
  InspectAgentRequest,
  InspectAgentResponse,
} from '@/shared/lib/mcp/types'

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

export interface UseInspectAgentOptions {
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

export interface UseInspectAgentReturn {
  // Inspect function
  inspect: (params: InspectAgentRequest) => Promise<InspectAgentResponse | null>

  // Quick inspect with recommended defaults
  quickInspect: (agentId: string) => Promise<InspectAgentResponse | null>

  // State
  blueprint: InspectAgentResponse | null
  isInspecting: boolean
  error: string | null

  // Utilities
  clearBlueprint: () => void
}

/**
 * useInspectAgent - Agent Blueprint Analysis Hook
 *
 * Provides deep inspection of utility agents using MCP v2.0 `inspect_agent` tool.
 * Returns complete reconstruction blueprint with:
 * - Model configuration (front matter + fallback)
 * - Artifact dependencies with usage analysis
 * - MCP connections
 * - Team relationships
 * - Version information
 *
 * @example
 * ```tsx
 * const { inspect, blueprint, isInspecting } = useInspectAgent()
 *
 * const result = await inspect({
 *   utility_agent_id: 'abc-123',
 *   artifacts_catalog_scope: 'main_only',  // Recommended
 * })
 *
 * console.log('Artifacts:', result.artifacts_count)
 * console.log('Team members:', result.team_members_count)
 * ```
 */

export function useInspectAgent({
  callTool,
  autoParse = true,
}: UseInspectAgentOptions): UseInspectAgentReturn {
  const [blueprint, setBlueprint] = useState<InspectAgentResponse | null>(null)
  const [isInspecting, setIsInspecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Parse MCP response with nested structure
   */
  const parseMCPResponse = useCallback((result: any): InspectAgentResponse => {
    if (result.content?.[0]?.text) {
      try {
        const parsed = JSON.parse(result.content[0].text)
        // MCP v2.0: always uses 'success'
        if (parsed.success) {
          return parsed as InspectAgentResponse
        }
        throw new Error(parsed.error || 'Inspection failed')
      } catch (parseError) {
        console.error('[useInspectAgent] Parse error:', parseError)
        throw parseError
      }
    }

    // Direct response format
    if (result.success) {
      return result as InspectAgentResponse
    }

    throw new Error(result.error || 'Inspection failed')
  }, [])

  /**
   * Inspect agent with full configuration
   */
  const inspect = useCallback(
    async (
      params: InspectAgentRequest
    ): Promise<InspectAgentResponse | null> => {
      setIsInspecting(true)
      setError(null)

      try {
        console.log(
          '[useInspectAgent] Inspecting agent:',
          params.utility_agent_id
        )
        console.log(
          '[useInspectAgent] Catalog scope:',
          params.artifacts_catalog_scope || 'main_only'
        )

        const result = await callTool('inspect_agent', params)
        const parsed = autoParse ? parseMCPResponse(result) : result

        console.log('[useInspectAgent] Inspection complete:')
        console.log(`  - Agent: ${parsed.agent.name} (${parsed.agent.type})`)
        console.log(
          `  - Front matter: ${parsed.agent.has_front_matter ? 'Yes' : 'No'}`
        )
        console.log(`  - Artifacts: ${parsed.agent.artifacts_count}`)
        console.log(
          `  - MCP connections: ${parsed.agent.mcp_connections_count}`
        )
        console.log(`  - Team members: ${parsed.agent.team_members_count}`)
        console.log(
          `  - Versions: ${parsed.agent.versions.production} (prod) / ${parsed.agent.versions.total} (total)`
        )

        // Log model configuration
        if (parsed.agent.model) {
          console.log(
            `  - Model: ${parsed.agent.model.effective} (source: ${parsed.agent.model.source})`
          )
        }

        // Log warnings if any
        if (parsed.agent.artifact_usage?.locations?.missing?.length > 0) {
          console.warn(
            '[useInspectAgent] Missing artifacts:',
            parsed.agent.artifact_usage.locations.missing
          )
        }

        setBlueprint(parsed)
        return parsed
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Agent inspection failed'
        console.error('[useInspectAgent] Error:', errorMsg)
        setError(errorMsg)
        setBlueprint(null)
        return null
      } finally {
        setIsInspecting(false)
      }
    },
    [callTool, autoParse, parseMCPResponse]
  )

  /**
   * Quick inspect with recommended defaults
   * - artifacts_catalog_scope: 'main_only' (performance)
   * - include_versions_details: false (skip history)
   * - include_versions_team_details: false (skip team enrichment in versions)
   */
  const quickInspect = useCallback(
    async (agentId: string): Promise<InspectAgentResponse | null> => {
      return inspect({
        utility_agent_id: agentId,
        artifacts_catalog_scope: 'main_only', // Recommended for performance
        include_versions_details: false,
        include_versions_team_details: false,
      })
    },
    [inspect]
  )

  /**
   * Clear blueprint
   */
  const clearBlueprint = useCallback(() => {
    setBlueprint(null)
    setError(null)
  }, [])

  return {
    // Inspect functions
    inspect,
    quickInspect,

    // State
    blueprint,
    isInspecting,
    error,

    // Utilities
    clearBlueprint,
  }
}
