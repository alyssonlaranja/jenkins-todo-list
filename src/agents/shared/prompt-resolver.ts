/**
 * Platform-First Prompt Resolver
 *
 * Resolves agent prompts with hierarchy: Platform > Local
 * - PRIORITY 1: Check platform (Cockpit artifacts/agents)
 * - PRIORITY 2: Fallback to local i18n
 *
 * This ensures platform customizations take precedence over local defaults,
 * while local defaults "just work" when platform config is not available.
 */
import {
  getSystemPrompt as getLocalSystemPrompt,
  type ServerLocale,
} from '@/agents/shared/prompts'

// Valid agent IDs for local fallback
type LocalAgentId = 'feedback-analyzer' | 'training-analyzer'

// Check if agentId has a local prompt available
function isLocalAgentId(agentId: string): agentId is LocalAgentId {
  return ['feedback-analyzer', 'training-analyzer'].includes(agentId)
}

// ============================================================================
// Types
// ============================================================================

export interface PlatformPromptConfig {
  namespaceId?: string
  licenseId?: string
  apiKey?: string
}

export interface ResolvedPrompt {
  content: string
  source: 'platform' | 'local'
  artifactKey?: string
  agentId?: string
}

// ============================================================================
// Constants
// ============================================================================

const ARTIFACT_KEY_PREFIX = 'AGENT_PROMPT'
const AGENT_NAME_PREFIX = 'MCP_PORTAL'

// Cache for platform lookups (5 min TTL)
const promptCache = new Map<
  string,
  { data: ResolvedPrompt; timestamp: number }
>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ============================================================================
// Local Fallback Prompt
// ============================================================================

/**
 * Get local fallback prompt for an agent
 * Uses i18n if available, otherwise returns generic fallback
 */
function getLocalFallbackPrompt(agentId: string, locale: ServerLocale): string {
  // If agent has local i18n, use it
  if (isLocalAgentId(agentId)) {
    return getLocalSystemPrompt(agentId, locale)
  }

  // Generic fallback for unknown agents
  return `You are a helpful AI assistant (${agentId}). Be concise and accurate.`
}

// ============================================================================
// Main Resolver Function
// ============================================================================

/**
 * Resolve agent prompt with Platform > Local hierarchy
 *
 * @param agentId - Agent identifier (e.g., 'feedback-analyzer', 'atlas')
 * @param locale - Locale for prompt (e.g., 'en', 'pt-BR', 'ja')
 * @param config - Platform configuration (namespaceId, licenseId, apiKey)
 * @returns Resolved prompt with source information
 *
 * @example
 * ```typescript
 * // With platform lookup
 * const result = await resolveAgentPrompt('feedback-analyzer', 'pt-BR', {
 *   namespaceId: 'ns-123',
 *   licenseId: 'lic-456',
 *   apiKey: 'key-789',
 * })
 *
 * // Without platform (local only)
 * const result = await resolveAgentPrompt('feedback-analyzer', 'pt-BR')
 * ```
 */
export async function resolveAgentPrompt(
  agentId: string,
  locale: ServerLocale = 'en',
  config?: PlatformPromptConfig
): Promise<ResolvedPrompt> {
  const cacheKey = `${agentId}:${locale}:${config?.namespaceId || 'local'}`

  // Check cache first
  const cached = promptCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  // 1. PRIORITY 1: Try Platform
  if (config?.namespaceId && config?.licenseId && config?.apiKey) {
    try {
      const platformPrompt = await fetchFromPlatform(agentId, locale, config)
      if (platformPrompt) {
        const result: ResolvedPrompt = {
          content: platformPrompt.content,
          source: 'platform',
          artifactKey: platformPrompt.artifactKey,
          agentId: platformPrompt.agentId,
        }
        promptCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
      }
    } catch {
      // Continue to local fallback
    }
  }

  // 2. PRIORITY 2: Fallback to Local
  const localPrompt = getLocalFallbackPrompt(agentId, locale)
  const result: ResolvedPrompt = {
    content: localPrompt,
    source: 'local',
  }
  promptCache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
}

// ============================================================================
// Platform Fetching (Internal API calls)
// ============================================================================

interface PlatformPromptResult {
  content: string
  artifactKey?: string
  agentId?: string
}

/**
 * Fetch prompt from platform (artifacts or utility agents)
 */
async function fetchFromPlatform(
  agentId: string,
  locale: ServerLocale,
  config: PlatformPromptConfig
): Promise<PlatformPromptResult | null> {
  // Strategy 1: Try artifact first (AGENT_PROMPT_{agentId}_{locale})
  const artifactResult = await fetchFromArtifact(agentId, locale, config)
  if (artifactResult) {
    return artifactResult
  }

  // Strategy 2: Try utility agent (MCP_PORTAL_{AGENT_ID}_AGENT)
  const agentResult = await fetchFromUtilityAgent(agentId, config)
  if (agentResult) {
    return agentResult
  }

  return null
}

/**
 * Strategy 1: Fetch prompt from artifact
 *
 * Key pattern: AGENT_PROMPT_{agentId}_{locale}
 * Example: AGENT_PROMPT_FEEDBACK_ANALYZER_PT_BR
 */
