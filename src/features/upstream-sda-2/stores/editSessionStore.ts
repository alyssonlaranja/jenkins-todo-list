/**
 * Edit Session Store
 *
 * Zustand store para gerenciar o contexto de sessão de edição com IA.
 * Este store NÃO é persistido - mantém apenas o estado da sessão atual.
 *
 * Funcionalidades:
 * - Mantém histórico de propostas de edição
 * - Rastreia status de cada proposta (pending, accepted, rejected)
 * - Fornece contexto para a IA entender interações anteriores
 * - Limpa automaticamente ao fechar o painel
 */

import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

/**
 * Status de uma proposta de edição
 */
export type EditProposalStatus = 'pending' | 'accepted' | 'rejected'

/**
 * Uma proposta de edição feita pela IA
 */
export interface EditProposal {
  /** ID único da proposta */
  id: string
  /** Requisição original do usuário */
  userRequest: string
  /** Conteúdo proposto pela IA */
  proposedContent: string
  /** Status atual da proposta */
  status: EditProposalStatus
  /** Timestamp da criação */
  timestamp: string
  /** ID da mensagem no chat de edição (para sincronizar com UI) */
  messageId?: string
}

/**
 * Contexto da sessão de edição atual
 */
export interface EditSessionContext {
  /** ID do artefato sendo editado */
  artifactId: string
  /** Título do artefato (para contexto) */
  artifactTitle: string
  /** Tipo do artefato */
  artifactType: string
  /** Conteúdo original do artefato (versão salva) */
  originalContent: string
  /** Conteúdo de trabalho atual (última proposta aceita ou original) */
  currentWorkingContent: string
  /** Histórico de propostas da sessão */
  proposals: EditProposal[]
  /** Timestamp de início da sessão */
  startedAt: string
}

/**
 * Estado do store
 */
interface EditSessionState {
  /** Sessão de edição ativa (null se não há edição em andamento) */
  session: EditSessionContext | null

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Inicia uma nova sessão de edição para um artefato
   */
  startSession: (artifact: {
    id: string
    title: string
    type: string
    content: string
  }) => void

  /**
   * Encerra a sessão de edição atual
   */
  endSession: () => void

  /**
   * Adiciona uma nova proposta de edição (status: pending)
   */
  addProposal: (
    userRequest: string,
    proposedContent: string,
    messageId?: string
  ) => string

  /**
   * Marca uma proposta como aceita e atualiza o conteúdo de trabalho
   */
  acceptProposal: (proposalId: string) => void

  /**
   * Marca uma proposta como rejeitada (mantém no histórico para contexto)
   */
  rejectProposal: (proposalId: string) => void

  /**
   * Atualiza o conteúdo de trabalho (após salvar no artefato real)
   */
  updateWorkingContent: (content: string) => void

  /**
   * Obtém o conteúdo que deve ser usado como base para a próxima edição
   * (última proposta aceita ou conteúdo original)
   */
  getBaseContentForEdit: () => string

  /**
   * Obtém o conteúdo da última proposta não-rejeitada (aceita ou pendente)
   * Propostas pendentes são tratadas como "aceitação parcial" para edição
   */
  getLatestNonRejectedContent: () => string

  /**
   * Obtém propostas pendentes
   */
  getPendingProposals: () => EditProposal[]

  /**
   * Obtém propostas rejeitadas (para contexto da IA)
   */
  getRejectedProposals: () => EditProposal[]

