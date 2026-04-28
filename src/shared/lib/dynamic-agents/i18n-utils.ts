/**
 * Dynamic Agents i18n Utilities
 *
 * Utilities for resolving agent translations based on locale.
 * Supports the globaladmin deploy flow where locale is selected
 * at deployment time for a specific namespace/license.
 *
 * @see DYNAMIC_AGENTS_MODULE_PROPOSAL.md
 */

import type { AgentsTranslation, SupportedLanguage } from '@/shared/i18n'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Agent translation key path (e.g., 'atlas.quick', 'feedback.deepAgent')
 */
export type AgentTranslationPath =
  | 'atlas.quick'
  | 'kanban.main'
  | 'upstream.wizard'
  | 'downstream.wizard'
  | 'migration.wizard'
  | 'onboarding.wizard'
  | 'onboarding.manifest'
  | 'feedback.hub'
  | 'feedback.analyzer'
  | 'feedback.deepAgent'
  | 'training.analyzer'
  | 'training.deepAgent'

/**
 * Resolved agent translation
 */
export interface ResolvedAgentTranslation {
  name: string
  description: string
  objective: string
  instruction: string
}

/**
 * Context variables for instruction interpolation
 */
export interface AgentContextVariables {
  USER_NAME?: string
  USER_ROLE?: string
  CURRENT_NAMESPACE?: string
  CURRENT_MODULE?: string
  CURRENT_STAGE?: string
  EPIC_NAME?: string
  PROJECT_NAME?: string
  SOURCE_ENV?: string
  TARGET_ENV?: string
  LANGUAGE_INSTRUCTION?: string
  [key: string]: string | undefined
}

// ============================================================================
// LAZY LOADED TRANSLATIONS
// ============================================================================

/**
 * Cache for loaded agent translations by locale
 */
const translationCache: Map<SupportedLanguage, AgentsTranslation> = new Map()

/**
 * Load agent translations for a specific locale
 */
async function loadAgentTranslations(
  locale: SupportedLanguage
): Promise<AgentsTranslation> {
  // Check cache first
  const cached = translationCache.get(locale)
  if (cached) return cached

  try {
    // Dynamic import based on locale
    let translations: AgentsTranslation

    switch (locale) {
      case 'pt-BR':
        translations = (await import('@/shared/i18n/locales/pt-BR/agents.json'))
          .default as AgentsTranslation
        break
      case 'ja':
        translations = (await import('@/shared/i18n/locales/ja/agents.json'))
          .default as AgentsTranslation
        break
      case 'en':
      default:
        translations = (await import('@/shared/i18n/locales/en/agents.json'))
          .default as AgentsTranslation
        break
    }

    translationCache.set(locale, translations)
    return translations
  } catch (error) {
    console.warn(
      `[i18n-utils] Failed to load agent translations for locale: ${locale}`,
      error
    )
    // Fallback to English
    const fallback = (await import('@/shared/i18n/locales/en/agents.json'))
      .default as AgentsTranslation
    return fallback
  }
}

// ============================================================================
// TRANSLATION RESOLUTION
// ============================================================================

/**
 * Get agent translation by path
 *
 * @param path - Translation path (e.g., 'atlas.quick')
 * @param locale - Target locale
 * @returns Resolved translation or null
 *
 * @example
 * ```typescript
 * const translation = await getAgentTranslation('atlas.quick', 'pt-BR')
 * // { name: 'Agente Atlas Rápido', description: '...', ... }
 * ```
 */
export async function getAgentTranslation(
  path: AgentTranslationPath,
  locale: SupportedLanguage = 'en'
): Promise<ResolvedAgentTranslation | null> {
  try {
    const translations = await loadAgentTranslations(locale)

    // Parse the path (e.g., 'atlas.quick' -> ['atlas', 'quick'])
    const [category, subKey] = path.split('.') as [string, string]

    // Navigate to the translation
    const categoryTranslations = translations[
      category as keyof AgentsTranslation
    ] as Record<string, ResolvedAgentTranslation>

    if (!categoryTranslations || !categoryTranslations[subKey]) {
      console.warn(`[i18n-utils] Translation not found for path: ${path}`)
      return null
    }

    return categoryTranslations[subKey]
  } catch (error) {
    console.error(`[i18n-utils] Error getting translation for ${path}:`, error)
    return null
  }
}

/**
 * Get the language instruction for a locale
 */
export async function getLanguageInstruction(
  locale: SupportedLanguage = 'en'
): Promise<string> {
  const translations = await loadAgentTranslations(locale)
  return translations.common?.languageInstruction || 'Respond in English.'
}

