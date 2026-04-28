'use client'

import { useCallback, useRef, useState } from 'react'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Users,
  X,
} from 'lucide-react'

import {
  CSV_CONTEXT_END,
  CSV_CONTEXT_START,
  formatOcrContextMessage,
  isOcrSupportedImage,
} from '@/lib/ocr'
import { Button } from '@/shared/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { useI18n } from '@/shared/hooks/use-i18n'
import { useToast } from '@/shared/hooks/use-toast'
import { cn } from '@/shared/lib/utils'

import type { Agent } from '../../hooks/useAvailableAgents'
import { CsvPreviewModal } from './CsvPreviewModal'
import { OcrPreviewModal } from './OcrPreviewModal'

// ============================================================================
// TYPES
// ============================================================================

export interface AttachedFile {
  id: string
  file: File
  preview?: string // URL para preview de imagens
  /** Índice único para rastreamento no pool de workers */
  processingIndex?: number
  /** Status do processamento (OCR/CSV) */
  processingStatus?: 'pending' | 'processing' | 'completed' | 'error'
  /** Progresso do processamento (0-100) */
  processingProgress?: number
  /** Resultado do processamento (descrição OCR ou análise CSV) */
  processedContent?: string
  /** Mensagem de erro se processingStatus === 'error' */
  processingError?: string
}

/** Documento do projeto que pode ser anexado */
export interface ProjectDocument {
  id: string
  key: string
  name: string
  type: string
  description?: string
}

interface ChatInputProps {
  onSendMessage: (
    message: string,
    attachments?: File[],
    selectedDocuments?: ProjectDocument[]
  ) => void
  isLoading?: boolean
  /** Tipos de arquivos aceitos (ex: '.pdf,.docx,.txt') */
  acceptedFileTypes?: string
  /** Número máximo de arquivos */
  maxFiles?: number
  /** Documentos disponíveis no projeto */
  projectDocuments?: ProjectDocument[]
  /** Documentos finalizados do próprio usuário */
  myDocuments?: ProjectDocument[]
  /** Se está carregando os documentos */
  isLoadingDocuments?: boolean
  /** Callback quando um documento do projeto é selecionado */
  onDocumentSelect?: (document: ProjectDocument) => void
  /** Callback para carregar documentos do projeto */
  onLoadDocuments?: () => void
  /** Callback quando imagens são anexadas (para processamento OCR) */
  onImagesAttached?: (images: Array<{ file: File; index: number }>) => void
  /** Callback quando arquivos de texto/CSV são anexados (para processamento) */
  onTextFilesAttached?: (files: Array<{ file: File; index: number }>) => void
  /** Callback quando um arquivo é removido (para cancelar processamento) */
  onFileRemoved?: (index: number, type: 'image' | 'text') => void
  /** Status de processamento dos arquivos (index -> status) - vem do parent */
  fileProcessingStatus?: Map<
    number,
    {
      status: 'pending' | 'processing' | 'completed' | 'error'
      progress?: number
      error?: string
    }
  >
  /** NOVO: Seletor de agentes */
  selectedAgent?: string
  onAgentChange?: (agentId: string) => void
  availableAgents?: Agent[]
  /** Se está carregando um novo agente */
  isAgentLoading?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum file size in bytes (10MB) */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/** Maximum file size in MB for display */
const MAX_FILE_SIZE_MB = 10

// ============================================================================
// HELPERS
// ============================================================================

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) {
    return FileImage
  }
  if (isCSVFile(file)) {
    return FileSpreadsheet
  }
  return FileText
}

/** Verifica se é uma imagem */
function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/** Verifica se é um arquivo CSV */
function isCSVFile(file: File): boolean {
  return (
    file.type === 'text/csv' ||
    file.type === 'application/csv' ||
    file.name.toLowerCase().endsWith('.csv')
  )
}

/** Verifica se é um arquivo de texto que pode ser lido diretamente */
function isTextFile(file: File): boolean {
  const textTypes = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml',
  ]

  const textExtensions = [
    '.txt',
    '.md',
    '.json',
    '.xml',
    '.yaml',
    '.yml',
    '.csv',
    '.tsv',
  ]

  if (textTypes.includes(file.type)) return true

  const fileName = file.name.toLowerCase()
  return textExtensions.some(ext => fileName.endsWith(ext))
}

