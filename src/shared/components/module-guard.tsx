'use client'

import { ReactNode } from 'react'

import { MODULE_METADATA } from '@/features/module-config/constants/default-config'
import type { ModuleId } from '@/features/module-config/types'
import { useModuleAccessV2 } from '@/shared/session/hooks/use-module-access-v2'

import { UnauthorizedMessage } from './unauthorized-message'

interface ModuleGuardProps {
  moduleId: ModuleId
  children: ReactNode
  fallback?: ReactNode
}

export function ModuleGuard({
  moduleId,
  children,
  fallback,
}: ModuleGuardProps) {
  const { isModuleAccessible, loading, getModuleAccessResult } =
    useModuleAccessV2()

  if (loading) {
    return (
      fallback || (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )
    )
  }

  const hasAccess = isModuleAccessible(moduleId)

  if (!hasAccess) {
    const result = getModuleAccessResult(moduleId)
    const metadata = MODULE_METADATA[moduleId]

    return (
      <UnauthorizedMessage
        moduleId={moduleId}
        moduleName={metadata?.name}
        requiredRole={result.config?.allowedRoles?.join(', ')}
      />
    )
  }

  return <>{children}</>
}
