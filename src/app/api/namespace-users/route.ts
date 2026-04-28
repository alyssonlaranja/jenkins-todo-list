import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

import { authOptions } from '@/auth'
import { getApiBaseUrl } from '@/shared/lib/api-helpers'

export const dynamic = 'force-dynamic'

/**
 * User namespace role DTO from Cockpit API
 * Based on GetAllUsers response structure
 */
interface UserNamespaceRoleDto {
  namespaceId: string
  namespaceName: string | null
  roleId: string | null
  roleName: string | null
  licenseId: string | null
  licenseName: string | null
}

/**
 * User DTO from Cockpit API (from GetAllUsers)
 * Pattern: cockpit-shared-entities/models/user.py
 */
interface CockpitUser {
  id: string
  userName: string | null
  name: string | null
  email: string | null
  userDisabled: boolean
  namespaceUserRoles?: UserNamespaceRoleDto[] | null
}

interface CockpitPagedResponse {
  items: CockpitUser[]
  totalCount: number
  page: number
  pageSize: number
}

/**
 * Mapped user for frontend consumption
 */
export interface NamespaceUser {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Owner' | 'Curador' | 'User'
}

/**
 * Map Cockpit role name to our simplified role type
 */
function mapRoleName(
  roleName: string | null | undefined
): NamespaceUser['role'] {
  if (!roleName) return 'User'

  const lowerRole = roleName.toLowerCase()
  if (lowerRole.includes('admin') || lowerRole.includes('globaladmin')) {
    return 'Admin'
  }
  if (lowerRole.includes('curator') || lowerRole.includes('curador')) {
    return 'Curador'
  }
  if (lowerRole.includes('owner')) {
    return 'Owner'
  }
  return 'User'
}

/**
 * GET /api/namespace-users
 *
 * Fetches users that belong to the current namespace.
 * Uses GetAllUsers and filters by namespaceUserRoles.
 *
 * Query params:
 * - licenseId: UUID of the active license
 * - namespaceId: UUID of the active namespace
 * - search: Optional search term for filtering
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 50)
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const accessToken = (session as typeof session & { accessToken?: string })
    ?.accessToken

  if (!accessToken) {
    return NextResponse.json(
      { error: 'No access token in session' },
      { status: 401 }
    )
  }

  const url = new URL(request.url)
  const licenseId = url.searchParams.get('licenseId')
  const namespaceId = url.searchParams.get('namespaceId')
  const search = url.searchParams.get('search') || ''
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10)

  if (!licenseId || !namespaceId) {
    return NextResponse.json(
      { error: 'licenseId and namespaceId are required' },
      { status: 400 }
    )
  }

  try {
    const baseUrl = getApiBaseUrl()
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      LicenseId: licenseId,
      NamespaceId: namespaceId,
    }

    console.log(
      '[API /namespace-users] Step 1: Fetching all users from license...',
      {
        licenseId,
        namespaceId,
        baseUrl,
      }
    )

    // Step 1: Fetch all users from the license
    const allUsersUrl = `${baseUrl}/api/ActiveDirectoryUser/GetAllUsers?pageSize=1000`
    const allUsersResponse = await fetch(allUsersUrl, {
      method: 'GET',
      headers,
    })

    if (!allUsersResponse.ok) {
      // Try to get more details from response body
      let errorBody = ''
      try {
        const errData = await allUsersResponse.json()
        errorBody = JSON.stringify(errData)
      } catch {
        errorBody = await allUsersResponse.text().catch(() => '')
      }

      console.error('[API /namespace-users] Error fetching all users:', {
        status: allUsersResponse.status,
        statusText: allUsersResponse.statusText,
        errorBody,
        licenseId,
        namespaceId,
      })

      // If Forbidden, user might not have permission to list all users
      // Return empty list gracefully instead of error
      if (allUsersResponse.status === 403) {
        console.warn(
          '[API /namespace-users] User does not have permission to list users in this namespace'
        )
        return NextResponse.json({
          users: [],
          totalCount: 0,
          page,
          pageSize,
          warning: 'No permission to list users in this namespace',
        })
      }

      return NextResponse.json(
        { error: `Failed to fetch users: ${allUsersResponse.statusText}` },
        { status: allUsersResponse.status }
      )
    }

    const allUsersData = await allUsersResponse.json()
    const pagedData: CockpitPagedResponse = allUsersData.data || allUsersData

    console.log('[API /namespace-users] All users fetched:', {
      totalCount: pagedData.totalCount,
      itemsCount: pagedData.items?.length,
    })

    if (!pagedData.items?.length) {
      return NextResponse.json({
        users: [],
        totalCount: 0,
        page,
        pageSize,
      })
    }

    // Filter users that belong to the current namespace
    const namespaceUsers: NamespaceUser[] = []
    const searchLower = search.toLowerCase()

    for (const user of pagedData.items) {
      // Skip disabled users
      if (user.userDisabled) continue

      // Check if user belongs to this namespace via namespaceUserRoles
      const namespaceRole = user.namespaceUserRoles?.find(
        role => role.namespaceId?.toLowerCase() === namespaceId?.toLowerCase()
      )

      if (!namespaceRole) continue

      // Apply search filter if provided
      if (search) {
        const matchesSearch =
          user.name?.toLowerCase().includes(searchLower) ||
          user.userName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)

        if (!matchesSearch) continue
      }

      namespaceUsers.push({
        id: user.id,
        name: user.name || user.userName || 'Unknown',
        email: user.email || '',
        role: mapRoleName(namespaceRole.roleName),
      })
    }

    console.log('[API /namespace-users] Final filtered users:', {
      count: namespaceUsers.length,
      targetNamespaceId: namespaceId,
      users: namespaceUsers.map(u => ({ id: u.id, name: u.name })),
    })

    // Apply pagination
    const startIndex = (page - 1) * pageSize
    const paginatedUsers = namespaceUsers.slice(
      startIndex,
      startIndex + pageSize
    )

    return NextResponse.json({
      users: paginatedUsers,
      totalCount: namespaceUsers.length,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('[API /namespace-users] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch namespace users' },
      { status: 500 }
    )
  }
}
