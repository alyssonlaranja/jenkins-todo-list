'use client'

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { saveAs } from 'file-saver'

import { slugify } from '@/features/artifacts/services'
import { extractDiagramTags, hasDiagramTags } from '@/lib/diagram/diagram-tags'
import { SUPPORTED_DIAGRAM_LANGUAGES } from '@/lib/diagram/kroki-encoder'

export type ExportFormat = 'pdf' | 'docx' | 'md' | 'json' | 'html' | 'csv'

// ---------------------------------------------------------------------------
// Markdown table parser
// ---------------------------------------------------------------------------

interface ParsedTable {
  headers: string[]
  alignments: ('left' | 'center' | 'right')[]
  rows: string[][]
}

/**
 * Parse a markdown table starting at `startIdx` in the lines array.
 * Returns the parsed table and the index of the first line AFTER the table.
 *
 * A valid markdown table has:
 *   1. A header row:    | Col1 | Col2 | Col3 |
 *   2. A separator row: |------|:----:|-----:|
 *   3. One or more data rows
 */
function parseMarkdownTable(
  lines: string[],
  startIdx: number
): { table: ParsedTable; endIdx: number } | null {
  const headerLine = lines[startIdx]!
  const separatorLine = lines[startIdx + 1]

  // Validate separator line exists and looks like |---|---|
  if (!separatorLine || !/^\s*\|[\s:|-]+\|\s*$/.test(separatorLine)) {
    return null
  }

  const parseCells = (line: string): string[] =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim())

  const headers = parseCells(headerLine)

  // Parse alignments from separator
  const sepCells = parseCells(separatorLine)
  const alignments: ('left' | 'center' | 'right')[] = sepCells.map(cell => {
    const trimmed = cell.trim().replace(/\s/g, '')
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center'
    if (trimmed.endsWith(':')) return 'right'
    return 'left'
  })

  // Collect data rows
  const rows: string[][] = []
  let idx = startIdx + 2
  while (idx < lines.length) {
    const line = lines[idx]!
    if (!line.trim().startsWith('|') || !line.trim().endsWith('|')) break
    rows.push(parseCells(line))
    idx++
  }

  if (rows.length === 0) return null

  return { table: { headers, alignments, rows }, endIdx: idx }
}

/** Check if a line looks like the start of a markdown table */
function isTableHeaderLine(line: string, nextLine?: string): boolean {
  if (!line.trim().startsWith('|') || !line.trim().endsWith('|')) return false
  if (!nextLine) return false
  return /^\s*\|[\s:|-]+\|\s*$/.test(nextLine)
}

interface ArtifactData {
  name: string
  content: string
  version?: number
}

// ---------------------------------------------------------------------------
// Diagram extraction & image fetching
// ---------------------------------------------------------------------------

interface DiagramBlock {
  /** Full matched text in the markdown (including fences / DIAGRAM tags) */
  fullMatch: string
  /** Diagram language / type */
  language: string
  /** Source code of the diagram */
  code: string
}

/** Regex for DIAGRAM tag blocks */
const DIAGRAM_TAG_REGEX =
  /<!-- DIAGRAM\s+([\s\S]*?)-->\n?([\s\S]*?)\n?<!-- \/DIAGRAM -->/gi

/** Attribute parser inside DIAGRAM tags */
const ATTR_REGEX = /(\w+)="([^"]*?)"/g

/**
 * Extract all diagram blocks from markdown content, fetch their PNG images,
 * and return a Map keyed by the full matched text.
 */
async function fetchAllDiagramImages(
  content: string,
  imageFormat: 'png' | 'svg' = 'png'
): Promise<Map<string, DiagramImageEntry>> {
  const results = new Map<string, DiagramImageEntry>()
  const blocks: { fullMatch: string; language: string; code: string }[] = []

  // 1. Find <!-- DIAGRAM --> tag blocks
  const tagRegex = new RegExp(DIAGRAM_TAG_REGEX.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = tagRegex.exec(content)) !== null) {
    const attrsStr = match[1] || ''
    const code = match[2] || ''
    const attrRegex = new RegExp(ATTR_REGEX.source, 'g')
    let attrMatch: RegExpExecArray | null
    let lang = 'mermaid'
    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      if (attrMatch[1] === 'type') lang = attrMatch[2]!
    }
    blocks.push({ fullMatch: match[0], language: lang, code: code.trim() })
  }

  // 2. Find fenced diagram code blocks (```mermaid, ```plantuml, etc.)
  const fenceRegex = /```(\S+)\s*\n([\s\S]*?)```/g
  while ((match = fenceRegex.exec(content)) !== null) {
    const lang = match[1]!.toLowerCase()
    if (SUPPORTED_DIAGRAM_LANGUAGES.has(lang)) {
      blocks.push({
        fullMatch: match[0],
        language: lang,
        code: match[2]!.trim(),
      })
    }
  }

  // 3. Fetch all images in parallel
  const fetches = blocks.map(async block => {
    const imageBytes = await fetchDiagramImage(block.language, block.code)
    if (imageBytes) {
      // Convert Uint8Array to base64
      let binary = ''
      for (let j = 0; j < imageBytes.length; j++) {
        binary += String.fromCharCode(imageBytes[j]!)
      }
      const base64 = btoa(binary)
      results.set(block.fullMatch, { base64, language: block.language })
    }
  })
  await Promise.all(fetches)

  return results
}

/**
 * Converte markdown para parágrafos do docx (incluindo tabelas)
 */
