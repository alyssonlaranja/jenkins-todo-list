// src/shared/session/loaders/index.ts
'use client'

import type { ModuleLoader } from '../types'
import { moduleConfigLoader } from './module-config-loader'
import { moduleManifestLoader } from './module-manifest-loader'

/**
 * Registry of all module loaders
 * Add new loaders here as they are created
 */
export const moduleLoaders: ModuleLoader[] = [
  moduleConfigLoader,
  moduleManifestLoader,
  // Add more loaders here:
  // upstreamLoader,
]

/**
 * Get loader by ID
 */
export function getLoader(id: string): ModuleLoader | undefined {
  return moduleLoaders.find(loader => loader.id === id)
}

/**
 * Get loaders sorted by dependency order
 * Loaders with no dependencies come first
 */
export function getLoadersInOrder(): ModuleLoader[] {
  const sorted: ModuleLoader[] = []
  const remaining = [...moduleLoaders]
  const loaded = new Set<string>()

  while (remaining.length > 0) {
    const nextIndex = remaining.findIndex(loader => {
      const deps = loader.dependencies || []
      return deps.every(dep => loaded.has(dep))
    })

    if (nextIndex === -1) {
      // Circular dependency or missing dependency
      console.error('[LoaderRegistry] Circular or missing dependency detected')
      sorted.push(...remaining)
      break
    }

    const loader = remaining.splice(nextIndex, 1)[0]!
    sorted.push(loader)
    loaded.add(loader.id)
  }

  return sorted
}

export { moduleConfigLoader, moduleManifestLoader }
