// src/shared/session/session-provider.tsx
'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useSession } from 'next-auth/react'

import {
  clearAllConnectionsFromMemory,
  getAllConnectionsFromMemory,
} from '@/features/connections/hooks/use-connection-manager'
import { useActiveLicense } from '@/shared/hooks/use-active-license'
import { useActiveNamespace } from '@/shared/hooks/use-active-namespace'
import { useCurrentNamespaceRole } from '@/shared/hooks/use-current-namespace-role'
import { useMcpServerKey } from '@/shared/hooks/use-mcp-server-key'
import { useUserApiKey } from '@/shared/hooks/use-user-api-key'
import { buildSessionEnvironment } from '@/shared/lib/cockpit/environment-builder'
import { useEnvironmentStore } from '@/shared/stores/environment-store'
import { usePermissionStore } from '@/shared/stores/permission-store'

import { getLoadersInOrder } from './loaders'
import { useSessionStore } from './session-store'
import type {
  SessionActions,
  SessionContextValue,
  SessionTenantContext,
} from './types'

// Create context
const SessionContext = createContext<SessionContextValue | null>(null)

interface SessionProviderProps {
  children: React.ReactNode
}

export function SessionOrchestratorProvider({
  children,
}: SessionProviderProps) {
  // NextAuth session
  const { data: session, status: sessionStatus } = useSession()

  // API Keys
  const { apiKey, userId, isLoading: isLoadingUserKey } = useUserApiKey()
  const { mcpServerKey, isLoading: isLoadingMcpKey } = useMcpServerKey()

  // License/Namespace
  const { activeLicense, isLoading: isLoadingLicense } = useActiveLicense()
  const { activeNamespace, isLoading: isLoadingNamespace } =
    useActiveNamespace()
  const { currentRole } = useCurrentNamespaceRole()

  // FIX: Use Zustand selectors to avoid infinite re-renders
  // State (changes trigger re-render)
  const phase = useSessionStore(state => state.phase)
  const error = useSessionStore(state => state.error)
  const auth = useSessionStore(state => state.auth)
  const tenant = useSessionStore(state => state.tenant)
  const connection = useSessionStore(state => state.connection)
  const modules = useSessionStore(state => state.modules)
  const loadingModules = useSessionStore(state => state.loadingModules)
  const loadedModules = useSessionStore(state => state.loadedModules)

  // Actions (stable references, don't cause re-renders)
  const setPhase = useSessionStore(state => state.setPhase)
  const setError = useSessionStore(state => state.setError)
  const setAuth = useSessionStore(state => state.setAuth)
  const setTenant = useSessionStore(state => state.setTenant)
  const setConnection = useSessionStore(state => state.setConnection)
  const setModules = useSessionStore(state => state.setModules)
  const startLoadingModule = useSessionStore(state => state.startLoadingModule)
  const finishLoadingModule = useSessionStore(
    state => state.finishLoadingModule
  )
  const resetLoadingState = useSessionStore(state => state.resetLoadingState)
  const reset = useSessionStore(state => state.reset)

  const { addEnvironment, deleteEnvironment, getEnvironmentById } =
    useEnvironmentStore()
  const { setIsContextSwitching } = usePermissionStore()

  // Refs for tracking
  const isBootstrapping = useRef(false)
  const currentTenantRef = useRef<SessionTenantContext | null>(null)

  // ========================================================================
  // CONTEXT CHANGE DETECTION
  // Detect when license/namespace changes EXTERNALLY and reset orchestrator
  // ========================================================================
  useEffect(() => {
    // Skip if no current tenant yet (initial load)
    if (!currentTenantRef.current) return
    // Skip if still loading data
    if (isLoadingLicense || isLoadingNamespace) return
    if (!activeLicense || !activeNamespace) return

    const currentLicenseId = currentTenantRef.current.licenseId
    const currentNamespaceId = currentTenantRef.current.namespaceId
    const newLicenseId = activeLicense.id
    const newNamespaceId = activeNamespace.id

    // Detect license OR namespace change
    const licenseChanged = currentLicenseId !== newLicenseId
    const namespaceChanged = currentNamespaceId !== newNamespaceId

    if (licenseChanged || namespaceChanged) {
      console.log('[SessionOrchestrator] 🔄 Context changed externally:', {
        licenseChanged,
        namespaceChanged,
        fromLicense: currentLicenseId,
        toLicense: newLicenseId,
        fromNamespace: currentNamespaceId,
        toNamespace: newNamespaceId,
        currentPhase: phase,
      })

      // Cleanup all loaders
      const loaders = getLoadersInOrder()
      loaders.forEach(loader => loader.cleanup())

      // Reset modules
      setModules({
        moduleConfig: null,
        moduleManifest: null,
        manifest: null,
      })

      // Reset loading state (critical for re-running Phase 3)
      resetLoadingState()

      // CRITICAL: Clear session environment BEFORE clearing connections
      // This ensures stale environment data is removed
      if (getEnvironmentById('session-current')) {
        console.log('[SessionOrchestrator] 🗑️ Deleting session-environment')
        deleteEnvironment('session-current')
      }

      // CRITICAL: Clear ALL connections from memory (session + custom)
      // This prevents stale connections from being used after context switch
      clearAllConnectionsFromMemory()

      // Clear connection state (will be recreated by useAutoEnvironment)
      setConnection(null)

      // Reset bootstrapping flag
      isBootstrapping.current = false

      // Clear tenant ref (will be set again in Phase 1)
      currentTenantRef.current = null

      // Reset to auth phase to rebuild everything
      setPhase('auth')
    }
  }, [
    activeLicense,
    activeNamespace,
    isLoadingLicense,
    isLoadingNamespace,
    phase,
    setPhase,
    setModules,
    setConnection,
    resetLoadingState,
  ])

  // ========================================================================
  // PHASE 1: AUTH
  // ========================================================================
  useEffect(() => {
    // Skip if already past auth phase
    if (phase !== 'initializing' && phase !== 'auth') return

    // Wait for NextAuth
    if (sessionStatus === 'loading') return
    if (!session) {
      setPhase('initializing')
      return
    }

    setPhase('auth')

    // Wait for API keys
    if (isLoadingUserKey || isLoadingMcpKey) return
    if (!apiKey?.key || !mcpServerKey) {
      console.log('[SessionOrchestrator] Waiting for API keys...')
      return
    }

    // Wait for license/namespace
    if (isLoadingLicense || isLoadingNamespace) return
    if (!activeLicense || !activeNamespace) {
      console.log('[SessionOrchestrator] Waiting for license/namespace...')
      return
    }

    // Auth complete!
    const accessToken = (session as { accessToken?: string })?.accessToken
    if (!accessToken) return

    setAuth({
      userId: userId || apiKey.userId,
      accessToken,
      userApiKey: apiKey.key,
      mcpServerKey,
    })

    const newTenant = {
      licenseId: activeLicense.id,
      licenseName: activeLicense.name,
      namespaceId: activeNamespace.id,
      namespaceName: activeNamespace.name,
      role: currentRole,
    }
    setTenant(newTenant)
    currentTenantRef.current = newTenant

    console.log('[SessionOrchestrator] Auth complete, moving to setup')
    setPhase('setup')
  }, [
    phase,
    sessionStatus,
    session,
    isLoadingUserKey,
    isLoadingMcpKey,
    apiKey,
    userId,
    mcpServerKey,
    isLoadingLicense,
    isLoadingNamespace,
    activeLicense,
    activeNamespace,
    currentRole,
    setPhase,
    setAuth,
    setTenant,
  ])

  // ========================================================================
  // PHASE 2: SESSION SETUP
  // ========================================================================
  useEffect(() => {
    if (phase !== 'setup') return
    if (!auth || !tenant) return
    if (!activeLicense || !activeNamespace) return
    if (isBootstrapping.current) return

    isBootstrapping.current = true

    const setupSession = async () => {
      try {
        console.log('[SessionOrchestrator] Building session environment...')

        // Build environment using actual License and Namespace objects
        const environment = buildSessionEnvironment({
          license: activeLicense,
          namespace: activeNamespace,
          userApiKey: auth.userApiKey,
          mcpServerApiKey: auth.mcpServerKey,
        })

        // Delete old environment if exists
        if (getEnvironmentById('session-current')) {
          deleteEnvironment('session-current')
        }

        addEnvironment(environment)
        console.log('[SessionOrchestrator] Environment created')

        // NOTE: Bootstrap agent and connection are still managed by useAutoEnvironment
        // This will be migrated in a follow-up task (Task 10)
        // For now, we transition to loading and wait for connection sync

        setPhase('loading')
      } catch (err) {
        console.error('[SessionOrchestrator] Setup failed:', err)
        setError(err instanceof Error ? err.message : 'Setup failed')
      } finally {
        isBootstrapping.current = false
      }
    }

    setupSession()
  }, [
    phase,
    auth,
    tenant,
    activeLicense,
    activeNamespace,
    addEnvironment,
    deleteEnvironment,
    getEnvironmentById,
    setPhase,
    setError,
  ])

  // ========================================================================
  // CONNECTION SYNC (from useAutoEnvironment - temporary)
  // ========================================================================
  useEffect(() => {
    if (phase !== 'loading' && phase !== 'ready') return

    // Sync connection from existing system
    const checkConnection = () => {
      const connections = getAllConnectionsFromMemory()
      const sessionConnection = connections.find(
        c => c.id === 'session-connection'
      )

      if (sessionConnection && !connection) {
        console.log(
          '[SessionOrchestrator] Synced connection from useAutoEnvironment'
        )
        setConnection(sessionConnection)
      }
    }

    // Check immediately and on interval
    checkConnection()
    const interval = setInterval(checkConnection, 500)

    // Listen for connection changes
    const handleConnectionsChanged = () => checkConnection()
    window.addEventListener('connections-changed', handleConnectionsChanged)

    return () => {
      clearInterval(interval)
      window.removeEventListener(
        'connections-changed',
        handleConnectionsChanged
      )
    }
  }, [phase, connection, setConnection])

  // ========================================================================
  // PHASE 3: MODULE LOADING
  // ========================================================================
  useEffect(() => {
    if (phase !== 'loading') return
    if (!connection) {
      // Wait for connection from useAutoEnvironment (temporary)
      return
    }
    if (!tenant) return
    // Prevent multiple runs
    if (loadingModules.length > 0 || loadedModules.length > 0) return

    const loadModules = async () => {
      console.log('[SessionOrchestrator] Loading modules...')

      const loaders = getLoadersInOrder()

      for (const loader of loaders) {
        try {
          startLoadingModule(loader.id)
          const data = await loader.load(connection, tenant)

          // Update store with loaded data
          setModules({ [loader.id]: data } as Record<string, unknown>)
          finishLoadingModule(loader.id)
        } catch (err) {
          console.error(
            `[SessionOrchestrator] Failed to load ${loader.id}:`,
            err
          )
          finishLoadingModule(loader.id)
        }
      }

      console.log('[SessionOrchestrator] All modules loaded')
      setPhase('ready')
    }

    loadModules()
  }, [
    phase,
    connection,
    tenant,
    loadingModules.length,
    loadedModules.length,
    startLoadingModule,
    finishLoadingModule,
    setModules,
    setPhase,
  ])

  // ========================================================================
  // ACTIONS
  // ========================================================================
  const switchContext = useCallback(
    async (licenseId: string, namespaceId: string) => {
      console.log('[SessionOrchestrator] Switching context:', {
        licenseId,
        namespaceId,
      })

      setPhase('switching')
      setIsContextSwitching(true)

      // Cleanup all loaders
      const loaders = getLoadersInOrder()
      loaders.forEach(loader => loader.cleanup())

      // Reset modules
      setModules({
        moduleConfig: null,
        moduleManifest: null,
        manifest: null,
      })

      // Update permission store (triggers cascade)
      usePermissionStore.getState().setActiveLicense(licenseId)
      usePermissionStore.getState().setActiveNamespace(namespaceId)

      // Reset to auth phase to rebuild
      reset()
      currentTenantRef.current = null

      setIsContextSwitching(false)
    },
    [setPhase, setIsContextSwitching, setModules, reset]
  )

  const retry = useCallback(async () => {
    setError(null)
    setPhase('initializing')
  }, [setError, setPhase])

  const refreshModules = useCallback(async () => {
    if (!connection || !tenant) return

    // Reset loading state
    setModules({
      moduleConfig: null,
      moduleManifest: null,
      manifest: null,
    })

    setPhase('loading')
  }, [connection, tenant, setModules, setPhase])

  const isModuleAccessibleAction = useCallback((_moduleId: string): boolean => {
    // TODO: Implement based on loaded module config
    // This will be properly implemented in useModuleAccessV2
    return true
  }, [])

  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================
  // FIX: Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<SessionContextValue>(
    () => ({
      // State
      phase,
      error,
      auth,
      tenant,
      connection,
      modules,
      loadingModules,
      loadedModules,
      // Actions
      switchContext,
      retry,
      refreshModules,
      isModuleAccessible: isModuleAccessibleAction,
    }),
    [
      phase,
      error,
      auth,
      tenant,
      connection,
      modules,
      loadingModules,
      loadedModules,
      switchContext,
      retry,
      refreshModules,
      isModuleAccessibleAction,
    ]
  )

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  )
}

/**
 * Hook to access session context
 */
export function useSessionOrchestrator(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error(
      'useSessionOrchestrator must be used within SessionOrchestratorProvider'
    )
  }
  return context
}

/**
 * Hook for simple session state (no actions)
 */
export function useSessionState() {
  const { phase, error, auth, tenant, connection, modules } =
    useSessionOrchestrator()
  return { phase, error, auth, tenant, connection, modules }
}

/**
 * Hook specifically for module access
 */
export function useModuleAccessFromSession() {
  const { modules, tenant, isModuleAccessible } = useSessionOrchestrator()
  return {
    moduleConfig: modules.moduleConfig,
    role: tenant?.role,
    isModuleAccessible,
  }
}
