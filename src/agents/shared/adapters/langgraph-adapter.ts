/**
 * LangGraph Adapter
 *
 * Transforms UnifiedConfig into LangGraph-compatible format.
 * Used by feedback-analyzer, training-analyzer agents.
 */

import type { LangGraphConfig } from '../types/unified-config'
import {
  resolveAgentPrompt,
  type MCPToolCaller,
} from '../unified-prompt-resolver'

/**
 * Resolve system prompt for a LangGraph agent
 */
export async function resolveLangGraphPrompt(
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
 * Resolve full configuration for a LangGraph agent
 */
export async function resolveLangGraphConfig(
  agentId: string,
  options: { callMCPTool: MCPToolCaller; locale: string }
): Promise<LangGraphConfig> {
  const systemPrompt = await resolveLangGraphPrompt(agentId, options)

  return {
    systemPrompt,
  }
}
