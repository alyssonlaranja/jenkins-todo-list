'use client'

import { useCallback, useState } from 'react'

/**
 * Result from Deep Agent invocation
 */
interface DeepAgentResult {
  success: boolean
  result: string
  namespace: string
}

/**
 * State for the Deep Agent hook
 */
interface UseDeepAgentState {
  result: DeepAgentResult | null
  isLoading: boolean
  error: string | null
}

/**
 * Hook for using the Feedback Deep Agent
 *
 * Provides a React hook for invoking the Deep Agent API
 * with streaming support and state management.
 *
 * @example
 * ```tsx
 * const { invoke, result, isLoading, error } = useFeedbackDeepAgent()
 *
 * const handleAnalyze = async () => {
 *   await invoke('Analyze all bug reports from last week')
 * }
 * ```
 */
export function useFeedbackDeepAgent() {
  const [state, setState] = useState<UseDeepAgentState>({
    result: null,
    isLoading: false,
    error: null,
  })

  const invoke = useCallback(async (message: string, namespace?: string) => {
    setState({ result: null, isLoading: true, error: null })

    try {
      const response = await fetch('/api/agents/feedback-deep-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, namespace }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to invoke agent')
      }

      const data = await response.json()
      setState({ result: data, isLoading: false, error: null })
      return data
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      setState({ result: null, isLoading: false, error: errorMessage })
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setState({ result: null, isLoading: false, error: null })
  }, [])

  return {
    invoke,
    result: state.result,
    isLoading: state.isLoading,
    error: state.error,
    reset,
  }
}
