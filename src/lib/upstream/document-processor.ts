/**
 * Document Processing Utilities
 * Converts various document formats to Markdown
 */
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DocumentMetadata {
  title?: string
  author?: string
  createdDate?: string
  pageCount?: number
  wordCount?: number
  summary?: string
  topics?: string[]
}

// ============================================================================
// MAIN CONVERSION FUNCTION
// ============================================================================

/**
 * Convert document to markdown based on file extension
 */
export async function convertToMarkdown(
  filename: string,
  buffer: Buffer
): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'pdf':
      return await convertPdfToMarkdown(buffer)
    case 'docx':
      return await convertDocxToMarkdown(buffer)
    case 'xlsx':
    case 'xls':
      return await convertXlsxToMarkdown(buffer)
    case 'md':
    case 'markdown':
      return buffer.toString('utf-8')
    case 'txt':
      return buffer.toString('utf-8')
    default:
      throw new Error(`Unsupported file type: ${ext}`)
  }
}

// ============================================================================
// PDF CONVERSION
// ============================================================================

/**
 * Limpa o cache do módulo pdf-parse para evitar problemas de estado global
 * A biblioteca pdf-parse mantém referências globais ao PDFJS que podem causar
 * erros intermitentes como "bad XRef entry" ou "Illegal character"
 */
function clearPdfParseCache(): void {
  try {
    // Limpar módulos relacionados ao pdf-parse do cache do require
    const cacheKeys = Object.keys(require.cache)
    for (const key of cacheKeys) {
      if (key.includes('pdf-parse') || key.includes('pdf.js')) {
        delete require.cache[key]
      }
    }
  } catch {
    // Ignorar erros na limpeza do cache
  }
}

async function convertPdfToMarkdown(buffer: Buffer): Promise<string> {
  try {
    // IMPORTANTE: Limpar o cache do pdf-parse antes de cada uso
    // Isso resolve erros intermitentes como "bad XRef entry" e "Illegal character"
    clearPdfParseCache()

    // Criar uma cópia fresca do buffer para evitar problemas de estado
    const freshBuffer = Buffer.from(buffer)

    console.log(
      '[PDF] Starting PDF extraction, buffer size:',
      freshBuffer.length
    )

    // Validate buffer starts with PDF header
    const pdfHeader = freshBuffer.slice(0, 5).toString('ascii')
    if (!pdfHeader.startsWith('%PDF')) {
      console.error('[PDF] Invalid PDF header:', pdfHeader)
      throw new Error(
        'O arquivo não parece ser um PDF válido (cabeçalho inválido)'
      )
    }

    // Import pdf-parse dynamically to avoid issues with serverless environments
    // The default import runs test code that tries to open ./test/data/05-versions-space.pdf
    let pdf: (
      buffer: Buffer,
      options?: object
    ) => Promise<{
      text: string
      numpages: number
      info?: { Title?: string; Author?: string; CreationDate?: string }
    }>

    try {
      // Try direct import from lib folder first (avoids test file issue)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      pdf = require('pdf-parse/lib/pdf-parse')
    } catch {
      // Fallback to main import
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      pdf = pdfParse
    }

    let data: {
      text: string
      numpages: number
      info?: { Title?: string; Author?: string; CreationDate?: string }
    }

    try {
      // First attempt: standard parsing with fresh buffer
      data = await pdf(freshBuffer)
    } catch (firstError) {
      const firstErrorMsg =
        firstError instanceof Error ? firstError.message : String(firstError)
      console.warn('[PDF] First parse attempt failed:', firstErrorMsg)

      // Check for recoverable errors (XRef errors, Illegal character)
      const isRecoverableError =
        firstErrorMsg.includes('XRef') ||
        firstErrorMsg.includes('xref') ||
        firstErrorMsg.includes('Illegal character')

      if (isRecoverableError) {
        console.log(
          '[PDF] Recoverable error detected, clearing cache and retrying...'
        )

        try {
          // Limpar o cache antes de tentar novamente
          clearPdfParseCache()

          // Recarregar o módulo pdf-parse
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const freshPdf = require('pdf-parse/lib/pdf-parse')

          // Criar outra cópia fresca para a segunda tentativa
          const retryBuffer = Buffer.from(buffer)

          // Try with more lenient options if available
          data = await freshPdf(retryBuffer, {
            max: 0, // No page limit
          })
        } catch (secondError) {
          const secondErrorMsg =
            secondError instanceof Error
              ? secondError.message
              : String(secondError)
          console.error('[PDF] Recovery attempt also failed:', secondErrorMsg)
          throw new Error(`Falha ao extrair texto do PDF: ${firstErrorMsg}`)
        }
      } else {
        throw firstError
      }
    }

    console.log(
      '[PDF] Extraction complete, pages:',
      data.numpages,
      'text length:',
      data.text?.length
    )

    // Check if text was extracted
    if (!data.text || data.text.trim().length === 0) {
      console.warn(
        '[PDF] No text content extracted - PDF may be scanned or image-based'
      )
      return `# PDF Document\n\n**Aviso:** Este PDF parece estar escaneado como imagem ou não contém texto selecionável.\n\nPáginas: ${data.numpages}\n\n---\n\n[Conteúdo não extraível - considere usar OCR ou um PDF com texto selecionável]`
    }

    // Extract text content
    let markdown = `# ${data.info?.Title || 'PDF Document'}\n\n`

    if (data.info?.Author) {
      markdown += `**Author:** ${data.info.Author}\n\n`
    }

    if (data.info?.CreationDate) {
      markdown += `**Created:** ${data.info.CreationDate}\n\n`
    }

    markdown += `**Pages:** ${data.numpages}\n\n`
    markdown += '---\n\n'

    // Add content
    markdown += data.text

    // Clean up common PDF artifacts
    markdown = cleanPdfText(markdown)

    return markdown
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[PDF] Conversion error:', errorMessage)

    // Limpar cache após erro para garantir estado limpo na próxima tentativa
    clearPdfParseCache()

    // Provide more specific error messages
    if (errorMessage.includes('Invalid PDF')) {
      throw new Error(
        'O arquivo PDF parece estar corrompido ou em formato inválido'
      )
    }
    if (errorMessage.includes('password')) {
      throw new Error('O arquivo PDF está protegido por senha')
    }
    if (errorMessage.includes('ENOENT') || errorMessage.includes('test/data')) {
      throw new Error(
        'Erro de configuração do extrator de PDF - dependência não encontrada'
      )
    }
    if (errorMessage.includes('XRef') || errorMessage.includes('xref')) {
      throw new Error(
        'O PDF possui estrutura interna danificada (erro XRef). Tente reexportar o PDF a partir do documento original.'
      )
    }
    if (errorMessage.includes('Illegal character')) {
      throw new Error(
        'O PDF possui caracteres inválidos na estrutura. Tente reexportar ou reparar o PDF.'
      )
    }

    throw new Error(`Falha ao extrair texto do PDF: ${errorMessage}`)
  }
}

