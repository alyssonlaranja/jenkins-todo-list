/**
 * Copilot Manifest Store
 *
 * Global cache for the unified COPILOT_MANIFEST artifact.
 * Supports both frontend (CopilotKit) and backend (LangGraph/DeepAgents) queries.
 *
 * The manifest is loaded once per session and cached in Zustand.
 * If no manifest exists, all modules/agents use i18n defaults.
 *
 * @module shared/stores/copilot-manifest-store
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// ============================================================================
// Types
// ============================================================================

export interface ModuleConfig {
  customized: boolean
  configKey?: string
}

export interface SubagentConfig {
  customized: boolean
}

export interface AgentConfig {
  customized: boolean
  configKey?: string
  subagents?: Record<string, SubagentConfig>
}

export interface CopilotManifest {
  version: string
  locale: string
  updatedAt: string
  frontend: {
    modules: Record<string, ModuleConfig>
  }
  backend: {
    agents: Record<string, AgentConfig>
  }
}

/**
 * Function type for calling MCP tools
 * Must be provided by a hook that has access to session connection
 */
export type ManifestToolCaller = (
  toolName: string,
  args: Record<string, unknown>
) => Promise<unknown>

export interface CopilotManifestState {
  // State
  manifest: CopilotManifest | null
  isLoading: boolean
  isLoaded: boolean
  error: Error | null
  namespaceId: string | null

  // Actions
  loadManifest: (
    namespaceId: string,
    callTool?: ManifestToolCaller
  ) => Promise<void>
  reloadManifest: (callTool?: ManifestToolCaller) => Promise<void>

  // Frontend queries
  isModuleCustomized: (moduleId: string) => boolean
  getModuleConfigKey: (moduleId: string) => string | null
  getCustomizedModules: () => string[]

  // Backend queries
  isAgentCustomized: (agentId: string) => boolean
  getAgentConfigKey: (agentId: string) => string | null
  isSubagentCustomized: (agentId: string, subagentId: string) => boolean
  getCustomizedAgents: () => string[]

  // Cache management
  reset: () => void
  invalidate: () => void
}

// ============================================================================
// Constants
// ============================================================================

const MANIFEST_KEY = 'COPILOT_MANIFEST'

// ============================================================================
// Store
// ============================================================================

