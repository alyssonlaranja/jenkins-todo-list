/**
 * Re-export of useModuleAccess from module-config feature
 *
 * This provides a convenient import path for components
 * that need to check module accessibility.
 */
export { useModuleAccess } from '@/features/module-config/hooks/use-module-access'
export type {
  ModuleAccessResult,
  ModuleConfig,
  ModuleId,
} from '@/features/module-config/types'
