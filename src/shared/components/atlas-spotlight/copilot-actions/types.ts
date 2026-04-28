// Import SeverityLevel for internal use in SEVERITY_ICONS
// Import for internal use
import type {
  FeedbackCategoryMap,
  SeverityLevel,
} from '@/features/atlas/types/categories'

/**
 * Shared Types for Atlas Quick Agent Actions
 *
 * Based on:
 * - src/features/atlas/types/signals.ts
 * - src/features/atlas/types/categories/index.ts (SINGLE SOURCE OF TRUTH)
 */

// ============================================================================
// IMPORTS - Use centralized types from Atlas
// ============================================================================

// Re-export from centralized source
export type {
  FeedbackCategoryMap,
  FeedbackCategoryType,
  SeverityLevel,
} from '@/features/atlas/types/categories'

export {
  CATEGORY_DESCRIPTIONS_FOR_AI,
  FEEDBACK_CATEGORIES,
  getAllCategoryIds,
  getCategoryIcon,
  getCategoryMetadata,
  isValidCategory,
} from '@/features/atlas/types/categories'

// ============================================================================
// SIGNAL TYPES (from atlas module)
// ============================================================================

export type SignalType = 'insight' | 'feedback' | 'message'

export type SignalCategory =
  | 'discovery'
  | 'pattern'
  | 'opportunity'
  | 'risk'
  | 'bug'
  | 'feature'
  | 'improvement'
  | 'innovation'
  | 'note'
  | 'alert'

export type SignalPriority = 'low' | 'medium' | 'high' | 'critical'

// ============================================================================
// FEEDBACK TYPES (aligned with CentralizedFeedback from atlas/types)
// ============================================================================

/**
 * Source module where the feedback originated
 * Aligned with FeedbackSource from atlas/types
 */
export type FeedbackSource =
  | 'upstream' // Upstream Wizard
  | 'migration' // Migration Wizard
  | 'connections' // Connections module
  | 'agents' // Agents module
  | 'general' // General platform feedback (default for Quick Agent)

export type FeedbackStatus =
  | 'new'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'wont_fix'

// ============================================================================
// LEGACY CATEGORY DESCRIPTIONS (deprecated - use CATEGORY_DESCRIPTIONS_FOR_AI)
// ============================================================================

/**
 * @deprecated Use CATEGORY_DESCRIPTIONS_FOR_AI from atlas/types/categories
 * Kept for backward compatibility with existing code
 */
export const CATEGORY_DESCRIPTIONS: Record<keyof FeedbackCategoryMap, string> =
  {
    bug: 'Technical issues, crashes, or unexpected behavior in the system',
    feature: 'Suggestions for new features, improvements, or enhancements',
    agent: 'Feedback about AI agent responses, accuracy, or behavior',
    tool: 'Issues or suggestions about MCP tools and their performance',
    workflow: 'Feedback about processes, workflows, or how things are done',
    learning: 'Feedback about documentation, tutorials, or learning materials',
    success: 'Positive experiences, wins, or success stories to share',
    security: 'Security concerns, privacy issues, or access control problems',
    performance: 'Slowness, timeouts, or scalability issues',
    innovation:
      'Disruptive ideas, future vision, or transformational suggestions',
    insight: 'AI-generated insights from knowledge analysis',
  }

/**
 * Maps current module path to FeedbackSource
 */
export function getSourceFromModule(currentModule: string): FeedbackSource {
  const moduleLower = currentModule.toLowerCase()
  if (moduleLower.includes('upstream')) return 'upstream'
  if (moduleLower.includes('migration')) return 'migration'
  if (moduleLower.includes('connection')) return 'connections'
  if (moduleLower.includes('agent')) return 'agents'
  return 'general'
}

export const SEVERITY_ICONS: Record<SeverityLevel, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Function type for calling MCP tools.
 * This is injected from useProxyMCP hook to ensure proper connection handling.
 */
export type CallMCPToolFn = (
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<any>

export interface AtlasQuickAgentActionsProps {
  // User context
  userName: string
  userEmail: string

  // Current location
  currentModule: string
  pathname: string

  // Connection info
  isConnected: boolean
  namespaceId?: string
  namespaceName?: string
  licenseId?: string
  licenseName?: string

  // MCP Tool Function - injected from useProxyMCP
  callMCPTool?: CallMCPToolFn

  // Callbacks
  onNavigate: (path: string) => void
  onSignalCreated?: () => void
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Helper to call MCP tool and parse the response.
 * Uses the injected callMCPTool function from useProxyMCP.
 */
export async function callMCPToolWithParsing(
  callMCPTool: CallMCPToolFn | undefined,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  if (!callMCPTool) {
    console.error('[callMCPToolWithParsing] callMCPTool function not provided')
    return { ok: false, error: 'Conexao MCP nao disponivel' }
  }

  try {
    console.log(
      '[callMCPToolWithParsing] Calling tool:',
      toolName,
      'args:',
      args
    )

    const result = await callMCPTool(toolName, args)

    // Parse response - handle flexible MCP response formats
    // The useProxyMCP returns the raw orchestrator response
    let data
    if (result?.content?.[0]?.text) {
      // Standard MCP tool response format
      try {
        data = JSON.parse(result.content[0].text)
      } catch {
        data = result.content[0].text
      }
    } else if (result?.data) {
      data = result.data
    } else if (result?.result) {
      data = result.result
    } else if (result?.raw?.result) {
      data = result.raw.result
    } else {
      data = result || {}
    }

    console.log(
      '[callMCPToolWithParsing] Success, data keys:',
      Object.keys(data || {})
    )
    return { ok: true, result: data }
  } catch (error) {
    console.error('[callMCPToolWithParsing] Exception:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
