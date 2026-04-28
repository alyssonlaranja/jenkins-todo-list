/**
 * Markdown Diagram Preprocessor
 *
 * Detects raw diagram code (Mermaid, PlantUML, etc.) that the LLM
 * wrote WITHOUT wrapping in fenced code blocks, and auto-wraps them
 * so ReactMarkdown can render them via DiagramRenderer.
 *
 * This is a safety net — ideally the LLM always uses ``` fences,
 * but when it doesn't, this preprocessor catches common patterns.
 */

// ---------------------------------------------------------------------------
// Mermaid detection patterns — these keywords start a Mermaid diagram
// ---------------------------------------------------------------------------
const MERMAID_START_PATTERNS = [
  /^flowchart\s+(TD|TB|BT|RL|LR)\b/,
  /^graph\s+(TD|TB|BT|RL|LR)\b/,
  /^sequenceDiagram\b/,
  /^classDiagram\b/,
  /^stateDiagram(?:-v2)?\b/,
  /^erDiagram\b/,
  /^gantt\b/,
  /^pie\b/,
  /^journey\b/,
  /^mindmap\b/,
  /^timeline\b/,
  /^gitGraph\b/,
  /^C4Context\b/,
  /^C4Container\b/,
  /^C4Component\b/,
  /^C4Deployment\b/,
  /^requirementDiagram\b/,
  /^block-beta\b/,
  /^sankey-beta\b/,
  /^xychart-beta\b/,
  /^quadrantChart\b/,
  /^zenuml\b/,
]

// PlantUML detection
const PLANTUML_START = /^@start(uml|mindmap|salt|gantt|wbs|ditaa|yaml|json)\b/
const PLANTUML_END = /^@end(uml|mindmap|salt|gantt|wbs|ditaa|yaml|json)\b/

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isMermaidStart(line: string): boolean {
  const trimmed = line.trim()
  return MERMAID_START_PATTERNS.some(p => p.test(trimmed))
}

/**
 * Checks if a line is DEFINITELY diagram content (positive match).
 * Only indented lines, known keywords, and arrow operators qualify.
 */
function isDiagramContentLine(line: string): boolean {
  const trimmed = line.trim()

  // Empty line — allowed inside diagrams (but tracked separately)
  if (trimmed === '') return true

  // Indented line — primary signal: Mermaid content is almost always indented
  if (/^\s{2,}/.test(line)) return true

  // Unindented but known Mermaid keyword
  if (
    /^(end|subgraph|participant|actor|note\s|loop\s|alt\s|else\s|opt\s|par\s|critical\s|break\s|rect\s|activate\s|deactivate\s|title\s|section\s)/i.test(
      trimmed
    )
  )
    return true

  // Contains arrows or graph operators
  if (/-->|==>|-\.->|---|\|\|.*\||-.->|--x|--o|<-->/.test(trimmed)) return true

  // Contains node definitions: A["text"], B("text"), C{"text"}, D(("text")), E[["text"]]
  if (
    /\w+\s*(\["[^"]*"\]|\(".*"\)|\{".*"\}|\(\(".*"\)\)|\[\[".*"\]\])/.test(
      trimmed
    )
  )
    return true

  // Contains node definitions with single-word labels: A --> B
  if (/^\s*\w+\s*-->/.test(line)) return true

  return false
}

/**
 * Checks if a line is definitely NOT part of a Mermaid diagram.
 * These patterns positively indicate non-diagram text.
 */
