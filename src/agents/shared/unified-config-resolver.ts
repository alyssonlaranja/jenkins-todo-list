/**
 * Unified Configuration Resolver
 *
 * Single resolution point for all Copilot configuration.
 * Returns UnifiedConfig that can be consumed by any adapter.
 *
 * Resolution order:
 * 1. Check COPILOT_MANIFEST for customization
 * 2. If customized: fetch from platform artifact
 * 3. If not: use i18n + local registries
 */

import {
  getActionsByModule,
  type ActionModule,
} from '@/shared/lib/dynamic-agents/action-registry'
import {
  getReadablesForModule,
  type ReadableModule,
} from '@/shared/lib/dynamic-agents/readable-registry'
import {
  getSuggestionsForModule,
  type SuggestionModule,
} from '@/shared/lib/dynamic-agents/suggestion-registry'

import type {
  ActionDescription,
  ConfigSource,
  ReadableDescription,
  SuggestionTemplate,
  UnifiedConfig,
} from './types/unified-config'
import type { MCPToolCaller } from './unified-prompt-resolver'

// =============================================================================
// CONSTANTS
// =============================================================================

const MANIFEST_KEY = 'COPILOT_MANIFEST'
const CONFIG_KEY_PREFIX = 'COPILOT_CONFIG_'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// =============================================================================
// TYPES
// =============================================================================

export interface ResolveOptions {
  /** Locale for i18n */
  locale: string
  /** MCP tool caller (for backend resolution) */
  callMCPTool?: MCPToolCaller
  /** Use Zustand store (for frontend caching) */
  useStore?: boolean
}

interface ManifestModule {
  customized: boolean
  features?: string[]
}

interface CopilotManifest {
  version: string
  modules: Record<string, ManifestModule>
}

interface PlatformConfig {
  systemInstructions: string
  actions?: { name: string; description: string }[]
  suggestions?: { key: string; instructions: string }[]
  readables?: { key: string; description: string }[]
}

// =============================================================================
// CACHE
// =============================================================================

interface CacheEntry {
  config: UnifiedConfig
  timestamp: number
}

const configCache = new Map<string, CacheEntry>()

function getCacheKey(moduleId: string, locale: string): string {
  return `${moduleId}:${locale}`
}

function getFromCache(moduleId: string, locale: string): UnifiedConfig | null {
  const key = getCacheKey(moduleId, locale)
  const entry = configCache.get(key)

  if (!entry) return null

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS
  if (isExpired) {
    configCache.delete(key)
    return null
  }

  return entry.config
}

function setCache(
  moduleId: string,
  locale: string,
  config: UnifiedConfig
): void {
  const key = getCacheKey(moduleId, locale)
  configCache.set(key, { config, timestamp: Date.now() })
}

// =============================================================================
// MANIFEST RESOLUTION
// =============================================================================

async function getManifest(
  options: ResolveOptions
): Promise<CopilotManifest | null> {
  if (options.callMCPTool) {
    try {
      const result = await options.callMCPTool('mcp-suite', 'get_artifact', {
        key: MANIFEST_KEY,
      })
      const text = (result as { content?: Array<{ text?: string }> })
        ?.content?.[0]?.text
      if (text) {
        const artifact = JSON.parse(text)
        if (artifact?.value) {
          return JSON.parse(artifact.value) as CopilotManifest
        }
      }
    } catch {
      // Manifest doesn't exist or invalid
      return null
    }
  }

  // Frontend: check Zustand store (if useStore is true)
  // This will be implemented in the useCopilot hook
  return null
}

function isModuleCustomized(
  manifest: CopilotManifest | null,
  moduleId: string
): boolean {
  if (!manifest) return false
  return manifest.modules[moduleId]?.customized ?? false
}

// =============================================================================
// PLATFORM RESOLUTION
// =============================================================================

async function resolvePlatformConfig(
  moduleId: string,
  options: ResolveOptions
): Promise<UnifiedConfig> {
  const { locale, callMCPTool } = options

  if (!callMCPTool) {
    throw new Error('callMCPTool is required for platform resolution')
  }

  // Build artifact key: COPILOT_CONFIG_ATLAS_PT_BR
  const localeKey = locale.toUpperCase().replace('-', '_')
  const artifactKey = `${CONFIG_KEY_PREFIX}${moduleId.toUpperCase()}_${localeKey}`

  try {
    const result = await callMCPTool('mcp-suite', 'get_artifact', {
      key: artifactKey,
    })
    const text = (result as { content?: Array<{ text?: string }> })
      ?.content?.[0]?.text

    if (!text) {
      // Fallback to i18n if platform artifact doesn't exist
      return resolveI18nConfig(moduleId, options)
    }

    const artifact = JSON.parse(text)
    if (!artifact?.value) {
      return resolveI18nConfig(moduleId, options)
    }

    const platformConfig = JSON.parse(artifact.value) as PlatformConfig

    // Merge platform descriptions with local registry handlers
    const actions = mergeActionsWithPlatform(
      moduleId,
      platformConfig.actions ?? []
    )
    const suggestions = mergeSuggestionsWithPlatform(
      moduleId,
      platformConfig.suggestions ?? []
    )
    const readables = mergeReadablesWithPlatform(
      moduleId,
      platformConfig.readables ?? []
    )

    return {
      moduleId,
      locale,
      source: 'platform',
      systemInstructions: platformConfig.systemInstructions,
      actions,
      suggestions,
      readables,
      metadata: {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        customizedFeatures: [
          'instructions',
          'actions',
          'suggestions',
          'readables',
        ],
      },
    }
  } catch {
    // Fallback to i18n on error
    return resolveI18nConfig(moduleId, options)
  }
}

