import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { cockpitApiClient } from '@/shared/lib/cockpit/api-client'

import { useBootstrapAgent } from '../use-bootstrap-agent'

// Mock cockpitApiClient
vi.mock('@/shared/lib/cockpit/api-client', () => ({
  cockpitApiClient: {
    ensureBootstrapUtilityAgent: vi.fn(),
  },
}))

describe('useBootstrapAgent', () => {
  const mockNamespaceId = 'namespace-uuid-123'
  const mockAgent = {
    id: 'agent-uuid-456',
    name: 'MCP Portal Agent',
    type: 'Standard' as const,
    description: 'Auto-created utility agent for MCP Portal',
    namespace_id: mockNamespaceId,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully ensure agent exists', async () => {
    // Mock successful agent creation
    vi.mocked(cockpitApiClient.ensureBootstrapUtilityAgent).mockResolvedValue(
      mockAgent
    )

    const { result } = renderHook(() => useBootstrapAgent(mockNamespaceId))

    // Initially not loading
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)

    // Call ensureAgent and wait for completion
    const agent = await result.current.ensureAgent()

    // Should have correct agent
    expect(agent).toEqual(mockAgent)

    // Should not be loading after completion
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    // Should have called API client
    expect(cockpitApiClient.ensureBootstrapUtilityAgent).toHaveBeenCalledWith(
      mockNamespaceId
    )
    expect(cockpitApiClient.ensureBootstrapUtilityAgent).toHaveBeenCalledTimes(
      1
    )
  })

  it('should throw error when namespaceId is null', async () => {
    const { result } = renderHook(() => useBootstrapAgent(null))

    await expect(result.current.ensureAgent()).rejects.toThrow(
      'Namespace ID is required to ensure utility agent'
    )

    // Should have error state
    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
      expect(result.current.error?.message).toBe(
        'Namespace ID is required to ensure utility agent'
      )
    })

    // Should NOT have called API client
    expect(cockpitApiClient.ensureBootstrapUtilityAgent).not.toHaveBeenCalled()
  })

  it('should throw error when namespaceId is undefined', async () => {
    const { result } = renderHook(() => useBootstrapAgent(undefined))

    await expect(result.current.ensureAgent()).rejects.toThrow(
      'Namespace ID is required to ensure utility agent'
    )

    // Should have error state
    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })
  })

  it('should handle API client errors', async () => {
    const mockError = new Error('API request failed')
    vi.mocked(cockpitApiClient.ensureBootstrapUtilityAgent).mockRejectedValue(
      mockError
    )

    const { result } = renderHook(() => useBootstrapAgent(mockNamespaceId))

    await expect(result.current.ensureAgent()).rejects.toThrow(
      'API request failed'
    )

    // Should have error state
    await waitFor(() => {
      expect(result.current.error).toBe(mockError)
      expect(result.current.isLoading).toBe(false)
    })

    // Should have called API client
    expect(cockpitApiClient.ensureBootstrapUtilityAgent).toHaveBeenCalledWith(
      mockNamespaceId
    )
  })

  it('should be idempotent (safe to call multiple times)', async () => {
    vi.mocked(cockpitApiClient.ensureBootstrapUtilityAgent).mockResolvedValue(
      mockAgent
    )

    const { result } = renderHook(() => useBootstrapAgent(mockNamespaceId))

    // Call ensureAgent multiple times
    const agent1 = await result.current.ensureAgent()
    const agent2 = await result.current.ensureAgent()
    const agent3 = await result.current.ensureAgent()

    // All should return same agent
    expect(agent1).toEqual(mockAgent)
    expect(agent2).toEqual(mockAgent)
    expect(agent3).toEqual(mockAgent)

    // API client should have been called 3 times
    expect(cockpitApiClient.ensureBootstrapUtilityAgent).toHaveBeenCalledTimes(
      3
    )
  })

  it('should clear error state on successful retry', async () => {
    const mockError = new Error('First attempt failed')

    // First call fails, second succeeds
    vi.mocked(cockpitApiClient.ensureBootstrapUtilityAgent)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockAgent)

    const { result } = renderHook(() => useBootstrapAgent(mockNamespaceId))

    // First attempt (should fail)
    await expect(result.current.ensureAgent()).rejects.toThrow(
      'First attempt failed'
    )

    await waitFor(() => {
      expect(result.current.error).toBe(mockError)
    })

    // Second attempt (should succeed)
    const agent = await result.current.ensureAgent()

    expect(agent).toEqual(mockAgent)
    await waitFor(() => {
      expect(result.current.error).toBe(null)
      expect(result.current.isLoading).toBe(false)
    })
  })
})
