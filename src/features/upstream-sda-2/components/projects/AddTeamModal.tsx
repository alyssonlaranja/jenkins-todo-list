'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { useI18n } from '@/shared/hooks/use-i18n'

import { TeamMemberSelect, type TeamMember } from './TeamMemberSelect'

interface AddTeamModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Nome do projeto para exibição no título */
  projectName: string
  /** Membros atuais do projeto */
  currentTeamMembers?: TeamMember[]
  /** Lista de membros disponíveis para adicionar ao projeto */
  availableTeamMembers?: TeamMember[]
  /** Callback ao salvar a equipe atualizada */
  onSave: (teamMembers: TeamMember[]) => void
  /** ID ou email do owner do projeto (não pode ser removido) */
  ownerId?: string
}

export function AddTeamModal({
  open,
  onOpenChange,
  projectName,
  currentTeamMembers = [],
  availableTeamMembers = [],
  onSave,
  ownerId,
}: AddTeamModalProps) {
  const { t } = useI18n('pages')
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Inicializa com os membros atuais quando o modal abre
  useEffect(() => {
    if (open) {
      setSelectedMembers(currentTeamMembers)
    }
  }, [open, currentTeamMembers])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(selectedMembers)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  // Limpar estado ao fechar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedMembers([])
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-medium text-foreground">
            {t('sda2.addTeam.title' as any)}
          </DialogTitle>
          <button
            onClick={() => handleOpenChange(false)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <span className="sr-only">{t('sda2.addTeam.close' as any)}</span>
          </button>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Nome do projeto */}
          <div className="text-sm text-foreground">
            <span className="text-muted-foreground">
              {t('sda2.addTeam.projectLabel' as any)}:
            </span>{' '}
            <span className="font-medium">{projectName}</span>
          </div>

          {/* Label Equipe do projeto */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              {t('sda2.addTeam.teamLabel' as any)}
            </label>
            {/* Campo Membros da Equipe */}
            <TeamMemberSelect
              availableMembers={availableTeamMembers}
              selectedMembers={selectedMembers}
              onSelectionChange={setSelectedMembers}
              placeholder={t('sda2.addTeam.searchPlaceholder' as any) as string}
              ownerId={ownerId}
            />
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              {t('sda2.addTeam.cancel' as any)}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSaving
                ? t('sda2.addTeam.saving' as any)
                : t('sda2.addTeam.save' as any)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