async function fetchFromArtifact(
  agentId: string,
  locale: ServerLocale,
  config: PlatformPromptConfig
): Promise<PlatformPromptResult | null> {
  const artifactKey = buildArtifactKey(agentId, locale)

  try {
    const response = await fetch('/api/mcp-orchestrator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cockpit-license-id': config.licenseId!,
        'x-cockpit-namespace-id': config.namespaceId!,
        'x-api-key': config.apiKey!,
      },
      body: JSON.stringify({
        serverKey: 'connection-mcp-server-legacy',
        method: 'callTool',
        params: {
          name: 'get_artifact',
          arguments: {
            key: artifactKey,
          },
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const artifact = data?.content?.[0]?.text
      ? JSON.parse(data.content[0].text)
      : null

    if (artifact?.value) {
      return {
        content: artifact.value,
        artifactKey: artifactKey,
      }
    }
  } catch {
    // Artifact not found, continue
  }

  return null
}

/**
 * Strategy 2: Fetch prompt from utility agent instruction
 *
 * Agent name pattern: MCP_PORTAL_{AGENT_ID}_AGENT
 * Example: MCP_PORTAL_FEEDBACK_ANALYZER_AGENT
 */
async function fetchFromUtilityAgent(
  agentId: string,
  config: PlatformPromptConfig
): Promise<PlatformPromptResult | null> {
  const agentNamePattern = buildAgentNamePattern(agentId)

  try {
    const response = await fetch('/api/mcp-orchestrator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cockpit-license-id': config.licenseId!,
        'x-cockpit-namespace-id': config.namespaceId!,
        'x-api-key': config.apiKey!,
      },
      body: JSON.stringify({
        serverKey: 'connection-mcp-utility-agents',
        method: 'callTool',
        params: {
          name: 'search_utility_agents',
          arguments: {
            name_pattern: agentNamePattern,
            search_type: 'name',
            page: 1,
            page_size: 1,
          },
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const searchResult = data?.content?.[0]?.text
      ? JSON.parse(data.content[0].text)
      : null

    const foundAgent = searchResult?.utility_agents?.[0]
    if (!foundAgent?.id) {
      return null
    }

    // Now get full agent details with inspect_agent
    const inspectResponse = await fetch('/api/mcp-orchestrator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cockpit-license-id': config.licenseId!,
        'x-cockpit-namespace-id': config.namespaceId!,
        'x-api-key': config.apiKey!,
      },
      body: JSON.stringify({
        serverKey: 'connection-mcp-utility-agents',
        method: 'callTool',
        params: {
          name: 'inspect_agent',
          arguments: {
            utility_agent_id: foundAgent.id,
            artifacts_catalog_scope: 'full',
            include_versions_details: false,
            include_versions_team_details: false,
          },
        },
      }),
    })

    if (!inspectResponse.ok) {
      return null
    }

    const inspectData = await inspectResponse.json()
    const blueprint = inspectData?.content?.[0]?.text
      ? JSON.parse(inspectData.content[0].text)
      : null

    if (blueprint?.agent?.instruction) {
      // Resolve artifacts in instruction
      const resolvedInstruction = resolveArtifactsInInstruction(
        blueprint.agent.instruction,
        blueprint.artifacts_catalog || {}
      )

      return {
        content: resolvedInstruction,
        agentId: foundAgent.id,
      }
    }
  } catch {
    // Agent not found, continue
  }

  return null
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build artifact key for agent prompt
 *
 * Pattern: AGENT_PROMPT_{agentId}_{locale}
 */
function buildArtifactKey(agentId: string, locale: ServerLocale): string {
  const normalizedId = agentId.toUpperCase().replace(/-/g, '_')
  return `${ARTIFACT_KEY_PREFIX}_${normalizedId}_${locale.replace('-', '_')}`
}

/**
 * Build agent name pattern for search
 *
 * Pattern: ^MCP_PORTAL_{AGENT_ID}_AGENT$
 */
function buildAgentNamePattern(agentId: string): string {
  const normalizedId = agentId.toUpperCase().replace(/-/g, '_')
  return `^${AGENT_NAME_PREFIX}_${normalizedId}_AGENT$`
}

/**
 * Resolve ${KEY} references in instruction using artifacts catalog
 *
 * @param instruction - Raw instruction with ${KEY} placeholders
 * @param catalog - Artifacts catalog (key -> artifact object)
 */
function resolveArtifactsInInstruction(
  instruction: string,
  catalog: Record<string, { value?: string }>
): string {
  let resolved = instruction

  // Regex to find ${KEY} patterns
  const artifactPattern = /\$\{([A-Z0-9_]+)\}/g

  resolved = resolved.replace(artifactPattern, (match, key) => {
    const artifact = catalog[key]
    if (artifact?.value) {
      return artifact.value
    }
    return match // Keep original if not found
  })

  return resolved
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear prompt cache (useful for testing or force refresh)
 */
export function clearPromptCache(): void {
  promptCache.clear()
}

/**
 * Invalidate specific cache entry
 */
export function invalidatePromptCache(
  agentId: string,
  locale: ServerLocale,
  namespaceId?: string
): void {
  const cacheKey = `${agentId}:${locale}:${namespaceId || 'local'}`
  promptCache.delete(cacheKey)
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get prompt content only (without metadata)
 */
export async function getAgentPromptContent(
  agentId: string,
  locale: ServerLocale = 'en',
  config?: PlatformPromptConfig
): Promise<string> {
  const result = await resolveAgentPrompt(agentId, locale, config)
  return result.content
}

/**
 * Check if platform has a custom prompt for this agent
 */
export async function hasPlatformPrompt(
  agentId: string,
  locale: ServerLocale,
  config: PlatformPromptConfig
): Promise<boolean> {
  if (!config.namespaceId || !config.licenseId || !config.apiKey) {
    return false
  }

  try {
    const platformPrompt = await fetchFromPlatform(agentId, locale, config)
    return platformPrompt !== null
  } catch {
    return false
  }
}
