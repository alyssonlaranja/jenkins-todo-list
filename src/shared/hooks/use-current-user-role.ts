'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { jwtDecode } from 'jwt-decode'

import { Role, usePermissionStore } from '@/shared/stores/permission-store'

/**
 * Extended NextAuth Session type
 */
interface ExtendedSession {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    id?: string
    sub?: string
  } | null
  accessToken?: string
  error?: string
}

/**
 * JWT payload structure
 */
interface JwtPayload {
  sub?: string
  nameid?: string
  role?: string | string[]
  roles?: string | string[]
  Role?: string | string[]
  Roles?: string | string[]
  [key: string]: unknown
}

/**
 * Valid roles in the system
 */
const VALID_ROLES: Role[] = [
  'admin',
  'curator',
  'user',
  'userplus',
  'globaladmin',
]

/**
 * Utility function to extract the role from JWT payload
 * Pattern: cockpit-portal/src/features/users/hooks/use-current-user.ts
 */
function extractRoleFromPayload(payload: JwtPayload): string | null {
  const roleExtractors: Array<(p: JwtPayload) => string | null> = [
    // Direct string values
    p => (typeof p.role === 'string' ? p.role : null),
    p => (typeof p.roles === 'string' ? p.roles : null),
    p => (typeof p.Role === 'string' ? p.Role : null),
    p => (typeof p.Roles === 'string' ? p.Roles : null),

    // Arrays - use most frequent role
    p => {
      const arr = p.role
      if (Array.isArray(arr) && arr.length > 0) {
        return getMostFrequentRole(arr)
      }
      return null
    },
    p => {
      const arr = p.roles
      if (Array.isArray(arr) && arr.length > 0) {
        return getMostFrequentRole(arr)
      }
      return null
    },
    p => {
      const arr = p.Role
      if (Array.isArray(arr) && arr.length > 0) {
        return getMostFrequentRole(arr)
      }
      return null
    },
    p => {
      const arr = p.Roles
      if (Array.isArray(arr) && arr.length > 0) {
        return getMostFrequentRole(arr)
      }
      return null
    },

    // Custom claims ending with '/role'
    p => {
      for (const key in p) {
        if (/\/role$/i.test(key)) {
          const value = p[key]
          if (typeof value === 'string') return value
          if (Array.isArray(value) && value.length > 0) {
            return getMostFrequentRole(value)
          }
        }
      }
      return null
    },
  ]

  for (const extract of roleExtractors) {
    const role = extract(payload)
    if (role) return role
  }

  return null
}

/**
 * Get the most frequent role from an array
 */
function getMostFrequentRole(roles: unknown[]): string | null {
  const roleCounts: Record<string, number> = {}

  roles.forEach(r => {
    if (typeof r === 'string') {
      roleCounts[r] = (roleCounts[r] || 0) + 1
    }
  })

  let mostFrequent = ''
  let maxCount = 0

  Object.entries(roleCounts).forEach(([role, count]) => {
    if (count > maxCount) {
      maxCount = count
      mostFrequent = role
    }
  })

  return mostFrequent || null
}

/**
 * Hook to get the current user ID from the session JWT
 */
export function useCurrentUserId() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const sessionWithToken = session as ExtendedSession
    if (sessionWithToken?.accessToken) {
      try {
        const payload = jwtDecode<JwtPayload>(sessionWithToken.accessToken)
        const potentialId = payload.sub || payload.nameid
        if (potentialId) setUserId(potentialId)
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useCurrentUserId] Failed to decode JWT', e)
        }
      }
    }
  }, [session])

  return { userId, isLoading }
}

/**
 * Hook to get the current user role from the JWT token
 * This is a fallback role - namespace-specific roles from API take precedence
 *
 * Pattern: cockpit-portal/src/features/users/hooks/use-current-user.ts
 */
export function useCurrentUserRole() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const [role, setRole] = useState<string | null>(null)
  const setCurrentNamespaceRole = usePermissionStore(
    state => state.setCurrentNamespaceRole
  )

  useEffect(() => {
    const sessionWithToken = session as ExtendedSession
    if (sessionWithToken?.accessToken) {
      try {
        const payload = jwtDecode<JwtPayload>(sessionWithToken.accessToken)
        const userRole = extractRoleFromPayload(payload)

        if (userRole) {
          setRole(userRole)

          // Update permission store with valid role
          if (VALID_ROLES.includes(userRole as Role)) {
            setCurrentNamespaceRole(userRole as Role)
          } else {
            // Default to 'user' for unknown roles
            setCurrentNamespaceRole('user')
            console.warn(
              `[useCurrentUserRole] Unknown role: ${userRole}, defaulting to 'user'`
            )
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useCurrentUserRole] Failed to decode JWT', e)
        }
      }
    }
  }, [session, setCurrentNamespaceRole])

  return { role, isLoading }
}
