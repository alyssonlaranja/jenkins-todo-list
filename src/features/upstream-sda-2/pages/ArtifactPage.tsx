'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ArtifactService, slugify } from '@/features/artifacts/services'
import {
  getVersionDisplayLabel,
  type VersionLabelsMap,
} from '@/features/artifacts/types/version-labels.types'
import { useUserApiKey } from '@/shared/hooks/use-user-api-key'

import {
  ArtifactViewer,
  type ExportFormat,
} from '../components/artifacts/ArtifactViewer'
import { Header } from '../components/layout/Header'
import { ProjectSidebar, Sidebar } from '../components/layout/Sidebar'
import { NewProjectModal } from '../components/projects/NewProjectModal'
import type { TeamMember } from '../components/projects/TeamMemberSelect'
import { useCockpitServices } from '../hooks/useCockpitServices'
import { useNamespaceUsers } from '../hooks/useNamespaceUsers'
import { useSupervisorChat } from '../hooks/useSupervisorChat'
import { removeArtifactMetadata } from '../services/artifact.service'
import {
  useEditSessionStore,
  type EditSessionContext,
} from '../stores/editSessionStore'
import { useProjectStore } from '../stores/projectStore'
import type {
  Artifact,
  Conversation,
  Project,
  ProjectTeamMember,
  User,
} from '../types'

// ============================================================================
// Helper Functions para Edição com IA
// ============================================================================

/**
 * Constrói o prompt contextualizado para solicitação de edição
 * Agora inclui o contexto da sessão de edição para que a IA entenda
 * o histórico de propostas e interações do usuário
 */
