// src/shared/session/hooks/use-module-i18n.ts
'use client'

import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { ModuleId } from '@/features/module-config/types'

import { useSessionOrchestrator } from '../session-provider'

interface UseModuleI18nReturn {
  /** Get translated string with custom overrides applied */
  t: (key: string, options?: Record<string, unknown>) => string

  /** Check if a key has a custom override */
  hasCustomOverride: (key: string) => boolean

  /** Get all custom overrides for this module */
  customOverrides: Record<string, string>
}

/**
 * Hook to get i18n for a specific module with custom overrides
 *
 * Priority:
 * 1. Custom override from module manifest (highest)
 * 2. Default translation from i18n files (fallback)
 *
 * @example
 * ```tsx
 * function UpstreamPage() {
 *   const { t } = useModuleI18n('upstream')
 *   return <h1>{t('title')}</h1> // Uses custom title if defined in manifest
 * }
 * ```
 */
export function useModuleI18n(moduleId: ModuleId): UseModuleI18nReturn {
  const { modules } = useSessionOrchestrator()
  const { t: defaultT, i18n } = useTranslation(moduleId)

  // Get custom i18n overrides from manifest
  const customOverrides = useMemo(() => {
    const manifest = modules.moduleManifest?.[moduleId]
    if (!manifest?.i18n) return {}

    // Get overrides for current locale, fallback to 'en'
    const currentLocale = i18n.language
    return manifest.i18n[currentLocale] || manifest.i18n['en'] || {}
  }, [modules.moduleManifest, moduleId, i18n.language])

  // Translation function with overrides
  const t = useCallback(
    (key: string, options?: Record<string, unknown>): string => {
      // Check for custom override first
      if (customOverrides[key]) {
        // Apply interpolation if options provided
        let result = customOverrides[key]
        if (options) {
          Object.entries(options).forEach(([optKey, value]) => {
            result = result.replace(
              new RegExp(`{{${optKey}}}`, 'g'),
              String(value)
            )
          })
        }
        return result
      }

      // Fallback to default translation
      return defaultT(key, options as Record<string, string>)
    },
    [customOverrides, defaultT]
  )

  const hasCustomOverride = useCallback(
    (key: string): boolean => {
      return key in customOverrides
    },
    [customOverrides]
  )

  return {
    t,
    hasCustomOverride,
    customOverrides,
  }
}

/**
 * Hook to get module-specific configuration from manifest
 */
export function useModuleManifestConfig(moduleId: ModuleId) {
  const { modules } = useSessionOrchestrator()

  const config = useMemo(() => {
    return modules.moduleManifest?.[moduleId]?.config || {}
  }, [modules.moduleManifest, moduleId])

  const features = useMemo(() => {
    return modules.moduleManifest?.[moduleId]?.features || {}
  }, [modules.moduleManifest, moduleId])

  return { config, features }
}
