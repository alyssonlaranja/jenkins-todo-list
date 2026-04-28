'use client'

import { useCallback, useState } from 'react'

import type {
  CheckAgentHealthRequest,
  HealthCheck,
  HealthCheckResult,
} from '@/shared/lib/mcp/types'

/**
 * useAgentHealth - Agent Health Check Hook
 *
 * Provides comprehensive health checking for utility agents using MCP v2.0 `check_agent_health` tool.
 * Performs validation checks:
 * - Instruction validation (YAML front matter syntax)
 * - Artifacts availability (all referenced artifacts exist)
 * - Team integrity (all team members are valid)
 * - Production version (exists and valid)
 *
 * @example
 * ```tsx
 * const { checkHealth, healthStatus, isChecking } = useAgentHealth()
 *
 * const result = await checkHealth('abc-123')
 *
 * if (result.status === 'healthy') {
 *   console.log('All checks passed!')
 * } else {
 *   console.log('Issues:', result.issues)
 * }
 * ```
 */

export interface UseAgentHealthOptions {
  /**
   * Function to call MCP tools (from useProxyMCP)
   */
  callTool: (name: string, params: unknown) => Promise<unknown>

  /**
   * Auto-parse response
   * @default true
   */
  autoParse?: boolean
}

export interface UseAgentHealthReturn {
  // Health check function
  checkHealth: (agentId: string) => Promise<HealthCheckResult | null>

  // Batch check multiple agents
  checkMultiple: (agentIds: string[]) => Promise<Map<string, HealthCheckResult>>

  // State
  healthStatus: HealthCheckResult | null
  isChecking: boolean
  error: string | null

  // Utilities
  clearHealth: () => void
  isHealthy: (result: HealthCheckResult) => boolean
  hasWarnings: (result: HealthCheckResult) => boolean
  hasErrors: (result: HealthCheckResult) => boolean
}

/**
 * useAgentHealth - Agent Health Check Hook
 *
 * Provides comprehensive health checking for utility agents using MCP v2.0 `check_agent_health` tool.
 * Performs validation checks:
 * - Instruction validation (YAML front matter syntax)
 * - Artifacts availability (all referenced artifacts exist)
 * - Team integrity (all team members are valid)
 * - Production version (exists and valid)
 *
 * @example
 * ```tsx
 * const { checkHealth, healthStatus, isChecking } = useAgentHealth()
 *
 * const result = await checkHealth('abc-123')
 *
 * if (result.status === 'healthy') {
 *   console.log('All checks passed!')
 * } else {
 *   console.log('Issues:', result.issues)
 * }
 * ```
 */

export function useAgentHealth({
  callTool,
  autoParse = true,
}: UseAgentHealthOptions): UseAgentHealthReturn {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(
    null
  )
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Parse MCP response with nested structure
   */
  const parseMCPResponse = useCallback((result: unknown): HealthCheckResult => {
    // Type guard for result object
    if (typeof result !== 'object' || result === null) {
      throw new Error('Invalid response format')
    }

    const resultObj = result as Record<string, unknown>

    if (
      resultObj.content &&
      Array.isArray(resultObj.content) &&
      resultObj.content[0] &&
      typeof resultObj.content[0] === 'object' &&
      resultObj.content[0] !== null &&
      'text' in resultObj.content[0]
    ) {
      try {
        const parsed = JSON.parse(resultObj.content[0].text as string)
        // MCP v2.0: always uses 'success'
        if (parsed.success) {
          return parsed as HealthCheckResult
        }
        throw new Error(parsed.error || 'Health check failed')
      } catch (parseError) {
        console.error('[useAgentHealth] Parse error:', parseError)
        throw parseError
      }
    }

    // Direct response format
    if ('success' in resultObj && resultObj.success) {
      return resultObj as HealthCheckResult
    }

    const error =
      'error' in resultObj && typeof resultObj.error === 'string'
        ? resultObj.error
        : 'Health check failed'
    throw new Error(error)
  }, [])

  /**
   * Check health of a single agent
   */
  const checkHealth = useCallback(
    async (agentId: string): Promise<HealthCheckResult | null> => {
      setIsChecking(true)
      setError(null)

      try {
        console.log('[useAgentHealth] Checking health for agent:', agentId)

        const params: CheckAgentHealthRequest = {
          utility_agent_id: agentId,
        }

        const result = await callTool('check_agent_health', params)
        const parsed = autoParse ? parseMCPResponse(result) : result

        console.log('[useAgentHealth] Health check complete:')
        console.log(`  - Agent: ${parsed.agent_name}`)
        console.log(`  - Status: ${parsed.status}`)
        console.log(`  - Checks: ${parsed.total_checks}`)
        console.log(`  - Issues: ${parsed.issues}`)
        console.log(
          `  - Summary: ${parsed.summary.errors} errors, ${parsed.summary.warnings} warnings, ${parsed.summary.info} info`
        )

        // Log failed checks
        const failedChecks = parsed.checks.filter(
          (c: HealthCheck) => c.status === 'fail'
        )
        if (failedChecks.length > 0) {
          console.warn('[useAgentHealth] Failed checks:')
          failedChecks.forEach((check: HealthCheck) => {
            console.warn(`  - ${check.check}: ${check.message}`)
          })
        }

        // Log warnings
        const warningChecks = parsed.checks.filter(
          (c: HealthCheck) => c.status === 'warning'
        )
        if (warningChecks.length > 0) {
          console.warn('[useAgentHealth] Warning checks:')
          warningChecks.forEach((check: HealthCheck) => {
            console.warn(`  - ${check.check}: ${check.message}`)
          })
        }

        setHealthStatus(parsed)
        return parsed
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Health check failed'
        console.error('[useAgentHealth] Error:', errorMsg)
        setError(errorMsg)
        setHealthStatus(null)
        return null
      } finally {
        setIsChecking(false)
      }
    },
    [callTool, autoParse, parseMCPResponse]
  )

  /**
   * Check health of multiple agents in batch
   */
  const checkMultiple = useCallback(
    async (agentIds: string[]): Promise<Map<string, HealthCheckResult>> => {
      const results = new Map<string, HealthCheckResult>()

      console.log(
        `[useAgentHealth] Checking health for ${agentIds.length} agents...`
      )

      for (const agentId of agentIds) {
        const result = await checkHealth(agentId)
        if (result) {
          results.set(agentId, result)
        }
      }

      console.log(
        `[useAgentHealth] Batch health check complete: ${results.size}/${agentIds.length} successful`
      )

      return results
    },
    [checkHealth]
  )

  /**
   * Clear health status
   */
  const clearHealth = useCallback(() => {
    setHealthStatus(null)
    setError(null)
  }, [])

  /**
   * Check if agent is healthy (all checks passed)
   */
  const isHealthy = useCallback((result: HealthCheckResult): boolean => {
    return result.status === 'healthy' && result.issues === 0
  }, [])

  /**
   * Check if agent has warnings
   */
  const hasWarnings = useCallback((result: HealthCheckResult): boolean => {
    return result.summary.warnings > 0
  }, [])

  /**
   * Check if agent has errors
   */
  const hasErrors = useCallback((result: HealthCheckResult): boolean => {
    return result.summary.errors > 0
  }, [])

  return {
    // Health check functions
    checkHealth,
    checkMultiple,

    // State
    healthStatus,
    isChecking,
    error,

    // Utilities
    clearHealth,
    isHealthy,
    hasWarnings,
    hasErrors,
  }
}
