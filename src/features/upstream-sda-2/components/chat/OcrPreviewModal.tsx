'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  Copy,
  FileImage,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Textarea } from '@/shared/components/ui/textarea'

// ============================================================================
// TYPES
// ============================================================================

interface OcrPreviewModalProps {
  /** Modal open state */
  open: boolean
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void
  /** Image file being processed */
  imageFile: File | null
  /** Callback to insert text as context in chat */
  onInsertAsContext: (text: string) => void
  /** Callback when canceling/closing without inserting */
  onCancel: () => void
}

interface VisionResult {
  success: boolean
  text: string
  confidence: number
  processingTimeMs: number
  source: string
  detectedType?: string
  error?: {
    code: string
    message: string
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OcrPreviewModal({
  open,
  onOpenChange,
  imageFile,
  onInsertAsContext,
  onCancel,
}: OcrPreviewModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [editedText, setEditedText] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  // Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<VisionResult | null>(
    null
  )
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [detectedType, setDetectedType] = useState<string>('')

  // Generate image preview URL
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImagePreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setImagePreview(null)
    return undefined
  }, [imageFile])

  // Handle AI Analysis with GPT-4 Vision
  const handleAnalyze = useCallback(async () => {
    if (!imageFile) return

    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysisResult(null)

    try {
      const formData = new FormData()
      formData.append('image', imageFile)

      const response = await fetch('/api/ocr/vision', {
        method: 'POST',
        body: formData,
      })

      const data: VisionResult = await response.json()

      if (data.success && data.text) {
        setAnalysisResult(data)
        setEditedText(data.text)
        setDetectedType(data.detectedType || 'general')
      } else {
        setAnalysisError(data.error?.message || 'Falha na análise da imagem')
      }
    } catch (error) {
      console.error('Vision Analysis error:', error)
      setAnalysisError(
        error instanceof Error ? error.message : 'Erro na análise da imagem'
      )
    } finally {
      setIsAnalyzing(false)
    }
  }, [imageFile])

  // Auto-analyze when modal opens with an image
  useEffect(() => {
    if (
      open &&
      imageFile &&
      !analysisResult &&
      !isAnalyzing &&
      !analysisError
    ) {
      handleAnalyze()
    }
  }, [
    open,
    imageFile,
    analysisResult,
    isAnalyzing,
    analysisError,
    handleAnalyze,
  ])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setIsCopied(false)
      setAnalysisResult(null)
      setAnalysisError(null)
      setIsAnalyzing(false)
      setEditedText('')
      setDetectedType('')
    }
  }, [open])

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editedText)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      console.error('Failed to copy text')
    }
  }, [editedText])

  // Handle insert as context
  const handleInsert = useCallback(() => {
    if (editedText.trim()) {
      onInsertAsContext(editedText.trim())
      onOpenChange(false)
    }
  }, [editedText, onInsertAsContext, onOpenChange])

  // Handle close
  const handleClose = useCallback(() => {
    onCancel()
    onOpenChange(false)
  }, [onCancel, onOpenChange])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Render content based on state
  const renderContent = () => {
    // Processing state
    if (isAnalyzing) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping rounded-full bg-purple-200 opacity-75" />
            <div className="relative rounded-full bg-purple-100 p-4">
              <Sparkles className="size-8 text-purple-600" />
            </div>
          </div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            Analisando imagem com GPT-5.1 Vision...
          </p>
          <p className="text-xs text-gray-500">
            Detectando tipo de conteúdo e extraindo informações com reasoning
          </p>
        </div>
      )
    }

    // Error state
    if (analysisError) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="mb-4 rounded-full bg-red-100 p-3">
            <AlertCircle className="size-8 text-red-500" />
          </div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            Falha na análise da imagem
          </p>
          <p className="mb-4 max-w-sm text-center text-xs text-gray-500">
            {analysisError}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            className="gap-2"
          >
            <RefreshCw className="size-4" />
            Tentar novamente
          </Button>
        </div>
      )
    }

    // Success state - show result
    if (analysisResult) {
      const wordCount = editedText.trim().split(/\s+/).filter(Boolean).length

      return (
        <div className="flex flex-col gap-4">
          {/* Result info bar */}
          <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-purple-50 to-green-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                Análise concluída
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">
                {detectedType}
              </span>
              <span>•</span>
              <span>{wordCount} palavras</span>
              <span>•</span>
              <span>{analysisResult.processingTimeMs}ms</span>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Você pode editar o texto antes de inserir como contexto:
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={handleCopy}
            >
              {isCopied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
              {isCopied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>

          {/* Editable text content */}
          <Textarea
            value={editedText}
            onChange={e => setEditedText(e.target.value)}
            className="max-h-[300px] min-h-[200px] resize-none font-mono text-sm"
            placeholder="Conteúdo extraído aparecerá aqui..."
          />

          {/* Context notice */}
          <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
            <p className="text-xs text-purple-700">
              <strong>✨ Contexto Inteligente:</strong> O conteúdo será anexado
              como contexto interno para o agente de IA, sem aparecer na sua
              mensagem.
            </p>
          </div>
        </div>
      )
    }

    // Initial state
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <FileImage className="size-12 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">Aguardando imagem...</p>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-purple-500" />
            Análise de Imagem com GPT-5.1 Vision
          </DialogTitle>
          <DialogDescription>
            GPT-5.1 Vision com reasoning analisa automaticamente sua imagem e
            extrai informações estruturadas de alta qualidade.
          </DialogDescription>
        </DialogHeader>

        {/* Image preview */}
        {imageFile && imagePreview && (
          <div className="mb-4 flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <img
              src={imagePreview}
              alt={imageFile.name}
              className="h-20 w-auto max-w-[120px] rounded border border-gray-200 object-contain"
            />
            <div className="flex-1">
              <p className="max-w-[300px] truncate text-sm font-medium text-gray-700">
                {imageFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(imageFile.size)}
              </p>
              <p className="mt-1 text-xs text-gray-400">{imageFile.type}</p>
            </div>
          </div>
        )}

        {/* Main content area */}
        {renderContent()}

        {/* Action buttons */}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {analysisResult && editedText.trim() && (
            <Button
              onClick={handleInsert}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Check className="size-4" />
              Inserir como Contexto
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
