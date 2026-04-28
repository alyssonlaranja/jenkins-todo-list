/**
 * DiagramAwareContent
 *
 * Renders markdown content with diagrams extracted and rendered as images.
 *
 * Supports TWO diagram detection methods (in order of priority):
 *
 *   1. **Tag-based** (preferred, deterministic):
 *      <!-- DIAGRAM type="mermaid" title="Component Flow" -->
 *      graph TD
 *          A --> B
 *      <!-- /DIAGRAM -->
 *
 *   2. **Fenced code block** (fallback, pattern-matched):
 *      ```mermaid
 *      graph TD
 *          A --> B
 *      ```
 *
 * The tag-based approach mirrors the ARTIFACT_METADATA pattern and provides
 * reliable detection during streaming and after completion.
 *
 * The user NEVER sees raw diagram code — only rendered images or loading spinners.
 */

'use client'

import { useMemo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import {
  hasDiagramTags,
  hideStreamingDiagramTags,
  splitByDiagramTags,
  type ContentSegment,
} from '@/lib/diagram/diagram-tags'
import { SUPPORTED_DIAGRAM_LANGUAGES } from '@/lib/diagram/kroki-encoder'
import { preprocessDiagramBlocks } from '@/lib/diagram/preprocess-diagrams'
import { tableComponents } from '@/shared/components/markdown/markdown-table-components'

import { DiagramRenderer } from './DiagramRenderer'

// ---------------------------------------------------------------------------
// Fenced code block splitter (legacy fallback)
// ---------------------------------------------------------------------------

/**
 * Split markdown content by fenced code blocks for diagram languages.
/**
 * Mermaid start keyword regex — used to detect when a fenced block contains
 * multiple diagram declarations that need to be split.
 */
const MERMAID_MULTI_DIAGRAM_RE =
  /^\s*(flowchart|graph)\s+(TD|TB|BT|RL|LR)\b|^\s*(sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph|C4Context|C4Container|C4Component|C4Deployment|requirementDiagram|block-beta|sankey-beta|xychart-beta|quadrantChart|zenuml)\b/

/**
 * Split a single Mermaid code block that may contain multiple diagram
 * declarations (e.g. two flowcharts) into separate diagram segments.
 */
function splitMultiDiagramBlock(lang: string, code: string): ContentSegment[] {
  if (lang !== 'mermaid') {
    return [{ type: 'diagram', language: lang, code }]
  }

  const lines = code.split('\n')
  const diagrams: ContentSegment[] = []
  let currentStart = -1

  for (let i = 0; i < lines.length; i++) {
    if (MERMAID_MULTI_DIAGRAM_RE.test(lines[i]!)) {
      if (currentStart !== -1) {
        // Flush previous diagram
        diagrams.push({
          type: 'diagram',
          language: lang,
          code: lines.slice(currentStart, i).join('\n').trimEnd(),
        })
      }
      currentStart = i
    }
  }

  // Flush last diagram (or the only one)
  if (currentStart !== -1) {
    diagrams.push({
      type: 'diagram',
      language: lang,
      code: lines.slice(currentStart).join('\n').trimEnd(),
    })
  }

  // Fallback: if no start keyword found, return original block
  if (diagrams.length === 0) {
    return [{ type: 'diagram', language: lang, code }]
  }

  return diagrams
}

/**
 * Split markdown content by fenced code blocks for diagram languages.
 * This is the legacy approach — used as fallback when no DIAGRAM tags are present.
 */
function splitFencedDiagramBlocks(markdown: string): ContentSegment[] {
  // First, wrap raw diagram code in fences
  const processed = preprocessDiagramBlocks(markdown)

  const lines = processed.split('\n')
  const segments: ContentSegment[] = []
  const textBuffer: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!
    const fenceMatch = line.trim().match(/^```(\S+)\s*$/)

    if (fenceMatch) {
      const lang = fenceMatch[1]!.toLowerCase()

      if (SUPPORTED_DIAGRAM_LANGUAGES.has(lang)) {
        // Flush text buffer before diagram
        if (textBuffer.length > 0) {
          segments.push({ type: 'text', content: textBuffer.join('\n') })
          textBuffer.length = 0
        }

        // Collect diagram code until closing fence
        const diagramLines: string[] = []
        i++ // skip opening ```lang
        while (i < lines.length && !/^```\s*$/.test(lines[i]!.trim())) {
          diagramLines.push(lines[i]!)
          i++
        }
        i++ // skip closing ```

        // Split into separate diagrams if multiple declarations exist
        const subDiagrams = splitMultiDiagramBlock(
          lang,
          diagramLines.join('\n')
        )
        segments.push(...subDiagrams)
      } else {
        // Non-diagram fenced block — keep as text
        textBuffer.push(line)
        i++
        while (i < lines.length && !/^```\s*$/.test(lines[i]!.trim())) {
          textBuffer.push(lines[i]!)
          i++
        }
        if (i < lines.length) {
          textBuffer.push(lines[i]!) // closing ```
          i++
        }
      }
    } else {
      textBuffer.push(line)
      i++
    }
  }

  // Flush remaining text
  if (textBuffer.length > 0) {
    segments.push({ type: 'text', content: textBuffer.join('\n') })
  }

  return segments
}

