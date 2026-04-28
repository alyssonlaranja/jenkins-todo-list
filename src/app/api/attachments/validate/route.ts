/**
 * Attachment Validation API Route
 *
 * Validates files before upload:
 * - File size (max 10MB)
 * - File type (whitelist)
 * - MIME type verification
 * - Basic security checks
 *
 * @license Apache-2.0
 */
import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// TYPES
// ============================================================================

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  metadata?: {
    fileName: string
    fileSize: number
    mimeType: string
    extension: string
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum file size in bytes (10MB) */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/** Allowed MIME types */
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  // Images
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp',
])

/** Allowed file extensions */
const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
])

/** Dangerous file patterns (basic security check) */
const DANGEROUS_PATTERNS = [
  /\.exe$/i,
  /\.dll$/i,
  /\.bat$/i,
  /\.cmd$/i,
  /\.ps1$/i,
  /\.sh$/i,
  /\.vbs$/i,
  /\.js$/i, // Be careful with JS files
  /\.msi$/i,
  /\.scr$/i,
  /\.pif$/i,
  /\.com$/i,
]

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot).toLowerCase()
}

/**
 * Check if filename contains dangerous patterns
 */
function hasDangerousPattern(filename: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(filename))
}

/**
 * Validate file based on multiple criteria
 */
function validateFile(file: File): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const fileName = file.name
  const fileSize = file.size
  const mimeType = file.type || 'application/octet-stream'
  const extension = getFileExtension(fileName)

  // 1. Size validation
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2)
    errors.push(`Arquivo muito grande: ${sizeMB}MB (máximo: 10MB)`)
  }

  if (fileSize === 0) {
    errors.push('Arquivo vazio não é permitido')
  }

  // 2. Extension validation
  if (!extension) {
    errors.push('Arquivo sem extensão não é permitido')
  } else if (!ALLOWED_EXTENSIONS.has(extension)) {
    errors.push(`Extensão não permitida: ${extension}`)
  }

  // 3. MIME type validation
  if (
    !ALLOWED_MIME_TYPES.has(mimeType) &&
    mimeType !== 'application/octet-stream'
  ) {
    // Allow octet-stream as fallback but warn
    if (mimeType === 'application/octet-stream') {
      warnings.push('Tipo MIME não detectado, usando extensão para validação')
    } else {
      errors.push(`Tipo de arquivo não permitido: ${mimeType}`)
    }
  }

  // 4. Security patterns check
  if (hasDangerousPattern(fileName)) {
    errors.push('Arquivo potencialmente perigoso detectado')
  }

  // 5. Filename length check
  if (fileName.length > 255) {
    errors.push('Nome do arquivo muito longo (máximo: 255 caracteres)')
  }

  // 6. Hidden files check
  if (fileName.startsWith('.')) {
    warnings.push('Arquivos ocultos podem não ser processados corretamente')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      fileName,
      fileSize,
      mimeType,
      extension,
    },
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/attachments/validate
 * Returns validation rules and limits
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    maxFileSize: MAX_FILE_SIZE_BYTES,
    maxFileSizeMB: 10,
    allowedExtensions: Array.from(ALLOWED_EXTENSIONS),
    allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
  })
}

/**
 * POST /api/attachments/validate
 * Validates a file before upload
 *
 * @param request - FormData with 'file' field
 * @returns ValidationResult
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ValidationResult>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        {
          valid: false,
          errors: ['Nenhum arquivo enviado'],
          warnings: [],
        },
        { status: 400 }
      )
    }

    const result = validateFile(file)

    return NextResponse.json(result, {
      status: result.valid ? 200 : 400,
    })
  } catch (error) {
    console.error('[Attachment Validation] Error:', error)
    return NextResponse.json(
      {
        valid: false,
        errors: ['Erro interno ao validar arquivo'],
        warnings: [],
      },
      { status: 500 }
    )
  }
}
