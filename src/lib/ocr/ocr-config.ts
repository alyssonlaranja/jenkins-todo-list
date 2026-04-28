/**
 * OCR Configuration
 *
 * Configurações do sistema de OCR
 */

import type { OcrConfig, OcrErrorCode } from './types'

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_OCR_CONFIG: OcrConfig = {
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/bmp',
    'image/gif',
  ],
  timeoutMs: 60000, // 60 segundos
  enableAzureVisionFallback: true, // Azure como primário
  enableGpt4vFallback: true, // GPT-4V como fallback
  preferredLanguages: ['por', 'eng', 'spa'],
  preferClientSide: true, // Preferir processamento no browser
}

// ============================================================================
// ERROR MESSAGES (i18n ready)
// ============================================================================

export const OCR_ERROR_MESSAGES: Record<OcrErrorCode, string> = {
  FILE_TOO_LARGE: 'A imagem excede o tamanho máximo permitido de {maxSize}MB',
  INVALID_FORMAT: 'Formato de imagem não suportado. Use PNG, JPG, WEBP ou BMP',
  UNREADABLE_IMAGE:
    'Não foi possível extrair texto desta imagem. Verifique a qualidade e tente novamente',
  SERVICE_UNAVAILABLE:
    'Serviço de OCR temporariamente indisponível. Tente novamente em alguns instantes',
  TIMEOUT:
    'O processamento demorou mais que o esperado. Tente com uma imagem menor ou mais clara',
  RATE_LIMITED: 'Muitas requisições. Aguarde alguns segundos e tente novamente',
  NOT_CONFIGURED:
    'Serviço de OCR não configurado. Verifique as variáveis de ambiente',
  UNKNOWN: 'Erro inesperado ao processar a imagem',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtém a configuração de OCR com valores de ambiente
 */
export function getOcrConfig(): OcrConfig {
  return {
    ...DEFAULT_OCR_CONFIG,
    maxFileSizeBytes:
      parseInt(process.env.OCR_MAX_FILE_SIZE_MB || '10') * 1024 * 1024,
    timeoutMs: parseInt(process.env.OCR_TIMEOUT_MS || '60000'),
    enableAzureVisionFallback:
      process.env.OCR_ENABLE_AZURE_FALLBACK !== 'false',
    enableGpt4vFallback: process.env.OCR_ENABLE_GPT4V_FALLBACK !== 'false',
    preferClientSide: process.env.OCR_PREFER_CLIENT_SIDE !== 'false',
  }
}

/**
 * Formata mensagem de erro com parâmetros
 */
export function formatErrorMessage(
  code: OcrErrorCode,
  params?: Record<string, string | number>
): string {
  let message = OCR_ERROR_MESSAGES[code]

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, String(value))
    })
  }

  return message
}

/**
 * Verifica se um tipo MIME é suportado
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return DEFAULT_OCR_CONFIG.allowedMimeTypes.includes(mimeType)
}

/**
 * Obtém extensões de arquivo suportadas
 */
export function getSupportedExtensions(): string[] {
  return ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif']
}