  /**
   * Verifica se há uma sessão ativa para um artefato específico
   */
  hasActiveSession: (artifactId: string) => boolean
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useEditSessionStore = create<EditSessionState>()((set, get) => ({
  session: null,

  startSession: artifact => {
    console.log('🎬 [EditSession] Starting session for:', artifact.title)

    set({
      session: {
        artifactId: artifact.id,
        artifactTitle: artifact.title,
        artifactType: artifact.type,
        originalContent: artifact.content,
        currentWorkingContent: artifact.content,
        proposals: [],
        startedAt: new Date().toISOString(),
      },
    })
  },

  endSession: () => {
    const { session } = get()
    if (session) {
      console.log('🏁 [EditSession] Ending session for:', session.artifactTitle)
      console.log('📊 [EditSession] Stats:', {
        totalProposals: session.proposals.length,
        accepted: session.proposals.filter(p => p.status === 'accepted').length,
        rejected: session.proposals.filter(p => p.status === 'rejected').length,
        pending: session.proposals.filter(p => p.status === 'pending').length,
      })
    }

    set({ session: null })
  },

  addProposal: (userRequest, proposedContent, messageId) => {
    const proposalId = uuidv4()
    const proposal: EditProposal = {
      id: proposalId,
      userRequest,
      proposedContent,
      status: 'pending',
      timestamp: new Date().toISOString(),
      messageId,
    }

    console.log('📝 [EditSession] Adding proposal:', {
      id: proposalId,
      request: userRequest.substring(0, 50) + '...',
    })

    set(state => {
      if (!state.session) return state

      return {
        session: {
          ...state.session,
          proposals: [...state.session.proposals, proposal],
        },
      }
    })

    return proposalId
  },

  acceptProposal: proposalId => {
    console.log('✅ [EditSession] Accepting proposal:', proposalId)

    set(state => {
      if (!state.session) return state

      const proposal = state.session.proposals.find(p => p.id === proposalId)
      if (!proposal) return state

      return {
        session: {
          ...state.session,
          currentWorkingContent: proposal.proposedContent,
          proposals: state.session.proposals.map(p =>
            p.id === proposalId ? { ...p, status: 'accepted' as const } : p
          ),
        },
      }
    })
  },

  rejectProposal: proposalId => {
    console.log('❌ [EditSession] Rejecting proposal:', proposalId)

    set(state => {
      if (!state.session) return state

      return {
        session: {
          ...state.session,
          proposals: state.session.proposals.map(p =>
            p.id === proposalId ? { ...p, status: 'rejected' as const } : p
          ),
        },
      }
    })
  },

  updateWorkingContent: content => {
    set(state => {
      if (!state.session) return state

      return {
        session: {
          ...state.session,
          currentWorkingContent: content,
          // Também atualiza o original se foi salvo
          originalContent: content,
        },
      }
    })
  },

  getBaseContentForEdit: () => {
    const { session } = get()
    if (!session) return ''

    // Encontra a última proposta aceita
    const acceptedProposals = session.proposals.filter(
      p => p.status === 'accepted'
    )
    if (acceptedProposals.length > 0) {
      return acceptedProposals[acceptedProposals.length - 1]!.proposedContent
    }

    // Encontra a última proposta pendente (se o usuário quer iterar sobre ela)
    const pendingProposals = session.proposals.filter(
      p => p.status === 'pending'
    )
    if (pendingProposals.length > 0) {
      return pendingProposals[pendingProposals.length - 1]!.proposedContent
    }

    // Fallback para conteúdo de trabalho atual
    return session.currentWorkingContent
  },

  getLatestNonRejectedContent: () => {
    const { session } = get()
    if (!session) return ''

    // Percorre as propostas de trás para frente
    // Procura a última proposta que NÃO foi rejeitada (aceita ou pendente)
    for (let i = session.proposals.length - 1; i >= 0; i--) {
      const proposal = session.proposals[i]!
      if (proposal.status !== 'rejected') {
        return proposal.proposedContent
      }
    }

    // Se todas foram rejeitadas ou não há propostas, retorna o original
    return session.originalContent
  },

  getPendingProposals: () => {
    const { session } = get()
    return session?.proposals.filter(p => p.status === 'pending') || []
  },

  getRejectedProposals: () => {
    const { session } = get()
    return session?.proposals.filter(p => p.status === 'rejected') || []
  },

  hasActiveSession: artifactId => {
    const { session } = get()
    return session?.artifactId === artifactId
  },
}))

// ============================================================================
// Selectors (para otimização de re-renders)
// ============================================================================

/**
 * Selector para obter apenas o contexto resumido da sessão
 * (útil para passar ao CopilotKit sem dados desnecessários)
 */
export const selectEditSessionSummary = (state: EditSessionState) => {
  if (!state.session) return null

  return {
    artifactId: state.session.artifactId,
    artifactTitle: state.session.artifactTitle,
    artifactType: state.session.artifactType,
    hasProposals: state.session.proposals.length > 0,
    proposalCount: state.session.proposals.length,
    pendingCount: state.session.proposals.filter(p => p.status === 'pending')
      .length,
    acceptedCount: state.session.proposals.filter(p => p.status === 'accepted')
      .length,
    rejectedCount: state.session.proposals.filter(p => p.status === 'rejected')
      .length,
  }
}

/**
 * Selector para obter o histórico de propostas formatado para a IA
 */
export const selectProposalHistoryForAI = (state: EditSessionState) => {
  if (!state.session) return null

  return state.session.proposals.map(p => ({
    userRequest: p.userRequest,
    status: p.status,
    // Limita o tamanho do conteúdo para não sobrecarregar o contexto
    contentPreview:
      p.proposedContent.length > 500
        ? p.proposedContent.substring(0, 500) + '...'
        : p.proposedContent,
    timestamp: p.timestamp,
  }))
}
