/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellRing,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Download,
  Edit3,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  History,
  Layers,
  ListChecks,
  Loader2,
  Lock,
  LogOut,
  Maximize2,
  MessageSquare,
  MessageSquarePlus,
  Minimize2,
  Moon,
  Palette,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  User,
  Users as UsersIcon,
  X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'

import { ArtifactService, slugify } from '@/features/artifacts/services'
import type { ChatType } from '@/features/artifacts/types/sda-artifacts.types'
import {
  ChatInput,
  type ProjectDocument,
} from '@/features/upstream-sda-2/components/chat/ChatInput'
import {
  DiagramAwareContent,
  hideStreamingDiagramCode,
} from '@/shared/components/diagram/DiagramAwareContent'
import { LanguageSelector } from '@/shared/components/language-selector'
import { LicenseSelector } from '@/shared/components/license-selector'
import { tableComponents } from '@/shared/components/markdown/markdown-table-components'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { useI18n } from '@/shared/hooks/use-i18n'
import {
  mapDocumentTypeToArtifactType as mapToRagArtifactType,
  useRagIndexing,
} from '@/shared/hooks/use-rag-indexing'
import { useUserApiKey } from '@/shared/hooks/use-user-api-key'

import { ArtifactAIEditPanel } from '../components/artifacts/ArtifactAIEditPanel'
import {
  ArtifactProposal,
  extractArtifactSummary,
  type DetectedArtifact,
} from '../components/artifacts/ArtifactProposal'
import { BacklogHierarchyView } from '../components/artifacts/BacklogHierarchyView'
import { HorizontalScrollContainer } from '../components/HorizontalScrollContainer'
import { sdaAgents } from '../data/sda-agents'
import { useCockpitServices } from '../hooks/useCockpitServices'
import { useNamespaceUsers } from '../hooks/useNamespaceUsers'
import { useNotifications } from '../hooks/useNotifications'
import { useProjectProcess } from '../hooks/useProjectProcess'
import { useSupervisorChat } from '../hooks/useSupervisorChat'
import {
  detectArtifactsInMessage,
  isStructuredArtifact,
  removeArtifactMetadata,
} from '../services/artifact.service'
import { azureDevOpsService } from '../services/azure-devops.service'
import { useEditSessionStore } from '../stores/editSessionStore'
import { useProjectStore } from '../stores/projectStore'
import type {
  Artifact,
  Conversation,
  Project,
  User as UserType,
} from '../types'
import { exportArtifact, type ExportFormat } from '../utils/export-artifact'

// ============================================================================
// Types
// ============================================================================

type StageStatus = 'not_started' | 'in_progress' | 'review' | 'completed'

interface Notification {
  id: string
  message: string
  createdAt: string
  read: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  agentId?: string
  attachments?: Array<{
    id: string
    name: string
    size: number
    type: string
  }>
}

// Empty default - no mock messages
const defaultConversation: {
  id: string
  title: string
  slug?: string
  messages: ChatMessage[]
  createdAt: string
  type: string
}[] = []

// ============================================================================
// Status Config
// ============================================================================

const statusConfig: Record<
  StageStatus,
  { labelKey: string; icon: typeof Circle; color: string }
> = {
  not_started: {
    labelKey: 'notStarted',
    icon: Circle,
    color: 'text-muted-foreground',
  },
  in_progress: { labelKey: 'inProgress', icon: Loader2, color: 'text-primary' },
  review: { labelKey: 'review', icon: AlertCircle, color: 'text-warning' },
  completed: {
    labelKey: 'completed',
    icon: CheckCircle2,
    color: 'text-success',
  },
}

// ============================================================================
// Artifact Helper Functions
// ============================================================================

type EditMode = 'view' | 'direct' | 'ai'

/**
 * Constrói o prompt contextualizado para solicitação de edição com IA
 */
function buildEditPrompt(
  userRequest: string,
  artifactTitle: string,
  artifactType: string,
  artifactContent: string
): string {
  const contextParts: string[] = []
  contextParts.push('📝 **MODO DE EDIÇÃO DE ARTEFATO**')
  contextParts.push('')
  contextParts.push(`**Artefato sendo editado:** ${artifactTitle}`)
  contextParts.push(`**Tipo:** ${artifactType}`)
  contextParts.push('')
  contextParts.push('**Conteúdo atual do artefato (base para edição):**')
  contextParts.push('````markdown')
  contextParts.push(artifactContent)
  contextParts.push('````')
  contextParts.push('')
  contextParts.push('**Instrução:**')
  contextParts.push(
    'ATENÇÃO: Isto é um MODO DE EDIÇÃO DIRETA, NÃO um chat conversacional.'
  )
  contextParts.push(
    'Você DEVE aplicar as mudanças solicitadas imediatamente e retornar o artefato completo atualizado.'
  )
  contextParts.push('REGRAS OBRIGATÓRIAS:')
  contextParts.push(
    '1. NÃO faça perguntas ao usuário. NÃO peça esclarecimentos. NÃO sugira opções.'
  )
  contextParts.push(
    '2. Se a solicitação for ambígua, tome a decisão mais razoável e aplique diretamente.'
  )
  contextParts.push(
    '3. Retorne APENAS o conteúdo markdown do artefato editado, sem explicações, introduções ou comentários.'
  )
  contextParts.push(
    '4. Preserve completamente TODAS as seções do artefato original. Não truncar, resumir ou omitir nenhuma seção.'
  )
  contextParts.push(
    '5. Preserve todos os blocos de diagrama (<!-- DIAGRAM --> tags e blocos ```mermaid/```erd/```plantuml).'
  )
  contextParts.push(
    '6. O artefato retornado deve estar COMPLETO - do início ao fim, sem omissões.'
  )
  contextParts.push('')
  contextParts.push('**Solicitação do usuário:**')
  contextParts.push(userRequest)
  return contextParts.join('\n')
}

/**
 * Extrai o conteúdo editado da resposta do agente
 *
 * IMPORTANT: Uses a fence-aware parser instead of a naive lazy regex
 * to avoid truncating content that contains embedded code fences
 * (e.g., ```mermaid, ```sql blocks inside the artifact content).
 */
function extractEditedContent(response: string): string {
  // Try to extract from an outermost markdown code block
  // We can't use a simple regex like /```(?:markdown)?\s*([\s\S]*?)\s*```/
  // because the lazy [\s\S]*? would match up to the FIRST embedded ``` fence,
  // discarding everything after it (e.g., ERD diagrams, code examples).
  const outerContent = extractOuterCodeBlockContent(response)
  if (outerContent !== null) {
    return removeArtifactMetadata(outerContent.trim())
  }
  const lines = response.trim().split('\n')
  if (lines[0]?.startsWith('#') || lines[0]?.startsWith('**')) {
    return removeArtifactMetadata(response.trim())
  }
  const introPatterns = [
    /^(?:Aqui está|Segue|Pronto|Aí está)[^:]*:\s*/i,
    /^(?:O artefato|O documento|O conteúdo)[^:]*:\s*/i,
    /^(?:Versão atualizada|Conteúdo atualizado)[^:]*:\s*/i,
  ]
  let cleanedResponse = response.trim()
  for (const pattern of introPatterns) {
    cleanedResponse = cleanedResponse.replace(pattern, '')
  }
  return removeArtifactMetadata(cleanedResponse.trim())
}

/**
 * Extracts the content from the outermost code block (```markdown, ````markdown,
 * or bare ``` / ````) by tracking fence depth.
 *
 * Supports fences of 3+ backticks. The outer fence length determines the closing
 * match — inner fences with fewer backticks don't close the outer block. This
 * correctly handles content with embedded fenced code blocks (```mermaid, etc.).
 *
 * Returns null if no outer code block is found.
 */
function extractOuterCodeBlockContent(response: string): string | null {
  const lines = response.split('\n')
  let openingFenceIdx = -1
  let closingFenceIdx = -1
  let outerFenceLen = 0 // number of backticks in the outer fence
  let depth = 0

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim()

    // Count leading backticks
    const backtickMatch = trimmed.match(/^(`{3,})/)

    if (openingFenceIdx === -1) {
      // Look for the opening fence: ```markdown, ````markdown, ```, ````
      if (backtickMatch) {
        const ticks = backtickMatch[1]!.length
        const afterTicks = trimmed.slice(ticks).trim()
        // Must be a bare fence or a ```markdown fence (no other content after lang)
        if (afterTicks === '' || afterTicks === 'markdown') {
          openingFenceIdx = i
          outerFenceLen = ticks
          depth = 1
        }
      }
    } else {
      // Inside the outer fence — track nested fences
      if (backtickMatch) {
        const ticks = backtickMatch[1]!.length
        const afterTicks = trimmed.slice(ticks).trim()

        if (ticks >= outerFenceLen && afterTicks === '') {
          // A bare fence with same or more backticks → closes a block
          depth--
          if (depth === 0) {
            closingFenceIdx = i
            break
          }
        } else if (afterTicks !== '') {
          // Opening fence with language: ```mermaid, ````sql, etc.
          depth++
        } else {
          // Bare fence with fewer backticks → closes a nested block
          depth--
          if (depth === 0) {
            closingFenceIdx = i
            break
          }
        }
      }
    }
  }

  if (openingFenceIdx !== -1 && closingFenceIdx !== -1) {
    const contentLines = lines.slice(openingFenceIdx + 1, closingFenceIdx)
    return contentLines.join('\n')
  }

  return null
}

/** Mapeia tipo detectado pelo ARTIFACT_METADATA para tipo de artefato do sistema */
function mapDetectedTypeToArtifactType(detectedType: string): Artifact['type'] {
  const typeMap: Record<string, Artifact['type']> = {
    briefing: 'brief',
    brief: 'brief',
    discovery: 'brief',
    prd: 'prd-greenfield',
    requirements: 'prd-greenfield',
    backlog: 'epics',
    'user-story': 'epics',
    epic: 'epics',
    architecture: 'architecture',
    design: 'frontend-spec',
    'stakeholder-map': 'brief',
    personas: 'brief',
    document: 'fragments',
  }
  return typeMap[detectedType.toLowerCase()] || 'fragments'
}

// ============================================================================
// Component Props
// ============================================================================

interface WorkspacePageProps {
  user: UserType
  project: Project
  /** Tipo do chat ativo (default: 'discovery') */
  chatType?: ChatType
  onLogout: () => void
  onHome: () => void
  onBack: () => void
}

// ============================================================================
// Main Component
// ============================================================================

