// src/shared/session/types.ts
'use client'

import type { Connection } from '@/features/connections/types/connection'
import type { ModuleConfigArtifact } from '@/features/module-config/types'
import type { Role } from '@/shared/stores/permission-store'

/**
 * Session lifecycle phases
 */
export type SessionPhase =
  | 'initializing' // Waiting for NextAuth
  | 'auth' // Fetching API keys, licenses, namespaces
  | 'setup' // Building environment, bootstrap agent, connection
  | 'loading' // Loading module artifacts
  | 'ready' // All loaded, ready to use
  | 'switching' // Context switch in progress
  | 'error' // Unrecoverable error

/**
 * Auth context from Phase 1
 */
export interface SessionAuthContext {
  userId: string
  accessToken: string
  userApiKey: string
  mcpServerKey: string
}

/**
 * License/Namespace context
 */
export interface SessionTenantContext {
  licenseId: string
  licenseName: string
  namespaceId: string
  namespaceName: string
  role: Role | null
}

/**
 * Module loader interface - all module loaders implement this
 */
export interface ModuleLoader<T = unknown> {
  /** Unique module identifier */
  id: string

  /** Optional dependencies - these modules must load first */
  dependencies?: string[]

  /** Load the module data using the session connection */
  load: (connection: Connection, tenant: SessionTenantContext) => Promise<T>

  /** Cleanup when context switches */
  cleanup: () => void
}

/**
 * Module manifest with custom i18n and configuration
 */
export interface ModuleManifest {
  moduleId: string
  version: string

  // Custom i18n overrides (merged with defaults)
  i18n?: {
    [locale: string]: {
      [key: string]: string
    }
  }

  // Module-specific configuration
  config?: Record<string, unknown>

  // Feature flags specific to this instance
  features?: Record<string, boolean>

  // Custom metadata
  metadata?: {
    customizedAt?: string
    customizedBy?: string
    description?: string
  }
}

/**
 * All module manifests keyed by moduleId
 */
export interface ModuleManifestRegistry {
  [moduleId: string]: ModuleManifest
}

/**
 * Loaded module data registry
 */
export interface SessionModules {
  moduleConfig: {
    license: ModuleConfigArtifact | null
    namespace: ModuleConfigArtifact | null
  } | null
  moduleManifest: ModuleManifestRegistry | null
  manifest: unknown | null
  // Add more modules as needed
}

/**
 * Complete session state
 */
export interface SessionState {
  // Lifecycle
  phase: SessionPhase
  error: string | null

  // Auth (Phase 1)
  auth: SessionAuthContext | null

  // Tenant (Phase 1)
  tenant: SessionTenantContext | null

  // Session (Phase 2)
  connection: Connection | null

  // Modules (Phase 3)
  modules: SessionModules

  // Loading progress
  loadingModules: string[]
  loadedModules: string[]
}

/**
 * Session orchestrator actions
 */
export interface SessionActions {
  /** Switch to different license/namespace */
  switchContext: (licenseId: string, namespaceId: string) => Promise<void>

  /** Retry failed phase */
  retry: () => Promise<void>

  /** Force refresh all modules */
  refreshModules: () => Promise<void>

  /** Check if a module is accessible */
  isModuleAccessible: (moduleId: string) => boolean
}

/**
 * Complete session context value
 */
export interface SessionContextValue extends SessionState, SessionActions {}
