/**
 * useOcr Hook
 *
 * Hook React para processamento OCR de imagens
 * Usa processamento server-side via API (Azure Vision / GPT-4V)
 */

'use client'

import { useCallback, useState } from 'react'

import type { OcrError, OcrResult, OcrSource } from '@/lib/ocr/types'

// ============================================================================
// TYPES
// ============================================================================

interface UseOcrOptions {
  /** Callback quando OCR completa */
  onComplete?: (result: OcrResult) => void
  /** Callback quando OCR falha */
  onError?: (error: OcrError) => void
}

interface UseOcrReturn {
  /** Extrai texto de um arquivo de imagem */
  extractText: (file: File) => Promise<OcrResult>
  /** Se está processando */
  isProcessing: boolean
  /** Progresso atual (0-100) */
  progress: number
  /** Status atual */
  status: string
  /** Último erro */
  error: OcrError | null
  /** Último resultado */
  result: OcrResult | null
  /** Reseta o estado */
  reset: () => void
}

// ============================================================================
// HOOK
// ============================================================================

export function useOcr(options: UseOcrOptions = {}): UseOcrReturn {
  const { onComplete, onError } = options

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState<OcrError | null>(null)
  const [result, setResult] = useState<OcrResult | null>(null)

  /**
   * Processa imagem no servidor via API
   */
  const processServerSide = useCallback(
    async (file: File): Promise<OcrResult> => {
      setProgress(10)
      setStatus('Enviando imagem...')

      const formData = new FormData()
      formData.append('file', file)

      setProgress(30)
      setStatus('Processando OCR...')

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      })

      setProgress(80)
      setStatus('Finalizando...')

      const data = await response.json()

      setProgress(100)
      setStatus('Concluído')

      if (!data.success) {
        return {
          success: false,
          text: '',
          confidence: 0,
          processingTimeMs: 0,
          source: (data.source || 'azure-vision') as OcrSource,
          error: data.error,
        }
      }

      return {
        success: true,
        text: data.text,
        confidence: data.confidence,
        processingTimeMs: data.processingTimeMs,
        source: data.source as OcrSource,
        warnings: data.warnings,
      }
    },
    []
  )

  /**
   * Extrai texto de uma imagem via API server-side
   */
  const extractText = useCallback(
    async (file: File): Promise<OcrResult> => {
      setIsProcessing(true)
      setProgress(0)
      setStatus('Iniciando...')
      setError(null)
      setResult(null)

      try {
        const ocrResult = await processServerSide(file)

        setResult(ocrResult)

        if (ocrResult.success) {
          onComplete?.(ocrResult)
        } else if (ocrResult.error) {
          setError(ocrResult.error)
          onError?.(ocrResult.error)
        }

        return ocrResult
      } catch (err) {
        const ocrError: OcrError = {
          code: 'UNKNOWN',
          message: err instanceof Error ? err.message : 'Erro desconhecido',
          retryable: true,
        }

        setError(ocrError)
        onError?.(ocrError)

        return {
          success: false,
          text: '',
          confidence: 0,
          processingTimeMs: 0,
          source: 'azure-vision',
          error: ocrError,
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [processServerSide, onComplete, onError]
  )

  /**
   * Reseta o estado do hook
   */
  const reset = useCallback(() => {
    setIsProcessing(false)
    setProgress(0)
    setStatus('')
    setError(null)
    setResult(null)
  }, [])

  return {
    extractText,
    isProcessing,
    progress,
    status,
    error,
    result,
    reset,
  }
}

export default useOcr
