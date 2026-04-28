// src/shared/session/hooks/use-module-access-v2.ts
'use client'

/**
 * Migration hook: useModuleAccess V2
 *
 * Uses SessionOrchestrator for module config instead of independent hooks.
 * Drop-in replacement for existing useModuleAccess.
 */
import { useMemo } from 'react'

import { DEFAULT_MODULE_CONFIG } from '@/features/module-config/constants/default-config'
import type {
  ModuleAccessResult,
  ModuleConfig,
  ModuleId,
} from '@/features/module-config/types'
import { resolveAllModuleConfigs } from '@/features/module-config/utils/config-resolver'
import type { Role } from '@/shared/stores/permission-store'

import { useSessionOrchestrator } from '../session-provider'

interface UseModuleAccessReturn {
  isModuleAccessible: (moduleId: ModuleId) => boolean
  getModuleAccessResult: (moduleId: ModuleId) => ModuleAccessResult
  getModuleConfig: (moduleId: ModuleId) => ModuleConfig
  isFeatureEnabled: (moduleId: ModuleId, featureId: string) => boolean
  accessibleModules: ModuleId[]
  loading: boolean
  error: string | null
  configsLoaded: boolean
}

export function useModuleAccessV2(): UseModuleAccessReturn {
  const { phase, modules, tenant, error } = useSessionOrchestrator()

  const loading =
    phase === 'initializing' ||
    phase === 'auth' ||
    phase === 'setup' ||
    phase === 'loading'

  const configsLoaded =
    !loading &&
    (modules.moduleConfig?.license !== null ||
      modules.moduleConfig?.namespace !== null)

  // DEBUG: Log module config state
  console.log('[useModuleAccessV2] 🔍 State:', {
    phase,
    loading,
    configsLoaded,
    namespaceId: tenant?.namespaceId,
    hasLicenseConfig: !!modules.moduleConfig?.license,
    hasNamespaceConfig: !!modules.moduleConfig?.namespace,
    licenseModules: modules.moduleConfig?.license?.modules
      ? Object.keys(modules.moduleConfig.license.modules)
      : 'none',
    namespaceModules: modules.moduleConfig?.namespace?.modules
      ? Object.keys(modules.moduleConfig.namespace.modules)
      : 'none',
  })

  // Resolve configs
  const resolvedConfigs = useMemo(() => {
    return resolveAllModuleConfigs(
      modules.moduleConfig?.license ?? null,
      modules.moduleConfig?.namespace ?? null
    )
  }, [modules.moduleConfig])

  const getModuleConfig = useMemo(() => {
    return (moduleId: ModuleId): ModuleConfig => {
      return resolvedConfigs[moduleId] || DEFAULT_MODULE_CONFIG[moduleId]
    }
  }, [resolvedConfigs])

  const getModuleAccessResult = useMemo(() => {
    return (moduleId: ModuleId): ModuleAccessResult => {
      const config = getModuleConfig(moduleId)
      const currentRole = tenant?.role

      if (!config.enabled) {
        return { accessible: false, reason: 'disabled', config }
      }

      if (!config.visible) {
        return { accessible: false, reason: 'hidden', config }
      }

      if (config.allowedRoles && config.allowedRoles.length > 0) {
        if (!currentRole || !config.allowedRoles.includes(currentRole)) {
          return { accessible: false, reason: 'role_denied', config }
        }
      }

      return { accessible: true, config }
    }
  }, [getModuleConfig, tenant?.role])

  const isModuleAccessible = useMemo(() => {
    return (moduleId: ModuleId): boolean => {
      if (loading) {
        // During loading, use default config with role check
        return isModuleAccessibleWithRole(moduleId, tenant?.role ?? null)
      }
      return getModuleAccessResult(moduleId).accessible
    }
  }, [loading, getModuleAccessResult, tenant?.role])

  const isFeatureEnabled = useMemo(() => {
    return (moduleId: ModuleId, featureId: string): boolean => {
      const config = getModuleConfig(moduleId)
      if (!isModuleAccessible(moduleId)) return false
      if (!config.features) return true
      return config.features[featureId] ?? true
    }
  }, [getModuleConfig, isModuleAccessible])

  const accessibleModules = useMemo(() => {
    const accessible = (
      Object.keys(DEFAULT_MODULE_CONFIG) as ModuleId[]
    ).filter(moduleId => isModuleAccessible(moduleId))
    // DEBUG: Log accessible modules
    console.log('[useModuleAccessV2] ✅ Accessible modules:', accessible)
    return accessible
  }, [isModuleAccessible])

  return {
    isModuleAccessible,
    getModuleAccessResult,
    getModuleConfig,
    isFeatureEnabled,
    accessibleModules,
    loading,
    error,
    configsLoaded,
  }
}

function isModuleAccessibleWithRole(
  moduleId: ModuleId,
  currentRole: Role | null
): boolean {
  const defaultConfig = DEFAULT_MODULE_CONFIG[moduleId]

  if (!defaultConfig.enabled || !defaultConfig.visible) {
    return false
  }

  if (defaultConfig.allowedRoles && defaultConfig.allowedRoles.length > 0) {
    if (!currentRole || !defaultConfig.allowedRoles.includes(currentRole)) {
      return false
    }
  }

  return true
}
