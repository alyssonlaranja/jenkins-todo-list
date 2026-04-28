'use client'

import { useEffect, useState } from 'react'
import { Share2, X } from 'lucide-react'

import type {
  ProjectTeamMemberDto,
  SharedWithInfo,
} from '@/features/artifacts/types/sda-artifacts.types'
import { Button } from '@/shared/components/ui/button'
import { useI18n } from '@/shared/hooks/use-i18n'

interface ShareArtifactModalProps {
  isOpen: boolean
  onClose: () => void
  onShare: (selectedMembers: string[]) => Promise<void>
  teamMembers: ProjectTeamMemberDto[]
  currentSharedWith?: SharedWithInfo[]
  artifactName: string
  artifactVersion: string
  /** ID do usuário atual (para excluí-lo da lista de compartilhamento) */
  currentUserId?: string
}

export function ShareArtifactModal({
  isOpen,
  onClose,
  onShare,
  teamMembers,
  currentSharedWith = [],
  artifactName,
  artifactVersion,
  currentUserId,
}: ShareArtifactModalProps) {
  const { t, localeString } = useI18n('pages')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isSharing, setIsSharing] = useState(false)
  const [shareOption, setShareOption] = useState<'all' | 'specific'>('all')
  const [membersToRemove, setMembersToRemove] = useState<string[]>([])

  // IDs dos usuários que já têm acesso (excluindo os marcados para remoção)
  const alreadySharedIds = currentSharedWith
    .filter(s => !membersToRemove.includes(s.userId))
    .map(s => s.userId)

  // Filtrar membros: remover o usuário atual da lista de seleção
  // (não faz sentido compartilhar consigo mesmo)
  // O Owner do projeto aparece na lista quando o usuário atual NÃO é o Owner
  const selectableMembers = teamMembers.filter(
    member => member.id !== currentUserId
  )

  // Membros atualmente compartilhados (exceto os marcados para remoção)
  const currentlySharedMembers = currentSharedWith.filter(
    shared => !membersToRemove.includes(shared.userId)
  )

  // Resetar estados ao fechar o modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedMembers([])
      setMembersToRemove([])
      setShareOption('all')
    }
  }, [isOpen])

  const handleShare = async () => {
    setIsSharing(true)
    try {
      let finalMembersList: string[]

      if (shareOption === 'all') {
        // Compartilhar com todos
        finalMembersList = teamMembers.map(m => m.id)
      } else {
        // Modo específico: combinar já compartilhados (exceto removidos) + novos selecionados
        const existingMembers = currentSharedWith
          .filter(s => !membersToRemove.includes(s.userId))
          .map(s => s.userId)

        const newMembers = selectedMembers.filter(
          id => !existingMembers.includes(id)
        )

        finalMembersList = [...existingMembers, ...newMembers]
      }

      await onShare(finalMembersList)
      onClose()
      setSelectedMembers([])
      setMembersToRemove([])
      setShareOption('all')
    } catch (error) {
      console.error('Erro ao compartilhar:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const toggleRemoveMember = (userId: string) => {
    setMembersToRemove(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="size-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Compartilhar artefato
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Artifact Info */}
        <div className="mb-4 rounded-md bg-gray-50 p-3 dark:bg-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {artifactName}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Versão {artifactVersion}
          </p>
        </div>

        {/* Share Options */}
        <div className="mb-4">
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Compartilhar com
          </p>

          <div className="space-y-2">
            {/* Option: All Team */}
            <label className="flex cursor-pointer items-center rounded-md border p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="radio"
                name="shareOption"
                checked={shareOption === 'all'}
                onChange={() => setShareOption('all')}
                className="size-4 text-orange-600 focus:ring-orange-500"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                Toda a equipe do projeto
              </span>
            </label>

            {/* Option: Specific Members */}
            <label
              className={`flex items-center rounded-md border p-3 ${
                selectableMembers.length === 0
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <input
                type="radio"
                name="shareOption"
                checked={shareOption === 'specific'}
                onChange={() => setShareOption('specific')}
                disabled={selectableMembers.length === 0}
                className="size-4 text-orange-600 focus:ring-orange-500"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                Pessoa(s) específica(s)
                {selectableMembers.length === 0 && (
                  <span className="ml-2 text-xs text-gray-500">
                    (sem outros membros)
                  </span>
                )}
              </span>
            </label>
          </div>
        </div>

        {/* Member List (only if specific option selected) */}
        {shareOption === 'specific' && (
          <>
            {/* Current Shared Members Cards */}
            {currentlySharedMembers.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                  Atualmente compartilhado com:
                </p>
                <div className="space-y-2">
                  {currentlySharedMembers.map(shared => {
                    const member = teamMembers.find(m => m.id === shared.userId)
                    if (!member) return null

                    return (
                      <div
                        key={shared.userId}
                        className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {member.name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {member.email} • {member.role}
                          </p>
                          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                            {t('sda2.workspace.sharedOn' as any)}{' '}
                            {new Date(shared.sharedAt).toLocaleDateString(
                              localeString
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleRemoveMember(shared.userId)}
                          className="ml-3 rounded p-1.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/20"
                          title={
                            t('sda2.workspace.removeAccess' as any) as string
                          }
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Add New Members Section */}
            <div className="mb-4 max-h-60 overflow-y-auto rounded-md border p-3">
              {selectableMembers.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Não há outros membros no projeto além do criador.
                </p>
              ) : (
                <>
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    {currentlySharedMembers.length > 0
                      ? 'Adicionar mais membros:'
                      : 'Selecione os membros com quem deseja compartilhar este artefato:'}
                  </p>
                  <div className="space-y-2">
                    {(() => {
                      const availableMembers = selectableMembers.filter(
                        member => {
                          const isAlreadyShared = alreadySharedIds.includes(
                            member.id
                          )
                          const isSelected = selectedMembers.includes(member.id)
                          return !isAlreadyShared || isSelected
                        }
                      )

                      if (
                        availableMembers.length === 0 &&
                        currentlySharedMembers.length > 0
                      ) {
                        return (
                          <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            Todos os membros disponíveis já têm acesso a este
                            artefato.
                          </p>
                        )
                      }

                      return availableMembers.map(member => {
                        const isSelected = selectedMembers.includes(member.id)

                        return (
                          <label
                            key={member.id}
                            className="flex cursor-pointer items-center rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMember(member.id)}
                              className="size-4 text-orange-600 focus:ring-orange-500"
                            />
                            <div className="ml-3 flex-1">
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {member.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {member.email} • {member.role}
                              </p>
                            </div>
                          </label>
                        )
                      })
                    })()}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Info Message */}
        <div className="mb-4 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {shareOption === 'all'
              ? selectableMembers.length > 0
                ? `Este artefato será compartilhado com todos os ${teamMembers.length} membros da equipe (incluindo o criador).`
                : 'Este artefato será compartilhado com o criador do projeto.'
              : selectableMembers.length === 0 &&
                  currentlySharedMembers.length === 0
                ? 'Não há outros membros disponíveis. Apenas o criador terá acesso.'
                : (() => {
                    const remainingShared = currentlySharedMembers.length
                    const newSelected = selectedMembers.length
                    const toRemove = membersToRemove.length
                    const total = remainingShared + newSelected

                    const parts: string[] = []
                    if (remainingShared > 0)
                      parts.push(`${remainingShared} já compartilhado(s)`)
                    if (newSelected > 0) parts.push(`${newSelected} novo(s)`)
                    if (toRemove > 0)
                      parts.push(`${toRemove} será(ão) removido(s)`)

                    return parts.length > 0
                      ? `${parts.join(', ')}. Total após salvar: ${total} membro(s).`
                      : 'Selecione membros para compartilhar ou remova acessos existentes.'
                  })()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={isSharing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleShare}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
            disabled={
              isSharing ||
              (shareOption === 'specific' &&
                selectedMembers.length === 0 &&
                currentlySharedMembers.length === 0)
            }
          >
            {isSharing ? 'Compartilhando...' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </div>
  )
}
