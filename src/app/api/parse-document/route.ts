/**
 * Parse Document API Route
 *
 * Handles document upload and content extraction.
 * Supports: PDF, DOCX, PPTX, XLSX, MD, TXT, CSV
 *
 * Uses:
 * - mammoth.js for DOCX (better semantic extraction)
 * - officeparser for PDF, PPTX, XLSX
 * - Direct read for MD, TXT, CSV
 */
import { createHash } from 'crypto'

import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import officeParser from 'officeparser'

import type {
  ExtractedKnowledge,
  KnowledgeSlotType,
} from '@/features/onboarding/types/knowledge-slots'

// ============================================================================
// TYPES
// ============================================================================

interface ParseDocumentResponse {
  success: boolean
  markdown?: string
  artifactKey?: string
  metadata?: ExtractedKnowledge
  error?: string
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate content hash for deduplication
 */
function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Extract section headers from markdown content
 */
function extractSectionHeaders(content: string): string[] {
  const headerRegex = /^#{1,6}\s+(.+)$/gm
  const headers: string[] = []
  let match

  while ((match = headerRegex.exec(content)) !== null) {
    headers.push(match[1].trim())
  }

  return headers
}

/**
 * Extract sections with content from markdown
 */
function extractSections(
  content: string
): Array<{ title: string; content: string; level: number }> {
  const sections: Array<{ title: string; content: string; level: number }> = []
  const headerRegex = /^(#{1,6})\s+(.+)$/gm
  let lastIndex = 0
  let lastTitle = 'Introduction'
  let lastLevel = 1
  let match

  while ((match = headerRegex.exec(content)) !== null) {
    if (lastIndex > 0 || match.index > 0) {
      const sectionContent = content.slice(lastIndex, match.index).trim()
      if (sectionContent) {
        sections.push({
          title: lastTitle,
          content: sectionContent,
          level: lastLevel,
        })
      }
    }
    lastTitle = match[2].trim()
    lastLevel = match[1].length
    lastIndex = match.index + match[0].length
  }

  // Add last section
  const remainingContent = content.slice(lastIndex).trim()
  if (remainingContent) {
    sections.push({
      title: lastTitle,
      content: remainingContent,
      level: lastLevel,
    })
  }

  return sections
}

/**
 * Extract key terms from content (simple frequency-based)
 */
function extractKeyTerms(content: string): string[] {
  // Clean content
  const cleanedContent = content
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')

  const words = cleanedContent.split(' ')
  const wordFreq = new Map<string, number>()

  // Count word frequency (filter short words and common words)
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'dare',
    'ought',
    'used',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'as',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'between',
    'under',
    'again',
    'further',
    'then',
    'once',
    'here',
    'there',
    'when',
    'where',
    'why',
    'how',
    'all',
    'each',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'nor',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    'just',
    'and',
    'but',
    'if',
    'or',
    'because',
    'until',
    'while',
    'this',
    'that',
    'these',
    'those',
    'which',
  ])

  for (const word of words) {
    if (word.length > 4 && !stopWords.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }
  }

  // Sort by frequency and take top 20
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word)
}

/**
 * Convert HTML to Markdown (simple conversion)
 */
function htmlToMarkdown(html: string): string {
  return (
    html
      // Headers
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      // Bold and italic
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      // Lists
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ul[^>]*>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      // Paragraphs and breaks
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br[^>]*\/?>/gi, '\n')
      // Links
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      // Code
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

// ============================================================================
// PARSERS
// ============================================================================

/**
 * Parse DOCX using mammoth (best quality for Word docs)
 */
async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer })
  return htmlToMarkdown(result.value)
}

/**
 * Parse PDF/PPTX/XLSX using officeparser
 */
async function parseOfficeDocument(buffer: Buffer): Promise<string> {
  const text = await officeParser.parseOfficeAsync(buffer)
  return text
}

/**
 * Parse markdown or text (direct read)
 */
function parseTextFile(buffer: Buffer): string {
  return buffer.toString('utf-8')
}

