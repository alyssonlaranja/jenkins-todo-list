/**
 * API Route: /api/diagram
 *
 * Server-side proxy for diagram generation.
 *
 * Strategy (in priority order):
 *  1. **MCP tool `generate_diagram_url`** – Called via MCP Streamable HTTP
 *     protocol when `UML_MCP_SERVER_URL` is set.  The tool already contacts
 *     Kroki on the server side and returns `content_base64` (image bytes),
 *     so NO second fetch is needed.
 *  2. **Server-side Kroki fetch** – When the MCP server is unavailable or not
 *     configured, the route builds the Kroki URL locally, fetches the image
 *     server-side, and base64-encodes the response.
 *
 * In both cases the response contains a `data:` URL that the browser can use
 * directly in `<img src>` without hitting CSP restrictions.
 *
 * Environment variables:
 *  - UML_MCP_SERVER_URL       – Base URL of the UML MCP server
 *                                (e.g. https://uml-mcp-dev.br.avanade.ai).
 *                                The MCP endpoint is at `{URL}/mcp`.
 *  - NEXT_PUBLIC_KROKI_SERVER – Kroki server URL override (default https://kroki.io).
 */

import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

import {
  buildKrokiUrl,
  buildPlaygroundUrl,
  DIAGRAM_BACKEND_MAP,
  resolveBackend,
} from '@/lib/diagram/kroki-encoder'

// ---------------------------------------------------------------------------
// MIME helpers
// ---------------------------------------------------------------------------

const FORMAT_MIME: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  pdf: 'application/pdf',
  jpeg: 'image/jpeg',
}

// ---------------------------------------------------------------------------
// MCP tool: generate_diagram_url
// ---------------------------------------------------------------------------

/** Shape returned by the `generate_diagram_url` MCP tool. */
interface McpDiagramResult {
  code?: string
  url?: string | null
  playground?: string | null
  content_base64?: string | null
  error?: string | null
}

/**
 * Call the `generate_diagram_url` MCP tool via Streamable HTTP transport.
 *
 * Opens a short-lived MCP session: initialize → tools/call → close.
 * Returns the parsed tool result on success, or `null` on any failure
 * (so the caller can fall back to direct Kroki fetch).
 */
async function callMcpGenerateDiagramUrl(
  diagramType: string,
  code: string,
  outputFormat: string
): Promise<McpDiagramResult | null> {
  const mcpBaseUrl = process.env.UML_MCP_SERVER_URL
  if (!mcpBaseUrl) return null

  const mcpEndpoint = `${mcpBaseUrl.replace(/\/+$/, '')}/mcp`
  let client: Client | null = null

  try {
    client = new Client(
      { name: 'cockpit-diagram-proxy', version: '1.0.0' },
      { capabilities: {} }
    )

    const transport = new StreamableHTTPClientTransport(new URL(mcpEndpoint))

    await client.connect(transport)

    const result = await client.callTool({
      name: 'generate_diagram_url',
      arguments: {
        diagram_type: diagramType,
        code,
        output_format: outputFormat,
      },
    })

    // MCP tool results come as content array; extract the first text block
    const content = (result.content ?? []) as Array<{
      type: string
      text?: string
    }>

    const textContent = content
      .filter(c => c.type === 'text' && c.text)
      .map(c => c.text!)
      .join('\n')

    if (!textContent) return null

    // The tool returns JSON as text
    const parsed = JSON.parse(textContent) as McpDiagramResult

    if (parsed.error) {
      // eslint-disable-next-line no-console
      console.warn('[API /diagram] MCP tool returned error:', parsed.error)
      return null
    }

    return parsed
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[API /diagram] MCP tool call failed, falling back:', err)
    return null
  } finally {
    try {
      await client?.close()
    } catch {
      // ignore close errors
    }
  }
}

// ---------------------------------------------------------------------------
// Fallback: server-side Kroki fetch
// ---------------------------------------------------------------------------

/**
 * Fetch the image bytes from a Kroki URL on the server side (bypasses browser
 * CSP).  Returns the raw bytes as a Buffer.
 */
