'use client'

import { useEffect, useState } from 'react'
import { Save, X } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { useI18n } from '@/shared/hooks/use-i18n'
import { cn } from '@/shared/lib/utils'

import { ARTIFACT_TYPES, type Artifact } from '../../types'

interface ArtifactDirectEditPanelProps {
  artifact: Artifact
  onSave: (content: string) => void
  onCancel: () => void
  isSaving?: boolean
}

export function ArtifactDirectEditPanel({
  artifact,
  onSave,
  onCancel,
  isSaving = false,
}: ArtifactDirectEditPanelProps) {
  const { formatDate: formatDateI18n, currentLanguage } = useI18n('pages')
  const [editedContent, setEditedContent] = useState(artifact.content)
  const typeInfo = ARTIFACT_TYPES[artifact.type]

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString)
      return currentLanguage === 'pt-BR'
        ? 'Data não disponível'
        : 'Date not available'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime()))
        return currentLanguage === 'pt-BR' ? 'Data inválida' : 'Invalid date'
      const dateFormat =
        currentLanguage === 'pt-BR' ? "dd 'de' MMMM 'de' yyyy" : 'MMMM dd, yyyy'
      return formatDateI18n(date, dateFormat)
    } catch {
      return currentLanguage === 'pt-BR' ? 'Data inválida' : 'Invalid date'
    }
  }

  // Resetar conteúdo quando o artefato mudar
  useEffect(() => {
    setEditedContent(artifact.content)
  }, [artifact.content])

  const handleSave = () => {
    onSave(editedContent)
  }

  const hasChanges = editedContent !== artifact.content

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">
          {artifact.title}
        </h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              typeInfo?.color || 'bg-orange-500'
            )}
          />
          <span>{artifact.agentName}</span>
          <span>•</span>
          <span>{typeInfo?.label}</span>
          <span>•</span>
          <span>{formatDate(artifact.updatedAt)}</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="gap-1.5 bg-orange-500 hover:bg-orange-600"
          >
            <Save className="size-4" />
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
            className="gap-1.5"
          >
            <X className="size-4" />
            Cancelar
          </Button>
        </div>
      </div>

      {/* Informação do modo de edição */}
      <div className="border-b border-orange-200 bg-orange-50 px-6 py-3">
        <p className="text-sm text-orange-800">
          <strong>Modo de edição direta:</strong> Você pode editar o conteúdo
          diretamente abaixo. Clique em &quot;Salvar alterações&quot; quando
          terminar.
        </p>
      </div>

      {/* Editor de conteúdo */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="mx-auto h-full max-w-4xl">
          <textarea
            value={editedContent}
            onChange={e => setEditedContent(e.target.value)}
            className={cn(
              'h-full w-full resize-none rounded-lg border p-6',
              'font-mono text-sm leading-relaxed text-gray-700',
              'focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20',
              'border-gray-200 bg-white',
              isSaving && 'cursor-not-allowed opacity-60'
            )}
            placeholder="Digite o conteúdo do artefato (suporta markdown)..."
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  )
}