function markdownToDocxParagraphs(markdown: string): (Paragraph | Table)[] {
  const lines = markdown.split('\n')
  const elements: (Paragraph | Table)[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!

    // -----------------------------------------------------------------
    // Detect markdown table: a line starting with | followed by a
    // separator line (|---|...) on the next line.
    // -----------------------------------------------------------------
    if (
      isTableRow(line) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1]!)
    ) {
      const tableLines: string[] = []
      // Collect all consecutive table lines (header + separator + data rows)
      while (
        i < lines.length &&
        (isTableRow(lines[i]!) || isTableSeparator(lines[i]!))
      ) {
        tableLines.push(lines[i]!)
        i++
      }
      const table = parseMarkdownTableToDocx(tableLines)
      if (table) {
        elements.push(table)
      }
      continue
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        new Paragraph({
          text: line.replace('### ', ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
        })
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        new Paragraph({
          text: line.replace('## ', ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 320, after: 160 },
        })
      )
    } else if (line.startsWith('# ')) {
      elements.push(
        new Paragraph({
          text: line.replace('# ', ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet points
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '• ' + line.replace(/^[-*] /, ''),
            }),
          ],
          spacing: { before: 60, after: 60 },
          indent: { left: 720 },
        })
      )
    } else if (line.match(/^\d+\. /)) {
      // Numbered lists
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
            }),
          ],
          spacing: { before: 60, after: 60 },
          indent: { left: 720 },
        })
      )
    } else if (line.startsWith('**') && line.endsWith('**')) {
      // Bold text
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace(/\*\*/g, ''),
              bold: true,
            }),
          ],
          spacing: { before: 120, after: 120 },
        })
      )
    } else if (line.trim() === '') {
      // Empty line
      elements.push(new Paragraph({ text: '' }))
    } else {
      // Regular paragraph - handle inline formatting
      const children: TextRun[] = []

      // Simple handling of **bold** and *italic*
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g)
      for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
          children.push(
            new TextRun({
              text: part.slice(2, -2),
              bold: true,
            })
          )
        } else if (
          part.startsWith('*') &&
          part.endsWith('*') &&
          !part.startsWith('**')
        ) {
          children.push(
            new TextRun({
              text: part.slice(1, -1),
              italics: true,
            })
          )
        } else if (part) {
          children.push(new TextRun({ text: part }))
        }
      }

      if (children.length > 0) {
        elements.push(
          new Paragraph({
            children,
            spacing: { before: 120, after: 120 },
          })
        )
      }
    }

    i++
  }

  return elements
}

/**
 * Checks if a line is a markdown table row (starts and contains pipes)
 */
function isTableRow(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2
}

/**
 * Checks if a line is a markdown table separator (|---|---|)
 */
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim()
  return /^\|[\s:]*-{2,}[\s:]*(\|[\s:]*-{2,}[\s:]*)*\|$/.test(trimmed)
}

/**
 * Parse cells from a markdown table row
 */
function parseTableCells(line: string): string[] {
  const trimmed = line.trim()
  // Remove leading and trailing pipe
  const inner = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed
  const cleaned = inner.endsWith('|') ? inner.slice(0, -1) : inner
  return cleaned.split('|').map(cell => cell.trim())
}

/**
 * Create inline TextRuns with bold/italic formatting for a cell value
 */
function createCellTextRuns(text: string, isBold = false): TextRun[] {
  const runs: TextRun[] = []
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g)
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 20 }))
    } else if (
      part.startsWith('*') &&
      part.endsWith('*') &&
      !part.startsWith('**')
    ) {
      runs.push(
        new TextRun({ text: part.slice(1, -1), italics: true, size: 20 })
      )
    } else if (part) {
      runs.push(new TextRun({ text: part, bold: isBold, size: 20 }))
    }
  }
  if (runs.length === 0) {
    runs.push(new TextRun({ text: text || '', bold: isBold, size: 20 }))
  }
  return runs
}

/**
 * Parse a markdown table (array of lines) into a docx Table
 */
function parseMarkdownTableToDocx(tableLines: string[]): Table | null {
  // Filter out separator lines
  const dataLines = tableLines.filter(line => !isTableSeparator(line))
  if (dataLines.length === 0) return null

  const headerCells = parseTableCells(dataLines[0]!)
  const columnCount = headerCells.length
  if (columnCount === 0) return null

  // Border style for all cells
  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
  }

  // Create header row
  const headerRow = new TableRow({
    children: headerCells.map(
      cell =>
        new TableCell({
          borders: cellBorders,
          shading: { fill: 'E8E8E8' },
          children: [
            new Paragraph({
              children: createCellTextRuns(cell, true),
              spacing: { before: 40, after: 40 },
            }),
          ],
          width: { size: Math.floor(9000 / columnCount), type: WidthType.DXA },
        })
    ),
  })

  // Create data rows
  const dataRows = dataLines.slice(1).map(line => {
    const cells = parseTableCells(line)
    // Pad or trim cells to match column count
    const normalizedCells = Array.from(
      { length: columnCount },
      (_, idx) => cells[idx] ?? ''
    )
    return new TableRow({
      children: normalizedCells.map(
        cell =>
          new TableCell({
            borders: cellBorders,
            children: [
              new Paragraph({
                children: createCellTextRuns(cell),
                spacing: { before: 40, after: 40 },
              }),
            ],
            width: {
              size: Math.floor(9000 / columnCount),
              type: WidthType.DXA,
            },
          })
      ),
    })
  })

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 9000, type: WidthType.DXA },
  })
}

// ---------------------------------------------------------------------------
// Diagram extraction & rendering for DOCX export
// ---------------------------------------------------------------------------

/** Represents a text or diagram segment in the content */
interface ExportSegment {
  type: 'text' | 'diagram'
  content: string
  diagramType?: string
  title?: string
}

/**
 * Split content into text and diagram segments for export.
 * Detects both <!-- DIAGRAM --> tags and fenced code blocks (```mermaid etc.)
 */
