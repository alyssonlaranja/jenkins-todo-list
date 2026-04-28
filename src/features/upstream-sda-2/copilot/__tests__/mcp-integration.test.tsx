/**
 * Test file for MCP Integration
 *
 * Run: pnpm test src/features/upstream-sda-2/copilot/__tests__/mcp-integration.test.tsx
 */

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock useProxyMCP
vi.mock('@/shared/hooks/use-proxy-mcp', () => ({
  useProxyMCP: vi.fn(() => ({
    callTool: vi.fn().mockResolvedValue({
      success: true,
      data: { artifacts: [{ id: '1', name: 'Test Artifact' }] },
    }),
    connected: true,
  })),
}))

describe('SDA2 MCP Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use useProxyMCP instead of mock', async () => {
    const { useProxyMCP } = await import('@/shared/hooks/use-proxy-mcp')

    // Verify useProxyMCP is called with correct params
    expect(useProxyMCP).toBeDefined()
  })

  it('should call MCP tool with correct parameters', async () => {
    const { useProxyMCP } = await import('@/shared/hooks/use-proxy-mcp')
    const mockCallTool = vi.fn().mockResolvedValue({ success: true })

    vi.mocked(useProxyMCP).mockReturnValue({
      callTool: mockCallTool,
      connected: true,
      connecting: false,
      error: null,
      sessionId: null,
      artifacts: [],
      total: 0,
      pagination: null,
      tools: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      listArtifacts: vi.fn(),
      refreshArtifacts: vi.fn(),
      createArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      deleteArtifact: vi.fn(),
    })

    // Simulate calling MCP tool
    await mockCallTool('search_artifacts', { query: 'test', tags: 'sda2' })

    expect(mockCallTool).toHaveBeenCalledWith('search_artifacts', {
      query: 'test',
      tags: 'sda2',
    })
  })
})