function cleanPdfText(text: string): string {
  return (
    text
      // Remove excessive whitespace
      .replace(/[ \t]+/g, ' ')
      // Remove excessive newlines (more than 2)
      .replace(/\n{3,}/g, '\n\n')
      // Remove page numbers (common pattern: just numbers on a line)
      .replace(/^\d+$/gm, '')
      // Trim lines
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim()
  )
}

// ============================================================================
// DOCX CONVERSION
// ============================================================================

async function convertDocxToMarkdown(buffer: Buffer): Promise<string> {
  try {
    console.log('[DOCX] Starting DOCX conversion, buffer size:', buffer.length)

    // Validar buffer
    if (!buffer || buffer.length === 0) {
      throw new Error('Buffer vazio ou inválido')
    }

    // Validar assinatura DOCX (deve começar com PK)
    const signature = buffer.slice(0, 2).toString('ascii')
    if (signature !== 'PK') {
      console.error('[DOCX] Invalid DOCX signature:', signature)
      throw new Error(
        'O arquivo não parece ser um DOCX válido (assinatura inválida)'
      )
    }

    let text = ''
    let conversionMethod = 'extractRawText'

    try {
      // Método 1: Tentar extractRawText primeiro (mais rápido)
      console.log('[DOCX] Tentando extractRawText...')
      const result = await mammoth.extractRawText({ buffer })

      if (result.messages.length > 0) {
        console.warn('[DOCX] Conversion warnings:', result.messages)
      }

      text = result.value || ''
    } catch (rawTextError) {
      // Fallback: Tentar convertToHtml se extractRawText falhar
      console.warn(
        '[DOCX] extractRawText falhou, tentando convertToHtml...',
        rawTextError
      )
      conversionMethod = 'convertToHtml'

      try {
        const htmlResult = await mammoth.convertToHtml({ buffer })

        if (htmlResult.messages.length > 0) {
          console.warn('[DOCX] HTML conversion warnings:', htmlResult.messages)
        }

        // Converter HTML para texto simples (remover tags)
        text = htmlResult.value
          .replace(/<[^>]*>/g, ' ') // Remove tags HTML
          .replace(/\s+/g, ' ') // Normaliza espaços
          .trim()
      } catch (htmlError) {
        console.error('[DOCX] Ambos os métodos falharam:', {
          rawTextError,
          htmlError,
        })
        throw htmlError
      }
    }

    if (!text || text.trim().length === 0) {
      console.warn('[DOCX] No text content extracted from DOCX')
      return `# Document\n\n[Documento DOCX vazio ou sem texto extraível]`
    }

    console.log(
      `[DOCX] Extraction successful via ${conversionMethod}, text length:`,
      text.length
    )
    return `# Document\n\n${text}`
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[DOCX] Conversion error:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      bufferSize: buffer?.length,
    })

    // Propagar erro com detalhes
    throw new Error(`Falha ao converter DOCX: ${errorMessage}`)
  }
}

