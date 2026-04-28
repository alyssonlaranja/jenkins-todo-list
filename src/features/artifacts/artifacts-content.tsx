/**
 * Artifacts Content Component
 *
 * Main content component for the Artifacts page that ties together
 * the list, filters, and detail sheet.
 */
'use client'

import { useCallback, useState } from 'react'
import { Database } from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'

import { ArtifactDetailSheet } from './components/artifact-detail-sheet'
import { ArtifactsList } from './components/artifacts-list'
import { useArtifacts } from './hooks/use-artifacts'
import type { Artifact, ArtifactAccessibility } from './types'

export function ArtifactsContent() {
  const {
    artifacts,
    pagination,
    isLoading,
    error,
    fetchArtifacts,
    selectedArtifact,
    selectArtifact,
    isLoadingDetail,
    refetch,
  } = useArtifacts()

  const [searchValue, setSearchValue] = useState('')
  const [accessibilityFilter, setAccessibilityFilter] = useState<
    ArtifactAccessibility | undefined
  >()
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Handle search with debounce
  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value)
      // Debounced search
      const timeoutId = setTimeout(() => {
        fetchArtifacts({
          search: value || undefined,
          accessibility: accessibilityFilter,
          page: 1,
        })
      }, 300)
      return () => clearTimeout(timeoutId)
    },
    [accessibilityFilter, fetchArtifacts]
  )

  // Handle accessibility filter
  const handleAccessibilityFilter = useCallback(
    (accessibility: ArtifactAccessibility | undefined) => {
      setAccessibilityFilter(accessibility)
      fetchArtifacts({
        search: searchValue || undefined,
        accessibility,
        page: 1,
      })
    },
    [searchValue, fetchArtifacts]
  )

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      fetchArtifacts({
        search: searchValue || undefined,
        accessibility: accessibilityFilter,
        page,
      })
    },
    [searchValue, accessibilityFilter, fetchArtifacts]
  )

  // Handle view details
  const handleViewDetails = useCallback(
    async (artifact: Artifact) => {
      await selectArtifact(artifact.id)
      setIsDetailOpen(true)
    },
    [selectArtifact]
  )

  // Handle close detail sheet
  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false)
    selectArtifact(null)
  }, [selectArtifact])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Database className="size-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Artifacts</h1>
                <p className="text-sm text-muted-foreground">
                  Manage configurations, templates, and agent artifacts
                </p>
              </div>
            </div>
            {pagination && (
              <Badge variant="secondary" className="text-sm">
                {pagination.totalItems} artifact
                {pagination.totalItems !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="container py-6">
          <ArtifactsList
            artifacts={artifacts}
            pagination={pagination}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onRefresh={refetch}
            onSearch={handleSearch}
            onAccessibilityFilter={handleAccessibilityFilter}
            onPageChange={handlePageChange}
            searchValue={searchValue}
            accessibilityFilter={accessibilityFilter}
          />
        </div>
      </div>

      {/* Detail Sheet */}
      <ArtifactDetailSheet
        artifact={selectedArtifact}
        isLoading={isLoadingDetail}
        open={isDetailOpen}
        onClose={handleCloseDetail}
      />
    </div>
  )
}
