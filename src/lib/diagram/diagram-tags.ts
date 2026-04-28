/**
 * Diagram Tag Parser
 *
 * Parses diagram blocks wrapped in custom HTML comment tags:
 *
 *   <!-- DIAGRAM type="mermaid" title="Component Architecture" -->
 *   graph TD
 *       A --> B
 *   <!-- /DIAGRAM -->
 *
 * This provides reliable, deterministic diagram detection compared
 * to fragile pattern-matching of raw diagram code. The tag approach
 * mirrors the ARTIFACT_METADATA pattern used for document type detection.
 *
 * During streaming:
 *   - Complete tags → replaced with "⏳ Gerando diagrama..." placeholder
 *   - Incomplete tags (open but not closed) → hidden from opening tag to end
 *
 * After streaming:
 *   - Tags are extracted, parsed, and rendered as images via Kroki
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiagramTagBlock {
  /** Diagram language/type, e.g. "mermaid", "plantuml", "d2" */
  type: string
  /** Optional title for the diagram */
  title?: string
  /** The raw diagram source code */
  code: string
  /** The full matched text (including tags) */
  fullMatch: string
}

// ---------------------------------------------------------------------------
// Tag Format Constants
// ---------------------------------------------------------------------------

/** Opening tag: <!-- DIAGRAM type="mermaid" title="..." --> */
const DIAGRAM_OPEN_TAG = /<!-- DIAGRAM\s+([\s\S]*?)-->/i

/** Complete tag block (opening + content + closing) */
const DIAGRAM_BLOCK_REGEX =
  /<!-- DIAGRAM\s+([\s\S]*?)-->\n?([\s\S]*?)\n?<!-- \/DIAGRAM -->/gi

/** Attribute parser: key="value" */
const ATTR_REGEX = /(\w+)="([^"]*?)"/g

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/**
 * Parse attributes from the DIAGRAM opening tag.
 *
 * @example
 *   parseTagAttributes('type="mermaid" title="Flow"')
 *   // → { type: "mermaid", title: "Flow" }
 */
function parseTagAttributes(attrsString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  let match: RegExpExecArray | null
  const regex = new RegExp(ATTR_REGEX.source, 'g')
  while ((match = regex.exec(attrsString)) !== null) {
    attrs[match[1]!] = match[2]!
  }
  return attrs
}

/**
 * Extract all complete diagram tag blocks from content.
 *
 * @returns Array of parsed diagram blocks with type, code, title, and full match text.
 */
export function extractDiagramTags(content: string): DiagramTagBlock[] {
  if (!content) return []

  const blocks: DiagramTagBlock[] = []
  const regex = new RegExp(DIAGRAM_BLOCK_REGEX.source, 'gi')
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    const attrsString = match[1]!
    const code = match[2]!.trim()
    const attrs = parseTagAttributes(attrsString)

    if (code) {
      blocks.push({
        type: attrs.type || 'mermaid',
        title: attrs.title,
        code,
        fullMatch: match[0],
      })
    }
  }

  return blocks
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/**
 * Check if content contains any DIAGRAM tags (complete or incomplete).
 */
export function hasDiagramTags(content: string): boolean {
  return DIAGRAM_OPEN_TAG.test(content)
}

/**
 * Check if content has an incomplete diagram tag (opened but not closed).
 * This happens during streaming when the agent has started writing a diagram
 * but hasn't finished yet.
 */
export function hasIncompleteDiagramTag(content: string): boolean {
  const starts = (content.match(/<!-- DIAGRAM\s/gi) || []).length
  const ends = (content.match(/<!-- \/DIAGRAM -->/gi) || []).length
  return starts > ends
}

// ---------------------------------------------------------------------------
// Streaming support
// ---------------------------------------------------------------------------

/**
 * Hide diagram tag content during streaming.
 *
 * - **Complete tags** (open + content + close) → replaced with placeholder
 * - **Incomplete tags** (open but no close yet) → hidden from opening tag to end of string
 *
 * This ensures the user never sees raw diagram code during streaming.
 */
export function hideStreamingDiagramTags(content: string): string {
  if (!content || !hasDiagramTags(content)) return content

  const placeholder = '\n\n> ⏳ *Gerando diagrama...*\n\n'

  // Step 1: Replace all complete diagram tag blocks with placeholder
  let result = content.replace(
    /<!-- DIAGRAM\s+[\s\S]*?-->\n?[\s\S]*?\n?<!-- \/DIAGRAM -->/gi,
    placeholder
  )

  // Step 2: If there's still an incomplete tag (open but not closed),
  //         hide everything from the opening tag to end of content
  if (hasIncompleteDiagramTag(result)) {
    result = result.replace(/<!-- DIAGRAM\s+[\s\S]*$/i, placeholder)
  }

  return result
}

// ---------------------------------------------------------------------------
// Content splitting (for DiagramAwareContent)
// ---------------------------------------------------------------------------

interface TextSegment {
  type: 'text'
  content: string
}

interface DiagramSegment {
  type: 'diagram'
  language: string
  code: string
  title?: string
}

export type ContentSegment = TextSegment | DiagramSegment

/**
 * Split content by DIAGRAM tags into text and diagram segments.
 *
 * This replaces tag-wrapped diagram blocks with DiagramSegments
 * while preserving surrounding text as TextSegments.
 *
 * @returns Array of alternating text/diagram segments
 */
export function splitByDiagramTags(content: string): ContentSegment[] {
  if (!content || !hasDiagramTags(content)) {
    return content ? [{ type: 'text', content }] : []
  }

  const segments: ContentSegment[] = []
  const regex = new RegExp(DIAGRAM_BLOCK_REGEX.source, 'gi')
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim()
      if (textBefore) {
        segments.push({ type: 'text', content: textBefore })
      }
    }

    // Parse diagram attributes
    const attrs = parseTagAttributes(match[1]!)
    const code = match[2]!.trim()

    if (code) {
      segments.push({
        type: 'diagram',
        language: attrs.type || 'mermaid',
        code,
        title: attrs.title,
      })
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last match
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim()
    if (remaining) {
      segments.push({ type: 'text', content: remaining })
    }
  }

  return segments
}
