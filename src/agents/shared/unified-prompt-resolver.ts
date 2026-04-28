/**
 * Unified Prompt Resolver for Backend Agents
 *
 * Uses the same COPILOT_MANIFEST as frontend to determine
 * if agent prompts should come from platform or i18n.
 *
 * This resolver works in server-side contexts (LangGraph, DeepAgents)
 * and provides caching for performance.
 *
 * @module agents/shared/unified-prompt-resolver
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
 * Configuration for prompt resolution
 */
export interface UnifiedPromptResolverConfig {
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
  /** Config key used (if from platform) */
  configKey?: string
}

/**
 * Agent configuration from platform
 */
interface AgentConfig {
  systemPrompt: string
  configuration?: {
    temperature?: number
    maxTokens?: number
  }
  subagents?: Record<string, { systemPrompt: string }>
}

/**
 * Manifest structure for backend agents
 */
interface CopilotManifest {
  backend?: {
    agents?: Record<
      string,
      {
        customized: boolean
        configKey?: string
        subagents?: Record<string, { customized: boolean }>
      }
    >
  }
}

// ============================================================================
// Cache
// ============================================================================

interface ManifestCache {
  data: CopilotManifest | null
  timestamp: number
}

let manifestCache: ManifestCache = { data: null, timestamp: 0 }
const configCache = new Map<string, { data: AgentConfig; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ============================================================================
// Agent ID Types
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
// Manifest Loader
// ============================================================================

/**
 * Load manifest from platform (cached)
 */
async function loadManifest(
  callMCPTool: MCPToolCaller
): Promise<CopilotManifest | null> {
  // Check cache
  if (manifestCache.data && Date.now() - manifestCache.timestamp < CACHE_TTL) {
    return manifestCache.data
  }

  try {
    const result = await callMCPTool(
      'connection-mcp-server-legacy',
      'get_artifact',
      { key: 'COPILOT_MANIFEST' }
    )

    const artifact = parseToolResult(result)
    if (artifact?.value) {
      const manifest = JSON.parse(artifact.value) as CopilotManifest
      manifestCache = { data: manifest, timestamp: Date.now() }
      return manifest
    }
  } catch {
    // Continue with null
  }

  return null
}

/**
 * Check if an agent is customized in the manifest
 */
function isAgentCustomized(
  manifest: CopilotManifest | null,
  agentId: string
): boolean {
  return manifest?.backend?.agents?.[agentId]?.customized ?? false
}

/**
 * Check if a subagent is customized in the manifest
 */
function isSubagentCustomized(
  manifest: CopilotManifest | null,
  agentId: string,
  subagentId: string
): boolean {
  return (
    manifest?.backend?.agents?.[agentId]?.subagents?.[subagentId]?.customized ??
    false
  )
}

/**
 * Get agent config key from manifest
 */
function getAgentConfigKey(
  manifest: CopilotManifest | null,
  agentId: string
): string {
  const configKey = manifest?.backend?.agents?.[agentId]?.configKey
  return configKey || `AGENT_CONFIG_${agentId.toUpperCase().replace(/-/g, '_')}`
}

// ============================================================================
// Local Prompt Getter
// ============================================================================

/**
 * Get local prompt from i18n
 */
function getLocalPrompt(agentId: string, locale: ServerLocale): string {
  if (isLangGraphAgent(agentId)) {
    return getLocalSystemPrompt(agentId, locale)
  }

  if (isDeepAgent(agentId)) {
    return getDeepAgentSystemPrompt(agentId, locale)
  }

  return `You are a helpful AI assistant (${agentId}). Be concise and accurate.`
}

// ============================================================================
// Platform Config Fetcher
// ============================================================================

/**
 * Fetch agent config from platform
 */
async function fetchAgentConfig(
  configKey: string,
  callMCPTool: MCPToolCaller
): Promise<AgentConfig | null> {
  // Check cache
  const cached = configCache.get(configKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const result = await callMCPTool(
      'connection-mcp-server-legacy',
      'get_artifact',
      { key: configKey }
    )

    const artifact = parseToolResult(result)
    if (artifact?.value) {
      const config = JSON.parse(artifact.value) as AgentConfig
      configCache.set(configKey, { data: config, timestamp: Date.now() })
      return config
    }
  } catch {
    // Continue with null
  }

  return null
}

// ============================================================================
// Main Resolver Functions
// ============================================================================

/**
 * Resolve agent prompt with manifest-based hierarchy
 *
 * Flow:
 * 1. Load manifest (cached)
 * 2. If agent not customized → return local i18n (ZERO API calls)
 * 3. If customized → fetch AGENT_CONFIG_{AGENT} from platform
 *
 * @param agentId - Agent identifier (e.g., 'feedback-analyzer')
 * @param config - Configuration with MCP tool caller
 * @returns Resolved prompt with source information
 *
 * @example
 * ```typescript
 * const { content, source } = await resolveAgentPrompt('feedback-analyzer', {
 *   callMCPTool: myMCPCaller,
 *   locale: 'pt-BR'
 * })
 *
 * console.log(content)  // The system prompt
 * console.log(source)   // 'platform' or 'local'
 * ```
 */
export async function resolveAgentPrompt(
  agentId: AllAgentId | string,
  config: UnifiedPromptResolverConfig
): Promise<ResolvedPromptResult> {
  const locale = config.locale || 'en'

  // 1. Load manifest
  const manifest = await loadManifest(config.callMCPTool)

  // 2. Check if agent is customized
  if (!isAgentCustomized(manifest, agentId)) {
    // Use local i18n - ZERO additional API calls
    return {
      content: getLocalPrompt(agentId, locale),
      source: 'local',
    }
  }

  // 3. Fetch from platform
  const configKey = getAgentConfigKey(manifest, agentId)
  const platformConfig = await fetchAgentConfig(configKey, config.callMCPTool)

  if (platformConfig?.systemPrompt) {
    return {
      content: platformConfig.systemPrompt,
      source: 'platform',
      configKey,
    }
  }

  // Fallback to local
  return {
    content: getLocalPrompt(agentId, locale),
    source: 'local',
  }
}

/**
 * Resolve subagent prompt with manifest-based hierarchy
 *
 * @param parentAgentId - Parent agent identifier
 * @param subagentId - Subagent identifier (e.g., 'patternAnalyzer')
 * @param config - Configuration with MCP tool caller
 * @returns Resolved prompt with source information
 */
export async function resolveSubagentPrompt(
  parentAgentId: DeepAgentId | string,
  subagentId: string,
  config: UnifiedPromptResolverConfig
): Promise<ResolvedPromptResult> {
  const locale = config.locale || 'en'

  // 1. Load manifest
  const manifest = await loadManifest(config.callMCPTool)

  // 2. Check if subagent is customized
  if (!isSubagentCustomized(manifest, parentAgentId, subagentId)) {
    // Use local i18n
    const localPrompt = isDeepAgent(parentAgentId)
      ? getSubagentPrompt(parentAgentId, subagentId, locale)
      : `You are a specialized ${subagentId} subagent.`

    return {
      content: localPrompt,
      source: 'local',
    }
  }

  // 3. Fetch parent config which includes subagent prompts
  const configKey = getAgentConfigKey(manifest, parentAgentId)
  const platformConfig = await fetchAgentConfig(configKey, config.callMCPTool)

  if (platformConfig?.subagents?.[subagentId]?.systemPrompt) {
    return {
      content: platformConfig.subagents[subagentId].systemPrompt,
      source: 'platform',
      configKey,
    }
  }

  // Fallback to local
  const localPrompt = isDeepAgent(parentAgentId)
    ? getSubagentPrompt(parentAgentId, subagentId, locale)
    : `You are a specialized ${subagentId} subagent.`

  return {
    content: localPrompt,
    source: 'local',
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse MCP tool result
 */
function parseToolResult(
  result: unknown
): { value?: string; key?: string } | null {
  if (!result) return null

  if (typeof result === 'object' && 'content' in (result as object)) {
    const content = (result as { content?: Array<{ text?: string }> }).content
    if (content?.[0]?.text) {
      try {
        return JSON.parse(content[0].text)
      } catch {
        return null
      }
    }
  }

  return null
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all caches
 */
export function clearUnifiedPromptCache(): void {
  manifestCache = { data: null, timestamp: 0 }
  configCache.clear()
}

/**
 * Invalidate manifest cache (will reload on next request)
 */
export function invalidateManifestCache(): void {
  manifestCache = { data: null, timestamp: 0 }
}

/**
 * Invalidate specific agent config cache
 */
export function invalidateAgentCache(agentId: string): void {
  const configKey = `AGENT_CONFIG_${agentId.toUpperCase().replace(/-/g, '_')}`
  configCache.delete(configKey)
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get prompt content only (without metadata)
 */
export async function getAgentPromptContent(
  agentId: AllAgentId | string,
  config: UnifiedPromptResolverConfig
): Promise<string> {
  const result = await resolveAgentPrompt(agentId, config)
  return result.content
}

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
  baseConfig: Omit<UnifiedPromptResolverConfig, 'locale'>
): (locale?: ServerLocale) => Promise<string> {
  return async (locale: ServerLocale = 'en') => {
    const result = await resolveAgentPrompt(agentId, {
      ...baseConfig,
      locale,
    })
    return result.content
  }
}