function splitContentForExport(markdown: string): ExportSegment[] {
  const segments: ExportSegment[] = []

  // Step 1: Handle <!-- DIAGRAM --> tags
  if (hasDiagramTags(markdown)) {
    const diagramBlocks = extractDiagramTags(markdown)
    let remaining = markdown

    for (const block of diagramBlocks) {
      const idx = remaining.indexOf(block.fullMatch)
      if (idx > 0) {
        const textBefore = remaining.slice(0, idx).trim()
        if (textBefore) {
          // Recursively split text before for fenced code blocks
          segments.push(...splitFencedDiagramsForExport(textBefore))
        }
      }
      segments.push({
        type: 'diagram',
        content: block.code,
        diagramType: block.type,
        title: block.title,
      })
      remaining = remaining.slice(idx + block.fullMatch.length)
    }

    if (remaining.trim()) {
      segments.push(...splitFencedDiagramsForExport(remaining.trim()))
    }

    return segments
  }

  // Step 2: If no DIAGRAM tags, check for fenced code blocks
  return splitFencedDiagramsForExport(markdown)
}

/**
 * Split content by fenced diagram code blocks (```mermaid, ```plantuml, etc.)
 */
function splitFencedDiagramsForExport(markdown: string): ExportSegment[] {
  const segments: ExportSegment[] = []
  const lines = markdown.split('\n')
  const textBuffer: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!
    const fenceMatch = line.trim().match(/^```(\S+)\s*$/)

    if (fenceMatch) {
      const lang = fenceMatch[1]!.toLowerCase()

      if (SUPPORTED_DIAGRAM_LANGUAGES.has(lang)) {
        // Flush text buffer
        if (textBuffer.length > 0) {
          const text = textBuffer.join('\n').trim()
          if (text) segments.push({ type: 'text', content: text })
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

        segments.push({
          type: 'diagram',
          content: diagramLines.join('\n'),
          diagramType: lang,
        })
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
    const text = textBuffer.join('\n').trim()
    if (text) segments.push({ type: 'text', content: text })
  }

  return segments
}

/**
 * Fetch a diagram image as PNG bytes from the /api/diagram endpoint.
 * Returns the image as a Uint8Array, or null on failure.
 */
async function fetchDiagramImage(
  diagramType: string,
  code: string
): Promise<Uint8Array | null> {
  try {
    const res = await fetch('/api/diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diagramType,
        code,
        outputFormat: 'png',
      }),
    })

    if (!res.ok) return null

    const data = (await res.json()) as { dataUrl?: string; error?: string }
    if (!data.dataUrl) return null

    // dataUrl is "data:image/png;base64,XXXX..."
    const base64 = data.dataUrl.split(',')[1]
    if (!base64) return null

    // Convert base64 to Uint8Array
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let j = 0; j < binaryString.length; j++) {
      bytes[j] = binaryString.charCodeAt(j)
    }
    return bytes
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[exportToDocx] Failed to fetch diagram image:', err)
    return null
  }
}

/**
 * Build docx elements for the full artifact content, including rendered
 * diagram images. Async because diagram images are fetched from the server.
 */
async function markdownToDocxElements(
  markdown: string
): Promise<(Paragraph | Table)[]> {
  const segments = splitContentForExport(markdown)
  const elements: (Paragraph | Table)[] = []

  for (const segment of segments) {
    if (segment.type === 'text') {
      elements.push(...markdownToDocxParagraphs(segment.content))
    } else {
      // Diagram segment — try to render as image
      if (segment.title) {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: segment.title,
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 240, after: 120 },
          })
        )
      }

      const imageBytes = await fetchDiagramImage(
        segment.diagramType || 'mermaid',
        segment.content
      )

      if (imageBytes) {
        // Embed the PNG image in the document
        // Use a reasonable width (600px) and proportional height
        // We'll estimate aspect ratio from the image header if possible,
        // otherwise use a default 4:3 ratio
        const imgWidth = 580 // points (~15cm, fits A4 with margins)
        const imgHeight = 400 // default height, will be overridden if we can read PNG

        // Try to read PNG dimensions from header
        const dimensions = readPngDimensions(imageBytes)
        const finalWidth = imgWidth
        const finalHeight = dimensions
          ? Math.round((imgWidth / dimensions.width) * dimensions.height)
          : imgHeight

        elements.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBytes,
                transformation: {
                  width: finalWidth,
                  height: finalHeight,
                },
                type: 'png',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
          })
        )
      } else {
        // Fallback: show diagram code as a code block
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Diagrama ${segment.diagramType || ''}]`,
                italics: true,
                color: '888888',
                size: 20,
              }),
            ],
            spacing: { before: 120, after: 60 },
          })
        )
        // Include the raw code in a monospace style
        for (const codeLine of segment.content.split('\n')) {
          elements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: codeLine,
                  font: 'Courier New',
                  size: 18,
                  color: '555555',
                }),
              ],
              spacing: { before: 20, after: 20 },
              indent: { left: 360 },
            })
          )
        }
      }
    }
  }

  return elements
}

/**
 * Read width and height from a PNG file header (IHDR chunk).
 * Returns null if the data is not a valid PNG.
 */
function readPngDimensions(
  data: Uint8Array
): { width: number; height: number } | null {
  // Check PNG signature: 137 80 78 71 13 10 26 10
  if (
    data.length < 24 ||
    data[0] !== 137 ||
    data[1] !== 80 ||
    data[2] !== 78 ||
    data[3] !== 71
  ) {
    return null
  }
  // IHDR chunk starts at byte 8, width at 16, height at 20 (big-endian uint32)
  const width =
    (data[16]! << 24) | (data[17]! << 16) | (data[18]! << 8) | data[19]!
  const height =
    (data[20]! << 24) | (data[21]! << 16) | (data[22]! << 8) | data[23]!
  if (width <= 0 || height <= 0 || width > 10000 || height > 10000) return null
  return { width, height }
}

// ---------------------------------------------------------------------------
// Content preprocessing: replace diagram blocks with indexed placeholders
// ---------------------------------------------------------------------------

interface DiagramImageEntry {
  base64: string
  language: string
}

/**
 * Replace diagram code blocks (DIAGRAM tags and fenced code blocks) in the
 * markdown content with indexed placeholders that downstream export functions
 * can substitute with rendered images.
 *
 * Returns { processedContent, diagramImages }.
 * Each placeholder looks like: <!-- EXPORT_DIAGRAM_IMAGE:0 -->
 */
