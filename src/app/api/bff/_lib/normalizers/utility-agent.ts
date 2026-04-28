/**
 * Utility Agent Normalizer
 *
 * Transforms raw MCP utility agent responses into normalized format.
 * Handles all the different response formats from MCP v1.0 and v2.0.
 */
import type {
  McpListUtilityAgentsResponse,
  McpUtilityAgentRaw,
  NormalizedTeamMember,
  NormalizedUtilityAgent,
} from '../types'

// Known type IDs for utility agents
const SUPERVISOR_TYPE_ID = 'a7c9d077-e2f9-5f4f-bf1e-1c7d9f8a0a5c'

/**
 * Normalize a single utility agent from MCP response
 */
export function normalizeUtilityAgent(
  raw: McpUtilityAgentRaw
): NormalizedUtilityAgent {
  // Determine type name - handle various formats
  // Priority: 1) type_id match, 2) type_name match
  let typeName: 'Supervisor' | 'Standard' = 'Standard'
  if (raw.type_id === SUPERVISOR_TYPE_ID) {
    typeName = 'Supervisor'
  } else if (raw.type_name === 'Supervisor') {
    typeName = 'Supervisor'
  }

  // Extract team from versions if present (MCP v1.0 format)
  let team: NormalizedTeamMember[] = []
  if (raw.team && Array.isArray(raw.team)) {
    team = raw.team.map(member => ({
      id: member.team_member_id,
      name: member.team_member_name,
      type: (member.team_member_type === 'Supervisor'
        ? 'Supervisor'
        : 'Standard') as 'Supervisor' | 'Standard',
    }))
  } else if (raw.versions?.[0]?.value) {
    // Try to extract team from production version value (older format)
    try {
      const versionData = JSON.parse(raw.versions[0].value)
      if (versionData.team && Array.isArray(versionData.team)) {
        team = versionData.team.map((member: any) => ({
          id: member.team_member_id || member.id,
          name: member.team_member_name || member.name,
          type: (member.team_member_type === 'Supervisor' ||
          member.type === 'Supervisor'
            ? 'Supervisor'
            : 'Standard') as 'Supervisor' | 'Standard',
        }))
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Determinar se está habilitado:
  // 1. Prioridade: campo 'enabled' do Cockpit (booleano)
  // 2. Fallback: campo legado 'agent_status' === 'Active'
  const isEnabled = raw.enabled ?? raw.agent_status === 'Active'

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || '',
    instruction: raw.instruction || '',
    objective: raw.objective || '',
    model: raw.model || 'azure-gpt-4o',
    temperature: raw.temperature ?? 0.7,
    typeName,
    typeId: raw.type_id || '',
    isMcpEnabled: raw.is_mcp_enabled ?? false,
    isApproved: raw.is_approved ?? false,
    isEnabled,
    productionVersion: raw.production_version_id || null,
    team,
    createdAt: raw.created_at || new Date().toISOString(),
    updatedAt: raw.updated_at || new Date().toISOString(),
  }
}

/**
 * Parse utility agents from various MCP response formats
 */
export function parseUtilityAgentsFromResponse(
  response: McpListUtilityAgentsResponse
): McpUtilityAgentRaw[] {
  // Format 1: { utility_agents: [...] }
  if (response.utility_agents && Array.isArray(response.utility_agents)) {
    return response.utility_agents
  }

  // Format 2: { data: [...] }
  if (response.data && Array.isArray(response.data)) {
    return response.data
  }

  // Format 3: { data: { data: [...] } } (nested)
  if (
    response.data &&
    typeof response.data === 'object' &&
    'data' in response.data &&
    Array.isArray((response.data as { data: unknown }).data)
  ) {
    return (response.data as { data: McpUtilityAgentRaw[] }).data
  }

  console.warn(
    '[BFF Normalizer] Unknown response format, returning empty array:',
    Object.keys(response)
  )
  return []
}

/**
 * Normalize a list of utility agents from MCP response
 */
export function normalizeUtilityAgentsList(
  response: McpListUtilityAgentsResponse
): {
  agents: NormalizedUtilityAgent[]
  supervisors: NormalizedUtilityAgent[]
  standards: NormalizedUtilityAgent[]
  totalCount: number
} {
  const rawAgents = parseUtilityAgentsFromResponse(response)
  const agents = rawAgents.map(normalizeUtilityAgent)

  // Pre-filter by type
  const supervisors = agents.filter(a => a.typeName === 'Supervisor')
  const standards = agents.filter(a => a.typeName === 'Standard')

  return {
    agents,
    supervisors,
    standards,
    totalCount: response.total_count ?? agents.length,
  }
}

/**
 * Find a utility agent by name in a normalized list
 */
export function findAgentByName(
  agents: NormalizedUtilityAgent[],
  name: string
): NormalizedUtilityAgent | undefined {
  return agents.find(agent => agent.name.toLowerCase() === name.toLowerCase())
}

/**
 * Find the "MCP Portal Agent" (bootstrap agent) in a list
 */
export function findBootstrapAgent(
  agents: NormalizedUtilityAgent[]
): NormalizedUtilityAgent | undefined {
  return findAgentByName(agents, 'MCP Portal Agent')
}
