/**
 * Client-side File Processing Utilities
 * Processes files in the browser for chat attachments
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ProcessedFile {
  name: string
  size: number
  type: string
  content: string // Full content for agent processing
  preview?: string // Short preview for user display
  displayContent?: string // What to show in chat (can be different from content)
  hideContentInChat?: boolean // If true, only show file info in chat
}

// ============================================================================
// SUPPORTED FILE TYPES
// ============================================================================

/**
 * MIME types suportados para arquivos de texto
 * NOTA: Navegadores podem não identificar corretamente o MIME type de .md e .txt
 * Sempre use isTextFileByExtension() como fallback
 */
export const SUPPORTED_TEXT_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'text/xml',
  'application/xml',
]

/**
 * MIME types suportados para documentos binários que podem ter texto extraído
 */
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/msword', // .doc
]

/**
 * Extensões de arquivo para texto direto (leitura sem extração)
 */
export const TEXT_FILE_EXTENSIONS = [
  '.md',
  '.txt',
  '.csv',
  '.json',
  '.xml',
  '.html',
  '.css',
  '.js',
  '.ts',
]

/**
 * Extensões de arquivo para documentos binários (requer extração)
 */
export const DOCUMENT_FILE_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.doc',
  '.pptx',
  '.xlsx',
  '.xls',
]

/**
 * Todas as extensões de arquivo aceitas para upload
 */
export const ACCEPTED_FILE_EXTENSIONS =
  '.pdf,.docx,.doc,.pptx,.xlsx,.xls,.txt,.md,.json,.csv'

/**
 * Verifica se é arquivo de texto pela extensão (fallback para MIME type inconsistente)
 * IMPORTANTE: Navegadores podem retornar MIME type vazio ou incorreto para .md e .txt
 */
export function isTextFileByExtension(file: File): boolean {
  const fileName = file.name.toLowerCase()
  return TEXT_FILE_EXTENSIONS.some(ext => fileName.endsWith(ext))
}

/**
 * Verifica se é documento extraível pela extensão
 */
export function isExtractableDocumentByExtension(file: File): boolean {
  const fileName = file.name.toLowerCase()
  return DOCUMENT_FILE_EXTENSIONS.some(ext => fileName.endsWith(ext))
}

/**
 * Verifica se o arquivo é suportado (texto OU documento extraível)
 */
export function isSupportedFile(file: File): boolean {
  // Verifica por MIME type
  if (
    SUPPORTED_TEXT_TYPES.includes(file.type) ||
    SUPPORTED_DOCUMENT_TYPES.includes(file.type)
  ) {
    return true
  }
  // Fallback: verifica por extensão (navegadores podem não identificar MIME corretamente)
  return isTextFileByExtension(file) || isExtractableDocumentByExtension(file)
}

// Images are not supported for now
const BLOCKED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Process files for chat context - extracts content that can be sent to agents
 * @param files Array of files to process
 * @param hideContentInChat If true, hides file content in chat but agent still receives it
 */