// Contador global para índices únicos de processamento
let globalProcessingIndex = 0

// ============================================================================
// COMPONENT
// ============================================================================

export function ChatInput({
  onSendMessage,
  isLoading = false,
  acceptedFileTypes = '.pdf,.docx,.doc,.txt,.md,.json,.csv,.png,.jpg,.jpeg,.gif,.webp',
  maxFiles = 10,
  projectDocuments = [],
  myDocuments = [],
  isLoadingDocuments = false,
  onDocumentSelect,
  onLoadDocuments,
  onImagesAttached,
  onTextFilesAttached,
  onFileRemoved,
  selectedAgent,
  onAgentChange,
  availableAgents = [],
  isAgentLoading = false,
  fileProcessingStatus,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<ProjectDocument[]>(
    []
  )
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { t } = useI18n('pages')

  // OCR/Vision state (simplified - modal handles analysis internally)
  const [ocrModalOpen, setOcrModalOpen] = useState(false)
  const [ocrImageFile, setOcrImageFile] = useState<File | null>(null)
  const [ocrContextText, setOcrContextText] = useState<string | null>(null)

  // CSV analysis state
  const [csvModalOpen, setCsvModalOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvContextText, setCsvContextText] = useState<string | null>(null)

  // Open OCR modal for image analysis
  const processImageWithOcr = useCallback((file: File) => {
    setOcrImageFile(file)
    setOcrModalOpen(true)
  }, [])

  // Open CSV modal for CSV analysis
  const processCsvWithAi = useCallback((file: File) => {
    setCsvFile(file)
    setCsvModalOpen(true)
  }, [])

  // Handle OCR context insertion (from modal)
  const handleOcrInsertAsContext = useCallback((text: string) => {
    const contextMessage = formatOcrContextMessage(text)
    setOcrContextText(contextMessage)
    setOcrModalOpen(false)
    setOcrImageFile(null)
  }, [])

  // Handle CSV context insertion (from modal)
  const handleCsvInsertAsContext = useCallback(
    (analysis: string, rawCsv: string) => {
      // Format: Analysis + Raw CSV using the same marker pattern
      const contextMessage = `${CSV_CONTEXT_START}
## Análise do CSV (GPT-5.1)
${analysis}

## Dados CSV (Raw)
\`\`\`csv
${rawCsv}
\`\`\`
${CSV_CONTEXT_END}`
      setCsvContextText(contextMessage)
      setCsvModalOpen(false)
      setCsvFile(null)
    },
    []
  )

  // Handle OCR cancel
  const handleOcrCancel = useCallback(() => {
    setOcrImageFile(null)
  }, [])

  // Handle CSV cancel
  const handleCsvCancel = useCallback(() => {
    setCsvFile(null)
  }, [])

  /**
   * Validate file via backend API (optional, for security)
   */
  const validateFileBackend = useCallback(
    async (file: File): Promise<{ valid: boolean; error?: string }> => {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/attachments/validate', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (!result.valid) {
          return {
            valid: false,
            error: result.errors?.join(', ') || 'Arquivo inválido',
          }
        }

        return { valid: true }
      } catch {
        // If validation endpoint fails, allow file (fallback to client validation)
        console.warn(
          '[ChatInput] Backend validation failed, using client-side only'
        )
        return { valid: true }
      }
    },
    []
  )

  // Handle file selection
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      const newFiles: AttachedFile[] = []
      const remainingSlots = maxFiles - attachedFiles.length
      const rejectedFiles: Array<{ name: string; reason: string }> = []

      const imagesToProcess: Array<{ file: File; index: number }> = []
      const textFilesToProcess: Array<{ file: File; index: number }> = []

      // Process files with validation
      for (const file of Array.from(files).slice(0, remainingSlots)) {
        // Client-side size validation
        if (file.size > MAX_FILE_SIZE_BYTES) {
          rejectedFiles.push({
            name: file.name,
            reason: `excede ${MAX_FILE_SIZE_MB}MB`,
          })
          continue
        }

        // Client-side empty file validation
        if (file.size === 0) {
          rejectedFiles.push({
            name: file.name,
            reason: 'arquivo vazio',
          })
          continue
        }

        // Backend validation (async, but non-blocking for UX)
        const validation = await validateFileBackend(file)
        if (!validation.valid) {
          rejectedFiles.push({
            name: file.name,
            reason: validation.error || 'arquivo inválido',
          })
          continue
        }

        const processingIndex = ++globalProcessingIndex

        const attachedFile: AttachedFile = {
          id: generateId(),
          file,
          processingIndex,
          processingStatus: 'pending',
        }

        // Create preview for images and mark for OCR processing
        if (isImageFile(file)) {
          attachedFile.preview = URL.createObjectURL(file)
          imagesToProcess.push({ file, index: processingIndex })
        } else if (isTextFile(file)) {
          // Mark text files (including CSV) for processing
          textFilesToProcess.push({ file, index: processingIndex })
        }

        newFiles.push(attachedFile)
      }

      // Show toast for rejected files
      if (rejectedFiles.length > 0) {
        toast({
          variant: 'destructive',
          title: `${rejectedFiles.length} arquivo(s) rejeitado(s)`,
          description: rejectedFiles
            .map(f => `${f.name}: ${f.reason}`)
            .join('; '),
        })
      }

      if (newFiles.length > 0) {
        setAttachedFiles(prev => [...prev, ...newFiles])

        // Notify parent about images to process (for OCR)
        if (imagesToProcess.length > 0 && onImagesAttached) {
          onImagesAttached(imagesToProcess)
        }

        // Notify parent about text files to process (including CSV)
        if (textFilesToProcess.length > 0 && onTextFilesAttached) {
          onTextFilesAttached(textFilesToProcess)
        }
      }

      // Reset input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [
      attachedFiles.length,
      maxFiles,
      onImagesAttached,
      onTextFilesAttached,
      validateFileBackend,
    ]
  )

  // Remove attached file
  const handleRemoveFile = useCallback(
    (fileId: string) => {
      setAttachedFiles(prev => {
        const fileToRemove = prev.find(f => f.id === fileId)
        // Revoke object URL to prevent memory leaks
        if (fileToRemove?.preview) {
          URL.revokeObjectURL(fileToRemove.preview)
        }
        // Notify parent to cancel processing (after state update)
        if (fileToRemove?.processingIndex && onFileRemoved) {
          const type = isImageFile(fileToRemove.file) ? 'image' : 'text'
          // Use setTimeout to defer the call until after render
          setTimeout(() => {
            onFileRemoved(fileToRemove.processingIndex!, type)
          }, 0)
        }
        return prev.filter(f => f.id !== fileId)
      })
    },
    [onFileRemoved]
  )

  // Open file picker
  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  // Handle popover open - load documents if needed
  const handlePopoverOpenChange = (open: boolean) => {
    setIsPopoverOpen(open)
    if (open && onLoadDocuments) {
      onLoadDocuments()
    }
  }

  // Handle document selection from project
  const handleDocumentToggle = (document: ProjectDocument) => {
    setSelectedDocuments(prev => {
      const isSelected = prev.some(d => d.id === document.id)
      if (isSelected) {
        return prev.filter(d => d.id !== document.id)
      } else {
        if (onDocumentSelect) {
          onDocumentSelect(document)
        }
        return [...prev, document]
      }
    })
  }

  // Remove selected document
  const handleRemoveDocument = (documentId: string) => {
    setSelectedDocuments(prev => prev.filter(d => d.id !== documentId))
  }

  // Remove OCR context
  const handleRemoveOcrContext = useCallback(() => {
    setOcrContextText(null)
  }, [])

  // Remove CSV context
  const handleRemoveCsvContext = useCallback(() => {
    setCsvContextText(null)
  }, [])

  const handleSubmit = () => {
    // Include OCR and CSV context in the check for empty submission
    const hasOcrContext = !!ocrContextText
    const hasCsvContext = !!csvContextText
    if (
      (!message.trim() &&
        attachedFiles.length === 0 &&
        selectedDocuments.length === 0 &&
        !hasOcrContext &&
        !hasCsvContext) ||
      isLoading
    )
      return

    // Combine message with contexts if present
    let finalMessage = message.trim()

    // Add CSV context first (if present)
    if (csvContextText) {
      finalMessage =
        csvContextText + (finalMessage ? '\n\n' + finalMessage : '')
    }

    // Add OCR context (if present)
    if (ocrContextText) {
      finalMessage =
        ocrContextText + (finalMessage ? '\n\n' + finalMessage : '')
    }

    const filesToSend = attachedFiles.map(af => af.file)
    onSendMessage(
      finalMessage,
      filesToSend.length > 0 ? filesToSend : undefined,
      selectedDocuments.length > 0 ? selectedDocuments : undefined
    )

    // Clear state
    setMessage('')
    setOcrContextText(null) // Clear OCR context
    setCsvContextText(null) // Clear CSV context
    // Revoke all object URLs
    attachedFiles.forEach(af => {
      if (af.preview) URL.revokeObjectURL(af.preview)
    })
    setAttachedFiles([])
    setSelectedDocuments([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  /**
   * Handles paste events on the textarea to detect and process pasted images.
   * Extracts images from clipboard, validates size and format, and adds them to attached files.
   * Supports multiple images pasted simultaneously with individual validation.
   *
   * @remarks
   * - Images are added directly to attachedFiles (no modal) for ChatGPT-like UX
   * - OCR processing happens in background via onImagesAttached callback
   * - Validates file size (max 10MB) and format (PNG, JPG, WEBP, BMP, GIF)
   * - Shows error toasts only when validation fails or limit reached
   * - Prevents default paste behavior to avoid pasting blob URLs as text
   *
   * @param e - React ClipboardEvent from textarea paste
   *
   * @example
   * ```tsx
   * <Textarea onPaste={handlePaste} />
   * ```
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items
      if (!items) return

      const remainingSlots = maxFiles - attachedFiles.length

      // Check if there are available slots for new files
      if (remainingSlots === 0) {
        toast({
          variant: 'destructive',
          title: 'Limite de arquivos atingido',
          description: `Máximo de ${maxFiles} arquivos. Remova alguns para adicionar novos.`,
        })
        return
      }

      const pastedFiles: File[] = []
      const rejectedFiles: Array<{ name: string; reason: string }> = []
      const MAX_SIZE = 10 * 1024 * 1024 // 10MB max file size

      // Extract and validate each image from clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) continue

          // Validate file size (10MB maximum)
          if (file.size > MAX_SIZE) {
            rejectedFiles.push({
              name: file.name || 'imagem',
              reason: `muito grande (${formatFileSize(file.size)}). Máximo: 10MB`,
            })
            continue
          }

          // Validate image format using OCR service validator
          if (!isOcrSupportedImage(file)) {
            rejectedFiles.push({
              name: file.name || 'imagem',
              reason: 'formato não suportado. Use PNG, JPG, WEBP, BMP ou GIF',
            })
            continue
          }

          pastedFiles.push(file)
        }
      }

      // Display error toast for rejected files with specific reasons
      if (rejectedFiles.length > 0) {
        toast({
          variant: 'destructive',
          title: `${rejectedFiles.length} imagem(ns) rejeitada(s)`,
          description: rejectedFiles
            .map(f => `${f.name}: ${f.reason}`)
            .join('; '),
        })
      }

      if (pastedFiles.length === 0) return

      e.preventDefault() // Prevent pasting blob URL as text

      const newFiles: AttachedFile[] = []
      const imagesToProcess: Array<{ file: File; index: number }> = []

      // Create AttachedFile objects with preview URLs
      pastedFiles.slice(0, remainingSlots).forEach(file => {
        const processingIndex = ++globalProcessingIndex

        const attachedFile: AttachedFile = {
          id: generateId(),
          file,
          preview: URL.createObjectURL(file),
          processingIndex,
          processingStatus: 'pending',
        }

        newFiles.push(attachedFile)
        imagesToProcess.push({ file, index: processingIndex })
      })

      setAttachedFiles(prev => [...prev, ...newFiles])

      // Notify parent component to trigger background OCR processing
      if (imagesToProcess.length > 0 && onImagesAttached) {
        onImagesAttached(imagesToProcess)
      }
    },
    [attachedFiles.length, maxFiles, onImagesAttached, toast]
  )

  const hasAttachments = attachedFiles.length > 0
  const hasDocuments = selectedDocuments.length > 0
  const hasOcrContext = !!ocrContextText
  const hasCsvContext = !!csvContextText
  const canAddMoreFiles = attachedFiles.length < maxFiles
  const hasAgentSelector = availableAgents.length > 0 && onAgentChange

  return (
    <div className="border-t border-border bg-background px-3 py-3 sm:px-6 sm:py-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main Input Area - Full width with relative position for attachment button */}
      <div className="relative flex w-full items-start gap-2 sm:gap-3">
        {/* Attachment Button - Left side, separate from input */}
        <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'size-9 shrink-0 rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground sm:size-10',
                (hasAttachments || hasDocuments) &&
                  'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary'
              )}
              disabled={isLoading || isAgentLoading}
              title="Anexar arquivos ou selecionar artefatos compartilhados"
            >
              <Paperclip className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="top"
            className="w-72 p-0 sm:w-80"
            sideOffset={8}
          >
            <div className="flex flex-col">
              {/* Header */}
              <div className="border-b border-border px-4 py-3">
                <h4 className="text-sm font-semibold text-foreground">
                  {t('sda2.workspace.attachToChat' as any)}
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('sda2.workspace.selectArtifactsOrUpload' as any)}
                </p>
              </div>

              {/* Compartilhados comigo Section */}
              <div className="border-b border-border px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('sda2.workspace.sharedWithMe' as any)}
                  </span>
                  {isLoadingDocuments && (
                    <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Uploads List */}
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {projectDocuments.length === 0 && !isLoadingDocuments ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      {t('sda2.workspace.noSharedArtifacts' as any)}
                    </p>
                  ) : (
                    projectDocuments.map(doc => {
                      const isSelected = selectedDocuments.some(
                        d => d.key === doc.key
                      )
                      return (
                        <button
                          key={doc.key}
                          type="button"
                          onClick={() => handleDocumentToggle(doc)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-secondary'
                          )}
                        >
                          <FileText
                            className={cn(
                              'size-4 shrink-0',
                              isSelected
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'truncate text-sm',
                                isSelected ? 'font-medium' : 'text-foreground'
                              )}
                            >
                              {doc.name}
                            </p>
                            {doc.type && (
                              <p className="truncate text-xs text-muted-foreground">
                                {doc.type}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <div className="size-4 shrink-0 rounded-full bg-primary text-primary-foreground">
                              <svg
                                className="size-4"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                              >
                                <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                              </svg>
                            </div>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Meus Artefatos (My Artifacts) Section */}
              <div className="border-b border-border px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('sda2.workspace.myArtifacts' as any)}
                  </span>
                </div>

                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {myDocuments.length === 0 ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      {t('sda2.workspace.noFinalizedArtifacts' as any)}
                    </p>
                  ) : (
                    myDocuments.map(doc => {
                      const isSelected = selectedDocuments.some(
                        d => d.key === doc.key
                      )
                      return (
                        <button
                          key={doc.key}
                          type="button"
                          onClick={() => handleDocumentToggle(doc)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-secondary'
                          )}
                        >
                          <FileText
                            className={cn(
                              'size-4 shrink-0',
                              isSelected
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'truncate text-sm',
                                isSelected ? 'font-medium' : 'text-foreground'
                              )}
                            >
                              {doc.name}
                            </p>
                            {doc.type && (
                              <p className="truncate text-xs text-muted-foreground">
                                {doc.type}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <div className="size-4 shrink-0 rounded-full bg-primary text-primary-foreground">
                              <svg
                                className="size-4"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                              >
                                <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                              </svg>
                            </div>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Upload Section */}
              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    // Primeiro fecha o popover
                    setIsPopoverOpen(false)
                    // Depois abre o file picker com um pequeno delay
                    // para evitar que o fechamento do popover cancele o click do input
                    setTimeout(() => {
                      handleAttachmentClick()
                    }, 100)
                  }}
                  disabled={!canAddMoreFiles}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors',
                    canAddMoreFiles
                      ? 'hover:bg-secondary'
                      : 'cursor-not-allowed opacity-50'
                  )}
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                    <Plus className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {t('sda2.workspace.uploadFile' as any)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {canAddMoreFiles
                        ? t('sda2.workspace.supportedFormats' as any)
                        : t('sda2.workspace.limitReached' as any)}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Input and Send Button - Right side */}
        <div className="flex-1">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 shadow-sm">
            {/* NOVO: Seletor de Agente */}
            {hasAgentSelector && (
              <div className="flex shrink-0 items-center gap-1">
                <Select
                  value={selectedAgent}
                  onValueChange={onAgentChange}
                  disabled={isAgentLoading}
                >
                  <SelectTrigger className="h-8 w-32 border-0 bg-transparent text-xs shadow-none focus:ring-0 sm:w-44">
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supervisor">
                      <div className="flex items-center gap-2">
                        <Users className="size-4" />
                        <span className="text-sm">Supervisor</span>
                      </div>
                    </SelectItem>
                    {availableAgents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <Bot className="size-4" />
                          <span className="text-sm">{agent.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAgentLoading && (
                  <Loader2 className="size-4 animate-spin text-orange-500" />
                )}
              </div>
            )}

            {/* Text Input */}
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setMessage(e.target.value)
                  // Auto-resize textarea based on content (no max limit)
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto'
                    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
                  }
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={t('sda2.workspace.continueConversation' as any)}
                className="min-h-[24px] max-h-[50vh] resize-none overflow-y-auto border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                rows={1}
                disabled={isLoading || isAgentLoading}
              />
            </div>

            <Button
              size="icon"
              className="size-8 shrink-0 rounded-full bg-orange-500 hover:bg-orange-600"
              onClick={handleSubmit}
              disabled={
                (!message.trim() &&
                  !hasAttachments &&
                  !hasDocuments &&
                  !hasOcrContext &&
                  !hasCsvContext) ||
                isLoading ||
                isAgentLoading
              }
            >
              <Send className="size-4" />
            </Button>
          </div>

          {/* Selected Documents Preview - Below input bar */}
          {hasDocuments && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="group relative flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 pr-8"
                >
                  <FileText className="size-5 text-orange-500" />
                  <div className="flex flex-col">
                    <span className="max-w-[150px] truncate text-sm font-medium text-orange-700">
                      {doc.name}
                    </span>
                    <span className="text-xs text-orange-400">
                      Documento do projeto
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(doc.id)}
                    className={cn(
                      'absolute right-1 top-1 rounded-full p-1',
                      'text-orange-400 hover:bg-orange-100 hover:text-orange-600',
                      'transition-colors'
                    )}
                    aria-label={`Remover ${doc.name}`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Attached Files Preview - Below input bar */}
          {hasAttachments && (
            <div className="mt-3 flex flex-wrap gap-2">
              {attachedFiles.map((attachedFile, index) => {
                const Icon = getFileIcon(attachedFile.file)
                const isImage = isImageFile(attachedFile.file)

                // Get status from parent map (if available) or use local values
                const parentStatus = fileProcessingStatus?.get(index)
                const status =
                  parentStatus?.status ||
                  attachedFile.processingStatus ||
                  'pending'
                const progress =
                  parentStatus?.progress ?? attachedFile.processingProgress ?? 0
                const errorMsg =
                  parentStatus?.error || attachedFile.processingError

                // Border and background colors based on status
                const statusStyles = {
                  pending: 'border-gray-200 bg-gray-50',
                  processing: 'border-orange-200 bg-orange-50',
                  completed: 'border-green-200 bg-green-50',
                  error: 'border-red-200 bg-red-50',
                }

                return (
                  <div
                    key={attachedFile.id}
                    className={cn(
                      'group relative flex min-w-[180px] flex-col gap-1 rounded-lg border px-3 py-2 pr-8',
                      statusStyles[status]
                    )}
                  >
                    {/* Top row: Icon + File Info + Status */}
                    <div className="flex items-center gap-2">
                      {/* File Icon or Image Preview */}
                      {isImage && attachedFile.preview ? (
                        <img
                          src={attachedFile.preview}
                          alt={attachedFile.file.name}
                          className="size-8 rounded object-cover"
                        />
                      ) : (
                        <Icon
                          className={cn(
                            'size-5',
                            status === 'completed'
                              ? 'text-green-500'
                              : status === 'error'
                                ? 'text-red-500'
                                : status === 'processing'
                                  ? 'text-orange-500'
                                  : 'text-gray-500'
                          )}
                        />
                      )}

                      {/* File Info */}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span
                          className={cn(
                            'max-w-[120px] truncate text-sm font-medium',
                            status === 'completed'
                              ? 'text-green-700'
                              : status === 'error'
                                ? 'text-red-700'
                                : status === 'processing'
                                  ? 'text-orange-700'
                                  : 'text-gray-700'
                          )}
                          title={attachedFile.file.name}
                        >
                          {attachedFile.file.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatFileSize(attachedFile.file.size)}
                        </span>
                      </div>

                      {/* Status Icon */}
                      <div className="shrink-0">
                        {status === 'processing' && (
                          <Loader2 className="size-4 animate-spin text-orange-500" />
                        )}
                        {status === 'completed' && (
                          <CheckCircle2 className="size-4 text-green-500" />
                        )}
                        {status === 'error' && (
                          <AlertCircle className="size-4 text-red-500" />
                        )}
                      </div>
                    </div>

                    {/* Progress Bar (only when processing) */}
                    {status === 'processing' && (
                      <div className="h-1 w-full overflow-hidden rounded-full bg-orange-100">
                        <div
                          className="h-full bg-orange-500 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}

                    {/* Error message */}
                    {status === 'error' && errorMsg && (
                      <span
                        className="truncate text-xs text-red-600"
                        title={errorMsg}
                      >
                        {errorMsg}
                      </span>
                    )}

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(attachedFile.id)}
                      className={cn(
                        'absolute right-1 top-1 rounded-full p-1',
                        'text-gray-400 hover:bg-gray-200 hover:text-gray-600',
                        'transition-colors'
                      )}
                      aria-label={`Remover ${attachedFile.file.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Vision Analysis Context Preview - Below attached files */}
          {hasOcrContext && (
            <div className="mt-3">
              <div className="group relative rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 pr-8">
                <div className="flex items-center gap-2">
                  <FileImage className="size-5 text-purple-500" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-purple-700">
                      ✨ Contexto gerado por GPT-5.1 Vision
                    </span>
                    <span className="text-xs text-purple-500">
                      {ocrContextText?.split(/\s+/).filter(Boolean).length || 0}{' '}
                      palavras extraídas
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveOcrContext}
                  className={cn(
                    'absolute right-1 top-1 rounded-full p-1',
                    'text-purple-400 hover:bg-purple-100 hover:text-purple-600',
                    'transition-colors'
                  )}
                  aria-label="Remover contexto de análise de imagem"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          )}

          {/* CSV Analysis Context Preview */}
          {hasCsvContext && (
            <div className="mt-3">
              <div className="group relative rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 pr-8">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-5 text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-emerald-700">
                      📊 Análise CSV + Dados (GPT-5.1)
                    </span>
                    <span className="text-xs text-emerald-500">
                      {csvContextText?.split(/\s+/).filter(Boolean).length || 0}{' '}
                      palavras no contexto
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCsvContext}
                  className={cn(
                    'absolute right-1 top-1 rounded-full p-1',
                    'text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600',
                    'transition-colors'
                  )}
                  aria-label="Remover contexto de análise CSV"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vision Analysis Modal (GPT-5.1 Vision) */}
      <OcrPreviewModal
        open={ocrModalOpen}
        onOpenChange={setOcrModalOpen}
        imageFile={ocrImageFile}
        onInsertAsContext={handleOcrInsertAsContext}
        onCancel={handleOcrCancel}
      />

      {/* CSV Analysis Modal (GPT-5.1) */}
      <CsvPreviewModal
        open={csvModalOpen}
        onOpenChange={setCsvModalOpen}
        csvFile={csvFile}
        onInsertAsContext={handleCsvInsertAsContext}
        onCancel={handleCsvCancel}
      />
    </div>
  )
}
