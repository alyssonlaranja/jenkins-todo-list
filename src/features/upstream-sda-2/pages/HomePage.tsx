'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Bell,
  CheckCircle,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  FolderOpen,
  Loader2,
  LogOut,
  Moon,
  Plus,
  Search as SearchIcon,
  Sun,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react'

import { ProjectStatus } from '@/features/artifacts/types/sda-artifacts.types'
import { LanguageSelector } from '@/shared/components/language-selector'
import { LicenseSelector } from '@/shared/components/license-selector'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useActiveNamespace } from '@/shared/hooks/use-active-namespace'
import { useI18n } from '@/shared/hooks/use-i18n'

import { AddTeamModal } from '../components/projects/AddTeamModal'
import { DeleteProjectModal } from '../components/projects/DeleteProjectModal'
import type { TeamMember } from '../components/projects/TeamMemberSelect'
import { llmModels, sdaAgents } from '../data/sda-agents'
import { useCockpitServices } from '../hooks/useCockpitServices'
import { useNamespaceUsers } from '../hooks/useNamespaceUsers'
import { useNotifications } from '../hooks/useNotifications'
import { useProjectStore } from '../stores/projectStore'
import type { Project, ProjectTeamMember, User } from '../types'

const PROJECTS_PER_PAGE = 7

interface HomePageProps {
  user: User
  onLogout: () => void
  onSelectProject: (project: Project) => void
}

type SelectedMember = {
  id: string
  name: string
  email: string
  role: 'editor' | 'viewer'
}

