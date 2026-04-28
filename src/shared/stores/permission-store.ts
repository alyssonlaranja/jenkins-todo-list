import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Role types supported by the system
 * Pattern: cockpit-portal/src/permissions/core/types.ts
 */
export type Role = 'admin' | 'curator' | 'user' | 'userplus' | 'globaladmin'

/**
 * Namespace-specific role assignment
 * Pattern: cockpit-portal/src/features/users/hooks/use-current-user.ts
 */
export interface NamespaceUserRole {
  namespaceId: string
  userId: string
  roleId: string
  roleName?: string
  namespaceName?: string
}

/**
 * Permission Store
 * Tracks active license, namespace, and roles for multi-tenancy
 * Pattern: cockpit-portal/src/permissions/core/store.ts
 */
interface PermissionState {
  // Multi-tenancy context
  activeLicenseId: string | null
  activeNamespaceId: string | null

  // Role management
  currentNamespaceRole: Role | null
  namespaceRoles: NamespaceUserRole[]
  hasHydrated: boolean

  // Context switching state (for UI blocking during license/namespace change)
  isContextSwitching: boolean

  // Actions - Multi-tenancy
  setActiveLicense: (id: string | null) => void
  setActiveNamespace: (id: string | null) => void

  // Actions - Role management
  setCurrentNamespaceRole: (role: Role | null) => void
  setNamespaceRoles: (roles: NamespaceUserRole[]) => void
  setHasHydrated: (hydrated: boolean) => void

  // Actions - Context switching
  setIsContextSwitching: (switching: boolean) => void
}

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      // Multi-tenancy context
      activeLicenseId: null,
      activeNamespaceId: null,

      // Role management
      currentNamespaceRole: null,
      namespaceRoles: [],
      hasHydrated: false,

      // Context switching state
      isContextSwitching: false,

      // Actions - Multi-tenancy
      setActiveLicense: id => {
        const state = get()
        const isChanging =
          state.activeLicenseId !== null && state.activeLicenseId !== id

        set({
          activeLicenseId: id,
          activeNamespaceId: null, // Reset namespace when license changes to trigger auto-selection
          // NOTE: Don't reset currentNamespaceRole here - let it persist until a new role is resolved
          // This prevents the "flash" of restricted access when switching licenses
          // Set context switching flag if actually changing (not initial selection)
          isContextSwitching: isChanging,
        })
      },

      setActiveNamespace: id => {
        const state = get()
        const isChanging =
          state.activeNamespaceId !== null && state.activeNamespaceId !== id

        // DEBUG: Log namespace change
        console.log('[PermissionStore] 🔄 setActiveNamespace:', {
          from: state.activeNamespaceId,
          to: id,
          isChanging,
          namespaceRolesCount: state.namespaceRoles.length,
          currentNamespaceRole: state.currentNamespaceRole,
        })

        // Set context switching flag if actually changing (not initial selection)
        if (isChanging) {
          set({ isContextSwitching: true })
        }

        set({ activeNamespaceId: id })

        // Auto-update current namespace role when namespace changes
        // ONLY update role if we have namespace roles from API
        // If API hasn't returned roles yet, preserve existing role (from persistence)
        if (id && state.namespaceRoles.length > 0) {
          const namespaceRole = state.namespaceRoles.find(
            r => r.namespaceId === id
          )
          if (namespaceRole?.roleName) {
            console.log(
              '[PermissionStore] ✅ Found role for namespace:',
              namespaceRole.roleName
            )
            set({ currentNamespaceRole: namespaceRole.roleName as Role })
          } else {
            console.log(
              '[PermissionStore] ⚠️ No role found for namespace, keeping current:',
              state.currentNamespaceRole
            )
            // Don't set null - preserve current role
          }
        } else {
          console.log(
            '[PermissionStore] ℹ️ No namespace roles from API, preserving current role:',
            state.currentNamespaceRole
          )
          // Don't set null - preserve current role from persistence
        }
      },

      // Actions - Role management
      setCurrentNamespaceRole: role => set({ currentNamespaceRole: role }),

      setNamespaceRoles: roles => {
        const state = get()
        set({ namespaceRoles: roles })

        // Auto-update current namespace role if active namespace is set
        if (state.activeNamespaceId) {
          const namespaceRole = roles.find(
            r => r.namespaceId === state.activeNamespaceId
          )
          if (namespaceRole?.roleName) {
            set({ currentNamespaceRole: namespaceRole.roleName as Role })
          }
        }
      },

      setHasHydrated: hydrated => set({ hasHydrated: hydrated }),
      setIsContextSwitching: switching =>
        set({ isContextSwitching: switching }),
    }),
    {
      name: 'permission-store',
      // FIX: Add onRehydrateStorage to properly set hasHydrated flag
      onRehydrateStorage: () => state => {
        // This callback is called when hydration is complete
        if (state) {
          state.setHasHydrated(true)
          console.log('[PermissionStore] ✅ Hydration complete:', {
            activeLicenseId: state.activeLicenseId,
            activeNamespaceId: state.activeNamespaceId,
          })
        }
      },
      // Don't persist these transient states
      partialize: (state): Partial<PermissionState> => ({
        activeLicenseId: state.activeLicenseId,
        activeNamespaceId: state.activeNamespaceId,
        currentNamespaceRole: state.currentNamespaceRole,
        namespaceRoles: state.namespaceRoles,
        // Exclude: hasHydrated, isContextSwitching (transient states)
      }),
    }
  )
)
