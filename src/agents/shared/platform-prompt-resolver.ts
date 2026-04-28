/**
 * @deprecated This resolver is deprecated.
 *
 * USE THE UNIFIED RESOLVER INSTEAD:
 * - import { resolveAgentPrompt, resolveSubagentPrompt } from '@/agents/shared/unified-prompt-resolver'
 *
 * The unified resolver provides:
 * - Manifest-based configuration (COPILOT_MANIFEST artifact)
 * - 5-minute caching for better performance
 * - Consistent behavior with frontend useCopilot hook
 * - No need for per-agent artifact patterns
 *
 * See: COPILOT_ARCHITECTURE_CONSOLIDATION.md for migration guide
 *
 * This file will be removed in a future version.
 *
 * ---
 *
 * OLD DOCUMENTATION (for reference):
 *
 * Platform-First Prompt Resolver for LangGraph Agents
 *
 * Server-side resolver that fetches prompts from Utility Agents on the platform.
 * Falls back to local i18n if platform is not available.
 *
 * Strategy:
 * 1. Try Utility Agent: MCP_PORTAL_{AGENT_ID}_AGENT
 * 2. Fallback to local i18n
 *
 * @module agents/shared/platform-prompt-resolver
 */
import {
  getDeepAgentSystemPrompt,
  getSystemPrompt as getLocalSystemPrompt,
  getSubagentPrompt,
  type ServerLocale,
} from './prompts'

// ============================================================================
// Types
// ============================================================================

/**
 * Function signature for calling MCP tools
 */
export type MCPToolCaller = (
  serverKey: string,
  toolName: string,
  args: Record<string, unknown>
) => Promise<unknown>

/**
 * Configuration for platform prompt resolution
 */
export interface PlatformPromptResolverConfig {
  /** Function to call MCP tools */
  callMCPTool: MCPToolCaller
  /** Locale for the prompt */
  locale?: ServerLocale
}

/**
 * Result of prompt resolution
 */
export interface ResolvedPromptResult {
  /** The resolved prompt content */
  content: string
  /** Source of the prompt */
  source: 'platform' | 'local'
  /** Utility Agent ID if from platform */
  utilityAgentId?: string
  /** Artifacts that were resolved */
  resolvedArtifacts?: string[]
}

// Internal types for MCP responses
interface UtilityAgentSearchResult {
  utility_agents?: Array<{ id: string; name: string }>
}

interface UtilityAgentBlueprint {
  agent?: {
    instruction?: string
  }
  artifacts_catalog?: Record<string, { value?: string; key?: string }>
}

// ============================================================================
// Constants
// ============================================================================

const AGENT_NAME_PREFIX = 'MCP_PORTAL'

// Cache for resolved prompts (5 min TTL)
const promptCache = new Map<
  string,
  { data: ResolvedPromptResult; timestamp: number }
>()
const CACHE_TTL_MS = 5 * 60 * 1000

// ============================================================================
// Agent ID Mapping
// ============================================================================

type LangGraphAgentId = 'feedback-analyzer' | 'training-analyzer'
type DeepAgentId = 'feedback-deep-agent' | 'training-deep-agent'
type AllAgentId = LangGraphAgentId | DeepAgentId

function isLangGraphAgent(agentId: string): agentId is LangGraphAgentId {
  return ['feedback-analyzer', 'training-analyzer'].includes(agentId)
}

function isDeepAgent(agentId: string): agentId is DeepAgentId {
  return ['feedback-deep-agent', 'training-deep-agent'].includes(agentId)
}

// ============================================================================
// Local Fallback
// ============================================================================

function getLocalFallback(agentId: string, locale: ServerLocale): string {
  if (isLangGraphAgent(agentId)) {
    return getLocalSystemPrompt(agentId, locale)
  }

  if (isDeepAgent(agentId)) {
    return getDeepAgentSystemPrompt(agentId, locale)
  }

  return `You are a helpful AI assistant (${agentId}). Be concise and accurate.`
}

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve agent prompt from platform Utility Agent
 *
 * @param agentId - Agent identifier (e.g., 'feedback-analyzer')
 * @param config - Configuration with MCP tool caller
 * @returns Resolved prompt with source information
 *
 * @example
 * ```typescript
 * const result = await resolvePlatformPrompt('feedback-analyzer', {
 *   callMCPTool: async (server, tool, args) => {
 *     // Your MCP call implementation
 *   },
 *   locale: 'pt-BR',
 * })
 *
 * console.log(result.content) // The system prompt
 * console.log(result.source)  // 'platform' or 'local'
 * ```
 */
export async function resolvePlatformPrompt(
  agentId: AllAgentId | string,
  config: PlatformPromptResolverConfig
): Promise<ResolvedPromptResult> {
  const locale = config.locale || 'en'
  const cacheKey = `${agentId}:${locale}`

  // Check cache
  const cached = promptCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  try {
    // Try to fetch from platform Utility Agent
    const platformResult = await fetchFromUtilityAgent(agentId, config)

    if (platformResult) {
      promptCache.set(cacheKey, {
        data: platformResult,
        timestamp: Date.now(),
      })
      return platformResult
    }
  } catch {
    // Silent fail - will use local fallback
  }

  // Fallback to local
  const localContent = getLocalFallback(agentId, locale)
  const result: ResolvedPromptResult = {
    content: localContent,
    source: 'local',
  }

  promptCache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
}

