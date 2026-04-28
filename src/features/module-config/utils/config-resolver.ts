/**
 * Config Resolver
 *
 * Merges license-level and namespace-level module configs
 * with defaults. Namespace overrides take priority over license,
 * which takes priority over defaults.
 */

import { DEFAULT_MODULE_CONFIG } from '../constants/default-config'
import type { ModuleConfig, ModuleConfigArtifact, ModuleId } from '../types'

/**
 * Resolve all module configs by merging:
 * 1. Default config (base)
 * 2. License-level overrides
 * 3. Namespace-level overrides (highest priority)
 */
export function resolveAllModuleConfigs(
  licenseConfig: ModuleConfigArtifact | null,
  namespaceConfig: ModuleConfigArtifact | null
): Record<ModuleId, ModuleConfig> {
  const result = { ...DEFAULT_MODULE_CONFIG }

  for (const moduleId of Object.keys(DEFAULT_MODULE_CONFIG) as ModuleId[]) {
    const base = DEFAULT_MODULE_CONFIG[moduleId]
    const licenseOverride = licenseConfig?.modules?.[moduleId]
    const namespaceOverride = namespaceConfig?.modules?.[moduleId]

    result[moduleId] = {
      ...base,
      ...licenseOverride,
      ...namespaceOverride,
    }
  }

  return result
}
