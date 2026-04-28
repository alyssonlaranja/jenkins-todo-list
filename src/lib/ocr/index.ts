/**
 * OCR Library - Public Exports
 *
 * @license Apache-2.0
 */

// Main service
export {
  performOcr,
  isOcrSupportedImage,
  formatOcrContextMessage,
  removeImageContext,
  hasImageContext,
  removeCsvContext,
  hasCsvContext,
  removeAllContexts,
  IMAGE_CONTEXT_START,
  IMAGE_CONTEXT_END,
  CSV_CONTEXT_START,
  CSV_CONTEXT_END,
} from './ocr-service'

// Configuration
export {
  getOcrConfig,
  DEFAULT_OCR_CONFIG,
  OCR_ERROR_MESSAGES,
  formatErrorMessage,
  isSupportedMimeType,
  getSupportedExtensions,
} from './ocr-config'

// Types
export type {
  OcrConfig,
  OcrResult,
  OcrError,
  OcrErrorCode,
  OcrSource,
  OcrRequest,
  OcrContextMessage,
  OcrProgressCallback,
  OcrProviderStatus,
} from './types'
