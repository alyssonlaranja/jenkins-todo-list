'use client'

/**
 * @deprecated This hook is deprecated.
 *
 * USE THE NEW UNIFIED ARCHITECTURE INSTEAD:
 * - For frontend modules: useCopilot(moduleId) from '@/shared/hooks/use-copilot'
 * - For backend agents: resolveAgentPrompt(agentId) from '@/agents/shared/unified-prompt-resolver'
 *
 * The new architecture provides:
 * - Global caching via Zustand store (useCopilotManifestStore)
 * - Single COPILOT_MANIFEST artifact per namespace
 * - i18n as default (zero API calls if not customized)
 * - Variable replacement with {{VARIABLE}} pattern
 * - Consistent behavior across frontend and backend
 *
 * See: COPILOT_ARCHITECTURE_CONSOLIDATION.md for migration guide
 *
 * This hook will be removed in a future version.
 *
 * ---
 *
 * OLD DOCUMENTATION (for reference):
 *
 * Hook for Platform-First Prompt Resolution
 *
 * Client-side hook that resolves agent prompts with Platform > Local hierarchy.
 * Integrates with the active namespace context to automatically fetch platform prompts.
 *
 * ## Resolution Flow
 *
 * ```
 * 1. PLATFORM (first priority)
 *    ├─ Try Artifact: AGENT_PROMPT_{AGENT_ID}_{LOCALE}
 *    │   └─ If has ${ARTIFACT_KEY} references → fetch and resolve them
 *    └─ Try Utility Agent: MCP_PORTAL_{AGENT_ID}_AGENT
 *        └─ Uses artifacts_catalog from blueprint
 *
 * 2. LOCAL (fallback)
 *    └─ fallbackPrompt option OR hardcoded defaults
 *
 * 3. VARIABLES (final step)
 *    └─ Replace {{PLACEHOLDER}} with values from options.variables
 * ```
 *
 * ## Pattern Reference
 *
 * - `${KEY}` → ARTIFACT reference (resolved from platform catalog)
 * - `{{KEY}}` → Simple PLACEHOLDER (replaced by options.variables)
 *
 * @example
 * ```tsx
 * function MyAgentComponent() {
 *   const { prompt, isLoading, source } = usePlatformPrompt('feedback-analyzer', 'en', {
 *     fallbackPrompt: t('mcp.agents.feedbackAnalyzer.systemInstructions'),
 *     variables: { USER_NAME: user.name, NAMESPACE: namespace.name }
 *   })
 *
 *   if (isLoading) return <Skeleton />
 *
 *   return (
 *     <CopilotPopup instructions={prompt}>
 *       {source === 'platform' && <Badge>Customized</Badge>}
 *     </CopilotPopup>
 *   )
 * }
 * ```
 */
import { useCallback, useEffect, useState } from 'react'

import { useActiveLicense } from '@/shared/hooks/use-active-license'
import { useActiveNamespace } from '@/shared/hooks/use-active-namespace'
import { useUserApiKey } from '@/shared/hooks/use-user-api-key'

// ============================================================================
// Types
// ============================================================================

export interface UsePlatformPromptOptions {
  /** Skip platform lookup (use local only) */
  localOnly?: boolean
  /** Refresh interval in ms (0 = no auto-refresh) */
  refreshInterval?: number
  /** Custom fallback prompt (instead of hardcoded defaults) */
  fallbackPrompt?: string
  /** Variables to replace in the prompt (e.g., {{VARIABLE_NAME}}) */
  variables?: Record<string, string | number>
}

export interface UsePlatformPromptResult {
  /** Resolved prompt content */
  prompt: string
  /** Whether the prompt is still loading */
  isLoading: boolean
  /** Error if any occurred */
  error: Error | null
  /** Source of the prompt */
  source: 'platform' | 'local' | 'pending'
  /** Refresh the prompt */
  refresh: () => void
  /** Whether platform has a custom prompt */
  isPlatformCustomized: boolean
}

// ============================================================================
// Local Fallback Prompts (from i18n)
// ============================================================================

const LOCAL_FALLBACK_PROMPTS: Record<string, Record<string, string>> = {
  'feedback-analyzer': {
    en: 'You are an AI assistant that helps analyze and categorize feedback. Be concise and structured in your analysis.',
    'pt-BR':
      'Você é um assistente de IA que ajuda a analisar e categorizar feedbacks. Seja conciso e estruturado em sua análise.',
    ja: 'あなたはフィードバックの分析とカテゴリ分けを支援するAIアシスタントです。分析は簡潔で構造的に行ってください。',
  },
  'training-analyzer': {
    en: 'You are an AI Training Studio assistant that analyzes documents and creates training structures. Use the provided tools to extract content, propose structures, and generate quizzes.',
    'pt-BR':
      'Você é um assistente do Training Studio de IA que analiza documentos e cria estruturas de treinamento. Use as ferramentas fornecidas para extrair conteúdo, propor estruturas e gerar quizzes.',
    ja: 'あなたはドキュメントを分析し、トレーニング構造を作成するAIトレーニングスタジオアシスタントです。提供されたツールを使用して、コンテンツを抽出し、構造を提案し、クイズを生成してください。',
  },
}

