'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, Search, Users, X } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

import { slugify } from '../../services/project.service'
import type { TeamMember } from './TeamMemberSelect'

interface NewProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProject: (name: string, teamMembers?: TeamMember[]) => void
  /** Lista de nomes de projetos existentes para validação */
  existingProjectNames?: string[]
  /** Lista de membros disponíveis para adicionar ao projeto */
  availableTeamMembers?: TeamMember[]
}

/** Componente de indicador de passos */
function StepIndicator({ currentStep }: { currentStep: 1 | 2 }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-0">
      {/* Step 1 */}
      <div
        className={`flex size-8 items-center justify-center rounded-full text-sm font-medium ${
          currentStep >= 1
            ? 'bg-orange-500 text-white'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        1
      </div>

      {/* Line between steps */}
      <div className="mx-1 h-0.5 w-64 bg-muted">
        <div
          className={`h-full bg-orange-500 transition-all duration-300 ${
            currentStep >= 2 ? 'w-full' : 'w-0'
          }`}
        />
      </div>

      {/* Step 2 */}
      <div
        className={`flex size-8 items-center justify-center rounded-full text-sm font-medium ${
          currentStep >= 2
            ? 'bg-orange-500 text-white'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        2
      </div>
    </div>
  )
}

/** Gera iniciais de um nome */
function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

export function NewProjectModal({
  open,
  onOpenChange,
  onCreateProject,
  existingProjectNames = [],
  availableTeamMembers = [],
}: NewProjectModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [projectName, setProjectName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Verificar se o nome já existe (comparar slugs para evitar variações)
  const isDuplicate = useMemo(() => {
    if (!projectName.trim()) return false
    const newSlug = slugify(projectName.trim())
    return existingProjectNames.some(name => slugify(name) === newSlug)
  }, [projectName, existingProjectNames])

  // Filtrar membros disponíveis (não selecionados)
  const availableMembers = useMemo(() => {
    return availableTeamMembers.filter(
      member => !selectedMembers.some(selected => selected.id === member.id)
    )
  }, [availableTeamMembers, selectedMembers])

  // Filtrar membros pela busca
  const filteredAvailableMembers = useMemo(() => {
    if (!searchValue.trim()) return availableMembers
    const search = searchValue.toLowerCase()
    return availableMembers.filter(
      member =>
        member.name.toLowerCase().includes(search) ||
        member.email.toLowerCase().includes(search)
    )
  }, [availableMembers, searchValue])

  const handleCreate = async () => {
    if (!projectName.trim() || isDuplicate) return

    setIsCreating(true)
    try {
      await onCreateProject(
        projectName.trim(),
        selectedMembers.length > 0 ? selectedMembers : undefined
      )
      resetAndClose()
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === 'Enter' &&
      projectName.trim() &&
      !isDuplicate &&
      currentStep === 1
    ) {
      setCurrentStep(2)
    }
  }

  const handleAddMember = (member: TeamMember) => {
    setSelectedMembers(prev => [...prev, member])
  }

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId))
  }

  const resetAndClose = () => {
    setProjectName('')
    setSelectedMembers([])
    setSearchValue('')
    setCurrentStep(1)
    onOpenChange(false)
  }

  // Limpar estado ao fechar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetAndClose()
    } else {
      onOpenChange(newOpen)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={() => handleOpenChange(false)}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-card p-8 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Step 1: Nome do Projeto */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Novo Projeto
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Solução:{' '}
                <span className="font-medium text-foreground">SDA</span>
              </p>
            </div>

            <div className="space-y-2">
              <Input
                id="project-name"
                placeholder="Nome do projeto"
                value={projectName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setProjectName(e.target.value)
                }
                onKeyDown={handleKeyDown}
                autoFocus
                className={`h-12 bg-background text-base ${
                  isDuplicate
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-orange-400 focus:border-orange-500 focus:ring-orange-500/20'
                }`}
              />
              {isDuplicate && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="size-4" />
                  <span>Já existe um projeto com este nome</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="h-11 flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-gradient-primary shadow-glow h-11 flex-1 text-white hover:opacity-90"
                onClick={() => setCurrentStep(2)}
                disabled={!projectName.trim() || isDuplicate}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Selecionar Equipe */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Selecionar Equipe
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Projeto:{' '}
                <span className="font-medium text-foreground">
                  {projectName}
                </span>
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar membro por nome ou e-mail..."
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                className="h-12 border-orange-400 bg-background pl-10 focus:border-orange-500 focus:ring-orange-500/20"
              />
            </div>

            {/* Selected Members Section */}
            {selectedMembers.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Users className="size-3.5" />
                  Membros selecionados ({selectedMembers.length})
                </p>
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {selectedMembers.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {getInitials(member.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {member.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="rounded p-1 transition-colors hover:bg-muted"
                        aria-label={`Remover ${member.name}`}
                      >
                        <X className="size-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Members Section */}
            <div className="space-y-2">
              {selectedMembers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Clique para adicionar membros à equipe
                </p>
              )}
              <div className="max-h-40 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {filteredAvailableMembers.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    {availableMembers.length === 0
                      ? 'Todos os membros foram selecionados'
                      : 'Nenhum membro encontrado'}
                  </div>
                ) : (
                  filteredAvailableMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => handleAddMember(member)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                        {getInitials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {member.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="h-11 flex-1"
                onClick={() => setCurrentStep(1)}
                disabled={isCreating}
              >
                Voltar
              </Button>
              <Button
                className="bg-gradient-primary shadow-glow h-11 flex-1 text-white hover:opacity-90"
                onClick={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? 'Criando...' : 'Criar Projeto'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
