/**
 * UploadProgressBar Component
 *
 * Displays upload progress for files being uploaded
 *
 * @license Apache-2.0
 */
'use client'

import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'

import type { UploadProgress } from '@/hooks/useFileUpload'
import { cn } from '@/shared/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface UploadProgressBarProps {
  progress: UploadProgress
  onCancel?: () => void
  className?: string
}

interface UploadProgressListProps {
  uploads: Map<string, UploadProgress>
  onCancel?: (fileId: string) => void
  className?: string
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Single upload progress bar
 */
export function UploadProgressBar({
  progress,
  onCancel,
  className,
}: UploadProgressBarProps) {
  const { fileName, progress: percent, status, error } = progress

  const statusConfig = {
    pending: {
      color: 'bg-gray-200',
      icon: null,
      text: 'Aguardando...',
    },
    validating: {
      color: 'bg-blue-500',
      icon: <Loader2 className="size-4 animate-spin text-blue-500" />,
      text: 'Validando...',
    },
    uploading: {
      color: 'bg-orange-500',
      icon: <Loader2 className="size-4 animate-spin text-orange-500" />,
      text: `${percent}%`,
    },
    completed: {
      color: 'bg-green-500',
      icon: <CheckCircle2 className="size-4 text-green-500" />,
      text: 'Concluído',
    },
    error: {
      color: 'bg-red-500',
      icon: <AlertCircle className="size-4 text-red-500" />,
      text: error || 'Erro',
    },
  }

  const config = statusConfig[status]

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3',
        status === 'error' && 'border-red-200 bg-red-50',
        status === 'completed' && 'border-green-200 bg-green-50',
        className
      )}
    >
      {/* Status Icon */}
      <div className="shrink-0">{config.icon}</div>

      {/* File Info & Progress */}
      <div className="min-w-0 flex-1">
        {/* File name */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate text-sm font-medium text-gray-700"
            title={fileName}
          >
            {fileName}
          </span>
          <span
            className={cn(
              'shrink-0 text-xs',
              status === 'error' ? 'text-red-600' : 'text-gray-500'
            )}
          >
            {config.text}
          </span>
        </div>

        {/* Progress bar */}
        {(status === 'uploading' || status === 'validating') && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn('h-full transition-all duration-300', config.color)}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}

        {/* Error message */}
        {status === 'error' && error && (
          <p className="mt-1 truncate text-xs text-red-600" title={error}>
            {error}
          </p>
        )}
      </div>

      {/* Cancel Button */}
      {(status === 'uploading' ||
        status === 'validating' ||
        status === 'pending') &&
        onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cancelar upload"
          >
            <X className="size-4" />
          </button>
        )}
    </div>
  )
}

/**
 * List of upload progress bars
 */
export function UploadProgressList({
  uploads,
  onCancel,
  className,
}: UploadProgressListProps) {
  const uploadArray = Array.from(uploads.values())

  if (uploadArray.length === 0) return null

  // Filter to show only active uploads (not completed ones older than 3 seconds)
  const activeUploads = uploadArray.filter(
    u => u.status !== 'completed' || u.status === 'completed'
  )

  if (activeUploads.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      {activeUploads.map(upload => (
        <UploadProgressBar
          key={upload.fileId}
          progress={upload}
          onCancel={onCancel ? () => onCancel(upload.fileId) : undefined}
        />
      ))}
    </div>
  )
}

export default UploadProgressBar
