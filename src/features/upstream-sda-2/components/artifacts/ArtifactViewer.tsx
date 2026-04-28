/* eslint-disable no-console */
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Edit2,
  History,
  Pencil,
  RefreshCw,
  Share2,
  Sparkles,
  Users2,
} from 'lucide-react'

import { SDAServiceConfig } from '@/features/artifacts/services'
import { ArtifactService } from '@/features/artifacts/services/artifact.service'
import { DiagramAwareContent } from '@/shared/components/diagram/DiagramAwareContent'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useI18n } from '@/shared/hooks/use-i18n'
import { cn } from '@/shared/lib/utils'

import { ARTIFACT_TYPES, type Artifact, type Project } from '../../types'
import { ArtifactAIEditPanel } from './ArtifactAIEditPanel'
import { ArtifactDirectEditPanel } from './ArtifactDirectEditPanel'
import { ArtifactHistorySidebar } from './ArtifactHistorySidebar'
import { AzureDevOpsConfigModal } from './AzureDevOpsConfigModal'
import { BacklogHierarchyView } from './BacklogHierarchyView'
import { ShareArtifactModal } from './ShareArtifactModal'

type EditMode = 'view' | 'direct' | 'ai'
type ViewMode = 'markdown' | 'hierarchy'

export type ExportFormat = 'markdown' | 'csv' | 'txt'

interface ArtifactViewerProps {
  artifact: Artifact
  config: SDAServiceConfig | null
  isLoadingVersion?: boolean
  viewingVersionNumber?: number
  onExport?: (format: ExportFormat) => void
  onVersionSelect?: (versionId: string, versionNumber: number) => void
  /** Callback para salvar edição direta */
  onSaveEdit?: (content: string) => Promise<void>
  /** Callback para enviar mensagem no modo de edição com IA */
  onAIEditMessage?: (message: string) => Promise<string | null>
  /** Indica se está salvando */
  isSaving?: boolean
  /** Conteúdo em streaming do supervisor (para modo IA) */
  streamingContent?: string
  /** Callback quando labels de versão são atualizados */
  onLabelsChange?: (
    labels: import('@/features/artifacts/types/version-labels.types').VersionLabelsMap
  ) => void
  /** Labels de versão do componente pai para sincronização */
  versionLabels?:
    | import('@/features/artifacts/types/version-labels.types').VersionLabelsMap
    | null
  /** Project relacionado ao artefato (para acessar equipe) */
  project?: Project | null
  /** Slug do projeto */
  projectSlug?: string
  /** Slug do chat */
  chatSlug?: string
  /** Callback para compartilhar artefato */
  onShareArtifact?: (userIds: string[]) => Promise<void>
}

