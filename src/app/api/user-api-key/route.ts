import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { jwtDecode } from 'jwt-decode'

import { authOptions } from '@/auth'
import { cockpitApiClient } from '@/shared/lib/cockpit/api-client'

export const dynamic = 'force-dynamic'

interface JwtPayload {
  sub?: string
  nameid?: string
  [key: string]: unknown
}

/**
 * Protected API route for User Personal API Key
 * Server-side proxy to avoid CORS issues
 * Requires authentication
 * Pattern: cockpit-portal's swrFetcher with LicenseId/NamespaceId headers
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // Extract accessToken from session (contains cockpit_api_token)
  const accessToken = (session as typeof session & { accessToken?: string })
    ?.accessToken

  if (!accessToken) {
    return NextResponse.json(
      { error: 'No access token in session' },
      { status: 401 }
    )
  }

  // Extract userId from JWT (same pattern as useCurrentUserId hook)
  let userId: string | null = null
  try {
    const payload = jwtDecode<JwtPayload>(accessToken)
    userId = payload.sub || payload.nameid || null
  } catch (e) {
    console.error('[API /user-api-key] Failed to decode JWT:', e)
    return NextResponse.json({ error: 'Invalid access token' }, { status: 401 })
  }

  if (!userId) {
    return NextResponse.json(
      { error: 'No userId in access token' },
      { status: 401 }
    )
  }

  // Extract LicenseId and NamespaceId from request headers
  // These are injected by the client from permission-store
  const url = new URL(request.url)
  const licenseId = url.searchParams.get('licenseId')
  const namespaceId = url.searchParams.get('namespaceId')

  try {
    // Use server-side method with explicit token and headers
    const apiKey = await cockpitApiClient.getUserApiKeyServer(
      userId,
      accessToken,
      licenseId,
      namespaceId
    )

    if (!apiKey) {
      return NextResponse.json({ apiKey: null }, { status: 200 })
    }

    return NextResponse.json(
      { apiKey },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('[API /user-api-key] Error fetching user API key:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user API key' },
      { status: 500 }
    )
  }
}