export const useCopilotManifestStore = create<CopilotManifestState>()(
  devtools(
    (set, get) => ({
      // Initial state
      manifest: null,
      isLoading: false,
      isLoaded: false,
      error: null,
      namespaceId: null,

      // ========================================================================
      // Actions
      // ========================================================================

      loadManifest: async (
        namespaceId: string,
        callTool?: ManifestToolCaller
      ) => {
        const state = get()

        // Skip if already loaded for this namespace
        if (state.isLoaded && state.namespaceId === namespaceId) {
          return
        }

        // Skip if already loading
        if (state.isLoading) {
          return
        }

        // Require callTool to be provided - stores cannot access React context
        if (!callTool) {
          // eslint-disable-next-line no-console
          console.warn(
            '[CopilotManifestStore] loadManifest called without callTool - skipping. ' +
              'Use useCopilotManifest hook or pass callTool from useArtifactMCP.'
          )
          set({
            manifest: null,
            isLoaded: true,
            isLoading: false,
            error: null,
          })
          return
        }

        set({ isLoading: true, error: null, namespaceId })

        try {
          const result = await callTool('get_artifact', { key: MANIFEST_KEY })

          // Parse MCP response
          const artifact = parseToolResult(result)

          if (artifact?.value) {
            const manifest = JSON.parse(artifact.value) as CopilotManifest
            set({
              manifest,
              isLoaded: true,
              isLoading: false,
              error: null,
            })
          } else {
            // No manifest = all modules/agents use i18n
            set({
              manifest: null,
              isLoaded: true,
              isLoading: false,
              error: null,
            })
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('[CopilotManifestStore] Failed to load manifest:', error)
          set({
            error:
              error instanceof Error
                ? error
                : new Error('Failed to load manifest'),
            isLoading: false,
            isLoaded: true, // Mark as loaded even on error (use i18n fallback)
          })
        }
      },

      reloadManifest: async (callTool?: ManifestToolCaller) => {
        const { namespaceId } = get()
        if (!namespaceId) return

        // Reset loaded state to force reload
        set({ isLoaded: false })
        await get().loadManifest(namespaceId, callTool)
      },

      // ========================================================================
      // Frontend Queries
      // ========================================================================

      isModuleCustomized: (moduleId: string): boolean => {
        const { manifest } = get()
        return manifest?.frontend?.modules?.[moduleId]?.customized ?? false
      },

      getModuleConfigKey: (moduleId: string): string | null => {
        const { manifest } = get()
        const config = manifest?.frontend?.modules?.[moduleId]

        if (!config?.customized) return null

        // Return explicit key or generate default
        return (
          config.configKey ||
          `COPILOT_CONFIG_${moduleId.toUpperCase().replace(/-/g, '_')}`
        )
      },

      getCustomizedModules: (): string[] => {
        const { manifest } = get()
        if (!manifest?.frontend?.modules) return []

        return Object.entries(manifest.frontend.modules)
          .filter(([, config]) => config.customized)
          .map(([moduleId]) => moduleId)
      },

      // ========================================================================
      // Backend Queries
      // ========================================================================

      isAgentCustomized: (agentId: string): boolean => {
        const { manifest } = get()
        return manifest?.backend?.agents?.[agentId]?.customized ?? false
      },

      getAgentConfigKey: (agentId: string): string | null => {
        const { manifest } = get()
        const config = manifest?.backend?.agents?.[agentId]

        if (!config?.customized) return null

        // Return explicit key or generate default
        return (
          config.configKey ||
          `AGENT_CONFIG_${agentId.toUpperCase().replace(/-/g, '_')}`
        )
      },

      isSubagentCustomized: (agentId: string, subagentId: string): boolean => {
        const { manifest } = get()
        return (
          manifest?.backend?.agents?.[agentId]?.subagents?.[subagentId]
            ?.customized ?? false
        )
      },

      getCustomizedAgents: (): string[] => {
        const { manifest } = get()
        if (!manifest?.backend?.agents) return []

        return Object.entries(manifest.backend.agents)
          .filter(([, config]) => config.customized)
          .map(([agentId]) => agentId)
      },

      // ========================================================================
      // Cache Management
      // ========================================================================

      reset: () => {
        set({
          manifest: null,
          isLoading: false,
          isLoaded: false,
          error: null,
          namespaceId: null,
        })
      },

      invalidate: () => {
        set({ isLoaded: false })
      },
    }),
    { name: 'copilot-manifest-store' }
  )
)

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectManifest = (state: CopilotManifestState) => state.manifest
export const selectIsLoading = (state: CopilotManifestState) => state.isLoading
export const selectIsLoaded = (state: CopilotManifestState) => state.isLoaded
export const selectError = (state: CopilotManifestState) => state.error

// ============================================================================
// Server-side helper (for backend agents)
// ============================================================================

/**
 * Load manifest for server-side usage (LangGraph/DeepAgents)
 *
 * This is a standalone function that doesn't use React hooks.
 * Uses in-memory caching for performance.
 */
let serverManifestCache: {
  data: CopilotManifest | null
  timestamp: number
  namespaceId: string | null
} = {
  data: null,
  timestamp: 0,
  namespaceId: null,
}

const SERVER_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export type MCPToolCaller = (
  serverKey: string,
  toolName: string,
  args: Record<string, unknown>
) => Promise<unknown>

export async function loadManifestForServer(
  callMCPTool: MCPToolCaller
): Promise<CopilotManifest | null> {
  // Check cache
  if (
    serverManifestCache.data &&
    Date.now() - serverManifestCache.timestamp < SERVER_CACHE_TTL
  ) {
    return serverManifestCache.data
  }

  try {
    const result = await callMCPTool(
      'connection-mcp-server-legacy',
      'get_artifact',
      { key: MANIFEST_KEY }
    )

    // Parse result
    const artifact = parseToolResult(result)
    if (artifact?.value) {
      const manifest = JSON.parse(artifact.value) as CopilotManifest
      serverManifestCache = {
        data: manifest,
        timestamp: Date.now(),
        namespaceId: null,
      }
      return manifest
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[CopilotManifest] Server-side load failed:', error)
  }

  return null
}

function parseToolResult(
  result: unknown
): { value?: string; key?: string } | null {
  if (!result) return null

  if (typeof result === 'object' && 'content' in (result as object)) {
    const content = (result as { content?: Array<{ text?: string }> }).content
    if (content?.[0]?.text) {
      try {
        return JSON.parse(content[0].text)
      } catch {
        return null
      }
    }
  }

  return null
}

/**
 * Clear server-side cache
 */
export function clearServerManifestCache(): void {
  serverManifestCache = { data: null, timestamp: 0, namespaceId: null }
}

/**
 * Check if a module is customized (server-side)
 */
export function isModuleCustomizedServer(
  manifest: CopilotManifest | null,
  moduleId: string
): boolean {
  return manifest?.frontend?.modules?.[moduleId]?.customized ?? false
}

/**
 * Check if an agent is customized (server-side)
 */
export function isAgentCustomizedServer(
  manifest: CopilotManifest | null,
  agentId: string
): boolean {
  return manifest?.backend?.agents?.[agentId]?.customized ?? false
}

/**
 * Check if a subagent is customized (server-side)
 */
export function isSubagentCustomizedServer(
  manifest: CopilotManifest | null,
  agentId: string,
  subagentId: string
): boolean {
  return (
    manifest?.backend?.agents?.[agentId]?.subagents?.[subagentId]?.customized ??
    false
  )
}
