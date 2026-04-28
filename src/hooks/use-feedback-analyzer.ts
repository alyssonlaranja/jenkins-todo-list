/**
 * Hook para usar o Feedback Analyzer Agent
 *
 * Fornece uma interface React para o agente LangGraph de análise de feedback
 */
import { useCallback, useState } from 'react'

import type {
  DuplicateCheck,
  FeedbackAnalysis,
  FeedbackPriority,
  FeedbackResolution,
} from '@/agents/feedback-analyzer'

export interface FeedbackAnalyzerResult {
  analysis: FeedbackAnalysis | null
  duplicates: DuplicateCheck | null
  priority: FeedbackPriority | null
  resolution: FeedbackResolution | null
}

export interface MCPConfig {
  mcpServerUrl: string
  mcpHeaders: Record<string, string>
  feedbackPattern?: string
}

export interface UseFeedbackAnalyzerReturn {
  analyze: (input: {
    feedbackId?: string
    title: string
    description: string
    currentCategory?: string
    existingFeedbacks?: Array<{
      id: string
      title: string
      description: string
    }>
    mcpConfig?: MCPConfig
  }) => Promise<FeedbackAnalyzerResult | null>
  result: FeedbackAnalyzerResult | null
  isLoading: boolean
  error: string | null
  reset: () => void
}

/**
 * Hook para analisar feedback usando o LangGraph agent
 *
 * @example
 * ```tsx
 * const { analyze, result, isLoading, error } = useFeedbackAnalyzer()
 *
 * const handleAnalyze = async () => {
 *   await analyze({
 *     title: "Botão não funciona",
 *     description: "O botão de submit não responde quando clicado",
 *     mcpConfig: { mcpServerUrl: "...", mcpHeaders: {...} }
 *   })
 * }
 *
 * if (result) {
 *   console.log(result.analysis?.suggestedCategory) // "bug"
 *   console.log(result.priority?.level) // "high"
 * }
 * ```
 */
export function useFeedbackAnalyzer(): UseFeedbackAnalyzerReturn {
  const [result, setResult] = useState<FeedbackAnalyzerResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(
    async (input: {
      feedbackId?: string
      title: string
      description: string
      currentCategory?: string
      existingFeedbacks?: Array<{
        id: string
        title: string
        description: string
      }>
      mcpConfig?: MCPConfig
    }): Promise<FeedbackAnalyzerResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        // Build request body with optional MCP config for server-side fetching
        const requestBody = {
          title: input.title,
          description: input.description,
          currentCategory: input.currentCategory,
          existingFeedbacks: input.existingFeedbacks,
          // Include feedbackId to persist analysis as comment
          ...(input.feedbackId && {
            feedbackId: input.feedbackId,
            persistComment: true,
          }),
          // Include MCP config if provided (for server-side feedback fetching)
          ...(input.mcpConfig && {
            mcpServerUrl: input.mcpConfig.mcpServerUrl,
            mcpHeaders: input.mcpConfig.mcpHeaders,
            feedbackPattern: input.mcpConfig.feedbackPattern || '.*FEEDBACK.*',
          }),
        }

        const response = await fetch('/api/agents/feedback-analyzer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to analyze feedback')
        }

        const analysisResult: FeedbackAnalyzerResult = {
          analysis: data.data.analysis,
          duplicates: data.data.duplicates,
          priority: data.data.priority,
          resolution: data.data.resolution,
        }

        setResult(analysisResult)
        return analysisResult
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    analyze,
    result,
    isLoading,
    error,
    reset,
  }
}
