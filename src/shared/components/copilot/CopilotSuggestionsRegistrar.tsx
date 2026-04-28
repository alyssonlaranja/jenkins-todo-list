'use client'

import { useCopilotChatSuggestions } from '@copilotkit/react-ui'

import type { SuggestionTemplate } from '@/agents/shared/types/unified-config'

export type SuggestionContextProvider = () => Record<string, string | number>

interface CopilotSuggestionsRegistrarProps {
  template: SuggestionTemplate | null
  contextProvider: SuggestionContextProvider
}

export function CopilotSuggestionsRegistrar({
  template,
  contextProvider,
}: CopilotSuggestionsRegistrarProps) {
  const context = contextProvider()

  const instructions = template
    ? interpolateTemplate(template.instructions, context)
    : ''

  useCopilotChatSuggestions({
    instructions,
    minSuggestions: template?.minSuggestions ?? 1,
    maxSuggestions: template?.maxSuggestions ?? 3,
  })

  return null
}

function interpolateTemplate(
  template: string,
  context: Record<string, string | number>
): string {
  return template.replace(/\$\{(\w+)\}/g, (_, key) => {
    const value = context[key]
    return value !== undefined ? String(value) : `[${key}]`
  })
}

export default CopilotSuggestionsRegistrar
