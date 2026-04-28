import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
} as const

export async function POST(request: NextRequest) {
  try {
    const {
      namespace,
      method,
      params,
      headers: customHeaders,
      mcpServerUrl,
    } = await request.json()

    const environmentHeaders = {
      ...DEFAULT_HEADERS,
      'x-api-key': '',
      'x-cockpit-api-key': '',
      'x-cockpit-license-id': '',
      'x-cockpit-namespace-id': namespace,
      'x-cockpit-utility-agent-id': '',
    }

    const headers = { ...environmentHeaders, ...customHeaders }

    const response = await fetch(mcpServerUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params: params || {},
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `MCP Server Error: ${response.status} ${response.statusText}`
      )
      console.error(`Error Body:`, errorText)

      throw new Error(
        `HTTP ${response.status}: ${response.statusText} - ${errorText}`
      )
    }

    const result = await response.json()

    if (result.error) {
      throw new Error(`MCP Error: ${result.error.message || 'Unknown error'}`)
    }

    return NextResponse.json({
      success: true,
      ...result.result,
      raw: result,
    })
  } catch (error) {
    console.error('API Route Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error',
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
