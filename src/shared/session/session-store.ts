// src/shared/session/session-store.ts
'use client'

import { create } from 'zustand'

import type {
  SessionAuthContext,
  SessionModules,
  SessionPhase,
  SessionState,
  SessionTenantContext,
} from './types'

interface SessionStore extends SessionState {
  // Setters
  setPhase: (phase: SessionPhase) => void
  setError: (error: string | null) => void
  setAuth: (auth: SessionAuthContext | null) => void
  setTenant: (tenant: SessionTenantContext | null) => void
  setConnection: (connection: SessionState['connection']) => void
  setModules: (modules: Partial<SessionModules>) => void

  // Loading tracking
  startLoadingModule: (moduleId: string) => void
  finishLoadingModule: (moduleId: string) => void
  resetLoadingState: () => void

  // Reset
  reset: () => void
}

const initialState: SessionState = {
  phase: 'initializing',
  error: null,
  auth: null,
  tenant: null,
  connection: null,
  modules: {
    moduleConfig: null,
    moduleManifest: null,
    manifest: null,
  },
  loadingModules: [],
  loadedModules: [],
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  ...initialState,

  setPhase: phase => {
    console.log('[SessionStore] Phase:', phase)
    set({ phase })
  },

  setError: error => {
    console.log('[SessionStore] Error:', error)
    set({ error, phase: error ? 'error' : get().phase })
  },

  setAuth: auth => {
    console.log('[SessionStore] Auth:', auth ? 'set' : 'cleared')
    set({ auth })
  },

  setTenant: tenant => {
    console.log('[SessionStore] Tenant:', tenant)
    set({ tenant })
  },

  setConnection: connection => {
    console.log('[SessionStore] Connection:', connection?.id ?? 'cleared')
    set({ connection })
  },

  setModules: modules => {
    console.log('[SessionStore] Modules updated:', Object.keys(modules))
    set(state => ({
      modules: { ...state.modules, ...modules },
    }))
  },

  startLoadingModule: moduleId => {
    set(state => ({
      loadingModules: [...state.loadingModules, moduleId],
    }))
  },

  finishLoadingModule: moduleId => {
    set(state => ({
      loadingModules: state.loadingModules.filter(id => id !== moduleId),
      loadedModules: [...state.loadedModules, moduleId],
    }))
  },

  resetLoadingState: () => {
    console.log('[SessionStore] Reset loading state')
    set({
      loadingModules: [],
      loadedModules: [],
    })
  },

  reset: () => {
    console.log('[SessionStore] Reset')
    set(initialState)
  },
}))

/**
 * Direct store access for use outside React components
 */
export const getSessionState = () => useSessionStore.getState()
