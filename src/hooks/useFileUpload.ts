/**
 * useFileUpload Hook
 *
 * Custom hook for file upload with:
 * - Progress tracking (via XMLHttpRequest)
 * - Validation before upload
 * - Abort capability
 * - Error handling
 *
 * @license Apache-2.0
 */
import { useCallback, useRef, useState } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface UploadProgress {
  fileId: string
  fileName: string
  progress: number // 0-100
  status: 'pending' | 'validating' | 'uploading' | 'completed' | 'error'
  error?: string
  attachmentId?: string
}

export interface UploadOptions {
  conversationId?: string
  messageId?: string
  onProgress?: (progress: UploadProgress) => void
  onComplete?: (result: UploadProgress) => void
  onError?: (error: UploadProgress) => void
  validateFirst?: boolean
}

export interface UseFileUploadReturn {
  uploadFile: (file: File, options?: UploadOptions) => Promise<UploadProgress>
  uploadFiles: (
    files: File[],
    options?: UploadOptions
  ) => Promise<UploadProgress[]>
  validateFile: (file: File) => Promise<ValidationResult>
  abortUpload: (fileId: string) => void
  abortAll: () => void
  uploads: Map<string, UploadProgress>
  isUploading: boolean
}

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
// HELPERS
// ============================================================================

function generateFileId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// ============================================================================
// HOOK
// ============================================================================

export function useFileUpload(): UseFileUploadReturn {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())
  const abortControllersRef = useRef<Map<string, XMLHttpRequest>>(new Map())

  /**
   * Update upload progress in state
   */
  const updateUpload = useCallback(
    (fileId: string, update: Partial<UploadProgress>) => {
      setUploads(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(fileId)
        if (existing) {
          newMap.set(fileId, { ...existing, ...update })
        }
        return newMap
      })
    },
    []
  )

  /**
   * Validate file via backend API
   */
  const validateFile = useCallback(
    async (file: File): Promise<ValidationResult> => {
      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('/api/attachments/validate', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()
        return result
      } catch (error) {
        return {
          valid: false,
          errors: ['Erro ao validar arquivo'],
          warnings: [],
        }
      }
    },
    []
  )

  /**
   * Upload a single file with progress tracking
   */
  const uploadFile = useCallback(
    async (file: File, options?: UploadOptions): Promise<UploadProgress> => {
      const fileId = generateFileId()
      const initialProgress: UploadProgress = {
        fileId,
        fileName: file.name,
        progress: 0,
        status: 'pending',
      }

      setUploads(prev => {
        const newMap = new Map(prev)
        newMap.set(fileId, initialProgress)
        return newMap
      })

      // Step 1: Validate (optional)
      if (options?.validateFirst !== false) {
        updateUpload(fileId, { status: 'validating', progress: 5 })
        options?.onProgress?.({
          ...initialProgress,
          status: 'validating',
          progress: 5,
        })

        const validation = await validateFile(file)

        if (!validation.valid) {
          const errorProgress: UploadProgress = {
            fileId,
            fileName: file.name,
            progress: 0,
            status: 'error',
            error: validation.errors.join(', '),
          }
          updateUpload(fileId, errorProgress)
          options?.onError?.(errorProgress)
          return errorProgress
        }
      }

      // Step 2: Upload with XMLHttpRequest for progress tracking
      return new Promise<UploadProgress>(resolve => {
        const xhr = new XMLHttpRequest()
        abortControllersRef.current.set(fileId, xhr)

        const formData = new FormData()
        formData.append('file', file)
        if (options?.conversationId) {
          formData.append('conversationId', options.conversationId)
        }
        if (options?.messageId) {
          formData.append('messageId', options.messageId)
        }

        xhr.upload.onprogress = event => {
          if (event.lengthComputable) {
            // Scale progress: 10-95% for actual upload
            const uploadProgress =
              Math.round((event.loaded / event.total) * 85) + 10
            const progress: UploadProgress = {
              fileId,
              fileName: file.name,
              progress: uploadProgress,
              status: 'uploading',
            }
            updateUpload(fileId, progress)
            options?.onProgress?.(progress)
          }
        }

        xhr.onload = () => {
          abortControllersRef.current.delete(fileId)

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText)
              const completedProgress: UploadProgress = {
                fileId,
                fileName: file.name,
                progress: 100,
                status: 'completed',
                attachmentId: response.attachment?.id,
              }
              updateUpload(fileId, completedProgress)
              options?.onComplete?.(completedProgress)
              resolve(completedProgress)
            } catch {
              const errorProgress: UploadProgress = {
                fileId,
                fileName: file.name,
                progress: 0,
                status: 'error',
                error: 'Erro ao processar resposta',
              }
              updateUpload(fileId, errorProgress)
              options?.onError?.(errorProgress)
              resolve(errorProgress)
            }
          } else {
            let errorMessage = 'Erro no upload'
            try {
              const response = JSON.parse(xhr.responseText)
              errorMessage = response.error || errorMessage
            } catch {
              // ignore parse error
            }

            const errorProgress: UploadProgress = {
              fileId,
              fileName: file.name,
              progress: 0,
              status: 'error',
              error: errorMessage,
            }
            updateUpload(fileId, errorProgress)
            options?.onError?.(errorProgress)
            resolve(errorProgress)
          }
        }

        xhr.onerror = () => {
          abortControllersRef.current.delete(fileId)
          const errorProgress: UploadProgress = {
            fileId,
            fileName: file.name,
            progress: 0,
            status: 'error',
            error: 'Falha na conexão',
          }
          updateUpload(fileId, errorProgress)
          options?.onError?.(errorProgress)
          resolve(errorProgress)
        }

        xhr.onabort = () => {
          abortControllersRef.current.delete(fileId)
          const abortedProgress: UploadProgress = {
            fileId,
            fileName: file.name,
            progress: 0,
            status: 'error',
            error: 'Upload cancelado',
          }
          updateUpload(fileId, abortedProgress)
          resolve(abortedProgress)
        }

        updateUpload(fileId, { status: 'uploading', progress: 10 })
        options?.onProgress?.({
          ...initialProgress,
          status: 'uploading',
          progress: 10,
        })

        xhr.open('POST', '/api/attachments')
        xhr.send(formData)
      })
    },
    [updateUpload, validateFile]
  )

  /**
   * Upload multiple files
   */
  const uploadFiles = useCallback(
    async (
      files: File[],
      options?: UploadOptions
    ): Promise<UploadProgress[]> => {
      const results = await Promise.all(
        files.map(file => uploadFile(file, options))
      )
      return results
    },
    [uploadFile]
  )

  /**
   * Abort a specific upload
   */
  const abortUpload = useCallback((fileId: string) => {
    const xhr = abortControllersRef.current.get(fileId)
    if (xhr) {
      xhr.abort()
      abortControllersRef.current.delete(fileId)
    }
  }, [])

  /**
   * Abort all uploads
   */
  const abortAll = useCallback(() => {
    abortControllersRef.current.forEach(xhr => xhr.abort())
    abortControllersRef.current.clear()
  }, [])

  const isUploading = Array.from(uploads.values()).some(
    u => u.status === 'uploading' || u.status === 'validating'
  )

  return {
    uploadFile,
    uploadFiles,
    validateFile,
    abortUpload,
    abortAll,
    uploads,
    isUploading,
  }
}

export default useFileUpload
