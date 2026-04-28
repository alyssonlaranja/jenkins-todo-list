/**
 * Hook para carregar team members do supervisor via BFF
 * Usa o endpoint /api/bff/supervisor-team que:
 * 1. Busca relações do team via GetBySupervisorUtilityAgentId
 * 2. Cruza com GetAllUtilityAgents para obter descrições completas
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

import { usePermissionStore } from '@/shared/stores/permission-store'

interface ExtendedSession {
  accessToken?: string
}

export interface SupervisorTeamMember {
  id: string
  name: string
  description: string
}

export function useSupervisorTeam(supervisorId: string | null) {
  const [teamMembers, setTeamMembers] = useState<SupervisorTeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: session, status } = useSession()
  const { activeLicenseId, activeNamespaceId } = usePermissionStore()
  const accessToken = (session as ExtendedSession)?.accessToken

  const loadTeam = useCallback(async () => {
    if (status === 'loading' || !supervisorId) return

    if (!accessToken || !activeLicenseId || !activeNamespaceId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log(
        `[useSupervisorTeam] Loading team for supervisor ${supervisorId}...`
      )

      const params = new URLSearchParams({ supervisorId })
      const response = await fetch(`/api/bff/supervisor-team?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'x-cockpit-license-id': activeLicenseId,
          'x-cockpit-namespace-id': activeNamespaceId,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load supervisor team')
      }

      const members: SupervisorTeamMember[] = result.data?.teamMembers || []

      console.log(
        `[useSupervisorTeam] Loaded ${members.length} team members:`,
        members.map(m => m.name).join(', ')
      )

      setTeamMembers(members)
    } catch (err) {
      console.error('[useSupervisorTeam] Failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load team')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, activeLicenseId, activeNamespaceId, status, supervisorId])

  useEffect(() => {
    loadTeam()
  }, [loadTeam])

  return { teamMembers, isLoading, error, refetch: loadTeam }
}
