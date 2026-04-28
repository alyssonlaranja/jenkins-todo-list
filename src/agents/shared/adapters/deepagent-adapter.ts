/**
 * DeepAgent Adapter
 *
 * Transforms UnifiedConfig into DeepAgent-compatible format.
 * Used by feedback-deep-agent, training-deep-agent.
 */

import type { DeepAgentConfig } from '../types/unified-config'
import {
  resolveAgentPrompt,
  type MCPToolCaller,
} from '../unified-prompt-resolver'

/**
 * Resolve system prompt for a DeepAgent
 */
export async function resolveDeepAgentPrompt(
  agentId: string,
  options: { callMCPTool: MCPToolCaller; locale: string }
): Promise<string> {
  const result = await resolveAgentPrompt(agentId, {
    callMCPTool: options.callMCPTool,
    locale: options.locale,
  })

  return result.content
}

/**
 * Resolve full configuration for a DeepAgent
 */
export async function resolveDeepAgentConfig(
  agentId: string,
  options: { callMCPTool: MCPToolCaller; locale: string }
): Promise<DeepAgentConfig> {
  const result = await resolveAgentPrompt(agentId, {
    callMCPTool: options.callMCPTool,
    locale: options.locale,
  })

  return {
    systemPrompt: result.content,
    subagentInstructions: undefined, // Can be extended later
  }
}