export function ArtifactViewer({
  artifact,
  config,
  isLoadingVersion = false,
  viewingVersionNumber,
  onExport,
  onVersionSelect,
  onSaveEdit,
  onAIEditMessage,
  isSaving = false,
  streamingContent = '',
  onLabelsChange,
  versionLabels,
  project,
  projectSlug,
  chatSlug,
  onShareArtifact,
}: ArtifactViewerProps) {
  const [editMode, setEditMode] = useState<EditMode>('view')
  const [viewMode, setViewMode] = useState<ViewMode>('markdown')
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false)
  const [isAzureDevOpsModalOpen, setIsAzureDevOpsModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [versionCount, setVersionCount] = useState<number>(artifact.version)
  const [refreshVersionCount, setRefreshVersionCount] = useState(0)
  const typeInfo = ARTIFACT_TYPES[artifact.type]
  const { t, formatDate: formatDateI18n, currentLanguage } = useI18n('pages')

  // Verificar se o usuário atual é o dono do artefato
  // Usa createdBy (email) como campo primário de ownership
  // Se é dono, mostra todas as ações; se não, só download
  const isOwner = useMemo(() => {
    const currentUserEmail = config?.userEmail?.toLowerCase() || ''
    const currentUserId = config?.userId || ''

    // 1. Verificar por createdBy (email) - campo primário
    if (artifact.createdBy) {
      return artifact.createdBy.toLowerCase() === currentUserEmail
    }

    // 2. Fallback para ownerId (campo legado)
    if (artifact.ownerId) {
      const ownerIdMatch = artifact.ownerId === currentUserId
      const ownerEmailMatch =
        artifact.ownerId.toLowerCase() === currentUserEmail
      return ownerIdMatch || ownerEmailMatch
    }

    // 3. Sem createdBy nem ownerId = artefato do próprio usuário
    return true
  }, [config?.userId, config?.userEmail, artifact.createdBy, artifact.ownerId])

  // Gerar key única para forçar re-render do BacklogHierarchyView quando content mudar
  // Usando um hash simples do content + versão atual
  const contentKey = useMemo(() => {
    const hash = artifact.content
      ? artifact.content.slice(0, 100) + artifact.content.length
      : ''
    return `${artifact.id}-${viewingVersionNumber || artifact.version}-${hash}`
  }, [artifact.id, artifact.content, artifact.version, viewingVersionNumber])

  // Verificar se é um artefato de backlog/épicos (pode ter visualização hierárquica)
  const isBacklogArtifact = artifact.type === 'epics'

  // Buscar a contagem real de versões do Cockpit
  useEffect(() => {
    const fetchVersionCount = async () => {
      if (
        !config ||
        !artifact.projectSlug ||
        !artifact.chatSlug ||
        !artifact.documentType
      ) {
        return
      }

      try {
        const artifactService = new ArtifactService({
          baseUrl: config.baseUrl,
          accessToken: config.accessToken,
          licenseId: config.licenseId,
          namespaceId: config.namespaceId,
        })

        const artifactKey = `document-${artifact.documentType}-${artifact.projectSlug}-${artifact.chatSlug}`
        const artifactDto = await artifactService.getByKey(artifactKey)

        // Buscar versões para contar
        const versions = await artifactService.getVersionsByArtifactId(
          artifactDto.id
        )
        setVersionCount(versions.length)
      } catch (error) {
        console.error(
          '[ArtifactViewer] Erro ao buscar contagem de versões:',
          error
        )
        // Fallback para a versão do artefato
        setVersionCount(artifact.version)
      }
    }

    fetchVersionCount()
  }, [
    config,
    artifact.projectSlug,
    artifact.chatSlug,
    artifact.documentType,
    artifact.version,
    refreshVersionCount,
  ])

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString)
      return currentLanguage === 'pt-BR'
        ? 'Data não disponível'
        : 'Date not available'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime()))
        return currentLanguage === 'pt-BR' ? 'Data inválida' : 'Invalid date'
      // Use different format based on language
      const dateFormat =
        currentLanguage === 'pt-BR' ? "dd 'de' MMMM 'de' yyyy" : 'MMMM dd, yyyy'
      return formatDateI18n(date, dateFormat)
    } catch {
      return currentLanguage === 'pt-BR' ? 'Data inválida' : 'Invalid date'
    }
  }

  const handleDirectEdit = () => {
    setEditMode('direct')
  }

  const handleAIEdit = () => {
    setEditMode('ai')
  }

  const handleCancelEdit = () => {
    setEditMode('view')
  }

  const handleSaveDirectEdit = async (content: string) => {
    if (onSaveEdit) {
      await onSaveEdit(content)
    }
    setEditMode('view')
    // Atualizar contagem de versões após salvar
    setRefreshVersionCount(prev => prev + 1)
  }

  const handleAcceptAIEdit = async (content: string) => {
    if (onSaveEdit) {
      await onSaveEdit(content)
    }
    // Não fecha o modo de edição com IA - mantém aberto para continuar editando
    // O visual verde é controlado pelo ArtifactAIEditPanel
    // Atualizar contagem de versões após salvar
    setRefreshVersionCount(prev => prev + 1)
  }

  // Renderiza o painel de edição direta
  if (editMode === 'direct') {
    return (
      <ArtifactDirectEditPanel
        artifact={artifact}
        onSave={handleSaveDirectEdit}
        onCancel={handleCancelEdit}
        isSaving={isSaving}
      />
    )
  }

  // Renderiza o painel de edição com IA
  if (editMode === 'ai') {
    return (
      <ArtifactAIEditPanel
        artifact={artifact}
        onCancel={handleCancelEdit}
        onSendMessage={onAIEditMessage}
        onAcceptEdit={handleAcceptAIEdit}
        isProcessing={isSaving}
        streamingContent={streamingContent}
      />
    )
  }

  // Renderiza a visualização hierárquica do backlog (para sincronização com Azure DevOps)
  if (viewMode === 'hierarchy' && isBacklogArtifact) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-card">
        {/* Header com botão de voltar */}
        <div className="shrink-0 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('markdown')}
              className="gap-2"
            >
              <ArrowLeft className="size-4" />
              {t('sda2.workspace.backToView')}
            </Button>
            <span className="text-muted-foreground">|</span>
            <h1 className="text-xl font-semibold text-foreground">
              {artifact.title}
            </h1>
          </div>
        </div>

        {/* Conteúdo da hierarquia */}
        <div className="flex-1 overflow-hidden">
          <BacklogHierarchyView
            key={contentKey}
            content={artifact.content}
            projectId={artifact.projectSlug}
            chatSlug={artifact.chatSlug}
            backlogVersion={
              viewingVersionNumber?.toString() || artifact.version.toString()
            }
            artifactTitle={artifact.title}
            onBack={() => setViewMode('markdown')}
          />
        </div>
      </div>
    )
  }

  // Modo de visualização padrão (markdown)
  return (
    <div className="flex h-full overflow-hidden bg-card">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-xl font-semibold text-foreground">
            {artifact.title}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
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
            {/* Badge de Compartilhado - exibido quando usuário NÃO é dono */}
            {!isOwner && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  <Users2 className="size-3" />
                  Compartilhado com você
                </span>
              </>
            )}
          </div>

          {/* Action Buttons - Igual ao Figma */}
          <div className="mt-4 flex items-center gap-2">
            {/* Histórico - apenas para donos */}
            {isOwner && (
              <Button
                variant={isHistorySidebarOpen ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsHistorySidebarOpen(!isHistorySidebarOpen)}
                disabled={isLoadingVersion}
                className={cn(
                  'gap-1.5 transition-colors',
                  isHistorySidebarOpen &&
                    'bg-orange-500 text-white hover:bg-orange-600'
                )}
              >
                <History className="size-4" />
                Histórico
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                  {versionCount}
                </span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="size-4" />
                  Exportar
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onExport?.('markdown')}
                  className="gap-2"
                >
                  Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onExport?.('csv')}
                  className="gap-2"
                >
                  CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onExport?.('txt')}
                  className="gap-2"
                >
                  Texto (.txt)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Botão de Compartilhar - apenas para donos, desabilitado se não finalizado */}
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-1.5',
                  !artifact.finalized && 'cursor-not-allowed opacity-40'
                )}
                onClick={() => {
                  if (artifact.finalized) {
                    setIsShareModalOpen(true)
                  }
                }}
                disabled={
                  !artifact.finalized ||
                  !project?.team ||
                  project.team.length === 0
                }
                title={
                  !artifact.finalized
                    ? (t(
                        'sda2.workspace.finalizeBeforeShare' as never
                      ) as string)
                    : undefined
                }
              >
                <Share2 className="size-4" />
                {t('sda2.workspace.share' as never)}
              </Button>
            )}

            {/* Botão de Editar - apenas para donos */}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-orange-500 hover:bg-orange-600"
                  >
                    <Edit2 className="size-4" />
                    Editar
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDirectEdit}
                    className="gap-2"
                  >
                    <Pencil className="size-4" />
                    Modo de edição direta
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAIEdit} className="gap-2">
                    <Sparkles className="size-4" />
                    Solicitação de edição com IA
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {/* Sincronizar Azure DevOps - apenas para donos de backlog */}
            {isOwner && isBacklogArtifact && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <RefreshCw className="size-4" />
                    Sincronizar
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="gap-2"
                    onClick={() => {
                      console.log(
                        '🔄 [ArtifactViewer] Switching to hierarchy view mode'
                      )
                      setViewMode('hierarchy')
                    }}
                  >
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M0 8.877L2.247 5.91l8.405-3.416V.022l7.37 5.393L2.966 8.338v8.225L0 15.707V8.877zm21.034 6.246l-8.405 3.416v2.472l-7.37-5.393 15.056-2.923v-8.225L24 5.326v6.83l-2.966 2.967z" />
                    </svg>
                    Azure DevOps
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingVersion ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                <p className="text-gray-500">Carregando versão...</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-8">
              <article className="prose prose-sm prose-gray max-w-none dark:prose-invert">
                <DiagramAwareContent
                  content={artifact.content}
                  markdownComponents={{
                    h1: ({ children }) => (
                      <h1 className="mb-4 text-2xl font-bold text-foreground">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="mb-3 mt-6 text-xl font-semibold text-foreground">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mb-2 mt-4 text-lg font-semibold text-foreground/90">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-3 leading-relaxed text-foreground/80">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-4 list-disc space-y-1 pl-5">
                        {children}
                      </ul>
                    ),
                    li: ({ children }) => (
                      <li className="text-foreground/80">{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">
                        {children}
                      </strong>
                    ),
                  }}
                />
              </article>
            </div>
          )}
        </div>
      </div>

      {/* History Sidebar */}
      <ArtifactHistorySidebar
        isOpen={isHistorySidebarOpen}
        onClose={() => setIsHistorySidebarOpen(false)}
        projectSlug={artifact.projectSlug}
        chatSlug={artifact.chatSlug}
        documentType={artifact.documentType}
        currentVersion={artifact.version}
        viewingVersionNumber={viewingVersionNumber}
        config={config}
        onVersionSelect={version => {
          if (onVersionSelect) {
            const versionNumber = parseInt(version.version || '0')
            onVersionSelect(version.id, versionNumber)
          }
        }}
        onLabelsChange={onLabelsChange}
        externalVersionLabels={versionLabels}
      />

      {/* Azure DevOps Config Modal */}
      <AzureDevOpsConfigModal
        isOpen={isAzureDevOpsModalOpen}
        onClose={() => setIsAzureDevOpsModalOpen(false)}
        projectId={artifact.projectSlug}
      />

      {/* Share Artifact Modal */}
      {project && projectSlug && chatSlug && (
        <ShareArtifactModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onShare={async (selectedUserIds: string[]) => {
            if (onShareArtifact) {
              await onShareArtifact(selectedUserIds)
              setIsShareModalOpen(false)
            }
          }}
          teamMembers={project.team || []}
          currentSharedWith={artifact.sharedWith || []}
          artifactName={artifact.name}
          artifactVersion={artifact.version.toString()}
          currentUserId={config?.userId}
        />
      )}
    </div>
  )
}