export function WorkspacePage({
  user,
  project,
  chatType = 'discovery',
  onLogout,
  onHome: _onHome,
  onBack,
}: WorkspacePageProps) {
  const { t, currentLanguage } = useI18n('pages')
  const dateLocale = currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US'
  const {
    currentProject,
    setCurrentProject,
    setCurrentConversation,
    updateProject,
  } = useProjectStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use project data (prefer currentProject from store, fallback to props)
  const activeProject = currentProject || project

  // Hook para persistência no Cockpit
  const {
    isReady: isCockpitReady,
    saveProject,
    createChat,
    saveMessage,
    saveArtifact,
    approveArtifact,
    rejectArtifact,
    updateMessageArtifactStatus,
    loadChatHistory,
    loadProjectDetails,
    loadProjectChats,
    loadArtifactContent,
    shareArtifact,
    updateTeam,
    renameArtifact,
    updateArtifactFinalized,
    renameChat,
    deleteArtifact,
    deleteChat,
    chatService,
    config: cockpitConfig,
  } = useCockpitServices()

  // Hook para indexação RAG (Azure AI Search)
  const { indexArtifact: indexToRag } = useRagIndexing()

  // Estado para tracking de artefatos aceitos/rejeitados durante a sessão
  const [acceptedArtifactKeys, setAcceptedArtifactKeys] = useState<string[]>([])
  const [rejectedArtifactKeys, setRejectedArtifactKeys] = useState<string[]>([])

  // ========================================================================
  // BFF Integration - Supervisor via MCP + LangGraph
  // ========================================================================
  const { apiKey: userApiKeyData } = useUserApiKey()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatScrollContainerRef = useRef<HTMLDivElement>(null)

  const {
    isLoading: isSupervisorLoading,
    error: supervisorError,
    streamingContent,
    sendMessage: sendToSupervisor,
  } = useSupervisorChat(activeProject, {
    userCockpitKey:
      typeof userApiKeyData === 'string'
        ? userApiKeyData
        : userApiKeyData?.key || '',
  })

  // Build conversations from project data — NOT used for initial state anymore
  // Chats are loaded lazily per tab from the API via loadProjectChats

  // Conversations state - starts empty, loaded on-demand per tab
  const [conversations, setConversations] = useState<
    typeof defaultConversation
  >([])
  const [activeConversationId, setActiveConversationId] = useState<string>('')
  // Ref para manter activeConversationId atualizado sem stale closures
  const activeConversationIdRef = useRef(activeConversationId)
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])
  // Ref para evitar carregar projetos mais de uma vez
  const hasLoadedProjectsRef = useRef(false)
  // Loading states for lazy chat/history loading
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  // Cache de chats já garantidos no Cockpit (evita chamadas repetidas)
  const ensuredChatsRef = useRef<
    Map<string, { projectSlug: string; chatSlug: string }>
  >(new Map())
  const [showConversationList, setShowConversationList] = useState(false)
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null)
  const [renameConvValue, setRenameConvValue] = useState('')
  const [isRenamingChatLoading, setIsRenamingChatLoading] = useState(false)

  // Chat state
  const [activeTab, setActiveTab] = useState<'chat' | 'artifact'>('chat')
  const [chatMaximized, setChatMaximized] = useState(false)
  /** Tipo de chat selecionado para filtrar conversas */
  const [selectedChatType, setSelectedChatType] = useState<ChatType>(chatType)

  // Background file processing state
  interface ProcessingResult {
    index: number
    file: File
    fileKey: string // Identificador único: name-size-lastModified
    type: 'image' | 'text' | 'document'
    status: 'pending' | 'processing' | 'completed' | 'error'
    promise?: Promise<string>
    content?: string
    error?: string
    startedAt: number
    completedAt?: number
  }

  // Helper para gerar chave única do arquivo (mais robusta que referência)
  const getFileKey = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`
  }

  const [processingCache, setProcessingCache] = useState<
    Map<number, ProcessingResult>
  >(new Map())

  // Ref que preserva o cache durante Fast Refresh (desenvolvimento)
  // Refs sobrevivem hot reload melhor que useState
  const processingCacheRef = useRef<Map<number, ProcessingResult>>(new Map())

  // Estado para indicar que estamos processando uma mensagem (inclui processamento de arquivos)
  // Ativado imediatamente quando usuário envia, mostra "Processando com o orquestrador"
  const [isProcessingMessage, setIsProcessingMessage] = useState(false) // Agent/Artifact state
  const [selectedAgentId, setSelectedAgentId] = useState<string>('discovery')
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null
  )

  // Mapear tipo de artefato para agentId do painel
  const mapArtifactToAgentId = (art: Artifact): string => {
    // Prioridade 1: tipo do artefato
    const typeMap: Record<string, string> = {
      brief: 'discovery',
      'prd-greenfield': 'product',
      'prd-brownfield': 'product',
      epics: 'backlog',
      architecture: 'tech',
      'frontend-spec': 'ux',
      fragments: 'discovery',
    }
    if (art.type && typeMap[art.type]) {
      return typeMap[art.type]!
    }

    // Prioridade 2: documentType
    const docTypeMap: Record<string, string> = {
      briefing: 'discovery',
      brief: 'discovery',
      discovery: 'discovery',
      prd: 'product',
      requirements: 'product',
      backlog: 'backlog',
      'user-story': 'backlog',
      epic: 'backlog',
      architecture: 'tech',
      design: 'ux',
      'frontend-spec': 'ux',
    }
    if (art.documentType && docTypeMap[art.documentType.toLowerCase()]) {
      return docTypeMap[art.documentType.toLowerCase()]!
    }

    // Fallback: nome do agente
    const name = (art.agentName || '').toLowerCase()
    if (name.includes('ux') || name.includes('sofia')) return 'ux'
    if (
      name.includes('arquitet') ||
      name.includes('wilson') ||
      name.includes('tech')
    )
      return 'tech'
    if (
      name.includes('product') ||
      name.includes('paula') ||
      name.includes('po')
    )
      return 'product'
    if (name.includes('backlog')) return 'backlog'
    return 'discovery'
  }

  // Build artifacts from project data
  const buildArtifactsFromProject = (proj: Project) =>
    (proj.artifacts || []).map(art => ({
      id: art.id,
      agentId: mapArtifactToAgentId(art),
      name: art.customName || art.title,
      customName: art.customName,
      status: (art.finalized
        ? 'completed'
        : art.status === 'draft'
          ? 'in_progress'
          : 'not_started') as StageStatus,
      content: art.content,
      version: art.version,
      createdAt: art.createdAt,
      sharedWith:
        art.sharedWith?.map(s => ({
          name: s.userName,
          email: s.userEmail,
          userId: s.userId,
          sharedAt: s.sharedAt,
          sharedBy: s.sharedByName,
        })) || [],
      finalized: art.finalized === true,
      // Dados para compartilhamento via Cockpit
      chatSlug: art.chatSlug,
      documentType: art.documentType,
      projectSlug: art.projectSlug,
      agentName: art.agentName,
      ownerId: art.ownerId,
      createdBy: art.createdBy,
      createdByName: art.createdByName,
      editedBy: art.editedBy,
      editedByName: art.editedByName,
      editedAt: art.editedAt,
    }))

  const [artifacts, setArtifacts] = useState<
    Array<{
      id: string
      agentId: string
      name: string
      status: StageStatus
      content?: string
      version: number
      createdAt: string
      updatedAt?: string
      sharedWith: Array<{
        name?: string
        email?: string
        userId?: string
        userName?: string
        userEmail?: string
        sharedVersion?: string
        sharedAt?: string
        sharedBy?: string
        sharedByName?: string
      }>
      finalized: boolean
      chatSlug?: string
      documentType?: string
      projectSlug?: string
      customName?: string
      agentName?: string
      ownerId?: string
      createdBy?: string
      createdByName?: string
      editedBy?: string
      editedByName?: string
      editedAt?: string
    }>
  >(() => buildArtifactsFromProject(activeProject))

  // Sincronizar artifacts quando o projeto é atualizado no store
  useEffect(() => {
    setArtifacts(buildArtifactsFromProject(activeProject))
  }, [activeProject.artifacts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Artifacts shared with the current user (for the attachment popover)
  const sharedWithMeDocuments = useMemo(() => {
    return artifacts
      .filter(art =>
        art.sharedWith.some(s => s.email === user.email || s.userId === user.id)
      )
      .map(art => ({
        id: art.id,
        key: art.id,
        name: art.customName || art.name,
        type: art.documentType || 'Artefato',
        description: `Compartilhado por ${art.sharedWith.find(s => s.email !== user.email)?.sharedBy || 'equipe'}`,
      }))
  }, [artifacts, user.email, user.id])

  // My finalized artifacts (owned by current user + finalized)
  const myFinalizedDocuments = useMemo(() => {
    const currentUserEmail =
      cockpitConfig?.userEmail?.toLowerCase() || user.email?.toLowerCase() || ''
    const currentUserId = cockpitConfig?.userId || user.id || ''
    return artifacts
      .filter(art => {
        // Must be finalized
        if (!art.finalized) return false
        // Must be owned by the current user
        if (art.createdBy) {
          return art.createdBy.toLowerCase() === currentUserEmail
        }
        if (art.ownerId) {
          return (
            art.ownerId === currentUserId ||
            art.ownerId.toLowerCase() === currentUserEmail
          )
        }
        // No owner info = assume current user owns it
        return true
      })
      .map(art => ({
        id: art.id,
        key: art.id,
        name: art.customName || art.name,
        type: art.documentType || 'Artefato',
        description: art.agentId || '',
      }))
  }, [
    artifacts,
    user.email,
    user.id,
    cockpitConfig?.userEmail,
    cockpitConfig?.userId,
  ])

  // Edit warning dialog state
  const [showEditWarning, setShowEditWarning] = useState(false)
  const [pendingEditArtifact, setPendingEditArtifact] = useState<string | null>(
    null
  )

  // Rename artifact state
  const [renamingArtifactId, setRenamingArtifactId] = useState<string | null>(
    null
  )
  const [renameArtifactValue, setRenameArtifactValue] = useState('')
  const [isRenamingArtifactLoading, setIsRenamingArtifactLoading] =
    useState(false)

  // Download dropdown state
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [artifactToDelete, setArtifactToDelete] = useState<string | null>(null)
  const [isDeletingArtifact, setIsDeletingArtifact] = useState(false)
  const [isDeletingChat, setIsDeletingChat] = useState<string | null>(null)
  const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareSearch, setShareSearch] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [selectedShareMembers, setSelectedShareMembers] = useState<string[]>([])

  // Sync dropdown state
  const [showSyncMenu, setShowSyncMenu] = useState(false)

  // DevOps modal state
  const [showDevOpsModal, setShowDevOpsModal] = useState(false)
  const [devOpsOrg, setDevOpsOrg] = useState('')
  const [devOpsProject, setDevOpsProject] = useState('')
  const [devOpsPat, setDevOpsPat] = useState('')
  const [devOpsPath, setDevOpsPath] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  // Backlog hierarchy view state (Azure DevOps sync)
  const [isBacklogHierarchyView, setIsBacklogHierarchyView] = useState(false)

  // Hook para detecção antecipada do processo Azure DevOps
  // Inicializado aqui para que o cache seja preenchido assim que o artefato é selecionado
  const adoPat = azureDevOpsService.loadPAT()
  const { processInfo: adoProcessInfo, detectProcess: adoDetectProcess } =
    useProjectProcess(adoPat || undefined)

  // UI state
  const [fullscreen, setFullscreen] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [editMode, setEditMode] = useState<EditMode>('view')
  const [editContent, setEditContent] = useState('')
  const [isLoadingVersion, setIsLoadingVersion] = useState(false)
  const [viewingVersionNumber, setViewingVersionNumber] = useState<
    number | undefined
  >(undefined)
  const [viewingVersionMetadata, setViewingVersionMetadata] = useState<{
    createdAt: string
    createdBy: string | null
    createdByName: string | null
    updatedAt: string | null
  } | null>(null)
  const [allVersionsMetadata, setAllVersionsMetadata] = useState<
    Array<{
      versionNumber: number
      createdAt: string
      createdBy: string | null
      createdByName: string | null
      updatedAt: string | null
    }>
  >([])

  // Ref para controlar reload de metadados e evitar duplicação
  const isReloadingMetadataRef = useRef(false)

  // Reset hierarchy view when switching artifacts
  useEffect(() => {
    setIsBacklogHierarchyView(false)
  }, [selectedArtifactId])

  // Detecção antecipada do processo Azure DevOps ao selecionar artefato backlog
  // Preenche o cache do useProjectProcess para que o SyncModal já tenha a info pronta
  useEffect(() => {
    if (!selectedArtifactId || selectedAgentId !== 'backlog') return

    const detectEarly = async () => {
      try {
        const currentPat = azureDevOpsService.loadPAT()
        if (!currentPat) return

        // Carregar config do projeto para obter org e project
        const savedConfig = activeProject?.id
          ? await azureDevOpsService.loadProjectConfig(activeProject.id)
          : null

        if (!savedConfig?.organization || !savedConfig?.project) return

        // Detectar processo (usa cache interno de 5min)
        await adoDetectProcess(savedConfig.organization, savedConfig.project)
      } catch {
        // Silencioso - é apenas pré-cache, erro será tratado no SyncModal
      }
    }

    detectEarly()
  }, [selectedArtifactId, selectedAgentId, activeProject?.id, adoDetectProcess])

  // Derived boolean for backward compatibility
  const editingArtifact = editMode !== 'view'

  // Edit session store (for AI edit)
  const {
    startSession: startEditSession,
    endSession: endEditSession,
    addProposal,
    session: _editSession,
  } = useEditSessionStore()

  // Team modal state
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [teamSearch, setTeamSearch] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [localTeamMembers, setLocalTeamMembers] = useState(
    () => currentProject?.team || project.team || []
  )

  // Buscar membros do namespace via API (sem search para carregar todos, filtramos localmente)
  const { users: namespaceUsers, isLoading: isLoadingUsers } =
    useNamespaceUsers({
      disabled: !showTeamModal && !showShareModal,
    })

  // Ordenar alfabeticamente por nome
  const sortedNamespaceUsers = [...namespaceUsers].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR')
  )

  // Filtrar localmente baseado na busca
  const filteredBySearch = teamSearch
    ? sortedNamespaceUsers.filter(
        m =>
          m.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
          m.email.toLowerCase().includes(teamSearch.toLowerCase())
      )
    : sortedNamespaceUsers

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  // Derived state
  const activeConversation = conversations.find(
    c => c.id === activeConversationId
  )
  const messages = activeConversation?.messages || []
  const selectedAgent = sdaAgents.find(a => a.id === selectedAgentId)

  // DEBUG: Verificar filtragem de artifacts
  console.log('🔍 [WorkspacePage] Filtrando artifacts:', {
    totalArtifacts: artifacts.length,
    selectedAgentId,
    artifactsWithAgentId: artifacts.filter(a => a.agentId).length,
    artifactsWithoutAgentId: artifacts.filter(a => !a.agentId).length,
    artifacts: artifacts.map(a => ({
      id: a.id,
      agentId: a.agentId,
      name: a.name,
    })),
  })

  const agentArtifacts = artifacts.filter(a => a.agentId === selectedAgentId)

  console.log('🔍 [WorkspacePage] Artifacts filtrados:', {
    agentArtifactsCount: agentArtifacts.length,
    agentArtifacts: agentArtifacts.map(a => ({
      id: a.id,
      agentId: a.agentId,
      name: a.name,
    })),
  })

  // OTIMIZAÇÃO: Cachear detecção de artefatos para evitar reprocessamento
  // Detecta artefatos em cada mensagem apenas UMA VEZ e cacheia o resultado
  const messagesWithArtifacts = useMemo(() => {
    console.log(
      '🔄 [useMemo messagesWithArtifacts] Processando mensagens:',
      messages.length
    )
    return messages.map(msg => {
      const hasArtifact =
        msg.role === 'assistant' && isStructuredArtifact(msg.content)
      const detectedArtifacts = hasArtifact
        ? detectArtifactsInMessage(msg.content, msg.id)
        : []
      const displayContent = hasArtifact
        ? removeArtifactMetadata(msg.content)
        : msg.content

      if (detectedArtifacts.length > 0) {
        console.log(
          `✅ [useMemo] Artefatos detectados na mensagem ${msg.id}:`,
          detectedArtifacts.length
        )
      }

      return {
        ...msg,
        hasArtifact,
        detectedArtifacts,
        displayContent,
      }
    })
  }, [messages])

  // Usar useMemo para garantir que selectedArtifact seja recalculado
  // quando artifacts mudar, ANTES de useEffects rodarem
  const selectedArtifact = useMemo(() => {
    const artifact = artifacts.find(a => a.id === selectedArtifactId)
    if (artifact) {
      console.log('🔍 [useMemo selectedArtifact] Recalculado:', {
        id: artifact.id,
        version: artifact.version,
        updatedAt: artifact.updatedAt,
      })
    }
    return artifact
  }, [artifacts, selectedArtifactId])

  // Verificar se o usuário atual é o dono do artefato selecionado
  // Usa createdBy (email) como campo primário de ownership
  // Se createdBy não existe E ownerId não existe, assume que é dono
  // Se é dono, já corta as verificações de permissão (mostra tudo)
  const isSelectedArtifactOwner = useMemo(() => {
    if (!selectedArtifact) return false
    const currentUserEmail = cockpitConfig?.userEmail?.toLowerCase() || ''
    const currentUserId = cockpitConfig?.userId || ''

    // 1. Verificar por createdBy (email) - campo primário
    if (selectedArtifact.createdBy) {
      return selectedArtifact.createdBy.toLowerCase() === currentUserEmail
    }

    // 2. Fallback para ownerId (campo legado)
    if (selectedArtifact.ownerId) {
      const ownerIdMatch = selectedArtifact.ownerId === currentUserId
      const ownerEmailMatch =
        selectedArtifact.ownerId.toLowerCase() === currentUserEmail
      return ownerIdMatch || ownerEmailMatch
    }

    // 3. Sem createdBy nem ownerId = artefato do próprio usuário
    return true
  }, [selectedArtifact, cockpitConfig?.userId, cockpitConfig?.userEmail])

  // Notificações de artefatos compartilhados (filtradas pelo projeto ativo)
  const {
    notifications: sharedArtifactNotifications,
    unreadNotifications: sharedArtifactUnreadNotifications,
    unreadCount: sharedArtifactUnreadCount,
    markAsRead: markSharedArtifactAsRead,
    markAllAsDeleted: markAllSharedArtifactsAsDeleted,
  } = useNotifications(activeProject?.id)

  // Contagem total de não lidas (notificações locais + artefatos compartilhados)
  const localUnreadCount = notifications.filter(n => !n.read).length
  const unreadCount = localUnreadCount + sharedArtifactUnreadCount

  // ========================================================================
  // Marcar notificação de artefato compartilhado como lida ao visualizar
  // ========================================================================
  useEffect(() => {
    if (!selectedArtifact || !activeProject?.id) return

    // Verifica se há notificação não lida para este artefato
    const notification = sharedArtifactUnreadNotifications.find(
      n =>
        n.artifactId === selectedArtifact.id && n.projectId === activeProject.id
    )

    if (notification) {
      console.log(
        '📬 [WorkspacePage] Marcando notificação como lida:',
        notification.id
      )
      markSharedArtifactAsRead(notification.id)
    }
  }, [
    selectedArtifact?.id,
    activeProject?.id,
    sharedArtifactUnreadNotifications,
    markSharedArtifactAsRead,
  ])

  // ========================================================================
  // Carregar conteúdo do artefato sob demanda ao selecionar
  // Artefatos vêm de loadProjects com content: '' e precisam ser carregados
  // Isso é crítico para artefatos compartilhados que nunca tiveram conteúdo
  // em memória no contexto do usuário receptor
  // ========================================================================
  const [isLoadingArtifactContent, setIsLoadingArtifactContent] =
    useState(false)

  useEffect(() => {
    const loadContent = async () => {
      if (
        !selectedArtifact ||
        selectedArtifact.content ||
        !selectedArtifact.chatSlug ||
        !selectedArtifact.documentType ||
        !selectedArtifact.projectSlug ||
        !isCockpitReady
      ) {
        return
      }

      console.log('📥 [WorkspacePage] Carregando conteúdo do artefato:', {
        id: selectedArtifact.id,
        name: selectedArtifact.name,
        projectSlug: selectedArtifact.projectSlug,
        chatSlug: selectedArtifact.chatSlug,
        documentType: selectedArtifact.documentType,
      })

      setIsLoadingArtifactContent(true)
      try {
        const result = await loadArtifactContent(
          selectedArtifact.projectSlug,
          selectedArtifact.chatSlug,
          selectedArtifact.documentType
        )

        if (result.success && result.content) {
          console.log(
            '✅ [WorkspacePage] Conteúdo carregado para:',
            selectedArtifact.name
          )
          // Atualizar o artefato no array local com o conteúdo, versão e ownership carregados
          setArtifacts(prev =>
            prev.map(a =>
              a.id === selectedArtifact.id
                ? {
                    ...a,
                    content: result.content,
                    version: result.version
                      ? parseInt(result.version)
                      : a.version,
                    updatedAt: result.updatedAt || a.updatedAt,
                    // ✅ Mapear createdBy do documento para ownership check
                    createdBy: result.createdBy || a.createdBy,
                    createdByName: result.createdByName || a.createdByName,
                    // ✅ Atualizar sharedWith do documento (pode ter mudado)
                    sharedWith:
                      result.sharedWith?.map(s => ({
                        name: s.userName,
                        email: s.userEmail,
                        userId: s.userId,
                        sharedAt: s.sharedAt,
                        sharedBy: s.sharedByName,
                      })) || a.sharedWith,
                  }
                : a
            )
          )
        } else {
          console.warn(
            '⚠️ [WorkspacePage] Falha ao carregar conteúdo:',
            result.error
          )
        }
      } catch (error) {
        console.error('❌ [WorkspacePage] Erro ao carregar conteúdo:', error)
      } finally {
        setIsLoadingArtifactContent(false)
      }
    }

    loadContent()
  }, [
    selectedArtifactId,
    selectedArtifact?.content,
    selectedArtifact?.chatSlug,
    selectedArtifact?.documentType,
    selectedArtifact?.projectSlug,
    isCockpitReady,
    loadArtifactContent,
  ])

  // Carregar metadados de todas as versões quando o painel de versões é aberto
  // ou quando a versão do artefato selecionado muda
  // OTIMIZAÇÃO: Removido selectedArtifact?.updatedAt das dependências para evitar loops
  useEffect(() => {
    if (showVersions && selectedArtifact) {
      console.log('🔄 [useEffect] Versão mudou, recarregando metadados:', {
        showVersions,
        artifactId: selectedArtifact.id,
        version: selectedArtifact.version,
      })
      loadAllVersionsMetadata()
    }
  }, [showVersions, selectedArtifactId, selectedArtifact?.version])

  // Auto-scroll quando mensagens ou conteúdo streaming mudam
  useEffect(() => {
    const container = chatScrollContainerRef.current
    if (!container) return

    // Usa requestAnimationFrame para garantir que o DOM foi atualizado
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
  }, [messages, streamingContent, isSupervisorLoading])

  // Configuração das tabs de tipo de chat
  // Memoizar constantes para evitar recriação a cada render
  const chatTypeTabs = useMemo<{ value: ChatType; label: string }[]>(
    () => [
      {
        value: 'discovery',
        label: t('sda2.workspace.chatTypes.discovery' as any),
      },
      { value: 'prd', label: t('sda2.workspace.chatTypes.prd' as any) },
      { value: 'backlog', label: t('sda2.workspace.chatTypes.backlog' as any) },
      {
        value: 'architecture',
        label: t('sda2.workspace.chatTypes.architecture' as any),
      },
      {
        value: 'ux-design',
        label: t('sda2.workspace.chatTypes.uxDesign' as any),
      },
    ],
    [t]
  )

  // Função para obter nome do artefato com tradução
  const getDocumentTypeName = useCallback(
    (documentType: string): string => {
      const names: Record<string, string> = {
        briefing: t('sda2.workspace.documentTypes.discoveryDocument' as any),
        brief: t('sda2.workspace.documentTypes.discoveryDocument' as any),
        discovery: t('sda2.workspace.documentTypes.discoveryDocument' as any),
        prd: t('sda2.workspace.documentTypes.prd' as any),
        requirements: t('sda2.workspace.documentTypes.requirements' as any),
        backlog: t('sda2.workspace.documentTypes.productBacklog' as any),
        'user-story': t('sda2.workspace.documentTypes.productBacklog' as any),
        epic: t('sda2.workspace.documentTypes.productBacklog' as any),
        architecture: t(
          'sda2.workspace.documentTypes.architectureDocument' as any
        ),
        design: t('sda2.workspace.documentTypes.designSpecification' as any),
        'frontend-spec': t(
          'sda2.workspace.documentTypes.designSpecification' as any
        ),
        document: t('sda2.workspace.documentTypes.document' as any),
      }
      return (
        names[documentType.toLowerCase()] ||
        t('sda2.workspace.documentTypes.document' as any)
      )
    },
    [t]
  )

  // Mapeamento agentId → ChatType (memoizado)
  const agentIdToChatType = useMemo<Record<string, ChatType>>(
    () => ({
      discovery: 'discovery',
      ux: 'ux-design',
      product: 'prd',
      tech: 'architecture',
      backlog: 'backlog',
    }),
    []
  )

  // Tipo de chat atual baseado no agente selecionado (sempre sincronizado)
  const currentChatType = agentIdToChatType[selectedAgentId] || 'discovery'

  // Filtrar conversas pelo agente/tipo selecionado (memoizado para performance)
  const filteredConversations = useMemo(
    () =>
      conversations.filter(conv => {
        const convType = conv.type || 'discovery'
        return convType === currentChatType
      }),
    [conversations, currentChatType]
  )

  // Team from project (use localTeamMembers for editing)
  const projectOwner = localTeamMembers.find(m => m.role === 'Owner')

  // Filtered directory for adding members (exclude already added)
  const filteredDirectory = filteredBySearch.filter(
    m => !localTeamMembers.some(tm => tm.email === m.email)
  )

  // ============================================================================
  // Handlers
  // ============================================================================

  // Team management handlers
  const addTeamMember = (member: {
    id: string
    name: string
    email: string
    role?: 'Admin' | 'Owner' | 'Curador' | 'User'
  }) => {
    const newMember = {
      id: member.id,
      name: member.name,
      email: member.email,
      role:
        member.role === 'Owner'
          ? ('Admin' as const)
          : ((member.role || 'Admin') as 'Admin' | 'User'),
    }
    const updatedTeam = [...localTeamMembers, newMember]
    setLocalTeamMembers(updatedTeam)
    setTeamSearch('')
    setShowAddMember(false)
    toast.success(
      t('sda2.workspace.toasts.memberAdded' as any, { name: member.name })
    )

    // Persistir no Cockpit em background
    const projectSlug = slugify(activeProject.name)
    updateTeam(projectSlug, updatedTeam).catch(err =>
      console.error('❌ [WorkspacePage] Erro ao persistir equipe:', err)
    )
  }

  const removeTeamMember = (memberId: string) => {
    const updatedTeam = localTeamMembers.filter(m => m.id !== memberId)
    setLocalTeamMembers(updatedTeam)
    toast.success(t('sda2.workspace.toasts.memberRemoved' as any) as string)

    // Persistir no Cockpit em background
    const projectSlug = slugify(activeProject.name)
    updateTeam(projectSlug, updatedTeam).catch(err =>
      console.error('❌ [WorkspacePage] Erro ao persistir equipe:', err)
    )
  }

  // ============================================================================
  // Artifact Management Handlers
  // ============================================================================

  /** Handles edit click - shows warning if artifact is finalized or shared */
  const handleEditClick = (
    artifactId: string,
    mode: 'direct' | 'ai' = 'direct'
  ) => {
    const artifact = artifacts.find(a => a.id === artifactId)
    if (!artifact) return

    if (artifact.finalized || artifact.sharedWith.length > 0) {
      setPendingEditArtifact(artifactId)
      setPendingEditMode(mode)
      setShowEditWarning(true)
    } else {
      startEditMode(artifact, mode)
    }
  }

  /** Pending edit mode for after warning confirmation */
  const [pendingEditMode, setPendingEditMode] = useState<'direct' | 'ai'>(
    'direct'
  )

  /** Starts the edit mode for an artifact */
  const startEditMode = (
    artifact: (typeof artifacts)[0],
    mode: 'direct' | 'ai'
  ) => {
    if (mode === 'direct') {
      setEditContent(artifact.content || '')
      setEditMode('direct')
    } else {
      // Start AI edit session
      startEditSession({
        id: artifact.id,
        title: artifact.name,
        type: artifact.documentType || 'document',
        content: artifact.content || '',
      })
      setEditMode('ai')
    }
  }

  /** Confirms edit after warning */
  const confirmEdit = () => {
    const artifact = artifacts.find(a => a.id === pendingEditArtifact)
    if (artifact) {
      startEditMode(artifact, pendingEditMode)
    }
    setShowEditWarning(false)
    setPendingEditArtifact(null)
  }

  /** Cancel edit mode */
  const cancelEdit = () => {
    if (editMode === 'ai') {
      endEditSession()
    }
    setEditMode('view')
    setEditContent('')
  }

  /** Handler for AI edit messages */
  const handleAIEditMessage = useCallback(
    async (message: string): Promise<string | null> => {
      if (!selectedArtifact) return null

      try {
        const editPrompt = buildEditPrompt(
          message,
          selectedArtifact.name,
          selectedArtifact.documentType || 'document',
          selectedArtifact.content || ''
        )

        const result = await sendToSupervisor(editPrompt, null)
        const editedContent = extractEditedContent(result.response)
        addProposal(message, editedContent)
        return editedContent
      } catch (error) {
        console.error(
          '❌ [WorkspacePage] Erro ao processar edição com IA:',
          error
        )
        throw error
      }
    },
    [selectedArtifact, sendToSupervisor, addProposal]
  )

  /** Handler for accepting AI edit */
  const handleAcceptAIEdit = useCallback(
    async (content: string): Promise<void> => {
      if (!selectedArtifact) return

      const toastId = toast.loading(
        t('sda2.workspace.toasts.savingAIEdit' as any) as string,
        {
          description: t(
            'sda2.workspace.toasts.creatingNewVersion' as any
          ) as string,
        }
      )

      // Persist to Cockpit if ready
      if (
        isCockpitReady &&
        chatService &&
        selectedArtifact.projectSlug &&
        selectedArtifact.chatSlug &&
        selectedArtifact.documentType
      ) {
        try {
          const chatResult = await chatService.getBySlug(
            selectedArtifact.projectSlug,
            selectedArtifact.chatSlug
          )
          if (chatResult.success && chatResult.data) {
            const chat = chatResult.data
            await chatService.saveDocument({
              projectId: chat.projectId,
              projectSlug: selectedArtifact.projectSlug,
              chatId: chat.id,
              chatSlug: selectedArtifact.chatSlug,
              documentType:
                selectedArtifact.documentType as import('@/features/artifacts/types/sda-artifacts.types').SDADocumentType,
              documentName: selectedArtifact.name,
              content,
              version: String(selectedArtifact.version + 1) + '.0.0',
              tags: ['sda2', selectedArtifact.documentType, 'ai-edit'],
            })

            // Recarregar o conteúdo do Cockpit E a versão atualizada
            const reloadResult = await loadArtifactContent(
              selectedArtifact.projectSlug,
              selectedArtifact.chatSlug,
              selectedArtifact.documentType
            )

            console.log('🔍 [AI Edit] Reload result após salvar:', {
              success: reloadResult.success,
              version: reloadResult.version,
              updatedAt: reloadResult.updatedAt,
              createdAt: reloadResult.createdAt,
              createdByName: reloadResult.createdByName,
            })

            // Atualizar artefato com novo conteúdo E nova versão DO COCKPIT
            if (reloadResult.success && reloadResult.content) {
              setArtifacts(prev => {
                const matchingArtifacts = prev.filter(
                  a => a.id === selectedArtifact.id
                )
                console.log('🔍 [AI Edit] Artifacts com mesmo ID:', {
                  selectedId: selectedArtifact.id,
                  count: matchingArtifacts.length,
                  total: prev.length,
                })

                // Remover duplicatas mantendo apenas a primeira ocorrência
                const uniqueArtifacts = prev.reduce<typeof prev>(
                  (acc, current) => {
                    if (!acc.find(item => item.id === current.id)) {
                      acc.push(current)
                    }
                    return acc
                  },
                  []
                )

                if (uniqueArtifacts.length !== prev.length) {
                  console.warn('⚠️ [AI Edit] Duplicatas removidas:', {
                    before: prev.length,
                    after: uniqueArtifacts.length,
                  })
                }

                return uniqueArtifacts.map(a => {
                  if (a.id === selectedArtifact.id) {
                    const updated = {
                      ...a,
                      content: reloadResult.content,
                      version: reloadResult.version
                        ? parseInt(reloadResult.version)
                        : a.version,
                      updatedAt: reloadResult.updatedAt || a.updatedAt,
                    }
                    console.log('🔄 [AI Edit] Atualizando artifact no state:', {
                      id: updated.id,
                      version: updated.version,
                      updatedAt: updated.updatedAt,
                      prevVersion: a.version,
                      prevUpdatedAt: a.updatedAt,
                    })
                    return updated
                  }
                  return a
                })
              })

              // Sair do modo de visualização de versão histórica
              if (viewingVersionNumber !== undefined) {
                setViewingVersionNumber(undefined)
                setViewingVersionMetadata(null)
              }

              // useEffect irá recarregar metadados automaticamente quando selectedArtifact.version mudar

              // Atualizar project store com dados do Cockpit
              if (currentProject) {
                const updatedArtifacts = (currentProject.artifacts || []).map(
                  a =>
                    a.id === selectedArtifact.id
                      ? {
                          ...a,
                          content: reloadResult.content || a.content,
                          version: reloadResult.version
                            ? parseInt(reloadResult.version)
                            : a.version,
                          updatedAt: reloadResult.updatedAt || a.updatedAt,
                        }
                      : a
                )
                updateProject(currentProject.id, {
                  artifacts: updatedArtifacts,
                })
              }

              toast.success(
                t('sda2.workspace.toasts.newVersionCreated' as any) as string,
                {
                  id: toastId,
                  description: t(
                    'sda2.workspace.toasts.newVersionDesc' as any,
                    { version: reloadResult.version }
                  ) as string,
                }
              )
            } else {
              toast.success(
                t('sda2.workspace.toasts.aiEditApplied' as any) as string,
                {
                  id: toastId,
                  description: t(
                    'sda2.workspace.toasts.aiEditDesc' as any
                  ) as string,
                }
              )
            }
          }
        } catch (error) {
          console.error('❌ [WorkspacePage] Erro ao persistir edição:', error)
          toast.error(t('sda2.workspace.errors.saveEdit' as any) as string, {
            id: toastId,
            description: t(
              'sda2.workspace.errors.saveEditDescription' as any
            ) as string,
          })
        }
      } else {
        // Se Cockpit não estiver pronto, apenas atualizar localmente
        const now = new Date().toISOString()
        setArtifacts(prev =>
          prev.map(a =>
            a.id === selectedArtifact.id
              ? {
                  ...a,
                  content,
                  version: a.version + 1,
                  editedBy: user.id,
                  editedByName: user.name,
                  editedAt: now,
                }
              : a
          )
        )

        toast.success(
          t('sda2.workspace.toasts.aiEditAppliedLocally' as any) as string,
          {
            id: toastId,
            description: t(
              'sda2.workspace.toasts.aiEditLocallyDesc' as any
            ) as string,
          }
        )
      }
    },
    [
      selectedArtifact,
      isCockpitReady,
      chatService,
      currentProject,
      updateProject,
      loadArtifactContent,
      viewingVersionNumber,
      user,
    ]
  )

  /** Finalizes an artifact (marks as final version) */
  const handleFinalizeArtifact = async (artifactId: string) => {
    const artifact = artifacts.find(a => a.id === artifactId)
    if (!artifact) {
      console.error('[WorkspacePage] Artefato não encontrado:', artifactId)
      return
    }

    // Validar dados necessários para persistência
    if (!artifact.projectSlug || !artifact.chatSlug || !artifact.documentType) {
      toast.error(
        t('sda2.workspace.errors.incompleteArtifact' as any) as string
      )
      console.error(
        '[WorkspacePage] projectSlug/chatSlug/documentType ausente:',
        artifact
      )
      return
    }

    try {
      console.log('[WorkspacePage] 🔒 Finalizando artefato:', {
        artifactId,
        name: artifact.name,
        projectSlug: artifact.projectSlug,
        chatSlug: artifact.chatSlug,
        documentType: artifact.documentType,
      })

      // 1. OPTIMISTIC UPDATE - Atualizar UI imediatamente (UX responsiva)
      setArtifacts(prev =>
        prev.map(a =>
          a.id === artifactId
            ? { ...a, finalized: true, status: 'completed' as StageStatus }
            : a
        )
      )

      // 1.5. ATUALIZAR PROJETO NO STORE - Garantir que activeProject.artifacts tenha finalized
      const updatedProjectArtifacts = activeProject.artifacts.map(
        (a: Artifact) => (a.id === artifactId ? { ...a, finalized: true } : a)
      )
      updateProject(activeProject.id, {
        artifacts: updatedProjectArtifacts,
        updatedAt: new Date().toISOString(),
      })

      // 2. PERSISTIR NO COCKPIT (NÃO cria nova versão)
      const result = await updateArtifactFinalized(
        artifact.projectSlug,
        artifact.chatSlug,
        artifact.documentType,
        true
      )

      // 3. Tratar resultado
      if (result.success) {
        toast.success(
          t('sda2.workspace.toasts.artifactFinalized' as any) as string,
          {
            description: t(
              'sda2.workspace.toasts.artifactFinalizedDesc' as any
            ) as string,
          }
        )
      } else {
        // ROLLBACK - Reverter UI em caso de erro
        console.error(
          '[WorkspacePage] Falha ao persistir finalização:',
          result.error
        )

        setArtifacts(prev =>
          prev.map(a =>
            a.id === artifactId
              ? { ...a, finalized: false, status: 'in_progress' as StageStatus }
              : a
          )
        )

        // Rollback no store também
        const rollbackArtifacts = activeProject.artifacts.map((a: Artifact) =>
          a.id === artifactId ? { ...a, finalized: false } : a
        )
        updateProject(activeProject.id, {
          artifacts: rollbackArtifacts,
          updatedAt: new Date().toISOString(),
        })

        toast.error(
          `${t('sda2.workspace.toasts.artifactFinalizeError' as any)}: ${result.error}`,
          {
            description: t(
              'sda2.workspace.toasts.changeNotSaved' as any
            ) as string,
          }
        )
      }
    } catch (error) {
      // ROLLBACK - Reverter UI em caso de exceção
      console.error('[WorkspacePage] Exceção ao finalizar artefato:', error)

      setArtifacts(prev =>
        prev.map(a =>
          a.id === artifactId
            ? { ...a, finalized: false, status: 'in_progress' as StageStatus }
            : a
        )
      )

      // Rollback no store também
      const rollbackArtifacts = activeProject.artifacts.map((a: Artifact) =>
        a.id === artifactId ? { ...a, finalized: false } : a
      )
      updateProject(activeProject.id, {
        artifacts: rollbackArtifacts,
        updatedAt: new Date().toISOString(),
      })

      toast.error(
        t('sda2.workspace.toasts.unexpectedFinalizeError' as any) as string,
        {
          description:
            error instanceof Error
              ? error.message
              : (t('sda2.workspace.toasts.errorUnknown' as any) as string),
        }
      )
    }
  }

  /** Removes finalized status from artifact */
  const handleUnfinalizeArtifact = async (artifactId: string) => {
    const artifact = artifacts.find(a => a.id === artifactId)
    if (!artifact) {
      console.error('[WorkspacePage] Artefato não encontrado:', artifactId)
      return
    }

    if (!artifact.projectSlug || !artifact.chatSlug || !artifact.documentType) {
      toast.error(
        t('sda2.workspace.errors.incompleteArtifact' as any) as string
      )
      console.error(
        '[WorkspacePage] projectSlug/chatSlug/documentType ausente:',
        artifact
      )
      return
    }

    try {
      console.log('[WorkspacePage] 🔓 Desfinalizando artefato:', {
        artifactId,
        name: artifact.name,
        projectSlug: artifact.projectSlug,
        chatSlug: artifact.chatSlug,
        documentType: artifact.documentType,
      })

      // 1. OPTIMISTIC UPDATE
      setArtifacts(prev =>
        prev.map(a =>
          a.id === artifactId
            ? { ...a, finalized: false, status: 'in_progress' as StageStatus }
            : a
        )
      )

      // 1.5. ATUALIZAR PROJETO NO STORE - Garantir que activeProject.artifacts tenha finalized
      const updatedProjectArtifacts = activeProject.artifacts.map(
        (a: Artifact) => (a.id === artifactId ? { ...a, finalized: false } : a)
      )
      updateProject(activeProject.id, {
        artifacts: updatedProjectArtifacts,
        updatedAt: new Date().toISOString(),
      })

      // 2. PERSISTIR NO COCKPIT
      const result = await updateArtifactFinalized(
        artifact.projectSlug,
        artifact.chatSlug,
        artifact.documentType,
        false
      )

      if (result.success) {
        toast.success(
          t('sda2.workspace.toasts.unfinalizedStatusChanged' as any) as string,
          {
            description: t(
              'sda2.workspace.toasts.artifactUnfinalizedDesc' as any
            ) as string,
          }
        )
      } else {
        // ROLLBACK
        console.error(
          '[WorkspacePage] Falha ao persistir desfinalização:',
          result.error
        )

        setArtifacts(prev =>
          prev.map(a =>
            a.id === artifactId
              ? { ...a, finalized: true, status: 'completed' as StageStatus }
              : a
          )
        )

        // Rollback no store também
        const rollbackArtifacts = activeProject.artifacts.map((a: Artifact) =>
          a.id === artifactId ? { ...a, finalized: true } : a
        )
        updateProject(activeProject.id, {
          artifacts: rollbackArtifacts,
          updatedAt: new Date().toISOString(),
        })

        toast.error(
          `${t('sda2.workspace.toasts.artifactUnfinalizeError' as any)}: ${result.error}`
        )
      }
    } catch (error) {
      // ROLLBACK
      console.error('[WorkspacePage] Exceção ao desfinalizar artefato:', error)

      setArtifacts(prev =>
        prev.map(a =>
          a.id === artifactId
            ? { ...a, finalized: true, status: 'completed' as StageStatus }
            : a
        )
      )

      // Rollback no store também
      const rollbackArtifacts = activeProject.artifacts.map((a: Artifact) =>
        a.id === artifactId ? { ...a, finalized: true } : a
      )
      updateProject(activeProject.id, {
        artifacts: rollbackArtifacts,
        updatedAt: new Date().toISOString(),
      })

      toast.error(
        t('sda2.workspace.toasts.unexpectedUnfinalizeError' as any) as string
      )
    }
  }

  /** Deletes an artifact (soft-delete: marca como inactive no Cockpit) */
  const handleDeleteArtifact = async (artifactId: string) => {
    const artifact = artifacts.find(a => a.id === artifactId)
    // Fechar modal e mostrar loading overlay imediatamente
    setShowDeleteConfirm(false)
    setArtifactToDelete(null)
    setIsDeletingArtifact(true)

    try {
      // Persistir soft-delete no Cockpit
      if (
        artifact?.projectSlug &&
        artifact?.documentType &&
        artifact?.chatSlug
      ) {
        const artifactKey = `document-${artifact.documentType}-${artifact.projectSlug}-${artifact.chatSlug}`
        console.log('🗑️ [WorkspacePage] Excluindo artefato:', {
          artifactId,
          artifactKey,
          projectSlug: artifact.projectSlug,
        })
        const result = await deleteArtifact(artifact.projectSlug, artifactKey)
        if (!result.success) {
          toast.error(
            result.error ||
              (t('sda2.workspace.toasts.artifactDeleteError' as any) as string)
          )
          setIsDeletingArtifact(false)
          return
        }
        console.log(
          '✅ [WorkspacePage] Artefato excluído do Cockpit:',
          artifactKey
        )
      } else {
        console.warn(
          '⚠️ [WorkspacePage] Artefato sem dados para persistir exclusão:',
          {
            artifactId,
            projectSlug: artifact?.projectSlug,
            documentType: artifact?.documentType,
            chatSlug: artifact?.chatSlug,
          }
        )
      }

      // Calcular próximo artefato ANTES de remover
      const remaining = artifacts.filter(a => a.id !== artifactId)
      let nextId: string | null = null
      if (selectedArtifactId === artifactId) {
        const deletedAgent = artifact?.agentId
        const nextInAgent = remaining.find(a => a.agentId === deletedAgent)
        nextId = nextInAgent?.id || remaining[0]?.id || null
      } else {
        nextId = selectedArtifactId
      }

      // Atualizar projeto no store para que o useEffect de sync não re-adicione
      if (activeProject) {
        const updatedArtifacts = (activeProject.artifacts || []).filter(
          a => a.id !== artifactId
        )
        updateProject(activeProject.id, { artifacts: updatedArtifacts })
      }

      // Atualizar estado local
      setArtifacts(remaining)
      setSelectedArtifactId(nextId)
      toast.success(t('sda2.workspace.toasts.artifactDeleted' as any) as string)
    } catch (error) {
      console.error('❌ [WorkspacePage] Erro ao excluir artefato:', error)
      toast.error(
        t('sda2.workspace.toasts.artifactDeleteError' as any) as string
      )
    } finally {
      setIsDeletingArtifact(false)
    }
  }

  /** Renames an artifact */
  const handleRenameArtifact = async (artifactId: string, newName: string) => {
    if (!newName.trim()) {
      setRenamingArtifactId(null)
      return
    }
    const trimmedName = newName.trim()
    // Atualizar estado local imediatamente (UX responsivo)
    setArtifacts(prev =>
      prev.map(a =>
        a.id === artifactId
          ? { ...a, name: trimmedName, customName: trimmedName }
          : a
      )
    )
    setRenamingArtifactId(null)

    // Persistir no Cockpit com loading overlay
    const artifact = artifacts.find(a => a.id === artifactId)
    if (artifact?.projectSlug && artifact?.chatSlug && artifact?.documentType) {
      setIsRenamingArtifactLoading(true)
      try {
        await renameArtifact(
          artifact.projectSlug,
          artifact.chatSlug,
          artifact.documentType,
          trimmedName
        )
        toast.success(
          t('sda2.workspace.toasts.artifactRenamed' as any) as string
        )
      } catch (err) {
        console.error(
          '❌ [WorkspacePage] Erro ao persistir rename de artefato:',
          err
        )
        toast.error(
          t('sda2.workspace.toasts.artifactRenameError' as any) as string
        )
      } finally {
        setIsRenamingArtifactLoading(false)
      }
    } else {
      toast.success(t('sda2.workspace.toasts.artifactRenamed' as any) as string)
    }
  }

  /** Handles download in specific format */
  const handleDownload = async (format: ExportFormat) => {
    const artifact = selectedArtifact
    if (!artifact || !artifact.content) {
      toast.error(t('sda2.workspace.toasts.artifactNoContent' as any) as string)
      return
    }

    try {
      await exportArtifact(
        {
          name: artifact.name,
          content: artifact.content,
          version: artifact.version,
        },
        format
      )
      toast.success(
        t('sda2.workspace.toasts.downloadComplete' as any, {
          name: artifact.name,
        }) as string
      )
    } catch (error) {
      console.error('Erro ao exportar artefato:', error)
      toast.error(t('sda2.workspace.toasts.exportError' as any) as string)
    } finally {
      setShowDownloadMenu(false)
    }
  }

  /** Handles version selection - loads specific version from Cockpit */
  const handleVersionSelect = async (versionNumber: number) => {
    const artifact = selectedArtifact

    if (!artifact) {
      toast.error(
        t('sda2.workspace.toasts.noArtifactSelected' as any) as string
      )
      return
    }

    if (!cockpitConfig) {
      toast.error(
        t('sda2.workspace.toasts.cockpitConfigUnavailable' as any) as string
      )
      return
    }

    if (!artifact.projectSlug || !artifact.chatSlug || !artifact.documentType) {
      toast.error(
        t('sda2.workspace.toasts.artifactInfoIncomplete' as any) as string
      )
      return
    }

    setIsLoadingVersion(true)
    try {
      const artifactService = new ArtifactService(cockpitConfig)

      // Construir chave do artefato no Cockpit
      const artifactKey = `document-${artifact.documentType}-${artifact.projectSlug}-${artifact.chatSlug}`

      // Buscar artefato pela chave para obter o ID real do Cockpit
      const cockpitArtifact = await artifactService.getByKey(artifactKey)

      // Buscar todas as versões usando o ID do Cockpit
      const versions = await artifactService.getVersionsByArtifactId(
        cockpitArtifact.id
      )

      // Ordenar versões por número (versão mais antiga primeiro)
      const sortedVersions = [...versions].sort((a, b) => {
        const versionA = parseInt((a.version || '1.0.0').split('.')[0] || '0')
        const versionB = parseInt((b.version || '1.0.0').split('.')[0] || '0')
        return versionA - versionB
      })

      // Encontrar a versão solicitada
      const version = sortedVersions.find(v => {
        const majorVersion = parseInt(
          (v.version || '1.0.0').split('.')[0] || '0'
        )
        return majorVersion === versionNumber
      })

      if (!version) {
        toast.error(t('sda2.workspace.toasts.versionNotFound' as any) as string)
        return
      }

      if (version.value) {
        // Parse do JSON para extrair o DocumentDto.content e metadados
        let content: string
        let metadata: {
          createdAt: string
          createdBy: string | null
          createdByName: string | null
          updatedAt: string | null
        }

        try {
          const documentDto = JSON.parse(version.value)
          content = documentDto.content || version.value

          // Extrair metadados do DocumentDto (fonte mais confiável)
          metadata = {
            createdAt: documentDto.createdAt || version.createdAt || '',
            createdBy: documentDto.createdBy || version.createdBy,
            createdByName: documentDto.createdByName || version.createdByName,
            // updatedAt é quando a versão foi criada; fallback para createdAt se não houver
            updatedAt:
              documentDto.updatedAt ||
              documentDto.createdAt ||
              version.createdAt ||
              null,
          }
        } catch {
          // Se não for JSON, usar diretamente e pegar metadados do version
          content = version.value
          metadata = {
            createdAt: version.createdAt || '',
            createdBy: version.createdBy,
            createdByName: version.createdByName,
            // Fallback para createdAt se updatedAt não estiver disponível
            updatedAt: version.createdAt || null,
          }
        }

        // Atualizar artifact local com conteúdo da versão
        setArtifacts(prev =>
          prev.map(a =>
            a.id === artifact.id
              ? {
                  ...a,
                  content,
                }
              : a
          )
        )

        // Armazenar metadados da versão sendo visualizada
        setViewingVersionMetadata(metadata)

        setViewingVersionNumber(versionNumber)
        toast.success(
          t('sda2.workspace.toasts.viewingVersion' as any, {
            version: versionNumber,
          }) as string,
          {
            description: metadata.updatedAt
              ? (t('sda2.workspace.toasts.viewingVersionDesc' as any, {
                  date: new Date(metadata.updatedAt).toLocaleDateString(
                    dateLocale
                  ),
                }) as string)
              : undefined,
          }
        )
      }
    } catch (error) {
      console.error('❌ [WorkspacePage] Erro ao carregar versão:', error)
      toast.error(t('sda2.workspace.toasts.loadVersionError' as any) as string)
    } finally {
      setIsLoadingVersion(false)
    }
  }

  /** Carrega metadados de todas as versões do artefato */
  const loadAllVersionsMetadata = async () => {
    const artifact = selectedArtifact

    if (!artifact || !cockpitConfig) return
    if (!artifact.projectSlug || !artifact.chatSlug || !artifact.documentType)
      return

    // Evitar chamadas duplicadas
    if (isReloadingMetadataRef.current) return
    isReloadingMetadataRef.current = true

    try {
      const artifactService = new ArtifactService(cockpitConfig)

      // Construir chave do artefato no Cockpit
      const artifactKey = `document-${artifact.documentType}-${artifact.projectSlug}-${artifact.chatSlug}`

      // Buscar artefato pela chave para obter o ID real do Cockpit
      const cockpitArtifact = await artifactService.getByKey(artifactKey)

      // Buscar todas as versões usando o ID do Cockpit
      const versions = await artifactService.getVersionsByArtifactId(
        cockpitArtifact.id
      )

      // Ordenar versões por número e mapear metadados
      const sortedVersions = [...versions].sort((a, b) => {
        const versionA = parseInt((a.version || '0').split('.')[0] || '0')
        const versionB = parseInt((b.version || '0').split('.')[0] || '0')
        return versionA - versionB
      })

      console.log(
        '📚 [loadAllVersionsMetadata] Total de versões encontradas:',
        sortedVersions.length
      )

      const metadata = sortedVersions.map(v => {
        // Tentar extrair metadados do DocumentDto (dentro do JSON do value)
        let docMetadata: {
          createdAt: string
          createdBy: string | null
          createdByName: string | null
          updatedAt: string | null
        } = {
          createdAt: v.createdAt || '',
          createdBy: v.createdBy,
          createdByName: v.createdByName,
          // Fallback inicial para createdAt
          updatedAt: v.createdAt || null,
        }

        if (v.value) {
          try {
            const documentDto = JSON.parse(v.value)
            docMetadata = {
              createdAt: documentDto.createdAt || v.createdAt || '',
              createdBy: documentDto.createdBy || v.createdBy,
              createdByName: documentDto.createdByName || v.createdByName,
              // updatedAt é quando a versão foi criada; fallback para createdAt se não houver
              updatedAt:
                documentDto.updatedAt ||
                documentDto.createdAt ||
                v.createdAt ||
                null,
            }
            console.log(`📄 [loadAllVersionsMetadata] Versão ${v.version}:`, {
              version: v.version,
              documentDto_updatedAt: documentDto.updatedAt,
              documentDto_createdAt: documentDto.createdAt,
              version_createdAt: v.createdAt,
              final_updatedAt: docMetadata.updatedAt,
            })
          } catch {
            // Se não for JSON, usar metadados do version
          }
        }

        return {
          versionNumber: parseInt((v.version || '0').split('.')[0] || '0'),
          ...docMetadata,
        }
      })

      console.log(
        '📊 [loadAllVersionsMetadata] Metadados extraídos:',
        metadata.map(m => ({
          version: m.versionNumber,
          updatedAt: m.updatedAt,
          createdByName: m.createdByName,
        }))
      )

      setAllVersionsMetadata(metadata)
    } catch (error) {
      console.error(
        '❌ [WorkspacePage] Erro ao carregar metadados das versões:',
        error
      )
    } finally {
      isReloadingMetadataRef.current = false
    }
  }

  const getAgentStatus = (agentId: string): StageStatus => {
    const agentArts = artifacts.filter(a => a.agentId === agentId)
    if (agentArts.length === 0) return 'not_started'
    if (agentArts.every(a => a.status === 'completed')) return 'completed'
    if (
      agentArts.some(a => a.status === 'in_progress' || a.status === 'review')
    )
      return 'in_progress'
    return 'not_started'
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // ========================================================================
  // Função reutilizável para carregar chats de um tipo específico da API
  // Carrega progressivamente: cada chat aparece conforme é carregado,
  // do mais antigo ao mais recente.
  // ========================================================================
  const loadChatsForType = useCallback(
    async (chatType: ChatType) => {
      if (!isCockpitReady || !activeProject) return

      const projectSlug =
        activeProject.slug || slugify(activeProject.name || '')
      if (!projectSlug) return

      setIsLoadingChats(true)
      // Limpar conversas e seleção anterior
      setConversations([])
      setActiveConversationId('')

      // Acumulador local para manter a ordem correta (mais antigo primeiro)
      const loadedChats: Array<{
        id: string
        title: string
        slug: string
        type: string
        messages: ChatMessage[]
        createdAt: string
      }> = []
      let isFirstChat = true

      try {
        await loadProjectChats(projectSlug, chatType, chat => {
          // Callback chamado para cada chat individual (já filtrado: sem INACTIVE)
          const mapped = {
            id: chat.id,
            title: chat.name,
            slug: chat.slug,
            type: chat.type || 'discovery',
            messages: [] as ChatMessage[],
            createdAt: chat.createdAt,
          }

          // Inserir ordenado por data (mais antigo primeiro para carregamento progressivo)
          const insertIndex = loadedChats.findIndex(
            c =>
              new Date(c.createdAt).getTime() >
              new Date(mapped.createdAt).getTime()
          )
          if (insertIndex === -1) {
            loadedChats.push(mapped)
          } else {
            loadedChats.splice(insertIndex, 0, mapped)
          }

          // Atualizar estado com lista ordenada (mais recente primeiro para exibição)
          // Usa merge funcional para preservar mensagens já carregadas pelo useEffect de histórico
          const sortedForDisplay = [...loadedChats].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          setConversations(prev => {
            // Merge: manter mensagens de conversas que já foram carregadas
            const existingMap = new Map(prev.map(c => [c.id, c]))
            return sortedForDisplay.map(chat => {
              const existing = existingMap.get(chat.id)
              if (existing && existing.messages.length > 0) {
                return { ...chat, messages: existing.messages }
              }
              return chat
            })
          })

          // Selecionar o primeiro chat (mais recente) como ativo — apenas na primeira vez
          if (isFirstChat) {
            isFirstChat = false
            setIsLoadingChats(false) // Remove overlay após primeiro chat
            setActiveConversationId(sortedForDisplay[0]!.id)
          }

          console.log(
            `📥 [WorkspacePage] Chat carregado progressivamente: "${chat.name}" (${loadedChats.length} total)`
          )
        })

        // Após todos carregados, garantir estado final
        if (loadedChats.length === 0) {
          console.log(
            `📥 [WorkspacePage] Nenhum chat encontrado para tipo "${chatType}"`
          )
          setConversations([])
          setActiveConversationId('')
        } else {
          console.log(
            `📥 [WorkspacePage] ${loadedChats.length} chats carregados progressivamente para tipo "${chatType}"`
          )
        }
      } catch (err) {
        console.error('❌ [WorkspacePage] Erro ao carregar chats:', err)
      } finally {
        setIsLoadingChats(false)
      }
    },
    [isCockpitReady, activeProject, loadProjectChats]
  )

  // ========================================================================
  // Cockpit Persistence: Carregar projeto e chats na inicialização
  // ========================================================================
  useEffect(() => {
    if (isCockpitReady && !hasLoadedProjectsRef.current) {
      hasLoadedProjectsRef.current = true
      // Recarregar detalhes do projeto ativo (artifacts) para garantir dados atualizados
      const projectSlug =
        activeProject?.slug || slugify(activeProject?.name || '')
      if (projectSlug) {
        loadProjectDetails(projectSlug).then(result => {
          if (result.success && result.project) {
            const { updateProject, setCurrentProject } =
              useProjectStore.getState()
            updateProject(result.project.id, result.project)
            setCurrentProject(result.project)
            console.log(
              '[WorkspacePage] 📥 Detalhes do projeto recarregados:',
              result.project.name,
              `(${result.project.artifacts.length} artifacts)`
            )
          }
        })
      }

      // Carregar chats do tipo inicial (discovery) de forma lazy
      const initialType = (agentIdToChatType[selectedAgentId] ||
        'discovery') as ChatType
      loadChatsForType(initialType)
    }
  }, [isCockpitReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar histórico do chat ativo quando muda de conversa (sempre recarrega, sem cache)
  useEffect(() => {
    if (!isCockpitReady || !activeProject || !activeConversationId) return

    const conv = conversations.find(c => c.id === activeConversationId)
    if (!conv || !conv.slug) return

    // Se já tem mensagens (e.g. foi criado localmente nesta sessão), pular
    if (conv.messages.length > 0) return

    // Se a conversa foi criada localmente nesta sessão (id começa com "conv-"),
    // e ainda não tem mensagens, não tentar carregar do Cockpit — o history ainda não existe
    if (conv.id.startsWith('conv-')) return

    setIsLoadingHistory(true)
    const projectSlug = slugify(activeProject.name)
    const chatSlug = conv.slug || slugify(conv.title)

    loadChatHistory(projectSlug, chatSlug)
      .then(result => {
        if (result.success && result.messages && result.messages.length > 0) {
          console.log(
            '📥 [WorkspacePage] Histórico carregado:',
            result.messages.length,
            'mensagens'
          )
          const loadedMessages: ChatMessage[] = result.messages.map(
            (msg: any) => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: msg.timestamp,
              agentId: msg.agentName,
              attachments: msg.attachments || undefined,
            })
          )
          setConversations(prev =>
            prev.map(c =>
              c.id === activeConversationId
                ? { ...c, messages: loadedMessages }
                : c
            )
          )

          // Restaurar status de aceite/rejeição dos artefatos a partir do histórico
          const restoredAccepted: string[] = []
          const restoredRejected: string[] = []

          interface MessageWithArtifact {
            id: string
            isArtifact?: boolean
            artifactType?: string
            isAccepted?: boolean
            isRejected?: boolean
          }
          const messagesWithArtifact =
            result.messages as unknown as MessageWithArtifact[]

          for (const msg of messagesWithArtifact) {
            if (msg.isArtifact && msg.artifactType) {
              const artifactKey = `artifact-${msg.id}-${msg.artifactType}`
              if (msg.isAccepted) {
                restoredAccepted.push(artifactKey)
              }
              if (msg.isRejected) {
                restoredRejected.push(artifactKey)
              }
            }
          }

          if (restoredAccepted.length > 0) {
            setAcceptedArtifactKeys(prev => [
              ...new Set([...prev, ...restoredAccepted]),
            ])
          }
          if (restoredRejected.length > 0) {
            setRejectedArtifactKeys(prev => [
              ...new Set([...prev, ...restoredRejected]),
            ])
          }
        }
      })
      .catch(err => {
        console.error('❌ [WorkspacePage] Erro ao carregar histórico:', err)
      })
      .finally(() => {
        setIsLoadingHistory(false)
      })
  }, [isCockpitReady, activeProject, activeConversationId, loadChatHistory]) // eslint-disable-line react-hooks/exhaustive-deps

  const addMessageToConversation = useCallback(
    (msg: ChatMessage, targetConvId?: string) => {
      const convId = targetConvId || activeConversationIdRef.current
      setConversations(prev =>
        prev.map(c =>
          c.id === convId ? { ...c, messages: [...c.messages, msg] } : c
        )
      )
    },
    [] // Uses ref — no stale closure issues
  )

  /**
   * Persiste projeto e chat no Cockpit (garante que existem antes de salvar mensagens)
   * Usa cache para evitar chamadas repetidas ao mesmo chat
   */
  const ensureProjectAndChat = useCallback(
    async (
      chatTitle: string,
      chatType?: ChatType,
      existingSlug?: string
    ): Promise<{ projectSlug: string; chatSlug: string } | null> => {
      if (!isCockpitReady || !activeProject) return null
      const projectSlug = slugify(activeProject.name)
      // Use the existing slug if provided (e.g. after rename), otherwise derive from title
      const chatSlug = existingSlug || slugify(chatTitle)
      const cacheKey = `${projectSlug}-${chatSlug}`

      // Retornar do cache se já foi garantido nesta sessão
      const cached = ensuredChatsRef.current.get(cacheKey)
      if (cached) return cached

      try {
        const projectResult = await saveProject(activeProject)
        if (projectResult.success && projectResult.projectId) {
          const chatResult = await createChat(
            projectResult.projectId,
            projectSlug,
            chatTitle,
            `Chat: ${chatTitle}`,
            chatType,
            chatSlug // Pass the pre-generated slug to avoid re-deriving from name
          )
          if (chatResult.success) {
            console.log(
              '✅ [WorkspacePage] Projeto/chat persistidos:',
              projectSlug,
              chatSlug
            )
            // Only cache when creation actually succeeded
            const result = { projectSlug, chatSlug }
            ensuredChatsRef.current.set(cacheKey, result)
            return result
          } else {
            console.error('❌ [WorkspacePage] createChat falhou:', chatResult.error)
          }
        } else {
          console.error('❌ [WorkspacePage] saveProject falhou:', projectResult)
        }
        // Don't cache failures — allow retry on next call
        return { projectSlug, chatSlug }
      } catch (err) {
        console.error('❌ [WorkspacePage] Erro ao persistir projeto/chat:', err)
        // Don't cache errors — allow retry on next call
        return { projectSlug, chatSlug }
      }
    },
    [isCockpitReady, activeProject, saveProject, createChat]
  )

  /**
   * Envia mensagem via BFF → Orquestrador (MCP) → Agentes (LangGraph)
   * Com persistência integrada no Cockpit
   */
  const handleSend = useCallback(
    async (
      message: string,
      attachments?: File[],
      selectedDocuments?: ProjectDocument[]
    ) => {
      // Verificação de mensagem vazia
      const userMessage = message.trim()
      const files = attachments || []
      const documents = selectedDocuments || []

      if (
        (!userMessage && files.length === 0 && documents.length === 0) ||
        isProcessingMessage ||
        isSupervisorLoading ||
        isLoadingChats ||
        isLoadingHistory
      )
        return

      console.log('📎 [DEBUG] Arquivos recebidos:', files.length)
      console.log(
        '📎 [DEBUG] Arquivos:',
        files.map(f => `${f.name} (${f.type})`)
      )
      console.log('📎 [DEBUG] Cache state size:', processingCache.size)
      console.log('📎 [DEBUG] Cache ref size:', processingCacheRef.current.size)
      console.log(
        '📎 [DEBUG] Cache entries (ref):',
        Array.from(processingCacheRef.current.entries()).map(([k, v]) => ({
          key: k,
          fileKey: v.fileKey,
          fileName: v.file?.name,
          status: v.status,
        }))
      )

      // ========================================================================
      // PROCESSAR ARQUIVOS
      // ========================================================================
      const filesToProcess = files

      // Usar cache ref (sobrevive Fast Refresh)
      const cacheSnapshot = new Map(processingCacheRef.current)

      console.log('📎 [DEBUG] filesToProcess final:', filesToProcess.length)
      console.log('📎 [DEBUG] cacheSnapshot final:', cacheSnapshot.size)

      const attachmentsMeta = filesToProcess.map(f => ({
        id: crypto.randomUUID(),
        name: f.name,
        size: f.size,
        type: f.type,
      }))

      // Adicionar documentos compartilhados aos attachments para exibição visual
      const documentsMeta = documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        size: 0,
        type: 'artifact/shared', // Tipo customizado para identificar artefatos compartilhados
      }))

      const allAttachments = [...attachmentsMeta, ...documentsMeta]

      // ========================================================================
      // CRIAR MENSAGEM E MOSTRAR NO CHAT IMEDIATAMENTE (UX)
      // ========================================================================
      const userMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
        attachments: allAttachments,
      }

      let chatTitle: string
      let existingChatSlug: string | undefined
      let currentConvId = activeConversationIdRef.current

      // Se não tem conversa ativa, cria uma nova
      if (conversations.length === 0 || !activeConversationId) {
        const chatTypeLabels: Record<ChatType, string> = {
          discovery: t('sda2.workspace.chatTypes.discovery' as any),
          prd: t('sda2.workspace.chatTypes.prd' as any),
          backlog: t('sda2.workspace.chatTypes.backlog' as any),
          architecture: t('sda2.workspace.chatTypes.architecture' as any),
          'ux-design': t('sda2.workspace.chatTypes.uxDesign' as any),
        }
        chatTitle = t('sda2.workspace.contextualization' as any, {
          type: chatTypeLabels[selectedChatType] || 'Discovery',
        })
        // Generate stable unique slug: readable prefix + unique 8-char suffix
        const uniqueSlug = `${slugify(chatTitle)}-${crypto.randomUUID().split('-')[0]}`
        const newConv = {
          id: `conv-${Date.now()}`,
          title: chatTitle,
          slug: uniqueSlug,
          createdAt: new Date().toISOString(),
          type: selectedChatType,
          messages: [userMsg],
        }
        existingChatSlug = uniqueSlug
        currentConvId = newConv.id
        activeConversationIdRef.current = newConv.id
        setConversations([newConv])
        setActiveConversationId(newConv.id)
      } else {
        chatTitle =
          activeConversation?.title ||
          (t('sda2.workspace.newConversation' as any) as string)
        // Preserve the original slug to avoid creating duplicate artifacts after rename
        existingChatSlug = activeConversation?.slug || undefined
        addMessageToConversation(userMsg, currentConvId)
      }

      // MOSTRAR LOADING IMEDIATAMENTE (antes de processar arquivos)
      setIsProcessingMessage(true)

      // Auto-switch para aba do chat
      if (activeTab !== 'chat') {
        setActiveTab('chat')
      }

      // ========================================================================
      // PROCESSAR ARQUIVOS EM BACKGROUND (aguardar se necessário)
      // ========================================================================
      let filesContent = ''
      if (filesToProcess.length > 0) {
        console.log(
          `📎 [SEND] Aguardando processamento de ${filesToProcess.length} arquivo(s)...`
        )

        const textPromises = filesToProcess.map(async file => {
          try {
            // Buscar no cache snapshot pelo File object ou fileKey (mais robusto)
            const fileKey = getFileKey(file)
            const cached = Array.from(cacheSnapshot.values()).find(
              c => c.file === file || c.fileKey === fileKey
            )

            if (cached) {
              if (cached.status === 'completed' && cached.content) {
                const duration = cached.completedAt! - cached.startedAt
                console.log(
                  `⚡ [SEND] Arquivo ${file.name} JÁ PRONTO (${duration}ms) - usando cache`
                )
                return cached.content
              } else if (cached.status === 'processing' && cached.promise) {
                console.log(
                  `⏳ [SEND] Arquivo ${file.name} ainda processando, aguardando promise...`
                )
                try {
                  const content = await cached.promise
                  console.log(
                    `✅ [SEND] Arquivo ${file.name} processamento completo`
                  )
                  return content
                } catch (err) {
                  console.error(`❌ [SEND] Arquivo ${file.name} falhou:`, err)
                  return `\n[Arquivo ${file.name} anexado mas não pôde ser processado]\n`
                }
              } else if (cached.status === 'error') {
                console.warn(
                  `⚠️ [SEND] Arquivo ${file.name} teve erro: ${cached.error}`
                )
                return `\n[Arquivo ${file.name} anexado mas não pôde ser processado: ${cached.error}]\n`
              }
            }

            // Fallback: arquivo não estava no cache, processar agora
            console.warn(
              `⚠️ [SEND] Arquivo ${file.name} não encontrado no cache, processando agora...`
            )

            // Imagens
            if (file.type.startsWith('image/')) {
              const formData = new FormData()
              formData.append('image', file)
              const response = await fetch('/api/ocr/vision', {
                method: 'POST',
                body: formData,
              })
              if (response.ok) {
                const result = await response.json()
                if (result.success && result.text) {
                  return `\n\n--- Análise Visual de ${file.name} ---\n${result.text}\n--- Fim da análise ---\n`
                }
              }
              return `\n[Imagem ${file.name} anexada: ${(file.size / 1024).toFixed(2)} KB]\n`
            }

            // Documentos extraíveis (PDF, DOCX, XLSX)
            const isExtractableDocument =
              file.type === 'application/pdf' ||
              file.name.toLowerCase().endsWith('.pdf') ||
              file.type ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              file.name.toLowerCase().endsWith('.docx') ||
              file.type ===
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              file.name.toLowerCase().endsWith('.xlsx')

            if (isExtractableDocument) {
              console.log(
                `📄 [SEND] Extraindo conteúdo de documento: ${file.name}`
              )
              const formData = new FormData()
              formData.append('file', file)

              try {
                const extractResponse = await fetch(
                  '/api/document/extract-text',
                  {
                    method: 'POST',
                    body: formData,
                  }
                )

                if (extractResponse.ok) {
                  const extractResult = await extractResponse.json()
                  if (extractResult.success && extractResult.extractedText) {
                    console.log(
                      `✅ [SEND] Conteúdo extraído de ${file.name}: ${extractResult.extractedText.length} chars`
                    )
                    return `\n\n--- Conteúdo de ${file.name} ---\n${extractResult.extractedText}\n--- Fim do arquivo ---\n`
                  } else {
                    console.warn(
                      `⚠️ [SEND] Falha na extração de ${file.name}:`,
                      extractResult.error
                    )
                    return `\n[Arquivo ${file.name} anexado: ${(file.size / 1024).toFixed(2)} KB - extração falhou]\n`
                  }
                } else {
                  console.error(
                    `❌ [SEND] Erro na API de extração de ${file.name}: ${extractResponse.status}`
                  )
                  return `\n[Arquivo ${file.name} anexado: ${(file.size / 1024).toFixed(2)} KB - erro na extração]\n`
                }
              } catch (extractError) {
                console.error(
                  `❌ [SEND] Exceção ao extrair ${file.name}:`,
                  extractError
                )
                return `\n[Arquivo ${file.name} anexado: ${(file.size / 1024).toFixed(2)} KB - erro na extração]\n`
              }
            }

            // TXT/MD
            if (
              file.type.startsWith('text/') ||
              file.name.endsWith('.txt') ||
              file.name.endsWith('.md')
            ) {
              const text = await file.text()
              return `\n\n--- Conteúdo de ${file.name} ---\n${text}\n--- Fim do arquivo ---\n`
            }

            // Outros: apenas metadados
            return `\n[Arquivo ${file.name} anexado: ${(file.size / 1024).toFixed(2)} KB]\n`
          } catch (error) {
            console.error(`❌ [SEND] Erro ao processar ${file.name}:`, error)
            return `\n[Arquivo ${file.name} anexado mas não pôde ser processado]\n`
          }
        })

        const contents = await Promise.all(textPromises)
        filesContent = contents.join('')
        console.log(
          '📎 [DEBUG] Conteúdo total dos arquivos:',
          filesContent.substring(0, 200),
          '...'
        )
      }

      // Limpar cache após processamento (state E ref)
      processingCacheRef.current = new Map()
      setProcessingCache(new Map())

      // ========================================================================
      // PROCESSAR DOCUMENTOS COMPARTILHADOS ANEXADOS
      // ========================================================================
      let documentsContent = ''
      if (documents.length > 0) {
        console.log(
          `📄 [SEND] Carregando ${documents.length} documento(s) compartilhado(s)...`,
          documents.map(d => ({ id: d.id, name: d.name, key: d.key }))
        )

        const documentPromises = documents.map(async doc => {
          try {
            // Buscar artifact completo pelos IDs
            const artifact = artifacts.find(
              a => a.id === doc.id || a.id === doc.key
            )

            if (!artifact) {
              console.warn(
                `⚠️ [SEND] Documento ${doc.name} não encontrado nos artifacts`
              )
              return `\n[Documento ${doc.name} não encontrado]\n`
            }

            // Se artifact já tem conteúdo, usar direto
            if (artifact.content) {
              console.log(
                `✅ [SEND] Conteúdo do documento ${doc.name} carregado do cache`
              )
              return `\n\n--- Documento Compartilhado: ${doc.name} ---\n${artifact.content}\n--- Fim do documento ---\n`
            }

            // Se não tem conteúdo, buscar do backend
            if (
              artifact.projectSlug &&
              artifact.chatSlug &&
              artifact.documentType
            ) {
              console.log(
                `📥 [SEND] Buscando conteúdo do documento ${doc.name} do backend...`
              )
              const result = await loadArtifactContent(
                artifact.projectSlug,
                artifact.chatSlug,
                artifact.documentType
              )

              if (result.success && result.content) {
                console.log(
                  `✅ [SEND] Conteúdo do documento ${doc.name} carregado do backend`
                )
                return `\n\n--- Documento Compartilhado: ${doc.name} ---\n${result.content}\n--- Fim do documento ---\n`
              }
            }

            console.warn(
              `⚠️ [SEND] Não foi possível carregar conteúdo do documento ${doc.name}`
            )
            return `\n[Documento ${doc.name} anexado mas conteúdo não disponível]\n`
          } catch (error) {
            console.error(
              `❌ [SEND] Erro ao carregar documento ${doc.name}:`,
              error
            )
            return `\n[Documento ${doc.name} anexado mas não pôde ser carregado]\n`
          }
        })

        const docContents = await Promise.all(documentPromises)
        documentsContent = docContents.join('')
        console.log(
          '📄 [SEND] Conteúdo total dos documentos:',
          documentsContent.substring(0, 200),
          '...'
        )
      }

      const fullMessage = userMessage + filesContent + documentsContent
      console.log(
        '📎 [DEBUG] Mensagem completa (primeiros 300 chars):',
        fullMessage.substring(0, 300)
      )

      // ========================================================================
      // PERSISTIR E ENVIAR AO AGENTE (após processamento dos arquivos)
      // ========================================================================

      // Persistir projeto/chat no Cockpit (use existing slug to avoid duplicate artifacts after rename)
      const slugs = await ensureProjectAndChat(chatTitle, selectedChatType, existingChatSlug)

      // Persistir mensagem do usuário (APENAS mensagem, sem análise dos arquivos)
      // Os attachments são salvos separadamente como metadata
      if (slugs && isCockpitReady) {
        saveMessage(slugs.projectSlug, slugs.chatSlug, {
          content: userMessage, // ← Apenas a mensagem do usuário
          role: 'user',
          attachments: allAttachments.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type, // Incluir tipo para diferenciar artifacts compartilhados
          })),
        }).catch(err =>
          console.error('❌ [WorkspacePage] Erro ao salvar msg usuário:', err)
        )
      }

      try {
        // Construir conversa com formato esperado pelo useSupervisorChat
        const conversationForSupervisor: Conversation = {
          id: currentConvId || `conv-${Date.now()}`,
          projectId: activeProject.id,
          title: chatTitle,
          slug: slugs?.chatSlug || '',
          agentName: 'Supervisor',
          agentType: 'supervisor',
          messages: [
            ...(activeConversation?.messages || []).map(m => ({
              id: m.id,
              conversationId: currentConvId || '',
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: m.timestamp,
            })),
          ],
          createdAt: activeConversation?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user.id,
          createdByName: user.name,
          acceptedArtifacts: [],
          rejectedArtifacts: [],
        }

        // Enviar para o BFF → MCP → LangGraph (com conteúdo dos arquivos)
        const result = await sendToSupervisor(
          fullMessage,
          conversationForSupervisor
        )

        if (result.response) {
          const assistantMsg: ChatMessage = {
            id: result.messageId || `m-${Date.now() + 1}`,
            role: 'assistant',
            content: result.response,
            timestamp: new Date().toISOString(),
          }
          addMessageToConversation(assistantMsg, currentConvId)

          // Persistir resposta do agente no Cockpit
          if (slugs && isCockpitReady) {
            saveMessage(slugs.projectSlug, slugs.chatSlug, {
              content: result.response,
              role: 'assistant',
              agentName: 'Supervisor',
            }).catch(err =>
              console.error(
                '❌ [WorkspacePage] Erro ao salvar msg assistente:',
                err
              )
            )
          }

          // Atualizar store global com a conversa atualizada
          if (activeProject) {
            const storeConv: Conversation = {
              id: currentConvId || conversationForSupervisor.id,
              projectId: activeProject.id,
              title: chatTitle,
              slug: slugs?.chatSlug || slugify(chatTitle),
              agentName: 'Supervisor',
              agentType: 'supervisor',
              messages: [
                ...(activeConversation?.messages || []).map(m => ({
                  id: m.id,
                  conversationId: currentConvId || '',
                  role: m.role as 'user' | 'assistant',
                  content: m.content,
                  timestamp: m.timestamp,
                })),
                {
                  id: userMsg.id,
                  conversationId: currentConvId || '',
                  role: 'user' as const,
                  content: userMessage, // Apenas texto para UI
                  timestamp: userMsg.timestamp,
                },
                {
                  id: assistantMsg.id,
                  conversationId: currentConvId || '',
                  role: 'assistant' as const,
                  content: result.response,
                  timestamp: assistantMsg.timestamp,
                  agentName: 'Supervisor',
                },
              ],
              createdAt:
                activeConversation?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }

            const convExists = activeProject.conversations.some(
              c => c.id === storeConv.id
            )
            const updatedProject = {
              ...activeProject,
              conversations: convExists
                ? activeProject.conversations.map(c =>
                    c.id === storeConv.id ? storeConv : c
                  )
                : [...activeProject.conversations, storeConv],
            }
            updateProject(activeProject.id, updatedProject)
            setCurrentProject(updatedProject)
            setCurrentConversation(storeConv)
          }
        }

        // Desativar loading após resposta
        setIsProcessingMessage(false)
      } catch (error) {
        console.error('❌ [WorkspacePage] Erro ao enviar mensagem:', error)

        // Map technical errors to user-friendly messages
        const rawMessage = error instanceof Error ? error.message : ''
        let friendlyContent: string

        if (rawMessage.includes('500') || rawMessage.includes('503') || rawMessage.includes('MCP is unavailable') || rawMessage.includes('Agent card could not be fetched')) {
          friendlyContent = `⚠️ **${t('sda2.workspace.communicationError' as any)}**\n\n${t('sda2.workspace.orchestratorServerError' as any)}`
        } else if (rawMessage.includes('429') || rawMessage.includes('Too Many Requests')) {
          friendlyContent = `⚠️ **${t('sda2.workspace.communicationError' as any)}**\n\n${t('sda2.workspace.orchestratorRateLimited' as any)}`
        } else if (rawMessage.includes('401') || rawMessage.includes('403')) {
          friendlyContent = `⚠️ **${t('sda2.workspace.communicationError' as any)}**\n\n${t('sda2.workspace.orchestratorAuthError' as any)}`
        } else if (rawMessage.includes('Failed to fetch') || rawMessage.includes('NetworkError') || rawMessage.includes('network')) {
          friendlyContent = `⚠️ **${t('sda2.workspace.communicationError' as any)}**\n\n${t('sda2.workspace.orchestratorNetworkError' as any)}`
        } else {
          friendlyContent = `⚠️ **${t('sda2.workspace.communicationError' as any)}**\n\n${t('sda2.workspace.orchestratorGenericError' as any)}`
        }

        const errorMsg: ChatMessage = {
          id: `m-error-${Date.now()}`,
          role: 'assistant',
          content: friendlyContent,
          timestamp: new Date().toISOString(),
        }
        addMessageToConversation(errorMsg)

        // Desativar loading em caso de erro
        setIsProcessingMessage(false)
      }
    },
    [
      isProcessingMessage,
      isSupervisorLoading,
      conversations,
      activeConversationId,
      activeConversation,
      activeProject,
      user,
      sendToSupervisor,
      addMessageToConversation,
      ensureProjectAndChat,
      isCockpitReady,
      saveMessage,
      updateProject,
      setCurrentProject,
      setCurrentConversation,
      activeTab,
    ]
  )

  const handleNewConversation = () => {
    // Bloquear criação de novo chat enquanto chats estão carregando
    if (isLoadingChats || isLoadingHistory) return

    // Bloquear se não há conversas (handleSend cria automaticamente ao enviar)
    // ou se a conversa ATIVA está vazia (evitar criar nova conversa sem usar a atual)
    // Nota: não usamos conversations.some() porque conversas carregadas do Cockpit
    // iniciam com messages=[] antes do histórico ser buscado assíncronamente
    const hasNoConversations = filteredConversations.length === 0
    const activeConvHasNoMessages = activeConversation?.messages.length === 0
    if (hasNoConversations || activeConvHasNoMessages) return

    const baseTitle = t('sda2.workspace.newConversation' as any) as string

    // Usar contador persistido no projeto (sincronizado com Cockpit)
    const currentCounter = currentProject?.conversationCounter || 0

    // Também verificar conversas existentes para sincronizar contador se necessário
    // Regex para "Nova Conversa (N)" ou "Nova Conversa" sem número
    const regexWithParentheses = new RegExp(
      `^${baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+\\((\\d+)\\)$`
    )
    const regexFirst = new RegExp(
      `^${baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
    )

    let maxFromConversations = 0
    let hasFirstConversation = false

    for (const conv of conversations) {
      // Verificar se existe "Nova Conversa" sem número (primeira)
      if (regexFirst.test(conv.title)) {
        hasFirstConversation = true
      }
      // Verificar "Nova Conversa (N)" e pegar o maior número
      const match = conv.title.match(regexWithParentheses)
      if (match?.[1]) {
        const num = parseInt(match[1], 10)
        if (num > maxFromConversations) maxFromConversations = num
      }
    }

    // Determinar próximo número baseado nas conversas existentes
    let nextNumber: number
    if (!hasFirstConversation) {
      // Não existe "Nova Conversa" ainda - criar a primeira sem número
      nextNumber = 0
    } else {
      // Já existe primeira conversa - próximo número é maxFromConversations + 1
      nextNumber = maxFromConversations + 1
    }

    // Usar o maior entre contador do projeto e o calculado
    nextNumber = Math.max(currentCounter, nextNumber)

    // Persistir contador no projeto
    if (currentProject) {
      updateProject(currentProject.id, { conversationCounter: nextNumber + 1 })
    }

    // Definir título baseado no número
    const chatTitle =
      nextNumber === 0
        ? baseTitle // Primeira conversa: "Nova Conversa"
        : `${baseTitle} (${nextNumber})` // Subsequentes: "Nova Conversa (1)", "Nova Conversa (2)", etc.
    // Generate stable unique slug: readable prefix + unique 8-char suffix
    const chatSlug = `${slugify(chatTitle)}-${crypto.randomUUID().split('-')[0]}`

    const newConv = {
      id: `conv-${Date.now()}`,
      title: chatTitle,
      slug: chatSlug,
      createdAt: new Date().toISOString(),
      type: selectedChatType,
      messages: [] as ChatMessage[],
    }
    setConversations(prev => [...prev, newConv])
    setActiveConversationId(newConv.id)
    setShowConversationList(false)

    // Persistir no Cockpit em background (pass the unique slug)
    ensureProjectAndChat(chatTitle, selectedChatType, chatSlug).catch(err =>
      console.error('❌ [WorkspacePage] Erro ao persistir nova conversa:', err)
    )
  }

  /**
   * Troca o tipo de chat selecionado.
   * Limpa memória das conversas anteriores e carrega novos chats da API.
   */
  const handleChatTypeChange = useCallback(
    (newType: ChatType): boolean => {
      // Bloquear troca enquanto conversas/histórico estão carregando
      if (isLoadingChats || isLoadingHistory) {
        toast.warning(
          t('sda2.workspace.waitForLoading' as any) as string
        )
        return false
      }
      setSelectedChatType(newType)
      // Limpar conversas da aba anterior e carregar da API
      loadChatsForType(newType)
      return true
    },
    [loadChatsForType, isLoadingChats, isLoadingHistory, t]
  )

  // ============================================================================
  // File Attachment Handlers (with Background Processing)
  // ============================================================================

  /**
   * Inicia processamento de imagem em background (OCR)
   * Chamado quando ChatInput anexa arquivo
   */
  const startImageProcessing = useCallback((file: File, index: number) => {
    console.log(
      `🚀 [BACKGROUND] Iniciando OCR de ${file.name} (index: ${index})...`
    )

    const processingPromise = (async () => {
      try {
        const formData = new FormData()
        formData.append('image', file)

        const response = await fetch('/api/ocr/vision', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (result.success && result.text) {
          console.log(
            `✅ [BACKGROUND] OCR #${index} completo: ${result.text.length} chars`
          )
          return `\n\n--- Análise Visual de ${file.name} ---\n${result.text}\n--- Fim da análise ---\n`
        } else {
          throw new Error(
            result.error?.message ||
              (t('sda2.workspace.ocrFailed' as any) as string)
          )
        }
      } catch (error) {
        console.error(`❌ [BACKGROUND] OCR #${index} erro:`, error)
        throw error
      }
    })()

    const fileKey = getFileKey(file)
    const cacheEntry: ProcessingResult = {
      index,
      file,
      fileKey,
      type: 'image',
      status: 'processing',
      promise: processingPromise,
      startedAt: Date.now(),
    }

    processingCacheRef.current.set(index, cacheEntry)
    setProcessingCache(prev => {
      const newCache = new Map(prev)
      newCache.set(index, cacheEntry)
      return newCache
    })

    processingPromise
      .then(content => {
        const refExisting = processingCacheRef.current.get(index)
        if (refExisting) {
          processingCacheRef.current.set(index, {
            ...refExisting,
            status: 'completed',
            content,
            completedAt: Date.now(),
          })
        }
        setProcessingCache(prev => {
          const newCache = new Map(prev)
          const existing = newCache.get(index)
          if (existing) {
            newCache.set(index, {
              ...existing,
              status: 'completed',
              content,
              completedAt: Date.now(),
            })
          }
          return newCache
        })
      })
      .catch(error => {
        const refExisting = processingCacheRef.current.get(index)
        if (refExisting) {
          processingCacheRef.current.set(index, {
            ...refExisting,
            status: 'error',
            error: error.message,
            completedAt: Date.now(),
          })
        }
        setProcessingCache(prev => {
          const newCache = new Map(prev)
          const existing = newCache.get(index)
          if (existing) {
            newCache.set(index, {
              ...existing,
              status: 'error',
              error: error.message,
              completedAt: Date.now(),
            })
          }
          return newCache
        })
      })
  }, [])

  /**
   * Inicia processamento de documento em background (PDF/DOCX/CSV/TXT)
   * Chamado quando ChatInput anexa arquivo
   */
  const startDocumentProcessing = useCallback((file: File, index: number) => {
    console.log(
      `🚀 [BACKGROUND] Iniciando parsing de ${file.name} (index: ${index})...`
    )

    const processingPromise = (async () => {
      try {
        // CSV
        if (file.name.endsWith('.csv') || file.type === 'text/csv') {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/csv/analyze', {
            method: 'POST',
            body: formData,
          })

          const result = await response.json()

          if (result.success && result.analysis) {
            const csvText = await file.text()
            console.log(`✅ [BACKGROUND] CSV #${index} completo`)
            return `\n\n--- Análise de ${file.name} ---\n${result.analysis}\n\n--- Dados CSV ---\n${csvText}\n--- Fim do CSV ---\n`
          }
          const csvText = await file.text()
          return `\n\n--- Conteúdo de ${file.name} ---\n${csvText}\n--- Fim do arquivo ---\n`
        }

        // TXT/MD
        if (
          file.type.startsWith('text/') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.md')
        ) {
          const text = await file.text()
          console.log(`✅ [BACKGROUND] TXT #${index} completo: ${file.name}`)
          return `\n\n--- Conteúdo de ${file.name} ---\n${text}\n--- Fim do arquivo ---\n`
        }

        // PDF/DOCX
        if (
          file.type === 'application/pdf' ||
          file.name.endsWith('.pdf') ||
          file.type ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.name.endsWith('.docx') ||
          file.name.endsWith('.doc')
        ) {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/parse-document', {
            method: 'POST',
            body: formData,
          })

          const result = await response.json()

          if (result.success && result.markdown) {
            console.log(
              `✅ [BACKGROUND] Parse #${index} completo: ${file.name}`
            )
            return `\n\n--- Conteúdo de ${file.name} ---\n${result.markdown}\n--- Fim do arquivo ---\n`
          }
        }

        console.log(
          `⚠️ [BACKGROUND] Arquivo #${index} não suportado: ${file.name}`
        )
        return `\n[Arquivo ${file.name} anexado: ${(file.size / 1024).toFixed(2)} KB]\n`
      } catch (error) {
        console.error(`❌ [BACKGROUND] Parse #${index} erro:`, error)
        throw error
      }
    })()

    const fileKey = getFileKey(file)
    const cacheEntry: ProcessingResult = {
      index,
      file,
      fileKey,
      type: 'document',
      status: 'processing',
      promise: processingPromise,
      startedAt: Date.now(),
    }

    processingCacheRef.current.set(index, cacheEntry)
    setProcessingCache(prev => {
      const newCache = new Map(prev)
      newCache.set(index, cacheEntry)
      return newCache
    })

    processingPromise
      .then(content => {
        const refExisting = processingCacheRef.current.get(index)
        if (refExisting) {
          processingCacheRef.current.set(index, {
            ...refExisting,
            status: 'completed',
            content,
            completedAt: Date.now(),
          })
        }
        setProcessingCache(prev => {
          const newCache = new Map(prev)
          const existing = newCache.get(index)
          if (existing) {
            newCache.set(index, {
              ...existing,
              status: 'completed',
              content,
              completedAt: Date.now(),
            })
          }
          return newCache
        })
      })
      .catch(error => {
        const refExisting = processingCacheRef.current.get(index)
        if (refExisting) {
          processingCacheRef.current.set(index, {
            ...refExisting,
            status: 'error',
            error: error.message,
            completedAt: Date.now(),
          })
        }
        setProcessingCache(prev => {
          const newCache = new Map(prev)
          const existing = newCache.get(index)
          if (existing) {
            newCache.set(index, {
              ...existing,
              status: 'error',
              error: error.message,
              completedAt: Date.now(),
            })
          }
          return newCache
        })
      })
  }, [])

  /**
   * Callback quando ChatInput anexa imagens - inicia OCR em background
   */
  const handleImagesAttached = useCallback(
    (images: Array<{ file: File; index: number }>) => {
      images.forEach(({ file, index }) => {
        startImageProcessing(file, index)
      })
    },
    [startImageProcessing]
  )

  /**
   * Callback quando ChatInput anexa arquivos de texto - inicia parsing em background
   */
  const handleTextFilesAttached = useCallback(
    (files: Array<{ file: File; index: number }>) => {
      files.forEach(({ file, index }) => {
        startDocumentProcessing(file, index)
      })
    },
    [startDocumentProcessing]
  )

  /**
   * Callback quando ChatInput remove arquivo - cancela processamento
   */
  const handleFileRemoved = useCallback((index: number) => {
    console.log(`🗑️ [BACKGROUND] Cancelando processamento #${index}`)
    processingCacheRef.current.delete(index)
    setProcessingCache(prev => {
      const newCache = new Map(prev)
      newCache.delete(index)
      return newCache
    })
  }, [])

  // ============================================================================
  // Artifact Accept/Reject Handlers
  // ============================================================================

  const handleArtifactAccept = useCallback(
    async (detectedArtifact: DetectedArtifact) => {
      if (!activeProject) return

      const artifactType = mapDetectedTypeToArtifactType(detectedArtifact.type)
      const activeConv = conversations.find(c => c.id === activeConversationId)
      const chatTitle =
        activeConv?.title ||
        (t('sda2.workspace.newConversation' as any) as string)
      // Use the immutable slug from the conversation (with UUID suffix), fallback to slugify for old chats
      const chatSlug = activeConv?.slug || slugify(chatTitle)

      // Verificar se já existe um artefato do mesmo tipo no mesmo chat
      const existingArtifactIndex = activeProject.artifacts.findIndex(
        a => a.type === artifactType && a.chatSlug === chatSlug
      )

      let version = 1
      if (existingArtifactIndex >= 0) {
        const existing = activeProject.artifacts[existingArtifactIndex]
        version = (existing?.version || 0) + 1
      }

      const newArtifact: Artifact = {
        id: `artifact-${Date.now()}`,
        projectId: activeProject.id,
        title: getDocumentTypeName(detectedArtifact.type),
        type: artifactType,
        content: detectedArtifact.content,
        agentName: cockpitConfig?.userName || user.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version,
        status: 'draft',
        finalized: false,
        chatSlug,
        documentType: detectedArtifact.type,
        projectSlug: slugify(activeProject.name),
      }

      // Atualizar lista de artefatos - PRESERVAR finalized dos outros artefatos
      let updatedArtifacts: Artifact[]

      if (existingArtifactIndex >= 0) {
        // Substituir artefato existente do mesmo tipo/chat mantendo outros inalterados
        updatedArtifacts = activeProject.artifacts.map(
          (a: Artifact, idx: number) =>
            idx === existingArtifactIndex ? newArtifact : a // mantém propriedades dos outros (incluindo finalized)
        )
      } else {
        // Adicionar novo artefato preservando artefatos existentes
        updatedArtifacts = [...activeProject.artifacts, newArtifact]
      }

      // Atualizar projeto no store - passa apenas artifacts para não sobrescrever todo projeto
      updateProject(activeProject.id, {
        artifacts: updatedArtifacts,
        updatedAt: new Date().toISOString(),
      })

      // Atualizar currentProject local
      setCurrentProject({
        ...activeProject,
        artifacts: updatedArtifacts,
        updatedAt: new Date().toISOString(),
      })

      // Atualizar state local de artifacts - reconstruir a partir do buildArtifactsFromProject
      const updatedProjectForState = {
        ...activeProject,
        artifacts: updatedArtifacts,
      }
      setArtifacts(buildArtifactsFromProject(updatedProjectForState))

      // Atualizar keys aceitas na sessão
      setAcceptedArtifactKeys(prev => [...prev, detectedArtifact.id])

      // Selecionar o agente e artefato no painel direito
      const panelAgentId = mapArtifactToAgentId(newArtifact)
      setSelectedAgentId(panelAgentId)
      setSelectedArtifactId(newArtifact.id)
      setActiveTab('artifact')

      // Persistir no Cockpit
      if (isCockpitReady && cockpitConfig) {
        const projectSlug = slugify(activeProject.name)

        // Gerar resumo dinâmico do artefato para persistir no histórico
        const artifactSummary = extractArtifactSummary(detectedArtifact.content)

        const toastId = toast.loading(
          t('sda2.workspace.toasts.savingArtifact' as any) as string,
          {
            description: t('sda2.workspace.toasts.persistingArtifact' as any, {
              title: newArtifact.title,
            }) as string,
          }
        )

        const result = await saveArtifact(
          activeProject,
          chatSlug,
          detectedArtifact,
          cockpitConfig.userId,
          cockpitConfig.userName
        )

        if (result.success) {
          // Recarregar o artefato do Cockpit para pegar updatedAt correto
          const reloadResult = await loadArtifactContent(
            projectSlug,
            chatSlug,
            detectedArtifact.type
          )

          if (reloadResult.success) {
            // Atualizar o artefato com os dados corretos do Cockpit
            const apiData = reloadResult as any
            setArtifacts(prev =>
              prev.map(a =>
                a.id === newArtifact.id
                  ? {
                      ...a,
                      version: reloadResult.version
                        ? parseInt(reloadResult.version.split('.')[0] || '1')
                        : a.version,
                      createdAt: apiData.createdAt || a.createdAt,
                      updatedAt: reloadResult.updatedAt || a.updatedAt,
                      createdByName: apiData.createdByName,
                      sharedWith: (reloadResult.sharedWith || []).map(
                        (s: any) => ({
                          name: s.userName,
                          email: s.userEmail,
                          userId: s.userId,
                          userName: s.userName,
                          userEmail: s.userEmail,
                          sharedVersion: s.sharedVersion,
                          sharedAt: s.sharedAt,
                          sharedBy: s.sharedBy,
                          sharedByName: s.sharedByName,
                        })
                      ),
                    }
                  : a
              )
            )
          }

          await Promise.all([
            approveArtifact(
              projectSlug,
              chatSlug,
              detectedArtifact.type as import('@/features/artifacts/services/document-artifact.service').DocumentType,
              cockpitConfig.userId,
              cockpitConfig.userName
            ),
            updateMessageArtifactStatus(
              projectSlug,
              chatSlug,
              '',
              detectedArtifact.type,
              'approved',
              {
                userId: cockpitConfig.userId,
                userName: cockpitConfig.userName,
              },
              artifactSummary
            ),
          ])

          toast.success(
            t('sda2.workspace.toasts.artifactApprovedSaved' as any) as string,
            {
              id: toastId,
              description: t(
                'sda2.workspace.toasts.artifactApprovedSavedDesc' as any,
                { title: newArtifact.title }
              ) as string,
            }
          )

          // useEffect irá recarregar metadados automaticamente quando selectedArtifact.version mudar

          // Indexar no RAG em background
          indexToRag({
            artifactId: newArtifact.id,
            projectId: activeProject.id,
            projectSlug,
            chatSlug,
            title: newArtifact.title,
            artifactType: mapToRagArtifactType(detectedArtifact.type),
            content: detectedArtifact.content,
            agentName: 'Supervisor',
            feedbackType: 'positive',
            userId: cockpitConfig.userId,
            userName: cockpitConfig.userName,
          }).catch(err => {
            console.warn(
              '⚠️ [RAG] Erro ao indexar artefato (não bloqueante):',
              err
            )
          })
        } else {
          toast.warning(
            t(
              'sda2.workspace.toasts.artifactApprovedLocallyTitle' as any
            ) as string,
            {
              id: toastId,
              description: t(
                'sda2.workspace.toasts.artifactApprovedLocallyDesc' as any,
                { error: result.error }
              ) as string,
            }
          )
        }
      } else {
        toast.success(
          t('sda2.workspace.toasts.artifactApproved' as any) as string,
          {
            description: t(
              'sda2.workspace.toasts.artifactApprovedDesc' as any,
              { title: newArtifact.title }
            ) as string,
          }
        )
      }
    },
    [
      activeProject,
      conversations,
      activeConversationId,
      updateProject,
      setCurrentProject,
      isCockpitReady,
      cockpitConfig,
      saveArtifact,
      approveArtifact,
      updateMessageArtifactStatus,
      indexToRag,
      user,
      loadAllVersionsMetadata,
    ]
  )

  const handleArtifactReject = useCallback(
    async (artifactId: string, rejectedArtifact?: DetectedArtifact) => {
      const documentType = rejectedArtifact?.type

      // Atualizar keys rejeitadas na sessão
      setRejectedArtifactKeys(prev => [...prev, artifactId])

      if (
        documentType &&
        isCockpitReady &&
        activeProject &&
        rejectedArtifact &&
        cockpitConfig
      ) {
        const projectSlug = slugify(activeProject.name)
        const activeConv = conversations.find(
          c => c.id === activeConversationId
        )
        // Use the immutable slug from the conversation (with UUID suffix), fallback to slugify for old chats
        const chatSlug = activeConv?.slug || slugify(
          activeConv?.title ||
            (t('sda2.workspace.newConversation' as any) as string)
        )

        const toastId = toast.loading(
          t('sda2.workspace.toasts.rejectingArtifact' as any) as string,
          {
            description: t(
              'sda2.workspace.toasts.persistingRejection' as any
            ) as string,
          }
        )

        const rejectResult = await rejectArtifact(
          projectSlug,
          chatSlug,
          documentType as import('@/features/artifacts/services/document-artifact.service').DocumentType,
          {
            artifactId,
            artifactName: getDocumentTypeName(documentType),
            content: rejectedArtifact.content,
            userId: cockpitConfig.userId,
            userName: cockpitConfig.userName,
          },
          t('sda2.workspace.toasts.rejectedByUser' as any) as string
        )

        await updateMessageArtifactStatus(
          projectSlug,
          chatSlug,
          '',
          documentType,
          'rejected',
          {
            userId: cockpitConfig.userId,
            userName: cockpitConfig.userName,
          },
          extractArtifactSummary(rejectedArtifact.content)
        )

        // Indexar feedback negativo no RAG
        indexToRag({
          artifactId,
          projectId: activeProject.id,
          projectSlug,
          chatSlug,
          title:
            rejectedArtifact.title ||
            (t('sda2.workspace.toasts.rejectedArtifact' as any) as string),
          artifactType: mapToRagArtifactType(documentType),
          content: rejectedArtifact.content,
          agentName: 'Supervisor',
          feedbackType: 'negative',
          rejectionReason: t(
            'sda2.workspace.toasts.rejectedByUser' as any
          ) as string,
          userId: cockpitConfig.userId,
          userName: cockpitConfig.userName,
        }).catch(err => {
          console.warn(
            '⚠️ [RAG] Erro ao indexar rejeição (não bloqueante):',
            err
          )
        })

        if (rejectResult.success) {
          toast.success(
            t('sda2.workspace.toasts.artifactRejected' as any) as string,
            {
              id: toastId,
              description: t(
                'sda2.workspace.toasts.artifactRejectedPersistedDesc' as any
              ) as string,
            }
          )
        } else {
          toast.warning(
            t(
              'sda2.workspace.toasts.artifactRejectedLocallyTitle' as any
            ) as string,
            {
              id: toastId,
              description: t(
                'sda2.workspace.toasts.artifactRejectedLocallyDesc' as any,
                { error: rejectResult.error }
              ) as string,
            }
          )
        }
      } else {
        toast.info(
          t('sda2.workspace.toasts.artifactRejected' as any) as string,
          {
            description: t(
              'sda2.workspace.toasts.artifactRejectedDesc' as any
            ) as string,
          }
        )
      }
    },
    [
      isCockpitReady,
      activeProject,
      conversations,
      activeConversationId,
      cockpitConfig,
      rejectArtifact,
      updateMessageArtifactStatus,
      indexToRag,
    ]
  )

  const handleRenameConversation = async (convId: string) => {
    if (!renameConvValue.trim()) return
    const trimmedName = renameConvValue.trim()
    // Atualizar estado local imediatamente (UX responsivo)
    setConversations(prev =>
      prev.map(c => (c.id === convId ? { ...c, title: trimmedName } : c))
    )
    setRenamingConvId(null)

    // Persistir no Cockpit com loading overlay
    if (activeProject) {
      const conv = conversations.find(c => c.id === convId)
      const projectSlug = slugify(activeProject.name)
      const chatSlug = conv?.slug || slugify(conv?.title || '')
      if (chatSlug) {
        setIsRenamingChatLoading(true)
        try {
          await renameChat(projectSlug, chatSlug, trimmedName)
          toast.success(
            t('sda2.workspace.toasts.conversationRenamed' as any) as string
          )
        } catch (err) {
          console.error(
            '❌ [WorkspacePage] Erro ao persistir rename de conversa:',
            err
          )
          toast.error(
            t('sda2.workspace.toasts.conversationRenameError' as any) as string
          )
        } finally {
          setIsRenamingChatLoading(false)
        }
      } else {
        toast.success(
          t('sda2.workspace.toasts.conversationRenamed' as any) as string
        )
      }
    } else {
      toast.success(
        t('sda2.workspace.toasts.conversationRenamed' as any) as string
      )
    }
  }

  const handleToggleNotifications = () => {
    setShowNotifications(prev => !prev)
    if (!showNotifications && notifications.length > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  const handleClearNotifications = () => {
    setNotifications([])
    setShowNotifications(false)
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex h-screen bg-background">
      {/* Main Content */}
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 ${fullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}
      >
        {/* Top Bar */}
        <div
          className={`flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 sm:gap-4 sm:px-6 sm:py-3 ${fullscreen ? 'hidden' : ''}`}
        >
          <button
            onClick={onBack}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1
              className="truncate text-xs font-bold text-foreground sm:text-sm"
              title={currentProject?.name || project.name}
            >
              {currentProject?.name || project.name}
            </h1>
            <p className="hidden text-[10px] text-muted-foreground sm:block">
              {t('sda2.workspace.createdBy' as any)}:{' '}
              {projectOwner?.name || user.name}
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Language Selector */}
            <div>
              <LanguageSelector />
            </div>

            {/* Notifications Button */}
            <Popover
              open={showNotifications}
              onOpenChange={setShowNotifications}
            >
              <PopoverTrigger asChild>
                <button
                  className="flex flex-col items-center"
                  onClick={handleToggleNotifications}
                >
                  <div className="relative rounded-full border border-border bg-background/80 p-2 shadow-sm transition-all hover:bg-secondary/70">
                    {unreadCount > 0 ? (
                      <BellRing className="size-4 animate-bounce text-primary" />
                    ) : (
                      <Bell className="size-4 text-muted-foreground" />
                    )}
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-3 py-2">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <BellRing className="size-3.5 text-primary" />
                      {t('sda2.workspace.sdaNotifications' as any)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {t('sda2.workspace.artifactUpdates' as any)}
                    </span>
                  </div>
                  {sharedArtifactNotifications.length > 0 && (
                    <button
                      onClick={() => {
                        handleClearNotifications()
                        markAllSharedArtifactsAsDeleted()
                      }}
                      className="rounded-md p-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                      title={
                        t(
                          'sda2.workspace.deleteAllNotifications' as any
                        ) as string
                      }
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.length === 0 &&
                  sharedArtifactNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                      <Bell className="mb-2 size-5 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground">
                        {t('sda2.workspace.noNotification' as any)}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/80">
                        {t('sda2.workspace.alertsWillAppear' as any)}
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {/* Notificações de artefatos compartilhados */}
                      {sharedArtifactNotifications.map(n => {
                        // Mapear tipo de artefato para ícone e label
                        // Considera: artifactType (brief, prd-greenfield, etc.), documentType (briefing, prd, etc.) e título
                        const getArtifactTypeInfo = (
                          artifactType: string,
                          documentType?: string,
                          title?: string
                        ) => {
                          const typeLower = (artifactType || '').toLowerCase()
                          const docTypeLower = (
                            documentType || ''
                          ).toLowerCase()
                          const titleLower = (title || '').toLowerCase()

                          // Discovery/Briefing
                          if (
                            typeLower === 'brief' ||
                            typeLower.includes('discovery') ||
                            typeLower.includes('briefing') ||
                            docTypeLower.includes('briefing') ||
                            docTypeLower.includes('discovery') ||
                            titleLower.includes('discovery')
                          ) {
                            return {
                              icon: Search,
                              label: 'Discovery',
                              color: 'text-amber-500',
                            }
                          }

                          // PRD
                          if (
                            typeLower.includes('prd') ||
                            typeLower.includes('product requirements') ||
                            docTypeLower === 'prd' ||
                            docTypeLower.includes('product')
                          ) {
                            return {
                              icon: FileText,
                              label: 'PRD',
                              color: 'text-blue-500',
                            }
                          }

                          // Design/UX/Frontend Spec
                          if (
                            typeLower === 'frontend-spec' ||
                            typeLower.includes('design') ||
                            typeLower.includes('ux') ||
                            typeLower.includes('interface') ||
                            docTypeLower.includes('design') ||
                            docTypeLower.includes('frontend') ||
                            docTypeLower.includes('ux') ||
                            titleLower.includes('design') ||
                            titleLower.includes('especificação de design')
                          ) {
                            return {
                              icon: Palette,
                              label: 'Design',
                              color: 'text-purple-500',
                            }
                          }

                          // Arquitetura
                          if (
                            typeLower === 'architecture' ||
                            typeLower.includes('arquitetura') ||
                            typeLower.includes('technical') ||
                            docTypeLower.includes('architecture') ||
                            docTypeLower.includes('arquitetura')
                          ) {
                            return {
                              icon: Layers,
                              label: 'Arquitetura',
                              color: 'text-emerald-500',
                            }
                          }

                          // Backlog/Epics
                          if (
                            typeLower === 'epics' ||
                            typeLower.includes('backlog') ||
                            typeLower.includes('epic') ||
                            typeLower.includes('story') ||
                            docTypeLower.includes('backlog') ||
                            docTypeLower.includes('epic')
                          ) {
                            return {
                              icon: ListChecks,
                              label: 'Backlog',
                              color: 'text-orange-500',
                            }
                          }

                          // Default
                          return {
                            icon: FileText,
                            label: 'Documento',
                            color: 'text-muted-foreground',
                          }
                        }
                        const typeInfo = getArtifactTypeInfo(
                          n.artifactType,
                          n.documentType,
                          n.artifactTitle
                        )
                        const TypeIcon = typeInfo.icon

                        return (
                          <li
                            key={n.id}
                            className={`flex cursor-pointer flex-col gap-1.5 px-3 py-2.5 text-xs transition-colors hover:bg-secondary/50 ${n.status === 'unread' ? 'bg-primary/5' : 'bg-background'}`}
                            onClick={() => {
                              // Marcar como lida se ainda não estiver
                              if (n.status === 'unread') {
                                markSharedArtifactAsRead(n.id)
                              }
                              // Navegar para o artefato
                              setSelectedArtifactId(n.artifactId)
                              setActiveTab('artifact')
                            }}
                          >
                            {/* Linha 1: Ícone do tipo + Tipo + Badge de não lido */}
                            <div className="flex items-center gap-2">
                              <TypeIcon
                                className={`size-4 ${typeInfo.color}`}
                              />
                              <span
                                className={`text-[10px] font-medium ${typeInfo.color}`}
                              >
                                {typeInfo.label}
                              </span>
                              {n.status === 'unread' && (
                                <span className="ml-auto size-2 rounded-full bg-primary" />
                              )}
                            </div>
                            {/* Linha 2: Título do artefato */}
                            <span className="truncate font-medium text-foreground">
                              {n.customName || n.artifactTitle}
                            </span>
                            {/* Linha 3: Quem compartilhou */}
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Share2 className="size-3" />
                              {t('sda2.workspace.sharedBy' as any, {
                                name: n.sharedByName,
                              })}
                            </span>
                            {/* Linha 4: Data/hora */}
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="size-3" />
                              {formatTime(n.sharedAt)}
                            </span>
                          </li>
                        )
                      })}
                      {/* Notificações locais (sistema) */}
                      {notifications.map(n => (
                        <li
                          key={n.id}
                          className={`flex flex-col gap-1 px-3 py-2 text-xs ${n.read ? 'bg-background' : 'bg-primary/5'}`}
                        >
                          <span className="text-foreground">{n.message}</span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="size-3" />
                            {formatTime(n.createdAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Dica sobre notificações */}
                <div className="border-t border-border bg-secondary/20 px-3 py-2">
                  <p className="text-[10px] italic text-muted-foreground">
                    {t('sda2.workspace.notificationsTip' as any)}
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            {/* Team Button */}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 px-2 text-xs sm:px-3"
              onClick={() => setShowTeamModal(true)}
            >
              <UsersIcon className="size-3.5" />
              <span className="hidden sm:inline">
                {t('sda2.workspace.team' as any)}
              </span>
            </Button>

            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-lg border border-border p-1.5 transition-colors hover:bg-secondary sm:p-2"
                title={
                  theme === 'dark'
                    ? (t('sda2.workspace.switchToLightTheme' as any) as string)
                    : (t('sda2.workspace.switchToDarkTheme' as any) as string)
                }
              >
                {theme === 'dark' ? (
                  <Sun className="text-warning size-4" />
                ) : (
                  <Moon className="size-4 text-primary" />
                )}
              </button>
            )}

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 transition-colors hover:bg-secondary sm:gap-2 sm:px-3 sm:py-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {user.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-medium text-foreground">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
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
                  <LicenseSelector readOnly showLabelAlways />
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={onLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  {t('sda2.workspace.logout' as any)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Pipeline Stages (Agent Tabs) */}
        <div
          className={`shrink-0 border-b border-border px-2 py-1.5 sm:px-6 sm:py-2 ${fullscreen ? 'hidden' : ''}`}
        >
          <HorizontalScrollContainer className="gap-1">
            {sdaAgents.map((agent, i) => {
              const status = getAgentStatus(agent.id)
              const cfg = statusConfig[status]
              const StatusIcon = cfg.icon
              const isSelected = selectedAgentId === agent.id
              const count = artifacts.filter(a => a.agentId === agent.id).length

              return (
                <div key={agent.id} className="flex items-center">
                  <button
                    onClick={() => {
                      // Trocar tipo de chat e auto-selecionar/criar conversa
                      const mappedType =
                        agentIdToChatType[agent.id] || 'discovery'
                      const allowed = handleChatTypeChange(mappedType)
                      if (!allowed) return
                      setSelectedAgentId(agent.id)
                      const firstArt = artifacts.find(
                        a => a.agentId === agent.id
                      )
                      setSelectedArtifactId(firstArt?.id || null)
                      // On mobile/small screens, focus on chat tab; on desktop show artifact
                      const isSmallScreen = window.innerWidth < 1024
                      setActiveTab(isSmallScreen ? 'chat' : 'artifact')
                      setEditMode('view')
                      setShowVersions(false)
                      setViewingVersionNumber(undefined)
                    }}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border border-primary/30 bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <StatusIcon
                      className={`size-3.5 ${cfg.color} ${status === 'in_progress' ? 'animate-spin' : ''}`}
                    />
                    <agent.icon className="size-3.5" />
                    {t(`sda2.home.agents.${agent.id}.shortName` as any)}
                    {count > 0 && (
                      <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                        {count}
                      </span>
                    )}
                  </button>
                  {i < sdaAgents.length - 1 && (
                    <ChevronRight className="mx-0.5 size-3.5 shrink-0 text-muted-foreground/40" />
                  )}
                </div>
              )
            })}
          </HorizontalScrollContainer>
        </div>

        {/* Mobile Tab Switcher */}
        <div
          className={`flex shrink-0 border-b border-border lg:hidden ${fullscreen ? '!hidden' : ''}`}
        >
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('artifact')}
            className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === 'artifact'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground'
            }`}
          >
            Artefatos
          </button>
        </div>

        {/* Main Content: Chat + Artifact Split View */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Chat Panel */}
          <div
            className={`flex min-h-0 flex-col border-r border-border ${
              fullscreen
                ? 'hidden'
                : chatMaximized
                  ? 'flex w-full'
                  : `${activeTab === 'chat' ? 'flex' : 'hidden'} w-full lg:flex lg:w-[45%]`
            }`}
          >
            {/* Conversation Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-2 py-1.5 sm:px-4 sm:py-2">
              <button
                onClick={() => setShowConversationList(!showConversationList)}
                className="flex items-center gap-1.5 text-xs font-medium text-foreground transition-colors hover:text-primary sm:gap-2 sm:text-sm"
              >
                <MessageSquare className="size-4" />
                <span
                  className="max-w-[140px] truncate sm:max-w-[300px]"
                  title={activeConversation?.title ||
                    (t('sda2.workspace.contextualization' as any, {
                      type: t(`sda2.workspace.chatTypes.${currentChatType === 'ux-design' ? 'uxDesign' : currentChatType}` as any) || 'Discovery',
                    }) as string)}
                >
                  {activeConversation?.title ||
                    (t('sda2.workspace.contextualization' as any, {
                      type: t(`sda2.workspace.chatTypes.${currentChatType === 'ux-design' ? 'uxDesign' : currentChatType}` as any) || 'Discovery',
                    }) as string)}
                </span>
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform ${
                    showConversationList ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNewConversation}
                  disabled={isLoadingChats || isLoadingHistory || filteredConversations.length === 0 || activeConversation?.messages.length === 0}
                  className={`rounded-md p-1.5 transition-colors ${
                    isLoadingChats || isLoadingHistory || filteredConversations.length === 0 || activeConversation?.messages.length === 0
                      ? 'cursor-not-allowed text-muted-foreground/40'
                      : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                  }`}
                  title={
                    isLoadingChats || isLoadingHistory
                      ? (t(
                          'sda2.workspace.loadingConversations' as any
                        ) as string)
                      : filteredConversations.length === 0 || activeConversation?.messages.length === 0
                        ? (t('sda2.workspace.startConversationFirst' as any) as string)
                        : (t('sda2.workspace.newConversation' as any) as string)
                  }
                >
                  <MessageSquarePlus className="size-4" />
                </button>
                <button
                  onClick={() => setChatMaximized(!chatMaximized)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title={
                    chatMaximized
                      ? (t('sda2.workspace.restore' as any) as string)
                      : (t('sda2.workspace.maximize' as any) as string)
                  }
                >
                  {chatMaximized ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Conversation List Dropdown */}
            {showConversationList && (
              <div className="max-h-48 shrink-0 space-y-1 overflow-y-auto border-b border-border bg-secondary/30 p-2">
                {isLoadingChats ? (
                  <div className="flex items-center justify-center gap-2 px-3 py-4">
                    <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-xs text-muted-foreground">
                      {t('sda2.workspace.loadingConversations' as any)}
                    </p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    {t('sda2.workspace.noConversationOfType' as any)}{' '}
                    <strong>
                      {
                        chatTypeTabs.find(t => t.value === currentChatType)
                          ?.label
                      }
                    </strong>
                  </p>
                ) : (
                  filteredConversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                        conv.id === activeConversationId
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {renamingConvId === conv.id ? (
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <MessageSquare className="size-3.5 shrink-0" />
                          <input
                            value={renameConvValue}
                            onChange={e => setRenameConvValue(e.target.value)}
                            onKeyDown={e =>
                              e.key === 'Enter' &&
                              handleRenameConversation(conv.id)
                            }
                            className="flex-1 border-b border-primary/40 bg-transparent text-xs text-foreground outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameConversation(conv.id)}
                            className="text-success hover:text-foreground"
                          >
                            <Check className="size-3" />
                          </button>
                          <button
                            onClick={() => setRenamingConvId(null)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              // Limpar mensagens da conversa atual para forçar recarregamento do histórico
                              setConversations(prev =>
                                prev.map(c => ({ ...c, messages: [] }))
                              )
                              setActiveConversationId(conv.id)
                              setShowConversationList(false)
                            }}
                            className="flex min-w-0 flex-1 items-center gap-2"
                          >
                            <MessageSquare className="size-3.5 shrink-0" />
                            <span className="truncate">{conv.title}</span>
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setRenameConvValue(conv.title)
                              setRenamingConvId(conv.id)
                            }}
                            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                            title={t('sda2.workspace.rename' as any) as string}
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            disabled={isDeletingChat === conv.id}
                            onClick={e => {
                              e.stopPropagation()
                              setChatToDelete(conv.id)
                              setShowDeleteChatConfirm(true)
                            }}
                            className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                            title={t('sda2.workspace.delete' as any) as string}
                          >
                            {isDeletingChat === conv.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Trash2 className="size-3" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Messages */}
            <div
              ref={chatScrollContainerRef}
              className="relative min-h-0 flex-1 space-y-3 overflow-y-auto p-2 sm:space-y-4 sm:p-4"
            >
              {/* Delete Chat Loading Overlay */}
              {isDeletingChat && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="size-8 animate-spin text-destructive" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Excluindo conversa...
                    </p>
                  </div>
                </div>
              )}
              {/* Rename Chat Loading Overlay */}
              {isRenamingChatLoading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('sda2.workspace.savingConversationName' as any)}
                    </p>
                  </div>
                </div>
              )}
              {/* Loading Chats Overlay */}
              {isLoadingChats && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('sda2.workspace.loadingConversations' as any)}
                    </p>
                  </div>
                </div>
              )}
              {/* Loading History Overlay */}
              {isLoadingHistory && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('sda2.workspace.loadingHistory' as any)}
                    </p>
                  </div>
                </div>
              )}
              {messages.length === 0 &&
                !isSupervisorLoading &&
                !isLoadingChats &&
                !isLoadingHistory && (
                  <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                    <Bot className="mb-3 size-10 opacity-40" />
                    <p className="text-sm font-medium">
                      {t('sda2.workspace.emptyStateTitle' as any)}
                    </p>
                    <p className="mt-1 text-xs">
                      {t('sda2.workspace.emptyStateDescription' as any)}
                    </p>
                  </div>
                )}
              {messagesWithArtifacts.map(msg => {
                const agent = msg.agentId
                  ? sdaAgents.find(a => a.id === msg.agentId)
                  : null

                // Usar artefatos detectados do cache (messagesWithArtifacts)
                const detectedArtifacts = msg.detectedArtifacts
                const displayContent = msg.displayContent

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : ''}`}
                  >
                    <div
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                          <Bot className="size-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[92%] sm:max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}
                      >
                        {agent && (
                          <span className="mb-1 block text-[10px] font-medium text-primary">
                            via {agent.name}
                          </span>
                        )}
                        <div
                          className={`rounded-xl px-3 py-2 text-sm leading-relaxed sm:px-4 sm:py-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-white [&_*]:text-white'
                              : 'bg-secondary/50'
                          }`}
                        >
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            {msg.role === 'assistant' ? (
                              <DiagramAwareContent content={displayContent} />
                            ) : (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={tableComponents}
                              >
                                {displayContent}
                              </ReactMarkdown>
                            )}
                          </div>

                          {/* Arquivos anexados na mensagem do usuário */}
                          {msg.role === 'user' &&
                            'attachments' in msg &&
                            msg.attachments &&
                            msg.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2 border-t border-white/20 pt-3">
                                {msg.attachments.map((attachment, idx) => {
                                  const isSharedArtifact =
                                    attachment.type === 'artifact/shared'
                                  return (
                                    <div
                                      key={attachment.id || idx}
                                      className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2"
                                    >
                                      {isSharedArtifact ? (
                                        <FileText className="size-3 text-white/70" />
                                      ) : (
                                        <Paperclip className="size-3 text-white/70" />
                                      )}
                                      <span className="text-xs font-medium text-white">
                                        {attachment.name}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                        </div>
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      {msg.role === 'user' && (
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <User className="size-4 text-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Propostas de artefatos detectados */}
                    {detectedArtifacts.length > 0 && (
                      <div className="ml-8 mt-2 max-w-[95%] sm:ml-11 sm:max-w-[80%]">
                        {detectedArtifacts.map(artifact => {
                          // Determinar status do artefato
                          const isAccepted = acceptedArtifactKeys.includes(
                            artifact.id
                          )
                          const isRejected = rejectedArtifactKeys.includes(
                            artifact.id
                          )
                          const status = isAccepted
                            ? 'approved'
                            : isRejected
                              ? 'rejected'
                              : 'pending'

                          return (
                            <ArtifactProposal
                              key={artifact.id}
                              artifact={{ ...artifact, status }}
                              summaryBullets={undefined}
                              onAccept={id => {
                                const art = detectedArtifacts.find(
                                  a => a.id === id
                                )
                                if (art)
                                  handleArtifactAccept({
                                    ...art,
                                    status: 'approved',
                                  })
                              }}
                              onReject={id => {
                                const art = detectedArtifacts.find(
                                  a => a.id === id
                                )
                                handleArtifactReject(id, art)
                              }}
                              onDelete={
                                status !== 'rejected'
                                  ? id => {
                                      const art = detectedArtifacts.find(
                                        a => a.id === id
                                      )
                                      handleArtifactReject(id, art)
                                    }
                                  : undefined
                              }
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Streaming indicator - hide when AI edit is active since the panel handles its own streaming */}
              {(isProcessingMessage || isSupervisorLoading) &&
                editMode !== 'ai' && (
                  <div className="flex gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                      <Bot className="size-4 animate-pulse text-primary" />
                    </div>
                    <div className="max-w-[92%] sm:max-w-[80%]">
                      <div className="rounded-xl bg-secondary/50 px-3 py-2 text-sm leading-relaxed sm:px-4 sm:py-3">
                        {streamingContent ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>
                              {hideStreamingDiagramCode(
                                removeArtifactMetadata(streamingContent)
                              )}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                            <div className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                            <div className="size-2 animate-bounce rounded-full bg-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Error display */}
              {supervisorError && (
                <div className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/15">
                    <AlertCircle className="size-4 text-destructive" />
                  </div>
                  <div className="max-w-[92%] rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive sm:max-w-[80%] sm:px-4 sm:py-3">
                    {supervisorError}
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="shrink-0 border-t border-border p-2 sm:p-4">
              <ChatInput
                onSendMessage={handleSend}
                isLoading={
                  isProcessingMessage ||
                  isSupervisorLoading ||
                  isLoadingChats ||
                  isLoadingHistory
                }
                acceptedFileTypes="image/*,.pdf,.docx,.txt,.md,.csv"
                maxFiles={10}
                onImagesAttached={handleImagesAttached}
                onTextFilesAttached={handleTextFilesAttached}
                onFileRemoved={handleFileRemoved}
                fileProcessingStatus={processingCache}
                projectDocuments={sharedWithMeDocuments}
                myDocuments={myFinalizedDocuments}
              />
            </div>
          </div>

          {/* Artifact Panel */}
          <div
            className={`flex min-h-0 flex-col ${
              fullscreen
                ? 'w-full'
                : chatMaximized
                  ? 'hidden'
                  : `${activeTab === 'artifact' ? 'flex' : 'hidden'} w-full lg:flex lg:w-[55%]`
            }`}
          >
            {/* Artifact List for Selected Agent */}
            <div className="shrink-0 border-b border-border px-3 py-2">
              <HorizontalScrollContainer className="flex-1 gap-1">
                {agentArtifacts.length === 0 ? (
                  <span className="px-2 text-xs text-muted-foreground">
                    {t('sda2.workspace.noArtifactsFor' as any, {
                      agent: selectedAgent?.shortName,
                    })}
                  </span>
                ) : (
                  <>
                    {agentArtifacts.map(art => {
                      const isActive = art.id === selectedArtifactId
                      const cfg = statusConfig[art.status]
                      const StatusIcon = cfg.icon
                      const isRenaming = renamingArtifactId === art.id

                      return (
                        <div
                          key={art.id}
                          className="group relative flex shrink-0 items-center"
                        >
                          {isRenaming ? (
                            <input
                              type="text"
                              value={renameArtifactValue}
                              onChange={e =>
                                setRenameArtifactValue(e.target.value)
                              }
                              onBlur={() =>
                                handleRenameArtifact(
                                  art.id,
                                  renameArtifactValue
                                )
                              }
                              onKeyDown={e => {
                                if (e.key === 'Enter')
                                  handleRenameArtifact(
                                    art.id,
                                    renameArtifactValue
                                  )
                                if (e.key === 'Escape')
                                  setRenamingArtifactId(null)
                              }}
                              autoFocus
                              className="w-36 rounded-lg border border-primary bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedArtifactId(art.id)
                                  setEditMode('view')
                                  setShowVersions(false)
                                  setViewingVersionNumber(undefined)
                                }}
                                className={`group/card flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                                  isActive
                                    ? 'border border-primary/20 bg-primary/10 text-foreground'
                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }`}
                                title={(() => {
                                  const originConv = art.chatSlug ? conversations.find(
                                    c => c.slug === art.chatSlug || slugify(c.title) === art.chatSlug
                                  ) : null
                                  return originConv ? `${art.name} — ${originConv.title}` : art.name
                                })()}
                              >
                                {selectedAgent && (
                                  <selectedAgent.icon className="size-3.5 shrink-0 text-primary" />
                                )}
                                <StatusIcon
                                  className={`size-3 ${cfg.color} ${art.status === 'in_progress' ? 'animate-spin' : ''}`}
                                />
                                <span className="max-w-[140px] truncate">
                                  {art.name}
                                </span>
                                {art.finalized && (
                                  <ShieldCheck className="text-success size-3 shrink-0" />
                                )}
                                {art.sharedWith.length > 0 && (
                                  <UsersIcon className="text-info size-3 shrink-0" />
                                )}
                                <span className="text-[9px] text-muted-foreground">
                                  v{art.version}
                                </span>
                                {/* Rename pencil inside card - appears on hover */}
                                <span
                                  onClick={e => {
                                    e.stopPropagation()
                                    setRenamingArtifactId(art.id)
                                    setRenameArtifactValue(art.name)
                                  }}
                                  className="ml-0.5 hidden size-4 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground group-hover/card:flex"
                                  title={
                                    t(
                                      'sda2.workspace.renameArtifact' as any
                                    ) as string
                                  }
                                >
                                  <Pencil className="size-3" />
                                </span>
                                {/* Delete button inside card - appears on hover */}
                                <span
                                  onClick={e => {
                                    e.stopPropagation()
                                    setArtifactToDelete(art.id)
                                    setShowDeleteConfirm(true)
                                  }}
                                  className="hidden size-4 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive group-hover/card:flex"
                                  title={
                                    t(
                                      'sda2.workspace.deleteArtifactTooltip' as any
                                    ) as string
                                  }
                                >
                                  <Trash2 className="size-3" />
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </HorizontalScrollContainer>
            </div>

            {/* Artifact Content */}
            {selectedArtifact && selectedAgent ? (
              <>
                {/* Artifact Header */}
                <div className="shrink-0 border-b border-border px-2 py-2 sm:px-4 sm:py-3">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                      {editingArtifact && (
                        <button
                          onClick={cancelEdit}
                          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          title="Sair do modo de edição"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                      {isBacklogHierarchyView && (
                        <button
                          onClick={() => setIsBacklogHierarchyView(false)}
                          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          title={t('sda2.workspace.backToView' as any)}
                        >
                          <ArrowLeft className="size-3.5" />
                          {t('sda2.workspace.back' as any)}
                        </button>
                      )}
                      <selectedAgent.icon className="size-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
                          {selectedArtifact.name}
                        </h3>
                        {/* Origin chat name */}
                        {selectedArtifact.chatSlug && (() => {
                          const originConv = conversations.find(
                            c => c.slug === selectedArtifact.chatSlug || slugify(c.title) === selectedArtifact.chatSlug
                          )
                          return originConv ? (
                            <p className="truncate text-[10px] text-muted-foreground/70">
                              <MessageSquare className="mr-0.5 inline size-2.5" />
                              {originConv.title}
                            </p>
                          ) : null
                        })()}
                        <p className="truncate text-[10px] text-muted-foreground">
                          {selectedAgent.name} •{' '}
                          {t(
                            `sda2.workspace.status.${statusConfig[selectedArtifact.status].labelKey}` as any
                          )}
                          {!isSelectedArtifactOwner && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              <Share2 className="size-2.5" />
                              {t('sda2.workspace.sharedWithYou' as any)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {/* Finalize / Final badge - appears first (owner only) */}
                      {isSelectedArtifactOwner && !editingArtifact && (
                        <>
                          {selectedArtifact.finalized ? (
                            <button
                              onClick={() =>
                                handleUnfinalizeArtifact(selectedArtifact.id)
                              }
                              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                              title={
                                t(
                                  'sda2.workspace.removeFinalVersion' as any
                                ) as string
                              }
                            >
                              <Lock className="size-3" />{' '}
                              {t('sda2.workspace.final' as any)}
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleFinalizeArtifact(selectedArtifact.id)
                              }
                              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                              title={
                                t(
                                  'sda2.workspace.markAsFinalVersion' as any
                                ) as string
                              }
                            >
                              <ShieldCheck className="size-3" />{' '}
                              {t('sda2.workspace.finalize' as any)}
                            </button>
                          )}
                        </>
                      )}
                      {/* Version history - owner only */}
                      {isSelectedArtifactOwner && (
                        <button
                          onClick={() => setShowVersions(!showVersions)}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <History className="size-3" />v
                          {selectedArtifact.version}
                          <ChevronDown className="size-2.5" />
                        </button>
                      )}
                      {isSelectedArtifactOwner && !editingArtifact && (
                        <>
                          {/* Edit dropdown - Manual or AI (owner only) */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                                <Edit3 className="size-3" />{' '}
                                {t('sda2.workspace.edit' as any)}
                                <ChevronDown className="size-2.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleEditClick(selectedArtifact.id, 'direct')
                                }
                                className="flex items-center gap-2"
                              >
                                <Pencil className="size-4" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {t('sda2.workspace.directEdit' as any)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {t('sda2.workspace.directEditDesc' as any)}
                                  </p>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleEditClick(selectedArtifact.id, 'ai')
                                }
                                className="flex items-center gap-2"
                              >
                                <Sparkles className="size-4 text-purple-500" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {t('sda2.workspace.aiEdit' as any)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {t('sda2.workspace.aiEditDesc' as any)}
                                  </p>
                                </div>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Share button (owner only) - disabled if not finalized */}
                          <button
                            onClick={() => {
                              if (!selectedArtifact?.finalized) return
                              // Pre-popular selectedShareMembers com membros já compartilhados
                              const existingIds =
                                (selectedArtifact?.sharedWith
                                  ?.map(s => {
                                    // Tentar por userId direto, senão buscar por email
                                    if (s.userId) {
                                      const found = localTeamMembers.find(
                                        m => m.id === s.userId
                                      )
                                      if (found) return found.id
                                    }
                                    const found = localTeamMembers.find(
                                      m => m.email === s.email
                                    )
                                    return found?.id
                                  })
                                  .filter(Boolean) as string[]) || []
                              setSelectedShareMembers(existingIds)
                              setShowShareModal(true)
                            }}
                            disabled={!selectedArtifact?.finalized}
                            title={
                              !selectedArtifact?.finalized
                                ? (t(
                                    'sda2.workspace.finalizeBeforeShare' as any
                                  ) as string)
                                : (t('sda2.workspace.share' as any) as string)
                            }
                            className={`flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium transition-colors ${
                              selectedArtifact?.finalized
                                ? 'text-muted-foreground hover:text-foreground'
                                : 'cursor-not-allowed text-muted-foreground/40'
                            }`}
                          >
                            <Share2 className="size-3" />{' '}
                            {t('sda2.workspace.share' as any)}
                          </button>

                          {/* Sync dropdown - only enabled for Backlog artifacts (owner only) */}
                          <Popover
                            open={showSyncMenu}
                            onOpenChange={
                              selectedAgentId === 'backlog'
                                ? setShowSyncMenu
                                : undefined
                            }
                          >
                            <PopoverTrigger asChild>
                              <button
                                className={`flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium transition-colors ${
                                  selectedAgentId === 'backlog'
                                    ? 'text-muted-foreground hover:text-foreground'
                                    : 'cursor-not-allowed text-muted-foreground/40'
                                }`}
                                disabled={selectedAgentId !== 'backlog'}
                                title={
                                  selectedAgentId !== 'backlog'
                                    ? (t(
                                        'sda2.workspace.syncAvailableOnlyForBacklog' as any
                                      ) as string)
                                    : (t(
                                        'sda2.workspace.syncArtifact' as any
                                      ) as string)
                                }
                              >
                                <RefreshCw className="size-3" />{' '}
                                {t('sda2.workspace.sync' as any)}
                                <ChevronDown className="size-2.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-48 p-1.5">
                              <div className="space-y-0.5">
                                <button
                                  onClick={() => {
                                    setShowSyncMenu(false)
                                    setIsBacklogHierarchyView(true)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
                                >
                                  <svg
                                    className="size-4"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M0 8.877L2.247 5.91l8.405-3.416V.022l7.37 5.393L2.966 8.338v8.225L0 15.707zm24-4.45v14.651l-5.753 4.9-9.303-3.057v3.056l-5.978-7.416 15.057 1.798V5.415z" />
                                  </svg>
                                  Azure DevOps
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </>
                      )}

                      {/* Download dropdown - visible for all users */}
                      <Popover
                        open={showDownloadMenu}
                        onOpenChange={setShowDownloadMenu}
                      >
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                            <Download className="size-3" /> Download
                            <ChevronDown className="size-2.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-44 p-1.5">
                          <div className="space-y-0.5">
                            <button
                              onClick={() => handleDownload('pdf')}
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
                            >
                              <FileText className="size-3.5 text-red-400" />
                              PDF
                            </button>
                            <button
                              onClick={() => handleDownload('docx')}
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
                            >
                              <FileType className="size-3.5 text-blue-400" />
                              Word (.docx)
                            </button>
                            <button
                              onClick={() => handleDownload('md')}
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
                            >
                              <FileText className="size-3.5 text-muted-foreground" />
                              Markdown (.md)
                            </button>
                            <button
                              onClick={() => handleDownload('json')}
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
                            >
                              <FileJson className="size-3.5 text-yellow-400" />
                              JSON
                            </button>
                            <button
                              onClick={() => handleDownload('html')}
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
                            >
                              <FileCode className="size-3.5 text-orange-400" />
                              HTML
                            </button>
                            {(selectedArtifact?.documentType === 'epics' ||
                              ['backlog', 'user-story', 'epic'].includes(
                                selectedArtifact?.documentType?.toLowerCase() ??
                                  ''
                              )) && (
                              <button
                                onClick={() => handleDownload('csv')}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
                              >
                                <FileSpreadsheet className="size-3.5 text-green-400" />
                                CSV
                              </button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Expand button */}
                      <button
                        onClick={() => setFullscreen(!fullscreen)}
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {fullscreen ? (
                          <Minimize2 className="size-3" />
                        ) : (
                          <Maximize2 className="size-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Compartilhado com - lista de pessoas */}
                {selectedArtifact.sharedWith.length > 0 && (
                  <div className="shrink-0 border-b border-border bg-secondary/20 px-4 py-1.5">
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <UsersIcon className="size-3 shrink-0" />
                      <span>{t('sda2.workspace.sharedWithLabel' as any)}</span>
                      <span className="font-medium text-foreground">
                        {selectedArtifact.sharedWith
                          .map(s => s.name)
                          .join(', ')}
                      </span>
                    </p>
                  </div>
                )}

                {/* Version History Panel */}
                {showVersions && (
                  <div className="shrink-0 border-b border-border bg-secondary/30 px-4 py-3">
                    {isLoadingVersion ? (
                      <div className="flex items-center justify-center gap-2 py-4">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">
                          Carregando versão...
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Versão atual */}
                        <button
                          onClick={async () => {
                            if (viewingVersionNumber !== undefined) {
                              // Recarregar da versão atual
                              setViewingVersionNumber(undefined)
                              setViewingVersionMetadata(null)
                              const result = await loadArtifactContent(
                                selectedArtifact.projectSlug!,
                                selectedArtifact.chatSlug!,
                                selectedArtifact.documentType!
                              )
                              if (result.success && result.content) {
                                setArtifacts(prev =>
                                  prev.map(a =>
                                    a.id === selectedArtifact.id
                                      ? {
                                          ...a,
                                          content: result.content,
                                        }
                                      : a
                                  )
                                )
                                toast.success(
                                  t(
                                    'sda2.workspace.toasts.returnedToCurrentVersion' as any
                                  ) as string
                                )
                              }
                            }
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors ${
                            viewingVersionNumber === undefined
                              ? 'bg-primary/10'
                              : 'hover:bg-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                viewingVersionNumber === undefined
                                  ? 'font-medium text-primary'
                                  : 'text-muted-foreground'
                              }
                            >
                              v{selectedArtifact.version} —{' '}
                              {t('sda2.workspace.currentVersion' as any)}
                            </span>
                            {viewingVersionNumber === undefined && (
                              <Check className="size-3 text-primary" />
                            )}
                          </div>
                          {(() => {
                            // Buscar metadados da versão atual do allVersionsMetadata
                            const currentMetadata = allVersionsMetadata.find(
                              v => v.versionNumber === selectedArtifact.version
                            )
                            const displayUpdatedAt =
                              currentMetadata?.updatedAt ||
                              selectedArtifact.updatedAt

                            console.log(
                              '🕒 [Dropdown] Versão atual timestamp:',
                              {
                                version: selectedArtifact.version,
                                fromMetadata: currentMetadata?.updatedAt,
                                fromArtifact: selectedArtifact.updatedAt,
                                final: displayUpdatedAt,
                              }
                            )

                            return displayUpdatedAt ? (
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(displayUpdatedAt).toLocaleDateString(
                                  dateLocale,
                                  {
                                    day: '2-digit',
                                    month: '2-digit',
                                  }
                                )}
                                ,{' '}
                                {new Date(displayUpdatedAt).toLocaleTimeString(
                                  dateLocale,
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </span>
                            ) : null
                          })()}
                        </button>

                        {/* Versões anteriores */}
                        {Array.from(
                          { length: selectedArtifact.version - 1 },
                          (_, i) => selectedArtifact.version - 1 - i
                        ).map(versionNum => {
                          // Calcular descrição da versão
                          const versionDescription =
                            versionNum === 1
                              ? (t(
                                  'sda2.workspace.initialVersion' as any
                                ) as string)
                              : `${t('sda2.workspace.version' as any)} ${versionNum}`

                          // Buscar metadados da versão
                          const metadata = allVersionsMetadata.find(
                            v => v.versionNumber === versionNum
                          )

                          return (
                            <button
                              key={versionNum}
                              onClick={() => handleVersionSelect(versionNum)}
                              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors ${
                                viewingVersionNumber === versionNum
                                  ? 'bg-primary/10'
                                  : 'hover:bg-secondary'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={
                                    viewingVersionNumber === versionNum
                                      ? 'font-medium text-primary'
                                      : 'text-muted-foreground'
                                  }
                                >
                                  v{versionNum} — {versionDescription}
                                </span>
                                {viewingVersionNumber === versionNum && (
                                  <Check className="size-3 text-primary" />
                                )}
                              </div>
                              {metadata && metadata.updatedAt && (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(
                                    metadata.updatedAt
                                  ).toLocaleDateString(dateLocale, {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}
                                  ,{' '}
                                  {new Date(
                                    metadata.updatedAt
                                  ).toLocaleTimeString(dateLocale, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Artifact Body */}
                <div className="relative flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">
                  {/* Delete Artifact Loading Overlay */}
                  {isDeletingArtifact && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="size-8 animate-spin text-destructive" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Excluindo artefato...
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Rename Artifact Loading Overlay */}
                  {isRenamingArtifactLoading && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="size-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Salvando nome do artefato...
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Inline Edit Warning Banner */}
                  {showEditWarning &&
                    pendingEditArtifact === selectedArtifact.id && (
                      <div className="mb-4 rounded-lg border border-border p-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              Atenção: artefato protegido
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {(() => {
                                const art = artifacts.find(
                                  a => a.id === pendingEditArtifact
                                )
                                if (!art) return ''
                                const sharedNames = art.sharedWith.map(
                                  s => s.name
                                )
                                const parts: string[] = []

                                if (art.finalized) {
                                  parts.push(
                                    t(
                                      'sda2.workspace.artifactMarkedFinal' as any
                                    ) as string
                                  )
                                }

                                if (sharedNames.length > 0) {
                                  parts.push(
                                    t(
                                      'sda2.workspace.artifactSharedWith' as any
                                    ) as string
                                  )
                                }

                                return parts.join(' ')
                              })()}
                              {(() => {
                                const art = artifacts.find(
                                  a => a.id === pendingEditArtifact
                                )
                                if (!art || art.sharedWith.length === 0)
                                  return null
                                return (
                                  <>
                                    <span className="font-semibold text-foreground">
                                      {art.sharedWith
                                        .map(s => s.name)
                                        .join(', ')}
                                    </span>
                                    {
                                      '. Qualquer alteração deve ser comunicada aos profissionais que estão utilizando este documento.'
                                    }
                                  </>
                                )
                              })()}
                            </p>
                            <div className="mt-3 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setShowEditWarning(false)
                                  setPendingEditArtifact(null)
                                }}
                              >
                                Cancelar
                              </Button>
                              <button
                                className="h-7 px-3 text-xs text-foreground"
                                onClick={confirmEdit}
                              >
                                Editar mesmo assim
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {isBacklogHierarchyView &&
                  selectedArtifact?.content &&
                  selectedAgentId === 'backlog' ? (
                    <div className="flex h-full flex-col overflow-hidden">
                      <BacklogHierarchyView
                        content={selectedArtifact.content}
                        projectId={activeProject?.id}
                        chatSlug={selectedArtifact.chatSlug}
                        backlogVersion={selectedArtifact.version?.toString()}
                        artifactTitle={selectedArtifact.name}
                        onBack={() => setIsBacklogHierarchyView(false)}
                        processInfo={adoProcessInfo}
                      />
                    </div>
                  ) : editMode === 'direct' ? (
                    <div className="flex h-full flex-col">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full flex-1 resize-none rounded-xl border border-border bg-input p-4 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" onClick={cancelEdit}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={async () => {
                            if (
                              !selectedArtifact ||
                              !cockpitConfig ||
                              !isCockpitReady
                            ) {
                              toast.error(
                                t(
                                  'sda2.workspace.toasts.saveError' as any
                                ) as string,
                                {
                                  description: t(
                                    'sda2.workspace.toasts.cockpitNotReadyDesc' as any
                                  ) as string,
                                }
                              )
                              return
                            }

                            const toastId = toast.loading(
                              t(
                                'sda2.workspace.toasts.savingEdit' as any
                              ) as string,
                              {
                                description: t(
                                  'sda2.workspace.toasts.creatingNewVersion' as any
                                ) as string,
                              }
                            )

                            try {
                              const detectedArtifact = {
                                id: selectedArtifact.id,
                                title: selectedArtifact.name,
                                content: editContent,
                                type: selectedArtifact.documentType!,
                                status: 'approved' as const,
                              }

                              const result = await saveArtifact(
                                activeProject,
                                selectedArtifact.chatSlug!,
                                detectedArtifact,
                                cockpitConfig.userId,
                                cockpitConfig.userName
                              )

                              if (!result.success) {
                                toast.error(
                                  t(
                                    'sda2.workspace.toasts.saveError' as any
                                  ) as string,
                                  {
                                    id: toastId,
                                    description:
                                      result.error ||
                                      (t(
                                        'sda2.workspace.toasts.couldNotSaveChanges' as any
                                      ) as string),
                                  }
                                )
                                return
                              }

                              // Recarregar o conteúdo do Cockpit E a versão
                              if (
                                selectedArtifact.chatSlug &&
                                selectedArtifact.documentType &&
                                selectedArtifact.projectSlug
                              ) {
                                const reloadResult = await loadArtifactContent(
                                  selectedArtifact.projectSlug,
                                  selectedArtifact.chatSlug,
                                  selectedArtifact.documentType
                                )

                                // Atualizar artefato com novo conteúdo E nova versão
                                if (
                                  reloadResult.success &&
                                  reloadResult.content
                                ) {
                                  setArtifacts(prev =>
                                    prev.map(a =>
                                      a.id === selectedArtifact.id
                                        ? {
                                            ...a,
                                            content: reloadResult.content,
                                            version: reloadResult.version
                                              ? parseInt(reloadResult.version)
                                              : a.version,
                                            updatedAt:
                                              reloadResult.updatedAt ||
                                              a.updatedAt,
                                          }
                                        : a
                                    )
                                  )

                                  toast.success(
                                    t(
                                      'sda2.workspace.toasts.newVersionCreated' as any
                                    ) as string,
                                    {
                                      id: toastId,
                                      description: t(
                                        'sda2.workspace.toasts.artifactUpdatedToVersion' as any,
                                        { version: reloadResult.version }
                                      ) as string,
                                    }
                                  )

                                  // useEffect irá recarregar metadados automaticamente quando selectedArtifact.version mudar
                                } else {
                                  toast.success(
                                    t(
                                      'sda2.workspace.toasts.saved' as any
                                    ) as string,
                                    {
                                      id: toastId,
                                      description: t(
                                        'sda2.workspace.toasts.savedToCockpit' as any
                                      ) as string,
                                    }
                                  )
                                }
                              } else {
                                toast.success(
                                  t(
                                    'sda2.workspace.toasts.saved' as any
                                  ) as string,
                                  {
                                    id: toastId,
                                    description: t(
                                      'sda2.workspace.toasts.savedToCockpit' as any
                                    ) as string,
                                  }
                                )
                              }

                              setEditMode('view')
                            } catch (error) {
                              console.error('❌ Erro ao salvar edição:', error)
                              toast.error(
                                t(
                                  'sda2.workspace.toasts.saveError' as any
                                ) as string,
                                {
                                  id: toastId,
                                  description: t(
                                    'sda2.workspace.toasts.couldNotSaveChanges' as any
                                  ) as string,
                                }
                              )
                            }
                          }}
                        >
                          Salvar nova versão
                        </Button>
                      </div>
                    </div>
                  ) : editMode === 'ai' && selectedArtifact ? (
                    <ArtifactAIEditPanel
                      artifact={{
                        id: selectedArtifact.id,
                        projectId: activeProject.id,
                        title: selectedArtifact.name,
                        type:
                          (selectedArtifact.documentType as Artifact['type']) ||
                          'fragments',
                        content: selectedArtifact.content || '',
                        agentName: selectedAgent?.name || '',
                        createdAt: selectedArtifact.createdAt,
                        updatedAt: selectedArtifact.createdAt,
                        version: selectedArtifact.version,
                        status: selectedArtifact.finalized
                          ? 'approved'
                          : 'draft',
                        finalized: selectedArtifact.finalized,
                        chatSlug: selectedArtifact.chatSlug,
                        documentType: selectedArtifact.documentType,
                        projectSlug: selectedArtifact.projectSlug,
                      }}
                      onCancel={cancelEdit}
                      onSendMessage={handleAIEditMessage}
                      onAcceptEdit={handleAcceptAIEdit}
                      isProcessing={isSupervisorLoading}
                      streamingContent={streamingContent}
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert md:prose">
                      {selectedArtifact.content ? (
                        <DiagramAwareContent
                          content={selectedArtifact.content}
                          className="prose prose-sm max-w-none dark:prose-invert md:prose"
                          markdownComponents={{
                            ...tableComponents,
                            h1: ({ children }) => (
                              <h1 className="mb-3 text-xl font-bold text-foreground md:mb-4 md:text-2xl lg:text-3xl">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="mb-2 mt-4 text-lg font-semibold text-foreground md:mb-3 md:mt-6 md:text-xl">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="mb-2 mt-3 text-base font-semibold text-foreground md:mt-4 md:text-lg">
                                {children}
                              </h3>
                            ),
                            h4: ({ children }) => (
                              <h4 className="my-2 text-sm font-semibold text-foreground md:mt-3 md:text-base">
                                {children}
                              </h4>
                            ),
                            p: ({ children }) => (
                              <p className="mb-2 text-sm leading-relaxed text-muted-foreground md:mb-3 md:text-base">
                                {children}
                              </p>
                            ),
                            ul: ({ children }) => (
                              <ul className="mb-3 list-disc space-y-1 pl-4 md:mb-4 md:pl-5">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-3 list-decimal space-y-1 pl-4 md:mb-4 md:pl-5">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="text-sm text-muted-foreground md:text-base">
                                {children}
                              </li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-foreground">
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic text-muted-foreground">
                                {children}
                              </em>
                            ),
                            code: ({ children }) => (
                              <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm text-foreground">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="mb-4 overflow-x-auto rounded-lg bg-secondary p-4 text-sm text-foreground">
                                {children}
                              </pre>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="my-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
                                {children}
                              </blockquote>
                            ),
                            hr: () => <hr className="my-6 border-border" />,
                          }}
                        />
                      ) : isLoadingArtifactContent ? (
                        <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                          <div className="mb-3 size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <p className="text-sm text-muted-foreground">
                            Carregando conteúdo do artefato...
                          </p>
                        </div>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                          <FileText className="mb-3 size-12 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">
                            Artefato ainda não gerado
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground/60">
                            Converse com o orquestrador para iniciar a geração
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rodapé de metadados do artefato */}
                  {selectedArtifact.content && !editingArtifact && (
                    <div className="mt-6 border-t border-border pt-3">
                      <p className="text-[11px] text-muted-foreground/60">
                        <Clock className="mb-px mr-1 inline-block size-3" />
                        {viewingVersionNumber !== undefined &&
                        viewingVersionMetadata ? (
                          // Metadados da versão histórica
                          <>
                            {t('sda2.workspace.createdBy' as any)}{' '}
                            <span className="font-medium text-muted-foreground">
                              {viewingVersionMetadata.createdByName ||
                                t('sda2.workspace.system' as any)}
                            </span>
                            {viewingVersionMetadata.updatedAt && (
                              <>
                                {' '}
                                {t('sda2.workspace.on' as any)}{' '}
                                {new Date(
                                  viewingVersionMetadata.updatedAt
                                ).toLocaleDateString(dateLocale, {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                                ,{' '}
                                {new Date(
                                  viewingVersionMetadata.updatedAt
                                ).toLocaleTimeString(dateLocale, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </>
                            )}
                          </>
                        ) : (
                          // Metadados da versão atual
                          (() => {
                            // Buscar metadados da versão atual do allVersionsMetadata
                            const currentMetadata = allVersionsMetadata.find(
                              v => v.versionNumber === selectedArtifact.version
                            )
                            const displayUpdatedAt =
                              currentMetadata?.updatedAt ||
                              selectedArtifact.updatedAt
                            const displayCreatedBy =
                              currentMetadata?.createdByName ||
                              selectedArtifact.createdByName ||
                              selectedArtifact.agentName ||
                              selectedAgent?.name ||
                              t('sda2.workspace.system' as any)

                            console.log('🕒 [Footer] Versão atual timestamp:', {
                              version: selectedArtifact.version,
                              fromMetadata: currentMetadata?.updatedAt,
                              fromArtifact: selectedArtifact.updatedAt,
                              final: displayUpdatedAt,
                            })

                            return (
                              <>
                                {t('sda2.workspace.versionCreatedBy' as any, {
                                  version: selectedArtifact.version,
                                })}{' '}
                                <span className="font-medium text-muted-foreground">
                                  {displayCreatedBy}
                                </span>
                                {displayUpdatedAt && (
                                  <>
                                    {' '}
                                    {t('sda2.workspace.on' as any)}{' '}
                                    {new Date(
                                      displayUpdatedAt
                                    ).toLocaleDateString(dateLocale, {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    })}
                                    ,{' '}
                                    {new Date(
                                      displayUpdatedAt
                                    ).toLocaleTimeString(dateLocale, {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </>
                                )}
                              </>
                            )
                          })()
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <FileText className="mb-4 size-16 text-muted-foreground/30" />
                <h3 className="mb-2 text-lg font-medium text-foreground">
                  {t('sda2.workspace.noArtifactSelectedTitle' as any)}
                </h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  {t('sda2.workspace.noArtifactSelectedDescription' as any)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Modal - Centered Overlay */}
      {showTeamModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            setShowTeamModal(false)
            setShowAddMember(false)
            setTeamSearch('')
          }}
        >
          <div
            className="mx-4 flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {t('sda2.workspace.projectTeam' as any)}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowTeamModal(false)
                  setShowAddMember(false)
                  setTeamSearch('')
                }}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Member List */}
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {localTeamMembers.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  {t('sda2.workspace.noMemberAdded' as any)}
                </p>
              ) : (
                localTeamMembers.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
                  >
                    {/* Avatar */}
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {member.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    {/* Name & Email */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {member.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>

                    {/* Remove button (Owner cannot be removed) */}
                    {member.role === 'Owner' ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                        {t('sda2.workspace.creator' as any)}
                      </span>
                    ) : (
                      <button
                        onClick={() => removeTeamMember(member.id)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title={
                          t('sda2.workspace.removeMember' as any) as string
                        }
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Member Section */}
            <div className="border-t border-border p-3">
              {!showAddMember ? (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Plus className="size-3.5" />
                  {t('sda2.workspace.addMember' as any)}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={
                        t('sda2.workspace.searchPlaceholder' as any) as string
                      }
                      value={teamSearch}
                      onChange={e => setTeamSearch(e.target.value)}
                      className="h-8 text-xs"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddMember(false)
                        setTeamSearch('')
                      }}
                      className="h-8 px-2 text-xs"
                    >
                      {t('sda2.workspace.cancel' as any)}
                    </Button>
                  </div>

                  {/* Member List - always visible when adding */}
                  <div className="max-h-40 overflow-y-auto rounded-lg bg-secondary/30 p-1">
                    {isLoadingUsers ? (
                      <div className="flex items-center justify-center gap-2 py-3">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {t('sda2.workspace.searching' as any)}
                        </span>
                      </div>
                    ) : filteredDirectory.length === 0 ? (
                      <p className="py-3 text-center text-xs text-muted-foreground">
                        {teamSearch
                          ? t('sda2.workspace.noMemberFound' as any)
                          : t('sda2.workspace.noMemberAvailable' as any)}
                      </p>
                    ) : (
                      filteredDirectory.map(member => (
                        <button
                          key={member.email}
                          onClick={() => addTeamMember(member)}
                          className="flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-secondary"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            {member.name
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">
                              {member.name}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                          <Plus className="size-3.5 text-muted-foreground" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            setShowDeleteConfirm(false)
            setArtifactToDelete(null)
          }}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="size-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t('sda2.workspace.deleteArtifactQuestion' as any)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {artifacts.find(a => a.id === artifactToDelete)?.name}
                </p>
              </div>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              {t('sda2.workspace.deleteWarning' as any)}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setArtifactToDelete(null)
                }}
                disabled={isDeletingArtifact}
              >
                {t('sda2.workspace.cancel' as any)}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeletingArtifact}
                onClick={() =>
                  artifactToDelete && handleDeleteArtifact(artifactToDelete)
                }
              >
                {isDeletingArtifact ? (
                  <>
                    <Loader2 className="mr-2 size-3 animate-spin" />
                    {t('sda2.workspace.deleting' as any)}
                  </>
                ) : (
                  t('sda2.workspace.delete' as any)
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Chat Confirmation Modal */}
      {showDeleteChatConfirm && chatToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            setShowDeleteChatConfirm(false)
            setChatToDelete(null)
          }}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="size-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t('sda2.workspace.deleteChatQuestion' as any)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {conversations.find(c => c.id === chatToDelete)?.title}
                </p>
              </div>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              {t('sda2.workspace.deleteChatWarning' as any)}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeleteChatConfirm(false)
                  setChatToDelete(null)
                }}
                disabled={isDeletingChat !== null}
              >
                {t('sda2.workspace.cancel' as any)}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeletingChat !== null}
                onClick={async () => {
                  const conv = conversations.find(c => c.id === chatToDelete)
                  if (!conv) return
                  setIsDeletingChat(conv.id)
                  setShowDeleteChatConfirm(false)
                  setChatToDelete(null)
                  try {
                    if (conv.slug && activeProject?.name) {
                      const projectSlug = slugify(activeProject.name)
                      const result = await deleteChat(projectSlug, conv.slug)
                      if (!result.success) {
                        toast.error(
                          result.error ||
                            (t(
                              'sda2.workspace.toasts.conversationDeleteError' as any
                            ) as string)
                        )
                        return
                      }
                    }
                    const remaining = conversations.filter(
                      c => c.id !== conv.id
                    )
                    if (activeProject) {
                      const updatedConversations = (
                        activeProject.conversations || []
                      ).filter(c => c.id !== conv.id)
                      const updatedProject = {
                        ...activeProject,
                        conversations: updatedConversations,
                      }
                      updateProject(activeProject.id, updatedProject)
                      setCurrentProject(updatedProject)
                    }
                    setConversations(remaining)
                    if (activeConversationId === conv.id) {
                      setActiveConversationId(remaining[0]?.id || '')
                    }
                    if (remaining.length === 0) {
                      setShowConversationList(false)
                    }
                    toast.success(
                      t(
                        'sda2.workspace.toasts.conversationDeleted' as any
                      ) as string
                    )
                  } catch (error) {
                    console.error('❌ Erro ao excluir conversa:', error)
                    toast.error(
                      t(
                        'sda2.workspace.toasts.conversationDeleteError' as any
                      ) as string
                    )
                  } finally {
                    setIsDeletingChat(null)
                  }
                }}
              >
                {isDeletingChat ? (
                  <>
                    <Loader2 className="mr-2 size-3 animate-spin" />
                    {t('sda2.workspace.deleting' as any)}
                  </>
                ) : (
                  t('sda2.workspace.delete' as any)
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Azure DevOps Sync Modal */}
      {showDevOpsModal && selectedArtifact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowDevOpsModal(false)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-xl border border-border bg-card shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <svg
                  className="size-5 text-primary"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M0 8.877L2.247 5.91l8.405-3.416V.022l7.37 5.393L2.966 8.338v8.225L0 15.707zm24-4.45v14.651l-5.753 4.9-9.303-3.057v3.056l-5.978-7.416 15.057 1.798V5.415z" />
                </svg>
                <h3 className="text-sm font-semibold text-foreground">
                  {t('sda2.workspace.syncWithAzureDevOps' as any)}
                </h3>
              </div>
              <button
                onClick={() => setShowDevOpsModal(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4 p-4">
              {/* Organization */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  {t('sda2.workspace.organization' as any)}{' '}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder={
                    t('sda2.workspace.organizationPlaceholder' as any) as string
                  }
                  value={devOpsOrg}
                  onChange={e => setDevOpsOrg(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  {t('sda2.workspace.organizationHelp' as any)}
                </p>
              </div>

              {/* Project */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  {t('sda2.workspace.project' as any)}{' '}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder={
                    t('sda2.workspace.projectPlaceholder' as any) as string
                  }
                  value={devOpsProject}
                  onChange={e => setDevOpsProject(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  {t('sda2.workspace.projectHelp' as any)}
                </p>
              </div>

              {/* PAT */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  {t('sda2.workspace.personalAccessToken' as any)}{' '}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={devOpsPat}
                  onChange={e => setDevOpsPat(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  {t('sda2.workspace.patHelp' as any)}
                </p>
              </div>

              {/* Path (optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  {t('sda2.workspace.path' as any)}{' '}
                  <span className="text-muted-foreground">
                    ({t('sda2.workspace.optional' as any)})
                  </span>
                </label>
                <Input
                  placeholder={
                    t('sda2.workspace.pathPlaceholder' as any) as string
                  }
                  value={devOpsPath}
                  onChange={e => setDevOpsPath(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  {t('sda2.workspace.pathHelp' as any)}
                </p>
              </div>
            </div>

            {/* Test Result */}
            {testResult && (
              <div
                className={`mx-4 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  testResult.success
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400'
                }`}
              >
                {testResult.success ? (
                  <Check className="size-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="size-3.5 shrink-0" />
                )}
                {testResult.message}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDevOpsModal(false)
                  setTestResult(null)
                }}
              >
                {t('sda2.workspace.cancel' as any)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  !devOpsOrg || !devOpsProject || !devOpsPat || isTesting
                }
                onClick={async () => {
                  setIsTesting(true)
                  setTestResult(null)
                  try {
                    const success = await azureDevOpsService.testConnection(
                      {
                        organization: devOpsOrg,
                        project: devOpsProject,
                        areaPath: devOpsPath || undefined,
                      },
                      devOpsPat
                    )
                    setTestResult({
                      success,
                      message: success
                        ? (t(
                            'sda2.workspace.connectionSuccessful' as any
                          ) as string)
                        : (t(
                            'sda2.workspace.connectionFailed' as any
                          ) as string),
                    })
                  } catch (error) {
                    setTestResult({
                      success: false,
                      message: t('sda2.workspace.errorPrefix' as any, {
                        error:
                          error instanceof Error ? error.message : 'Unknown',
                      }) as string,
                    })
                  } finally {
                    setIsTesting(false)
                  }
                }}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 size-3 animate-spin" />
                    {t('sda2.workspace.testing' as any)}
                  </>
                ) : (
                  <>
                    <Check className="mr-2 size-3" />
                    {t('sda2.workspace.testConnection' as any)}
                  </>
                )}
              </Button>
              <Button
                size="sm"
                disabled={
                  !devOpsOrg ||
                  !devOpsProject ||
                  !devOpsPat ||
                  isSyncing ||
                  !testResult?.success
                }
                onClick={async () => {
                  setIsSyncing(true)
                  try {
                    const config = {
                      organization: devOpsOrg,
                      project: devOpsProject,
                      areaPath: devOpsPath || undefined,
                    }
                    // Salvar credenciais
                    azureDevOpsService.savePAT(devOpsPat)
                    azureDevOpsService.setConfig(config)
                    if (activeProject?.id) {
                      await azureDevOpsService.saveProjectConfig(
                        activeProject.id,
                        config
                      )
                    }
                    toast.success(
                      t('sda2.workspace.toasts.configSaved' as any) as string
                    )
                    setShowDevOpsModal(false)
                    setTestResult(null)
                    setDevOpsOrg('')
                    setDevOpsProject('')
                    setDevOpsPat('')
                    setDevOpsPath('')
                  } catch (error) {
                    console.error('Erro ao salvar configuração:', error)
                    toast.error(
                      t(
                        'sda2.workspace.toasts.saveConfigError' as any
                      ) as string
                    )
                  } finally {
                    setIsSyncing(false)
                  }
                }}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 size-3 animate-spin" />
                    {t('sda2.workspace.saving' as any)}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 size-3" />
                    {t('sda2.workspace.saveAndConnect' as any)}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal - Persistido via Cockpit */}
      {showShareModal && selectedArtifact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            if (!isSharing) {
              setShowShareModal(false)
              setShareSearch('')
              setSelectedShareMembers([])
            }
          }}
        >
          <div
            className="mx-4 flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Share2 className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {t('sda2.workspace.shareArtifact' as any)}
                </h3>
              </div>
              <button
                onClick={() => {
                  if (!isSharing) {
                    setShowShareModal(false)
                    setShareSearch('')
                    setSelectedShareMembers([])
                  }
                }}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Artifact Info */}
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {t('sda2.workspace.artifactLabel' as any)}
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {selectedArtifact.name}
              </p>
              {/* Origin chat name in share modal */}
              {selectedArtifact.chatSlug && (() => {
                const originConv = conversations.find(
                  c => c.slug === selectedArtifact.chatSlug || slugify(c.title) === selectedArtifact.chatSlug
                )
                return originConv ? (
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
                    <MessageSquare className="mr-0.5 inline size-2.5" />
                    {originConv.title}
                  </p>
                ) : null
              })()}
              {(!selectedArtifact.chatSlug ||
                !selectedArtifact.documentType ||
                !selectedArtifact.projectSlug) && (
                <p className="text-warning mt-1 text-[10px]">
                  {t('sda2.workspace.incompleteShareData' as any)}
                </p>
              )}
            </div>

            {/* Current Shares */}
            <div className="flex-1 overflow-y-auto p-3">
              {(() => {
                const sharedWithOthers = selectedArtifact.sharedWith.filter(
                  p => p.email !== user.email && p.userId !== user.id
                )
                return (
                  <>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {t('sda2.workspace.sharedWithCount' as any, {
                        count: sharedWithOthers.length,
                      })}
                    </p>
                    {sharedWithOthers.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        {t('sda2.workspace.notSharedYet' as any)}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sharedWithOthers.map((person, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
                          >
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {(person.name || 'User')
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {person.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {person.email}
                              </p>
                              {person.sharedBy && (
                                <p className="truncate text-[10px] text-muted-foreground/70">
                                  {t('sda2.workspace.sharedBy' as any, {
                                    name: person.sharedBy,
                                  })}
                                  {person.sharedAt
                                    ? ` ${t('sda2.workspace.onDate' as any, { date: new Date(person.sharedAt).toLocaleDateString(dateLocale) })}`
                                    : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Select Members Section */}
            <div className="border-t border-border p-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('sda2.workspace.selectMembersToShare' as any)}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={
                      t('sda2.workspace.searchPlaceholder' as any) as string
                    }
                    value={shareSearch}
                    onChange={e => setShareSearch(e.target.value)}
                    className="h-8 text-xs"
                    disabled={isSharing}
                  />
                </div>

                {/* Team Members List (checkboxes) */}
                <div className="max-h-40 overflow-y-auto rounded-lg bg-secondary/30 p-1">
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center gap-2 py-6">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {t('sda2.workspace.loadingMembers' as any)}
                      </p>
                    </div>
                  ) : (
                    (() => {
                      // Filtrar apenas membros da equipe (excluindo o próprio usuário)
                      // O Owner aparece na lista quando o usuário atual NÃO é o Owner
                      const availableMembers = localTeamMembers.filter(
                        m =>
                          m.id !== user.id &&
                          (shareSearch === '' ||
                            m.name
                              .toLowerCase()
                              .includes(shareSearch.toLowerCase()) ||
                            m.email
                              .toLowerCase()
                              .includes(shareSearch.toLowerCase()))
                      )
                      return availableMembers.length === 0 ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">
                          {t(
                            'sda2.workspace.noMemberAvailableAddToTeam' as any
                          )}
                        </p>
                      ) : (
                        availableMembers.map(member => {
                          const isSelected = selectedShareMembers.includes(
                            member.id
                          )
                          return (
                            <button
                              key={member.id}
                              disabled={isSharing}
                              onClick={() => {
                                setSelectedShareMembers(prev =>
                                  isSelected
                                    ? prev.filter(id => id !== member.id)
                                    : [...prev, member.id]
                                )
                              }}
                              className={`flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors ${
                                isSelected
                                  ? 'bg-primary/10'
                                  : 'hover:bg-secondary'
                              }`}
                            >
                              <div
                                className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                                  isSelected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-muted-foreground'
                                }`}
                              >
                                {isSelected && <Check className="size-3" />}
                              </div>
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                {member.name
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-foreground">
                                  {member.name}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {member.email}
                                </p>
                              </div>
                            </button>
                          )
                        })
                      )
                    })()
                  )}
                </div>
              </div>
            </div>

            {/* Footer with Share Button */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-[10px] text-muted-foreground">
                {selectedShareMembers.length > 0
                  ? t('sda2.workspace.membersSelected' as any, {
                      count: selectedShareMembers.length,
                    })
                  : t('sda2.workspace.selectMembersAbove' as any)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={isSharing}
                  onClick={() => {
                    setShowShareModal(false)
                    setShareSearch('')
                    setSelectedShareMembers([])
                  }}
                >
                  {t('sda2.workspace.cancel' as any)}
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={
                    isSharing ||
                    selectedShareMembers.length === 0 ||
                    !selectedArtifact.chatSlug ||
                    !selectedArtifact.documentType ||
                    !selectedArtifact.projectSlug
                  }
                  onClick={async () => {
                    if (
                      !selectedArtifact.chatSlug ||
                      !selectedArtifact.documentType ||
                      !selectedArtifact.projectSlug
                    ) {
                      toast.error(
                        t(
                          'sda2.workspace.toasts.incompleteArtifactForSharing' as any
                        ) as string
                      )
                      return
                    }

                    setIsSharing(true)
                    const artifactKey = `document-${selectedArtifact.documentType}-${selectedArtifact.projectSlug}-${selectedArtifact.chatSlug}`

                    try {
                      // Usar selectedShareMembers como fonte de verdade
                      const allMemberIds = [...new Set(selectedShareMembers)]

                      // Usar namespace users para lookup (inclui todos os usuários selecionáveis)
                      const allKnownMembers = [
                        ...localTeamMembers,
                        ...sortedNamespaceUsers.filter(
                          nu => !localTeamMembers.some(tm => tm.id === nu.id)
                        ),
                      ]

                      const result = await shareArtifact(
                        selectedArtifact.projectSlug,
                        selectedArtifact.chatSlug,
                        artifactKey,
                        allMemberIds,
                        allKnownMembers
                      )

                      if (result.success) {
                        // Atualizar estado local para refletir compartilhamento
                        const now = new Date().toISOString()
                        const newSharedWith = allMemberIds
                          .map(id => {
                            const m = allKnownMembers.find(tm => tm.id === id)
                            return m
                              ? {
                                  name: m.name,
                                  email: m.email,
                                  userId: m.id,
                                  sharedAt: now,
                                  sharedBy:
                                    cockpitConfig?.userName ||
                                    (t('sda2.workspace.user' as any) as string),
                                }
                              : null
                          })
                          .filter(Boolean) as Array<{
                          name: string
                          email: string
                          userId?: string
                          sharedAt?: string
                          sharedBy?: string
                        }>

                        setArtifacts(prev =>
                          prev.map(a =>
                            a.id === selectedArtifact.id
                              ? { ...a, sharedWith: newSharedWith }
                              : a
                          )
                        )
                        toast.success(
                          t('sda2.workspace.toasts.artifactSharedWith' as any, {
                            count: selectedShareMembers.length,
                          }) as string
                        )
                        setShowShareModal(false)
                        setShareSearch('')
                        setSelectedShareMembers([])
                      } else {
                        toast.error(
                          t('sda2.workspace.toasts.errorSharingWith' as any, {
                            error:
                              result.error ||
                              t('sda2.workspace.toasts.errorUnknown' as any),
                          }) as string
                        )
                      }
                    } catch (error) {
                      console.error('❌ Erro ao compartilhar artefato:', error)
                      toast.error(
                        t(
                          'sda2.workspace.toasts.shareArtifactError' as any
                        ) as string
                      )
                    } finally {
                      setIsSharing(false)
                    }
                  }}
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="mr-1 size-3 animate-spin" />
                      {t('sda2.workspace.sharing' as any)}
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-1 size-3" />
                      {t('sda2.workspace.share' as any)}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
