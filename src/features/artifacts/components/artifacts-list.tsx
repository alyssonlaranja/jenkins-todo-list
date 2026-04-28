/**
 * Artifacts List Component
 *
 * Displays a grid of artifact cards with loading and empty states
 */
'use client'

import { Database, Loader2, RefreshCw, Search } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'

import type {
  Artifact,
  ArtifactAccessibility,
  ArtifactsPagination,
} from '../types'
import { ArtifactCard } from './artifact-card'

interface ArtifactsListProps {
  artifacts: Artifact[]
  pagination: ArtifactsPagination | null
  isLoading: boolean
  error: string | null
  onViewDetails: (artifact: Artifact) => void
  onRefresh: () => void
  onSearch: (search: string) => void
  onAccessibilityFilter: (
    accessibility: ArtifactAccessibility | undefined
  ) => void
  onPageChange: (page: number) => void
  searchValue: string
  accessibilityFilter?: ArtifactAccessibility
}

const accessibilityOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All Accessibilities' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'LICENSE', label: 'License' },
  { value: 'LICENSE_USER', label: 'License User' },
  { value: 'NAMESPACE', label: 'Namespace' },
  { value: 'NAMESPACE_USER', label: 'Namespace User' },
]

export function ArtifactsList({
  artifacts,
  pagination,
  isLoading,
  error,
  onViewDetails,
  onRefresh,
  onSearch,
  onAccessibilityFilter,
  onPageChange,
  searchValue,
  accessibilityFilter,
}: ArtifactsListProps) {
  // Loading skeleton
  if (isLoading && artifacts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="size-10" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-[200px]" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-3">
          <Database className="size-6 text-destructive" />
        </div>
        <h3 className="text-lg font-medium">Failed to load artifacts</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">{error}</p>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="mr-2 size-4" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by key or description..."
            value={searchValue}
            onChange={e => onSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={accessibilityFilter || 'all'}
          onValueChange={value =>
            onAccessibilityFilter(
              value === 'all' ? undefined : (value as ArtifactAccessibility)
            )
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Accessibility" />
          </SelectTrigger>
          <SelectContent>
            {accessibilityOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={onRefresh}
          variant="outline"
          size="icon"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </Button>
      </div>

      {/* Empty state */}
      {artifacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-3">
            <Database className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No artifacts found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchValue || accessibilityFilter
              ? 'Try adjusting your filters'
              : 'Create your first artifact to get started'}
          </p>
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {artifacts.map(artifact => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1}-
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.totalItems
                )}{' '}
                of {pagination.totalItems} artifacts
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || isLoading}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={!pagination.hasMore || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
