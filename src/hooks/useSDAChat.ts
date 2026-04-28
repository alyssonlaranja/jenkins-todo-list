'use client'

import { useCallback, useState } from 'react'

export interface SDAAgentType {
  id: string
  name: string
  type: 'analyst' | 'po' | 'pm' | 'ux' | 'architect'
  description: string
}

interface SDAMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: Date
}

export function useSDAChat(agentType: string, initiativeId?: string) {
  const [messages, setMessages] = useState<SDAMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return

      const userMessage: SDAMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date(),
      }

      setMessages(prev => [...prev, userMessage])
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/sda-agents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(msg => ({
              role: msg.role,
              content: msg.content,
              id: msg.id,
            })),
            agentType,
            initiativeId,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let assistantContent = ''

        const assistantMessage: SDAMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '',
          createdAt: new Date(),
        }

        setMessages(prev => [...prev, assistantMessage])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.content) {
                  assistantContent += data.content
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: assistantContent }
                        : msg
                    )
                  )
                }
              } catch (e) {
                // Ignore parse errors for streaming data
              }
            }
          }
        }
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Unknown error')
        setError(errorObj)
        console.error('❌ SDA Chat error:', errorObj)
      } finally {
        setIsLoading(false)
      }
    },
    [messages, agentType, initiativeId]
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (input.trim()) {
        await sendMessage(input.trim())
        setInput('')
      }
    },
    [input, sendMessage]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value)
    },
    []
  )

  const stop = useCallback(() => {
    setIsLoading(false)
  }, [])

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    sendMessage,
    stop,
  }
}

// Available SDA Agents following cockpit pattern
export const SDA_AGENTS: SDAAgentType[] = [
  {
    id: 'analyst',
    name: 'Maria - Analista de Negócios',
    type: 'analyst',
    description: 'Especialista em captura de requisitos e análise de processos',
  },
  {
    id: 'po',
    name: 'Paula - Product Owner',
    type: 'po',
    description: 'Gestão de produto e priorização de backlog',
  },
  {
    id: 'pm',
    name: 'João - Project Manager',
    type: 'pm',
    description: 'Gerenciamento de projetos e coordenação de stakeholders',
  },
  {
    id: 'ux',
    name: 'Sofia - UX Designer',
    type: 'ux',
    description: 'Design de experiência do usuário e prototipagem',
  },
  {
    id: 'architect',
    name: 'Wilson - Software Architect',
    type: 'architect',
    description: 'Arquitetura de software e decisões técnicas',
  },
]
