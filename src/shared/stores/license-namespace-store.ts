'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { License, Namespace } from '@/shared/types/license'

/**
 * License and Namespace Store
 *
 * Manages the active license and namespace selection for the current user.
 * Data is persisted in localStorage to maintain selection across sessions.
 *
 * This store is used to:
 * 1. Store the currently selected license and namespace
 * 2. Automatically inject LicenseId and NamespaceId headers in API calls
 * 3. Filter data based on user's active context
 */
interface LicenseNamespaceState {
  // Active license
  activeLicense: License | null
  setActiveLicense: (license: License | null) => void

  // Active namespace
  activeNamespace: Namespace | null
  setActiveNamespace: (namespace: Namespace | null) => void

  // Hydration state (for SSR compatibility)
  hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
}

export const useLicenseNamespaceStore = create<LicenseNamespaceState>()(
  persist(
    set => ({
      activeLicense: null,
      setActiveLicense: license => set({ activeLicense: license }),

      activeNamespace: null,
      setActiveNamespace: namespace => set({ activeNamespace: namespace }),

      hasHydrated: false,
      setHasHydrated: state => set({ hasHydrated: state }),
    }),
    {
      name: 'license-namespace-store', // localStorage key
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true)
      },
    }
  )
)
