'use client'

// ============================================================================
// Component: ProcessCompatibilityWarning
// ============================================================================
// Componente para exibir avisos de compatibilidade de processo Azure DevOps
import React, { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Info,
  XCircle,
} from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import type { ProcessCompatibilityWarningProps } from '../types/azure-devops-process.types'

// ============================================================================
// Sub-components
// ============================================================================

interface CompatibilityBadgeProps {
  level: number
  className?: string
}

function CompatibilityBadge({ level, className }: CompatibilityBadgeProps) {
  const getColor = () => {
    if (level >= 80) return 'bg-green-100 text-green-800 border-green-200'
    if (level >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getIcon = () => {
    if (level >= 80) return <CheckCircle className="size-3" />
    if (level >= 50) return <AlertCircle className="size-3" />
    return <XCircle className="size-3" />
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        getColor(),
        className
      )}
    >
      {getIcon()}
      {level}%
    </span>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ProcessCompatibilityWarning({
  compatibility,
  isLoading,
  onProceed,
  onCancel,
  showDetails: initialShowDetails = false,
  className,
}: ProcessCompatibilityWarningProps) {
  const [showDetails, setShowDetails] = useState(initialShowDetails)

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'rounded-lg border border-gray-200 bg-gray-50 p-4',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          <span className="text-sm text-gray-600">
            Detectando processo do projeto...
          </span>
        </div>
      </div>
    )
  }

  // No compatibility data
  if (!compatibility) {
    return null
  }

  const {
    isCompatible,
    compatibilityLevel,
    detectedProcess,
    expectedProcess,
    warnings,
    suggestions,
    missingTypes,
  } = compatibility

  // Fully compatible - minimal display
  if (isCompatible && warnings.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-green-200 bg-green-50 p-4',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <CheckCircle className="size-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              Processo compatível: {detectedProcess}
            </p>
            <p className="text-xs text-green-600">
              O backlog será exportado sem modificações
            </p>
          </div>
          <CompatibilityBadge level={compatibilityLevel} />
        </div>
      </div>
    )
  }

  // Has warnings or incompatibility
  const alertColor = isCompatible
    ? 'border-yellow-200 bg-yellow-50'
    : 'border-orange-200 bg-orange-50'

  const iconColor = isCompatible ? 'text-yellow-600' : 'text-orange-600'
  const textColor = isCompatible ? 'text-yellow-800' : 'text-orange-800'
  const textColorLight = isCompatible ? 'text-yellow-600' : 'text-orange-600'

  return (
    <div className={cn('rounded-lg border p-4', alertColor, className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn('mt-0.5 h-5 w-5', iconColor)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn('text-sm font-medium', textColor)}>
              Processo detectado: {detectedProcess}
            </p>
            <CompatibilityBadge level={compatibilityLevel} />
          </div>

          {detectedProcess !== expectedProcess && (
            <p className={cn('mt-1 text-xs', textColorLight)}>
              O backlog foi gerado para {expectedProcess}, mas seu projeto usa{' '}
              {detectedProcess}
            </p>
          )}

          {/* Quick warnings */}
          {warnings.length > 0 && !showDetails && (
            <p className={cn('mt-2 text-xs', textColorLight)}>
              {warnings.length} aviso(s) de compatibilidade
            </p>
          )}
        </div>

        {/* Toggle details button */}
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className={cn(
            'rounded p-1 transition-colors hover:bg-black/5',
            textColorLight
          )}
          aria-label={showDetails ? 'Ocultar detalhes' : 'Mostrar detalhes'}
        >
          {showDetails ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="mt-4 space-y-3 pl-8">
          {/* Warnings */}
          {warnings.length > 0 && (
            <div>
              <p className={cn('mb-1 text-xs font-medium', textColor)}>
                Avisos:
              </p>
              <ul className="space-y-1">
                {warnings.map((warning, index) => (
                  <li
                    key={index}
                    className={cn(
                      'flex items-start gap-2 text-xs',
                      textColorLight
                    )}
                  >
                    <AlertCircle className="mt-0.5 size-3 shrink-0" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing types */}
          {missingTypes.length > 0 && (
            <div>
              <p className={cn('mb-1 text-xs font-medium', textColor)}>
                Tipos não encontrados:
              </p>
              <div className="flex flex-wrap gap-1">
                {missingTypes.map(type => (
                  <span
                    key={type}
                    className="inline-flex items-center rounded border border-red-200 bg-red-100 px-2 py-0.5 text-xs text-red-700"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p className={cn('mb-1 text-xs font-medium', textColor)}>
                Adaptações que serão feitas:
              </p>
              <ul className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs text-gray-600"
                  >
                    <Info className="mt-0.5 size-3 shrink-0 text-blue-500" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Process mapping info */}
          <div className="border-t border-black/10 pt-2">
            <p className="text-xs text-gray-500">
              <strong>Mapeamento:</strong> Os work items serão criados usando os
              tipos disponíveis no seu projeto {detectedProcess}. Features e
              User Stories podem usar tipos alternativos com tags para
              identificação.
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {(onProceed || onCancel) && (
        <div className="mt-4 flex items-center gap-2 pl-8">
          {onProceed && (
            <button
              type="button"
              onClick={onProceed}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >
              Prosseguir com exportação
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Inline Warning (Compact version)
// ============================================================================

interface ProcessWarningInlineProps {
  processTemplate: string | null
  isCompatible: boolean | null
  compatibilityLevel: number | null
  isLoading?: boolean
  className?: string
}

export function ProcessWarningInline({
  processTemplate,
  isCompatible,
  compatibilityLevel,
  isLoading,
  className,
}: ProcessWarningInlineProps) {
  if (isLoading) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs text-gray-500',
          className
        )}
      >
        <div className="size-3 animate-spin rounded-full border border-gray-300 border-t-blue-500" />
        Detectando...
      </span>
    )
  }

  if (!processTemplate) {
    return null
  }

  if (isCompatible === true) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs text-green-600',
          className
        )}
      >
        <CheckCircle className="size-3" />
        {processTemplate}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs text-yellow-600',
        className
      )}
    >
      <AlertTriangle className="size-3" />
      {processTemplate}
      {compatibilityLevel !== null && (
        <span className="text-gray-400">({compatibilityLevel}%)</span>
      )}
    </span>
  )
}

export default ProcessCompatibilityWarning
