/**
 * BFF Endpoint for User Namespace Roles
 *
 * GET /api/bff/user-namespace-roles
 *
 * Fetches the current user's roles per namespace from cockpit-portal-api.
 *
 * Headers required:
 * - Authorization: Bearer <JWT> (Azure AD token)
 *
 * Pattern: cockpit-portal/src/features/users/hooks/use-current-user.ts
 */
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { jwtDecode } from 'jwt-decode'

import { authOptions } from '@/auth'

// JWT payload structure
interface JwtPayload {
  sub?: string
  nameid?: string
  oid?: string
  [key: string]: unknown
}

// Response type from cockpit-portal-api
interface UserProfileResponse {
  id: string
  userName?: string
  email: string
  userDisabled?: boolean
  namespaceUserRoles?: Array<{
    namespaceId: string
    userId: string
    roleId: string
    roleName?: string
    namespaceName?: string
  }>
}

// Our normalized response
interface BffNamespaceRolesResponse {
  success: boolean
  data: {
    namespaceRoles: Array<{
      namespaceId: string
      userId: string
      roleId: string
      roleName?: string
      namespaceName?: string
    }>
  }
  error?: string
}

function getPortalApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL not configured')
  }
  return url
}

/**
 * Extract user ID from JWT token
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    const payload = jwtDecode<JwtPayload>(token)
    // Try different claim names for user ID
    return payload.sub || payload.nameid || payload.oid || null
  } catch {
    return null
  }
}

export async function GET() {
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

  // 2. Get access token from session
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionWithToken = session as any
  const accessToken = sessionWithToken?.accessToken

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: 'No access token in session' },
      { status: 401 }
    )
  }

  // 3. Extract userId from JWT
  const userId = extractUserIdFromToken(accessToken)
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Could not extract user ID from token' },
      { status: 400 }
    )
  }

  // 4. Get API URL
  let apiUrl: string
  try {
    apiUrl = getPortalApiUrl()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Portal API URL not configured' },
      { status: 500 }
    )
  }

  // 5. Call cockpit-portal-api to get user profile with namespace roles
  try {
    const url = `${apiUrl}/api/ActiveDirectoryUser/GetUserById/${userId}`

    console.log(`[BFF user-namespace-roles] Fetching from: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error')
      console.error(
        `[BFF user-namespace-roles] API error ${response.status}:`,
        errorBody.substring(0, 200)
      )
      return NextResponse.json(
        {
          success: false,
          error: `HTTP ${response.status}: ${errorBody.substring(0, 100)}`,
        },
        { status: 502 }
      )
    }

    const userProfile: UserProfileResponse = await response.json()

    // 6. Extract namespace roles
    const namespaceRoles = userProfile.namespaceUserRoles || []

    const processingMs = Date.now() - startTime

    console.log(
      `[BFF user-namespace-roles] Returned ${namespaceRoles.length} roles in ${processingMs}ms`
    )

    const result: BffNamespaceRolesResponse = {
      success: true,
      data: {
        namespaceRoles,
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[BFF user-namespace-roles] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