async function fetchImageFromKroki(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    throw new Error(`Kroki returned ${res.status}: ${res.statusText}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ---------------------------------------------------------------------------
// Mermaid code sanitization
// ---------------------------------------------------------------------------

/**
 * Mermaid diagram start keywords — used to detect when the AI has placed
 * multiple diagram declarations in a single code block.
 */
const MERMAID_DIAGRAM_START_RE =
  /^\s*(flowchart|graph)\s+(TD|TB|BT|RL|LR)\b|^\s*(sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph|C4Context|C4Container|C4Component|C4Deployment|requirementDiagram|block-beta|sankey-beta|xychart-beta|quadrantChart|zenuml)\b/

/**
 * Sanitize Mermaid source code before sending to Kroki.
 *
 * Fixes common issues produced by AI code generation:
 *   1. Multiple flowchart/diagram declarations in one block → keeps only
 *      the first complete diagram.
 *   2. Literal `\n` (backslash-n) anywhere in the code → replaced with
 *      `<br/>`. This is globally safe because `\n` is never valid Mermaid
 *      syntax — multi-line labels use `<br/>` or actual line breaks.
 *   3. Unquoted node labels in `[...]` containing parentheses or double
 *      quotes → properly quoted so Mermaid doesn't misinterpret them.
 */
function sanitizeMermaidCode(code: string): string {
  let sanitized = code.trim()

  // ------------------------------------------------------------------
  // 1. Split multiple diagram declarations — keep only the first one.
  //    AI often generates two flowcharts in the same block:
  //      flowchart TD
  //        A --> B
  //      flowchart LR          ← second declaration, invalid
  //        C --> D
  // ------------------------------------------------------------------
  const lines = sanitized.split('\n')
  let firstDiagramStartIdx = -1

  for (let i = 0; i < lines.length; i++) {
    if (MERMAID_DIAGRAM_START_RE.test(lines[i]!)) {
      if (firstDiagramStartIdx === -1) {
        firstDiagramStartIdx = i
      } else {
        // Found a second diagram declaration — truncate here
        // eslint-disable-next-line no-console
        console.info(
          `[API /diagram] sanitizeMermaidCode: Found second diagram declaration at line ${i + 1}, truncating to first diagram only.`
        )
        sanitized = lines.slice(firstDiagramStartIdx, i).join('\n').trimEnd()
        break
      }
    }
  }

  // ------------------------------------------------------------------
  // 2. GLOBAL: Replace all literal \n with <br/>.
  //    \n (backslash-n) is NEVER valid Mermaid syntax. AI uses it to
  //    mean "line break" inside node labels, but Mermaid requires <br/>.
  //    This covers labels in all shapes: [...], {...}, (...), etc.
  // ------------------------------------------------------------------
  sanitized = sanitized.replace(/\\n/g, '<br/>')

  // ------------------------------------------------------------------
  // 3. Fix square-bracket node labels that contain special characters.
  //    Mermaid interprets () as a node shape and " as a quote delimiter,
  //    so labels like A[text (info)] or A[text "quoted" text] will fail.
  //    We detect these and wrap the label in quotes, escaping any inner
  //    double quotes by converting them to single quotes.
  //
  //    Examples:
  //      A[text (info)]          → A["text (info)"]
  //      A[text "x" y]           → A["text 'x' y"]
  //      A[text <br/>(info) "x"] → A["text <br/>(info) 'x'"]
  //      A["already quoted"]     → unchanged
  // ------------------------------------------------------------------
  sanitized = sanitized.replace(
    /(\b\w+)\[([^\]]+)\]/g,
    (_match, nodeId: string, label: string) => {
      // Already properly quoted — don't touch
      if (label.startsWith('"') && label.endsWith('"')) {
        return `${nodeId}[${label}]`
      }

      // Check if the label contains characters that need quoting
      const hasParentheses = /[()]/.test(label)
      const hasDoubleQuotes = /"/.test(label)

      if (hasParentheses || hasDoubleQuotes) {
        // Replace inner double quotes with single quotes to avoid
        // breaking the Mermaid parser, then wrap in outer quotes.
        const cleaned = label.replace(/"/g, "'")
        return `${nodeId}["${cleaned}"]`
      }

      return `${nodeId}[${label}]`
    }
  )

  return sanitized
}

// ---------------------------------------------------------------------------
// POST – generate diagram and return base64 data-URL
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 🔧 FIX 2026-03-09: Guard against empty/malformed request bodies
    // Aborted requests (e.g. React re-renders aborting in-flight fetches),
    // browser prefetches, or extensions can send empty POST bodies causing
    // SyntaxError: Unexpected end of JSON input at request.json()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid or empty request body' },
        { status: 400 }
      )
    }
    const {
      diagramType,
      code: rawCode,
      outputFormat = 'svg',
    } = body as {
      diagramType: string
      code: string
      outputFormat?: 'svg' | 'png' | 'pdf'
    }
    let code = rawCode

    if (!diagramType || !code) {
      return NextResponse.json(
        { error: 'diagramType and code are required' },
        { status: 400 }
      )
    }

    // -------------------------------------------------------------------
    // Auto-correct common type/syntax mismatches
    // -------------------------------------------------------------------
    let resolvedType = diagramType.toLowerCase().trim()

    // If type is "bpmn" but code contains PlantUML BPMN macros (!include <bpmn>) → reject with helpful error
    // PlantUML's !include <bpmn> stdlib (POOL, LANE, TASK, GATEWAY) is NOT supported by Kroki
    if (
      (resolvedType === 'bpmn' || resolvedType === 'plantuml') &&
      (code.includes('!include <bpmn>') || code.includes('!include <BPMN>'))
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        '[API /diagram] Rejecting: PlantUML BPMN macros (!include <bpmn>) are not supported by Kroki. Use XML BPMN 2.0 format instead.'
      )
      return NextResponse.json(
        {
          error:
            'PlantUML BPMN macros (!include <bpmn>) are not supported by Kroki. BPMN diagrams must use XML BPMN 2.0 format with <definitions>, <process>, and <bpmndi:BPMNDiagram> elements. Please regenerate the diagram using type="bpmn" with XML BPMN 2.0 syntax.',
          errorType: 'unsupported_syntax',
        },
        { status: 422 }
      )
    }

    // If type is "bpmn" but code contains PlantUML markers (non-BPMN-macro) → route to plantuml
    if (
      resolvedType === 'bpmn' &&
      (code.includes('@startuml') || code.includes('@enduml'))
    ) {
      // eslint-disable-next-line no-console
      console.info(
        '[API /diagram] Auto-correcting: type="bpmn" with PlantUML syntax → routing to plantuml backend'
      )
      resolvedType = 'plantuml'
    }

    // ---------------------------------------------------------------
    // Mermaid syntax detection regex — covers all known Mermaid start
    // keywords so we can auto-correct when code is clearly Mermaid but
    // the declared type points to a different backend (e.g. bpmn, erd,
    // plantuml, sequence, etc.).
    // ---------------------------------------------------------------
    const MERMAID_SYNTAX_RE =
      /^\s*(flowchart|graph)\s+(TD|TB|BT|RL|LR)\b|^\s*(sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph|C4Context|C4Container|C4Component|C4Deployment|requirementDiagram|block-beta|sankey-beta|xychart-beta|quadrantChart|zenuml)\b/m

    // If the declared type is NOT already "mermaid" but the code clearly
    // contains Mermaid syntax → route to the mermaid backend.
    // This covers: bpmn, erd, plantuml-family, and any other type where
    // the user asked the AI to produce Mermaid output.
    if (
      resolvedType !== 'mermaid' &&
      !code.includes('@startuml') &&
      !code.includes('@startmindmap') &&
      !code.includes('<definitions') && // genuine BPMN XML
      !code.includes('<bpmn:definitions') && // genuine BPMN XML (prefixed)
      MERMAID_SYNTAX_RE.test(code)
    ) {
      // eslint-disable-next-line no-console
      console.info(
        `[API /diagram] Auto-correcting: type="${resolvedType}" with Mermaid syntax → routing to mermaid backend`
      )
      resolvedType = 'mermaid'
    }

    // Auto-fix ERD block-brace syntax: [Entity] { attrs } → flat format
    // Agents sometimes wrap attributes in { } blocks (like JSON), but BurntSushi/erd
    // uses { } ONLY for formatting options on the SAME line (e.g. {bgcolor: "#..."})
    if (resolvedType === 'erd') {
      const hasBlockBraces = /\[[^\]]+\]\s*\{\s*$/m.test(code)
      if (hasBlockBraces) {
        // eslint-disable-next-line no-console
        console.info(
          '[API /diagram] Auto-correcting: ERD block-brace syntax → flat BurntSushi/erd format'
        )
        code = code.replace(
          /\[([^\]]+)\]\s*\{\s*\n([\s\S]*?)^\s*\}\s*$/gm,
          (_match: string, entityName: string, attrsBlock: string) => {
            const attrs = attrsBlock
              .split('\n')
              .map((line: string) => line.trim())
              .filter((line: string) => line.length > 0)
              .join('\n')
            return `[${entityName}]\n${attrs}`
          }
        )
      }

      // Fix invalid cardinality: 0 → ? (BurntSushi/erd uses ? for 0..1, not 0)
      if (/--0(?=\s)|(?<=\s)0--/.test(code)) {
        // eslint-disable-next-line no-console
        console.info(
          '[API /diagram] Auto-correcting: ERD cardinality "0" → "?" (BurntSushi/erd format)'
        )
        code = code.replace(/--0(?=\s)/g, '--?')
        code = code.replace(/(?<=\s)0--/g, '?--')
      }
    }

    // -------------------------------------------------------------------
    // Mermaid-specific code sanitization
    // -------------------------------------------------------------------
    if (resolvedType === 'mermaid') {
      code = sanitizeMermaidCode(code)
    }

    const backend = resolveBackend(resolvedType)
    if (!DIAGRAM_BACKEND_MAP[resolvedType]) {
      return NextResponse.json(
        {
          error: `Unsupported diagram type: ${diagramType} (resolved: ${resolvedType})`,
          supportedTypes: Object.keys(DIAGRAM_BACKEND_MAP),
        },
        { status: 400 }
      )
    }

    // eslint-disable-next-line no-console
    console.info(
      `[API /diagram] Rendering: type="${diagramType}" → resolved="${resolvedType}" → backend="${backend}" format="${outputFormat}" code_length=${code.length}`
    )

    // -------------------------------------------------------------------
    // Strategy 1: MCP tool generate_diagram_url (returns content_base64)
    // -------------------------------------------------------------------
    const mcpResult = await callMcpGenerateDiagramUrl(
      resolvedType,
      code,
      outputFormat
    )

    if (mcpResult?.content_base64) {
      const mime = FORMAT_MIME[outputFormat] ?? 'application/octet-stream'
      const dataUrl = `data:${mime};base64,${mcpResult.content_base64}`
      const playground =
        mcpResult.playground ?? buildPlaygroundUrl(resolvedType, code)

      return NextResponse.json({
        dataUrl,
        playground,
        backend,
        diagramType: resolvedType,
        outputFormat,
      })
    }

    // -------------------------------------------------------------------
    // Strategy 2: Build Kroki URL locally → fetch image server-side
    // -------------------------------------------------------------------
    const krokiUrl = buildKrokiUrl(resolvedType, code, outputFormat)
    const playground = buildPlaygroundUrl(resolvedType, code)

    let imageBuffer: Buffer
    try {
      imageBuffer = await fetchImageFromKroki(krokiUrl)
    } catch (fetchErr) {
      // eslint-disable-next-line no-console
      console.error(
        `[API /diagram] Kroki fetch failed for type="${resolvedType}" backend="${backend}":`,
        fetchErr
      )
      return NextResponse.json(
        {
          error:
            `Diagram rendering failed for type "${resolvedType}" (backend: ${backend}). ` +
            `This may be a syntax error in the diagram code. ` +
            (fetchErr instanceof Error ? fetchErr.message : String(fetchErr)),
        },
        { status: 422 }
      )
    }

    const base64 = imageBuffer.toString('base64')
    const mime = FORMAT_MIME[outputFormat] ?? 'application/octet-stream'
    const dataUrl = `data:${mime};base64,${base64}`

    return NextResponse.json({
      dataUrl,
      playground,
      backend,
      diagramType: resolvedType,
      outputFormat,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API /diagram] Error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate diagram',
      },
      { status: 500 }
    )
  }
}

/**
 * GET: Return supported diagram types for client reference.
 */
export async function GET() {
  return NextResponse.json({
    supportedTypes: Object.keys(DIAGRAM_BACKEND_MAP),
    krokiServer: process.env.NEXT_PUBLIC_KROKI_SERVER || 'https://kroki.io',
    mcpServer: process.env.UML_MCP_SERVER_URL ?? null,
  })
}
