/**
 * BFF Artifact by ID Endpoint
 *
 * GET /api/bff/artifacts/[id]
 *
 * Fetches a single artifact by ID from REST API (cockpit-portal-api) with:
 * - Server-side normalization
 * - Version history included
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

export interface NormalizedArtifactVersion {
  id: string
  artifactId: string
  version: string | null
  value: string
  isProduction: boolean
  createdAt: string
  createdBy: string | null
  createdByName: string | null
}

export interface NormalizedArtifactDetail {
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
  versions: NormalizedArtifactVersion[]
  createdAt: string
  updatedAt: string
  createdBy: string | null
  createdByName: string | null
  licenseId: string | null
  namespaceId: string | null
}

interface BffMeta {
  cached: boolean
  serverProcessingMs: number
}

interface BffArtifactDetailResponse {
  success: boolean
  data: NormalizedArtifactDetail | null
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
 * Normalize a raw artifact version
 */
function normalizeArtifactVersion(
  version: ArtifactVersionRaw,
  isSecret: boolean
): NormalizedArtifactVersion {
  return {
    id: version.id,
    artifactId: version.artifactId,
    version: version.version || null,
    value: isSecret ? '********' : version.value || '',
    isProduction: version.isProduction,
    createdAt: version.createdAt || new Date().toISOString(),
    createdBy: version.createdBy || null,
    createdByName: version.createdByName || null,
  }
}

/**
 * Normalize a raw artifact to a detailed format
 */
function normalizeArtifactDetail(
  artifact: ArtifactRaw
): NormalizedArtifactDetail {
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

  // Normalize versions
  const normalizedVersions = (artifact.versions || []).map(v =>
    normalizeArtifactVersion(v, artifact.secret)
  )

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
    versions: normalizedVersions,
    createdAt: artifact.createdAt || new Date().toISOString(),
    updatedAt: artifact.updatedAt || new Date().toISOString(),
    createdBy: artifact.createdBy || null,
    createdByName: artifact.createdByName || null,
    licenseId: artifact.licenseId || null,
    namespaceId: artifact.namespaceId || null,
  }
}

/**
 * Call REST API to get artifact by ID
 */
async function fetchArtifactByIdFromRestApi(options: {
  apiUrl: string
  accessToken: string
  namespaceId: string
  licenseId: string
  artifactId: string
}): Promise<{
  success: boolean
  data?: ArtifactRaw
  error?: string
}> {
  const { apiUrl, accessToken, namespaceId, licenseId, artifactId } = options

  const url = `${apiUrl}/api/Artifact/GetById/${artifactId}`

  console.log(`[BFF artifacts/[id]] REST API URL: ${url}`)

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

    if (response.status === 404) {
      return {
        success: false,
        error: 'Artifact not found',
      }
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error')
      console.error(
        `[BFF artifacts/[id]] REST API error ${response.status}:`,
        errorBody.substring(0, 200)
      )
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorBody.substring(0, 100)}`,
      }
    }

    const result = await response.json()

    // Handle response - could be wrapped in { data: ... } or direct
    const artifact: ArtifactRaw = result?.data || result

    return { success: true, data: artifact }
  } catch (error) {
    console.error('[BFF artifacts/[id]] REST API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// GET HANDLER
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id: artifactId } = await params

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

  // 3. Validate artifact ID
  if (!artifactId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Artifact ID is required',
      },
      { status: 400 }
    )
  }

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
    `[BFF artifacts/[id]] Fetching artifact ${artifactId} for namespace ${namespaceId}...`
  )

  const result = await fetchArtifactByIdFromRestApi({
    apiUrl,
    accessToken,
    namespaceId,
    licenseId,
    artifactId,
  })

  if (!result.success) {
    const status = result.error === 'Artifact not found' ? 404 : 502
    console.error('[BFF artifacts/[id]] REST API call failed:', result.error)
    return NextResponse.json(
      {
        success: false,
        error: result.error || 'Failed to fetch artifact',
      },
      { status }
    )
  }

  if (!result.data) {
    return NextResponse.json(
      {
        success: false,
        error: 'Artifact not found',
      },
      { status: 404 }
    )
  }

  // 6. Normalize response
  const normalizedArtifact = normalizeArtifactDetail(result.data)

  // 7. Build response
  const processingMs = Date.now() - startTime

  const response: BffArtifactDetailResponse = {
    success: true,
    data: normalizedArtifact,
    _meta: {
      cached: false,
      serverProcessingMs: processingMs,
    },
  }

  console.log(
    `[BFF artifacts/[id]] Returned artifact "${normalizedArtifact.key}" in ${processingMs}ms`
  )

  return NextResponse.json(response)
}
