/**
 * Module Config Types
 *
 * Defines the types for module access control and configuration.
 * Each module can be enabled/disabled, made visible/hidden, and
 * restricted to specific roles.
 */

import type { Role } from '@/shared/stores/permission-store'

// ============================================================================
// Module Identifiers
// ============================================================================

export type ModuleId =
  | 'environments'
  | 'connections'
  | 'migration'
  | 'migrationWizard'
  | 'upstream'
  | 'downstream'
  | 'atlas'
  | 'myTasks'
  | 'messages'
  | 'onboarding'
  | 'moduleConfig'
  | 'devTools'
  | 'supervisorPlayground'
  | 'canvasPlayground'

// ============================================================================
// Module Configuration
// ============================================================================

export interface ModuleConfig {
  enabled: boolean
  visible: boolean
  allowedRoles?: Role[]
  features?: Record<string, boolean>
}

export interface ModuleAccessResult {
  accessible: boolean
  reason?: 'disabled' | 'hidden' | 'role_denied'
  config: ModuleConfig
}

// ============================================================================
// Module Config Artifact (stored as MCP artifact)
// ============================================================================

export interface ModuleConfigArtifact {
  modules: {
    [moduleId in ModuleId]?: Partial<ModuleConfig>
  }
}

// ============================================================================
// Artifact Key Helpers
// ============================================================================

export function getLicenseConfigKey(licenseId: string): string {
  return `MODULE_CONFIG_LICENSE_${licenseId}`
}

export function getNamespaceConfigKey(namespaceId: string): string {
  return `MODULE_CONFIG_NAMESPACE_${namespaceId}`
}
