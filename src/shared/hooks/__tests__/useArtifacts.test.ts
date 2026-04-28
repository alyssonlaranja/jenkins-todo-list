import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useArtifacts } from '../use-artifacts'

// Mock useProxyMCP
vi.mock('../use-proxy-mcp', () => ({
  useProxyMCP: vi.fn(() => ({
    callTool: vi.fn(),
    connected: true,
    error: null,
  })),
}))

describe('useArtifacts', () => {
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

  it('should create artifact successfully', async () => {
    const { useProxyMCP } = await import('../use-proxy-mcp')
    const mockCallTool = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            artifact: {
              key: 'TEST_KEY',
              value: JSON.stringify({ test: 'data' }),
              description: 'Test artifact',
              version: 1,
            },
          }),
        },
      ],
    })

    vi.mocked(useProxyMCP).mockReturnValue({
      callTool: mockCallTool,
      connected: true,
      connecting: false,
      error: null,
      tools: [],
      artifacts: [],
      total: 0,
      connect: vi.fn(),
      disconnect: vi.fn(),
      listArtifacts: vi.fn(),
      refreshArtifacts: vi.fn(),
      createArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      deleteArtifact: vi.fn(),
    })

    const { result } = renderHook(() => useArtifacts(mockConnection))

    await act(async () => {
      const artifact = await result.current.createArtifact({
        key: 'TEST_KEY',
        value: { test: 'data' },
        description: 'Test artifact',
      })

      expect(artifact).toBeDefined()
      expect(artifact.key).toBe('TEST_KEY')
    })

    expect(mockCallTool).toHaveBeenCalledWith(
      'create_artifact',
      expect.objectContaining({
        key: 'TEST_KEY',
        description: 'Test artifact',
      })
    )
  })

  it('should get artifact successfully', async () => {
    const { useProxyMCP } = await import('../use-proxy-mcp')
    const mockCallTool = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            artifact: {
              key: 'TEST_KEY',
              value: JSON.stringify({ test: 'data' }),
              description: 'Test artifact',
              version: 1,
            },
          }),
        },
      ],
    })

    vi.mocked(useProxyMCP).mockReturnValue({
      callTool: mockCallTool,
      connected: true,
      connecting: false,
      error: null,
      tools: [],
      artifacts: [],
      total: 0,
      connect: vi.fn(),
      disconnect: vi.fn(),
      listArtifacts: vi.fn(),
      refreshArtifacts: vi.fn(),
      createArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      deleteArtifact: vi.fn(),
    })

    const { result } = renderHook(() => useArtifacts(mockConnection))

    await act(async () => {
      const artifact = await result.current.getArtifact('TEST_KEY')

      expect(artifact).toBeDefined()
      expect(artifact.key).toBe('TEST_KEY')
      expect(artifact.value).toEqual({ test: 'data' })
    })

    expect(mockCallTool).toHaveBeenCalledWith('get_artifact', {
      key: 'TEST_KEY',
    })
  })

  it('should handle errors gracefully', async () => {
    const { useProxyMCP } = await import('../use-proxy-mcp')
    const mockCallTool = vi.fn().mockRejectedValue(new Error('MCP Error'))

    vi.mocked(useProxyMCP).mockReturnValue({
      callTool: mockCallTool,
      connected: true,
      connecting: false,
      error: null,
      tools: [],
      artifacts: [],
      total: 0,
      connect: vi.fn(),
      disconnect: vi.fn(),
      listArtifacts: vi.fn(),
      refreshArtifacts: vi.fn(),
      createArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      deleteArtifact: vi.fn(),
    })

    const { result } = renderHook(() => useArtifacts(mockConnection))

    await act(async () => {
      await expect(
        result.current.createArtifact({
          key: 'TEST_KEY',
          value: { test: 'data' },
          description: 'Test',
        })
      ).rejects.toThrow('MCP Error')
    })

    await waitFor(() => {
      expect(result.current.error).toBe('MCP Error')
    })
  })

  it('should update artifact successfully', async () => {
    const { useProxyMCP } = await import('../use-proxy-mcp')
    const mockCallTool = vi
      .fn()
      .mockResolvedValueOnce({
        // First call - get_artifact
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              artifact: {
                key: 'TEST_KEY',
                value: JSON.stringify({ test: 'old-data' }),
                description: 'Old description',
                version: 1,
                artifactType: 'JSON',
                accessibility: 'Namespace_User',
                tags: '',
              },
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        // Second call - update_artifact
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              artifact: {
                key: 'TEST_KEY',
                value: JSON.stringify({ test: 'new-data' }),
                description: 'Updated description',
                version: 2,
                artifactType: 'JSON',
                accessibility: 'Namespace_User',
                tags: '',
              },
            }),
          },
        ],
      })

    vi.mocked(useProxyMCP).mockReturnValue({
      callTool: mockCallTool,
      connected: true,
      connecting: false,
      error: null,
      tools: [],
      artifacts: [],
      total: 0,
      connect: vi.fn(),
      disconnect: vi.fn(),
      listArtifacts: vi.fn(),
      refreshArtifacts: vi.fn(),
      createArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      deleteArtifact: vi.fn(),
    })

    const { result } = renderHook(() => useArtifacts(mockConnection))

    await act(async () => {
      const artifact = await result.current.updateArtifact('TEST_KEY', {
        value: { test: 'new-data' },
        description: 'Updated description',
      })

      expect(artifact).toBeDefined()
      expect(artifact.key).toBe('TEST_KEY')
      expect(artifact.value).toEqual({ test: 'new-data' })
      expect(artifact.description).toBe('Updated description')
      expect(artifact.version).toBe(2)
    })

    expect(mockCallTool).toHaveBeenCalledTimes(2)
    expect(mockCallTool).toHaveBeenCalledWith('get_artifact', {
      key: 'TEST_KEY',
    })
    expect(mockCallTool).toHaveBeenCalledWith(
      'update_artifact',
      expect.objectContaining({
        key: 'TEST_KEY',
        description: 'Updated description',
      })
    )
  })

  it('should list artifacts successfully', async () => {
    const { useProxyMCP } = await import('../use-proxy-mcp')
    const mockCallTool = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            artifacts: [
              {
                key: 'TEST_KEY_1',
                value: JSON.stringify({ test: 'data1' }),
                description: 'First artifact',
                version: 1,
              },
              {
                key: 'TEST_KEY_2',
                value: JSON.stringify({ test: 'data2' }),
                description: 'Second artifact',
                version: 1,
              },
            ],
          }),
        },
      ],
    })

    vi.mocked(useProxyMCP).mockReturnValue({
      callTool: mockCallTool,
      connected: true,
      connecting: false,
      error: null,
      tools: [],
      artifacts: [],
      total: 0,
      connect: vi.fn(),
      disconnect: vi.fn(),
      listArtifacts: vi.fn(),
      refreshArtifacts: vi.fn(),
      createArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      deleteArtifact: vi.fn(),
    })

    const { result } = renderHook(() => useArtifacts(mockConnection))

    await act(async () => {
      const artifacts = await result.current.listArtifacts('TEST_')

      expect(artifacts).toBeDefined()
      expect(artifacts.length).toBe(2)
      expect(artifacts[0]?.key).toBe('TEST_KEY_1')
      expect(artifacts[0]?.value).toEqual({ test: 'data1' })
      expect(artifacts[1]?.key).toBe('TEST_KEY_2')
      expect(artifacts[1]?.value).toEqual({ test: 'data2' })
    })

    expect(mockCallTool).toHaveBeenCalledWith('list_artifacts', {
      key_prefix: 'TEST_',
    })
  })

  it('should list all artifacts when no prefix provided', async () => {
    const { useProxyMCP } = await import('../use-proxy-mcp')
    const mockCallTool = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            artifacts: [],
          }),
        },
      ],
    })

    vi.mocked(useProxyMCP).mockReturnValue({
      callTool: mockCallTool,
      connected: true,
      connecting: false,
      error: null,
      tools: [],
      artifacts: [],
      total: 0,
      connect: vi.fn(),
      disconnect: vi.fn(),
      listArtifacts: vi.fn(),
      refreshArtifacts: vi.fn(),
      createArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      deleteArtifact: vi.fn(),
    })

    const { result } = renderHook(() => useArtifacts(mockConnection))

    await act(async () => {
      const artifacts = await result.current.listArtifacts()

      expect(artifacts).toBeDefined()
      expect(artifacts.length).toBe(0)
    })

    expect(mockCallTool).toHaveBeenCalledWith('list_artifacts', {})
  })
})
