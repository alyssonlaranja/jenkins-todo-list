/**
 * useCockpitServices Hook
 *
 * Hook para integrar o SDA2 com os serviços de artefatos do Cockpit
 * Utiliza a nova estrutura: Project → Chat → History → Documents
 *
 * Estrutura de Keys:
 * - Projeto: project-{slug}
 * - Chat: chat-{projectSlug}-{chatSlug}
 * - Histórico: history-{projectSlug}-{chatSlug}
 * - Documento: document-{type}-{projectSlug}-{chatSlug}
 */
'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'

import { SDAServiceConfig } from '@/features/artifacts/services'
import { DocumentType } from '@/features/artifacts/services/document-artifact.service'
import {
  ChatType,
  SDADocumentType,
  SharedWithInfo,
} from '@/features/artifacts/types/sda-artifacts.types'
import { getApiBaseUrlSafe } from '@/shared/lib/api-helpers'
import { usePermissionStore } from '@/shared/stores/permission-store'

import type { DetectedArtifact } from '../components/artifacts/ArtifactProposal'
import {
  detectArtifactTypeFromContent,
  isStructuredArtifact,
} from '../services/artifact.service'
import { ChatService } from '../services/chat.service'
import { ProjectService, slugify } from '../services/project.service'
// ============================================================================
// Helper Functions
// ============================================================================
import type { ArtifactType, Project } from '../types'

/**
 * Converte chatSlug para agentId
 * Supports both old format ('contextualizacao-discovery') and new UUID suffix format ('contextualizacao-discovery-a1b2c3d4')
 * @example 'contextualizacao-discovery' → 'discovery'
 * @example 'contextualizacao-prd-0d990010' → 'product'
 * @example 'contextualizacao-ux-design-a1b2c3d4' → 'ux'
 */
function chatSlugToAgentId(chatSlug: string | undefined): string {
  console.log('🔧 [chatSlugToAgentId] Input chatSlug:', chatSlug)

  if (!chatSlug) {
    console.log('🔧 [chatSlugToAgentId] chatSlug vazio, retornando discovery')
    return 'discovery'
  }

  // Mapeia chatType → agentId
  const chatTypeToAgentId: Record<string, string> = {
    discovery: 'discovery',
    prd: 'product',
    'ux-design': 'ux',
    architecture: 'tech',
    backlog: 'backlog',
  }

  // Remove prefixo 'contextualizacao-' and try matching known chat types
  // Need to handle UUID suffix: 'contextualizacao-ux-design-a1b2c3d4'
  const withoutPrefix = chatSlug.replace(/^contextualizacao-/, '')

  // Try matching from longest to shortest known type to handle compound names like 'ux-design'
  const knownTypes = Object.keys(chatTypeToAgentId).sort((a, b) => b.length - a.length)
  const matchedType = knownTypes.find(type => withoutPrefix === type || withoutPrefix.startsWith(type + '-'))

  const agentId = matchedType ? chatTypeToAgentId[matchedType]! : 'discovery'
  console.log(
    '🔧 [chatSlugToAgentId] chatType:',
    matchedType || withoutPrefix,
    '→ agentId:',
    agentId
  )

  return agentId
}

