/**
 * Manifest Loader
 *
 * Loads module manifests from local files.
 * Works with Next.js dynamic imports for YAML files.
 *
 * Architecture:
 * - Manifests are stored locally in /src/manifests/{moduleId}/
 * - Base manifest: manifest.yaml (pt-BR)
 * - Locale overlays: manifest.{locale}.yaml (e.g., manifest.en-US.yaml)
 */
import type {
  ManifestOnboardingStep,
  ModuleManifest,
  ModuleManifestLocale,
  SupportedLocale,
} from './types'

/**
 * Result of loading a manifest with locale applied
 */
export interface ResolvedManifest {
  /** The loaded manifest with locale applied */
  manifest: ModuleManifest
  /** Module ID */
  moduleId: string
  /** The locale used */
  locale: SupportedLocale
  /** When this was loaded */
  loadedAt: Date
}

// Cache for loaded manifests
const manifestCache = new Map<string, ResolvedManifest>()

/**
 * All available module IDs
 */
export const ALL_MODULE_IDS = [
  'environments',
  'connections',
  'migration',
  'migrationWizard',
  'upstream',
  'downstream',
  'atlas',
  'messages',
  'onboarding',
  'moduleConfig',
  'devTools',
] as const

export type ModuleId = (typeof ALL_MODULE_IDS)[number]

/**
 * Merges a base manifest with a locale overlay (translations only)
 */
export function mergeManifestWithLocale(
  base: ModuleManifest,
  localeData: ModuleManifestLocale
): ModuleManifest {
  // Deep clone to avoid mutation
  const merged: ModuleManifest = JSON.parse(JSON.stringify(base))

  // Apply translated module fields
  merged.module.name = localeData.name
  merged.module.description = localeData.description

  // Apply onboarding translations if present
  if (merged.onboarding && localeData.onboarding) {
    merged.onboarding.title = localeData.onboarding.title
    if (localeData.onboarding.description) {
      merged.onboarding.description = localeData.onboarding.description
    }
    if (localeData.onboarding.certificationTitle) {
      merged.onboarding.certificationTitle =
        localeData.onboarding.certificationTitle
    }

    // Merge step translations by ID
    if (merged.onboarding.steps && localeData.onboarding.steps) {
      merged.onboarding.steps = merged.onboarding.steps.map(step => {
        const localeStep = localeData.onboarding?.steps?.find(
          ls => ls.id === step.id
        )
        if (!localeStep) return step

        const mergedStep: ManifestOnboardingStep = {
          ...step,
          title: localeStep.title,
          description: localeStep.description ?? step.description,
        }

        // Handle quiz questions translation
        if (step.questions && localeStep.questions) {
          mergedStep.questions = step.questions.map(q => {
            const localeQ = localeStep.questions?.find(lq => lq.id === q.id)
            if (!localeQ) return q
            return {
              ...q,
              question: localeQ.question,
              options: localeQ.options,
              explanation: localeQ.explanation ?? q.explanation,
            }
          })
        }

        // Handle acknowledgment translation
        if (localeStep.acknowledgmentMessage) {
          mergedStep.acknowledgmentMessage = localeStep.acknowledgmentMessage
        }
        if (localeStep.acknowledgmentLabel) {
          mergedStep.acknowledgmentLabel = localeStep.acknowledgmentLabel
        }

        return mergedStep
      })
    }
  }

  // Apply feature translations if present
  if (merged.features && localeData.features) {
    merged.features = merged.features.map(feature => {
      const localeFeature = localeData.features?.find(
        lf => lf.id === feature.id
      )
      if (!localeFeature) return feature
      return {
        ...feature,
        name: localeFeature.name,
        description: localeFeature.description ?? feature.description,
      }
    })
  }

  return merged
}

/**
 * Loads a manifest for a specific module and locale
 *
 * @param moduleId - The module identifier (e.g., 'migration', 'environments')
 * @param locale - The locale to load (default: 'pt-BR')
 * @returns The loaded manifest with locale applied
 *
 * @example
 * ```typescript
 * const manifest = await loadManifest('migration', 'en-US')
 * console.log(manifest.module.name) // "Migration"
 * ```
 */
export async function loadManifest(
  moduleId: ModuleId,
  locale: SupportedLocale = 'pt-BR'
): Promise<ResolvedManifest> {
  const cacheKey = `${moduleId}:${locale}`

  // Check cache first
  if (manifestCache.has(cacheKey)) {
    return manifestCache.get(cacheKey)!
  }

  try {
    // Dynamic import of YAML files (requires next.config with yaml loader)
    // Base manifest is always pt-BR
    const baseManifest = (await import(`@/manifests/${moduleId}/manifest.yaml`))
      .default as ModuleManifest

    let finalManifest = baseManifest

    // If requesting non-default locale, load and merge overlay
    if (locale !== 'pt-BR') {
      try {
        const localeOverlay = (
          await import(`@/manifests/${moduleId}/manifest.${locale}.yaml`)
        ).default as ModuleManifestLocale

        finalManifest = mergeManifestWithLocale(baseManifest, localeOverlay)
      } catch {
        // Locale file doesn't exist, use base manifest
        // eslint-disable-next-line no-console
        console.warn(
          `[Manifest] Locale file for ${moduleId}/${locale} not found, using base manifest`
        )
      }
    }

    const result: ResolvedManifest = {
      manifest: finalManifest,
      moduleId,
      locale,
      loadedAt: new Date(),
    }

    // Cache the result
    manifestCache.set(cacheKey, result)

    return result
  } catch (error) {
    throw new Error(
      `[Manifest] Failed to load manifest for module "${moduleId}": ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Loads all manifests for a given locale
 *
 * @param locale - The locale to load (default: 'pt-BR')
 * @param moduleIds - Optional subset of modules to load (default: all)
 * @returns Map of module ID to loaded manifest
 *
 * @example
 * ```typescript
 * const manifests = await loadAllManifests('en-US')
 * manifests.forEach((loaded, moduleId) => {
 *   console.log(moduleId, loaded.manifest.module.name)
 * })
 * ```
 */
export async function loadAllManifests(
  locale: SupportedLocale = 'pt-BR',
  moduleIds: ModuleId[] = [...ALL_MODULE_IDS]
): Promise<Map<ModuleId, ResolvedManifest>> {
  const results = new Map<ModuleId, ResolvedManifest>()

  const loadPromises = moduleIds.map(async moduleId => {
    try {
      const loaded = await loadManifest(moduleId, locale)
      results.set(moduleId, loaded)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[Manifest] Failed to load ${moduleId}:`, error)
    }
  })

  await Promise.all(loadPromises)

  return results
}

/**
 * Clears the manifest cache
 * Useful for development/hot-reload scenarios
 */
export function clearManifestCache(): void {
  manifestCache.clear()
}

/**
 * Gets a manifest from cache without loading
 *
 * @param moduleId - The module identifier
 * @param locale - The locale
 * @returns The cached manifest or undefined
 */
export function getCachedManifest(
  moduleId: ModuleId,
  locale: SupportedLocale = 'pt-BR'
): ResolvedManifest | undefined {
  return manifestCache.get(`${moduleId}:${locale}`)
}