// ============================================================================
// INSTRUCTION INTERPOLATION
// ============================================================================

/**
 * Interpolate context variables in an instruction string
 *
 * Replaces ${VARIABLE_NAME} patterns with actual values.
 * Special handling for ${LANGUAGE_INSTRUCTION} to inject locale-specific instruction.
 *
 * @param instruction - Raw instruction with placeholders
 * @param context - Variable values
 * @param locale - Target locale for LANGUAGE_INSTRUCTION
 * @returns Interpolated instruction
 *
 * @example
 * ```typescript
 * const result = await interpolateInstruction(
 *   'Hello ${USER_NAME}! ${LANGUAGE_INSTRUCTION}',
 *   { USER_NAME: 'John' },
 *   'pt-BR'
 * )
 * // 'Hello John! SEMPRE responda em Português do Brasil.'
 * ```
 */
export async function interpolateInstruction(
  instruction: string,
  context: AgentContextVariables = {},
  locale: SupportedLanguage = 'en'
): Promise<string> {
  // Get language instruction for the locale
  const languageInstruction = await getLanguageInstruction(locale)

  // Merge language instruction into context
  const fullContext: AgentContextVariables = {
    ...context,
    LANGUAGE_INSTRUCTION: languageInstruction,
  }

  // Replace all ${VARIABLE} patterns
  return instruction.replace(/\$\{([A-Z_]+)\}/g, (match, varName) => {
    const value = fullContext[varName]
    if (value !== undefined) {
      return value
    }
    // Keep the placeholder if not resolved
    console.warn(`[i18n-utils] Unresolved variable: ${varName}`)
    return match
  })
}

// ============================================================================
// COMPLETE AGENT CONFIG RESOLUTION
// ============================================================================

/**
 * Resolve complete agent configuration with translations and context
 *
 * This is the main function for resolving agent fallback configs
 * with proper i18n support.
 *
 * @param path - Translation path
 * @param locale - Target locale
 * @param context - Runtime context variables
 * @returns Complete resolved agent config
 *
 * @example
 * ```typescript
 * const config = await resolveAgentConfig(
 *   'atlas.quick',
 *   'pt-BR',
 *   {
 *     USER_NAME: 'Maria',
 *     CURRENT_NAMESPACE: 'production',
 *     CURRENT_MODULE: 'dashboard'
 *   }
 * )
 * ```
 */
export async function resolveAgentConfig(
  path: AgentTranslationPath,
  locale: SupportedLanguage = 'en',
  context: AgentContextVariables = {}
): Promise<ResolvedAgentTranslation | null> {
  const translation = await getAgentTranslation(path, locale)

  if (!translation) {
    return null
  }

  // Interpolate the instruction with context
  const interpolatedInstruction = await interpolateInstruction(
    translation.instruction,
    context,
    locale
  )

  return {
    ...translation,
    instruction: interpolatedInstruction,
  }
}

// ============================================================================
// DEPLOY LOCALE MANAGEMENT
// ============================================================================

/**
 * Deploy locale configuration
 * Used when globaladmin deploys an agent to a specific namespace/license
 */
export interface DeployLocaleConfig {
  /** The locale selected for this deployment */
  locale: SupportedLanguage
  /** Namespace where the agent is deployed */
  namespace: string
  /** License ID */
  licenseId: string
  /** Agent platform name */
  agentName: string
  /** Timestamp of deployment */
  deployedAt: string
}

/**
 * Artifact key for storing deploy locale config
 */
export function getDeployLocaleArtifactKey(agentName: string): string {
  return `AGENT_DEPLOY_LOCALE_${agentName}`
}

/**
 * Create deploy locale artifact content
 */
export function createDeployLocaleArtifact(config: DeployLocaleConfig): string {
  return JSON.stringify(config, null, 2)
}

/**
 * Parse deploy locale artifact content
 */
export function parseDeployLocaleArtifact(
  content: string
): DeployLocaleConfig | null {
  try {
    return JSON.parse(content) as DeployLocaleConfig
  } catch {
    return null
  }
}

// ============================================================================
// SUPPORTED LOCALES FOR AGENTS
// ============================================================================

/**
 * Locales supported for agent deployment
 */
export const AGENT_DEPLOY_LOCALES: Array<{
  code: SupportedLanguage
  name: string
  nativeName: string
}> = [
  { code: 'en', name: 'English', nativeName: 'English' },
  {
    code: 'pt-BR',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
  },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
]

/**
 * Default locale for agent deployment
 */
export const DEFAULT_AGENT_DEPLOY_LOCALE: SupportedLanguage = 'en'
