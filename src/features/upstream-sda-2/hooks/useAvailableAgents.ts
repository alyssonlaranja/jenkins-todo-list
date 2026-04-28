/**
 * Hook para carregar utility agents disponíveis do MCP
 * Utilizado no seletor de agentes do chat
 *
 * Utiliza o BFF endpoint /api/bff/utility-agents para buscar os agentes
 * com autenticação correta via accessToken da sessão OAuth
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

import { usePermissionStore } from '@/shared/stores/permission-store'

interface ExtendedSession {
  accessToken?: string
}

export interface Agent {
  id: string
  name: string
  type: string
  description?: string
  team?: Array<{ id: string; name: string; type: string }>
}

export function useAvailableAgents(
  agentType: 'supervisor' | 'standard' | 'all' = 'supervisor'
) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get auth context - use accessToken from session (OAuth token)
  const { data: session, status } = useSession()
  const { activeLicenseId, activeNamespaceId } = usePermissionStore()

  const accessToken = (session as ExtendedSession)?.accessToken

  const loadAgents = useCallback(async () => {
    if (status === 'loading') {
      console.log('[useAvailableAgents] Skip: Session loading')
      return
    }

    if (!accessToken || !activeLicenseId || !activeNamespaceId) {
      console.log('[useAvailableAgents] Skip: Missing auth context', {
        hasAccessToken: !!accessToken,
        hasLicenseId: !!activeLicenseId,
        hasNamespaceId: !!activeNamespaceId,
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[useAvailableAgents] Loading agents from BFF...')

      const params = new URLSearchParams({
        page: '1',
        pageSize: '100',
        type: agentType,
      })

      const response = await fetch(`/api/bff/utility-agents?${params}`, {
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

      console.log('[useAvailableAgents] BFF Response:', {
        success: result.success,
        supervisorsCount: result.data?.supervisors?.length,
        agentsCount: result.data?.agents?.length,
        standardsCount: result.data?.standards?.length,
        pagination: result.data?.pagination,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to load agents')
      }

      // Selecionar agentes conforme o tipo solicitado
      let allAgents: any[]
      if (agentType === 'standard') {
        allAgents = result.data?.standards || result.data?.agents || []
      } else if (agentType === 'supervisor') {
        allAgents = result.data?.supervisors || result.data?.agents || []
      } else {
        allAgents = result.data?.agents || []
      }

      // Filtrar apenas agentes habilitados (enabled: true no Cockpit)
      const enabledAgents = allAgents.filter((a: any) => a.isEnabled !== false)

      console.log(
        `[useAvailableAgents] ${agentType}: ${allAgents.length} total, ${enabledAgents.length} enabled`,
        {
          disabled: allAgents
            .filter((a: any) => a.isEnabled === false)
            .map((a: any) => a.name),
        }
      )

      const mappedAgents: Agent[] = enabledAgents.map((a: any) => ({
        id: a.id,
        name: a.name,
        type: a.typeName || 'Standard',
        description: a.description,
        team: a.team,
      }))

      console.log(
        `[useAvailableAgents] Loaded ${mappedAgents.length} enabled ${agentType} agents:`,
        mappedAgents.map((a: Agent) => a.name).join(', ')
      )

      setAgents(mappedAgents)
    } catch (err) {
      console.error('[useAvailableAgents] Failed to load agents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, activeLicenseId, activeNamespaceId, status, agentType])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  return { agents, isLoading, error, refetch: loadAgents }
}
