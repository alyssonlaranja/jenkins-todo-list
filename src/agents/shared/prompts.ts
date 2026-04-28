/**
 * Server-side prompt loading for LangGraph and DeepAgents
 *
 * This module loads prompts from the i18n JSON files for use in backend agents.
 * Unlike the client-side getAgentPrompts, this reads directly from the JSON files.
 *
 * @module agents/shared/prompts
 */
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

// Supported locales
export type ServerLocale = 'en' | 'pt-BR' | 'ja'

// Prompt context for interpolation
export interface PromptContext {
  /** User display name */
  userName?: string
  /** Current namespace name */
  namespaceName?: string
  /** Current timestamp */
  timestamp?: string
  /** Any additional context */
  [key: string]: string | undefined
}

// Cache for loaded translations
const translationCache: Record<string, Record<string, unknown>> = {}

/**
 * Load agents.json for a given locale
 */
function loadAgentsTranslations(
  locale: ServerLocale
): Record<string, unknown> | null {
  const cacheKey = `agents_${locale}`

  if (translationCache[cacheKey]) {
    return translationCache[cacheKey]
  }

  // Try different paths (for development vs production)
  const possiblePaths = [
    join(process.cwd(), 'src/shared/i18n/locales', locale, 'agents.json'),
    join(process.cwd(), 'locales', locale, 'agents.json'),
    join(__dirname, `../../../shared/i18n/locales/${locale}/agents.json`),
  ]

  for (const filePath of possiblePaths) {
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8')
        const translations = JSON.parse(content)
        translationCache[cacheKey] = translations
        return translations
      } catch {
        // Continue trying other paths
      }
    }
  }

  return null
}

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Interpolate prompt template with context variables
 *
 * Replaces {{variable}} patterns with context values
 */
export function interpolatePrompt(
  template: string,
  context?: PromptContext
): string {
  if (!context) return template

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key]
    return value !== undefined ? value : match
  })
}

// ============================================================================
// MAIN PROMPT GETTERS
// ============================================================================

/**
 * Get system prompt for a LangGraph agent
 *
 * @param agentId - Agent identifier (e.g., 'feedback-analyzer', 'training-analyzer')
 * @param locale - Locale to use (default: 'en')
 * @param context - Optional context for variable interpolation
 * @returns System prompt string, or fallback if not found
 *
 * @example
 * ```typescript
 * const prompt = getSystemPrompt('feedback-analyzer', 'en')
 * // Returns the full system prompt from agents.json
 * ```
 */
export function getSystemPrompt(
  agentId: 'feedback-analyzer' | 'training-analyzer',
  locale: ServerLocale = 'en',
  context?: PromptContext
): string {
  const translations = loadAgentsTranslations(locale)
  if (!translations) {
    return getFallbackSystemPrompt(agentId)
  }

  // Map agentId to translation path
  const pathMap: Record<string, string> = {
    'feedback-analyzer': 'feedback.analyzer.systemPrompt',
    'training-analyzer': 'training.analyzer.systemPrompt',
  }

  const path = pathMap[agentId]
  if (!path) {
    return getFallbackSystemPrompt(agentId)
  }

  const prompt = getNestedValue(translations, path)
  if (typeof prompt !== 'string') {
    return getFallbackSystemPrompt(agentId)
  }

  return interpolatePrompt(prompt, context)
}

/**
 * Get system prompt for a DeepAgent
 *
 * @param agentId - DeepAgent identifier
 * @param locale - Locale to use (default: 'en')
 * @param context - Optional context for variable interpolation
 * @returns System prompt string
 */
export function getDeepAgentSystemPrompt(
  agentId: 'feedback-deep-agent' | 'training-deep-agent',
  locale: ServerLocale = 'en',
  context?: PromptContext
): string {
  const translations = loadAgentsTranslations(locale)
  if (!translations) {
    return getFallbackDeepAgentPrompt(agentId)
  }

  const pathMap: Record<string, string> = {
    'feedback-deep-agent': 'feedback.deepAgent.systemPrompt',
    'training-deep-agent': 'training.deepAgent.systemPrompt',
  }

  const path = pathMap[agentId]
  if (!path) {
    return getFallbackDeepAgentPrompt(agentId)
  }

  const prompt = getNestedValue(translations, path)

  if (typeof prompt !== 'string') {
    return getFallbackDeepAgentPrompt(agentId)
  }

  return interpolatePrompt(prompt, context)
}

