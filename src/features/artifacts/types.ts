/**
 * Artifacts Types
 */

export interface Artifact {
  id: string
  key: string
  description: string
  value: string
  accessibility: string
  type: string | null
  artifactTypeId: string | null
  artifactTypeName: string | null
  metadata: Record<string, unknown> | null
  tags: string[]
  version: string | null
  secret: boolean
  versionCount: number
  locked: boolean
  createdAt: string
  updatedAt: string
  createdBy: string | null
  createdByName: string | null
}

export interface ArtifactVersion {
  id: string
  artifactId: string
  version: string | null
  value: string
  isProduction: boolean
  createdAt: string
  createdBy: string | null
  createdByName: string | null
}

export interface ArtifactDetail extends Artifact {
  versions: ArtifactVersion[]
  licenseId: string | null
  namespaceId: string | null
}

export interface ArtifactsPagination {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  hasMore: boolean
}

export interface ArtifactsResponse {
  success: boolean
  data: {
    artifacts: Artifact[]
    pagination: ArtifactsPagination
  }
  _meta: {
    cached: boolean
    serverProcessingMs: number
  }
  error?: string
}

export interface ArtifactDetailResponse {
  success: boolean
  data: ArtifactDetail | null
  _meta: {
    cached: boolean
    serverProcessingMs: number
  }
  error?: string
}

export type ArtifactAccessibility =
  | 'SYSTEM'
  | 'LICENSE'
  | 'LICENSE_USER'
  | 'NAMESPACE'
  | 'NAMESPACE_USER'

export interface ArtifactsFilters {
  search?: string
  accessibility?: ArtifactAccessibility
  page?: number
  pageSize?: number
}
