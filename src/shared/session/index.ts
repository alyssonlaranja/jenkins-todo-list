// src/shared/session/index.ts
'use client'

// Types
export type {
  ModuleLoader,
  ModuleManifest,
  ModuleManifestRegistry,
  SessionActions,
  SessionAuthContext,
  SessionContextValue,
  SessionModules,
  SessionPhase,
  SessionState,
  SessionTenantContext,
} from './types'

// Store
export { getSessionState, useSessionStore } from './session-store'

// Provider & Hooks
export {
  SessionOrchestratorProvider,
  useModuleAccessFromSession,
  useSessionOrchestrator,
  useSessionState,
} from './session-provider'

// Module hooks
export { useModuleI18n, useModuleManifestConfig } from './hooks/use-module-i18n'

// Loaders
export { getLoader, getLoadersInOrder, moduleLoaders } from './loaders'