export async function processFilesForChat(
  files: File[],
  hideContentInChat = false
): Promise<ProcessedFile[]> {
  const processedFiles: ProcessedFile[] = []

  for (const file of files) {
    try {
      const processed = await processFileForChat(file, hideContentInChat)
      if (processed) {
        processedFiles.push(processed)
      }
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      // Add error info as processed file
      processedFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
        content: `⚠️ Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        preview: 'Erro no processamento',
        displayContent: `⚠️ Erro ao processar ${file.name}`,
        hideContentInChat: false,
      })
    }
  }

  return processedFiles
}

/**
 * Process a single file
 */
async function processFileForChat(
  file: File,
  hideContentInChat = false
): Promise<ProcessedFile | null> {
  // Block image files
  if (BLOCKED_IMAGE_TYPES.includes(file.type) || isImageFile(file)) {
    throw new Error(
      `Arquivos de imagem não são aceitos no momento. Tipo: ${file.type}`
    )
  }

  // Text files - read directly
  // IMPORTANTE: Usa verificação por MIME type E extensão para cobrir casos onde
  // o navegador não identifica corretamente o MIME type (comum em .md e .txt)
  if (SUPPORTED_TEXT_TYPES.includes(file.type) || isTextFileByExtension(file)) {
    const content = await readTextFile(file)
    const preview =
      content.substring(0, 200) + (content.length > 200 ? '...' : '')

    return {
      name: file.name,
      size: file.size,
      type: file.type,
      content, // Full content for agent
      preview,
      displayContent: hideContentInChat
        ? `📄 Arquivo processado: ${file.name} (${formatBytes(file.size)})`
        : `📄 **Conteúdo de ${file.name}:**\n\n\`\`\`\n${content}\n\`\`\``,
      hideContentInChat,
    }
  }

  // Helper para verificar extensão do arquivo
  const fileName = file.name.toLowerCase()

  // PDF files - provide metadata (content extraction would need server-side processing)
  if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
    const baseContent = `📄 Documento PDF anexado: ${file.name} (${formatBytes(file.size)})\n\n⚠️ Para análise completa do conteúdo, o arquivo precisa ser processado no servidor.`

    return {
      name: file.name,
      size: file.size,
      type: file.type || 'application/pdf',
      content: baseContent,
      preview: `PDF: ${file.name}`,
      displayContent: hideContentInChat
        ? `📄 Arquivo PDF processado: ${file.name} (${formatBytes(file.size)})`
        : baseContent,
      hideContentInChat,
    }
  }

  // DOCX files - provide metadata
  if (
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    const baseContent = `📝 Documento Word anexado: ${file.name} (${formatBytes(file.size)})\n\n⚠️ Para análise completa do conteúdo, o arquivo precisa ser processado no servidor.`

    return {
      name: file.name,
      size: file.size,
      type:
        file.type ||
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content: baseContent,
      preview: `DOCX: ${file.name}`,
      displayContent: hideContentInChat
        ? `📝 Arquivo Word processado: ${file.name} (${formatBytes(file.size)})`
        : baseContent,
      hideContentInChat,
    }
  }

  // XLSX files - provide metadata
  if (
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls')
  ) {
    const baseContent = `📊 Planilha Excel anexada: ${file.name} (${formatBytes(file.size)})\n\n⚠️ Para análise completa do conteúdo, o arquivo precisa ser processado no servidor.`

    return {
      name: file.name,
      size: file.size,
      type:
        file.type ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content: baseContent,
      preview: `XLSX: ${file.name}`,
      displayContent: hideContentInChat
        ? `📊 Arquivo Excel processado: ${file.name} (${formatBytes(file.size)})`
        : baseContent,
      hideContentInChat,
    }
  }

  // PPTX files - provide metadata
  if (
    file.type ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    fileName.endsWith('.pptx')
  ) {
    const baseContent = `📊 Apresentação PowerPoint anexada: ${file.name} (${formatBytes(file.size)})\n\n⚠️ Para análise completa do conteúdo, o arquivo precisa ser processado no servidor.`

    return {
      name: file.name,
      size: file.size,
      type:
        file.type ||
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      content: baseContent,
      preview: `PPTX: ${file.name}`,
      displayContent: hideContentInChat
        ? `📊 Arquivo PowerPoint processado: ${file.name} (${formatBytes(file.size)})`
        : baseContent,
      hideContentInChat,
    }
  }

  // Other files - just metadata
  const baseContent = `📎 Arquivo anexado: ${file.name} (${file.type || 'tipo desconhecido'}, ${formatBytes(file.size)})\n\n⚠️ Tipo de arquivo não suportado para análise de conteúdo.`

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    content: baseContent,
    preview: `Arquivo: ${file.name}`,
    displayContent: hideContentInChat
      ? `📎 Arquivo processado: ${file.name} (${formatBytes(file.size)})`
      : baseContent,
    hideContentInChat,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Read text content from file
 */
function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = event => {
      const content = event.target?.result as string
      resolve(content || '')
    }

    reader.onerror = () => {
      reject(new Error(`Erro ao ler arquivo: ${file.name}`))
    }

    reader.readAsText(file, 'utf-8')
  })
}

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Check if file is an image based on extension or MIME type
 */
function isImageFile(file: File): boolean {
  const imageExtensions = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.bmp',
    '.tiff',
  ]
  const fileName = file.name.toLowerCase()

  // Check by MIME type
  if (file.type.startsWith('image/')) {
    return true
  }

  // Check by file extension
  return imageExtensions.some(ext => fileName.endsWith(ext))
}