async function preprocessContentWithDiagrams(
  content: string,
  imageFormat: 'png' | 'svg' = 'png'
): Promise<{ processedContent: string; diagramImages: DiagramImageEntry[] }> {
  const imagesMap = await fetchAllDiagramImages(content, imageFormat)

  if (imagesMap.size === 0) {
    return { processedContent: content, diagramImages: [] }
  }

  const diagramImages: DiagramImageEntry[] = []
  let processedContent = content

  for (const [fullMatch, imgData] of imagesMap) {
    const idx = diagramImages.length
    diagramImages.push(imgData)
    processedContent = processedContent.replace(
      fullMatch,
      `<!-- EXPORT_DIAGRAM_IMAGE:${idx} -->`
    )
  }

  return { processedContent, diagramImages }
}

/**
 * Converte markdown para HTML estilizado.
 * When diagramImages is provided, replaces diagram placeholders with embedded
 * base64 images.
 */
function markdownToHtml(
  markdown: string,
  title: string,
  diagramImages?: DiagramImageEntry[]
): string {
  const lines = markdown.split('\n')
  const htmlParts: string[] = []
  let i = 0
  let inList = false
  let listType: 'ul' | 'ol' = 'ul'

  while (i < lines.length) {
    const line = lines[i]!

    // ── Diagram image placeholders (<!-- EXPORT_DIAGRAM_IMAGE:N -->) ───
    const diagramPlaceholder = line
      .trim()
      .match(/^<!-- EXPORT_DIAGRAM_IMAGE:(\d+) -->$/)
    if (diagramPlaceholder && diagramImages) {
      if (inList) {
        htmlParts.push(`</${listType}>`)
        inList = false
      }
      const idx = parseInt(diagramPlaceholder[1]!, 10)
      const img = diagramImages[idx]
      if (img) {
        htmlParts.push(
          `<div style="text-align:center;margin:1rem 0;"><img src="data:image/png;base64,${img.base64}" alt="Diagrama ${img.language}" style="max-width:100%;height:auto;border-radius:8px;" /></div>`
        )
      }
      i++
      continue
    }

    // ── Fenced code blocks ──────────────────────────────────────────────
    const fenceMatch = line.trim().match(/^```(\S*)/)
    if (fenceMatch) {
      if (inList) {
        htmlParts.push(`</${listType}>`)
        inList = false
      }
      const lang = fenceMatch[1] || ''
      const codeLines: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i]!.trim())) {
        codeLines.push(escapeHtml(lines[i]!))
        i++
      }
      i++ // skip closing ```
      htmlParts.push(
        `<pre><code${lang ? ` class="language-${lang}"` : ''}>${codeLines.join('\n')}</code></pre>`
      )
      continue
    }

    // ── Markdown table ──────────────────────────────────────────────────
    if (isTableRow(line)) {
      if (inList) {
        htmlParts.push(`</${listType}>`)
        inList = false
      }

      const tableLines: string[] = []
      while (
        i < lines.length &&
        (isTableRow(lines[i]!) || isTableSeparator(lines[i]!))
      ) {
        tableLines.push(lines[i]!)
        i++
      }
      htmlParts.push(convertMarkdownTableToHtml(tableLines))
      continue
    }

    // ── Headers ─────────────────────────────────────────────────────────
    const h3 = line.match(/^### (.+)$/)
    if (h3) {
      if (inList) {
        htmlParts.push(`</${listType}>`)
        inList = false
      }
      htmlParts.push(`<h3>${inlineFormat(h3[1]!)}</h3>`)
      i++
      continue
    }

    const h2 = line.match(/^## (.+)$/)
    if (h2) {
      if (inList) {
        htmlParts.push(`</${listType}>`)
        inList = false
      }
      htmlParts.push(`<h2>${inlineFormat(h2[1]!)}</h2>`)
      i++
      continue
    }

    const h1 = line.match(/^# (.+)$/)
    if (h1) {
      if (inList) {
        htmlParts.push(`</${listType}>`)
        inList = false
      }
      htmlParts.push(`<h1>${inlineFormat(h1[1]!)}</h1>`)
      i++
      continue
    }

    // ── Horizontal rule ────────────────────────────────────────────────
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      if (inList) {
        htmlParts.push(`</${listType}>`)
        inList = false
      }
      htmlParts.push('<hr>')
      i++
      continue
    }

    // ── Unordered list ──────────────────────────────────────────────────
    const ulMatch = line.match(/^(\s*)[-*] (.+)$/)
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) htmlParts.push(`</${listType}>`)
        htmlParts.push('<ul>')
        inList = true
        listType = 'ul'
      }
      htmlParts.push(`<li>${inlineFormat(ulMatch[2]!)}</li>`)
      i++
      continue
    }

    // ── Ordered list ────────────────────────────────────────────────────
    const olMatch = line.match(/^\s*\d+\. (.+)$/)
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) htmlParts.push(`</${listType}>`)
        htmlParts.push('<ol>')
        inList = true
        listType = 'ol'
      }
      htmlParts.push(`<li>${inlineFormat(olMatch[1]!)}</li>`)
      i++
      continue
    }

    // ── Blank line ──────────────────────────────────────────────────────
    if (line.trim() === '') {
      if (inList) {
        htmlParts.push(`</${listType}>`)
        inList = false
      }
      i++
      continue
    }

    // ── Paragraph ───────────────────────────────────────────────────────
    if (inList) {
      htmlParts.push(`</${listType}>`)
      inList = false
    }
    htmlParts.push(`<p>${inlineFormat(line)}</p>`)
    i++
  }

  if (inList) htmlParts.push(`</${listType}>`)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --background: #ffffff;
      --foreground: #0a0a0a;
      --card: #ffffff;
      --border: #e5e7eb;
      --secondary: #f5f5f5;
      --primary: #6d28d9;
      --muted: #737373;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --background: #0a0a0a;
        --foreground: #fafafa;
        --card: #171717;
        --border: #262626;
        --secondary: #262626;
        --primary: #a78bfa;
        --muted: #a3a3a3;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      color: var(--foreground);
      background: var(--background);
    }
    h1 { color: var(--foreground); border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; }
    h2 { color: var(--foreground); margin-top: 2rem; }
    h3 { color: var(--muted); }
    ul, ol { padding-left: 1.5rem; }
    li { margin: 0.5rem 0; }
    p { margin: 1rem 0; }
    strong { color: var(--foreground); }
    code {
      background: var(--secondary);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-size: 0.9em;
      font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    }
    pre {
      background: var(--secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      overflow-x: auto;
      margin: 1rem 0;
    }
    pre code {
      background: none;
      padding: 0;
      font-size: 0.85em;
    }
    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 1.5rem 0;
    }

    /* ── Table styles (matches SDA interface) ────────────────────────── */
    .table-wrapper {
      margin: 1rem 0;
      width: 100%;
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    table {
      min-width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    thead {
      background: var(--secondary);
    }
    thead th {
      white-space: nowrap;
      padding: 0.625rem 1rem;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--foreground);
      border-bottom: 1px solid var(--border);
    }
    tbody {
      /* Rows separated by border */
    }
    tbody tr {
      transition: background-color 0.15s;
      border-bottom: 1px solid var(--border);
    }
    tbody tr:last-child {
      border-bottom: none;
    }
    tbody tr:hover {
      background: color-mix(in srgb, var(--secondary) 50%, transparent);
    }
    tbody td {
      padding: 0.625rem 1rem;
      color: color-mix(in srgb, var(--foreground) 80%, transparent);
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${htmlParts.join('\n  ')}
</body>
</html>`
}

/** Escape HTML entities */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Apply inline markdown formatting (bold, italic, inline code, links) */
function inlineFormat(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}

/**
 * Convert an array of markdown table lines into semantic HTML table tags.
 */
function convertMarkdownTableToHtml(tableLines: string[]): string {
  if (tableLines.length < 2) return ''

  // First line = header, second = separator, rest = body
  const headerLine = tableLines[0]!
  const headers = parseTableCells(headerLine)

  // Find the separator line index
  let sepIdx = 1
  for (let j = 1; j < tableLines.length; j++) {
    if (isTableSeparator(tableLines[j]!)) {
      sepIdx = j
      break
    }
  }

  const bodyLines = tableLines.slice(sepIdx + 1).filter(l => isTableRow(l))

  const thCells = headers
    .map(h => `        <th>${inlineFormat(h)}</th>`)
    .join('\n')

  const bodyRows = bodyLines
    .map(line => {
      const cells = parseTableCells(line)
      // Pad or trim to match header count
      const normalized = headers.map((_, idx) => cells[idx] ?? '')
      const tds = normalized
        .map(c => `        <td>${inlineFormat(c)}</td>`)
        .join('\n')
      return `      <tr>\n${tds}\n      </tr>`
    })
    .join('\n')

  return `<div class="table-wrapper">
    <table>
      <thead>
      <tr>
${thCells}
      </tr>
      </thead>
      <tbody>
${bodyRows}
      </tbody>
    </table>
  </div>`
}

/**
 * Exporta artefato para DOCX (com imagens de diagramas embutidas)
 */
export async function exportToDocx(artifact: ArtifactData): Promise<void> {
  // Build content elements asynchronously (fetches diagram images from server)
  const contentElements = await markdownToDocxElements(artifact.content)

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: artifact.name,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Versão: ${artifact.version || 1}`,
                size: 20,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          ...contentElements,
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${slugify(artifact.name)}_v${artifact.version || 1}.docx`)
}

/**
 * Remove emojis e caracteres especiais que o jsPDF não suporta
 */
function removeEmojis(text: string): string {
  // Remove emojis usando regex
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis gerais
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Símbolos diversos
    .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '') // Mahjong Tiles
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '') // Playing Cards
    .replace(/[\u{1F100}-\u{1F64F}]/gu, '') // Símbolos variados
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transporte e mapas
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Símbolos suplementares
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Variação de seletores
    .replace(/[\u{200D}]/gu, '') // Zero-width joiner
    .replace(/[\u{E0000}-\u{E007F}]/gu, '') // Tags
    .replace(/[📊📈📉🎯💡🚀✨🔧📝📱💻🌟⭐🎨🏆📌]/gu, '') // Emojis comuns específicos
    .trim()
}

/**
 * Normaliza caracteres acentuados para ASCII (compatível com jsPDF)
 */
function normalizeToAscii(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos/acentos
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x00-\x7F]/g, char => {
        // Mapeamento manual para caracteres especiais não cobertos por NFD
        const map: Record<string, string> = {
          ç: 'c',
          Ç: 'C',
          ñ: 'n',
          Ñ: 'N',
          '–': '-',
          '—': '-',
          '→': '->',
          '←': '<-',
          '°': 'o',
          '×': 'x',
          '÷': '/',
          '€': 'EUR',
          '£': 'GBP',
          '¥': 'JPY',
          '•': '*',
        }
        return map[char] || ''
      })
  )
}

/**
 * Limpa formatação markdown e caracteres problemáticos
 */
function cleanMarkdown(text: string): string {
  return (
    text
      // Remove negrito duplo asterisco
      .replace(/\*\*(.+?)\*\*/g, '$1')
      // Remove itálico asterisco simples (não vizinho de **)
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
      // Remove ticks de código
      .replace(/`(.+?)`/g, '$1')
      // Remove links markdown [text](url)
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      // Normaliza aspas
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Remove caracteres de controle    // eslint-disable-next-line no-control-regex    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .trim()
  )
}

/**
 * Pipeline completo de limpeza de texto para PDF
 */
function cleanTextForPdf(text: string): string {
  return normalizeToAscii(cleanMarkdown(removeEmojis(text)))
}

/**
 * Exporta artefato para PDF com texto real (selecionável) e imagens de diagramas
 */
export async function exportToPdf(artifact: ArtifactData): Promise<void> {
  // Importar jsPDF e autoTable dinamicamente
  const { jsPDF } = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const autoTable = autoTableModule.default

  // Pre-fetch diagram images
  const { processedContent, diagramImages } =
    await preprocessContentWithDiagrams(artifact.content, 'png')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const maxWidth = pageWidth - 2 * margin
  let yPosition = margin

  // Função para adicionar nova página se necessário
  const checkPageBreak = (heightNeeded: number) => {
    if (yPosition + heightNeeded > pageHeight - margin) {
      doc.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Limpar título de emojis e normalizar para ASCII
  const cleanTitle = cleanTextForPdf(artifact.name)

  // Título do documento
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(cleanTitle, maxWidth)
  titleLines.forEach((line: string) => {
    checkPageBreak(10)
    doc.text(line, margin, yPosition)
    yPosition += 10
  })
  yPosition += 5

  // Versão
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Versão: ${artifact.version || 1}`, margin, yPosition)
  yPosition += 10
  doc.setTextColor(0, 0, 0)

  // Processar conteúdo markdown linha por linha
  const lines = processedContent.split('\n')

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!

    // Check for markdown table
    if (isTableHeaderLine(line, lines[li + 1])) {
      const result = parseMarkdownTable(lines, li)
      if (result) {
        const { table, endIdx } = result

        // Clean text for PDF in each cell
        const headRow = table.headers.map(h => cleanTextForPdf(h))
        const bodyRows = table.rows.map(row =>
          row.map(cell => cleanTextForPdf(cell))
        )

        checkPageBreak(10 + bodyRows.length * 7)

        autoTable(doc, {
          startY: yPosition,
          head: [headRow],
          body: bodyRows,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 9,
            cellPadding: 2,
            lineColor: [200, 200, 200],
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [30, 30, 30],
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250],
          },
          columnStyles: table.alignments.reduce(
            (acc, align, idx) => {
              acc[idx] = {
                halign: align as 'left' | 'center' | 'right',
              }
              return acc
            },
            {} as Record<number, { halign: 'left' | 'center' | 'right' }>
          ),
        })

        // Update yPosition after table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 20

        li = endIdx - 1
        continue
      }
    }

    // Check for diagram image placeholder
    const diagramPlaceholderMatch = line
      .trim()
      .match(/^<!-- EXPORT_DIAGRAM_IMAGE:(\d+) -->$/)
    if (diagramPlaceholderMatch && diagramImages.length > 0) {
      const idx = parseInt(diagramPlaceholderMatch[1]!, 10)
      const img = diagramImages[idx]
      if (img) {
        try {
          // Calculate image dimensions to fit on page
          const imgMaxWidth = maxWidth
          const imgMaxHeight = pageHeight - margin * 2 - 20
          // Default aspect ratio ~4:3; actual image will be scaled by jsPDF
          let imgWidth = imgMaxWidth
          let imgHeight = imgMaxWidth * 0.75
          if (imgHeight > imgMaxHeight) {
            imgHeight = imgMaxHeight
            imgWidth = imgHeight / 0.75
          }

          checkPageBreak(imgHeight + 10)

          // Center the image horizontally
          const xPos = margin + (maxWidth - imgWidth) / 2

          doc.addImage(
            `data:image/png;base64,${img.base64}`,
            'PNG',
            xPos,
            yPosition,
            imgWidth,
            imgHeight
          )
          yPosition += imgHeight + 5
        } catch {
          // If image embedding fails, add text placeholder
          doc.setFontSize(10)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(150, 150, 150)
          doc.text(`[Diagrama ${img.language}]`, margin, yPosition)
          yPosition += 6
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(11)
        }
        continue
      }
    }

    // Limpar emojis, markdown e normalizar para ASCII
    const cleanedLine = cleanTextForPdf(line)
    const trimmedLine = cleanedLine.trim()

    // Linha vazia
    if (trimmedLine === '') {
      yPosition += 4
      checkPageBreak(4)
      continue
    }

    // Heading 1
    if (trimmedLine.startsWith('# ')) {
      checkPageBreak(12)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      const text = cleanTextForPdf(trimmedLine.replace(/^# /, ''))
      const textLines = doc.splitTextToSize(text, maxWidth)
      textLines.forEach((textLine: string) => {
        checkPageBreak(8)
        doc.text(textLine, margin, yPosition)
        yPosition += 8
      })
      yPosition += 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      continue
    }

    // Heading 2
    if (trimmedLine.startsWith('## ')) {
      checkPageBreak(10)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      const text = cleanTextForPdf(trimmedLine.replace(/^## /, ''))
      const textLines = doc.splitTextToSize(text, maxWidth)
      textLines.forEach((textLine: string) => {
        checkPageBreak(7)
        doc.text(textLine, margin, yPosition)
        yPosition += 7
      })
      yPosition += 3
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      continue
    }

    // Heading 3
    if (trimmedLine.startsWith('### ')) {
      checkPageBreak(8)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      const text = cleanTextForPdf(trimmedLine.replace(/^### /, ''))
      const textLines = doc.splitTextToSize(text, maxWidth)
      textLines.forEach((textLine: string) => {
        checkPageBreak(6)
        doc.text(textLine, margin, yPosition)
        yPosition += 6
      })
      yPosition += 2
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      continue
    }

    // Bullet points
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      checkPageBreak(6)
      doc.setFontSize(11)
      const text = '• ' + cleanTextForPdf(trimmedLine.replace(/^[-*] /, ''))
      const textLines = doc.splitTextToSize(text, maxWidth - 5)
      textLines.forEach((textLine: string, index: number) => {
        checkPageBreak(5)
        const xPos = index === 0 ? margin + 2 : margin + 7
        doc.text(textLine, xPos, yPosition)
        yPosition += 5
      })
      continue
    }

    // Numbered lists
    if (trimmedLine.match(/^\d+\. /)) {
      checkPageBreak(6)
      doc.setFontSize(11)
      const cleanText = cleanTextForPdf(trimmedLine)
      const textLines = doc.splitTextToSize(cleanText, maxWidth - 5)
      textLines.forEach((textLine: string, index: number) => {
        checkPageBreak(5)
        const xPos = index === 0 ? margin + 2 : margin + 7
        doc.text(textLine, xPos, yPosition)
        yPosition += 5
      })
      continue
    }

    // Texto normal (parágrafo)
    checkPageBreak(6)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')

    // Limpar completamente o texto e normalizar para ASCII
    const text = cleanTextForPdf(trimmedLine)

    const textLines = doc.splitTextToSize(text, maxWidth)
    textLines.forEach((textLine: string) => {
      checkPageBreak(5)
      doc.text(textLine, margin, yPosition)
      yPosition += 5
    })
    yPosition += 1
  }

  // Salvar o PDF
  doc.save(`${slugify(artifact.name)}_v${artifact.version || 1}.pdf`)
}

/**
 * Exporta artefato para Markdown
 */
export function exportToMarkdown(artifact: ArtifactData): void {
  const content = `# ${artifact.name}\n\n${artifact.content}`
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  saveAs(blob, `${slugify(artifact.name)}_v${artifact.version || 1}.md`)
}

/**
 * Exporta artefato para JSON — versão estruturada.
 *
 * Divide o conteúdo markdown em seções (por headings) e converte tabelas
 * em listas de objetos, preservando todo o conteúdo textual.
 */
export function exportToJson(artifact: ArtifactData): void {
  const sections = parseMarkdownToSections(artifact.content)

  const content = JSON.stringify(
    {
      title: artifact.name,
      version: artifact.version || 1,
      exportedAt: new Date().toISOString(),
      sections,
    },
    null,
    2
  )
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  saveAs(blob, `${slugify(artifact.name)}_v${artifact.version || 1}.json`)
}

// ---------------------------------------------------------------------------
// Markdown → structured JSON helpers
// ---------------------------------------------------------------------------

/** A content block inside a section */
interface JsonContentBlock {
  type: 'text' | 'table' | 'code' | 'list' | 'diagram'
  /** For text blocks: the rendered paragraph lines */
  content?: string
  /** For table blocks: column headers */
  headers?: string[]
  /** For table blocks: array of row-objects keyed by header */
  rows?: Record<string, string>[]
  /** For code / diagram blocks: the language / diagram type */
  language?: string
  /** For code / diagram blocks: the raw code */
  code?: string
  /** For diagram blocks: optional title from <!-- DIAGRAM --> tags */
  title?: string
  /** For list blocks: the items */
  items?: string[]
}

/** A top-level section parsed from the markdown */
interface JsonSection {
  heading: string
  level: number
  content: JsonContentBlock[]
  subsections?: JsonSection[]
}

/**
 * Parse the full markdown into a tree of sections, each containing typed
 * content blocks (text, table, code, list, diagram).
 */
function parseMarkdownToSections(markdown: string): JsonSection[] {
  const lines = markdown.split('\n')
  const rootSections: JsonSection[] = []

  // Stack keeps the current path of nested sections so we can attach
  // subsections at the right depth.
  const stack: { section: JsonSection; level: number }[] = []

  /** Return the section where new content should be appended */
  function currentSection(): JsonSection | null {
    return stack.length > 0 ? stack[stack.length - 1]!.section : null
  }

  /** Push content block into the deepest open section */
  function pushBlock(block: JsonContentBlock) {
    const sec = currentSection()
    if (sec) {
      sec.content.push(block)
    } else {
      // Content before the first heading — create an implicit root section
      const implicitSection: JsonSection = {
        heading: '',
        level: 0,
        content: [block],
      }
      rootSections.push(implicitSection)
      stack.push({ section: implicitSection, level: 0 })
    }
  }

  let i = 0

  while (i < lines.length) {
    const line = lines[i]!

    // ── <!-- DIAGRAM --> tag blocks ─────────────────────────────────────
    const diagramTagMatch = line.match(/^<!--\s*DIAGRAM\s+([\s\S]*?)-->\s*$/i)
    if (diagramTagMatch) {
      // Parse attributes from the opening tag (type="...", title="...")
      const attrs = diagramTagMatch[1] || ''
      const typeMatch = attrs.match(/type="([^"]+)"/)
      const titleMatch = attrs.match(/title="([^"]+)"/)
      const diagramType = typeMatch ? typeMatch[1]! : 'unknown'
      const diagramTitle = titleMatch ? titleMatch[1]! : undefined

      const codeLines: string[] = []
      i++ // skip opening tag
      while (
        i < lines.length &&
        !/^<!--\s*\/DIAGRAM\s*-->/i.test(lines[i]!.trim())
      ) {
        codeLines.push(lines[i]!)
        i++
      }
      i++ // skip closing tag

      pushBlock({
        type: 'diagram',
        language: diagramType,
        code: codeLines.join('\n'),
        ...(diagramTitle ? { title: diagramTitle } : {}),
      })
      continue
    }

    // ── Heading ─────────────────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1]!.length
      const heading = headingMatch[2]!.trim()

      const newSection: JsonSection = { heading, level, content: [] }

      // Pop sections from the stack that are at the same or deeper level
      while (stack.length > 0 && stack[stack.length - 1]!.level >= level) {
        stack.pop()
      }

      const parent = currentSection()
      if (parent) {
        if (!parent.subsections) parent.subsections = []
        parent.subsections.push(newSection)
      } else {
        rootSections.push(newSection)
      }
      stack.push({ section: newSection, level })
      i++
      continue
    }

    // ── Fenced code block / diagram code block ──────────────────────────
    const fenceMatch = line.trim().match(/^```(\S*)\s*$/)
    if (fenceMatch) {
      const lang = fenceMatch[1]?.toLowerCase() || ''
      const codeLines: string[] = []
      i++ // skip opening ```
      while (i < lines.length && !/^```\s*$/.test(lines[i]!.trim())) {
        codeLines.push(lines[i]!)
        i++
      }
      i++ // skip closing ```

      if (SUPPORTED_DIAGRAM_LANGUAGES.has(lang)) {
        pushBlock({
          type: 'diagram',
          language: lang,
          code: codeLines.join('\n'),
        })
      } else {
        pushBlock({
          type: 'code',
          language: lang || undefined,
          code: codeLines.join('\n'),
        })
      }
      continue
    }

    // ── Markdown table ──────────────────────────────────────────────────
    if (isTableRow(line)) {
      const tableLines: string[] = []
      while (
        i < lines.length &&
        (isTableRow(lines[i]!) || isTableSeparator(lines[i]!))
      ) {
        tableLines.push(lines[i]!)
        i++
      }

      const parsed = parseMarkdownTableToJson(tableLines)
      if (parsed) {
        pushBlock(parsed)
      }
      continue
    }

    // ── Unordered / ordered list ────────────────────────────────────────
    const listMatch = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      const items: string[] = []
      while (i < lines.length && /^\s*(?:[-*]|\d+\.)\s+/.test(lines[i]!)) {
        const m = lines[i]!.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/)
        if (m) items.push(m[1]!.trim())
        i++
      }
      pushBlock({ type: 'list', items })
      continue
    }

    // ── Horizontal rule / blank / decorative lines ──────────────────────
    if (line.trim() === '' || /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      i++
      continue
    }

    // ── Regular text paragraph ──────────────────────────────────────────
    const textLines: string[] = []
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !lines[i]!.match(/^#{1,6}\s/) &&
      !isTableRow(lines[i]!) &&
      !/^```/.test(lines[i]!.trim()) &&
      !/^<!--\s*DIAGRAM/i.test(lines[i]!.trim()) &&
      !/^\s*(?:[-*]|\d+\.)\s+/.test(lines[i]!) &&
      !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]!.trim())
    ) {
      textLines.push(lines[i]!.trim())
      i++
    }
    if (textLines.length > 0) {
      pushBlock({ type: 'text', content: textLines.join('\n') })
    }
  }

  return rootSections
}

/**
 * Parse markdown table lines into a JSON-friendly structure:
 * headers + array of row objects keyed by header name.
 */
function parseMarkdownTableToJson(
  tableLines: string[]
): JsonContentBlock | null {
  if (tableLines.length < 2) return null

  const headerLine = tableLines[0]!
  const headers = parseTableCells(headerLine)

  // Find separator
  let sepIdx = 1
  for (let j = 1; j < tableLines.length; j++) {
    if (isTableSeparator(tableLines[j]!)) {
      sepIdx = j
      break
    }
  }

  const bodyLines = tableLines.slice(sepIdx + 1).filter(l => isTableRow(l))

  const rows = bodyLines.map(line => {
    const cells = parseTableCells(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? ''
    })
    return row
  })

  return { type: 'table', headers, rows }
}

/**
 * Exporta artefato para HTML (com imagens de diagramas embutidas)
 */
export async function exportToHtml(artifact: ArtifactData): Promise<void> {
  // Pre-fetch diagram images for HTML embedding
  const { processedContent, diagramImages } =
    await preprocessContentWithDiagrams(artifact.content, 'png')

  const html = markdownToHtml(processedContent, artifact.name, diagramImages)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  saveAs(blob, `${slugify(artifact.name)}_v${artifact.version || 1}.html`)
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/** Escape a CSV cell value: wrap in quotes if it contains commas, quotes, or newlines */
function escapeCsvCell(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

/**
 * Extract all tables from markdown content and convert them into CSV format.
 * Each table becomes a section separated by a blank line.
 */
function markdownToCsv(markdown: string): string {
  const lines = markdown.split('\n')
  const csvSections: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!

    if (
      isTableRow(line) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1]!)
    ) {
      const tableLines: string[] = []
      while (
        i < lines.length &&
        (isTableRow(lines[i]!) || isTableSeparator(lines[i]!))
      ) {
        tableLines.push(lines[i]!)
        i++
      }

      // Parse table
      const headerLine = tableLines[0]!
      const headers = parseTableCells(headerLine)

      // Find separator index
      let sepIdx = 1
      for (let j = 1; j < tableLines.length; j++) {
        if (isTableSeparator(tableLines[j]!)) {
          sepIdx = j
          break
        }
      }

      const bodyLines = tableLines.slice(sepIdx + 1).filter(l => isTableRow(l))

      // Build CSV rows
      const csvRows: string[] = []
      csvRows.push(headers.map(h => escapeCsvCell(h)).join(','))
      for (const bodyLine of bodyLines) {
        const cells = parseTableCells(bodyLine)
        const normalized = headers.map((_, idx) => cells[idx] ?? '')
        csvRows.push(normalized.map(c => escapeCsvCell(c)).join(','))
      }
      csvSections.push(csvRows.join('\n'))
      continue
    }

    i++
  }

  if (csvSections.length === 0) {
    return '(Nenhuma tabela encontrada no artefato)'
  }

  return csvSections.join('\n\n')
}

/**
 * Exporta artefato para CSV (apenas tabelas)
 */
export function exportToCsv(artifact: ArtifactData): void {
  const csv = markdownToCsv(artifact.content)
  // BOM (\uFEFF) for Excel compatibility with UTF-8
  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8',
  })
  saveAs(blob, `${slugify(artifact.name)}_v${artifact.version || 1}.csv`)
}

/**
 * Função principal de exportação
 */
export async function exportArtifact(
  artifact: ArtifactData,
  format: ExportFormat
): Promise<void> {
  switch (format) {
    case 'pdf':
      await exportToPdf(artifact)
      break
    case 'docx':
      await exportToDocx(artifact)
      break
    case 'md':
      exportToMarkdown(artifact)
      break
    case 'json':
      exportToJson(artifact)
      break
    case 'html':
      await exportToHtml(artifact)
      break
    case 'csv':
      exportToCsv(artifact)
      break
    default:
      throw new Error(`Formato não suportado: ${format}`)
  }
}
