// src/shared/session/loaders/module-config-loader.ts
'use client'

import type { Connection } from '@/features/connections/types/connection'
import {
  getLicenseConfigKey,
  getNamespaceConfigKey,
  type ModuleConfigArtifact,
} from '@/features/module-config/types'

import type { ModuleLoader, SessionTenantContext } from '../types'

export interface ModuleConfigData {
  license: ModuleConfigArtifact | null
  namespace: ModuleConfigArtifact | null
}

/**
 * Load module configuration artifacts from MCP
 */
async function loadArtifact(
  callTool: (name: string, params: unknown) => Promise<unknown>,
  keyPattern: string
): Promise<ModuleConfigArtifact | null> {
  console.log('[ModuleConfigLoader] 📡 loadArtifact starting:', keyPattern)

  try {
    const result = (await callTool('get_artifact', {
      key_pattern: `^${keyPattern}$`,
    })) as {
      content?: Array<{ text?: string }>
      data?: { artifacts?: unknown[] }
    }

    console.log('[ModuleConfigLoader] 📡 loadArtifact result:', {
      keyPattern,
      hasContent: !!result?.content,
      hasData: !!result?.data,
    })

    const data = result.content?.[0]?.text
      ? JSON.parse(result.content[0].text)
      : result.data

    const artifacts = data?.artifacts || []
    if (artifacts.length === 0) {
      console.log('[ModuleConfigLoader] 📡 No artifacts found for:', keyPattern)
      return null
    }

    const artifact = artifacts[0] as { value: string | object }
    const value =
      typeof artifact.value === 'string'
        ? JSON.parse(artifact.value)
        : artifact.value

    console.log('[ModuleConfigLoader] ✅ Artifact loaded:', keyPattern)
    return value as ModuleConfigArtifact
  } catch (error) {
    console.warn(
      '[ModuleConfigLoader] ❌ Failed to load artifact:',
      keyPattern,
      error
    )
    return null
  }
}

export const moduleConfigLoader: ModuleLoader<ModuleConfigData> = {
  id: 'moduleConfig',
  dependencies: [], // No dependencies

  async load(connection, tenant) {
    console.log('[ModuleConfigLoader] Loading for:', tenant.namespaceId)
    console.log('[ModuleConfigLoader] 🔍 Connection:', {
      id: connection.id,
      environmentId: connection.environmentRef?.environmentId,
      licenseId: connection.environmentRef?.licenseId,
      namespaceId: connection.environmentRef?.namespaceId,
    })

    // We need to create a callTool function using the connection
    // This will be provided by the orchestrator
    const callTool = async (name: string, params: unknown) => {
      const { getLegacyServer } =
        await import('@/features/connections/types/connection')
      const server = getLegacyServer(connection)

      console.log('[ModuleConfigLoader] 🔍 Server config:', {
        hasServer: !!server,
        url: server?.url,
        headerKeys: server?.headers ? Object.keys(server.headers) : 'none',
        namespaceHeader: server?.headers?.['x-cockpit-namespace-id'],
        licenseHeader: server?.headers?.['x-cockpit-license-id'],
      })

      if (!server) throw new Error('No MCP server configured')

      // Add timeout with AbortController (30 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      console.log('[ModuleConfigLoader] 📤 Calling MCP:', name, params)

      try {
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
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        console.log('[ModuleConfigLoader] 📥 Response status:', response.status)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        return response.json()
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('[ModuleConfigLoader] ⏱️ Request timeout after 30s')
          throw new Error('Request timeout')
        }
        throw error
      }
    }

    // Load both configs in parallel
    const [licenseConfig, namespaceConfig] = await Promise.all([
      loadArtifact(callTool, getLicenseConfigKey(tenant.licenseId)),
      loadArtifact(callTool, getNamespaceConfigKey(tenant.namespaceId)),
    ])

    console.log('[ModuleConfigLoader] Loaded:', {
      hasLicense: !!licenseConfig,
      hasNamespace: !!namespaceConfig,
      licenseModules: licenseConfig?.modules
        ? Object.keys(licenseConfig.modules)
        : 'none',
      namespaceModules: namespaceConfig?.modules
        ? Object.keys(namespaceConfig.modules)
        : 'none',
      // Show actual config values for debugging
      licenseConfigFull: licenseConfig,
      namespaceConfigFull: namespaceConfig,
    })

    return { license: licenseConfig, namespace: namespaceConfig }
  },

  cleanup() {
    console.log('[ModuleConfigLoader] Cleanup')
    // No cleanup needed - store handles state reset
  },
}