// ---------------------------------------------------------------------------
// Unified splitter: tags first, then fenced code blocks as fallback
// ---------------------------------------------------------------------------

function splitContentIntoSegments(markdown: string): ContentSegment[] {
  // Priority 1: If content has DIAGRAM tags, use tag-based splitting
  if (hasDiagramTags(markdown)) {
    const tagSegments = splitByDiagramTags(markdown)

    // For any text segments within tag results, also check for fenced diagrams
    const finalSegments: ContentSegment[] = []
    for (const seg of tagSegments) {
      if (seg.type === 'text') {
        // Apply fenced block detection on remaining text segments
        const subSegments = splitFencedDiagramBlocks(seg.content)
        finalSegments.push(...subSegments)
      } else {
        finalSegments.push(seg)
      }
    }
    return finalSegments
  }

  // Priority 2: Fallback to fenced code block detection
  return splitFencedDiagramBlocks(markdown)
}

// ---------------------------------------------------------------------------
// Streaming helper: hides diagram code and shows placeholders
// ---------------------------------------------------------------------------

/**
 * Replaces diagram code in streaming content with a placeholder.
 * Used during streaming so the user never sees raw diagram code.
 *
 * Supports both:
 *   1. DIAGRAM tags (<!-- DIAGRAM ... --> ... <!-- /DIAGRAM -->)
 *   2. Fenced code blocks (```mermaid ... ```)
 *   3. Raw diagram code detected by pattern matching
 */
export function hideStreamingDiagramCode(content: string): string {
  if (!content) return content

  // Step 1: Handle DIAGRAM tags first (most reliable)
  let result = hideStreamingDiagramTags(content)

  // Step 2: Apply preprocessor to detect complete raw diagrams (fallback)
  result = preprocessDiagramBlocks(result)

  // Step 3: Replace diagram fenced blocks with placeholder
  const placeholder = '\n\n> ⏳ *Gerando diagrama...*\n\n'
  const supportedLangs = Array.from(SUPPORTED_DIAGRAM_LANGUAGES).join('|')
  const fenceRegex = new RegExp(
    `\`\`\`(?:${supportedLangs})\\s*\\n[\\s\\S]*?\`\`\``,
    'gi'
  )
  result = result.replace(fenceRegex, placeholder)

  // Step 4: Detect in-progress fenced diagram code (start keyword but no fence close yet)
  const mermaidStartPatterns = [
    /^(flowchart|graph)\s+(TD|TB|BT|RL|LR)\b/m,
    /^sequenceDiagram\b/m,
    /^classDiagram\b/m,
    /^stateDiagram/m,
    /^erDiagram\b/m,
    /^gantt\b/m,
    /^pie\b/m,
    /^journey\b/m,
    /^mindmap\b/m,
    /^C4Context\b/m,
    /^C4Container\b/m,
    /^C4Component\b/m,
  ]

  for (const pattern of mermaidStartPatterns) {
    if (pattern.test(result)) {
      result = result.replace(
        new RegExp(`${pattern.source}[\\s\\S]*$`, 'm'),
        placeholder
      )
      break
    }
  }

  // Same for PlantUML: @startuml without matching @enduml
  if (/@start(uml|mindmap|salt|gantt|wbs)\b/.test(result)) {
    result = result.replace(
      /@start(uml|mindmap|salt|gantt|wbs)\b[\s\S]*$/m,
      placeholder
    )
  }

  return result
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DiagramAwareContentProps {
  /** The raw markdown content (may contain raw diagram code or fenced diagrams) */
  content: string
  /** Optional ReactMarkdown component overrides for text segments */
  markdownComponents?: Components
  /** Optional className for the wrapper div */
  className?: string
}

/**
 * Renders markdown content with diagrams as images.
 *
 * Extracts diagram code blocks (Mermaid, PlantUML, etc.) from the content
 * and renders them as interactive SVG images via Kroki. Text segments are
 * rendered with ReactMarkdown. The user never sees raw diagram code.
 */
export function DiagramAwareContent({
  content,
  markdownComponents,
  className,
}: DiagramAwareContentProps) {
  const segments = useMemo(() => splitContentIntoSegments(content), [content])

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'diagram') {
          return (
            <div key={`diagram-${index}-${segment.language}`}>
              {/* Render optional title from DIAGRAM tag */}
              {'title' in segment && segment.title && (
                <h4 className="mb-2 text-sm font-semibold text-foreground">
                  {segment.title}
                </h4>
              )}
              <DiagramRenderer type={segment.language} code={segment.code} />
            </div>
          )
        }

        return (
          <ReactMarkdown
            key={`text-${index}`}
            remarkPlugins={[remarkGfm]}
            components={{ ...tableComponents, ...markdownComponents }}
          >
            {segment.content}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}