function isDefinitelyNotDiagram(line: string): boolean {
  const trimmed = line.trim()

  // Markdown heading
  if (/^#{1,6}\s/.test(trimmed)) return true

  // Numbered section: "5.2 Fluxo Principal", "6. Estratégia"
  if (/^\d+(\.\d+)*\.?\s+\S/.test(trimmed)) return true

  // Table row: | col1 | col2 |
  if (/^\|.*\|.*\|/.test(trimmed)) return true

  // Table separator: |---|---|
  if (/^\|[-:]+\|/.test(trimmed)) return true

  // Code fence
  if (/^```/.test(trimmed)) return true

  // Markdown list items that look like prose
  if (/^[-*]\s+[A-Z]/.test(trimmed)) return true

  // Bullet with emoji (common in LLM output)
  if (
    /^[-*]\s+/.test(trimmed) &&
    /[^\x20-\x7E]/.test(trimmed.charAt(2)?.trim() ?? '')
  )
    return true

  // Lines that look like prose: starts with uppercase letter, no special Mermaid chars
  if (
    /^[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-záàãâéêíóôõúç]/.test(trimmed) &&
    !/-->|==>|subgraph|participant/i.test(trimmed)
  )
    return true

  // Lines starting with bold/italic markdown: **Text**, *Text*
  if (/^\*{1,2}[A-Z]/.test(trimmed)) return true

  return false
}

/**
 * Find the end of a Mermaid diagram block starting at `startIdx`.
 *
 * Strategy: A line must positively match as diagram content to be included.
 * Any line that is "definitely not diagram" or fails to match diagram
 * patterns immediately terminates the block.
 *
 * IMPORTANT: A new Mermaid start keyword (e.g. another `flowchart LR`)
 * terminates the CURRENT block so the caller can detect the next diagram
 * as a separate block.
 */
function findMermaidEnd(lines: string[], startIdx: number): number {
  let lastDiagramLine = startIdx
  let emptyLineStreak = 0

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]!
    const trimmed = line.trim()

    // If we encounter a NEW Mermaid start keyword, the current diagram
    // ends here — the next one will be detected as a separate block.
    if (isMermaidStart(trimmed)) {
      break
    }

    // Definite non-diagram content — stop immediately
    if (isDefinitelyNotDiagram(line)) {
      break
    }

    // Empty line
    if (trimmed === '') {
      emptyLineStreak++
      // Allow max 1 empty line inside a diagram
      if (emptyLineStreak >= 2) {
        break
      }
      continue
    }

    // Positive diagram content match
    if (isDiagramContentLine(line)) {
      lastDiagramLine = i
      emptyLineStreak = 0
      continue
    }

    // Unrecognized line that isn't clearly diagram content — stop
    break
  }

  return lastDiagramLine
}

/**
 * Find the end of a PlantUML block starting at @startXXX.
 */
function findPlantumlEnd(lines: string[], startIdx: number): number {
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (PLANTUML_END.test(lines[i]!.trim())) {
      return i
    }
  }
  // No @end found — include until next non-diagram line or end
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (isDefinitelyNotDiagram(lines[i]!)) {
      return i - 1
    }
  }
  return lines.length - 1
}

// ---------------------------------------------------------------------------
// Main preprocessor
// ---------------------------------------------------------------------------

/**
 * Pre-process markdown content to wrap raw diagram code in fenced blocks.
 *
 * Scans line-by-line for Mermaid / PlantUML patterns that aren't already
 * inside ``` fences. When found, wraps them in appropriate fenced blocks.
 *
 * This is idempotent — already-fenced diagrams are not modified.
 */
export function preprocessDiagramBlocks(markdown: string): string {
  if (!markdown) return markdown

  const lines = markdown.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!
    const trimmed = line.trim()

    // Skip lines already inside fenced blocks (fast-forward)
    if (/^```/.test(trimmed)) {
      result.push(line)
      i++
      // Fast-forward through the fenced block until closing ```
      while (i < lines.length && !/^```/.test(lines[i]!.trim())) {
        result.push(lines[i]!)
        i++
      }
      if (i < lines.length) {
        result.push(lines[i]!) // closing ```
        i++
      }
      continue
    }

    // Detect raw Mermaid diagram start
    if (isMermaidStart(trimmed)) {
      const endIdx = findMermaidEnd(lines, i)
      result.push('```mermaid')
      for (let j = i; j <= endIdx; j++) {
        result.push(lines[j]!)
      }
      result.push('```')
      i = endIdx + 1
      continue
    }

    // Detect raw PlantUML diagram start
    if (PLANTUML_START.test(trimmed)) {
      const endIdx = findPlantumlEnd(lines, i)
      result.push('```plantuml')
      for (let j = i; j <= endIdx; j++) {
        result.push(lines[j]!)
      }
      result.push('```')
      i = endIdx + 1
      continue
    }

    // Normal line — pass through
    result.push(line)
    i++
  }

  return result.join('\n')
}