// ============================================================================
// Types
// ============================================================================
interface UseCockpitServicesResult {
  /** Se os serviços estão prontos para uso */
  isReady: boolean
  /** Mensagem de erro se houver problema */
  error: string | null
  /** Configuração atual */
  config: SDAServiceConfig | null
  // Services
  /** Serviço de projetos */
  projectService: ProjectService | null
  /** Serviço de chats */
  chatService: ChatService | null
  // Actions
  /** Salva projeto no Cockpit */
  saveProject: (
    project: Project
  ) => Promise<{ success: boolean; slug?: string; projectId?: string }>
  /** Cria um novo chat no projeto */
  createChat: (
    projectId: string,
    projectSlug: string,
    chatName: string,
    description?: string,
    type?: ChatType,
    preGeneratedSlug?: string
  ) => Promise<{
    success: boolean
    chatId?: string
    chatSlug?: string
    error?: string
  }>
  /** Salva artefato detectado no Cockpit */
  saveArtifact: (
    project: Project,
    chatSlug: string,
    artifact: DetectedArtifact,
    userId?: string,
    userName?: string
  ) => Promise<{ success: boolean; error?: string }>
  /** Aprova artefato no Cockpit */
  approveArtifact: (
    projectSlug: string,
    chatSlug: string,
    documentType: DocumentType,
    userId: string,
    userName: string
  ) => Promise<{ success: boolean; error?: string }>
  /** Rejeita artefato no Cockpit (persiste na lista de rejeitados) */
  rejectArtifact: (
    projectSlug: string,
    chatSlug: string,
    documentType: DocumentType,
    artifactData: {
      artifactId: string
      artifactName: string
      content: string
      userId?: string
      userName?: string
    },
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>
  /** Salva mensagem no histórico */
  saveMessage: (
    projectSlug: string,
    chatSlug: string,
    message: {
      content: string
      role: 'user' | 'assistant'
      agentName?: string
      attachments?: Array<{
        id: string
        name: string
        artifactKey?: string
      }>
    }
  ) => Promise<{ success: boolean }>
  /** Obtém histórico de mensagens do chat */
  getHistory: (
    projectSlug: string,
    chatSlug: string
  ) => Promise<{ success: boolean; messages?: unknown[] }>
  /** Obtém artefatos aceitos e rejeitados de um chat */
  getChatAcceptedArtifacts: (
    projectSlug: string,
    chatSlug: string
  ) => Promise<{
    success: boolean
    acceptedArtifacts?: Array<{
      artifactId: string
      artifactKey: string
      artifactName: string
      artifactType: string
      documentType: string
      version: string
      acceptedAt: string
      acceptedBy: string
      acceptedByName: string
    }>
    rejectedArtifacts?: Array<{
      artifactId: string
      artifactKey: string
      artifactName: string
      artifactType: string
      documentType: string
      content: string
      rejectedAt: string
      rejectedBy: string
      rejectedByName: string
      rejectionReason?: string
    }>
  }>
  /** Carrega todos os projetos do Cockpit progressivamente (somente metadados, sem chats/artifacts) */
  loadProjects: (onPageLoaded?: (projects: Project[]) => void) => Promise<{
    success: boolean
    projects?: Project[]
    error?: string
  }>
  /** Carrega detalhes completos de um projeto (chats + artifacts) */
  loadProjectDetails: (projectSlug: string) => Promise<{
    success: boolean
    project?: Project
    error?: string
  }>
  /** Deleta projeto (soft delete - altera status para INACTIVE) */
  deleteProject: (projectSlug: string) => Promise<{
    success: boolean
    error?: string
  }>
  /** Carrega chats de um projeto do Cockpit, opcionalmente filtrado por tipo */
  loadProjectChats: (
    projectSlug: string,
    filterType?: ChatType,
    onChatLoaded?: (chat: {
      id: string
      slug: string
      name: string
      type: string
      createdAt: string
      createdBy?: string
      createdByName?: string
    }) => void
  ) => Promise<{
    success: boolean
    chats?: Array<{
      id: string
      slug: string
      name: string
      type: string
      createdAt: string
      createdBy?: string
      createdByName?: string
    }>
    error?: string
  }>
  /** Carrega histórico de mensagens de um chat */
  loadChatHistory: (
    projectSlug: string,
    chatSlug: string
  ) => Promise<{
    success: boolean
    messages?: Array<{
      id: string
      content: string
      role: 'user' | 'assistant'
      timestamp: string
      agentName?: string
      attachments?: Array<{
        id: string
        name: string
        artifactKey: string
      }>
    }>
    error?: string
  }>
  /** Atualiza status de artefato no histórico de mensagens */
  updateMessageArtifactStatus: (
    projectSlug: string,
    chatSlug: string,
    messageId: string,
    artifactType: string,
    status: 'pending' | 'approved' | 'rejected',
    approverInfo?: { userId: string; userName: string },
    artifactSummary?: string[]
  ) => Promise<{ success: boolean; error?: string }>
  /** Carrega o conteúdo de um artefato do Cockpit */
  loadArtifactContent: (
    projectSlug: string,
    chatSlug: string,
    documentType: string
  ) => Promise<{
    success: boolean
    content?: string
    name?: string // ✅ Nome customizado ou padrão
    documentName?: string
    customName?: string
    version?: string
    createdAt?: string
    updatedAt?: string
    createdBy?: string
    createdByName?: string
    sharedWith?: SharedWithInfo[]
    error?: string
  }>
  /** Faz upload de arquivo(s) como artefato(s) */
  uploadFileAsArtifact: (
    project: Project,
    chatSlug: string,
    file: File,
    userId?: string,
    userName?: string
  ) => Promise<{
    success: boolean
    artifactKey?: string
    error?: string
  }>
  /** Carrega todos os documentos de um projeto (artefatos com prefixo document-) */
  loadProjectDocuments: (projectSlug: string) => Promise<{
    success: boolean
    documents?: Array<{
      id: string
      key: string
      name: string
      type: string
      description?: string
    }>
    error?: string
  }>
  /** Carrega o conteúdo de um documento específico */
  loadDocumentContent: (documentKey: string) => Promise<{
    success: boolean
    content?: string
    name?: string
    type?: string
    error?: string
  }>
  /** Compartilha um artefato com membros do time */
  shareArtifact: (
    projectSlug: string,
    chatSlug: string,
    artifactKey: string,
    userIds: string[],
    teamMembers: Array<{ id: string; name: string; email: string }>
  ) => Promise<{
    success: boolean
    error?: string
  }>
  /** Atualiza a equipe de um projeto (persistido no Cockpit) */
  updateTeam: (
    projectSlug: string,
    team: Array<{
      id: string
      name: string
      email: string
      role: 'Admin' | 'Owner' | 'Curador' | 'User'
    }>
  ) => Promise<{
    success: boolean
    error?: string
  }>
  /** Renomeia um artefato (persiste customName no projeto, chat e documento no Cockpit) */
  renameArtifact: (
    projectSlug: string,
    chatSlug: string,
    documentType: string,
    newName: string
  ) => Promise<{
    success: boolean
    error?: string
  }>
  /** Atualiza status de finalização de um artefato (persiste finalized no projeto e chat) */
  updateArtifactFinalized: (
    projectSlug: string,
    chatSlug: string,
    documentType: string,
    finalized: boolean
  ) => Promise<{
    success: boolean
    error?: string
  }>
  /** Renomeia um chat (persiste no artefato de chat e na referência do projeto) */
  renameChat: (
    projectSlug: string,
    chatSlug: string,
    newName: string
  ) => Promise<{
    success: boolean
    error?: string
  }>
  /** Soft-delete de artefato (marca como inactive no projeto) */
  deleteArtifact: (
    projectSlug: string,
    artifactKey: string
  ) => Promise<{
    success: boolean
    error?: string
  }>
  /** Soft-delete de chat (marca como inactive) */
  deleteChat: (
    projectSlug: string,
    chatSlug: string
  ) => Promise<{
    success: boolean
    error?: string
  }>
  /** Atualiza o status de notificação de um artefato compartilhado */
  updateNotificationStatus: (
    projectSlug: string,
    chatSlug: string,
    artifactKey: string,
    userId: string,
    notificationStatus: 'read' | 'unread' | 'deleted',
    readAt?: string
  ) => Promise<{
    success: boolean
    error?: string
  }>
}
// ============================================================================
// Hook
// ============================================================================
export function useCockpitServices(): UseCockpitServicesResult {
  const { data: session } = useSession()
  const { activeLicenseId, activeNamespaceId } = usePermissionStore()

  // Extrair valores primitivos da session para memoização estável
  const accessToken = (session as { accessToken?: string })?.accessToken
  const userId =
    (session?.user as { id?: string })?.id || session?.user?.email || 'unknown'
  const userName = session?.user?.name || 'Usuário'
  const userEmail = session?.user?.email || ''

  // Construir config e serviços - memoizado por valores primitivos, não pelo objeto session
  const { config, projectService, chatService, error } = useMemo(() => {
    if (!accessToken) {
      return {
        config: null,
        projectService: null,
        chatService: null,
        error: 'Sessão não encontrada',
      }
    }
    if (!activeLicenseId || !activeNamespaceId) {
      return {
        config: null,
        projectService: null,
        chatService: null,
        error: 'Selecione uma licença e namespace',
      }
    }
    const baseUrl = getApiBaseUrlSafe() || ''
    if (!baseUrl) {
      return {
        config: null,
        projectService: null,
        chatService: null,
        error: 'URL da API não configurada',
      }
    }
    const cfg: SDAServiceConfig = {
      baseUrl,
      accessToken,
      licenseId: activeLicenseId,
      namespaceId: activeNamespaceId,
      userId,
      userName,
      userEmail,
    }
    return {
      config: cfg,
      projectService: new ProjectService(cfg),
      chatService: new ChatService(cfg),
      error: null,
    }
  }, [
    accessToken,
    userId,
    userName,
    userEmail,
    activeLicenseId,
    activeNamespaceId,
  ])
  const isReady = !!config && !!projectService && !!chatService

  // Mutex por chat key para serializar saveMessage e evitar race condition read-then-write
  const saveMessageQueueRef = useRef<
    Map<string, Promise<{ success: boolean }>>
  >(new Map())

  // ============================================================================
  // Actions
  // ============================================================================
  /**
   * Salva projeto no Cockpit
   * Cria um novo projeto se não existir
   */
  const saveProject = useCallback(
    async (project: Project) => {
      if (!projectService || !config) {
        return { success: false }
      }
      try {
        const slug = slugify(project.name)
        // Verificar se já existe
        const existing = await projectService.getBySlug(slug)
        if (existing.success && existing.data) {
          console.log('📁 [SDA2] Projeto já existe no Cockpit:', slug)
          return {
            success: true,
            slug,
            projectId: existing.data.id,
          }
        }
        // Criar novo projeto - incluindo team se fornecido
        console.log(
          '📁 [SDA2] Criando novo projeto:',
          slug,
          'com team:',
          project.team
        )
        const result = await projectService.create({
          name: project.name,
          description: `Projeto SDA2 criado em ${new Date().toLocaleDateString('pt-BR')}`,
          tags: ['sda2', 'projeto'],
          team: project.team,
        })
        if (result.success && result.data) {
          console.log('✅ [SDA2] Projeto criado no Cockpit:', result.data.slug)
          return {
            success: true,
            slug: result.data.slug,
            projectId: result.data.id,
          }
        }
        console.error('❌ [SDA2] Erro ao criar projeto:', result.error)
        return { success: false }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao salvar projeto:', error)
        return { success: false }
      }
    },
    [projectService, config]
  )
  /**
   * Cria um novo chat dentro de um projeto
   * Se o chat já existir (erro "already exists"), tenta buscar o existente
   */
  const createChat = useCallback(
    async (
      projectId: string,
      projectSlug: string,
      chatName: string,
      description?: string,
      type?: ChatType,
      preGeneratedSlug?: string
    ) => {
      if (!chatService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      const chatSlug = preGeneratedSlug || slugify(chatName)
      console.log('💬 [SDA2] Criando chat:', {
        projectSlug,
        chatName,
        chatSlug,
      })
      try {
        // Tentar criar o chat diretamente
        const result = await chatService.create({
          name: chatName,
          slug: preGeneratedSlug,
          description:
            description ||
            `Chat criado em ${new Date().toLocaleString('pt-BR')}`,
          projectId,
          projectSlug,
          type: type || 'discovery',
          tags: ['sda2'],
        })
        if (result.success && result.data) {
          console.log('✅ [SDA2] Chat criado:', result.data.slug)
          return {
            success: true,
            chatId: result.data.id,
            chatSlug: result.data.slug,
          }
        }
        // Se falhou porque já existe, tentar buscar o existente
        if (
          result.error?.includes('already exists') ||
          result.error?.includes('Artifact already exists')
        ) {
          console.log('📂 [SDA2] Chat já existe, buscando existente...')
          try {
            const existingChat = await chatService.getBySlug(
              projectSlug,
              chatSlug
            )
            if (existingChat.success && existingChat.data) {
              console.log('📂 [SDA2] Chat existente encontrado:', chatSlug)
              return {
                success: true,
                chatId: existingChat.data.id,
                chatSlug: existingChat.data.slug,
              }
            }
          } catch {
            // Ignorar erro ao buscar
          }
        }
        console.error('❌ [SDA2] Erro ao criar chat:', result.error)
        return { success: false, error: result.error }
      } catch (error) {
        // Capturar qualquer exceção não tratada
        console.error('❌ [SDA2] Exceção ao criar chat:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService]
  )
  /**
   * Salva artefato detectado no Cockpit (otimizado)
   * Utiliza a nova estrutura com projectSlug e chatSlug
   * Cria: 1) Artefato do documento, 2) Referência no chat
   *
   * Otimizações:
   * - saveProject e getBySlug executam em paralelo
   * - saveDocument e addAcceptedArtifact executam em paralelo
   */
  const saveArtifact = useCallback(
    async (
      project: Project,
      chatSlug: string,
      artifact: DetectedArtifact,
      userId?: string,
      userName?: string
    ) => {
      if (!chatService || !config) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        const startTime = performance.now()
        const projectSlug = slugify(project.name)
        const documentType = mapArtifactTypeToDocumentType(artifact.type)
        console.log('💾 [SDA2] Salvando artefato no Cockpit:', {
          projectSlug,
          chatSlug,
          documentType,
          contentLength: artifact.content.length,
        })
        // OTIMIZAÇÃO 1: Executar saveProject e getBySlug em PARALELO
        const [projectResult, chatResult] = await Promise.all([
          saveProject(project),
          chatService.getBySlug(projectSlug, chatSlug),
        ])
        if (!projectResult.success) {
          return { success: false, error: 'Falha ao garantir projeto' }
        }
        if (!chatResult.success || !chatResult.data) {
          return { success: false, error: 'Chat não encontrado' }
        }
        const chat = chatResult.data
        const now = new Date().toISOString()

        // Primeiro salvar o documento para obter a versão correta
        const documentResult = await chatService.saveDocument({
          projectId: chat.projectId,
          projectSlug,
          chatId: chat.id,
          chatSlug,
          documentType:
            documentType as import('@/features/artifacts/types/sda-artifacts.types').SDADocumentType,
          documentName: getArtifactName(documentType),
          content: artifact.content,
          version: '1.0.0',
          tags: ['sda2', documentType],
        })

        if (!documentResult.success || !documentResult.data) {
          console.error(
            '❌ [SDA2] Erro ao criar artefato do documento:',
            documentResult.error
          )
          return { success: false, error: documentResult.error }
        }

        // Usar a versão retornada pelo saveDocument
        const documentVersion = documentResult.data.version || '1.0.0'

        // Preparar referência do artefato COM A VERSÃO CORRETA e customName
        const artifactRef = {
          artifactId: artifact.id,
          artifactKey: `document-${documentType}-${projectSlug}-${chatSlug}`,
          artifactName: getArtifactName(documentType),
          artifactType: 'document',
          documentType,
          chatSlug,
          version: documentVersion,
          acceptedAt: now,
          acceptedBy: userId || config.userId,
          acceptedByName: userName || config.userName,
          customName: documentResult.data.customName, // ✅ Include customName from saved document
        }

        // Agora atualizar as referências no chat e projeto
        const refResult = await chatService.addAcceptedArtifact(
          projectSlug,
          chatSlug,
          artifactRef
        )

        const elapsed = Math.round(performance.now() - startTime)
        console.log(`⏱️ [SDA2] saveArtifact completado em ${elapsed}ms`)

        if (!refResult.success) {
          console.warn(
            '⚠️ [SDA2] Documento salvo, mas erro na referência:',
            refResult.error
          )
        }

        // Atualizar também a referência no projeto para persistir a versão
        if (refResult.success && refResult.data && projectService) {
          const approvedRef = {
            artifactId: artifactRef.artifactId,
            artifactKey: artifactRef.artifactKey,
            artifactName: artifactRef.artifactName,
            artifactType: artifactRef.artifactType,
            version: documentVersion,
            approvedAt: now,
            approvedBy: userId || config.userId,
            approvedByName: userName || config.userName,
            documentType: String(documentType),
            chatId: chat.id,
            chatSlug: chat.slug,
            ownerId: userId || config.userId,
            customName: documentResult.data.customName, // ✅ Preserve customName from saved document
          }
          await projectService.addApprovedArtifact(projectSlug, approvedRef)
          console.log(
            '✅ [SDA2] Versão atualizada no projeto:',
            documentVersion,
            'customName:',
            documentResult.data.customName
          )
        }

        console.log(
          '✅ [SDA2] Artefato salvo:',
          `document-${documentType}-${projectSlug}-${chatSlug}`
        )
        return { success: true }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao salvar artefato:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService, config, saveProject]
  )
  /**
   * Aprova artefato no Cockpit
   */
  const approveArtifact = useCallback(
    async (
      projectSlug: string,
      chatSlug: string,
      documentType: DocumentType,
      userId: string,
      userName: string
    ) => {
      if (!chatService || !projectService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        // Buscar chat atual
        const chatResult = await chatService.getBySlug(projectSlug, chatSlug)
        if (!chatResult.success || !chatResult.data) {
          return { success: false, error: 'Chat não encontrado' }
        }
        const chat = chatResult.data
        // Encontrar artefato a aprovar
        const artifactIndex = chat.acceptedArtifacts.findIndex(
          a => a.documentType === documentType
        )
        if (artifactIndex === -1) {
          return { success: false, error: 'Artefato não encontrado no chat' }
        }
        // Obter artefato aceito (garantido que existe pelo check anterior)
        const acceptedArtifact = chat.acceptedArtifacts[artifactIndex]!
        const now = new Date().toISOString()
        // Criar referência de artefato aprovado para o projeto
        const approvedRef = {
          artifactId: acceptedArtifact.artifactId,
          artifactKey: acceptedArtifact.artifactKey,
          artifactName: acceptedArtifact.artifactName,
          artifactType: acceptedArtifact.artifactType,
          version: acceptedArtifact.version,
          approvedAt: now,
          approvedBy: userId,
          approvedByName: userName,
          documentType: String(acceptedArtifact.documentType),
          chatId: chat.id,
          chatSlug: chat.slug,
          ownerId: userId,
          customName: acceptedArtifact.customName, // ✅ Preserve customName from accepted artifact
        }
        // Propagar para o projeto
        await projectService.addApprovedArtifact(projectSlug, approvedRef)
        console.log('✅ [SDA2] Artefato aprovado no Cockpit')
        return { success: true }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao aprovar artefato:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService, projectService]
  )
  /**
   * Rejeita artefato no Cockpit
   * NÃO remove o artefato, apenas persiste na lista de rejeitados
   */
  const rejectArtifact = useCallback(
    async (
      projectSlug: string,
      chatSlug: string,
      documentType: DocumentType,
      artifactData: {
        artifactId: string
        artifactName: string
        content: string
        userId?: string
        userName?: string
      },
      reason?: string
    ) => {
      if (!chatService || !config) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        const now = new Date().toISOString()
        const artifactKey = `document-${documentType}-${projectSlug}-${chatSlug}`

        // Adicionar à lista de rejeitados (não remove nada)
        const result = await chatService.addRejectedArtifact(
          projectSlug,
          chatSlug,
          {
            artifactId: artifactData.artifactId,
            artifactKey,
            artifactName: artifactData.artifactName,
            artifactType: 'document',
            documentType,
            content: artifactData.content,
            rejectedAt: now,
            rejectedBy: artifactData.userId || config.userId,
            rejectedByName: artifactData.userName || config.userName,
            rejectionReason: reason,
          }
        )

        if (result.success) {
          console.log('✅ [SDA2] Artefato rejeitado persistido no Cockpit', {
            documentType,
            reason,
          })
          return { success: true }
        }
        return { success: false, error: result.error }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao persistir artefato rejeitado:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService, config]
  )
  /**
   * Salva mensagem no histórico do chat
   * Usa mutex por chat key para serializar chamadas concorrentes e evitar race condition
   */
  const saveMessage = useCallback(
    async (
      projectSlug: string,
      chatSlug: string,
      message: {
        content: string
        role: 'user' | 'assistant'
        agentName?: string
        attachments?: Array<{
          id: string
          name: string
          artifactKey?: string
        }>
      }
    ) => {
      if (!chatService || !config) {
        return { success: false }
      }

      // Mutex: serializar chamadas para o mesmo chat
      const queueKey = `${projectSlug}-${chatSlug}`
      const queue = saveMessageQueueRef.current
      const previousOp =
        queue.get(queueKey) || Promise.resolve({ success: true })

      const currentOp = previousOp.then(async () => {
        try {
          // Obter histórico atual (retorna array vazio se não existir)
          const historyResult = await chatService.getHistory(
            projectSlug,
            chatSlug
          )
          const messages = historyResult.success
            ? historyResult.data?.messages || []
            : []
          // Detectar se a mensagem contém artefato estruturado (apenas para mensagens do assistente)
          let messageIsArtifact = false
          let messageArtifactType: string | null = null
          if (
            message.role === 'assistant' &&
            isStructuredArtifact(message.content)
          ) {
            const detectedType = detectArtifactTypeFromContent(message.content)
            if (detectedType) {
              messageIsArtifact = true
              messageArtifactType = detectedType
              console.log('📦 [SDA2] Artefato detectado na mensagem:', {
                type: detectedType,
                contentLength: message.content.length,
              })
            }
          }
          // Adicionar nova mensagem com dados do usuário
          const newMessage = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            sender: {
              type: message.role === 'user' ? 'user' : 'agent',
              id:
                message.role === 'user'
                  ? config.userId
                  : message.agentName || 'agent',
              name:
                message.role === 'user'
                  ? config.userName
                  : message.agentName || 'Agente',
            },
            content: message.content,
            // Campos simplificados de artefato
            isArtifact: messageIsArtifact,
            artifactType: messageArtifactType,
            isAccepted: false, // Inicia como não aceito
            // Incluir attachments se existirem
            attachments: message.attachments || null,
          }
          messages.push(newMessage)
          // Salvar histórico atualizado (cria se não existir)
          const saveResult = await chatService.saveHistory(
            projectSlug,
            chatSlug,
            messages
          )
          if (saveResult.success) {
            console.log('✅ [SDA2] Mensagem salva no histórico')
          }
          return { success: saveResult.success }
        } catch (error) {
          console.error('❌ [SDA2] Erro ao salvar mensagem:', error)
          return { success: false }
        }
      })

      // Registrar na fila (garantir que próxima chamada espera esta terminar)
      queue.set(queueKey, currentOp)

      // Limpar da fila quando terminar para evitar memory leak
      currentOp.finally(() => {
        if (queue.get(queueKey) === currentOp) {
          queue.delete(queueKey)
        }
      })

      return currentOp
    },
    [chatService, config]
  )
  /**
   * Obtém histórico de mensagens do chat
   */
  const getHistory = useCallback(
    async (projectSlug: string, chatSlug: string) => {
      if (!chatService) {
        return { success: false }
      }
      try {
        const result = await chatService.getHistory(projectSlug, chatSlug)
        if (result.success) {
          return {
            success: true,
            messages: result.data?.messages || [],
          }
        }
        return { success: false }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao obter histórico:', error)
        return { success: false }
      }
    },
    [chatService]
  )
  /**
   * Obtém artefatos aceitos e rejeitados de um chat do Cockpit
   */
  const getChatAcceptedArtifacts = useCallback(
    async (projectSlug: string, chatSlug: string) => {
      if (!chatService) {
        return { success: false }
      }
      try {
        console.log('📥 [SDA2] Buscando artefatos do chat:', {
          projectSlug,
          chatSlug,
        })
        const result = await chatService.getBySlug(projectSlug, chatSlug)
        if (result.success && result.data) {
          console.log('✅ [SDA2] Artefatos encontrados:', {
            accepted: result.data.acceptedArtifacts?.length || 0,
            rejected: result.data.rejectedArtifacts?.length || 0,
          })
          return {
            success: true,
            acceptedArtifacts: result.data.acceptedArtifacts || [],
            rejectedArtifacts: result.data.rejectedArtifacts || [],
          }
        }
        return { success: false, acceptedArtifacts: [], rejectedArtifacts: [] }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao obter artefatos do chat:', error)
        return { success: false, acceptedArtifacts: [], rejectedArtifacts: [] }
      }
    },
    [chatService]
  )
  /**
   * Carrega projetos do Cockpit PROGRESSIVAMENTE (inclui artifacts para notificações)
   *
   * Usa padrão de callback: a cada batch de projetos processados pelo service,
   * o callback é chamado com os projetos convertidos. Isso permite que a UI
   * atualize progressivamente conforme os projetos são carregados.
   *
   * @param onPageLoaded Callback chamado a cada batch de projetos carregados
   */
  const loadProjects = useCallback(
    async (onPageLoaded?: (projects: Project[]) => void) => {
      if (!projectService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log(
          '📥 [SDA2] Carregando projetos progressivamente (callback pattern)...'
        )

        // Obter userId do config para filtragem de artifacts
        const currentUserId = config?.userId || ''
        const currentUserEmail = userEmail.toLowerCase()

        const allProjects: Project[] = []

        const result = await projectService.listAll(dtos => {
          console.log(
            `📦 [SDA2] Processando ${dtos.length} projetos do batch...`
          )

          const pageProjects: Project[] = []

          // Converter cada DTO para tipo Project da UI
          for (const dto of dtos) {
            // Converter approvedArtifacts para artifacts da UI (para notificações)
            const filteredArtifacts = (dto.approvedArtifacts || [])
              .filter(approved => approved.status !== 'inactive')
              .filter(approved => {
                // Mostrar apenas se usuário é Owner ou está no sharedWith
                const isOwner =
                  approved.ownerId === currentUserId ||
                  approved.ownerId?.toLowerCase() === currentUserEmail
                const isSharedWith = approved.sharedWith?.some(
                  share =>
                    share.userId === currentUserId ||
                    share.userEmail?.toLowerCase() === currentUserEmail
                )
                return isOwner || isSharedWith
              })
              .map(approved => {
                const artifactTitle =
                  approved.customName ||
                  approved.artifactName ||
                  getArtifactNameFromDocType(
                    approved.documentType || 'document'
                  )

                return {
                  id: approved.artifactId,
                  projectId: dto.id,
                  title: artifactTitle,
                  type: mapDocumentTypeToArtifactType(
                    approved.documentType || 'document'
                  ),
                  content: '',
                  agentId: chatSlugToAgentId(approved.chatSlug),
                  agentName: approved.approvedByName || 'Agente',
                  createdAt: approved.approvedAt,
                  updatedAt: approved.approvedAt,
                  version: (() => {
                    const versionStr = String(approved.version || '1.0.0')
                    try {
                      return parseInt(versionStr.split('.')[0] || '1', 10)
                    } catch {
                      return 1
                    }
                  })(),
                  status: 'approved' as const,
                  chatSlug: approved.chatSlug,
                  documentType: approved.documentType,
                  projectSlug: dto.slug,
                  ownerId: approved.ownerId,
                  createdBy: approved.approvedBy,
                  createdByName: approved.approvedByName,
                  sharedWith: approved.sharedWith,
                  customName: approved.customName,
                  finalized: approved.finalized === true,
                }
              })

            const project: Project = {
              id: dto.id,
              name: dto.name,
              slug: dto.slug,
              createdAt: dto.createdAt,
              updatedAt: dto.updatedAt,
              artifacts: filteredArtifacts,
              conversations: [],
              team: dto.team,
              detailsLoaded: filteredArtifacts.length > 0, // Marca como carregado se tiver artifacts
            }
            allProjects.push(project)
            pageProjects.push(project)
          }

          // Emitir callback com projetos da página
          if (pageProjects.length > 0) {
            console.log(
              `📥 [SDA2] ${pageProjects.length} projetos carregados do batch`
            )
            onPageLoaded?.(pageProjects)
          }
        })

        if (result.success) {
          console.log(
            `✅ [SDA2] Total: ${allProjects.length} projetos carregados`
          )
          return { success: true, projects: allProjects }
        }
        return { success: false, error: result.error }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao carregar projetos:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [projectService, config?.userId, userEmail]
  )

  /**
   * Carrega os detalhes completos de um projeto (chats + artifacts)
   * Chamado quando o usuário abre um projeto específico
   */
  const loadProjectDetails = useCallback(
    async (projectSlug: string) => {
      if (!projectService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('📥 [SDA2] Carregando detalhes do projeto:', projectSlug)

        // Obter userId do config para filtragem
        const currentUserId = config?.userId || ''
        const currentUserEmail = userEmail.toLowerCase()

        const result = await projectService.getBySlug(projectSlug)
        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Projeto não encontrado',
          }
        }

        const dto = result.data

        // ✅ LOG: Verificar approvedArtifacts do backend
        console.log(`📦 [SDA2] Detalhes do projeto "${dto.name}":`, {
          approvedArtifactsCount: dto.approvedArtifacts?.length || 0,
          chatsCount: dto.chats?.length || 0,
        })

        // ====================================================================
        // 🔒 FILTRAR ARTIFACTS: Mostrar apenas se:
        //    1. Usuário é Owner (ownerId === currentUserId OU ownerId === email) OU
        //    2. Usuário está no sharedWith (userId OU userEmail)
        // ====================================================================
        const filteredArtifacts = (dto.approvedArtifacts || [])
          .filter(approved => approved.status !== 'inactive')
          .filter(approved => {
            const isOwner =
              approved.ownerId === currentUserId ||
              approved.ownerId?.toLowerCase() === currentUserEmail
            const isSharedWith = approved.sharedWith?.some(
              share =>
                share.userId === currentUserId ||
                share.userEmail?.toLowerCase() === currentUserEmail
            )
            const hasAccess = isOwner || isSharedWith
            if (!hasAccess) {
              console.log(
                `🚫 [SDA2] Artefato filtrado (sem acesso): ${approved.artifactName}`
              )
            }
            return hasAccess
          })
          .map(approved => {
            // ✅ FALLBACK: Se customName não existe em approvedArtifacts, buscar em chat.acceptedArtifacts
            let effectiveCustomName = approved.customName

            if (!effectiveCustomName) {
              const chat = (dto.chats as any[])?.find(
                (c: any) => c.chatSlug === approved.chatSlug
              )
              if (chat?.acceptedArtifacts) {
                const acceptedArtifact = chat.acceptedArtifacts.find(
                  (a: any) =>
                    a.documentType === approved.documentType &&
                    a.chatSlug === approved.chatSlug
                )
                if (acceptedArtifact?.customName) {
                  effectiveCustomName = acceptedArtifact.customName
                }
              }
            }

            const artifactTitle =
              effectiveCustomName ||
              approved.artifactName ||
              getArtifactNameFromDocType(approved.documentType || 'document')

            const agentId = chatSlugToAgentId(approved.chatSlug)
            console.log('🎯 [loadProjectDetails] Artifact criado:', {
              artifactId: approved.artifactId,
              chatSlug: approved.chatSlug,
              agentId: agentId,
            })

            return {
              id: approved.artifactId,
              projectId: dto.id,
              title: artifactTitle,
              type: mapDocumentTypeToArtifactType(
                approved.documentType || 'document'
              ),
              content: '', // Conteúdo será carregado sob demanda via loadArtifactContent
              agentId: agentId,
              agentName: approved.approvedByName || 'Agente',
              createdAt: approved.approvedAt,
              updatedAt: approved.approvedAt,
              version: (() => {
                const versionStr = String(approved.version || '1.0.0')
                try {
                  return parseInt(versionStr.split('.')[0] || '1', 10)
                } catch {
                  return 1
                }
              })(),
              status: 'approved' as const,
              chatSlug: approved.chatSlug,
              documentType: approved.documentType,
              projectSlug: dto.slug,
              ownerId: approved.ownerId,
              // Usar approvedBy como createdBy inicial (será atualizado com loadArtifactContent)
              createdBy: approved.approvedBy,
              createdByName: approved.approvedByName,
              sharedWith: approved.sharedWith,
              customName: effectiveCustomName || approved.customName,
              finalized: approved.finalized === true,
            }
          })

        // ====================================================================
        // 🔒 CHATS: Não carregamos chats aqui — são carregados lazily
        //    por tipo/aba via loadProjectChats no WorkspacePage
        // ====================================================================

        console.log(
          `📊 [SDA2] Detalhes do projeto "${dto.name}": ${filteredArtifacts.length} artifacts (chats carregados por aba)`
        )

        const project: Project = {
          id: dto.id,
          name: dto.name,
          slug: dto.slug,
          createdAt: dto.createdAt,
          updatedAt: dto.updatedAt,
          artifacts: filteredArtifacts,
          conversations: [], // Carregados lazily via loadProjectChats
          team: dto.team,
          detailsLoaded: true,
        }

        return { success: true, project }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao carregar detalhes do projeto:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [projectService, userEmail, config?.userId]
  )

  /**
   * Deleta projeto (soft delete - altera status para INACTIVE)
   */
  const deleteProject = useCallback(
    async (projectSlug: string) => {
      if (!projectService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('🗑️ [SDA2] Deletando projeto:', projectSlug)
        const result = await projectService.softDelete(projectSlug)

        if (result.success) {
          console.log('✅ [SDA2] Projeto deletado com sucesso:', projectSlug)
          return { success: true }
        }

        return { success: false, error: result.error }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao deletar projeto:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [projectService]
  )

  /**
   * Carrega chats de um projeto do Cockpit de forma progressiva.
   * Se onChatLoaded for fornecido, cada chat é emitido individualmente conforme carregado.
   */
  const loadProjectChats = useCallback(
    async (
      projectSlug: string,
      filterType?: ChatType,
      onChatLoaded?: (chat: {
        id: string
        slug: string
        name: string
        type: string
        createdAt: string
        createdBy?: string
        createdByName?: string
      }) => void
    ) => {
      if (!chatService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log(
          '📥 [SDA2] Carregando chats do projeto (progressivo):',
          projectSlug,
          filterType ? `(type: ${filterType})` : '(todos)'
        )

        // Callback interno que converte ChatDto para o formato do hook
        const chatCallback = onChatLoaded
          ? (chat: {
              id: string
              slug: string
              name: string
              type?: string
              createdAt: string
              createdBy?: string
              createdByName?: string
            }) => {
              onChatLoaded({
                id: chat.id,
                slug: chat.slug,
                name: chat.name,
                type: chat.type || 'discovery',
                createdAt: chat.createdAt,
                createdBy: chat.createdBy,
                createdByName: chat.createdByName,
              })
            }
          : undefined

        const result = await chatService.listByProject(
          projectSlug,
          filterType,
          chatCallback
        )

        if (result.success && result.data) {
          const chats = result.data.map(chat => ({
            id: chat.id,
            slug: chat.slug,
            name: chat.name,
            type: chat.type || 'discovery',
            createdAt: chat.createdAt,
            createdBy: chat.createdBy,
            createdByName: chat.createdByName,
          }))
          console.log(
            '✅ [SDA2] Chats carregados:',
            chats.length,
            filterType ? `(filtro: ${filterType})` : ''
          )
          return { success: true, chats }
        }
        return { success: false, error: result.error }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao carregar chats:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService]
  )
  /**
   * Carrega histórico de mensagens de um chat
   */
  const loadChatHistory = useCallback(
    async (projectSlug: string, chatSlug: string) => {
      if (!chatService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('📥 [SDA2] Carregando histórico:', {
          projectSlug,
          chatSlug,
        })
        const result = await chatService.getHistory(projectSlug, chatSlug)
        if (result.success && result.data) {
          // DEBUG: Log das mensagens brutas do Cockpit
          const rawMessages = (result.data.messages || []) as any[]
          console.log('🔍 [SDA2] Mensagens brutas do Cockpit:', {
            messageCount: rawMessages.length,
            messagesWithIsRejected: rawMessages.filter(
              m => m.isRejected
            )?.length,
            firstMessageWithArtifact: rawMessages.find(
              m => m.isArtifact
            ),
          })

          // Converter mensagens do Cockpit para formato local
          const messages = rawMessages.map(
            (msg: {
              id: string
              content: string
              sender?: { type?: string; name?: string }
              timestamp: string
              attachments?: Array<{
                id: string
                name: string
                artifactKey: string
              }>
              isArtifact?: boolean
              artifactType?: string
              isAccepted?: boolean
              acceptedAt?: string
              acceptedBy?: string
              acceptedByName?: string
              isRejected?: boolean
              rejectedAt?: string
              rejectedBy?: string
              rejectedByName?: string
              artifactSummary?: string[]
            }) => ({
              id: msg.id as string,
              conversationId: `chat-${projectSlug}-${chatSlug}`,
              content: msg.content as string,
              role: (msg.sender?.type === 'user' ? 'user' : 'assistant') as
                | 'user'
                | 'assistant',
              timestamp: msg.timestamp as string,
              agentName: msg.sender?.name as string | undefined,
              // Mapear attachments se existirem
              attachments: msg.attachments ? msg.attachments : undefined,
              // Mapear dados de artefatos - campos simplificados
              isArtifact: msg.isArtifact as boolean | undefined,
              artifactType: msg.artifactType as string | undefined,
              isAccepted: msg.isAccepted as boolean | undefined,
              acceptedAt: msg.acceptedAt as string | undefined,
              acceptedBy: msg.acceptedBy as string | undefined,
              acceptedByName: msg.acceptedByName as string | undefined,
              // Mapear campos de rejeição
              isRejected: msg.isRejected as boolean | undefined,
              rejectedAt: msg.rejectedAt as string | undefined,
              rejectedBy: msg.rejectedBy as string | undefined,
              rejectedByName: msg.rejectedByName as string | undefined,
              // Resumo dinâmico do artefato (persistido na aceitação/rejeição)
              artifactSummary: msg.artifactSummary as string[] | undefined,
            })
          )
          console.log(
            '✅ [SDA2] Mensagens carregadas:',
            messages.length,
            'com artefatos aceitos:',
            messages.filter((m: { isAccepted?: boolean }) => m.isAccepted)
              .length,
            'com artefatos rejeitados:',
            messages.filter((m: { isRejected?: boolean }) => m.isRejected)
              .length
          )
          return { success: true, messages }
        }
        return { success: false, messages: [], error: result.error }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao carregar histórico:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService]
  )
  /**
   * Atualiza status de artefato no histórico de mensagens
   * Persiste a aprovação/rejeição do artefato para que apareça corretamente ao recarregar
   */
  const updateMessageArtifactStatus = useCallback(
    async (
      projectSlug: string,
      chatSlug: string,
      messageId: string,
      artifactType: string,
      status: 'pending' | 'approved' | 'rejected',
      approverInfo?: { userId: string; userName: string },
      artifactSummary?: string[]
    ) => {
      if (!chatService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('📝 [SDA2] Atualizando status do artefato no histórico:', {
          projectSlug,
          chatSlug,
          messageId,
          artifactType,
          status,
          hasSummary: !!(artifactSummary && artifactSummary.length > 0),
        })
        const result = await chatService.updateMessageArtifactStatus(
          projectSlug,
          chatSlug,
          messageId,
          artifactType,
          status,
          approverInfo,
          artifactSummary
        )
        if (result.success) {
          console.log(
            '✅ [SDA2] Status do artefato atualizado no histórico:',
            status
          )
        } else {
          console.error(
            '❌ [SDA2] Erro ao atualizar status no histórico:',
            result.error
          )
        }
        return result
      } catch (error) {
        console.error('❌ [SDA2] Erro ao atualizar status do artefato:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService]
  )
  /**
   * Carrega o conteúdo de um artefato/documento do Cockpit
   * Retorna conteúdo + metadados importantes (sharedWith, version, etc)
   */
  const loadArtifactContent = useCallback(
    async (projectSlug: string, chatSlug: string, documentType: string) => {
      if (!chatService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('📥 [SDA2] Carregando conteúdo do artefato:', {
          projectSlug,
          chatSlug,
          documentType,
        })
        const result = await chatService.getDocument(
          projectSlug,
          chatSlug,
          documentType as SDADocumentType
        )
        if (result.success && result.data) {
          console.log('✅ [SDA2] Conteúdo carregado:', result.data.documentName)
          console.log('📊 [SDA2] Dados completos do Cockpit:', {
            version: result.data.version,
            createdAt: result.data.createdAt,
            updatedAt: result.data.updatedAt,
            createdBy: result.data.createdBy,
            createdByName: result.data.createdByName,
            hasContent: !!result.data.content,
          })

          // ✅ Buscar customName: primeiro do documento, senão das references (project.approvedArtifacts)
          let finalCustomName = result.data.customName
          let finalName = result.data.customName || result.data.documentName

          if (!result.data.customName && projectService) {
            // Documento base não tem customName (foi apenas renomeado, sem edit)
            // Buscar customName das references do projeto
            try {
              const projResult = await projectService.getBySlug(projectSlug)
              if (projResult.success && projResult.data) {
                const project = projResult.data
                const approved = project.approvedArtifacts?.find(
                  (a: any) =>
                    a.documentType === documentType && a.chatSlug === chatSlug
                )
                if (approved?.customName) {
                  finalCustomName = approved.customName
                  finalName = approved.customName
                  console.log(
                    '📝 [SDA2] CustomName lido das references:',
                    approved.customName
                  )
                }
              }
            } catch (err) {
              console.warn(
                '⚠️ [SDA2] Não foi possível buscar customName das references:',
                err
              )
            }
          }

          return {
            success: true,
            content: result.data.content,
            name: finalName, // ✅ Nome customizado (doc ou references) ou padrão
            documentName: result.data.documentName,
            customName: finalCustomName,
            sharedWith: result.data.sharedWith,
            version: result.data.version,
            createdAt: result.data.createdAt,
            updatedAt: result.data.updatedAt,
            createdBy: result.data.createdBy,
            createdByName: result.data.createdByName,
          }
        }
        return { success: false, error: result.error }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao carregar conteúdo:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService]
  )
  /**
   * Faz upload de arquivo como artefato no Cockpit
   * Nome do documento: upload-[nome do arquivo]-[projeto]-[chat]
   */
  const uploadFileAsArtifact = useCallback(
    async (
      project: Project,
      chatSlug: string,
      file: File,
      userId?: string,
      userName?: string
    ) => {
      if (!chatService || !config) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        const projectSlug = slugify(project.name)
        // Extrair nome do arquivo sem extensão
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        const sanitizedFileName = slugify(fileNameWithoutExt)
        // Gerar nome do documento: upload-[nome]-[projeto]-[chat]
        const documentName = `upload-${sanitizedFileName}-${projectSlug}-${chatSlug}`
        console.log('📤 [SDA2] Fazendo upload de arquivo como artefato:', {
          fileName: file.name,
          documentName,
          projectSlug,
          chatSlug,
          fileSize: file.size,
          fileType: file.type,
        })
        // Primeiro garantir que o projeto existe
        const projectResult = await saveProject(project)
        if (!projectResult.success) {
          return { success: false, error: 'Falha ao garantir projeto' }
        }
        // Buscar o chat para obter o chatId e projectId
        const chatResult = await chatService.getBySlug(projectSlug, chatSlug)
        if (!chatResult.success || !chatResult.data) {
          return { success: false, error: 'Chat não encontrado' }
        }
        const chat = chatResult.data
        // Ler conteúdo do arquivo
        let fileContent: string

        // Verificar se é um documento que pode ser convertido para texto
        const isTextFile =
          file.type.startsWith('text/') ||
          file.type === 'application/json' ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.csv')

        // Verificar se é um documento binário que pode ser extraído (PDF, DOCX, XLSX)
        const isExtractableDocument =
          file.type === 'application/pdf' ||
          file.type ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.pdf') ||
          file.name.endsWith('.docx') ||
          file.name.endsWith('.xlsx') ||
          file.name.endsWith('.xls')

        if (isTextFile) {
          // Arquivos de texto - ler como string diretamente
          fileContent = await file.text()
        } else if (isExtractableDocument) {
          // Arquivos binários que podem ser extraídos (PDF, DOCX, XLSX)
          // Usar API do servidor para extrair texto
          console.log('📄 [SDA2] Extraindo texto de documento:', {
            fileName: file.name,
            fileType: file.type,
          })

          try {
            const formData = new FormData()
            formData.append('file', file)

            const extractResponse = await fetch('/api/document/extract-text', {
              method: 'POST',
              body: formData,
            })

            if (!extractResponse.ok) {
              let errorData: { error?: string; details?: string } = {}
              try {
                errorData = await extractResponse.json()
              } catch {
                // Response might not be JSON
                const textResponse = await extractResponse.text()
                errorData = {
                  error: `HTTP ${extractResponse.status}: ${textResponse || extractResponse.statusText}`,
                }
              }
              console.error('❌ [SDA2] Erro ao extrair texto:', {
                status: extractResponse.status,
                statusText: extractResponse.statusText,
                errorData,
              })
              // Fallback: salvar como base64 se a extração falhar
              const arrayBuffer = await file.arrayBuffer()
              const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce(
                  (data, byte) => data + String.fromCharCode(byte),
                  ''
                )
              )
              fileContent = `[DOCUMENTO_NAO_EXTRAIDO]\nFileName: ${file.name}\nMimeType: ${file.type}\nSize: ${file.size}\nErro: ${errorData.error || 'Falha na extração'}\nData: ${base64}`
            } else {
              const extractData = await extractResponse.json()
              fileContent = extractData.extractedText
              console.log('✅ [SDA2] Texto extraído com sucesso:', {
                fileName: file.name,
                textLength: fileContent.length,
              })
            }
          } catch (extractError) {
            console.error(
              '❌ [SDA2] Erro na chamada de extração:',
              extractError
            )
            // Fallback: salvar como base64
            const arrayBuffer = await file.arrayBuffer()
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              )
            )
            fileContent = `[DOCUMENTO_NAO_EXTRAIDO]\nFileName: ${file.name}\nMimeType: ${file.type}\nSize: ${file.size}\nErro: ${extractError instanceof Error ? extractError.message : 'Erro desconhecido'}\nData: ${base64}`
          }
        } else {
          // Outros arquivos binários (imagens, etc.) - converter para base64
          const arrayBuffer = await file.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          )
          fileContent = `[BASE64_FILE]\nFileName: ${file.name}\nMimeType: ${file.type}\nSize: ${file.size}\nData: ${base64}`
        }
        // Criar artefato do documento como tipo 'document' (genérico para uploads)
        // Key: upload-{sanitizedFileName}-{projectSlug}-{chatSlug}
        const artifactKey = `upload-${sanitizedFileName}-${projectSlug}-${chatSlug}`
        const documentResult = await chatService.saveUploadDocument({
          projectId: chat.projectId,
          projectSlug,
          chatId: chat.id,
          chatSlug,
          fileName: sanitizedFileName,
          documentName,
          content: fileContent,
          version: '1.0.0',
          tags: ['sda2', 'upload', file.type.split('/')[0] || 'file'],
          originalFileName: file.name,
          originalFileType: file.type,
          originalFileSize: file.size,
        })
        if (!documentResult.success) {
          console.error(
            '❌ [SDA2] Erro ao criar artefato do upload:',
            documentResult.error
          )
          return { success: false, error: documentResult.error }
        }
        console.log('✅ [SDA2] Arquivo salvo como artefato:', artifactKey)
        // Criar referência do artefato aceito no chat
        const artifactRef = {
          artifactId: `upload-${Date.now()}`,
          artifactKey,
          artifactName: documentName,
          artifactType: 'upload',
          documentType: 'document',
          chatSlug,
          version: '1.0.0',
          acceptedAt: new Date().toISOString(),
          acceptedBy: userId || config.userId,
          acceptedByName: userName || config.userName,
          originalFileName: file.name,
          originalFileType: file.type,
          originalFileSize: file.size,
        }
        // Adicionar referência ao chat
        const result = await chatService.addAcceptedArtifact(
          projectSlug,
          chatSlug,
          artifactRef
        )
        if (result.success) {
          console.log('✅ [SDA2] Referência do upload salva no chat:', {
            documentName,
            key: artifactKey,
          })
          return { success: true, artifactKey }
        }
        return { success: false, error: result.error }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao fazer upload do arquivo:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService, config, saveProject]
  )
  /**
   * Carrega todos os documentos de um projeto
   * Busca artefatos com prefixos document-* e upload-* que pertencem ao projeto
   */
  const loadProjectDocuments = useCallback(
    async (projectSlug: string) => {
      if (!chatService || !config) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('📄 [SDA2] Buscando documentos do projeto:', projectSlug)
        // Buscar artefatos do projeto (documents e uploads)
        const result = await chatService.searchDocuments(projectSlug)
        if (!result.success || !result.data) {
          return { success: false, error: result.error }
        }
        const documents = result.data.map(doc => ({
          id: doc.id,
          key: doc.key,
          name: doc.name,
          type: doc.type,
          description: doc.description,
        }))
        console.log(
          `✅ [SDA2] Encontrados ${documents.length} documentos no projeto`
        )
        return { success: true, documents }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao buscar documentos:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService, config]
  )
  /**
   * Carrega o conteúdo de um documento específico
   */
  const loadDocumentContent = useCallback(
    async (documentKey: string) => {
      if (!chatService || !config) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('📄 [SDA2] Carregando conteúdo do documento:', documentKey)
        const result = await chatService.getDocumentContent(documentKey)
        if (!result.success || !result.data) {
          return { success: false, error: result.error }
        }
        console.log(
          `✅ [SDA2] Conteúdo carregado: ${result.data.name} (${result.data.content.length} chars)`
        )
        return {
          success: true,
          content: result.data.content,
          name: result.data.name,
          type: result.data.type,
        }
      } catch (error) {
        console.error(
          '❌ [SDA2] Erro ao carregar conteúdo do documento:',
          error
        )
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService, config]
  )
  /**
   * Compartilha um artefato com membros do time
   */
  const shareArtifact = useCallback(
    async (
      projectSlug: string,
      chatSlug: string,
      artifactKey: string,
      userIds: string[],
      teamMembers: Array<{ id: string; name: string; email: string }>
    ) => {
      if (!chatService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('🔗 [SDA2] Compartilhando artefato:', {
          artifactKey,
          userCount: userIds.length,
        })

        const result = await chatService.shareArtifact(
          projectSlug,
          chatSlug,
          artifactKey,
          userIds,
          teamMembers
        )

        if (result.success) {
          console.log('✅ [SDA2] Artefato compartilhado com sucesso')
        }

        return result
      } catch (error) {
        console.error('❌ [SDA2] Erro ao compartilhar artefato:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService]
  )

  /**
   * Atualiza a equipe do projeto (persistido no Cockpit)
   */
  const updateTeam = useCallback(
    async (
      projectSlug: string,
      team: Array<{
        id: string
        name: string
        email: string
        role: 'Admin' | 'Owner' | 'Curador' | 'User'
      }>
    ) => {
      if (!projectService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('👥 [SDA2] Atualizando equipe do projeto:', {
          projectSlug,
          memberCount: team.length,
        })

        const result = await projectService.updateTeam(projectSlug, team)

        if (result.success) {
          console.log('✅ [SDA2] Equipe do projeto atualizada com sucesso')
        }

        return result
      } catch (error) {
        console.error('❌ [SDA2] Erro ao atualizar equipe:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [projectService]
  )

  // ========================================================================
  // Atualizar status de finalização de artefato (persistir finalized no Cockpit)
  // Atualiza: acceptedArtifact no chat e approvedArtifact no projeto
  // NÃO atualiza documento base para evitar criar nova versão
  // ========================================================================
  const updateArtifactFinalized = useCallback(
    async (
      projectSlug: string,
      chatSlug: string,
      documentType: string,
      finalized: boolean
    ) => {
      if (!chatService || !projectService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log(
          `🔒 [SDA2] ${finalized ? 'Finalizando' : 'Desfinalizando'} artefato:`,
          { projectSlug, chatSlug, documentType, finalized }
        )

        // ⚠️ NÃO atualizar documento base - backend SEMPRE cria versão no /Update
        // O campo finalized será preservado via references (chat + project)
        // e injetado no documento durante saveDocument (próxima edição)
        console.log(
          '⏭️ [SDA2] Pulando atualização do documento base (backend sempre incrementa versão)'
        )

        // 1. Atualizar finalized no acceptedArtifact do chat
        const chatResult = await chatService.getBySlug(projectSlug, chatSlug)
        if (chatResult.success && chatResult.data) {
          const chat = chatResult.data
          const artifactIndex = chat.acceptedArtifacts.findIndex(
            a => a.documentType === documentType
          )
          if (artifactIndex >= 0) {
            chat.acceptedArtifacts[artifactIndex]!.finalized = finalized
            chat.updatedAt = new Date().toISOString()
            await chatService['update'](projectSlug, chatSlug, chat)
            console.log(
              `✅ [SDA2] Chat acceptedArtifact ${finalized ? 'finalizado' : 'desfinalizado'}`
            )
          } else {
            console.warn('⚠️ [SDA2] AcceptedArtifact não encontrado no chat:', {
              documentType,
              acceptedCount: chat.acceptedArtifacts.length,
            })
          }
        }

        // 2. Atualizar finalized no approvedArtifact do projeto
        const projResult = await projectService.getBySlug(projectSlug)
        if (projResult.success && projResult.data) {
          const project = projResult.data

          if (
            !project.approvedArtifacts ||
            project.approvedArtifacts.length === 0
          ) {
            console.warn(
              '⚠️ [SDA2] Projeto não tem approvedArtifacts! Impossível atualizar finalized.',
              { projectSlug, documentType }
            )
            return { success: false, error: 'Projeto sem approved artifacts' }
          }

          // Buscar por documentType + chatSlug, ou apenas documentType se chatSlug não estiver definido
          let approvedIndex = project.approvedArtifacts.findIndex(
            a => a.documentType === documentType && a.chatSlug === chatSlug
          )
          // Fallback: buscar apenas por documentType se não encontrou com chatSlug
          if (approvedIndex < 0) {
            approvedIndex = project.approvedArtifacts.findIndex(
              a => a.documentType === documentType
            )
          }
          if (approvedIndex >= 0) {
            project.approvedArtifacts[approvedIndex]!.finalized = finalized
            project.updatedAt = new Date().toISOString()
            await projectService.update(projectSlug, project)
            console.log(
              `✅ [SDA2] Projeto approvedArtifact ${finalized ? 'finalizado' : 'desfinalizado'}`
            )
          } else {
            console.warn(
              '⚠️ [SDA2] ApprovedArtifact não encontrado no projeto:',
              { documentType, chatSlug }
            )
          }
        } else {
          console.warn(
            '⚠️ [SDA2] Projeto não encontrado para atualizar finalized:',
            {
              projectSlug,
            }
          )
        }

        return { success: true }
      } catch (error) {
        console.error(
          `❌ [SDA2] Erro ao ${finalized ? 'finalizar' : 'desfinalizar'} artefato:`,
          error
        )
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService, projectService]
  )

  // ========================================================================
  // Renomear artefato (persistir customName no Cockpit)
  // Atualiza: documento, acceptedArtifact no chat e approvedArtifact no projeto
  // ========================================================================
  const renameArtifact = useCallback(
    async (
      projectSlug: string,
      chatSlug: string,
      documentType: string,
      newName: string
    ) => {
      if (!chatService || !projectService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('✏️ [SDA2] Renomeando artefato:', {
          projectSlug,
          chatSlug,
          documentType,
          newName,
        })

        // ⚠️ NÃO atualizar documento base - backend SEMPRE cria versão no /Update
        // O customName será preservado via references (chat + project)
        // e injetado no documento durante saveDocument (próxima edição)
        console.log(
          '⏭️ [SDA2] Pulando atualização do documento base (backend sempre incrementa versão)'
        )

        // 1. Atualizar customName e artifactName no acceptedArtifact do chat
        const chatResult = await chatService.getBySlug(projectSlug, chatSlug)
        if (chatResult.success && chatResult.data) {
          const chat = chatResult.data
          const artifactIndex = chat.acceptedArtifacts.findIndex(
            a => a.documentType === documentType
          )
          if (artifactIndex >= 0) {
            chat.acceptedArtifacts[artifactIndex]!.customName = newName
            chat.acceptedArtifacts[artifactIndex]!.artifactName = newName
            chat.updatedAt = new Date().toISOString()
            await chatService['update'](projectSlug, chatSlug, chat)
            console.log(
              '✅ [SDA2] Chat acceptedArtifact atualizado com customName:',
              newName
            )
          } else {
            console.warn('⚠️ [SDA2] AcceptedArtifact não encontrado no chat:', {
              documentType,
              acceptedCount: chat.acceptedArtifacts.length,
            })
          }
        }

        // 2. Atualizar customName e artifactName no approvedArtifact do projeto
        const projResult = await projectService.getBySlug(projectSlug)
        if (projResult.success && projResult.data) {
          const project = projResult.data

          console.log('🔍 [SDA2] Buscando approvedArtifact para rename:', {
            documentType,
            chatSlug,
            approvedArtifactsCount: project.approvedArtifacts?.length || 0,
            approvedArtifacts: project.approvedArtifacts.map(a => ({
              documentType: a.documentType,
              chatSlug: a.chatSlug,
              artifactName: a.artifactName,
              customName: a.customName,
            })),
          })

          // ⚠️ VERIFICAÇÃO: Se não há approved artifacts, não podemos renomear
          if (
            !project.approvedArtifacts ||
            project.approvedArtifacts.length === 0
          ) {
            console.warn(
              '⚠️ [SDA2] Projeto não tem approvedArtifacts! Impossível renomear.',
              { projectSlug, documentType }
            )
            return { success: false, error: 'Projeto sem approved artifacts' }
          }

          // Buscar por documentType + chatSlug, ou apenas documentType se chatSlug não estiver definido
          let approvedIndex = project.approvedArtifacts.findIndex(
            a => a.documentType === documentType && a.chatSlug === chatSlug
          )
          // Fallback: buscar apenas por documentType se não encontrou com chatSlug
          if (approvedIndex < 0) {
            approvedIndex = project.approvedArtifacts.findIndex(
              a => a.documentType === documentType
            )
          }
          if (approvedIndex >= 0) {
            project.approvedArtifacts[approvedIndex]!.customName = newName
            project.approvedArtifacts[approvedIndex]!.artifactName = newName
            project.updatedAt = new Date().toISOString()
            await projectService.update(projectSlug, project)
            console.log(
              '✅ [SDA2] Projeto approvedArtifact atualizado com customName:',
              newName
            )
          } else {
            console.warn(
              '⚠️ [SDA2] ApprovedArtifact não encontrado no projeto:',
              { documentType, chatSlug }
            )
          }
        } else {
          console.warn('⚠️ [SDA2] Projeto não encontrado para rename:', {
            projectSlug,
          })
        }

        return { success: true }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao renomear artefato:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService, projectService]
  )

  // ========================================================================
  // Renomear chat (persistir novo nome no Cockpit)
  // Atualiza: ChatDto.name no artefato de chat e ChatRef.chatName no projeto
  // ========================================================================
  const renameChat = useCallback(
    async (projectSlug: string, chatSlug: string, newName: string) => {
      if (!chatService || !projectService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('✏️ [SDA2] Renomeando chat:', {
          projectSlug,
          chatSlug,
          newName,
        })

        // 1. Atualizar nome no ChatDto
        const chatResult = await chatService.getBySlug(projectSlug, chatSlug)
        if (chatResult.success && chatResult.data) {
          const chat = chatResult.data
          chat.name = newName
          chat.updatedAt = new Date().toISOString()
          await chatService['update'](projectSlug, chatSlug, chat)
          console.log('✅ [SDA2] Chat renomeado no Cockpit:', newName)
        }

        // 2. Atualizar chatName na referência do projeto
        const projResult = await projectService.getBySlug(projectSlug)
        if (projResult.success && projResult.data) {
          const project = projResult.data
          const chatIndex = project.chats.findIndex(
            c => c.chatSlug === chatSlug
          )
          if (chatIndex >= 0) {
            project.chats[chatIndex]!.chatName = newName
            project.updatedAt = new Date().toISOString()
            await projectService.update(projectSlug, project)
            console.log('✅ [SDA2] ChatRef no projeto atualizado:', newName)
          }
        }

        return { success: true }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao renomear chat:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService, projectService]
  )

  // ========================================================================
  // Soft-delete de artefato (marca status = inactive no projeto)
  // ========================================================================
  const deleteArtifact = useCallback(
    async (projectSlug: string, artifactKey: string) => {
      if (!projectService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('🗑️ [SDA2] Soft-delete artefato:', {
          projectSlug,
          artifactKey,
        })
        const result = await projectService.deactivateApprovedArtifact(
          projectSlug,
          artifactKey
        )
        if (result.success) {
          console.log('✅ [SDA2] Artefato desativado com sucesso:', artifactKey)
          return { success: true }
        }
        return { success: false, error: result.error }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao desativar artefato:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [projectService]
  )

  // ========================================================================
  // Soft-delete de chat (marca status = inactive)
  // ========================================================================
  const deleteChat = useCallback(
    async (projectSlug: string, chatSlug: string) => {
      if (!chatService || !projectService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('🗑️ [SDA2] Soft-delete chat:', { projectSlug, chatSlug })

        // 1. Marcar chat artifact como INACTIVE
        const result = await chatService.softDelete(projectSlug, chatSlug)
        if (!result.success) {
          return { success: false, error: result.error }
        }
        console.log('✅ [SDA2] Chat artifact desativado:', chatSlug)

        // 2. Marcar ChatRef como inactive no projeto (para que loadProjects filtre)
        const projResult = await projectService.getBySlug(projectSlug)
        if (projResult.success && projResult.data) {
          const project = projResult.data
          const chatIndex = project.chats.findIndex(
            c => c.chatSlug === chatSlug
          )
          if (chatIndex >= 0) {
            project.chats[chatIndex]!.status = 'inactive'
            project.updatedAt = new Date().toISOString()
            await projectService.update(projectSlug, project)
            console.log(
              '✅ [SDA2] ChatRef no projeto marcado como inactive:',
              chatSlug
            )
          }
        }

        return { success: true }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao desativar chat:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService, projectService]
  )

  // ========================================================================
  // Atualizar status de notificação de artefato compartilhado
  // ========================================================================
  const updateNotificationStatus = useCallback(
    async (
      projectSlug: string,
      chatSlug: string,
      artifactKey: string,
      userId: string,
      notificationStatus: 'read' | 'unread' | 'deleted',
      readAt?: string
    ) => {
      if (!chatService) {
        return { success: false, error: 'Serviço não disponível' }
      }
      try {
        console.log('🔔 [SDA2] Atualizando status de notificação:', {
          artifactKey,
          userId,
          notificationStatus,
        })

        const result = await chatService.updateNotificationStatus(
          projectSlug,
          chatSlug,
          artifactKey,
          userId,
          notificationStatus,
          readAt
        )

        if (result.success) {
          console.log('✅ [SDA2] Status de notificação atualizado')
        }

        return result
      } catch (error) {
        console.error(
          '❌ [SDA2] Erro ao atualizar status de notificação:',
          error
        )
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }
    },
    [chatService]
  )

  return {
    isReady,
    error,
    config,
    projectService,
    chatService,
    saveProject,
    createChat,
    saveArtifact,
    approveArtifact,
    rejectArtifact,
    saveMessage,
    getHistory,
    getChatAcceptedArtifacts,
    loadProjects,
    loadProjectDetails,
    deleteProject,
    loadProjectChats,
    loadChatHistory,
    updateMessageArtifactStatus,
    loadArtifactContent,
    uploadFileAsArtifact,
    loadProjectDocuments,
    loadDocumentContent,
    shareArtifact,
    updateTeam,
    renameArtifact,
    updateArtifactFinalized,
    renameChat,
    deleteArtifact,
    deleteChat,
    updateNotificationStatus,
  }
}
/**
 * Mapeia tipo de artefato detectado para DocumentType do Cockpit
 */
function mapArtifactTypeToDocumentType(detectedType: string): DocumentType {
  const typeMap: Record<string, DocumentType> = {
    briefing: 'briefing',
    brief: 'briefing',
    discovery: 'briefing',
    prd: 'prd',
    'prd-greenfield': 'prd',
    'prd-brownfield': 'prd',
    requirements: 'requirements',
    backlog: 'backlog',
    'user-story': 'backlog',
    epic: 'backlog',
    epics: 'backlog',
    architecture: 'architecture',
    design: 'design',
    'frontend-spec': 'design',
    'stakeholder-map': 'briefing',
    personas: 'briefing',
    document: 'document',
  }
  return typeMap[detectedType.toLowerCase()] || 'document'
}
/**
 * Mapeia DocumentType do Cockpit para ArtifactType local
 */
function mapDocumentTypeToArtifactType(documentType: string): ArtifactType {
  const typeMap: Record<string, ArtifactType> = {
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
    document: 'fragments',
  }
  return typeMap[documentType.toLowerCase()] || 'fragments'
}
/**
 * Retorna nome amigável do artefato baseado no tipo
 */
function getArtifactName(documentType: DocumentType): string {
  const names: Record<DocumentType, string> = {
    briefing: 'Documento de Discovery',
    prd: 'PRD (Product Requirements Document)',
    requirements: 'Requisitos',
    backlog: 'Product Backlog',
    architecture: 'Documento de Arquitetura',
    design: 'Especificação de Design',
    document: 'Documento',
  }
  return names[documentType] || 'Documento'
}
/**
 * Retorna nome amigável do artefato baseado no documentType (string)
 * Versão flexível que aceita qualquer string
 */
function getArtifactNameFromDocType(documentType: string): string {
  const names: Record<string, string> = {
    briefing: 'Documento de Discovery',
    brief: 'Documento de Discovery',
    discovery: 'Documento de Discovery',
    prd: 'PRD (Product Requirements Document)',
    requirements: 'Requisitos',
    backlog: 'Product Backlog',
    'user-story': 'Product Backlog',
    epic: 'Product Backlog',
    architecture: 'Documento de Arquitetura',
    design: 'Especificação de Design',
    'frontend-spec': 'Especificação de Design',
    document: 'Documento',
  }
  return names[documentType.toLowerCase()] || 'Documento'
}
