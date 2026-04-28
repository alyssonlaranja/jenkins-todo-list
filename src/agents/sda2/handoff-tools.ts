/**
 * Dynamic Handoff Tools for SDA2 Supervisor
 *
 * Creates transfer tools dynamically based on MCP team members.
 * No static configuration - all agents come from Cockpit.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

import type { DynamicAgentConfig } from './types'

// Simple schema for handoff
const HandoffSchema = z.object({
  reason: z.string().describe('Motivo da transferência'),
})

/**
 * Normalize agent name to LangGraph-friendly format
 *
 * - Removes accents
 * - Converts to lowercase
 * - Replaces special characters with underscores
 */
export function normalizeAgentName(name: string): string {
  if (!name) return 'agent'

  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics/accents
    .replace(/[^\w\-_]/g, '_') // Replace special chars
    .replace(/__+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, '') // Trim underscores
}

/**
 * Create a handoff tool for a single agent
 */
function createHandoffTool(agent: DynamicAgentConfig): DynamicStructuredTool {
  const toolName = `transfer_to_${agent.name}`
  const description = `Transferir para ${agent.displayName}. ${agent.description}`

  return new DynamicStructuredTool({
    name: toolName,
    description,
    schema: HandoffSchema,
    func: async ({ reason }: { reason: string }) => {
      console.log(
        `[Handoff] 🔄 Transferindo para ${agent.displayName}: ${reason}`
      )

      return JSON.stringify({
        handoff: true,
        targetAgent: agent.name,
        targetDisplayName: agent.displayName,
        reason,
        timestamp: Date.now(),
      })
    },
  })
}

/**
 * Create handoff tools dynamically from agent configs
 *
 * Generates one transfer_to_[agent] tool for each team member.
 * The supervisor uses these to delegate to specialized agents.
 */
export function createDynamicHandoffTools(
  agents: DynamicAgentConfig[]
): DynamicStructuredTool[] {
  const tools: DynamicStructuredTool[] = []

  for (const agent of agents) {
    tools.push(createHandoffTool(agent))
  }

  return tools
}

/**
 * Create a single handoff tool for testing
 */
export function createSingleHandoffTool(
  agentName: string,
  displayName: string,
  description: string
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: `transfer_to_${agentName}`,
    description: `Transferir para ${displayName}. ${description}`,
    schema: HandoffSchema,
    func: async ({ reason }: { reason: string }) => {
      return JSON.stringify({
        handoff: true,
        targetAgent: agentName,
        reason,
        timestamp: Date.now(),
      })
    },
  })
}
