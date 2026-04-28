'use client'

import { useEffect, useState } from 'react'

import { useI18n } from '@/shared/hooks/use-i18n'

import {
  ALL_MODULE_IDS,
  getCachedManifest,
  loadAllManifests,
  loadManifest,
  type ModuleId,
} from './loader'
import type { ModuleManifest, SupportedLocale } from './types'

/**
 * React Hook for loading module manifests
 *
 * Provides a simple interface for loading manifests with locale support.
 * Uses the manifest loader with caching.
 */

/**
 * State for manifest loading
 */
interface ManifestState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
}

/**
 * Hook to load a single module manifest
 *
 * @param moduleId - The module to load
 * @returns Manifest data, loading state, and error
 *
 * @example
 * ```tsx
 * function ModuleInfo({ moduleId }: { moduleId: ModuleId }) {
 *   const { manifest, isLoading, error } = useManifest(moduleId)
 *
 *   if (isLoading) return <Spinner />
 *   if (error) return <Error message={error.message} />
 *
 *   return <h1>{manifest?.module.name}</h1>
 * }
 * ```
 */
export function useManifest(
  moduleId: ModuleId
): ManifestState<ModuleManifest> & { reload: () => void } {
  const { currentLanguage } = useI18n()
  const locale = (currentLanguage ?? 'pt-BR') as SupportedLocale

  const [state, setState] = useState<ManifestState<ModuleManifest>>(() => {
    // Try to get from cache first
    const cached = getCachedManifest(moduleId, locale)
    return {
      data: cached?.manifest ?? null,
      isLoading: !cached,
      error: null,
    }
  })

  const load = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const result = await loadManifest(moduleId, locale)
      setState({ data: result.manifest, isLoading: false, error: null })
    } catch (err) {
      setState({
        data: null,
        isLoading: false,
        error:
          err instanceof Error ? err : new Error('Failed to load manifest'),
      })
    }
  }

  useEffect(() => {
    // Check if we need to reload for a different locale
    const cached = getCachedManifest(moduleId, locale)
    if (cached) {
      setState({ data: cached.manifest, isLoading: false, error: null })
    } else {
      void load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, locale])

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    reload: load,
  }
}

/**
 * Hook to load all module manifests
 *
 * @param moduleIds - Optional subset of modules to load (default: all)
 * @returns Map of manifests, loading state, and error
 *
 * @example
 * ```tsx
 * function ModuleList() {
 *   const { manifests, isLoading } = useAllManifests()
 *
 *   if (isLoading) return <Spinner />
 *
 *   return (
 *     <ul>
 *       {Array.from(manifests.values()).map(m => (
 *         <li key={m.module.id}>{m.module.name}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useAllManifests(
  moduleIds: ModuleId[] = [...ALL_MODULE_IDS]
): ManifestState<Map<ModuleId, ModuleManifest>> & { reload: () => void } {
  const { currentLanguage } = useI18n()
  const locale = (currentLanguage ?? 'pt-BR') as SupportedLocale

  const [state, setState] = useState<
    ManifestState<Map<ModuleId, ModuleManifest>>
  >({
    data: null,
    isLoading: true,
    error: null,
  })

  const load = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const results = await loadAllManifests(locale, moduleIds)
      const manifestsOnly = new Map<ModuleId, ModuleManifest>()
      results.forEach((resolved, id) => {
        manifestsOnly.set(id, resolved.manifest)
      })
      setState({ data: manifestsOnly, isLoading: false, error: null })
    } catch (err) {
      setState({
        data: null,
        isLoading: false,
        error:
          err instanceof Error ? err : new Error('Failed to load manifests'),
      })
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, JSON.stringify(moduleIds)])

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    reload: load,
  }
}

/**
 * Hook to get manifest metadata for sidebar/navigation
 *
 * @returns Array of module metadata sorted by group
 */
export function useModuleMetadata(): {
  modules: Array<{ id: ModuleId; name: string; icon: string; group: string }>
  isLoading: boolean
} {
  const { data: manifests, isLoading } = useAllManifests()

  if (!manifests || isLoading) {
    return { modules: [], isLoading }
  }

  const modules = Array.from(manifests.entries()).map(([id, manifest]) => ({
    id,
    name: manifest.module.name,
    icon: manifest.module.icon,
    group: manifest.module.group,
  }))

  // Sort by group order: setup, operations, communication, admin
  const groupOrder = ['setup', 'operations', 'communication', 'admin']
  modules.sort((a, b) => {
    const aOrder = groupOrder.indexOf(a.group)
    const bOrder = groupOrder.indexOf(b.group)
    return aOrder - bOrder
  })

  return { modules, isLoading }
}
