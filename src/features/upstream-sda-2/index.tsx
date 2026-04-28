'use client'

import { useEffect, useMemo, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

import { useI18n } from '@/shared/hooks/use-i18n'

import { useCockpitServices } from './hooks/useCockpitServices'
import { ArtifactPage } from './pages/ArtifactPage'
import { HomePage } from './pages/HomePage'
import { ProjectPage } from './pages/ProjectPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { useProjectStore } from './stores/projectStore'
import type { Conversation, Project, User } from './types'

// ============================================================================
// Types
// ============================================================================

type ViewType = 'home' | 'project' | 'artifact'

// ============================================================================
// Main App Component for Upstream SDA 2.0
// ============================================================================

export function UpstreamSDA2App() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useI18n('pages')
  const {
    user,
    setUser,
    currentProject,
    setCurrentProject,
    currentArtifact,
    setCurrentArtifact,
    // currentConversation não é lido diretamente, apenas setCurrentConversation é usado
    setCurrentConversation,
    viewMode,
    setViewMode,
  } = useProjectStore()

  const [isReady, setIsReady] = useState(false)
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)
  const [currentView, setCurrentView] = useState<ViewType>('home')
  const [isLoadingProject, setIsLoadingProject] = useState(false)

  // Get Cockpit services para carregar detalhes do projeto
  const { loadProjectDetails, isReady: isCockpitReady } = useCockpitServices()

  // Artifacts do projeto atual - disponível para uso futuro
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _artifacts = useMemo(
    () => currentProject?.artifacts || [],
    [currentProject]
  )

  // Sync user from session - only on initial load, not on refetch
  useEffect(() => {
    // Se já carregou inicialmente, não precisa re-sincronizar o user
    if (hasInitiallyLoaded) return

    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (session?.user) {
      const sessionUser: User = {
        id: (session.user as any).id || session.user.email || 'unknown',
        name: session.user.name || 'Usuário',
        email: session.user.email || '',
        avatar: session.user.image || undefined,
      }
      setUser(sessionUser)
      setIsReady(true)
      setHasInitiallyLoaded(true)
    }
  }, [session, status, router, setUser, hasInitiallyLoaded])

  // Handle unauthenticated on refetch (session expired)
  useEffect(() => {
    if (hasInitiallyLoaded && status === 'unauthenticated') {
      router.push('/login')
    }
  }, [hasInitiallyLoaded, status, router])

  // Sync view based on state
  useEffect(() => {
    if (currentArtifact && viewMode === 'artifact') {
      setCurrentView('artifact')
    } else if (currentProject) {
      setCurrentView('project')
    } else {
      setCurrentView('home')
    }
  }, [currentProject, currentArtifact, viewMode])

  const handleLogout = async () => {
    setUser(null)
    setCurrentProject(null)
    setCurrentArtifact(null)
    setCurrentConversation(null)
    await signOut({ callbackUrl: '/login' })
  }

  const handleSelectProject = async (project: Project) => {
    // Se os detalhes já foram carregados (ex: projeto recém criado), navegar direto
    if (project.detailsLoaded) {
      setCurrentProject(project)
      setCurrentArtifact(null)
      setCurrentConversation(null)
      setViewMode('chat')
      setCurrentView('project')
      return
    }

    // Carregar detalhes completos do projeto (chats + artifacts)
    setIsLoadingProject(true)
    try {
      const projectSlug =
        project.slug ||
        project.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .substring(0, 100)
      console.log(
        '📂 [SDA2] Abrindo projeto:',
        project.name,
        '(slug:',
        projectSlug,
        ')'
      )

      if (isCockpitReady) {
        const result = await loadProjectDetails(projectSlug)
        if (result.success && result.project) {
          setCurrentProject(result.project)
          setCurrentArtifact(null)
          setCurrentConversation(null)
          setViewMode('chat')
          setCurrentView('project')
          return
        } else {
          console.warn(
            '⚠️ [SDA2] Falha ao carregar detalhes, abrindo com dados básicos:',
            result.error
          )
        }
      }

      // Fallback: abrir projeto sem detalhes
      setCurrentProject(project)
      setCurrentArtifact(null)
      setCurrentConversation(null)
      setViewMode('chat')
      setCurrentView('project')
    } catch (error) {
      console.error('❌ [SDA2] Erro ao abrir projeto:', error)
      // Fallback: abrir projeto sem detalhes
      setCurrentProject(project)
      setCurrentArtifact(null)
      setCurrentConversation(null)
      setViewMode('chat')
      setCurrentView('project')
    } finally {
      setIsLoadingProject(false)
    }
  }

  const handleGoHome = () => {
    setCurrentProject(null)
    setCurrentArtifact(null)
    setCurrentConversation(null)
    setViewMode('chat')
    setCurrentView('home')
  }

  const handleBackToProject = () => {
    setCurrentArtifact(null)
    setViewMode('chat')
    setCurrentView('project')
  }

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation)
    setCurrentArtifact(null)
    setViewMode('chat')
    setCurrentView('project')
  }

  // Loading state - only show on initial load, not on refetch
  if (!hasInitiallyLoaded && (status === 'loading' || !isReady)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-gray-500">{t('sda2.workspace.loading' as any)}</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return null
  }

  // Render based on current view
  const renderContent = () => {
    switch (currentView) {
      case 'artifact':
        if (currentProject && currentArtifact) {
          return (
            <ArtifactPage
              user={user}
              project={currentProject}
              artifact={currentArtifact}
              onLogout={handleLogout}
              onHome={handleGoHome}
              onBack={handleBackToProject}
              onSelectConversation={handleSelectConversation}
            />
          )
        }
        // Fallback to project view if no artifact selected
        setCurrentView('project')
        return null

      case 'project':
        if (currentProject) {
          return (
            <WorkspacePage
              user={user}
              project={currentProject}
              onLogout={handleLogout}
              onHome={handleGoHome}
              onBack={handleGoHome}
            />
          )
        }
        // Fallback to home if no project selected
        setCurrentView('home')
        return null

      case 'home':
      default:
        return (
          <HomePage
            user={user}
            onLogout={handleLogout}
            onSelectProject={handleSelectProject}
          />
        )
    }
  }

  // Render content directly (CopilotKit context via useSupervisorChatWithCopilot hook)
  return (
    <>
      {renderContent()}
      {/* Full-screen loading overlay ao abrir projeto */}
      {isLoadingProject && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 shadow-2xl">
            <div className="relative">
              <div className="size-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-8 animate-pulse rounded-full bg-primary/10" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                {t('sda2.home.loadingProject' as any)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('sda2.home.fetchingConversationsArtifactsHistory' as any)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Re-export components for external use
export { ArtifactPage } from './pages/ArtifactPage'
export { HomePage } from './pages/HomePage'
export { ProjectPage } from './pages/ProjectPage'
export { WorkspacePage } from './pages/WorkspacePage'
export { useProjectStore } from './stores/projectStore'
export * from './types'
