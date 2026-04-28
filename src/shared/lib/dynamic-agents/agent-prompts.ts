/**
 * Agent Prompts Utility
 *
 * Provides functions to retrieve agent prompts from i18n system.
 * This allows LangGraph and DeepAgents to use localized system prompts.
 */
import i18n from '@/shared/i18n/core/config'
import type { SupportedLanguage } from '@/shared/i18n/core/types'

/**
 * Agent prompt paths in the i18n system
 */
export const AGENT_PROMPT_PATHS = {
  // LangGraph Agents
  'feedback-analyzer': {
    systemPrompt: 'feedback.analyzer.systemPrompt',
    instruction: 'feedback.analyzer.instruction',
  },
  'training-analyzer': {
    systemPrompt: 'training.analyzer.systemPrompt',
    instruction: 'training.analyzer.instruction',
  },

  // DeepAgents
  'feedback-deep-agent': {
    systemPrompt: 'feedback.deepAgent.systemPrompt',
    instruction: 'feedback.deepAgent.instruction',
    subagents: {
      'pattern-analyzer':
        'feedback.deepAgent.subagents.patternAnalyzer.systemPrompt',
      'resolution-advisor':
        'feedback.deepAgent.subagents.resolutionAdvisor.systemPrompt',
    },
  },
  'training-deep-agent': {
    systemPrompt: 'training.deepAgent.systemPrompt',
    instruction: 'training.deepAgent.instruction',
    subagents: {
      'content-writer':
        'training.deepAgent.subagents.contentWriter.systemPrompt',
      'quiz-specialist':
        'training.deepAgent.subagents.quizSpecialist.systemPrompt',
      'structure-advisor':
        'training.deepAgent.subagents.structureAdvisor.systemPrompt',
    },
  },
} as const

export type AgentPromptId = keyof typeof AGENT_PROMPT_PATHS

/**
 * Context variables that can be interpolated into prompts
 */
export interface PromptContext {
  USER_NAME?: string
  USER_ROLE?: string
  CURRENT_NAMESPACE?: string
  CURRENT_LICENSE?: string
  CURRENT_MODULE?: string
  CURRENT_ENV?: string
  EPIC_NAME?: string
  CURRENT_STAGE?: string
  [key: string]: string | undefined
}

/**
 * Get a nested value from an object using dot notation
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
 * Get translation from agents namespace using resource bundle
 */
function getAgentTranslation(
  path: string,
  locale: SupportedLanguage = 'en'
): string {
  const bundle = i18n.getResourceBundle(locale, 'agents') as Record<
    string,
    unknown
  >
  if (!bundle) return ''

  const value = getNestedValue(bundle, path)
  return typeof value === 'string' ? value : ''
}

/**
 * Get the language-specific instruction from common namespace
 */
export function getLanguageInstruction(
  locale: SupportedLanguage = 'en'
): string {
  return getAgentTranslation('common.languageInstruction', locale)
}

/**
 * Interpolate context variables into a prompt
 */
export function interpolatePrompt(
  prompt: string,
  context?: PromptContext
): string {
  if (!context) return prompt

  let result = prompt

  // Replace ${LANGUAGE_INSTRUCTION} with the actual instruction
  if (result.includes('${LANGUAGE_INSTRUCTION}')) {
    const langInstruction = context.LANGUAGE_INSTRUCTION || ''
    result = result.replace(/\$\{LANGUAGE_INSTRUCTION\}/g, langInstruction)
  }

  // Replace other context variables
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined) {
      const pattern = new RegExp(`\\$\\{${key}\\}`, 'g')
      result = result.replace(pattern, value)
    }
  }

  return result
}

/**
 * Get the system prompt for a LangGraph or DeepAgent
 */
export function getAgentSystemPrompt(
  agentId: AgentPromptId,
  locale: SupportedLanguage = 'en',
  context?: PromptContext
): string {
  const paths = AGENT_PROMPT_PATHS[agentId]
  if (!paths) {
    return ''
  }

  const prompt = getAgentTranslation(paths.systemPrompt, locale)

  if (!prompt) {
    return ''
  }

  // Add language instruction to context
  const fullContext: PromptContext = {
    ...context,
    LANGUAGE_INSTRUCTION: getLanguageInstruction(locale),
  }

  return interpolatePrompt(prompt, fullContext)
}

/**
 * Get the instruction (lighter version) for an agent
 */
export function getAgentInstruction(
  agentId: AgentPromptId,
  locale: SupportedLanguage = 'en',
  context?: PromptContext
): string {
  const paths = AGENT_PROMPT_PATHS[agentId]
  if (!paths) {
    return ''
  }

  const instruction = getAgentTranslation(paths.instruction, locale)

  if (!instruction) {
    return ''
  }

  const fullContext: PromptContext = {
    ...context,
    LANGUAGE_INSTRUCTION: getLanguageInstruction(locale),
  }

  return interpolatePrompt(instruction, fullContext)
}

/**
 * Get the system prompt for a subagent
 */
export function getSubagentSystemPrompt(
  parentAgentId: 'feedback-deep-agent' | 'training-deep-agent',
  subagentId: string,
  locale: SupportedLanguage = 'en',
  context?: PromptContext
): string {
  const paths = AGENT_PROMPT_PATHS[parentAgentId]
  if (!paths || !('subagents' in paths)) {
    return ''
  }

  const subagentPath = (paths.subagents as Record<string, string>)[subagentId]
  if (!subagentPath) {
    return ''
  }

  const prompt = getAgentTranslation(subagentPath, locale)

  if (!prompt) {
    return ''
  }

  const fullContext: PromptContext = {
    ...context,
    LANGUAGE_INSTRUCTION: getLanguageInstruction(locale),
  }

  return interpolatePrompt(prompt, fullContext)
}

/**
 * Get all prompts for an agent (including subagents if applicable)
 */
export function getAgentPrompts(
  agentId: AgentPromptId,
  locale: SupportedLanguage = 'en',
  context?: PromptContext
): {
  systemPrompt: string
  instruction: string
  subagents?: Record<string, string>
} {
  const result: {
    systemPrompt: string
    instruction: string
    subagents?: Record<string, string>
  } = {
    systemPrompt: getAgentSystemPrompt(agentId, locale, context),
    instruction: getAgentInstruction(agentId, locale, context),
  }

  // Add subagent prompts if this is a DeepAgent
  const paths = AGENT_PROMPT_PATHS[agentId]
  if (paths && 'subagents' in paths) {
    const subagentPrompts: Record<string, string> = {}

    for (const subagentId of Object.keys(paths.subagents)) {
      subagentPrompts[subagentId] = getSubagentSystemPrompt(
        agentId as 'feedback-deep-agent' | 'training-deep-agent',
        subagentId,
        locale,
        context
      )
    }

    result.subagents = subagentPrompts
  }

  return result
}

/**
 * Server-side function to get prompts (for use in API routes)
 * Ensures resources are loaded before fetching prompts
 */
export async function getAgentPromptsAsync(
  agentId: AgentPromptId,
  locale: SupportedLanguage = 'en',
  context?: PromptContext
): Promise<{
  systemPrompt: string
  instruction: string
  subagents?: Record<string, string>
}> {
  // Ensure resources are loaded for the locale
  const { loadResourcesFor } =
    await import('@/shared/i18n/utils/resource-loader')
  await loadResourcesFor(locale)

  return getAgentPrompts(agentId, locale, context)
}
