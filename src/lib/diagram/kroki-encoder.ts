/**
 * Kroki Diagram Encoder
 *
 * Encodes diagram source code into Kroki-compatible URLs.
 * Kroki is a unified API that generates diagrams from textual descriptions.
 *
 * The encoding flow:
 *   1. Source code text → zlib deflate compress
 *   2. Compressed bytes → base64url encode
 *   3. Construct URL: {KROKI_BASE}/{backend}/{format}/{encoded}
 *
 * @see https://kroki.io
 */

import pako from 'pako'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const KROKI_BASE_URL =
  process.env.NEXT_PUBLIC_KROKI_SERVER || 'https://kroki.io'

/**
 * Map of high-level diagram type → Kroki backend name.
 * PlantUML-based types share the "plantuml" backend;
 * others use their own backend name.
 */
export const DIAGRAM_BACKEND_MAP: Record<string, string> = {
  // PlantUML UML types → plantuml backend
  class: 'plantuml',
  sequence: 'plantuml',
  activity: 'plantuml',
  usecase: 'plantuml',
  state: 'plantuml',
  component: 'plantuml',
  deployment: 'plantuml',
  object: 'plantuml',
  timing: 'plantuml',
  // Direct backends
  plantuml: 'plantuml',
  mermaid: 'mermaid',
  d2: 'd2',
  graphviz: 'graphviz',
  dot: 'graphviz',
  c4plantuml: 'c4plantuml',
  c4: 'c4plantuml',
  structurizr: 'structurizr',
  dbml: 'dbml',
  erd: 'erd',
  ditaa: 'ditaa',
  nomnoml: 'nomnoml',
  svgbob: 'svgbob',
  bpmn: 'bpmn',
  bytefield: 'bytefield',
  excalidraw: 'excalidraw',
  pikchr: 'pikchr',
  vega: 'vega',
  vegalite: 'vegalite',
  wavedrom: 'wavedrom',
  wireviz: 'wireviz',
  blockdiag: 'blockdiag',
  seqdiag: 'seqdiag',
  actdiag: 'actdiag',
  nwdiag: 'nwdiag',
  packetdiag: 'packetdiag',
  rackdiag: 'rackdiag',
}

/**
 * Diagram types that are recognized as code-block languages in markdown.
 * Used by the frontend to decide whether to render a code block as a diagram.
 */
export const SUPPORTED_DIAGRAM_LANGUAGES = new Set(
  Object.keys(DIAGRAM_BACKEND_MAP)
)

/**
 * Playground editor URLs for interactive editing.
 */
