/**
 * Artifacts Hook
 *
 * Hook for fetching and managing artifacts using the BFF API
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

import type {
  Artifact,
  ArtifactDetail,
  ArtifactDetailResponse,
  ArtifactsFilters,
  ArtifactsPagination,
  ArtifactsResponse,
} from '../types'

interface UseArtifactsReturn {
  artifacts: Artifact[]
  pagination: ArtifactsPagination | null
  isLoading: boolean
  error: string | null
  fetchArtifacts: (filters?: ArtifactsFilters) => Promise<void>
  fetchArtifactById: (id: string) => Promise<ArtifactDetail | null>
  selectedArtifact: ArtifactDetail | null
  selectArtifact: (id: string | null) => Promise<void>
  isLoadingDetail: boolean
  refetch: () => Promise<void>
}

export function useArtifacts(): UseArtifactsReturn {
  const { data: session } = useSession()

  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [pagination, setPagination] = useState<ArtifactsPagination | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedArtifact, setSelectedArtifact] =
    useState<ArtifactDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<ArtifactsFilters>({})

  // Get credentials from localStorage (same pattern as other features)
  const getCredentials = useCallback(() => {
    if (typeof window === 'undefined') return null

    try {
      const permissionStoreRaw = localStorage.getItem('permission-store')
      if (!permissionStoreRaw) return null

      const permissionStore = JSON.parse(permissionStoreRaw)
      const licenseId = permissionStore?.state?.activeLicenseId
      const namespaceId = permissionStore?.state?.activeNamespaceId

      // Get access token from session
      const accessToken = (session as { accessToken?: string })?.accessToken

      if (!licenseId || !namespaceId || !accessToken) {
        console.warn('[useArtifacts] Missing credentials:', {
          hasLicenseId: !!licenseId,
          hasNamespaceId: !!namespaceId,
          hasAccessToken: !!accessToken,
        })
        return null
      }

      return { licenseId, namespaceId, accessToken }
    } catch (e) {
      console.error('[useArtifacts] Error getting credentials:', e)
      return null
    }
  }, [session])

  // Fetch artifacts from BFF API
  const fetchArtifacts = useCallback(
    async (filters?: ArtifactsFilters) => {
      const credentials = getCredentials()
      if (!credentials) {
        setError('Missing credentials. Please ensure you are logged in.')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Build query params
        const params = new URLSearchParams()
        if (filters?.page) params.append('page', filters.page.toString())
        if (filters?.pageSize)
          params.append('pageSize', filters.pageSize.toString())
        if (filters?.accessibility)
          params.append('accessibility', filters.accessibility)
        if (filters?.search) params.append('search', filters.search)

        const url = `/api/bff/artifacts${params.toString() ? `?${params.toString()}` : ''}`

        console.log('[useArtifacts] Fetching artifacts:', url)

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${credentials.accessToken}`,
            'x-cockpit-license-id': credentials.licenseId,
            'x-cockpit-namespace-id': credentials.namespaceId,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const data: ArtifactsResponse = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch artifacts')
        }

        setArtifacts(data.data.artifacts)
        setPagination(data.data.pagination)
        setCurrentFilters(filters || {})

        console.log('[useArtifacts] Fetched artifacts:', {
          count: data.data.artifacts.length,
          pagination: data.data.pagination,
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error('[useArtifacts] Error fetching artifacts:', message)
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [getCredentials]
  )

  // Fetch single artifact by ID
  const fetchArtifactById = useCallback(
    async (id: string): Promise<ArtifactDetail | null> => {
      const credentials = getCredentials()
      if (!credentials) {
        setError('Missing credentials. Please ensure you are logged in.')
        return null
      }

      try {
        const response = await fetch(`/api/bff/artifacts/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${credentials.accessToken}`,
            'x-cockpit-license-id': credentials.licenseId,
            'x-cockpit-namespace-id': credentials.namespaceId,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const data: ArtifactDetailResponse = await response.json()

        if (!data.success || !data.data) {
          throw new Error(data.error || 'Artifact not found')
        }

        return data.data
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error('[useArtifacts] Error fetching artifact by ID:', message)
        throw e
      }
    },
    [getCredentials]
  )

  // Select an artifact (fetch details)
  const selectArtifact = useCallback(
    async (id: string | null) => {
      if (!id) {
        setSelectedArtifact(null)
        return
      }

      setIsLoadingDetail(true)
      try {
        const artifact = await fetchArtifactById(id)
        setSelectedArtifact(artifact)
      } catch {
        setSelectedArtifact(null)
      } finally {
        setIsLoadingDetail(false)
      }
    },
    [fetchArtifactById]
  )

  // Refetch with current filters
  const refetch = useCallback(async () => {
    await fetchArtifacts(currentFilters)
  }, [fetchArtifacts, currentFilters])

  // Initial fetch when session is ready
  useEffect(() => {
    if (session && !isLoading && artifacts.length === 0) {
      fetchArtifacts()
    }
  }, [session, isLoading, artifacts.length, fetchArtifacts])

  return {
    artifacts,
    pagination,
    isLoading,
    error,
    fetchArtifacts,
    fetchArtifactById,
    selectedArtifact,
    selectArtifact,
    isLoadingDetail,
    refetch,
  }
}
