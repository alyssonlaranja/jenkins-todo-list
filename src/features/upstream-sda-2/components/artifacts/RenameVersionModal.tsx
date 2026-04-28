'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Clock,
  History,
  Loader2,
  Pencil,
  User,
  X,
} from 'lucide-react'

import {
  validateVersionLabel,
  VERSION_LABEL_VALIDATION,
  type VersionLabelInfo,
  type VersionLabelsMap,
} from '@/features/artifacts/types/version-labels.types'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useI18n } from '@/shared/hooks/use-i18n'
import { cn } from '@/shared/lib/utils'

interface RenameVersionModalProps {
  /** Se o modal está aberto */
  isOpen: boolean

  /** Callback para fechar o modal */
  onClose: () => void

  /** Callback chamado ao confirmar renomeação */
  onConfirm: (newLabel: string) => Promise<void>

  /** ID da versão sendo renomeada */
  versionId: string

  /** Label atual da versão */
  currentLabel: string

  /** Número da versão (para exibição) */
  versionNumber: string | null

  /** Labels existentes para validação de duplicados */
  existingLabels?: VersionLabelsMap

  /** Informações de auditoria da última renomeação */
  auditInfo?: VersionLabelInfo

  /** Se está em estado de loading (salvando) */
  isLoading?: boolean
}

/**
 * Formata data ISO para exibição amigável
 */
function formatAuditDate(isoDate: string, localeString: string): string {
  try {
    const date = new Date(isoDate)
    return date.toLocaleString(localeString, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoDate
  }
}

export function RenameVersionModal({
  isOpen,
  onClose,
  onConfirm,
  versionId,
  currentLabel,
  versionNumber,
  existingLabels,
  auditInfo,
  isLoading = false,
}: RenameVersionModalProps) {
  const { localeString } = useI18n('pages')
  const [newLabel, setNewLabel] = useState(currentLabel)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  // Reset state quando modal abre
  useEffect(() => {
    if (isOpen) {
      setNewLabel(currentLabel)
      setError(null)
      setTouched(false)
    }
  }, [isOpen, currentLabel])

  // Validar em tempo real após primeiro touch
  useEffect(() => {
    if (touched) {
      const validation = validateVersionLabel(
        newLabel,
        existingLabels,
        versionId
      )
      setError(validation.valid ? null : validation.error || null)
    }
  }, [newLabel, touched, existingLabels, versionId])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewLabel(e.target.value)
      if (!touched) setTouched(true)
    },
    [touched]
  )

  const handleSubmit = useCallback(async () => {
    const trimmedLabel = newLabel.trim()

    // Validar antes de submeter
    const validation = validateVersionLabel(
      trimmedLabel,
      existingLabels,
      versionId
    )
    if (!validation.valid) {
      setError(validation.error || 'Erro de validação')
      return
    }

    // Se o label não mudou, apenas fechar
    if (trimmedLabel === currentLabel) {
      onClose()
      return
    }

    try {
      await onConfirm(trimmedLabel)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao renomear versão')
    }
  }, [newLabel, existingLabels, versionId, currentLabel, onConfirm, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading && !error) {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [handleSubmit, isLoading, error, onClose]
  )

  const charactersRemaining =
    VERSION_LABEL_VALIDATION.MAX_LENGTH - newLabel.length
  const isOverLimit = charactersRemaining < 0
  const hasChanges = newLabel.trim() !== currentLabel

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-orange-500" />
            Renomear Versão
          </DialogTitle>
          <DialogDescription>
            Altere o nome de exibição desta versão. O ID técnico permanece
            inalterado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Informação da versão atual */}
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Versão técnica</p>
            <p className="font-mono text-sm text-gray-700">
              {versionNumber ? `v${versionNumber}` : 'N/A'}
            </p>
          </div>

          {/* Input do novo nome */}
          <div className="grid gap-2">
            <Label htmlFor="version-label" className="text-sm font-medium">
              Nome de exibição
            </Label>
            <Input
              id="version-label"
              value={newLabel}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Release Inicial, Correção Bug #123"
              disabled={isLoading}
              className={cn(
                'transition-colors',
                error && 'border-red-500 focus-visible:ring-red-500'
              )}
              maxLength={VERSION_LABEL_VALIDATION.MAX_LENGTH + 10} // Permite digitar um pouco mais para mostrar erro
              autoFocus
            />

            {/* Contador de caracteres e erro */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {error && (
                  <>
                    <AlertCircle className="size-3 text-red-500" />
                    <span className="text-xs text-red-500">{error}</span>
                  </>
                )}
              </div>
              <span
                className={cn(
                  'text-xs',
                  isOverLimit ? 'text-red-500' : 'text-gray-400'
                )}
              >
                {charactersRemaining} caracteres restantes
              </span>
            </div>
          </div>

          {/* Histórico de alterações (auditoria) */}
          {auditInfo && auditInfo.renamedAt && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <History className="size-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">
                  Última alteração
                </span>
              </div>
              <div className="space-y-2 pl-6">
                {/* Nome anterior → atual (sempre mostrar a transição) */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">De:</span>
                  <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700 line-through">
                    {auditInfo.previousLabel ||
                      (versionNumber ? `Versão ${versionNumber}` : 'Sem nome')}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-700">
                    {auditInfo.label}
                  </span>
                </div>
                {/* Usuário */}
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <User className="size-3" />
                  <span>
                    {auditInfo.renamedByName || 'Usuário desconhecido'}
                  </span>
                </div>
                {/* Data/hora */}
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="size-3" />
                  <span>
                    {formatAuditDate(auditInfo.renamedAt, localeString)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Aviso sobre onde o nome aparece */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs text-blue-700">
              <strong>Nota:</strong> O novo nome aparecerá no histórico de
              versões, em buscas e exportações. O conteúdo da versão não será
              alterado.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="gap-2"
          >
            <X className="size-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !!error || !hasChanges}
            className="gap-2 bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Pencil className="size-4" />
                Renomear
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
