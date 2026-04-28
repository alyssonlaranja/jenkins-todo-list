import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUpstreamChat } from '../use-upstream-chat'

// Mock useChat from Vercel AI SDK (v6)
vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(() => ({
    messages: [],
    status: 'ready' as const,
    sendMessage: vi.fn(),
    stop: vi.fn(),
    setMessages: vi.fn(),
    error: undefined,
  })),
}))

describe('useUpstreamChat', () => {
  const mockConnection = {
    id: 'test-conn',
    title: 'Test Connection',
    subtitle: 'Test Environment',
    status: 'connected' as const,
    environmentRef: {
      environmentId: 'test-env-id',
      environmentName: 'Test Environment',
      licenseId: 'test-license-id',
      licenseName: 'Test License',
      namespaceId: 'test-namespace-id',
      namespaceName: 'test-namespace',
      utilityAgentId: 'test-agent-id',
      utilityAgentName: 'Test Agent',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with agent name', () => {
    const { result } = renderHook(() =>
      useUpstreamChat(mockConnection, 'Ideação Agent', 'EPIC_001')
    )

    expect(result.current).toBeDefined()
    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should send message to agent', async () => {
    const { useChat } = await import('@ai-sdk/react')
    const mockSendMessage = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useChat).mockReturnValue({
      messages: [],
      status: 'ready' as const,
      sendMessage: mockSendMessage,
      stop: vi.fn(),
      setMessages: vi.fn(),
      error: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const { result } = renderHook(() =>
      useUpstreamChat(mockConnection, 'Ideação Agent', 'EPIC_001')
    )

    await act(async () => {
      await result.current.sendMessage('Test prompt')
    })

    expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Test prompt' })
  })

  it('should parse AI suggestions from response', async () => {
    const { useChat } = await import('@ai-sdk/react')

    const mockMessages = [
      {
        id: '1',
        role: 'user' as const,
        parts: [{ type: 'text' as const, text: 'Analyze epic' }],
      },
      {
        id: '2',
        role: 'assistant' as const,
        parts: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              suggestedOKRs: [{ id: 1, title: 'OKR 1', rationale: 'Test' }],
              businessValue: 75,
              stakeholders: [],
            }),
          },
        ],
      },
    ]

    vi.mocked(useChat).mockReturnValue({
      messages: mockMessages,
      status: 'ready' as const,
      sendMessage: vi.fn(),
      stop: vi.fn(),
      setMessages: vi.fn(),
      error: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const { result } = renderHook(() =>
      useUpstreamChat(mockConnection, 'Ideação Agent', 'EPIC_001')
    )

    expect(result.current.suggestions).toBeDefined()
    expect(result.current.suggestions?.suggestedOKRs).toHaveLength(1)
    expect(result.current.suggestions?.businessValue).toBe(75)
  })
})
