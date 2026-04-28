import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

import { authOptions } from '@/auth'

export const dynamic = 'force-dynamic'

/**
 * Protected API route for MCP Server API Key
 * Requires authentication - matches cockpit-portal pattern
 */
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // Debug logs (temporary)
  console.log('[DEBUG] MCP_SERVER_API_KEY:', {
    exists: !!process.env.MCP_SERVER_API_KEY,
    length: process.env.MCP_SERVER_API_KEY?.length || 0,
  })

  // Match cockpit-portal pattern: return value or fallback string
  return NextResponse.json(
    {
      mcpServerApiKey:
        process.env.MCP_SERVER_API_KEY || 'MCP_SERVER_API_KEY not set',
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    }
  )
}
