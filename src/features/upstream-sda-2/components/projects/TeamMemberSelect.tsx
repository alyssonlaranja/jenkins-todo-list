'use client'

import { useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'

/**
 * Representa um membro da equipe que pode ser adicionado a um projeto
 */
export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Owner' | 'Curador' | 'User'
  avatarUrl?: string
}

interface TeamMemberSelectProps {
  /** Lista de membros disponíveis para seleção */
  availableMembers: TeamMember[]
  /** Membros atualmente selecionados */
  selectedMembers: TeamMember[]
  /** Callback quando a seleção muda */
  onSelectionChange: (members: TeamMember[]) => void
  /** Placeholder do campo de busca */
  placeholder?: string
  /** Se o componente está desabilitado */
  disabled?: boolean
  /** Classe CSS adicional */
  className?: string
  /** ID ou email do owner do projeto (não pode ser removido) */
  ownerId?: string
}

/**
 * Componente para selecionar membros da equipe de um projeto
 * - Exibe dropdown com busca para selecionar membros
 * - Membros selecionados aparecem como cards/tags removíveis
 */
export function TeamMemberSelect({
  availableMembers,
  selectedMembers,
  onSelectionChange,
  placeholder = 'Digite nome ou e-mail',
  disabled = false,
  className,
  ownerId,
}: TeamMemberSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Membros disponíveis que ainda não foram selecionados
  const filteredMembers = availableMembers.filter(
    member => !selectedMembers.some(selected => selected.id === member.id)
  )

  // Adicionar membro à seleção
  const handleSelect = (member: TeamMember) => {
    onSelectionChange([...selectedMembers, member])
    setSearchValue('')
    // Manter foco no input após seleção
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // Remover membro da seleção (owner não pode ser removido)
  const handleRemove = (memberId: string) => {
    // Verificar se é o owner - não permitir remoção
    const member = selectedMembers.find(m => m.id === memberId)
    if (member && (member.id === ownerId || member.email === ownerId)) {
      return
    }
    onSelectionChange(selectedMembers.filter(m => m.id !== memberId))
  }

  // Verificar se um membro é o owner
  const isOwner = (member: TeamMember) => {
    return member.id === ownerId || member.email === ownerId
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Cards dos membros selecionados */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMembers.map(member => {
            const memberIsOwner = isOwner(member)
            return (
              <div
                key={member.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm',
                  memberIsOwner
                    ? 'border-primary/30 bg-accent'
                    : 'border-border bg-muted'
                )}
              >
                <span
                  className={
                    memberIsOwner ? 'text-accent-foreground' : 'text-foreground'
                  }
                >
                  {member.name} — {member.email}{' '}
                  <span
                    className={
                      memberIsOwner ? 'text-primary' : 'text-muted-foreground'
                    }
                  >
                    ({memberIsOwner ? 'Owner' : member.role})
                  </span>
                </span>
                {!memberIsOwner && (
                  <button
                    type="button"
                    onClick={() => handleRemove(member.id)}
                    disabled={disabled}
                    className="ml-1 rounded-sm text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Remover ${member.name}`}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Campo de busca com dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            role="combobox"
            aria-expanded={open}
            className={cn(
              'flex h-12 w-full cursor-pointer items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
              disabled && 'cursor-not-allowed opacity-50',
              open && 'border-primary ring-2 ring-primary/20'
            )}
          >
            <input
              ref={inputRef}
              type="text"
              name="team-member-search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={searchValue}
              onChange={e => {
                setSearchValue(e.target.value)
                if (!open) setOpen(true)
              }}
              onClick={e => {
                e.stopPropagation()
                if (!open) setOpen(true)
              }}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          sideOffset={4}
          onWheel={e => e.stopPropagation()}
        >
          <Command shouldFilter={false} className="overflow-hidden">
            <CommandList
              className="max-h-[400px] overflow-y-auto overscroll-contain"
              onWheel={e => e.stopPropagation()}
            >
              {filteredMembers.length === 0 ? (
                <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                  {availableMembers.length === 0
                    ? 'Nenhum membro disponível'
                    : 'Nenhum membro encontrado'}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredMembers
                    .filter(member => {
                      if (!searchValue) return true
                      const search = searchValue.toLowerCase()
                      return (
                        member.name.toLowerCase().includes(search) ||
                        member.email.toLowerCase().includes(search)
                      )
                    })
                    .map(member => (
                      <CommandItem
                        key={member.id}
                        value={member.id}
                        onSelect={() => {
                          handleSelect(member)
                          setOpen(false)
                        }}
                        className="cursor-pointer px-3 py-2 hover:bg-accent"
                      >
                        <span className="text-foreground">
                          {member.name} — {member.email}{' '}
                          <span className="text-muted-foreground">
                            (
                            {member.role === 'Admin'
                              ? 'Admin – Owner'
                              : member.role}
                            )
                          </span>
                        </span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
