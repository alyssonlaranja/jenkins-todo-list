/**
 * useModuleAccess Hook
 *
 * Simple hook to check module accessibility based on the current
 * user's role and module configuration.
 */

'use client'

import { useMemo } from 'react'

import { usePermissionStore } from '@/shared/stores/permission-store'

import { DEFAULT_MODULE_CONFIG } from '../constants/default-config'
import type { ModuleAccessResult, ModuleConfig, ModuleId } from '../types'

export function useModuleAccess() {
  const currentRole = usePermissionStore(state => state.currentNamespaceRole)

  const isModuleAccessible = useMemo(() => {
    return (moduleId: ModuleId): boolean => {
      const config = DEFAULT_MODULE_CONFIG[moduleId]
      if (!config) return false
      if (!config.enabled || !config.visible) return false

      if (config.allowedRoles && config.allowedRoles.length > 0) {
        if (!currentRole || !config.allowedRoles.includes(currentRole)) {
          return false
        }
      }
      return true
    }
  }, [currentRole])

  const getModuleAccessResult = useMemo(() => {
    return (moduleId: ModuleId): ModuleAccessResult => {
      const config = DEFAULT_MODULE_CONFIG[moduleId]
      if (!config) return { accessible: false, reason: 'disabled', config: { enabled: false, visible: false } }
      if (!config.enabled) return { accessible: false, reason: 'disabled', config }
      if (!config.visible) return { accessible: false, reason: 'hidden', config }

      if (config.allowedRoles && config.allowedRoles.length > 0) {
        if (!currentRole || !config.allowedRoles.includes(currentRole)) {
          return { accessible: false, reason: 'role_denied', config }
        }
      }
      return { accessible: true, config }
    }
  }, [currentRole])

  const getModuleConfig = useMemo(() => {
    return (moduleId: ModuleId): ModuleConfig => {
      return DEFAULT_MODULE_CONFIG[moduleId]
    }
  }, [])

  return {
    isModuleAccessible,
    getModuleAccessResult,
    getModuleConfig,
  }
}
