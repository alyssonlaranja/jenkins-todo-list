// src/shared/session/loaders/module-manifest-loader.ts
'use client'

import type { Connection } from '@/features/connections/types/connection'
import type { ModuleId } from '@/features/module-config/types'

import type {
  ModuleLoader,
  ModuleManifest,
  ModuleManifestRegistry,
  SessionTenantContext,
} from '../types'

/**
 * Artifact key pattern for module manifests
 * Pattern: MODULE_MANIFEST_{moduleId}_{namespaceId}
 */
function getManifestKey(moduleId: string, namespaceId: string): string {
  return `MODULE_MANIFEST_${moduleId.toUpperCase()}_${namespaceId}`
}

/**
 * Load a single module's custom manifest from MCP
 */
async function loadModuleManifest(
  callTool: (name: string, params: unknown) => Promise<unknown>,
  moduleId: string,
  namespaceId: string
): Promise<ModuleManifest | null> {
  try {
    const key = getManifestKey(moduleId, namespaceId)
    const result = (await callTool('get_artifact', {
      key_pattern: `^${key}$`,
    })) as {
      content?: Array<{ text?: string }>
      data?: { artifacts?: unknown[] }
    }

    const data = result.content?.[0]?.text
      ? JSON.parse(result.content[0].text)
      : result.data

    const artifacts = data?.artifacts || []
    if (artifacts.length === 0) return null

    const artifact = artifacts[0] as { value: string | object }
    const value =
      typeof artifact.value === 'string'
        ? JSON.parse(artifact.value)
        : artifact.value

    return value as ModuleManifest
  } catch (error) {
    // No custom manifest - this is OK, use defaults
    return null
  }
}

/**
 * All module IDs that can have custom manifests
 */
const MANIFEST_ENABLED_MODULES: ModuleId[] = [
  'upstream',
  'downstream',
  'atlas',
  'onboarding',
  'migration',
  'migrationWizard',
]

export const moduleManifestLoader: ModuleLoader<ModuleManifestRegistry> = {
  id: 'moduleManifest',
  dependencies: ['moduleConfig'], // Load after moduleConfig

  async load(connection, tenant) {
    console.log(
      '[ModuleManifestLoader] Loading custom manifests for:',
      tenant.namespaceId
    )

    // Import connection helpers
    const { getLegacyServer } =
      await import('@/features/connections/types/connection')
    const server = getLegacyServer(connection)

    if (!server) throw new Error('No MCP server configured')

    const callTool = async (name: string, params: unknown) => {
      const response = await fetch('/api/mcp-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespace: connection.id,
          method: 'tools/call',
          params: { name, arguments: params },
          headers: server.headers,
          mcpServerUrl: server.url,
        }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    }

    // Load all manifests in parallel
    const manifestPromises = MANIFEST_ENABLED_MODULES.map(async moduleId => {
      const manifest = await loadModuleManifest(
        callTool,
        moduleId,
        tenant.namespaceId
      )
      return { moduleId, manifest }
    })

    const results = await Promise.all(manifestPromises)

    // Build registry
    const registry: ModuleManifestRegistry = {}
    for (const { moduleId, manifest } of results) {
      if (manifest) {
        registry[moduleId] = manifest
        console.log(
          `[ModuleManifestLoader] Loaded custom manifest for: ${moduleId}`
        )
      }
    }

    console.log(
      '[ModuleManifestLoader] Loaded manifests:',
      Object.keys(registry)
    )
    return registry
  },

  cleanup() {
    console.log('[ModuleManifestLoader] Cleanup')
  },
}
