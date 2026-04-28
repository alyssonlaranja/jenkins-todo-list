import { useEffect, useState } from 'react'

import { Connection } from '@/features/connections/types/connection'

import { useProxyMCP } from './use-proxy-mcp'

export interface Hypothesis {
  id: string
  description: string
  validated: boolean
  evidence?: string
  priority: 'high' | 'medium' | 'low'
}

export interface Artifact {
  id: string
  type:
    | 'blueprint'
    | 'jornada'
    | 'gap-analysis'
    | 'requisitos'
    | 'mapeamento'
    | 'matriz-csd'
    | 'qbr-memo'
  name: string
  status: 'pending' | 'in-progress' | 'completed'
  completedDate?: Date
}

export interface Stakeholder {
  name: string
  role: string
  area: string
  involvement: 'high' | 'medium' | 'low'
}

export type UpstreamStage =
  | 'ideação'
  | 'imersão'
  | 'validação'
  | 'análise'
  | 'priorização'
  | 'transição'

export interface BusinessEpic {
  id: string
  name: string
  epicName: string
  type: string
  domainType: string
  status: UpstreamStage
  currentStage: 1 | 2 | 3 | 4 | 5 | 6
  description: string
  businessValue: number
  effort: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  qbrStatus: 'pending' | 'approved' | 'rejected' | 'not-submitted'
  hypotheses: Hypothesis[]
  artifacts: Artifact[]
  stakeholders: Stakeholder[]
  linkedOKRs: string[]
  dependencies: string[]
  startDate: Date
  targetQBRDate?: Date
  createdAt: Date
  updatedAt: Date
  baseProperties: {
    performance: number
    value: number
    cost: number
    experience: number
    completedTasks: number
    totalTasks: number
    efficiency: number
    growth: number
    satisfaction: number
    retention: number
    health: number
    uptime: number
  }
  domainProperties: {
    stageProgress: number
    artifactsCompleted: number
    totalArtifacts: number
    blockers: number
    daysInCurrentStage: number
  }
}

export interface UpstreamMetrics {
  totalEpics: number
  activeEpics: number
  completedEpics: number
  avgLeadTime: number
  qbrApprovalRate: number
  hypothesesValidated: number
  reworkRate: number
  tribeSatisfaction: number
}

export function useUpstreamStore(connection: Connection) {
  const [epics, setEpics] = useState<BusinessEpic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { callTool } = useProxyMCP({
    namespace: connection.environmentRef.namespaceName,
    autoConnect: true,
    skipToolsDiscovery: true,
    connection,
  })

  useEffect(() => {
    loadEpicsFromArtifacts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection])

  const loadEpicsFromArtifacts = async () => {
    setLoading(true)
    setError(null)

    try {
      // Use get_artifact with key_pattern for server-side filtering
      // This is more efficient than loading all artifacts and filtering client-side
      const response = await callTool('get_artifact', {
        key_pattern: '^UPSTREAM_EPIC_.*',
      })

      // Parse response
      const artifactsData = response.content?.[0]?.text
        ? JSON.parse(response.content[0].text)
        : response.data || response.result || response.raw?.result

      // Server already filtered by key_pattern, no need for client-side filter
      const epicArtifacts = artifactsData.artifacts || []

      // Parse each epic artifact
      const loadedEpics: BusinessEpic[] = []

      for (const art of epicArtifacts) {
        try {
          const wizardData = JSON.parse(art.value)

          // Map wizard data to BusinessEpic structure
          const epic: BusinessEpic = {
            id: art.key,
            name: wizardData.epicName || 'Untitled Epic',
            epicName: wizardData.epicName || 'Untitled Epic',
            type: 'agent',
            domainType: 'upstream',
            status: 'ideação',
            currentStage: 1,
            description: wizardData.description || '',
            businessValue:
              wizardData.finalBusinessValue ||
              wizardData.initialBusinessValue ||
              0,
            effort: wizardData.effort || 0,
            riskLevel: wizardData.riskLevel || 'medium',
            qbrStatus: 'not-submitted',
            createdAt: new Date(art.created_at || Date.now()),
            updatedAt: new Date(art.updated_at || Date.now()),
            baseProperties: {
              performance: 0,
              value:
                wizardData.finalBusinessValue ||
                wizardData.initialBusinessValue ||
                0,
              cost: 0,
              experience: 0,
              completedTasks: 0,
              totalTasks: 24,
              efficiency: 0,
              growth: 0,
              satisfaction: 0,
              retention: 0,
              health: 50,
              uptime: 100,
            },
            domainProperties: {
              stageProgress: 10,
              artifactsCompleted: 0,
              totalArtifacts: 8,
              blockers: 0,
              daysInCurrentStage: 0,
            },
            hypotheses: (wizardData.hypotheses || []).map(
              (
                h: { description: string; status: string; evidence: string },
                idx: number
              ) => ({
                id: `hyp-${art.key}-${idx + 1}`,
                description: h.description,
                validated: h.status === 'validated',
                evidence: h.evidence || '',
                priority: 'high' as const,
              })
            ),
            artifacts: [],
            stakeholders: (wizardData.stakeholders || []).map(
              (s: {
                name: string
                role: string
                department: string
                influence: 'low' | 'medium' | 'high'
              }) => ({
                name: s.name,
                role: s.role,
                area: s.department,
                involvement: s.influence,
              })
            ),
            linkedOKRs: wizardData.linkedOKRs || [],
            dependencies: wizardData.dependencies || [],
            startDate: new Date(art.created_at || Date.now()),
            targetQBRDate: undefined,
          }

          loadedEpics.push(epic)
        } catch (parseError) {
          console.error('Failed to parse epic artifact:', art.key, parseError)
        }
      }

      setEpics(loadedEpics)
    } catch (err) {
      console.error('Failed to load epics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load epics')
    } finally {
      setLoading(false)
    }
  }

  const getAllEpics = () => {
    return epics
  }

  const getEpic = (id: string) => {
    return epics.find(e => e.id === id)
  }

  const getMetrics = (): UpstreamMetrics => {
    const activeEpics = epics.filter(
      e => e.status !== 'transição' && e.qbrStatus !== 'approved'
    )
    const completedEpics = epics.filter(
      e => e.qbrStatus === 'approved' || e.status === 'transição'
    )

    const totalHypotheses = epics.reduce(
      (sum, e) => sum + e.hypotheses.length,
      0
    )
    const validatedHypotheses = epics.reduce(
      (sum, e) => sum + e.hypotheses.filter(h => h.validated).length,
      0
    )

    const approvedEpics = epics.filter(e => e.qbrStatus === 'approved').length
    const submittedEpics = epics.filter(
      e => e.qbrStatus !== 'not-submitted'
    ).length

    return {
      totalEpics: epics.length,
      activeEpics: activeEpics.length,
      completedEpics: completedEpics.length,
      avgLeadTime: 45,
      qbrApprovalRate:
        submittedEpics > 0 ? (approvedEpics / submittedEpics) * 100 : 0,
      hypothesesValidated:
        totalHypotheses > 0 ? (validatedHypotheses / totalHypotheses) * 100 : 0,
      reworkRate: 12,
      tribeSatisfaction: 88,
    }
  }

  return {
    epics,
    loading,
    error,
    getAllEpics,
    getEpic,
    getMetrics,
    refresh: loadEpicsFromArtifacts,
  }
}