// ============================================================================
// XLSX CONVERSION
// ============================================================================

async function convertXlsxToMarkdown(buffer: Buffer): Promise<string> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    let markdown = '# Spreadsheet Data\n\n'

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      markdown += `## ${sheetName}\n\n`

      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet) {
        markdown += '*Empty sheet*\n\n'
        continue
      }

      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as unknown[][]

      if (data.length === 0) {
        markdown += '*Empty sheet*\n\n'
        continue
      }

      // Convert to markdown table
      markdown += convertArrayToMarkdownTable(data)
      markdown += '\n\n'
    }

    return markdown
  } catch (error) {
    console.error('XLSX conversion error:', error)
    throw new Error('Failed to convert XLSX to markdown')
  }
}

function convertArrayToMarkdownTable(data: unknown[][]): string {
  if (data.length === 0) return ''

  const headers = data[0] ?? []
  const rows = data.slice(1)

  if (headers.length === 0) return ''

  // Build header
  let table = '| ' + headers.map(h => String(h ?? '')).join(' | ') + ' |\n'
  table += '| ' + headers.map(() => '---').join(' | ') + ' |\n'

  // Build rows
  for (const row of rows) {
    // Ensure row has same length as headers
    const paddedRow = [...row]
    while (paddedRow.length < headers.length) {
      paddedRow.push('')
    }

    table +=
      '| ' + paddedRow.map(cell => String(cell ?? '')).join(' | ') + ' |\n'
  }

  return table
}

// ============================================================================
// METADATA EXTRACTION
// ============================================================================

/**
 * Extract metadata from markdown content
 */
export async function extractMetadata(
  markdown: string,
  originalFile: { name: string; size: number; type: string }
): Promise<DocumentMetadata> {
  const metadata: DocumentMetadata = {}

  // Extract title (first H1 heading)
  const titleMatch = markdown.match(/^#\s+(.+)$/m)
  if (titleMatch?.[1]) {
    metadata.title = titleMatch[1].trim()
  } else {
    metadata.title = originalFile.name.replace(/\.[^/.]+$/, '') // Filename without extension
  }

  // Extract author (if present in markdown)
  const authorMatch = markdown.match(/\*\*Author:\*\*\s+(.+)$/m)
  if (authorMatch?.[1]) {
    metadata.author = authorMatch[1].trim()
  }

  // Word count
  const words = markdown.split(/\s+/).filter(word => word.length > 0)
  metadata.wordCount = words.length

  // Simple summary: first paragraph after title
  const paragraphs = markdown
    .split('\n\n')
    .filter(p => p.trim().length > 0 && !p.startsWith('#'))
  const firstParagraph = paragraphs[0]
  if (firstParagraph) {
    metadata.summary = firstParagraph.substring(0, 200).trim()
    if (firstParagraph.length > 200) {
      metadata.summary += '...'
    }
  }

  // Extract topics from headings
  const headings = markdown.match(/^#{1,3}\s+(.+)$/gm)
  if (headings) {
    metadata.topics = headings
      .map(h => h.replace(/^#+\s+/, '').trim())
      .slice(0, 10) // Limit to 10 topics
  }

  return metadata
}

// ============================================================================
// FILENAME SANITIZATION
// ============================================================================

/**
 * Sanitize filename for use in artifact keys
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace special chars with underscore
    .replace(/_+/g, '_') // Remove consecutive underscores
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
}

// ============================================================================
// FILE SIZE FORMATTING
// ============================================================================

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
