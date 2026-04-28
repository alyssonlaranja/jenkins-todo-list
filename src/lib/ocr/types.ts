/**
 * OCR Types
 *
 * Tipos TypeScript para o sistema de OCR
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface OcrConfig {
  /** Tamanho máximo do arquivo em bytes (default: 10MB) */
  maxFileSizeBytes: number
  /** Tipos MIME permitidos */
  allowedMimeTypes: string[]
  /** Timeout em ms para a requisição OCR */
  timeoutMs: number
  /** Habilitar Azure Vision como provedor primário */
  enableAzureVisionFallback: boolean
  /** Habilitar fallback GPT-4V */
  enableGpt4vFallback: boolean
  /** Idiomas preferenciais para OCR */
  preferredLanguages: string[]
  /** Usar processamento client-side quando possível */
  preferClientSide: boolean
}

// ============================================================================
// RESULTS
// ============================================================================

export interface OcrResult {
  /** Se a extração foi bem-sucedida */
  success: boolean
  /** Texto extraído */
  text: string
  /** Confiança da extração (0-1) */
  confidence: number
  /** Idioma detectado */
  language?: string
  /** Tempo de processamento em ms */
  processingTimeMs: number
  /** Fonte do OCR */
  source: OcrSource
  /** Avisos durante o processamento */
  warnings?: string[]
  /** Erro se falhou */
  error?: OcrError
}

export type OcrSource = 'azure-vision' | 'gpt4v'

// ============================================================================
// ERRORS
// ============================================================================

export interface OcrError {
  code: OcrErrorCode
  message: string
  details?: string
  retryable: boolean
}

export type OcrErrorCode =
  | 'FILE_TOO_LARGE'
  | 'INVALID_FORMAT'
  | 'UNREADABLE_IMAGE'
  | 'SERVICE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN'

// ============================================================================
// REQUESTS
// ============================================================================

export interface OcrRequest {
  file: File
  options?: Partial<OcrConfig>
}

// ============================================================================
// CONTEXT MESSAGE
// ============================================================================

export interface OcrContextMessage {
  type: 'ocr-context'
  text: string
  sourceImage: string
  timestamp: Date
  confidence: number
  source: OcrSource
}

// ============================================================================
// PROGRESS
// ============================================================================

export type OcrProgressCallback = (progress: number, status: string) => void

// ============================================================================
// PROVIDER STATUS
// ============================================================================

export interface OcrProviderStatus {
  azureVision: 'configured' | 'not_configured'
  gpt4v: 'configured' | 'not_configured'
}