export function HomePage({ user, onLogout, onSelectProject }: HomePageProps) {
  const { t } = useI18n('pages')
  const { t: tCommon } = useI18n('common')
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddTeamModal, setShowAddTeamModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProjectForTeam, setSelectedProjectForTeam] =
    useState<Project | null>(null)
  const [selectedProjectForDelete, setSelectedProjectForDelete] =
    useState<Project | null>(null)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isDeletingProject, setIsDeletingProject] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [step, setStep] = useState(1)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalProjectCount, setTotalProjectCount] = useState(0)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const { projects, addProject, setProjects, updateProject } = useProjectStore()

  // Ref para evitar múltiplas chamadas simultâneas
  const loadingRef = useRef(false)
  // Ref para detectar mudança de namespace e limpar memória
  const prevNamespaceRef = useRef<string | undefined>(undefined)

  // Hook para carregar projetos do Cockpit
  const {
    isReady: isCockpitReady,
    loadProjects,
    deleteProject,
    projectService,
  } = useCockpitServices()

  // Hook para obter o namespace ativo (para recarregar projetos quando mudar)
  const { activeNamespace } = useActiveNamespace()

  // Hook para buscar usuários do namespace atual
  const { users: namespaceUsers } = useNamespaceUsers()

  // Hook para notificações de artefatos compartilhados
  const { getUnreadCountFormattedByProject } = useNotifications()

  // Ref para cancelar carregamento progressivo ao trocar namespace
  const loadAbortRef = useRef(0)

  /**
   * Carregamento progressivo com padrão de callback.
   * Uma única chamada a loadProjects — o service itera internamente
   * e emite callbacks por batch. A UI atualiza 1x por batch (mínimo de re-renders).
   */
  const loadAllPagesProgressively = useCallback(async () => {
    if (!isCockpitReady || loadingRef.current) return

    const loadId = ++loadAbortRef.current // ID para cancelar se namespace mudar
    loadingRef.current = true
    setIsLoadingProjects(true)
    setProjects([]) // Limpar projetos antigos (localStorage) para evitar duplicatas
    setTotalProjectCount(0)
    setCurrentPage(0)

    const loadedProjects: Project[] = []
    let isFirstBatch = true

    try {
      const result = await loadProjects(pageProjects => {
        // Verificar se foi abortado (mudança de namespace)
        if (loadAbortRef.current !== loadId) return

        // Adicionar projetos da página, evitando duplicatas por id
        for (const project of pageProjects) {
          if (!loadedProjects.some(p => p.id === project.id)) {
            loadedProjects.push(project)
          }
        }

        // Ordenar por updatedAt desc
        loadedProjects.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )

        // ✅ Re-render UMA VEZ para todo o batch
        setProjects([...loadedProjects])
        setTotalProjectCount(loadedProjects.length)

        if (isFirstBatch) {
          // Primeiro batch: tirar spinner principal, ativar indicador de "carregando mais"
          setIsLoadingProjects(false)
          setIsLoadingMore(true)
          isFirstBatch = false
        }

        console.log(
          `📊 [SDA2] Total de projetos carregados até agora: ${loadedProjects.length}`
        )
      })

      if (!result.success && result.error) {
        console.error('❌ [SDA2] Erro ao carregar projetos:', result.error)
      }
    } catch (error) {
      console.error('❌ [SDA2] Exceção ao carregar projetos:', error)
    } finally {
      if (loadAbortRef.current === loadId) {
        setIsLoadingProjects(false)
        setIsLoadingMore(false)
        loadingRef.current = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCockpitReady, loadProjects])

  /**
   * Recarrega todos os projetos do zero (usado após create/delete/update).
   * Invalida cache e faz carregamento progressivo novamente.
   */
  const reloadAllProjects = useCallback(async () => {
    projectService?.clearProjectCache()
    loadingRef.current = false // Resetar para permitir nova carga
    setProjects([])
    setTotalProjectCount(0)
    await loadAllPagesProgressively()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectService, loadAllPagesProgressively])

  // Carregar projetos quando o hook estiver pronto ou namespace mudar
  useEffect(() => {
    if (!isCockpitReady) return

    // Detectar mudança de namespace e limpar memória completamente
    const currentNs = activeNamespace?.id
    if (
      prevNamespaceRef.current !== undefined &&
      prevNamespaceRef.current !== currentNs
    ) {
      console.log(
        '🔄 [SDA2] Namespace alterado, limpando memória de projetos...'
      )
      loadAbortRef.current++ // Cancelar carregamento anterior
      loadingRef.current = false
      setProjects([])
      setTotalProjectCount(0)
      projectService?.clearProjectCache()
    }
    prevNamespaceRef.current = currentNs

    loadAllPagesProgressively()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCockpitReady, activeNamespace?.id])

  const handleCreateProject = async () => {
    if (!projectName.trim() || isCreating) return

    setIsCreating(true)

    // Construir equipe: criador + membros selecionados
    const team: ProjectTeamMember[] = [
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'Owner',
      },
      ...selectedMembers.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role === 'editor' ? ('Admin' as const) : ('User' as const),
      })),
    ]

    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: projectName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      artifacts: [],
      conversations: [],
      team,
      detailsLoaded: true, // Projeto recém criado, sem dados para carregar
    }

    // Adicionar projeto localmente
    addProject(newProject)

    // Salvar no Cockpit se disponível
    if (projectService) {
      try {
        await projectService.create({
          name: newProject.name,
          description: '',
          tags: [],
          team,
        })

        // Invalidar cache e recarregar todos progressivamente
        await reloadAllProjects()
      } catch (error) {
        console.error('[HomePage] Erro ao criar projeto no Cockpit:', error)
      }
    }

    setIsCreating(false)
    handleCloseModal()
    onSelectProject(newProject)
  }

  // Fechar modal e resetar estado
  const handleCloseModal = () => {
    setShowCreateModal(false)
    setProjectName('')
    setStep(1)
    setSelectedMembers([])
    setMemberSearch('')
  }

  // Filtrar membros disponíveis do namespace
  const filteredMembers = namespaceUsers
    .filter(
      m =>
        (m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.email.toLowerCase().includes(memberSearch.toLowerCase())) &&
        !selectedMembers.some(s => s.id === m.id)
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  // Toggle de membro selecionado
  const toggleMember = (member: TeamMember | SelectedMember) => {
    setSelectedMembers(prev =>
      prev.some(m => m.id === member.id)
        ? prev.filter(m => m.id !== member.id)
        : [...prev, { ...member, role: 'editor' }]
    )
  }

  // Atualizar role de membro
  const updateMemberRole = (id: string, role: 'editor' | 'viewer') => {
    setSelectedMembers(prev =>
      prev.map(m => (m.id === id ? { ...m, role } : m))
    )
  }

  // Handler para abrir modal de adicionar equipe
  const handleOpenAddTeamModal = (project: Project) => {
    setSelectedProjectForTeam(project)
    setShowAddTeamModal(true)
  }

  const handleUpdateTeam = async (teamMembers: TeamMember[]) => {
    if (!selectedProjectForTeam || !projectService) return

    const team: ProjectTeamMember[] = teamMembers.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
    }))

    // Garantir que o owner original está na equipe
    const originalOwner = selectedProjectForTeam.team?.find(
      m => m.role === 'Owner'
    )
    const ownerEmail = originalOwner?.email || user.email
    const hasOwner = team.some(m => m.email === ownerEmail)

    if (!hasOwner && originalOwner) {
      team.unshift({
        id: originalOwner.id,
        name: originalOwner.name,
        email: originalOwner.email,
        role: 'Owner',
      })
    } else if (!hasOwner) {
      team.unshift({
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'Owner',
      })
    }

    // Verificar se houve mudanças na equipe
    const currentEmails = new Set(
      selectedProjectForTeam.team?.map(m => m.email) || []
    )
    const newEmails = new Set(team.map(m => m.email))

    const hasChanges =
      currentEmails.size !== newEmails.size ||
      [...currentEmails].some(email => !newEmails.has(email)) ||
      [...newEmails].some(email => !currentEmails.has(email))

    if (!hasChanges) {
      setShowAddTeamModal(false)
      setSelectedProjectForTeam(null)
      return
    }

    const updatedProject: Project = {
      ...selectedProjectForTeam,
      team,
      updatedAt: new Date().toISOString(),
    }

    const { slugify } = await import('../services/project.service')
    const slug = slugify(selectedProjectForTeam.name)

    await projectService.update(slug, {
      id: updatedProject.id,
      name: updatedProject.name,
      slug,
      description: '',
      tags: [],
      createdAt: updatedProject.createdAt,
      updatedAt: updatedProject.updatedAt,
      createdBy: user.id,
      createdByName: user.name,
      status: ProjectStatus.ACTIVE,
      chats: [],
      metadata: {
        totalChats: 0,
        totalArtifacts: 0,
        approvedArtifacts: 0,
      },
      team: team as {
        id: string
        name: string
        email: string
        role: 'Admin' | 'Owner' | 'Curador' | 'User'
      }[],
      approvedArtifacts:
        updatedProject.artifacts?.map(a => ({
          artifactId: a.id,
          artifactKey: '',
          artifactName: '',
          artifactType: a.type,
          version: '1',
          approvedAt: a.createdAt,
          approvedBy: user.id,
          approvedByName: user.name,
          documentType: a.type,
          chatId: '',
          chatSlug: '',
        })) || [],
    })

    updateProject(selectedProjectForTeam.id, updatedProject)

    // Invalidar cache e recarregar todos progressivamente
    await reloadAllProjects()

    setShowAddTeamModal(false)
    setSelectedProjectForTeam(null)
  }

  const handleOpenDeleteModal = (project: Project) => {
    setSelectedProjectForDelete(project)
    setShowDeleteModal(true)
  }

  // Verifica se o usuário atual é o owner do projeto
  const isProjectOwner = (project: Project): boolean => {
    if (!project.team || project.team.length === 0) {
      return true
    }

    const currentUserEmail = user.email.toLowerCase()
    return project.team.some(
      member =>
        member.role === 'Owner' &&
        member.email.toLowerCase() === currentUserEmail
    )
  }

  const handleDeleteProject = async () => {
    if (!selectedProjectForDelete || !deleteProject) return

    setIsDeletingProject(true)
    try {
      const { slugify } = await import('../services/project.service')
      const slug = slugify(selectedProjectForDelete.name)

      const result = await deleteProject(slug)

      if (result.success) {
        // Invalidar cache e recarregar todos progressivamente
        await reloadAllProjects()

        setShowDeleteModal(false)
        setSelectedProjectForDelete(null)
      } else {
        console.error('[HomePage] ❌ Erro ao deletar projeto:', result.error)
      }
    } catch (error) {
      console.error('[HomePage] ❌ Exceção ao deletar projeto:', error)
    } finally {
      setIsDeletingProject(false)
    }
  }

  // Paginação client-side sobre os projetos acumulados
  const totalPages = Math.max(
    1,
    Math.ceil(totalProjectCount / PROJECTS_PER_PAGE)
  )
  const paginatedProjects = useMemo(() => {
    const start = currentPage * PROJECTS_PER_PAGE
    return projects.slice(start, start + PROJECTS_PER_PAGE)
  }, [currentPage, projects])

  // Garantir que a página atual não ultrapasse o total
  useEffect(() => {
    if (projects.length > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1))
    }
  }, [totalPages, currentPage, projects.length])

  const handlePageChange = (nextPage: number) => {
    setCurrentPage(Math.max(0, Math.min(nextPage, totalPages - 1)))
  }

  // Calcular métricas mock para projetos

  return (
    <div className="min-h-screen bg-background px-4 pb-6 pt-2 sm:px-6 sm:pt-3 md:px-8 md:pt-4">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Bar - User Dropdown + Theme Toggle */}
        <div className="-mr-2 flex items-center justify-end">
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <LanguageSelector />

            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-lg border border-border p-2 transition-colors hover:bg-secondary"
                title={
                  theme === 'dark'
                    ? t('sda2.home.switchToLightTheme')
                    : t('sda2.home.switchToDarkTheme')
                }
              >
                {theme === 'dark' ? (
                  <Sun className="text-warning size-4" />
                ) : (
                  <Moon className="size-4 text-primary" />
                )}
              </button>
            )}

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-secondary">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    {user.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-medium text-foreground">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {/* User Info */}
                <div className="flex items-center gap-3 p-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                    {user.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Workspace Selector */}
                <div className="px-3 py-2">
                  <LicenseSelector showLabelAlways />
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={onLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  {t('sda2.home.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Hero Section */}
        <div className="glass rounded-2xl p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="bg-gradient-primary flex size-10 items-center justify-center rounded-lg">
                  <Zap className="size-5 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">
                  {t('sda2.home.title')}
                </h1>
              </div>
              <p className="max-w-2xl text-muted-foreground">
                {t('sda2.home.description')}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-primary shadow-glow flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" /> {t('sda2.home.createProject')}
            </button>
          </div>
        </div>

        {/* Benefícios */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {t('sda2.home.benefits')}
          </h2>
          <div className="glass space-y-3 rounded-xl p-6">
            {(
              [
                'acceleration',
                'documentation',
                'tradeoffs',
                'diagrams',
              ] as const
            ).map((key, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 size-5 shrink-0 text-foreground" />
                <p className="text-sm text-foreground">
                  {t(`sda2.home.benefitsList.${key}` as any)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Agentes & Artefatos */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {t('sda2.home.agentsAndArtifacts')}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sdaAgents.map(agent => {
              const Icon = agent.icon
              return (
                <div key={agent.id} className="glass space-y-3 rounded-xl p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-9 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${agent.color}20` }}
                    >
                      <Icon
                        className="w-4.5 h-4.5"
                        style={{ color: agent.color }}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {t(`sda2.home.agents.${agent.id}.name` as any)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {t(`sda2.home.agents.${agent.id}.artifactType` as any)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t(`sda2.home.agents.${agent.id}.description` as any)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Seus Projetos */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {t('sda2.home.yourProjects')}
            {totalProjectCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({totalProjectCount}{' '}
                {totalProjectCount === 1
                  ? t('sda2.home.project')
                  : t('sda2.home.projects')}
                )
              </span>
            )}
          </h2>

          {/* Loading State */}
          {isLoadingProjects && projects.length === 0 ? (
            <div className="glass flex flex-col items-center justify-center rounded-xl p-12">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                {t('sda2.home.loadingProjects')}
              </p>
            </div>
          ) : projects.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('sda2.home.noProjectsYet')}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-primary mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="mr-1 inline size-4" />{' '}
                {t('sda2.home.createProject')}
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="space-y-3">
                {paginatedProjects.map(project => {
                  const isOwner = isProjectOwner(project)
                  const unreadBadge = getUnreadCountFormattedByProject(
                    project.id
                  )
                  return (
                    <div
                      key={project.id}
                      className="glass group flex items-center justify-between rounded-xl p-4 transition-all hover:shadow-lg"
                    >
                      <button
                        onClick={() => onSelectProject(project)}
                        className="flex flex-1 items-center gap-4"
                      >
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                          <FolderOpen className="size-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {project.name}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {project.team?.length || 1}{' '}
                            {(project.team?.length || 1) === 1
                              ? t('sda2.home.member' as any)
                              : t('sda2.home.members' as any)}{' '}
                            ·{' '}
                            {
                              new Date(project.updatedAt)
                                .toISOString()
                                .split('T')[0]
                            }
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectProject(project)}
                            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                          >
                            <ExternalLink className="size-3.5" />{' '}
                            {t('sda2.home.openProject' as any)}
                          </button>
                          {/* Botão de sino - só visível quando há notificações não lidas (CA-02) */}
                          {unreadBadge && (
                            <button
                              onClick={() => onSelectProject(project)}
                              className="relative flex size-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-secondary"
                              title={
                                t('sda2.home.notifications' as any) ||
                                'Notificações'
                              }
                            >
                              <Bell className="size-4 text-destructive" />
                              <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                                {unreadBadge}
                              </span>
                            </button>
                          )}
                          {isOwner && (
                            <>
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  handleOpenAddTeamModal(project)
                                }}
                                className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary"
                                title={
                                  t('sda2.home.manageTeam' as any) as string
                                }
                              >
                                <Users className="size-3.5" />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  handleOpenDeleteModal(project)
                                }}
                                className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
                                title={
                                  t('sda2.home.deleteProject' as any) as string
                                }
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Indicador de carregamento — sempre visível enquanto há mais batches */}
              {isLoadingMore && (
                <div className="mt-4 flex items-center justify-center gap-2 py-2">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Carregando mais projetos...
                  </span>
                </div>
              )}

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(0)}
                    disabled={currentPage === 0}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    title={tCommon('pagination.firstPage') as string}
                  >
                    <ChevronsLeft className="size-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {tCommon('pagination.previous') as string}
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {t('sda2.home.page')} {currentPage + 1} {t('sda2.home.of')}{' '}
                    {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {tCommon('pagination.next') as string}
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages - 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    title={tCommon('pagination.lastPage') as string}
                  >
                    <ChevronsRight className="size-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modelos LLM Suportados */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {t('sda2.home.supportedLLMs' as any)}
          </h2>
          <div className="flex flex-wrap gap-2">
            {llmModels.map(model => (
              <span
                key={model.name}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
              >
                {model.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Criação de Projeto - 2 Passos */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass shadow-elevated w-full max-w-lg rounded-2xl p-8">
            {/* Step indicator */}
            <div className="mb-6 flex items-center gap-2">
              <div
                className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
              >
                1
              </div>
              <div
                className={`h-0.5 flex-1 ${step >= 2 ? 'bg-primary' : 'bg-border'}`}
              />
              <div
                className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
              >
                2
              </div>
            </div>

            {step === 1 && (
              <>
                <h2 className="mb-4 text-xl font-bold text-foreground">
                  {t('sda2.createProject.title' as any)}
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  {t('sda2.createProject.solution' as any)}:{' '}
                  <span className="font-medium text-foreground">
                    {t('sda2.createProject.solutionName' as any)}
                  </span>
                </p>
                <input
                  type="text"
                  placeholder={
                    t(
                      'sda2.createProject.projectNamePlaceholder' as any
                    ) as string
                  }
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  onKeyDown={e =>
                    e.key === 'Enter' && projectName.trim() && setStep(2)
                  }
                  className="mb-4 w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 rounded-xl border border-border py-2.5 text-foreground transition-colors hover:bg-secondary"
                  >
                    {t('sda2.createProject.cancel' as any)}
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!projectName.trim()}
                    className="bg-gradient-primary flex-1 rounded-xl py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {t('sda2.createProject.next' as any)}
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="mb-1 text-xl font-bold text-foreground">
                  {t('sda2.createProject.step2' as any)}
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  {t('sda2.createProject.projectLabel' as any)}:{' '}
                  <span className="font-medium text-foreground">
                    {projectName}
                  </span>
                </p>

                {/* Search */}
                <div className="relative mb-4">
                  <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={
                      t(
                        'sda2.createProject.searchMembersPlaceholder' as any
                      ) as string
                    }
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                </div>

                {/* Selected members */}
                {selectedMembers.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Users className="size-3.5" />{' '}
                      {t('sda2.createProject.selectedMembers' as any)} (
                      {selectedMembers.length})
                    </p>
                    <div className="max-h-32 space-y-1.5 overflow-y-auto">
                      {selectedMembers.map(m => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                            {m.name
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">
                              {m.name}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {m.email}
                            </p>
                          </div>
                          <select
                            value={m.role}
                            onChange={e =>
                              updateMemberRole(
                                m.id,
                                e.target.value as 'editor' | 'viewer'
                              )
                            }
                            className="rounded-md border border-border bg-input px-1.5 py-0.5 text-[10px] text-foreground"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            onClick={() => toggleMember(m)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Directory list */}
                <div className="mb-4 max-h-40 overflow-y-auto rounded-xl border border-border">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map(m => (
                      <button
                        key={m.id}
                        onClick={() => toggleMember(m)}
                        className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-secondary"
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
                          {m.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">
                            {m.name}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {m.email}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      {t('sda2.createProject.noMembersFound' as any)}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-xl border border-border py-2.5 text-foreground transition-colors hover:bg-secondary"
                  >
                    {t('sda2.createProject.back' as any)}
                  </button>
                  <button
                    onClick={handleCreateProject}
                    disabled={isCreating}
                    className="bg-gradient-primary flex-1 rounded-xl py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 inline size-4 animate-spin" />
                        {t('sda2.createProject.creating' as any)}
                      </>
                    ) : (
                      t('sda2.createProject.create' as any)
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <AddTeamModal
        open={showAddTeamModal}
        onOpenChange={setShowAddTeamModal}
        projectName={selectedProjectForTeam?.name || ''}
        currentTeamMembers={
          selectedProjectForTeam?.team?.map(m => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role as 'Admin' | 'Owner' | 'Curador' | 'User',
          })) || []
        }
        availableTeamMembers={namespaceUsers}
        onSave={handleUpdateTeam}
        ownerId={
          selectedProjectForTeam?.team?.find(m => m.role === 'Owner')?.email
        }
      />

      <DeleteProjectModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        projectName={selectedProjectForDelete?.name || ''}
        onConfirm={handleDeleteProject}
        isDeleting={isDeletingProject}
      />
    </div>
  )
}
