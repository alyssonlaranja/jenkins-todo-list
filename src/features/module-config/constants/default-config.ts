/**
 * Default Module Configuration
 *
 * Defines the default enabled/visible/role settings for all modules.
 * These can be overridden per-license or per-namespace via MCP artifacts.
 */

import type { ModuleConfig, ModuleId } from '../types'

// ============================================================================
// Module Metadata (display info)
// ============================================================================

export const MODULE_METADATA: Record<ModuleId, { name: string; description?: string }> = {
  environments: { name: 'Environments', description: 'MCP Environment management' },
  connections: { name: 'Connections', description: 'MCP Connection management' },
  migration: { name: 'Migration', description: 'Application migration tools' },
  migrationWizard: { name: 'Migration Wizard', description: 'Guided migration wizard' },
  upstream: { name: 'Upstream', description: 'Upstream discovery & analysis' },
  downstream: { name: 'Downstream', description: 'Downstream delivery' },
  atlas: { name: 'Atlas', description: 'Operational intelligence' },
  myTasks: { name: 'My Tasks', description: 'Personal task management' },
  messages: { name: 'Messages', description: 'Team messaging' },
  onboarding: { name: 'Onboarding', description: 'Platform onboarding' },
  moduleConfig: { name: 'Module Config', description: 'Module configuration management' },
  devTools: { name: 'Dev Tools', description: 'Developer tools' },
  supervisorPlayground: { name: 'Supervisor Playground', description: 'Agent supervisor testing' },
  canvasPlayground: { name: 'Canvas Playground', description: 'Canvas testing' },
}

// ============================================================================
// Default Module Config
// ============================================================================

export const DEFAULT_MODULE_CONFIG: Record<ModuleId, ModuleConfig> = {
  environments: {
    enabled: true,
    visible: true,
    allowedRoles: ['admin', 'globaladmin'],
  },
  connections: {
    enabled: true,
    visible: true,
    allowedRoles: ['admin', 'globaladmin'],
  },
  migration: {
    enabled: true,
    visible: true,
  },
  migrationWizard: {
    enabled: true,
    visible: true,
  },
  upstream: {
    enabled: true,
    visible: true,
  },
  downstream: {
    enabled: true,
    visible: true,
  },
  atlas: {
    enabled: true,
    visible: true,
  },
  myTasks: {
    enabled: true,
    visible: true,
  },
  messages: {
    enabled: true,
    visible: true,
  },
  onboarding: {
    enabled: true,
    visible: true,
  },
  moduleConfig: {
    enabled: true,
    visible: true,
    allowedRoles: ['admin', 'globaladmin'],
  },
  devTools: {
    enabled: true,
    visible: true,
    allowedRoles: ['admin', 'globaladmin'],
  },
  supervisorPlayground: {
    enabled: true,
    visible: true,
    allowedRoles: ['admin', 'globaladmin'],
  },
  canvasPlayground: {
    enabled: true,
    visible: true,
    allowedRoles: ['admin', 'globaladmin'],
  },
}
