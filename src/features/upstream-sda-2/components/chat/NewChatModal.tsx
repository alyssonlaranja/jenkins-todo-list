'use client'

import { useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'

import { slugify } from '../../services/project.service'

interface NewChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateChat: (name: string) => void
  /** Lista de nomes de chats existentes no projeto atual para validação */
  existingChatNames?: string[]
}

export function NewChatModal({
  open,
  onOpenChange,
  onCreateChat,
  existingChatNames = [],
}: NewChatModalProps) {
  const [chatName, setChatName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Verificar se o nome já existe no projeto atual (comparar slugs para evitar variações)
  const isDuplicate = useMemo(() => {
    if (!chatName.trim()) return false
    const newSlug = slugify(chatName.trim())
    return existingChatNames.some(name => slugify(name) === newSlug)
  }, [chatName, existingChatNames])

  const handleCreate = async () => {
    if (!chatName.trim() || isDuplicate) return

    setIsCreating(true)
    try {
      await onCreateChat(chatName.trim())
      setChatName('')
      onOpenChange(false)
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && chatName.trim() && !isDuplicate) {
      handleCreate()
    }
  }

  // Limpar estado ao fechar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setChatName('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-gray-900">
            Novo chat
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Digite um nome para identificar este chat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Input
              placeholder="Nome do chat"
              value={chatName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setChatName(e.target.value)
              }
              onKeyDown={handleKeyDown}
              autoFocus
              className={`h-12 text-base ${
                isDuplicate
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-orange-300 focus:border-orange-500 focus:ring-orange-500/20'
              }`}
            />
            {isDuplicate && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="size-4" />
                <span>Já existe um chat com este nome neste projeto</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-11 flex-1"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              className="h-11 flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={handleCreate}
              disabled={!chatName.trim() || isCreating || isDuplicate}
            >
              {isCreating ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
