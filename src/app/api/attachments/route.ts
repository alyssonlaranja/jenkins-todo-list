/**
 * Attachment Upload API Route
 *
 * Handles file uploads with:
 * - Pre-upload validation
 * - Metadata association (conversationId, messageId)
 * - File storage (local or cloud)
 * - Cleanup on DELETE
 *
 * @license Apache-2.0
 */
import { createHash } from 'crypto'
import { access, mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'

import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// TYPES
// ============================================================================

interface AttachmentMetadata {
  id: string
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  extension: string
  conversationId?: string
  messageId?: string
  uploadedAt: string
  processedContent?: string
  storagePath: string
  contentHash: string
}

interface UploadResponse {
  success: boolean
  attachment?: AttachmentMetadata
  error?: string
}

interface DeleteResponse {
  success: boolean
  error?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum file size in bytes (10MB) */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/** Upload directory */
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'attachments')

/** Allowed MIME types */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
])

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate unique ID for attachment
 */
function generateAttachmentId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Generate content hash for deduplication
 */
function generateContentHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').substring(0, 16)
}

/**
 * Sanitize filename for storage
 */
function sanitizeFileName(filename: string): string {
  // Remove dangerous characters
  const sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100)

  return sanitized || 'unnamed_file'
}

/**
 * Get file extension
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot).toLowerCase()
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  try {
    await access(UPLOAD_DIR)
  } catch {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

/**
 * Validate file before processing
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `Arquivo excede limite de 10MB` }
  }

  if (file.size === 0) {
    return { valid: false, error: 'Arquivo vazio não é permitido' }
  }

  const mimeType = file.type || 'application/octet-stream'
  if (
    !ALLOWED_MIME_TYPES.has(mimeType) &&
    mimeType !== 'application/octet-stream'
  ) {
    return { valid: false, error: `Tipo de arquivo não permitido: ${mimeType}` }
  }

  return { valid: true }
}

// ============================================================================
// In-memory storage (replace with database in production)
// ============================================================================

const attachmentsStore = new Map<string, AttachmentMetadata>()

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/attachments
 * List all attachments (optionally filtered by conversationId)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const conversationId = searchParams.get('conversationId')
  const messageId = searchParams.get('messageId')

  let attachments = Array.from(attachmentsStore.values())

  if (conversationId) {
    attachments = attachments.filter(a => a.conversationId === conversationId)
  }

  if (messageId) {
    attachments = attachments.filter(a => a.messageId === messageId)
  }

  return NextResponse.json({
    success: true,
    attachments,
    total: attachments.length,
  })
}

/**
 * POST /api/attachments
 * Upload a new attachment
 *
 * @param request - FormData with:
 *   - file: File (required)
 *   - conversationId: string (optional)
 *   - messageId: string (optional)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResponse>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const conversationId = formData.get('conversationId') as string | null
    const messageId = formData.get('messageId') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Prepare file data
    const buffer = Buffer.from(await file.arrayBuffer())
    const contentHash = generateContentHash(buffer)
    const attachmentId = generateAttachmentId()
    const extension = getFileExtension(file.name)
    const sanitizedName = sanitizeFileName(file.name)
    const storedFileName = `${attachmentId}_${sanitizedName}`

    // Ensure directory exists
    await ensureUploadDir()

    // Save file to disk
    const storagePath = path.join(UPLOAD_DIR, storedFileName)
    await writeFile(storagePath, buffer)

    // Create metadata
    const metadata: AttachmentMetadata = {
      id: attachmentId,
      fileName: storedFileName,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      extension,
      conversationId: conversationId || undefined,
      messageId: messageId || undefined,
      uploadedAt: new Date().toISOString(),
      storagePath,
      contentHash,
    }

    // Store metadata
    attachmentsStore.set(attachmentId, metadata)

    console.log(`✅ [Attachment] Uploaded: ${file.name} (${attachmentId})`)

    return NextResponse.json({
      success: true,
      attachment: metadata,
    })
  } catch (error) {
    console.error('[Attachment Upload] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno ao fazer upload' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/attachments
 * Delete an attachment by ID
 *
 * @param request - JSON body with { attachmentId: string }
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<DeleteResponse>> {
  try {
    const body = await request.json()
    const { attachmentId } = body

    if (!attachmentId) {
      return NextResponse.json(
        { success: false, error: 'attachmentId é obrigatório' },
        { status: 400 }
      )
    }

    const attachment = attachmentsStore.get(attachmentId)

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Anexo não encontrado' },
        { status: 404 }
      )
    }

    // Delete file from disk
    try {
      await unlink(attachment.storagePath)
    } catch (err) {
      console.warn(
        `[Attachment] Could not delete file: ${attachment.storagePath}`,
        err
      )
    }

    // Remove from store
    attachmentsStore.delete(attachmentId)

    console.log(
      `🗑️ [Attachment] Deleted: ${attachment.originalName} (${attachmentId})`
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Attachment Delete] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno ao deletar anexo' },
      { status: 500 }
    )
  }
}