/**
 * Parse CSV - returns raw content with metadata summary
 * No markdown conversion, keeps original format for AI processing
 */
function parseCsvFile(buffer: Buffer): string {
  const content = buffer.toString('utf-8')
  const lines = content.split(/\r?\n/).filter(line => line.trim())

  if (lines.length === 0) {
    return ''
  }

  // Detect delimiter (comma, semicolon, or tab)
  const firstLine = lines[0]
  let delimiter = ','
  if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';'
  } else if (firstLine.includes('\t') && !firstLine.includes(',')) {
    delimiter = '\t'
  }

  // Parse first row to get headers
  const headers = firstLine
    .split(delimiter)
    .map(h => h.trim().replace(/^"|"$/g, ''))
  const dataRowCount = lines.length - 1

  // Build output with metadata header + raw content
  const summary = `[CSV: ${dataRowCount} rows, ${headers.length} columns: ${headers.join(', ')}]\n\n`

  return summary + content
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<ParseDocumentResponse>> {
  try {
    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const slotType = formData.get('slotType') as KnowledgeSlotType | null
    const manifestId = formData.get('manifestId') as string | null

    // Validation
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // slotType and manifestId are OPTIONAL (only required for knowledge slots workflow)
    // When used in chat, only file is needed

    // Get file buffer
    const startTime = Date.now()
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name.toLowerCase()
    console.log(
      `[Parse API] ⏱️ Buffer read: ${Date.now() - startTime}ms for ${filename}`
    )

    // Parse based on file type
    let markdown: string
    let parsingMethod: ExtractedKnowledge['parsingMethod']
    const parseStart = Date.now()

    if (filename.endsWith('.docx')) {
      markdown = await parseDocx(buffer)
      parsingMethod = 'mammoth'
    } else if (
      filename.endsWith('.pdf') ||
      filename.endsWith('.pptx') ||
      filename.endsWith('.xlsx')
    ) {
      markdown = await parseOfficeDocument(buffer)
      parsingMethod = 'officeparser'
    } else if (filename.endsWith('.md') || filename.endsWith('.txt')) {
      markdown = parseTextFile(buffer)
      parsingMethod = 'direct'
    } else if (filename.endsWith('.csv')) {
      markdown = parseCsvFile(buffer)
      parsingMethod = 'direct'
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type' },
        { status: 400 }
      )
    }
    console.log(
      `[Parse API] ⏱️ Parse (${parsingMethod}): ${Date.now() - parseStart}ms`
    )

    // Extract metadata
    const contentHash = generateContentHash(markdown)
    const sectionHeaders = extractSectionHeaders(markdown)
    const sections = extractSections(markdown)
    const keyTerms = extractKeyTerms(markdown)
    const wordCount = markdown.split(/\s+/).filter(w => w.length > 0).length

    // Generate artifact key (only if manifestId and slotType are provided)
    const artifactKey =
      manifestId && slotType
        ? `TRAINING_INPUT_${manifestId}_${slotType}_${contentHash.slice(0, 8)}`
        : undefined

    // Build metadata (only if slotType is provided for knowledge slots)
    const metadata: ExtractedKnowledge | undefined =
      manifestId && slotType
        ? {
            markdown,
            wordCount,
            sectionHeaders,
            sections,
            keyTerms,
            extractedTopics: sectionHeaders.slice(0, 10), // Use headers as initial topics
            parsedAt: new Date().toISOString(),
            parsingMethod,
            contentHash,
          }
        : undefined

    const totalTime = Date.now() - startTime
    console.log(
      `[Parse API] ✅ Total: ${totalTime}ms for ${file.name} (${markdown.length} chars)`
    )

    return NextResponse.json({
      success: true,
      markdown,
      ...(artifactKey && { artifactKey }),
      ...(metadata && { metadata }),
    })
  } catch (error) {
    console.error('Parse document error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Handle OPTIONS for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json({}, { status: 200 })
}