/**
 * Get subagent system prompt for DeepAgents
 *
 * @param parentAgentId - Parent agent identifier
 * @param subagentId - Subagent identifier (e.g., 'patternAnalyzer', 'contentWriter')
 * @param locale - Locale to use
 * @param context - Optional context
 * @returns Subagent system prompt
 *
 * @example
 * ```typescript
 * const prompt = getSubagentPrompt('feedback-deep-agent', 'patternAnalyzer', 'en')
 * ```
 */
export function getSubagentPrompt(
  parentAgentId: 'feedback-deep-agent' | 'training-deep-agent',
  subagentId: string,
  locale: ServerLocale = 'en',
  context?: PromptContext
): string {
  const translations = loadAgentsTranslations(locale)
  if (!translations) {
    return getFallbackSubagentPrompt(subagentId)
  }

  const parentPathMap: Record<string, string> = {
    'feedback-deep-agent': 'feedback.deepAgent',
    'training-deep-agent': 'training.deepAgent',
  }

  const parentPath = parentPathMap[parentAgentId]
  if (!parentPath) {
    return getFallbackSubagentPrompt(subagentId)
  }

  const path = `${parentPath}.subagents.${subagentId}.systemPrompt`
  const prompt = getNestedValue(translations, path)

  if (typeof prompt !== 'string') {
    return getFallbackSubagentPrompt(subagentId)
  }

  return interpolatePrompt(prompt, context)
}

/**
 * Get agent instruction (short instruction for quick context)
 */
export function getAgentInstruction(
  agentId: 'feedback-analyzer' | 'training-analyzer',
  locale: ServerLocale = 'en',
  context?: PromptContext
): string {
  const translations = loadAgentsTranslations(locale)
  if (!translations) {
    return ''
  }

  const pathMap: Record<string, string> = {
    'feedback-analyzer': 'feedback.analyzer.instruction',
    'training-analyzer': 'training.analyzer.instruction',
  }

  const path = pathMap[agentId]
  if (!path) {
    return ''
  }

  const instruction = getNestedValue(translations, path)

  if (typeof instruction !== 'string') {
    return ''
  }

  return interpolatePrompt(instruction, context)
}

// ============================================================================
// FALLBACK PROMPTS (when i18n fails)
// ============================================================================

function getFallbackSystemPrompt(agentId: string): string {
  const fallbacks: Record<string, string> = {
    'feedback-analyzer': `You are an AI assistant that helps analyze and categorize feedback.
Be concise and structured in your analysis. Use the tools provided to perform each step.`,
    'training-analyzer': `You are an AI Training Studio assistant that analyzes documents and creates training structures.
Use the provided tools to extract content, propose structures, and generate quizzes.`,
  }
  return fallbacks[agentId] || 'You are a helpful AI assistant.'
}

function getFallbackDeepAgentPrompt(agentId: string): string {
  const fallbacks: Record<string, string> = {
    'feedback-deep-agent': `You are an advanced feedback analysis agent with specialized subagents.
Coordinate pattern-analyzer for detecting trends and resolution-advisor for suggesting solutions.`,
    'training-deep-agent': `You are an advanced training content agent with specialized subagents.
Coordinate content-writer, quiz-specialist, and structure-advisor for comprehensive training development.`,
  }
  return fallbacks[agentId] || 'You are an advanced AI orchestrator.'
}

function getFallbackSubagentPrompt(subagentId: string): string {
  return `You are a specialized ${subagentId} subagent. Be concise and focused on your task.`
}

// ============================================================================
// EXPORTS FOR CONVENIENCE
// ============================================================================

export const AgentPrompts = {
  getSystemPrompt,
  getDeepAgentSystemPrompt,
  getSubagentPrompt,
  getAgentInstruction,
  interpolatePrompt,
}

export default AgentPrompts
