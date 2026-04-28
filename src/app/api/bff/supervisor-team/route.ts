/**
 * BFF Supervisor Team Endpoint
 *
 * GET /api/bff/supervisor-team?supervisorId={id}
 *
 * Fetches team members for a given supervisor agent by:
 * 1. Calling GET /api/AgentTeam/GetBySupervisorUtilityAgentId/{supervisorId} to get team relationships
 * 2. Calling GET /api/ArtifactUtilityAgent/GetAllUtilityAgents to get full agent details
 * 3. Cross-referencing to return enriched team member data with descriptions
 *
 * Headers required:
 * - Authorization: Bearer {token}
 * - x-cockpit-license-id: License UUID
 * - x-cockpit-namespace-id: Namespace UUID
 */
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

import { authOptions } from '@/auth'

// ============================================================================
// Types
// ============================================================================

interface AgentTeamRelation {
  id: string
  utilityAgentId: string
  teamMemberId: string
  name?: string
  description?: string
  artifactId?: string
  createdAt?: string
  updatedAt?: string
}

interface UtilityAgentRaw {
  id: string
  name: string
  description?: string
  objective?: string
  type_name?: string
  type_id?: string
  enabled?: boolean
}

interface TeamMemberCard {
  id: string
  name: string
  description: string
}

// ============================================================================
// Helpers
// ============================================================================

function getPortalApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) throw new Error('NEXT_PUBLIC_API_URL not configured')
  return url
}

async function fetchTeamRelations(options: {
  apiUrl: string
  accessToken: string
  licenseId: string
  namespaceId: string
  supervisorId: string
}): Promise<AgentTeamRelation[]> {
  const { apiUrl, accessToken, licenseId, namespaceId, supervisorId } = options

  const url = `${apiUrl}/api/AgentTeam/GetBySupervisorUtilityAgentId/${supervisorId}`
  console.log(`[BFF supervisor-team] Fetching team relations: ${url}`)

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
      `[BFF supervisor-team] Team relations error ${response.status}:`,
      errorBody.substring(0, 300)
    )
    return []
  }

  const result = await response.json()
  console.log(
    '[BFF supervisor-team] Raw team relations response:',
    JSON.stringify(result).substring(0, 2000)
  )
  console.log(
    '[BFF supervisor-team] Data keys:',
    result?.data ? Object.keys(result.data) : 'no data'
  )
  console.log(
    '[BFF supervisor-team] Data type:',
    typeof result?.data,
    Array.isArray(result?.data) ? 'IS_ARRAY' : 'NOT_ARRAY'
  )

  // Cockpit REST API wraps in { succeeded, message, data } envelope
  // The response can have different structures:
  // 1. Array directly: [...]
  // 2. Envelope with array: { succeeded, data: [...] }
  // 3. Envelope with paginated: { succeeded, data: { items: [...] } }
  // 4. Envelope with object: { succeeded, data: { utility_agent: {...}, team_members: [...] } }
  let items: any[] = []
  if (Array.isArray(result)) {
    items = result
  } else if (result?.data && Array.isArray(result.data)) {
    items = result.data
  } else if (result?.data?.items && Array.isArray(result.data.items)) {
    items = result.data.items
  } else if (
    result?.data?.team_members &&
    Array.isArray(result.data.team_members)
  ) {
    // Format 4: { data: { utility_agent: {...}, team_members: [...] } }
    console.log(
      '[BFF supervisor-team] Found team_members in data object:',
      result.data.team_members.length
    )
    items = result.data.team_members
  } else if (
    result?.data &&
    typeof result.data === 'object' &&
    !Array.isArray(result.data)
  ) {
    // data is an object — check all keys for arrays that could be team members
    const dataKeys = Object.keys(result.data)
    console.log('[BFF supervisor-team] Data is object with keys:', dataKeys)
    for (const key of dataKeys) {
      if (Array.isArray(result.data[key]) && key !== 'utility_agent') {
        console.log(
          `[BFF supervisor-team] Found array in data.${key}:`,
          result.data[key].length
        )
        items = result.data[key]
        break
      }
    }
  }

  // Normalize field names (API may return camelCase, snake_case, or TeamMember format)
  return items.map((item: any) => ({
    id: item.id || item.team_member_id || '',
    utilityAgentId: item.utilityAgentId || item.utility_agent_id || '',
    teamMemberId: item.teamMemberId || item.team_member_id || item.id || '',
    name: item.name || item.team_member_name || '',
    description: item.description || '',
    artifactId: item.artifactId || item.artifact_id || '',
    createdAt: item.createdAt || item.created_at,
    updatedAt: item.updatedAt || item.updated_at,
  }))
}

async function fetchAllAgents(options: {
  apiUrl: string
  accessToken: string
  licenseId: string
  namespaceId: string
}): Promise<UtilityAgentRaw[]> {
  const { apiUrl, accessToken, licenseId, namespaceId } = options

  const url = `${apiUrl}/api/ArtifactUtilityAgent/GetAllUtilityAgents?namespaceId=${namespaceId}&page=1&pageSize=1000`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      LicenseId: licenseId,
      NamespaceId: namespaceId,
    },
  })

  if (!response.ok) return []

  const result = await response.json()

  if (result?.data?.items && Array.isArray(result.data.items))
    return result.data.items
  if (result?.items && Array.isArray(result.items)) return result.items
  return []
}

// ============================================================================
// GET HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // 1. Validate session
  const session = await getServerSession(authOptions)
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
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!accessToken || !licenseId || !namespaceId) {
    return NextResponse.json(
      { success: false, error: 'Missing required headers' },
      { status: 400 }
    )
  }

  // 3. Get supervisorId from query
  const supervisorId = request.nextUrl.searchParams.get('supervisorId')
  if (!supervisorId) {
    return NextResponse.json(
      { success: false, error: 'Missing supervisorId query parameter' },
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

  // 5. Fetch team relations + all agents in parallel
  const [teamRelations, allAgents] = await Promise.all([
    fetchTeamRelations({
      apiUrl,
      accessToken,
      licenseId,
      namespaceId,
      supervisorId,
    }),
    fetchAllAgents({ apiUrl, accessToken, licenseId, namespaceId }),
  ])

  console.log(
    `[BFF supervisor-team] Team relations: ${teamRelations.length}, All agents: ${allAgents.length}`
  )
  if (teamRelations.length > 0) {
    console.log(
      '[BFF supervisor-team] First relation sample:',
      JSON.stringify(teamRelations[0])
    )
  }
  if (allAgents.length > 0 && allAgents[0]) {
    console.log(
      '[BFF supervisor-team] First agent sample:',
      JSON.stringify({ id: allAgents[0].id, name: allAgents[0].name })
    )
  }

  // 6. Build agent lookup by ID
  const agentMap = new Map<string, UtilityAgentRaw>()
  for (const agent of allAgents) {
    agentMap.set(agent.id, agent)
  }

  // 7. Cross-reference: for each team relation, find the full agent details
  const teamMembers: TeamMemberCard[] = teamRelations.map(relation => {
    const agent = agentMap.get(relation.teamMemberId)
    return {
      id: relation.teamMemberId,
      name: agent?.name || relation.name || 'Agent',
      description:
        agent?.description || agent?.objective || relation.description || '',
    }
  })

  const processingMs = Date.now() - startTime

  console.log(
    `[BFF supervisor-team] Returning ${teamMembers.length} team members for supervisor ${supervisorId} in ${processingMs}ms`
  )

  return NextResponse.json({
    success: true,
    data: {
      supervisorId,
      teamMembers,
    },
    _meta: {
      serverProcessingMs: processingMs,
    },
  })
}