function buildEditPrompt(
  userRequest: string,
  artifactTitle: string,
  artifactType: string,
  artifactContent: string,
  sessionContext?: EditSessionContext | null
): string {
  const contextParts: string[] = []

  // Cabeçalho identificando contexto de edição
  contextParts.push('📝 **MODO DE EDIÇÃO DE ARTEFATO**')
  contextParts.push('')

  // Informações do artefato
  contextParts.push(`**Artefato sendo editado:** ${artifactTitle}`)
  contextParts.push(`**Tipo:** ${artifactType}`)
  contextParts.push('')

  // Se há sessão com histórico, incluir contexto
  if (sessionContext && sessionContext.proposals.length > 0) {
    contextParts.push('**📋 Histórico desta sessão de edição:**')
    contextParts.push('')

    sessionContext.proposals.forEach((proposal, index) => {
      const statusEmoji =
        proposal.status === 'accepted'
          ? '✅'
          : proposal.status === 'rejected'
            ? '❌'
            : '⏳'
      const statusText =
        proposal.status === 'accepted'
          ? 'ACEITA'
          : proposal.status === 'rejected'
            ? 'REJEITADA pelo usuário'
            : 'PENDENTE'

      contextParts.push(
        `${index + 1}. ${statusEmoji} **"${proposal.userRequest}"** - ${statusText}`
      )

      // Para propostas rejeitadas, dar mais destaque
      if (proposal.status === 'rejected') {
        contextParts.push(
          `   ⚠️ O usuário NÃO gostou desta proposta. Evite repetir este tipo de alteração.`
        )
      }
    })

    contextParts.push('')
    contextParts.push(
      '**⚠️ IMPORTANTE:** Considere o histórico acima ao fazer suas edições.'
    )
    contextParts.push(
      '- Se o usuário mencionar algo de uma proposta anterior (ex: "ponto 7"), refira-se ao conteúdo da última proposta pendente ou aceita.'
    )
    contextParts.push('- Evite repetir alterações que foram rejeitadas.')
    contextParts.push('')
  }

  // Usar o conteúdo da última proposta não-rejeitada como base para edição
  // Isso permite que propostas pendentes sejam tratadas como "aceitação parcial"
  // O diff na UI será sempre calculado contra o conteúdo SALVO (artifact.content)
  let contentToEdit = artifactContent

  if (sessionContext && sessionContext.proposals.length > 0) {
    // Percorre as propostas de trás para frente
    // Procura a última proposta que NÃO foi rejeitada (aceita ou pendente)
    for (let i = sessionContext.proposals.length - 1; i >= 0; i--) {
      const proposal = sessionContext.proposals[i]!
      if (proposal.status !== 'rejected') {
        contentToEdit = proposal.proposedContent
        break
      }
    }
  }

  // Conteúdo atual do artefato
  contextParts.push('**Conteúdo atual do artefato (base para edição):**')
  contextParts.push('````markdown')
  contextParts.push(contentToEdit)
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

  // Solicitação do usuário
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

  // Se não encontrou bloco de código, verificar se a resposta começa com cabeçalho markdown
  const lines = response.trim().split('\n')
  if (lines[0]?.startsWith('#') || lines[0]?.startsWith('**')) {
    // Remover metadata do conteúdo
    return removeArtifactMetadata(response.trim())
  }

  // Remover texto introdutório comum
  const introPatterns = [
    /^(?:Aqui está|Segue|Pronto|Aí está)[^:]*:\s*/i,
    /^(?:O artefato|O documento|O conteúdo)[^:]*:\s*/i,
    /^(?:Versão atualizada|Conteúdo atualizado)[^:]*:\s*/i,
  ]

  let cleanedResponse = response.trim()
  for (const pattern of introPatterns) {
    cleanedResponse = cleanedResponse.replace(pattern, '')
  }

  // Remover metadata do resultado final
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
  let outerFenceLen = 0
  let depth = 0

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim()
    const backtickMatch = trimmed.match(/^(`{3,})/)

    if (openingFenceIdx === -1) {
      if (backtickMatch) {
        const ticks = backtickMatch[1]!.length
        const afterTicks = trimmed.slice(ticks).trim()
        if (afterTicks === '' || afterTicks === 'markdown') {
          openingFenceIdx = i
          outerFenceLen = ticks
          depth = 1
        }
      }
    } else {
      if (backtickMatch) {
        const ticks = backtickMatch[1]!.length
        const afterTicks = trimmed.slice(ticks).trim()

        if (ticks >= outerFenceLen && afterTicks === '') {
          depth--
          if (depth === 0) {
            closingFenceIdx = i
            break
          }
        } else if (afterTicks !== '') {
          depth++
        } else {
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

// ============================================================================
// Component
// ============================================================================

interface ArtifactPageProps {
  user: User
  project: Project
  artifact: Artifact
  onLogout: () => void
  onHome: () => void
  onBack: () => void
  onSelectConversation: (conversation: Conversation) => void
}

export function ArtifactPage({
  user,
  project: _project,
  artifact: initialArtifact,
  onLogout,
  onHome,
  onBack,
  onSelectConversation,
}: ArtifactPageProps) {
  const {
    projects,
    currentProject,
    setCurrentProject,
    addProject,
    updateProject,
    currentArtifact,
    setCurrentArtifact,
    setCurrentConversation,
    setViewMode,
  } = useProjectStore()

  // Edit session store para contexto de edição com IA
  const editSession = useEditSessionStore(state => state.session)
  const addProposal = useEditSessionStore(state => state.addProposal)
  const updateWorkingContent = useEditSessionStore(
    state => state.updateWorkingContent
  )

  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isLoadingVersion, setIsLoadingVersion] = useState(false)
  const [viewingVersionNumber, setViewingVersionNumber] = useState<
    number | undefined
  >(undefined)
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null)
  const [versionLabels, setVersionLabels] = useState<VersionLabelsMap | null>(
    null
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_cockpitArtifactId, setCockpitArtifactId] = useState<string | null>(
    null
  )

  // Obter Personal Access Token do usuário logado
  const { apiKey } = useUserApiKey()
  const userCockpitKey = apiKey?.key || ''

  // Hook para comunicação com o supervisor (para edição com IA)
  const {
    isLoading: isAIProcessing,
    streamingContent,
    sendMessage: sendToSupervisor,
  } = useSupervisorChat(currentProject, { userCockpitKey })

  // Hook para persistência no Cockpit
  const {
    isReady: isCockpitReady,
    config,
    loadProjectDetails,
    loadArtifactContent,
    saveProject,
    saveArtifact,
    shareArtifact,
  } = useCockpitServices()

  // Hook para buscar usuários do namespace atual
  const { users: namespaceUsers } = useNamespaceUsers()

  // Carregar detalhes do projeto atual do Cockpit quando a página montar
  useEffect(() => {
    if (isCockpitReady && currentProject) {
      const projectSlug = currentProject.slug || slugify(currentProject.name)
      loadProjectDetails(projectSlug).then(result => {
        if (result.success && result.project) {
          const { updateProject, setCurrentProject } =
            useProjectStore.getState()
          updateProject(currentProject.id, result.project)
          setCurrentProject({ ...currentProject, ...result.project })
        }
      })
    }
  }, [isCockpitReady, loadProjectDetails, currentProject?.id])

  // Carregar conteúdo do artefato se necessário
  useEffect(() => {
    const loadContent = async () => {
      const artifact = currentArtifact || initialArtifact
      if (
        !artifact.content &&
        artifact.projectSlug &&
        artifact.chatSlug &&
        artifact.documentType &&
        isCockpitReady
      ) {
        setIsLoadingContent(true)
        try {
          const result = await loadArtifactContent(
            artifact.projectSlug,
            artifact.chatSlug,
            artifact.documentType
          )

          if (result.success && result.content) {
            const updatedArtifact = {
              ...artifact,
              content: result.content,
              sharedWith: result.sharedWith || artifact.sharedWith,
              version:
                result.version && typeof result.version === 'string'
                  ? parseInt(result.version.split('.')[0] || '1', 10)
                  : artifact.version,
              updatedAt: result.updatedAt || artifact.updatedAt,
            }
            setCurrentArtifact(updatedArtifact)
            setViewingVersionNumber(undefined) // Reset ao carregar conteúdo atual

            if (currentProject) {
              const updatedArtifacts = currentProject.artifacts.map(a =>
                a.id === artifact.id ? updatedArtifact : a
              )
              updateProject(currentProject.id, { artifacts: updatedArtifacts })
            }
          }
        } catch (error) {
          console.error('❌ [SDA2] Erro ao carregar conteúdo:', error)
          toast.error('Erro ao carregar conteúdo do artefato')
        } finally {
          setIsLoadingContent(false)
        }
      }
    }

    loadContent()
  }, [
    initialArtifact,
    currentArtifact,
    isCockpitReady,
    loadArtifactContent,
    currentProject,
    setCurrentArtifact,
    updateProject,
  ])

  // Carregar version labels quando o artefato estiver disponível
  // NOTA: Version labels são específicos do owner - não buscar para artefatos compartilhados
  useEffect(() => {
    const loadVersionLabels = async () => {
      const artifact = currentArtifact || initialArtifact

      // Resetar estados ao iniciar carregamento de novo artefato
      setVersionLabels(null)
      setCurrentVersionId(null)
      setCockpitArtifactId(null)

      if (
        !artifact.projectSlug ||
        !artifact.chatSlug ||
        !artifact.documentType ||
        !config
      ) {
        return
      }

      // Verificar se o usuário atual é o owner do artefato
      // Se não for, não buscar version labels (são específicos do owner)
      const currentUserId = config.userId
      const currentUserEmail = config.userEmail?.toLowerCase() || ''
      const isOwner =
        artifact.ownerId === currentUserId ||
        artifact.ownerId?.toLowerCase() === currentUserEmail

      if (!isOwner) {
        // Usuário compartilhado não precisa de version labels
        // Isso evita erros 404 no console
        return
      }

      try {
        const artifactService = new ArtifactService(config)
        const artifactKey = `document-${artifact.documentType}-${artifact.projectSlug}-${artifact.chatSlug}`
        const cockpitArtifact = await artifactService.getByKey(artifactKey)
        setCockpitArtifactId(cockpitArtifact.id)

        const labels = await artifactService.getVersionLabels(
          cockpitArtifact.id
        )
        setVersionLabels(labels)

        // Buscar versões para obter o ID da versão atual (mais recente)
        const versions = await artifactService.getVersionsByArtifactId(
          cockpitArtifact.id
        )
        if (versions.length > 0) {
          // Ordenar por data (mais recente primeiro) e pegar o primeiro
          const sortedVersions = [...versions].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return dateB - dateA
          })
          setCurrentVersionId(sortedVersions[0]?.id || null)
        }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao carregar version labels:', error)
        // Em caso de erro, garantir que os estados estão limpos
        setVersionLabels(null)
        setCurrentVersionId(null)
        setCockpitArtifactId(null)
      }
    }

    loadVersionLabels()
  }, [currentArtifact?.id, initialArtifact?.id, config])

  const handleSelectProject = (selectedProject: Project) => {
    setCurrentProject(selectedProject)
    setCurrentArtifact(null)
    setCurrentConversation(null)
    setViewMode('chat')
    onHome()
  }

  const handleNewProject = async (name: string, teamMembers?: TeamMember[]) => {
    // Construir equipe: criador + membros selecionados
    const team: ProjectTeamMember[] = []

    // Adicionar o criador do projeto
    team.push({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'Owner',
    })

    // Adicionar membros selecionados (evitar duplicatas)
    if (teamMembers && teamMembers.length > 0) {
      for (const member of teamMembers) {
        if (member.id !== user.id) {
          team.push({
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
          })
        }
      }
    }

    const newProject: Project = {
      id: `project-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      artifacts: [],
      conversations: [],
      team,
    }

    addProject(newProject)
    setCurrentProject(newProject)
    setShowNewProjectModal(false)

    if (isCockpitReady) {
      const result = await saveProject(newProject)
      if (result.success) {
        console.log('✅ [SDA2] Projeto persistido no Cockpit:', result.slug)
      }
    }
  }

  const handleSelectArtifact = useCallback(
    (artifact: Artifact) => {
      setCurrentArtifact(artifact)
      // NÃO limpar conversa - preservar para quando voltar do artefato
      // setCurrentConversation(null)
      setViewMode('artifact')
    },
    [setCurrentArtifact, setViewMode]
  )

  const handleSelectConversationInternal = useCallback(
    (conversation: Conversation) => {
      setCurrentConversation(conversation)
      setCurrentArtifact(null)
      setViewMode('chat')
      onSelectConversation(conversation)
    },
    [
      setCurrentConversation,
      setCurrentArtifact,
      setViewMode,
      onSelectConversation,
    ]
  )

  const handleGoHome = () => {
    setCurrentProject(null)
    setCurrentArtifact(null)
    setCurrentConversation(null)
    onHome()
  }

  const handleNewChat = () => {
    // Redirecionar para a página de projeto para criar novo chat
    onBack()
  }

  /**
   * Handler para salvar edição direta do artefato
   */
  const handleSaveEdit = useCallback(
    async (content: string) => {
      const artifact = currentArtifact || initialArtifact
      if (!currentProject || !artifact) return

      // ⚠️ VALIDAÇÃO: Avisar se está editando uma versão antiga
      if (viewingVersionNumber !== undefined) {
        const isConfirmed = window.confirm(
          `⚠️ Você está visualizando a versão ${viewingVersionNumber} (não a mais recente).\n\n` +
            `Ao salvar, será criada uma NOVA VERSÃO baseada neste conteúdo.\n\n` +
            `Deseja continuar?`
        )
        if (!isConfirmed) return
      }

      setIsSavingEdit(true)

      try {
        // Persistir no Cockpit PRIMEIRO para obter a versão correta
        if (
          !isCockpitReady ||
          !artifact.chatSlug ||
          !artifact.documentType ||
          !config
        ) {
          toast.error('Cockpit não está pronto para salvar')
          return
        }

        const detectedArtifact = {
          id: artifact.id,
          title: artifact.title,
          content,
          type: artifact.documentType,
          status: 'approved' as const,
        }

        console.log('💾 [SDA2] Salvando edição manual no Cockpit:', {
          artifactId: artifact.id,
          chatSlug: artifact.chatSlug,
          documentType: artifact.documentType,
          contentLength: content.length,
        })

        const result = await saveArtifact(
          currentProject,
          artifact.chatSlug,
          detectedArtifact,
          config.userId,
          config.userName
        )

        if (!result.success) {
          console.error(
            '❌ [SDA2] Falha ao persistir no Cockpit:',
            result.error
          )
          toast.error('Erro ao salvar', {
            description:
              result.error || 'Não foi possível salvar as alterações.',
          })
          return
        }

        console.log('✅ [SDA2] Edição persistida no Cockpit com sucesso')

        // 🔄 RECARREGAR o artefato completo do Cockpit após salvar
        try {
          const artifactService = new ArtifactService(config)
          const artifactKey = `document-${artifact.documentType}-${artifact.projectSlug}-${artifact.chatSlug}`

          console.log('🔄 [SDA2] Recarregando artefato do Cockpit...', {
            artifactKey,
          })

          // Buscar a versão MAIS RECENTE do artefato
          const cockpitArtifact =
            await artifactService.getByKeyWithLatestVersion(artifactKey)

          // Atualizar cockpitArtifactId
          setCockpitArtifactId(cockpitArtifact.id)

          // Recarregar versões e labels
          const [versions, labels] = await Promise.all([
            artifactService.getVersionsByArtifactId(cockpitArtifact.id),
            artifactService.getVersionLabels(cockpitArtifact.id),
          ])

          // Ordenar versões por data de criação (mais recente primeiro)
          const sortedVersions = [...versions].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return dateB - dateA
          })

          const latestVersion = sortedVersions[0]
          const latestVersionId = latestVersion?.id || null
          // Garantir que latestVersionNumber seja sempre um número
          const latestVersionNumber =
            typeof latestVersion?.version === 'number'
              ? latestVersion.version
              : parseInt(
                  String(latestVersion?.version || '1').split('.')[0] || '1',
                  10
                ) || 1

          // Parse do conteúdo da versão mais recente
          let latestContent: string
          try {
            const documentDto = JSON.parse(cockpitArtifact.value || '{}')
            latestContent = documentDto.content || cockpitArtifact.value || ''
          } catch {
            latestContent = cockpitArtifact.value || ''
          }

          // Atualizar o artefato com o conteúdo REAL do Cockpit
          const reloadedArtifact = {
            ...artifact,
            content: latestContent,
            version: latestVersionNumber,
            updatedAt: new Date().toISOString(),
          }

          // Atualizar stores
          setCurrentArtifact(reloadedArtifact)
          const updatedArtifacts = currentProject.artifacts.map(a =>
            a.id === artifact.id ? reloadedArtifact : a
          )
          updateProject(currentProject.id, { artifacts: updatedArtifacts })

          // Atualizar labels e versão atual
          setVersionLabels(labels)
          setCurrentVersionId(latestVersionId)

          // ⚠️ IMPORTANTE: Limpar viewingVersionNumber para mostrar a versão ATUAL
          setViewingVersionNumber(undefined)

          console.log('✅ [SDA2] Artefato recarregado do Cockpit:', {
            versionsCount: versions.length,
            latestVersionId,
            latestVersionNumber,
            contentLength: latestContent.length,
            labels: labels
              ? Object.entries(labels).map(([id, info]) => ({
                  id,
                  label: info?.label,
                }))
              : null,
          })

          toast.success('Artefato atualizado', {
            description: `Nova versão (${latestVersionNumber}) criada com sucesso.`,
          })

          // Atualizar o working content no store de sessão de edição
          updateWorkingContent(latestContent)
        } catch (reloadError) {
          console.error(
            '❌ [SDA2] Erro ao recarregar artefato após salvar:',
            reloadError
          )
          toast.warning('Salvo, mas erro ao recarregar', {
            description:
              'A edição foi salva, mas houve erro ao atualizar a visualização. Recarregue a página.',
          })
        }
      } catch (error) {
        console.error('❌ [SDA2] Erro ao salvar edição:', error)
        toast.error('Erro ao salvar', {
          description: 'Não foi possível salvar as alterações.',
        })
      } finally {
        setIsSavingEdit(false)
      }
    },
    [
      currentArtifact,
      initialArtifact,
      currentProject,
      setCurrentArtifact,
      updateProject,
      isCockpitReady,
      config,
      saveArtifact,
      updateWorkingContent,
      viewingVersionNumber,
      setCockpitArtifactId,
      setVersionLabels,
      setCurrentVersionId,
      setViewingVersionNumber,
    ]
  )

  /**
   * Handler para enviar mensagem de edição com IA
   * Envia uma mensagem contextualizada ao supervisor solicitando a edição
   * Agora inclui o contexto da sessão de edição para continuidade
   */
  const handleAIEditMessage = useCallback(
    async (message: string): Promise<string | null> => {
      const artifact = currentArtifact || initialArtifact
      if (!currentProject || !artifact) return null

      try {
        // Construir prompt contextualizado para edição
        // Agora inclui o histórico da sessão de edição
        const editPrompt = buildEditPrompt(
          message,
          artifact.title,
          artifact.type,
          artifact.content,
          editSession // Passar contexto da sessão
        )

        // Enviar para o supervisor (usamos o mesmo hook do chat normal)
        const result = await sendToSupervisor(editPrompt, null)

        // Extrair o conteúdo editado da resposta
        const editedContent = extractEditedContent(result.response)

        // Registrar a proposta no store de sessão
        // Isso permite que a IA conheça o histórico na próxima requisição
        addProposal(message, editedContent)

        console.log('✅ [ArtifactEdit] Edição recebida:', {
          responseLength: result.response.length,
          extractedLength: editedContent.length,
          sessionProposals: editSession?.proposals.length ?? 0,
        })

        return editedContent
      } catch (error) {
        console.error('❌ [ArtifactEdit] Erro ao processar edição:', error)
        throw error
      }
    },
    [
      currentArtifact,
      initialArtifact,
      currentProject,
      sendToSupervisor,
      editSession,
      addProposal,
    ]
  )

  /**
   * Handler para compartilhar artefato com membros do time
   */
  const handleShareArtifact = useCallback(
    async (userIds: string[]) => {
      const artifact = currentArtifact || initialArtifact

      if (
        !artifact.projectSlug ||
        !artifact.chatSlug ||
        !artifact.documentType
      ) {
        toast.error('Informações do artefato incompletas')
        return
      }

      if (!currentProject || !currentProject.team) {
        toast.error('Time do projeto não encontrado')
        return
      }

      const artifactKey = `document-${artifact.documentType}-${artifact.projectSlug}-${artifact.chatSlug}`

      try {
        console.log('🔄 [ArtifactPage] Compartilhando artefato:', {
          artifactKey,
          userIds,
          projectSlug: artifact.projectSlug,
          chatSlug: artifact.chatSlug,
        })

        // Usar namespace users + team para lookup completo
        const allKnownMembers = [
          ...currentProject.team,
          ...namespaceUsers.filter(
            nu => !currentProject.team.some(tm => tm.id === nu.id)
          ),
        ]

        const result = await shareArtifact(
          artifact.projectSlug,
          artifact.chatSlug,
          artifactKey,
          userIds,
          allKnownMembers
        )

        if (result.success) {
          toast.success('Artefato compartilhado com sucesso!')

          // Atualizar o artifact local com as novas informações de compartilhamento
          // (opcional, depende se você quer refletir isso imediatamente na UI)
          // Poderia recarregar o artifact aqui se necessário
        } else {
          toast.error(
            `Erro ao compartilhar: ${result.error || 'Erro desconhecido'}`
          )
        }
      } catch (error) {
        console.error('❌ [ArtifactPage] Erro ao compartilhar artefato:', error)
        toast.error('Erro ao compartilhar artefato')
      }
    },
    [currentArtifact, initialArtifact, currentProject, shareArtifact]
  )

  const handleExport = useCallback(
    (format: ExportFormat) => {
      const artifact = currentArtifact || initialArtifact

      // Configurar tipo MIME e extensão baseado no formato
      const formatConfig = {
        markdown: {
          mimeType: 'text/markdown',
          extension: '.md',
          description: 'markdown',
        },
        csv: {
          mimeType: 'text/csv',
          extension: '.csv',
          description: 'CSV',
        },
        txt: {
          mimeType: 'text/plain',
          extension: '.txt',
          description: 'texto',
        },
      }

      const formatCfg = formatConfig[format]

      // Para CSV, adicionar BOM UTF-8 para que o Excel reconheça a codificação correta
      // BOM = Byte Order Mark (EF BB BF em hex, ou \uFEFF em JS)
      const content =
        format === 'csv' ? '\uFEFF' + artifact.content : artifact.content

      // Determinar o nome do arquivo:
      // 1. Se a versão selecionada tem um label customizado, usar o label
      // 2. Caso contrário, usar o título do artefato (tipo do documento)
      let fileName = artifact.title

      // Debug: log estado atual
      console.log('[Export] Estado atual:', {
        currentVersionId,
        viewingVersionNumber,
        versionLabels: versionLabels
          ? Object.entries(versionLabels).map(([id, info]) => ({
              id,
              label: info?.label,
            }))
          : null,
        artifactTitle: artifact.title,
      })

      // Verificar se a versão atual tem um label customizado
      // IMPORTANTE: Verificar que o versionId existe E tem um label definido
      const currentVersionLabel =
        currentVersionId && versionLabels
          ? versionLabels[currentVersionId]
          : null

      console.log('[Export] Label lookup:', {
        currentVersionId,
        foundLabel: currentVersionLabel?.label || 'NENHUM',
        willUseLabel: !!currentVersionLabel,
      })

      if (currentVersionLabel) {
        // Usar o label customizado da versão selecionada
        fileName = currentVersionLabel.label
        console.log(
          '[Export] Usando label customizado da versão:',
          fileName,
          'versionId:',
          currentVersionId
        )
      } else {
        // Sem label customizado - usar título do artefato (tipo do documento)
        console.log(
          '[Export] Sem label customizado, usando título do artefato:',
          fileName
        )
      }

      // Criar blob e fazer download
      const blob = new Blob([content], {
        type: `${formatCfg.mimeType};charset=utf-8`,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slugify(fileName)}${formatCfg.extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Artefato exportado', {
        description: `${fileName} foi baixado como ${formatCfg.description}.`,
      })
    },
    [currentArtifact, initialArtifact, currentVersionId, versionLabels]
  )

  const handleVersionSelect = async (
    versionId: string,
    versionNumber: number
  ) => {
    const artifact = currentArtifact || initialArtifact

    if (!config) {
      toast.error('Configuração do Cockpit não disponível')
      return
    }

    if (!artifact.projectSlug || !artifact.chatSlug || !artifact.documentType) {
      toast.error('Informações do artefato incompletas')
      return
    }

    setIsLoadingVersion(true)
    try {
      const artifactService = new ArtifactService(config)

      // Construir chave do artefato no Cockpit
      const artifactKey = `document-${artifact.documentType}-${artifact.projectSlug}-${artifact.chatSlug}`

      // Buscar artefato pela chave para obter o ID real do Cockpit
      const cockpitArtifact = await artifactService.getByKey(artifactKey)
      setCockpitArtifactId(cockpitArtifact.id)

      // Buscar labels customizados das versões
      const labels = await artifactService.getVersionLabels(cockpitArtifact.id)
      setVersionLabels(labels)

      // Buscar todas as versões usando o ID do Cockpit
      const versions = await artifactService.getVersionsByArtifactId(
        cockpitArtifact.id
      )
      const version = versions.find(v => v.id === versionId)

      if (!version) {
        toast.error('Versão não encontrada')
        return
      }

      // Salvar o ID da versão atual para usar na exportação
      setCurrentVersionId(versionId)

      if (version.value) {
        // Parse do JSON para extrair o DocumentDto.content
        let content: string
        try {
          const documentDto = JSON.parse(version.value)
          content = documentDto.content || version.value
        } catch {
          // Se não for JSON, usar diretamente
          content = version.value
        }

        // Atualizar artifact com conteúdo da versão
        const updatedArtifact = {
          ...artifact,
          content,
        }
        setCurrentArtifact(updatedArtifact)
        setViewingVersionNumber(versionNumber)

        // Usar label customizado no toast se existir
        const displayLabel = getVersionDisplayLabel(
          versionId,
          version.version,
          labels || undefined
        )
        toast.success(`Visualizando: ${displayLabel}`)
      }
    } catch (error) {
      console.error('❌ [SDA2] Erro ao carregar versão:', error)
      toast.error('Erro ao carregar versão do artefato')
    } finally {
      setIsLoadingVersion(false)
    }
  }

  const artifact = currentArtifact || initialArtifact

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar escura principal */}
      {showSidebar && (
        <Sidebar
          projects={projects}
          currentProject={currentProject}
          onSelectProject={handleSelectProject}
          onNewProject={() => setShowNewProjectModal(true)}
          onHome={handleGoHome}
        />
      )}

      {/* Segunda sidebar (contexto do projeto) */}
      {currentProject && (
        <ProjectSidebar
          project={currentProject}
          onNewChat={handleNewChat}
          onSelectArtifact={handleSelectArtifact}
          onSelectConversation={handleSelectConversationInternal}
          selectedArtifactId={artifact?.id}
          selectedConversationId={undefined}
          isProjectsSidebarOpen={showSidebar}
          onToggleProjectsSidebar={() => setShowSidebar(!showSidebar)}
          config={config}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onLogout={onLogout}
          onClose={onBack}
          showSidebarToggle={false}
        />

        <main className="flex-1 overflow-hidden bg-white">
          {isLoadingContent ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                <p className="text-gray-500">Carregando artefato...</p>
              </div>
            </div>
          ) : artifact ? (
            <ArtifactViewer
              artifact={artifact}
              config={config}
              isLoadingVersion={isLoadingVersion}
              viewingVersionNumber={viewingVersionNumber}
              onVersionSelect={handleVersionSelect}
              onExport={handleExport}
              onSaveEdit={handleSaveEdit}
              onAIEditMessage={handleAIEditMessage}
              isSaving={isSavingEdit || isAIProcessing}
              streamingContent={streamingContent}
              onLabelsChange={labels => setVersionLabels(labels)}
              versionLabels={versionLabels}
              project={currentProject}
              projectSlug={artifact.projectSlug}
              chatSlug={artifact.chatSlug}
              onShareArtifact={handleShareArtifact}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">Nenhum artefato selecionado</p>
            </div>
          )}
        </main>
      </div>

      <NewProjectModal
        open={showNewProjectModal}
        onOpenChange={setShowNewProjectModal}
        onCreateProject={handleNewProject}
        existingProjectNames={projects.map(p => p.name)}
        availableTeamMembers={namespaceUsers}
      />
    </div>
  )
}
