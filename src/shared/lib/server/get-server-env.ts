/**
 * Runtime Environment Variable Access for Server-Side Code
 *
 * Next.js webpack DefinePlugin replaces literal `process.env.NEXT_PUBLIC_*`
 * references with their values at BUILD TIME. In standalone Docker builds
 * where NEXT_PUBLIC_* vars are only injected at RUNTIME (not during
 * `next build`), every reference gets replaced with an empty string `""`.
 *
 * Example of the problem:
 * ```
 * // Source code:
 * const url = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'fallback'
 *
 * // After webpack build (NEXT_PUBLIC_MCP_SERVER_URL not set during build):
 * const url = "" || 'fallback'  // Always falls through to fallback!
 * ```
 *
 * Solution: Dynamic key access `process.env[key]` is NOT recognized by
 * DefinePlugin, so the actual runtime value from the container environment
 * is read correctly.
 *
 * @module server/get-server-env
 */

/**
 * Reads an environment variable at RUNTIME, bypassing Next.js build-time inlining.
 *
 * Use this in API routes / server-side code instead of `process.env.NEXT_PUBLIC_*`.
 *
 * @param key   - Full env var name, e.g. `'NEXT_PUBLIC_MCP_SERVER_URL'`
 * @param fallback - Optional fallback value if the var is not set
 * @returns The runtime value, or the fallback, or `''`
 *
 * @example
 * ```ts
 * import { getServerEnv } from '@/shared/lib/server/get-server-env'
 *
 * const MCP_SERVER_URL = getServerEnv(
 *   'NEXT_PUBLIC_MCP_SERVER_URL',
 *   'https://mcp-agent.br.avanade.ai/mcp'
 * )
 * ```
 */
export function getServerEnv(key: string, fallback: string = ''): string {
  // Dynamic access: process.env[key] is NOT inlined by webpack DefinePlugin
  return process.env[key] || fallback
}
