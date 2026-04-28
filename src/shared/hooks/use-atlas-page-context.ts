'use client'

/**
 * useAtlasPageContext Hook
 *
 * Automatically injects the current page context into CopilotKit.
 * This enables the Atlas AI to know where the user is and what they're viewing
 * without any manual configuration.
 *
 * Usage:
 * - Add to any page/component to make its context available to Atlas
 * - Context is automatically accumulated by CopilotKit
 */
import { useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCopilotReadable } from '@copilotkit/react-core'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Module identifiers in the application
 */
export type PageModule =
  | 'dashboard'
  | 'upstream'
  | 'downstream'
  | 'migration'
  | 'migration-wizard'
  | 'atlas'
  | 'messages'
  | 'connections'
  | 'environments'
  | 'onboarding'
  | 'module-config'
  | 'unknown'

/**
 * Entity types that can be viewed/edited
 */
export type PageEntityType =
  | 'epic'
  | 'migration'
  | 'signal'
  | 'feedback'
  | 'insight'
  | 'message'
  | 'connection'
  | 'environment'
  | 'manifest'
  | 'thread'
  | null

/**
 * Page context information
 */
export interface PageContext {
  /** Current module */
  module: PageModule

  /** Type of entity being viewed (if any) */
  entityType: PageEntityType

  /** ID of the entity being viewed (if any) */
  entityId: string | null

  /** Current tab or view mode (if any) */
  tab?: string

  /** Current step in a wizard (if any) */
  step?: string

  /** Full pathname */
  pathname: string

  /** Human-readable description of current location */
  description: string
}

// ============================================================================
// MODULE DETECTION
// ============================================================================

/**
 * Detect which module the user is in based on pathname
 */
function detectModule(pathname: string): PageModule {
  if (pathname.includes('/upstream')) return 'upstream'
  if (pathname.includes('/downstream')) return 'downstream'
  if (pathname.includes('/migration-wizard')) return 'migration-wizard'
  if (pathname.includes('/migration')) return 'migration'
  if (pathname.includes('/atlas')) return 'atlas'
  if (pathname.includes('/messages')) return 'messages'
  if (pathname.includes('/connections')) return 'connections'
  if (pathname.includes('/environments')) return 'environments'
  if (pathname.includes('/onboarding')) return 'onboarding'
  if (pathname.includes('/module-config')) return 'module-config'
  if (pathname.includes('/dashboard')) return 'dashboard'
  return 'unknown'
}

/**
 * Get entity type and ID param name for a module
 */
function getEntityConfig(module: PageModule): {
  entityType: PageEntityType
  paramName: string
} {
  switch (module) {
    case 'upstream':
      return { entityType: 'epic', paramName: 'epicId' }
    case 'downstream':
      return { entityType: 'thread', paramName: 'threadId' }
    case 'migration':
    case 'migration-wizard':
      return { entityType: 'migration', paramName: 'migrationId' }
    case 'atlas':
      return { entityType: 'signal', paramName: 'signalId' }
    case 'messages':
      return { entityType: 'message', paramName: 'messageId' }
    case 'connections':
      return { entityType: 'connection', paramName: 'connectionId' }
    case 'environments':
      return { entityType: 'environment', paramName: 'environmentId' }
    case 'onboarding':
      return { entityType: 'manifest', paramName: 'manifestId' }
    default:
      return { entityType: null, paramName: '' }
  }
}

/**
 * Generate human-readable description of current location
 */
function generateDescription(
  module: PageModule,
  entityType: PageEntityType,
  entityId: string | null,
  tab?: string
): string {
  const moduleNames: Record<PageModule, string> = {
    dashboard: 'Dashboard',
    upstream: 'Upstream Wizard',
    downstream: 'Downstream',
    migration: 'Migration Inspector',
    'migration-wizard': 'Migration Wizard',
    atlas: 'Atlas',
    messages: 'Messages',
    connections: 'Connections',
    environments: 'Environments',
    onboarding: 'Onboarding',
    'module-config': 'Module Configuration',
    unknown: 'Unknown Page',
  }

  let description = `User is viewing ${moduleNames[module]}`

  if (entityType && entityId) {
    description += ` - ${entityType} "${entityId}"`
  }

  if (tab) {
    description += ` (${tab} tab)`
  }

  return description
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook that automatically injects page context into CopilotKit
 *
 * @returns The current page context
 */
export function useAtlasPageContext(): PageContext {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Build context from URL
  const context = useMemo((): PageContext => {
    const pageModule = detectModule(pathname)
    const { entityType, paramName } = getEntityConfig(pageModule)
    const entityId = paramName ? searchParams.get(paramName) : null
    const tab = searchParams.get('tab') || undefined
    const step = searchParams.get('step') || undefined

    return {
      module: pageModule,
      entityType,
      entityId,
      tab,
      step,
      pathname,
      description: generateDescription(pageModule, entityType, entityId, tab),
    }
  }, [pathname, searchParams])

  // Register context with CopilotKit
  useCopilotReadable({
    description:
      'Current page context - which module the user is viewing, what entity they are looking at, and any active tab or step',
    value: context,
  })

  return context
}

// ============================================================================
// ADDITIONAL CONTEXT HOOKS
// ============================================================================

/**
 * Hook to add custom entity details to the context
 *
 * Use this in module pages to provide richer context about the current entity
 */
export function useAtlasEntityContext<T extends Record<string, unknown>>(
  entityType: string,
  entityData: T | null,
  options?: {
    description?: string
  }
): void {
  useCopilotReadable({
    description:
      options?.description ||
      `Details of the current ${entityType} being viewed`,
    value: entityData,
    available: entityData ? 'enabled' : 'disabled',
  })
}

/**
 * Hook to add module-specific state to the context
 */
export function useAtlasModuleState<T extends Record<string, unknown>>(
  moduleName: string,
  state: T,
  options?: {
    description?: string
  }
): void {
  useCopilotReadable({
    description:
      options?.description || `Current state of the ${moduleName} module`,
    value: state,
  })
}

export default useAtlasPageContext