const PLAYGROUND_URLS: Record<string, string> = {
  plantuml: 'https://www.plantuml.com/plantuml/uml/',
  mermaid: 'https://mermaid.live/edit#pako:',
  d2: 'https://play.d2lang.com/?script=',
  graphviz: 'https://dreampuf.github.io/GraphvizOnline/#',
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

/**
 * Compress text with zlib deflate and encode as base64url.
 * This is the encoding Kroki expects in its GET URLs.
 */
export function encodeForKroki(text: string): string {
  const data = new TextEncoder().encode(text)
  const compressed = pako.deflate(data, { level: 9 })
  // base64url: standard base64 with + → - and / → _, no padding
  const b64 = btoa(String.fromCharCode(...compressed))
  return b64.replace(/\+/g, '-').replace(/\//g, '_')
}

/**
 * PlantUML-specific 6-bit encoding (used for playground URLs).
 */
function encodePlantuml6Bit(b: number): string {
  if (b < 10) return String.fromCharCode(48 + b)
  const b2 = b - 10
  if (b2 < 26) return String.fromCharCode(65 + b2)
  const b3 = b2 - 26
  if (b3 < 26) return String.fromCharCode(97 + b3)
  const b4 = b3 - 26
  if (b4 === 0) return '-'
  if (b4 === 1) return '_'
  return '?'
}

function encodePlantuml3bytes(b1: number, b2: number, b3: number): string {
  const c1 = b1 >> 2
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6)
  const c4 = b3 & 0x3f
  return (
    encodePlantuml6Bit(c1 & 0x3f) +
    encodePlantuml6Bit(c2 & 0x3f) +
    encodePlantuml6Bit(c3 & 0x3f) +
    encodePlantuml6Bit(c4 & 0x3f)
  )
}

/**
 * Encode text for PlantUML server URLs (custom 6-bit encoding).
 */
export function encodePlantuml(text: string): string {
  const data = pako.deflate(new TextEncoder().encode(text), { level: 9 })
  // Remove zlib header (2 bytes) and checksum (4 bytes) for PlantUML format
  const raw = data.slice(2, data.length - 4)

  let result = ''
  for (let i = 0; i < raw.length; i += 3) {
    if (i + 2 === raw.length) {
      result += encodePlantuml3bytes(raw[i]!, raw[i + 1]!, 0)
    } else if (i + 1 === raw.length) {
      result += encodePlantuml3bytes(raw[i]!, 0, 0)
    } else {
      result += encodePlantuml3bytes(raw[i]!, raw[i + 1]!, raw[i + 2]!)
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// URL Builders
// ---------------------------------------------------------------------------

/**
 * Build a Kroki rendering URL for a diagram.
 *
 * @param diagramType - e.g. "mermaid", "plantuml", "class", "sequence"
 * @param code - The diagram source code
 * @param format - Output format: "svg" (default), "png", "pdf"
 * @returns Full URL that returns the rendered image
 */
export function buildKrokiUrl(
  diagramType: string,
  code: string,
  format: 'svg' | 'png' | 'pdf' = 'svg'
): string {
  const backend = resolveBackend(diagramType)
  const preparedCode = prepareCode(diagramType, code, backend)
  const encoded = encodeForKroki(preparedCode)
  return `${KROKI_BASE_URL}/${backend}/${format}/${encoded}`
}

/**
 * Build a playground (online editor) URL for the diagram.
 * Returns null if no playground is available for the type.
 */
export function buildPlaygroundUrl(
  diagramType: string,
  code: string
): string | null {
  const backend = resolveBackend(diagramType)
  const preparedCode = prepareCode(diagramType, code, backend)

  if (backend === 'plantuml' || backend === 'c4plantuml') {
    const encoded = encodePlantuml(preparedCode)
    return `${PLAYGROUND_URLS.plantuml}~1${encoded}`
  }

  if (backend === 'mermaid') {
    // Mermaid.live uses pako + base64 of the state JSON
    const state = JSON.stringify({
      code: preparedCode,
      mermaid: { theme: 'default' },
      autoSync: true,
      updateDiagram: true,
    })
    const compressed = pako.deflate(new TextEncoder().encode(state), {
      level: 9,
    })
    const b64 = btoa(String.fromCharCode(...compressed))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
    return `${PLAYGROUND_URLS.mermaid}${b64}`
  }

  const playgroundBase = PLAYGROUND_URLS[backend]
  if (playgroundBase) {
    const encoded = btoa(preparedCode)
    return `${playgroundBase}${encoded}`
  }

  return null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve diagram type to Kroki backend name.
 */
export function resolveBackend(diagramType: string): string {
  const normalized = diagramType.toLowerCase().trim()
  return DIAGRAM_BACKEND_MAP[normalized] || normalized
}

/**
 * Prepare diagram code (e.g. wrap PlantUML with @startuml/@enduml).
 */
function prepareCode(
  _diagramType: string,
  code: string,
  backend: string
): string {
  let prepared = code.trim()

  if (backend === 'plantuml' || backend === 'c4plantuml') {
    if (
      !prepared.includes('@startuml') &&
      !prepared.includes('@startmindmap') &&
      !prepared.includes('@startsalt') &&
      !prepared.includes('@startgantt') &&
      !prepared.includes('@startwbs')
    ) {
      prepared = `@startuml\n${prepared}`
    }
    if (
      !prepared.includes('@enduml') &&
      !prepared.includes('@endmindmap') &&
      !prepared.includes('@endsalt') &&
      !prepared.includes('@endgantt') &&
      !prepared.includes('@endwbs')
    ) {
      prepared = `${prepared}\n@enduml`
    }
  }

  return prepared
}