function getLocalFallbackPrompt(agentId: string, locale: string): string {
  const agentPrompts = LOCAL_FALLBACK_PROMPTS[agentId]
  if (!agentPrompts) {
    return `You are a helpful AI assistant (${agentId}). Be concise and accurate.`
  }

  const keys = Object.keys(agentPrompts)
  const firstKey = keys[0]
  return (
    agentPrompts[locale] ||
    agentPrompts['en'] ||
    (firstKey ? agentPrompts[firstKey] : '') ||
    ''
  )
}

// ============================================================================
// Variable Replacement & Artifact Resolution
// ============================================================================

/**
 * Replace simple template variables in the prompt.
 *
 * Uses ONLY {{VARIABLE}} pattern (Mustache-style) for simple placeholders.
 *
 * @example
 * replaceVariables('Hello {{USER_NAME}}!', { USER_NAME: 'John' })
 * // Returns: 'Hello John!'
 */
function replaceVariables(
  template: string,
  variables: Record<string, string | number>
): string {
  if (!variables || Object.keys(variables).length === 0) {
    return template
  }

  let result = template

  for (const [key, value] of Object.entries(variables)) {
    // Replace only {{KEY}} pattern (Mustache-style) for simple variables
    result = result.replace(
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'),
      String(value)
    )
  }

  return result
}

/**
 * Extract artifact keys referenced in the template.
 *
 * Finds all ${ARTIFACT_KEY} patterns in the template.
 *
 * @example
 * extractArtifactKeys('Use ${RULES} and ${GUIDELINES}')
 * // Returns: ['RULES', 'GUIDELINES']
 */
function extractArtifactKeys(template: string): string[] {
  const pattern = /\$\{([A-Z0-9_]+)\}/g
  const keys: string[] = []
  let match

  while ((match = pattern.exec(template)) !== null) {
    if (match[1] && !keys.includes(match[1])) {
      keys.push(match[1])
    }
  }

  return keys
}

/**
 * Resolve artifact references in a template.
 *
 * Replaces ${ARTIFACT_KEY} patterns with actual artifact values from catalog.
 * If artifact not found, keeps the original ${KEY} pattern.
 *
 * @example
 * resolveArtifactsInTemplate('Follow ${RULES}', { RULES: { value: 'Be nice' } })
 * // Returns: 'Follow Be nice'
 */
function resolveArtifactsInTemplate(
  template: string,
  catalog: Record<string, { value?: string }>
): string {
  const pattern = /\$\{([A-Z0-9_]+)\}/g
  return template.replace(pattern, (match, key) => {
    const artifact = catalog[key]
    return artifact?.value || match
  })
}

// ============================================================================
// Main Hook
// ============================================================================

export function usePlatformPrompt(
  agentId: string,
  locale: string = 'en',
  options: UsePlatformPromptOptions = {}
): UsePlatformPromptResult {
  const {
    localOnly = false,
    refreshInterval = 0,
    fallbackPrompt,
    variables = {},
  } = options

  const { activeLicense } = useActiveLicense()
  const { activeNamespace } = useActiveNamespace()
  const { apiKey } = useUserApiKey()

  const [prompt, setPrompt] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [source, setSource] = useState<'platform' | 'local' | 'pending'>(
    'pending'
  )

  // Helper to get fallback (custom or default) with variables replaced
  const getFallback = useCallback(() => {
    const base = fallbackPrompt || getLocalFallbackPrompt(agentId, locale)
    return replaceVariables(base, variables)
  }, [fallbackPrompt, agentId, locale, variables])

  const fetchPrompt = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. If localOnly or missing credentials, skip platform lookup
      if (
        localOnly ||
        !activeLicense?.id ||
        !activeNamespace?.id ||
        !apiKey?.key
      ) {
        const localPrompt = getFallback()
        setPrompt(localPrompt)
        setSource('local')
        return
      }

      // 2. Try platform first
      const platformPrompt = await fetchFromPlatform(
        agentId,
        locale,
        activeNamespace.id,
        activeLicense.id,
        apiKey.key
      )

      if (platformPrompt) {
        // Replace variables in platform prompt too
        const resolvedPrompt = replaceVariables(platformPrompt, variables)
        setPrompt(resolvedPrompt)
        setSource('platform')
        return
      }

      // 3. Fallback to local
      const localPrompt = getFallback()
      setPrompt(localPrompt)
      setSource('local')
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      // Still provide local fallback on error
      const localPrompt = getFallback()
      setPrompt(localPrompt)
      setSource('local')
    } finally {
      setIsLoading(false)
    }
  }, [
    agentId,
    locale,
    localOnly,
    activeLicense?.id,
    apiKey?.key,
    activeNamespace?.id,
    getFallback,
    variables,
  ])

  // Initial fetch and refresh
  useEffect(() => {
    fetchPrompt()

    if (refreshInterval > 0) {
      const interval = setInterval(fetchPrompt, refreshInterval)
      return () => clearInterval(interval)
    }
    return undefined
  }, [fetchPrompt, refreshInterval])

  return {
    prompt,
    isLoading,
    error,
    source,
    refresh: fetchPrompt,
    isPlatformCustomized: source === 'platform',
  }
}

