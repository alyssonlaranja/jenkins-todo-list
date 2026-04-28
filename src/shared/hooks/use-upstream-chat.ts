import { useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'

import { Connection } from '@/features/connections/types/connection'

interface AISuggestions {
  suggestedOKRs?: Array<{
    id: number
    title: string
    rationale: string
  }>
  businessValue?: number
  businessValueRationale?: string
  stakeholders?: Array<{
    name: string
    role: string
    department: string
    rationale: string
  }>
  initialRisks?: Array<{
    id: number
    description: string
    severity: 'low' | 'medium' | 'high'
  }>
}

export function useUpstreamChat(
  connection: Connection,
  agentName: string,
  epicId: string
) {
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/upstream-agents/chat',
      body: {
        connectionId: connection.id,
        namespace: connection.environmentRef.namespaceName,
        licenseId: connection.environmentRef.licenseId,
        agentName,
        epicId,
      },
    }),
    onError: err => {
      console.error('Chat error:', err)
    },
  })

  // Parse AI suggestions from last assistant message
  const suggestions = useMemo<AISuggestions | null>(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') {
      return null
    }

    try {
      // Extract text from parts array (AI SDK v6)
      const textContent = lastMessage.parts
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('')

      // Try to parse as JSON
      return JSON.parse(textContent)
    } catch {
      // If not JSON, try to extract structured data from text
      // This handles cases where AI returns formatted text instead of JSON
      return null
    }
  }, [messages])

  const send = async (content: string) => {
    await sendMessage({ text: content })
  }

  const clearMessages = () => {
    setMessages([])
  }

  return {
    messages,
    suggestions,
    sendMessage: send,
    clearMessages,
    stop,
    isLoading: status === 'submitted' || status === 'streaming',
    error,
  }
}