// =============================================================================
// I18N RESOLUTION
// =============================================================================

function resolveI18nConfig(
  moduleId: string,
  options: ResolveOptions
): UnifiedConfig {
  const { locale } = options

  // Get descriptions from registries (already have i18n paths)
  const actions = getActionsFromRegistry(moduleId)
  const suggestions = getSuggestionsFromRegistry(moduleId)
  const readables = getReadablesFromRegistry(moduleId)

  return {
    moduleId,
    locale,
    source: 'i18n',
    // System instructions will be resolved by the frontend hook using i18n
    systemInstructions: `[i18n:agents.${moduleId}.systemInstructions]`,
    actions,
    suggestions,
    readables,
    metadata: {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      customizedFeatures: [],
    },
  }
}

// =============================================================================
// REGISTRY HELPERS
// =============================================================================

function getActionsFromRegistry(moduleId: string): ActionDescription[] {
  try {
    const moduleActions = getActionsByModule(moduleId as ActionModule)

    return moduleActions.map(action => ({
      name: action.name,
      description: action.fallbackDescription,
      parameters: action.parameters.map(p => ({
        name: p.name,
        type: p.type,
        description: p.fallbackDescription,
        required: p.required ?? false,
        enum: p.enum,
        attributes: p.attributes?.map(a => ({
          name: a.name,
          type: a.type,
          description: a.fallbackDescription,
          required: a.required ?? false,
        })),
      })),
      category: action.category,
      isHITL: action.isHITL,
      hasRender: action.hasRender,
    }))
  } catch {
    return []
  }
}

function getSuggestionsFromRegistry(moduleId: string): SuggestionTemplate[] {
  try {
    const moduleSuggestions = getSuggestionsForModule(
      moduleId as SuggestionModule
    )

    return moduleSuggestions.map(s => ({
      key: s.key,
      instructions: s.fallbackInstructions,
      contextVariables: s.contextVariables,
      minSuggestions: s.minSuggestions,
      maxSuggestions: s.maxSuggestions,
    }))
  } catch {
    return []
  }
}

function getReadablesFromRegistry(moduleId: string): ReadableDescription[] {
  try {
    const moduleReadables = getReadablesForModule(moduleId as ReadableModule)

    return moduleReadables.map(r => ({
      key: r.key,
      description: r.fallbackDescription,
      contextKey: r.contextKey,
      category: r.category,
    }))
  } catch {
    return []
  }
}

// =============================================================================
// MERGE HELPERS (Platform + Registry)
// =============================================================================

function mergeActionsWithPlatform(
  moduleId: string,
  platformActions: { name: string; description: string }[]
): ActionDescription[] {
  const registryActions = getActionsFromRegistry(moduleId)
  const platformMap = new Map(platformActions.map(a => [a.name, a.description]))

  return registryActions.map(action => ({
    ...action,
    // Use platform description if available, otherwise keep registry
    description: platformMap.get(action.name) ?? action.description,
  }))
}

function mergeSuggestionsWithPlatform(
  moduleId: string,
  platformSuggestions: { key: string; instructions: string }[]
): SuggestionTemplate[] {
  const registrySuggestions = getSuggestionsFromRegistry(moduleId)
  const platformMap = new Map(
    platformSuggestions.map(s => [s.key, s.instructions])
  )

  return registrySuggestions.map(s => ({
    ...s,
    instructions: platformMap.get(s.key) ?? s.instructions,
  }))
}

function mergeReadablesWithPlatform(
  moduleId: string,
  platformReadables: { key: string; description: string }[]
): ReadableDescription[] {
  const registryReadables = getReadablesFromRegistry(moduleId)
  const platformMap = new Map(
    platformReadables.map(r => [r.key, r.description])
  )

  return registryReadables.map(r => ({
    ...r,
    description: platformMap.get(r.key) ?? r.description,
  }))
}

// =============================================================================
// MAIN RESOLVER
// =============================================================================

/**
 * Resolve unified configuration for a module/agent
 *
 * @param moduleId - Module or agent ID (e.g., 'atlas', 'feedback-analyzer')
 * @param options - Resolution options
 * @returns Unified configuration
 *
 * @example
 * ```typescript
 * // Backend usage with MCP
 * const config = await resolveUnifiedConfig('atlas', {
 *   locale: 'pt-BR',
 *   callMCPTool: mcpCaller
 * })
 *
 * // Frontend usage (i18n only)
 * const config = await resolveUnifiedConfig('atlas', {
 *   locale: 'en'
 * })
 * ```
 */
export async function resolveUnifiedConfig(
  moduleId: string,
  options: ResolveOptions
): Promise<UnifiedConfig> {
  const { locale } = options

  // Check cache first
  const cached = getFromCache(moduleId, locale)
  if (cached) {
    return cached
  }

  // Check manifest for customization
  const manifest = await getManifest(options)
  const isCustomized = isModuleCustomized(manifest, moduleId)

  // Resolve based on customization status
  const config = isCustomized
    ? await resolvePlatformConfig(moduleId, options)
    : resolveI18nConfig(moduleId, options)

  // Cache the result
  setCache(moduleId, locale, config)

  return config
}

/**
 * Clear the configuration cache
 */
export function clearConfigCache(): void {
  configCache.clear()
}

/**
 * Invalidate cache for a specific module
 */
export function invalidateModuleCache(moduleId: string): void {
  for (const key of configCache.keys()) {
    if (key.startsWith(`${moduleId}:`)) {
      configCache.delete(key)
    }
  }
}
