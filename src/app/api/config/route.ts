import { NextResponse } from 'next/server'

import { getServerEnv } from '@/shared/lib/server/get-server-env'
import type { RuntimeConfig } from '@/shared/types/runtime-config'

export const dynamic = 'force-dynamic'

/**
 * Public API endpoint for runtime configuration
 * Returns environment variables that need to be available on the client
 *
 * This endpoint is called by getApiBaseUrl() and getWebSocketServerUrl()
 * to fetch configuration at runtime instead of build-time.
 *
 * Why this is needed:
 * - Next.js standalone output embeds NEXT_PUBLIC_* vars during build
 * - Container Apps set env vars at runtime, after build
 * - This endpoint bridges the gap by reading runtime env vars
 *
 * @returns RuntimeConfig with all public environment variables
 */
export async function GET() {
  const config: RuntimeConfig = {
    apiUrl: getServerEnv('NEXT_PUBLIC_API_URL'),
    chatApiUrl: getServerEnv('NEXT_PUBLIC_CHAT_API_URL'),
    websocketServer: getServerEnv('NEXT_PUBLIC_WEBSOCKET_SERVER'),
    mcpServerUrl: getServerEnv('NEXT_PUBLIC_MCP_SERVER_URL'),
    mcpServerLegacyUrl: getServerEnv('NEXT_PUBLIC_MCP_SERVER_LEGACY_URL'),
    mcpServerUtilityAgentUrl: getServerEnv('NEXT_PUBLIC_MCP_SERVER_UTILITY_AGENT_URL'),
    mcpServerSuiteUrl: getServerEnv('NEXT_PUBLIC_MCP_SERVER_SUITE_URL'),
    mcpServerMetricsUrl: getServerEnv('NEXT_PUBLIC_MCP_SERVER_METRICS_URL'),
    mcpServerTelemetryUrl: getServerEnv('NEXT_PUBLIC_MCP_SERVER_TELEMETRY_URL'),
    customBasePath: getServerEnv('NEXT_PUBLIC_CUSTOM_BASE_PATH'),
  }

  // Log missing variables in development for debugging
  if (process.env.NODE_ENV === 'development') {
    const missingVars = Object.entries(config)
      .filter(([key, value]) => !value && key !== 'customBasePath') // customBasePath is optional
      .map(([key]) => key)

    if (missingVars.length > 0) {
      console.warn('[/api/config] Missing environment variables:', missingVars)
    }
  }

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      'Content-Type': 'application/json',
    },
  })
}
