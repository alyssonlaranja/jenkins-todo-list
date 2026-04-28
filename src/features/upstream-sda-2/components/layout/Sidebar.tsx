'use client'

import { Clock, FolderOpen, FolderPlus, Home, Menu, X } from 'lucide-react'

import { SDAServiceConfig } from '@/features/artifacts/services'
import { cn } from '@/shared/lib/utils'

import { slugify } from '../../services/project.service'
import {
  AGENT_TYPES,
  ARTIFACT_TYPES,
  type Artifact,
  type Conversation,
  type Project,
} from '../../types'

interface SidebarProps {
  projects: Project[]
  currentProject: Project | null
  onSelectProject: (project: Project) => void
  onNewProject: () => void
  onHome: () => void
}

export function Sidebar({
  projects,
  currentProject,
  onSelectProject,
  onNewProject,
  onHome,
}: SidebarProps) {
  return (
    <aside className="flex w-52 flex-col bg-slate-900 text-white">
      {/* Home Button - altura fixa h-12 para alinhar com header principal */}
      <div className="flex h-12 items-center border-b border-slate-800 px-2">
        <button
          onClick={onHome}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium transition-colors',
            !currentProject
              ? 'bg-slate-800 text-white'
              : 'text-slate-300 hover:bg-slate-800'
          )}
        >
          <Home className="size-3.5" />
          <span className="text-xs">Tela Inicial</span>
        </button>
      </div>

      {/* Projects Section */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-slate-800/50 scrollbar-thumb-slate-500/80">
        <div className="px-3 py-1.5">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            PROJETOS
          </h3>
        </div>

        <nav className="space-y-0.5 px-2">
          <button
            onClick={onNewProject}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <FolderPlus className="size-3.5 text-slate-500" />
            <span className="text-xs">Novo projeto</span>
          </button>

          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                currentProject?.id === project.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <FolderOpen className="size-3.5 text-slate-500" />
              <span className="truncate text-xs">{project.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  )
}

// Segunda sidebar (contexto do projeto - artefatos e conversas)
interface ProjectSidebarProps {
  project: Project
  onNewChat: () => void
  onSelectArtifact: (artifact: Artifact) => void
  onSelectConversation: (conversation: Conversation) => void
  selectedArtifactId?: string
  selectedConversationId?: string
  /** Se a sidebar de projetos está visível */
  isProjectsSidebarOpen?: boolean
  /** Callback para alternar visibilidade da sidebar de projetos */
  onToggleProjectsSidebar?: () => void
  /** Configuração do serviço para verificar ownership */
  config?: SDAServiceConfig | null
}

export function ProjectSidebar({
  project,
  onNewChat,
  onSelectArtifact,
  onSelectConversation,
  selectedArtifactId,
  selectedConversationId,
  isProjectsSidebarOpen = true,
  onToggleProjectsSidebar,
  config,
}: ProjectSidebarProps) {
  const getArtifactColor = (type: Artifact['type']) => {
    return ARTIFACT_TYPES[type]?.color || 'bg-gray-500'
  }

  // Encontra o nome do chat de origem do artefato baseado no chatSlug
  const getOriginChatName = (artifact: Artifact): string | null => {
    if (!artifact.chatSlug) return null

    // Procurar conversa pelo slug OU pelo slugify do título
    // (algumas conversas podem não ter slug definido explicitamente)
    const originConversation = project.conversations.find(
      conv =>
        conv.slug === artifact.chatSlug ||
        slugify(conv.title) === artifact.chatSlug
    )

    return originConversation?.title || null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0) return 'hoje'
    if (diffDays === 1) return 'ontem'
    return `há ${diffDays} dias`
  }

  const getConversationColor = (agentType: string) => {
    return (
      AGENT_TYPES[agentType as keyof typeof AGENT_TYPES]?.color || 'bg-gray-500'
    )
  }

  // Retorna o nome de quem compartilhou ou null se o usuário é owner
  const getSharedByName = (artifact: Artifact): string | null => {
    if (!config?.userId || !artifact.ownerId) return null
    const currentUserId = config.userId
    const currentUserEmail = config.userEmail?.toLowerCase() || ''
    const isOwner =
      artifact.ownerId === currentUserId ||
      artifact.ownerId?.toLowerCase() === currentUserEmail
    if (isOwner) return null
    // Encontrar o share info do usuário atual para obter sharedByName
    const shareInfo = artifact.sharedWith?.find(
      share =>
        share.userId === currentUserId ||
        share.userEmail?.toLowerCase() === currentUserEmail
    )
    return shareInfo?.sharedByName || 'outro usuário'
  }

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Project Header - altura fixa h-12 para alinhar com header principal */}
      <div className="flex h-12 items-center border-b border-gray-200 px-3">
        <div className="flex items-center gap-2">
          {onToggleProjectsSidebar && (
            <button
              onClick={onToggleProjectsSidebar}
              aria-label={
                isProjectsSidebarOpen ? 'Esconder projetos' : 'Mostrar projetos'
              }
              className="text-gray-400 transition-colors hover:text-gray-600"
            >
              {isProjectsSidebarOpen ? (
                <X className="size-3.5" />
              ) : (
                <Menu className="size-3.5" />
              )}
            </button>
          )}
          <FolderOpen className="size-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-800">
            {project.name}
          </span>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full rounded-md bg-orange-500 px-3 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-orange-600"
        >
          + Novo chat
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-slate-800/50 scrollbar-thumb-slate-500/80">
        {/* Artifacts - só mostra se houver artefatos */}
        {project.artifacts.length > 0 && (
          <>
            <div className="px-4 py-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-gray-400">
                ARTEFATOS
              </h4>
            </div>
            <nav className="space-y-0.5 px-3">
              {project.artifacts.map(artifact => {
                const originChatName = getOriginChatName(artifact)
                const sharedByName = getSharedByName(artifact)
                return (
                  <button
                    key={artifact.id}
                    onClick={() => onSelectArtifact(artifact)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      selectedArtifactId === artifact.id
                        ? 'bg-gray-100'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                        getArtifactColor(artifact.type)
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {artifact.title}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {ARTIFACT_TYPES[artifact.type]?.label}
                      </p>
                      {sharedByName && (
                        <p className="truncate text-xs text-blue-500">
                          Compartilhado por {sharedByName}
                        </p>
                      )}
                      {originChatName && (
                        <p className="truncate text-xs text-gray-400">
                          💬 {originChatName}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </nav>
          </>
        )}

        {/* Conversations - só mostra se houver conversas */}
        {project.conversations.length > 0 && (
          <>
            <div className="mt-4 px-4 py-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-gray-400">
                CONVERSAS
              </h4>
            </div>
            <nav className="space-y-0.5 px-3 pb-4">
              {project.conversations.map(conversation => (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    selectedConversationId === conversation.id
                      ? 'bg-gray-100'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                      getConversationColor(conversation.agentType)
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {conversation.title}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="size-3" />
                      <span>{formatDate(conversation.createdAt)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </aside>
  )
}