// ============================================================================
// Platform Fetching
// ============================================================================

async function fetchFromUtilityAgent(
  agentId: string,
  config: PlatformPromptResolverConfig
): Promise<ResolvedPromptResult | null> {
  const { callMCPTool } = config
  const agentNamePattern = buildAgentNamePattern(agentId)

  // Step 1: Search for the utility agent
  const searchResult = await callMCPTool(
    'connection-mcp-utility-agents',
    'search_utility_agents',
    {
      name_pattern: agentNamePattern,
      search_type: 'name',
      page: 1,
      page_size: 1,
    }
  )

  const searchData = parseToolResult<UtilityAgentSearchResult>(searchResult)
  const foundAgent = searchData?.utility_agents?.[0]

  if (!foundAgent?.id) {
    return null
  }

  // Step 2: Inspect agent to get full blueprint with artifacts
  const inspectResult = await callMCPTool(
    'connection-mcp-utility-agents',
    'inspect_agent',
    {
      utility_agent_id: foundAgent.id,
      artifacts_catalog_scope: 'full',
      include_versions_details: false,
      include_versions_team_details: false,
    }
  )

  const blueprint = parseToolResult<UtilityAgentBlueprint>(inspectResult)

  if (!blueprint?.agent?.instruction) {
    return null
  }

  // Step 3: Resolve artifacts in instruction
  const artifactsCatalog = blueprint.artifacts_catalog ?? {}

  const { resolvedContent, resolvedArtifacts } = resolveArtifactsInInstruction(
    blueprint.agent.instruction,
    artifactsCatalog
  )

  return {
    content: resolvedContent,
    source: 'platform',
    utilityAgentId: foundAgent.id,
    resolvedArtifacts,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build agent name pattern for search
 * Pattern: ^MCP_PORTAL_{AGENT_ID}_AGENT$
 */
function buildAgentNamePattern(agentId: string): string {
  const normalizedId = agentId.toUpperCase().replace(/-/g, '_')
  return `^${AGENT_NAME_PREFIX}_${normalizedId}_AGENT$`
}

/**
 * Parse MCP tool result
 */
function parseToolResult<T = Record<string, unknown>>(
  result: unknown
): T | null {
  if (!result) return null

  // Handle MCP content format
  if (typeof result === 'object' && 'content' in (result as object)) {
    const content = (result as { content?: Array<{ text?: string }> }).content
    if (content?.[0]?.text) {
      try {
        return JSON.parse(content[0].text) as T
      } catch {
        return null
      }
    }
  }

  // Handle direct object
  if (typeof result === 'object') {
    return result as T
  }

  // Handle string
  if (typeof result === 'string') {
    try {
      return JSON.parse(result) as T
    } catch {
      return null
    }
  }

  return null
}

/**
 * Resolve ${KEY} references in instruction using artifacts catalog
 */
function resolveArtifactsInInstruction(
  instruction: string,
  catalog: Record<string, { value?: string; key?: string }>
): { resolvedContent: string; resolvedArtifacts: string[] } {
  const resolvedArtifacts: string[] = []
  const artifactPattern = /\$\{([A-Z0-9_]+)\}/g

  const resolvedContent = instruction.replace(artifactPattern, (match, key) => {
    const artifact = catalog[key]
    if (artifact?.value) {
      resolvedArtifacts.push(key)
      return artifact.value
    }
    return match
  })

  return { resolvedContent, resolvedArtifacts }
}

// ============================================================================
// Subagent Prompt Resolver
// ============================================================================

/**
 * Resolve subagent prompt from platform or local
 *
 * For DeepAgents that have subagents (e.g., pattern-analyzer, resolution-advisor)
 */
export async function resolveSubagentPrompt(
  parentAgentId: DeepAgentId,
  subagentId: string,
  config: PlatformPromptResolverConfig
): Promise<ResolvedPromptResult> {
  const locale = config.locale || 'en'

  // For now, subagents use local prompts
  // TODO: In the future, subagent prompts could also come from platform
  const localContent = getSubagentPrompt(parentAgentId, subagentId, locale)

  return {
    content: localContent,
    source: 'local',
  }
}

// ============================================================================
// Cache Management
// ============================================================================

export function clearPlatformPromptCache(): void {
  promptCache.clear()
}

export function invalidatePlatformPromptCache(agentId: string): void {
  for (const key of promptCache.keys()) {
    if (key.startsWith(`${agentId}:`)) {
      promptCache.delete(key)
    }
  }
}

// ============================================================================
// Convenience Wrapper
// ============================================================================

/**
 * Create a prompt getter function for a specific agent
 *
 * @example
 * ```typescript
 * const getPrompt = createPromptGetter('feedback-analyzer', {
 *   callMCPTool: myMCPCaller,
 * })
 *
 * const prompt = await getPrompt('pt-BR')
 * ```
 */
export function createPromptGetter(
  agentId: AllAgentId | string,
  baseConfig: Omit<PlatformPromptResolverConfig, 'locale'>
): (locale?: ServerLocale) => Promise<string> {
  return async (locale: ServerLocale = 'en') => {
    const result = await resolvePlatformPrompt(agentId, {
      ...baseConfig,
      locale,
    })
    return result.content
  }
}
