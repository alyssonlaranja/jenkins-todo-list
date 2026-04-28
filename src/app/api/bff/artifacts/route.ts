/**
 * BFF Artifacts Endpoint
 *
 * GET /api/bff/artifacts
 *
 * Fetches artifacts from REST API (cockpit-portal-api) with:
 * - Server-side normalization
 * - Pagination support
 * - Unified response format
 *
 * Headers required:
 * - Authorization: Bearer token (JWT from session)
 * - x-cockpit-license-id: License UUID
 * - x-cockpit-namespace-id: Namespace UUID
 */
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

import { authOptions } from '@/auth'

// ============================================================================
// TYPES
// ============================================================================

interface ArtifactTypeRaw {
  id: string
  name: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

interface ArtifactVersionRaw {
  id: string
  artifactId: string
  version?: string
  value?: string
  isProduction: boolean
  createdAt?: string
  createdBy?: string
  createdByName?: string
}

interface ArtifactRaw {
  id: string
  key: string
  description?: string
  value?: string
  accessibility?: string
  type?: string
  artifactTypeId?: string
  metadata?: string
  tags?: string
  version?: string
  secret: boolean
  versionCount: number
  locked: boolean
  artifactType?: ArtifactTypeRaw
  versions?: ArtifactVersionRaw[]
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  createdByName?: string
  licenseId?: string
  namespaceId?: string
  userId?: string
}

interface RestApiResponse {
  data?: {
    items: ArtifactRaw[]
    totalCount?: number
    page?: number
    pageSize?: number
  }
  items?: ArtifactRaw[]
  totalCount?: number
}

export interface NormalizedArtifact {
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

interface BffPagination {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  hasMore: boolean
}

interface BffMeta {
  cached: boolean
  serverProcessingMs: number
}

interface BffArtifactsResponse {
  success: boolean
  data: {
    artifacts: NormalizedArtifact[]
    pagination: BffPagination
  }
  _meta: BffMeta
  error?: string
}

// ============================================================================
// REST API HELPERS
// ============================================================================

function getPortalApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL not configured')
  }
  return url
}

/**
 * Normalize a raw artifact to a clean format
 */
function normalizeArtifact(artifact: ArtifactRaw): NormalizedArtifact {
  // Parse metadata if it's a JSON string
  let parsedMetadata: Record<string, unknown> | null = null
  if (artifact.metadata) {
    try {
      parsedMetadata = JSON.parse(artifact.metadata)
    } catch {
      // Keep as null if parsing fails
    }
  }

  // Parse tags (can be comma-separated or JSON array)
  let parsedTags: string[] = []
  if (artifact.tags) {
    try {
      const parsed = JSON.parse(artifact.tags)
      if (Array.isArray(parsed)) {
        parsedTags = parsed
      }
    } catch {
      // Try comma-separated
      parsedTags = artifact.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    }
  }

  return {
    id: artifact.id,
    key: artifact.key,
    description: artifact.description || '',
    value: artifact.secret ? '********' : artifact.value || '',
    accessibility: artifact.accessibility || 'NAMESPACE',
    type: artifact.type || null,
    artifactTypeId: artifact.artifactTypeId || null,
    artifactTypeName: artifact.artifactType?.name || null,
    metadata: parsedMetadata,
    tags: parsedTags,
    version: artifact.version || null,
    secret: artifact.secret,
    versionCount: artifact.versionCount || 0,
    locked: artifact.locked,
    createdAt: artifact.createdAt || new Date().toISOString(),
    updatedAt: artifact.updatedAt || new Date().toISOString(),
    createdBy: artifact.createdBy || null,
    createdByName: artifact.createdByName || null,
  }
}

/**
 * Call REST API to get artifacts
 */
async function fetchArtifactsFromRestApi(options: {
  apiUrl: string
  accessToken: string
  namespaceId: string
  licenseId: string
  page: number
  pageSize: number
  accessibility?: string
  search?: string
}): Promise<{
  success: boolean
  data?: ArtifactRaw[]
  totalCount?: number
  error?: string
}> {
  const {
    apiUrl,
    accessToken,
    namespaceId,
    licenseId,
    page,
    pageSize,
    accessibility,
    search,
  } = options

  // Build URL with query params
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  })

  if (accessibility) {
    params.append('accessibility', accessibility)
  }

  if (search) {
    params.append('search', search)
  }

  const url = `${apiUrl}/api/Artifact/GetAll?${params.toString()}`

  console.log(`[BFF artifacts] REST API URL: ${url}`)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        LicenseId: licenseId,
        NamespaceId: namespaceId,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error')
      console.error(
        `[BFF artifacts] REST API error ${response.status}:`,
        errorBody.substring(0, 200)
      )
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorBody.substring(0, 100)}`,
      }
    }

    const result: RestApiResponse = await response.json()

    // Handle different response formats
    let artifacts: ArtifactRaw[] = []
    let totalCount = 0

    if (result?.data?.items) {
      artifacts = result.data.items
      totalCount = result.data.totalCount || artifacts.length
    } else if (result?.items) {
      artifacts = result.items
      totalCount = result.totalCount || artifacts.length
    } else if (Array.isArray(result)) {
      artifacts = result
      totalCount = artifacts.length
    }

    return { success: true, data: artifacts, totalCount }
  } catch (error) {
    console.error('[BFF artifacts] REST API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// GET HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // 1. Validate session
  const session = await getServerSession(authOptions)

  // Allow bypass in development
  const disableAuth = process.env.DISABLE_AUTH === 'true'
  if (!session && !disableAuth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // 2. Extract headers
  const authHeader = request.headers.get('authorization')
  const licenseId = request.headers.get('x-cockpit-license-id')
  const namespaceId = request.headers.get('x-cockpit-namespace-id')

  // Extract Bearer token
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!accessToken || !licenseId || !namespaceId) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Missing required headers: Authorization (Bearer token), x-cockpit-license-id, x-cockpit-namespace-id',
      },
      { status: 400 }
    )
  }

  // 3. Extract query params
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = Math.min(
    parseInt(searchParams.get('pageSize') || '50', 10),
    100
  )
  const accessibility = searchParams.get('accessibility') || undefined
  const search = searchParams.get('search') || undefined

  // 4. Get REST API URL
  let apiUrl: string

  try {
    apiUrl = getPortalApiUrl()
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Portal API URL not configured',
      },
      { status: 500 }
    )
  }

  // 5. Call REST API
  console.log(
    `[BFF artifacts] Fetching artifacts for namespace ${namespaceId}...`
  )

  const result = await fetchArtifactsFromRestApi({
    apiUrl,
    accessToken,
    namespaceId,
    licenseId,
    page,
    pageSize,
    accessibility,
    search,
  })

  if (!result.success || !result.data) {
    console.error('[BFF artifacts] REST API call failed:', result.error)
    return NextResponse.json(
      {
        success: false,
        error: result.error || 'Failed to fetch artifacts',
      },
      { status: 502 }
    )
  }

  // 6. Normalize response
  const normalizedArtifacts = result.data.map(normalizeArtifact)
  const totalCount = result.totalCount || normalizedArtifacts.length

  // 7. Build response
  const processingMs = Date.now() - startTime

  const response: BffArtifactsResponse = {
    success: true,
    data: {
      artifacts: normalizedArtifacts,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        totalItems: totalCount,
        hasMore: page * pageSize < totalCount,
      },
    },
    _meta: {
      cached: false,
      serverProcessingMs: processingMs,
    },
  }

  console.log(
    `[BFF artifacts] Returned ${normalizedArtifacts.length} artifacts in ${processingMs}ms`
  )

  return NextResponse.json(response)
}