// ============================================================================
// Platform Fetching
// ============================================================================

async function fetchFromPlatform(
  agentId: string,
  locale: string,
  namespaceId: string,
  licenseId: string,
  apiKey: string
): Promise<string | null> {
  // Strategy 1: Try artifact
  const artifactPrompt = await fetchArtifactPrompt(
    agentId,
    locale,
    namespaceId,
    licenseId,
    apiKey
  )
  if (artifactPrompt) return artifactPrompt

  // Strategy 2: Try utility agent
  const agentPrompt = await fetchUtilityAgentPrompt(
    agentId,
    namespaceId,
    licenseId,
    apiKey
  )
  if (agentPrompt) return agentPrompt

  return null
}

async function fetchArtifactPrompt(
  agentId: string,
  locale: string,
  namespaceId: string,
  licenseId: string,
  apiKey: string
): Promise<string | null> {
  const artifactKey = `AGENT_PROMPT_${agentId.toUpperCase().replace(/-/g, '_')}_${locale.replace('-', '_')}`

  try {
    const response = await fetch('/api/mcp-orchestrator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cockpit-license-id': licenseId,
        'x-cockpit-namespace-id': namespaceId,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        serverKey: 'connection-mcp-server-legacy',
        method: 'callTool',
        params: {
          name: 'get_artifact',
          arguments: { key: artifactKey },
        },
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const artifact = data?.content?.[0]?.text
      ? JSON.parse(data.content[0].text)
      : null

    const promptValue = artifact?.value
    if (!promptValue) return null

    // Check if prompt has artifact references (${KEY} pattern)
    const referencedKeys = extractArtifactKeys(promptValue)
    if (referencedKeys.length === 0) {
      return promptValue
    }

    // Fetch referenced artifacts and resolve them
    const catalog = await fetchReferencedArtifacts(
      referencedKeys,
      namespaceId,
      licenseId,
      apiKey
    )

    return resolveArtifactsInTemplate(promptValue, catalog)
  } catch {
    return null
  }
}

/**
 * Fetch multiple artifacts by keys and return as a catalog.
 */
async function fetchReferencedArtifacts(
  keys: string[],
  namespaceId: string,
  licenseId: string,
  apiKey: string
): Promise<Record<string, { value?: string }>> {
  const catalog: Record<string, { value?: string }> = {}

  // Fetch artifacts in parallel
  const fetchPromises = keys.map(async key => {
    try {
      const response = await fetch('/api/mcp-orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cockpit-license-id': licenseId,
          'x-cockpit-namespace-id': namespaceId,
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          serverKey: 'connection-mcp-server-legacy',
          method: 'callTool',
          params: {
            name: 'get_artifact',
            arguments: { key },
          },
        }),
      })

      if (!response.ok) return

      const data = await response.json()
      const artifact = data?.content?.[0]?.text
        ? JSON.parse(data.content[0].text)
        : null

      if (artifact?.value) {
        catalog[key] = { value: artifact.value }
      }
    } catch {
      // Ignore individual fetch errors
    }
  })

  await Promise.all(fetchPromises)
  return catalog
}

async function fetchUtilityAgentPrompt(
  agentId: string,
  namespaceId: string,
  licenseId: string,
  apiKey: string
): Promise<string | null> {
  const agentNamePattern = `^MCP_PORTAL_${agentId.toUpperCase().replace(/-/g, '_')}_AGENT$`

  try {
    // Search for agent
    const searchResponse = await fetch('/api/mcp-orchestrator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cockpit-license-id': licenseId,
        'x-cockpit-namespace-id': namespaceId,
        'x-api-key': apiKey,
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

    if (!searchResponse.ok) return null

    const searchData = await searchResponse.json()
    const searchResult = searchData?.content?.[0]?.text
      ? JSON.parse(searchData.content[0].text)
      : null

    const foundAgent = searchResult?.utility_agents?.[0]
    if (!foundAgent?.id) return null

    // Get full blueprint
    const inspectResponse = await fetch('/api/mcp-orchestrator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cockpit-license-id': licenseId,
        'x-cockpit-namespace-id': namespaceId,
        'x-api-key': apiKey,
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

    if (!inspectResponse.ok) return null

    const inspectData = await inspectResponse.json()
    const blueprint = inspectData?.content?.[0]?.text
      ? JSON.parse(inspectData.content[0].text)
      : null

    if (!blueprint?.agent?.instruction) return null

    // Resolve artifacts in instruction using the catalog from blueprint
    return resolveArtifactsInTemplate(
      blueprint.agent.instruction,
      blueprint.artifacts_catalog || {}
    )
  } catch {
    return null
  }
}

export default usePlatformPrompt
