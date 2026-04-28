'use client'

/**
 * Chat Suggestions for Atlas Quick Agent
 *
 * Provides context-aware chat suggestions based on current module.
 * Based on: src/features/upstream/components/wizard/copilot-actions/chat-suggestions.tsx
 */
import { useMemo } from 'react'
import { useCopilotChatSuggestions } from '@copilotkit/react-ui'

import type { AtlasQuickAgentActionsProps } from './types'

// ============================================================================
// MODULE SUGGESTIONS
// ============================================================================

const MODULE_SUGGESTIONS: Record<string, string[]> = {
  upstream: [
    'Capture um insight sobre o produto',
    'Registre uma descoberta de pesquisa',
    'Anote uma oportunidade identificada',
  ],
  downstream: [
    'Reporte um bug encontrado',
    'Sugira uma melhoria tecnica',
    'Registre um blocker de implementacao',
  ],
  migration: [
    'Capture um risco de migracao',
    'Anote um aprendizado do processo',
    'Registre um blocker encontrado',
  ],
  onboarding: [
    'Capture feedback sobre o treinamento',
    'Identifique um gap de documentacao',
    'Anote um insight de aprendizado',
  ],
  dashboard: [
    'Capture uma ideia ou sugestao',
    'Registre um feedback geral',
    'Anote uma observacao importante',
  ],
}

// ============================================================================
// HOOK
// ============================================================================

export function useChatSuggestions(props: AtlasQuickAgentActionsProps) {
  const { userName, currentModule, namespaceName, isConnected, pathname } =
    props

  // Stable dependency key to prevent re-renders
  const suggestionsDependencyKey = useMemo(() => {
    return JSON.stringify({
      module: currentModule,
      pathname,
      isConnected,
      hasNamespace: !!namespaceName,
    })
  }, [currentModule, pathname, isConnected, namespaceName])

  // Build instructions based on context
  const suggestionsInstructions = useMemo(() => {
    const suggestions =
      MODULE_SUGGESTIONS[currentModule] || MODULE_SUGGESTIONS.dashboard

    return `Gere sugestoes de chat em portugues para o Atlas Quick Agent.

CONTEXTO:
- Usuario: ${userName}
- Modulo atual: ${currentModule}
- Namespace: ${namespaceName || 'Nao conectado'}
- Conexao MCP: ${isConnected ? 'Ativa' : 'Inativa'}

EXEMPLOS DE SUGESTOES PARA ESTE MODULO:
${suggestions.map(s => `- ${s}`).join('\n')}

OUTRAS SUGESTOES GERAIS:
- Buscar artefatos no namespace
- Listar signals recentes
- Navegar para outro modulo
- Executar um agente utilitario

Gere 3 sugestoes curtas e relevantes baseadas no contexto.`
  }, [userName, currentModule, namespaceName, isConnected])

  useCopilotChatSuggestions(
    {
      instructions: suggestionsInstructions,
      minSuggestions: 2,
      maxSuggestions: 3,
    },
    [suggestionsDependencyKey]
  )
}
