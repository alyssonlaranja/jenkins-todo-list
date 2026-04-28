/**
 * useNotifications Hook
 *
 * Hook para gerenciar notificações de artefatos compartilhados
 * Integra com o projectStore para obter artefatos e useCockpitServices para persistência
 */
'use client'

import { useCallback, useMemo } from 'react'

import type { NotificationStatus } from '@/features/artifacts/types/sda-artifacts.types'
import { useCurrentUserId } from '@/shared/hooks/use-current-user-id'

import { useProjectStore } from '../stores/projectStore'
import type { Artifact, Project } from '../types'
import { useCockpitServices } from './useCockpitServices'

// ============================================================================
// Identity Matching Helper
// ============================================================================

/**
 * Verifica se um SharedWithInfo pertence ao usuário atual.
 * Faz matching por GUID (userId do JWT) E por email (fallback para dados legados
 * onde o owner do projeto teve seu team member.id gravado como email).
 */
function isCurrentUser(
  swUserId: string | undefined,
  swUserEmail: string | undefined,
  currentUserId: string | null,
  currentUserEmail: string
): boolean {
  if (!swUserId && !swUserEmail) return false
  // Match por GUID (ideal)
  if (currentUserId && swUserId === currentUserId) return true
  // Match por email no campo userId (dados legados: owner.id era email)
  if (currentUserEmail && swUserId?.toLowerCase() === currentUserEmail)
    return true
  // Match por campo userEmail
  if (currentUserEmail && swUserEmail?.toLowerCase() === currentUserEmail)
    return true
  return false
}

// ============================================================================
// Types
// ============================================================================

/** Notificação de artefato compartilhado */
export interface ArtifactNotification {
  /** ID único da notificação (combinação de projectId + artifactId + userId) */
  id: string
  /** ID do projeto */
  projectId: string
  /** Nome do projeto */
  projectName: string
  /** Slug do projeto */
  projectSlug?: string
  /** ID do artefato */
  artifactId: string
  /** Título do artefato */
  artifactTitle: string
  /** Tipo do artefato (ArtifactType: brief, prd-greenfield, etc.) */
  artifactType: string
  /** Tipo do documento no Cockpit (briefing, prd, etc) - mais descritivo */
  documentType?: string
  /** Nome customizado do artefato (se houver) */
  customName?: string
  /** Quem compartilhou */
  sharedBy: string
  /** Nome de quem compartilhou */
  sharedByName: string
  /** Data do compartilhamento */
  sharedAt: string
  /** Versão compartilhada */
  sharedVersion: string
  /** Status da notificação */
  status: NotificationStatus
  /** Data em que foi lida (se foi) */
  readAt?: string
}

/** Contagem de notificações por projeto */
export interface ProjectNotificationCount {
  projectId: string
  projectName: string
  unreadCount: number
  totalCount: number
}

/** Resultado do hook useNotifications */
export interface UseNotificationsResult {
  /** Lista de todas as notificações do usuário atual */
  notifications: ArtifactNotification[]
  /** Notificações não lidas */
  unreadNotifications: ArtifactNotification[]
  /** Notificações já lidas */
  readNotifications: ArtifactNotification[]
  /** Contagem total de não lidas */
  unreadCount: number
  /** Contagem total de lidas */
  readCount: number
  /** Contagem formatada (9+ para > 9) */
  unreadCountFormatted: string
  /** Contagem de notificações por projeto */
  notificationsByProject: ProjectNotificationCount[]
  /** Obter contagem de não lidas para um projeto específico */
  getUnreadCountByProject: (projectId: string) => number
  /** Obter contagem formatada para um projeto específico */
  getUnreadCountFormattedByProject: (projectId: string) => string
  /** Marcar uma notificação como lida */
  markAsRead: (notificationId: string) => Promise<void>
  /** Marcar todas as notificações como lidas */
  markAllAsRead: () => Promise<void>
  /** Marcar notificação como excluída (soft delete) */
  markAsDeleted: (notificationId: string) => Promise<void>
  /** Marcar todas as notificações lidas como excluídas */
  markAllAsDeleted: () => Promise<void>
  /** Se está carregando */
  isLoading: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extrai notificações de um artefato para o usuário especificado
 * Usa matching por GUID + email fallback para compatibilidade com dados legados
 */
function extractNotificationsFromArtifact(
  artifact: Artifact,
  project: Project,
  userId: string,
  userEmail: string
): ArtifactNotification | null {
  if (!artifact.sharedWith || artifact.sharedWith.length === 0) {
    return null
  }

  // Encontra o registro de compartilhamento para o usuário atual
  // Usa matching por GUID + email fallback
  const shareInfo = artifact.sharedWith.find(sw =>
    isCurrentUser(sw.userId, sw.userEmail, userId, userEmail)
  )
  if (!shareInfo) {
    return null
  }

  // Ignora notificações deletadas
  if (shareInfo.notificationStatus === 'deleted') {
    return null
  }

  return {
    id: `${project.id}-${artifact.id}-${userId}`,
    projectId: project.id,
    projectName: project.name,
    projectSlug: artifact.projectSlug,
    artifactId: artifact.id,
    artifactTitle: artifact.title,
    artifactType: artifact.type,
    documentType: artifact.documentType,
    customName: artifact.customName,
    sharedBy: shareInfo.sharedBy,
    sharedByName: shareInfo.sharedByName,
    sharedAt: shareInfo.sharedAt,
    sharedVersion: shareInfo.sharedVersion,
    status: shareInfo.notificationStatus || 'unread',
    readAt: shareInfo.readAt,
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook para gerenciar notificações de artefatos compartilhados
 * @param projectId - ID do projeto para filtrar notificações (opcional - se não fornecido, retorna todas)
 */
export function useNotifications(projectId?: string): UseNotificationsResult {
  const { userId, isLoading: isUserLoading } = useCurrentUserId()
  const { projects, updateProject } = useProjectStore()
  const {
    updateNotificationStatus: updateNotificationStatusInMCP,
    isReady: isCockpitReady,
    config: cockpitConfig,
  } = useCockpitServices()

  // Email do usuário atual para fallback matching
  const currentUserEmail = (cockpitConfig?.userEmail || '').toLowerCase()

  // Extrai todas as notificações dos projetos
  const notifications = useMemo(() => {
    console.log('[useNotifications] Processando notificações:', {
      userId,
      projectsCount: projects.length,
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        artifactsCount: p.artifacts?.length || 0,
        artifactsWithShared:
          p.artifacts?.filter(a => a.sharedWith?.length).length || 0,
      })),
    })

    if ((!userId && !currentUserEmail) || !projects.length) {
      console.log('[useNotifications] Sem userId/email ou projetos:', {
        userId,
        currentUserEmail,
        projectsLength: projects.length,
      })
      return []
    }

    const allNotifications: ArtifactNotification[] = []

    for (const project of projects) {
      if (!project.artifacts?.length) continue

      for (const artifact of project.artifacts) {
        // Log detalhado para cada artefato com sharedWith
        if (artifact.sharedWith?.length) {
          console.log('[useNotifications] Artefato com sharedWith:', {
            projectId: project.id,
            artifactId: artifact.id,
            artifactTitle: artifact.title,
            sharedWith: artifact.sharedWith,
            userId,
            currentUserEmail,
            matchFound: artifact.sharedWith.some(sw =>
              isCurrentUser(sw.userId, sw.userEmail, userId, currentUserEmail)
            ),
          })
        }

        const notification = extractNotificationsFromArtifact(
          artifact,
          project,
          userId,
          currentUserEmail
        )
        if (notification) {
          allNotifications.push(notification)
        }
      }
    }

    // Ordena por data, mais recentes primeiro
    const sorted = allNotifications.sort(
      (a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime()
    )

    // Se projectId foi fornecido, filtra apenas notificações desse projeto
    if (projectId) {
      return sorted.filter(n => n.projectId === projectId)
    }

    return sorted
  }, [userId, currentUserEmail, projects, projectId])

  // Filtra notificações não lidas
  const unreadNotifications = useMemo(
    () => notifications.filter(n => n.status === 'unread'),
    [notifications]
  )

  // Filtra notificações já lidas
  const readNotifications = useMemo(
    () => notifications.filter(n => n.status === 'read'),
    [notifications]
  )

  // Contagem de não lidas
  const unreadCount = unreadNotifications.length

  // Contagem de lidas
  const readCount = readNotifications.length

  // Contagem formatada (9+ para > 9)
  const unreadCountFormatted = useMemo(() => {
    if (unreadCount === 0) return ''
    if (unreadCount > 9) return '9+'
    return unreadCount.toString()
  }, [unreadCount])

  // Agrupa notificações por projeto
  const notificationsByProject = useMemo(() => {
    const byProject: Record<string, ProjectNotificationCount> = {}

    for (const notification of notifications) {
      if (!byProject[notification.projectId]) {
        byProject[notification.projectId] = {
          projectId: notification.projectId,
          projectName: notification.projectName,
          unreadCount: 0,
          totalCount: 0,
        }
      }

      const projectEntry = byProject[notification.projectId]
      if (projectEntry) {
        projectEntry.totalCount++
        if (notification.status === 'unread') {
          projectEntry.unreadCount++
        }
      }
    }

    return Object.values(byProject)
  }, [notifications])

  // Obter contagem de não lidas para um projeto específico
  const getUnreadCountByProject = useCallback(
    (projectId: string) => {
      const projectStats = notificationsByProject.find(
        p => p.projectId === projectId
      )
      return projectStats?.unreadCount || 0
    },
    [notificationsByProject]
  )

  // Obter contagem formatada para um projeto específico
  const getUnreadCountFormattedByProject = useCallback(
    (projectId: string) => {
      const count = getUnreadCountByProject(projectId)
      if (count === 0) return ''
      if (count > 9) return '9+'
      return count.toString()
    },
    [getUnreadCountByProject]
  )

  // Atualiza o status de uma notificação no artefato (local + MCP)
  const updateNotificationStatus = useCallback(
    async (
      notificationId: string,
      newStatus: NotificationStatus,
      readAt?: string
    ) => {
      if (!userId) return

      // Encontra a notificação
      const notification = notifications.find(n => n.id === notificationId)
      if (!notification) {
        console.warn(
          '[useNotifications] Notificação não encontrada:',
          notificationId
        )
        return
      }

      // Encontra o projeto e artefato
      const project = projects.find(p => p.id === notification.projectId)
      if (!project) {
        console.warn(
          '[useNotifications] Projeto não encontrado:',
          notification.projectId
        )
        return
      }

      const artifactIndex = project.artifacts?.findIndex(
        a => a.id === notification.artifactId
      )
      if (
        artifactIndex === undefined ||
        artifactIndex === -1 ||
        !project.artifacts
      ) {
        console.warn(
          '[useNotifications] Artefato não encontrado:',
          notification.artifactId
        )
        return
      }

      const artifact = project.artifacts[artifactIndex]
      if (!artifact) {
        console.warn(
          '[useNotifications] Artefato inválido no índice:',
          artifactIndex
        )
        return
      }

      // Atualiza o sharedWith do artefato (matching por GUID + email)
      const updatedSharedWith = artifact.sharedWith?.map(sw => {
        if (isCurrentUser(sw.userId, sw.userEmail, userId, currentUserEmail)) {
          return {
            ...sw,
            notificationStatus: newStatus,
            readAt: readAt || sw.readAt,
          }
        }
        return sw
      })

      const updatedArtifact: Artifact = {
        ...artifact,
        sharedWith: updatedSharedWith,
      }

      // Atualiza o projeto local (store) - feedback imediato
      const updatedArtifacts = [...project.artifacts]
      updatedArtifacts[artifactIndex] = updatedArtifact

      updateProject(project.id, {
        artifacts: updatedArtifacts,
      })

      console.log(
        '[useNotifications] Status atualizado localmente:',
        notificationId,
        newStatus
      )

      // Persiste no MCP se disponível
      // Usa sw.userId original para persistência (o que está gravado no Cockpit)
      const matchedSw = artifact.sharedWith?.find(sw =>
        isCurrentUser(sw.userId, sw.userEmail, userId, currentUserEmail)
      )
      const persistUserId = matchedSw?.userId || userId || ''

      if (isCockpitReady && artifact.projectSlug && artifact.chatSlug) {
        try {
          const artifactKey = `document-${artifact.documentType}-${artifact.projectSlug}-${artifact.chatSlug}`
          const result = await updateNotificationStatusInMCP(
            artifact.projectSlug,
            artifact.chatSlug,
            artifactKey,
            persistUserId,
            newStatus,
            readAt
          )
          if (result.success) {
            console.log(
              '[useNotifications] Status persistido no MCP:',
              notificationId,
              newStatus
            )
          } else {
            console.warn(
              '[useNotifications] Falha ao persistir no MCP:',
              result.error
            )
          }
        } catch (error) {
          console.error('[useNotifications] Erro ao persistir no MCP:', error)
          // Não falha, já atualizamos localmente
        }
      }
    },
    [
      userId,
      currentUserEmail,
      notifications,
      projects,
      updateProject,
      isCockpitReady,
      updateNotificationStatusInMCP,
    ]
  )

  // Marca uma notificação como lida
  const markAsRead = useCallback(
    async (notificationId: string) => {
      const readAt = new Date().toISOString()
      await updateNotificationStatus(notificationId, 'read', readAt)
    },
    [updateNotificationStatus]
  )

  // Marca todas as notificações como lidas
  // Agrupa por projeto para evitar race conditions
  const markAllAsRead = useCallback(async () => {
    if (!userId) return

    const readAt = new Date().toISOString()
    // Captura as notificações antes de iniciar o processo
    const notificationsSnapshot = [...unreadNotifications]

    // Agrupa notificações por projeto
    const notificationsByProjectId = new Map<string, ArtifactNotification[]>()
    for (const notification of notificationsSnapshot) {
      const existing =
        notificationsByProjectId.get(notification.projectId) || []
      existing.push(notification)
      notificationsByProjectId.set(notification.projectId, existing)
    }

    // Para cada projeto, atualiza TODOS os artefatos de uma vez
    for (const [
      projectIdKey,
      projectNotifications,
    ] of notificationsByProjectId) {
      const project = projects.find(p => p.id === projectIdKey)
      if (!project?.artifacts) continue

      // Cria uma cópia dos artefatos e atualiza todos de uma vez
      const updatedArtifacts = project.artifacts.map(artifact => {
        const notification = projectNotifications.find(
          n => n.artifactId === artifact.id
        )
        if (!notification) return artifact

        // Atualiza o sharedWith do artefato (matching por GUID + email)
        const updatedSharedWith = artifact.sharedWith?.map(sw => {
          if (
            isCurrentUser(sw.userId, sw.userEmail, userId, currentUserEmail)
          ) {
            return {
              ...sw,
              notificationStatus: 'read' as NotificationStatus,
              readAt,
            }
          }
          return sw
        })

        return {
          ...artifact,
          sharedWith: updatedSharedWith,
        }
      })

      // Atualiza o projeto uma única vez com todos os artefatos modificados
      updateProject(projectIdKey, {
        artifacts: updatedArtifacts,
      })
    }

    // Persiste no MCP SEQUENCIALMENTE para evitar race conditions no servidor
    // Agrupa por chatSlug para processar cada chat de uma vez
    const notificationsByChatKey = new Map<
      string,
      typeof notificationsSnapshot
    >()
    for (const notification of notificationsSnapshot) {
      const project = projects.find(p => p.id === notification.projectId)
      const artifact = project?.artifacts?.find(
        a => a.id === notification.artifactId
      )
      if (artifact?.projectSlug && artifact?.chatSlug) {
        const chatKey = `${artifact.projectSlug}|${artifact.chatSlug}`
        const existing = notificationsByChatKey.get(chatKey) || []
        existing.push(notification)
        notificationsByChatKey.set(chatKey, existing)
      }
    }

    // Processa cada chat sequencialmente
    for (const [, chatNotifications] of notificationsByChatKey) {
      // Processa as notificações do mesmo chat sequencialmente
      for (const notification of chatNotifications) {
        const project = projects.find(p => p.id === notification.projectId)
        const artifact = project?.artifacts?.find(
          a => a.id === notification.artifactId
        )

        if (isCockpitReady && artifact?.projectSlug && artifact?.chatSlug) {
          const artifactKey = `document-${artifact.documentType}-${artifact.projectSlug}-${artifact.chatSlug}`
          // Usar o userId original do sharedWith para persistência no Cockpit
          const matchedSw = artifact.sharedWith?.find(sw =>
            isCurrentUser(sw.userId, sw.userEmail, userId, currentUserEmail)
          )
          const persistUserId = matchedSw?.userId || userId || ''
          try {
            const result = await updateNotificationStatusInMCP(
              artifact.projectSlug,
              artifact.chatSlug,
              artifactKey,
              persistUserId,
              'read',
              readAt
            )
            if (!result.success) {
              console.warn(
                '[useNotifications] Falha ao persistir no MCP:',
                result.error
              )
            }
          } catch (error) {
            console.error('[useNotifications] Erro ao persistir no MCP:', error)
          }
        }
      }
    }
  }, [
    userId,
    currentUserEmail,
    unreadNotifications,
    projects,
    updateProject,
    isCockpitReady,
    updateNotificationStatusInMCP,
  ])

  // Marca notificação como excluída
  const markAsDeleted = useCallback(
    async (notificationId: string) => {
      await updateNotificationStatus(notificationId, 'deleted')
    },
    [updateNotificationStatus]
  )

  // Marca todas as notificações como excluídas (lidas e não lidas)
  // Agrupa por projeto para evitar race conditions
  const markAllAsDeleted = useCallback(async () => {
    if (!userId) return

    // Captura as notificações antes de iniciar o processo
    const notificationsSnapshot = [...notifications]

    console.log('[useNotifications] Deletando todas as notificações:', {
      count: notificationsSnapshot.length,
      ids: notificationsSnapshot.map(n => n.id),
    })

    // Agrupa notificações por projeto
    const notificationsByProjectId = new Map<string, ArtifactNotification[]>()
    for (const notification of notificationsSnapshot) {
      const existing =
        notificationsByProjectId.get(notification.projectId) || []
      existing.push(notification)
      notificationsByProjectId.set(notification.projectId, existing)
    }

    // Para cada projeto, atualiza TODOS os artefatos de uma vez
    for (const [
      projectIdKey,
      projectNotifications,
    ] of notificationsByProjectId) {
      const project = projects.find(p => p.id === projectIdKey)
      if (!project?.artifacts) continue

      // Cria uma cópia dos artefatos e atualiza todos de uma vez
      const updatedArtifacts = project.artifacts.map(artifact => {
        const notification = projectNotifications.find(
          n => n.artifactId === artifact.id
        )
        if (!notification) return artifact

        // Atualiza o sharedWith do artefato (matching por GUID + email)
        const updatedSharedWith = artifact.sharedWith?.map(sw => {
          if (
            isCurrentUser(sw.userId, sw.userEmail, userId, currentUserEmail)
          ) {
            return {
              ...sw,
              notificationStatus: 'deleted' as NotificationStatus,
            }
          }
          return sw
        })

        return {
          ...artifact,
          sharedWith: updatedSharedWith,
        }
      })

      // Atualiza o projeto uma única vez com todos os artefatos modificados
      updateProject(projectIdKey, {
        artifacts: updatedArtifacts,
      })

      console.log('[useNotifications] Projeto atualizado localmente:', {
        projectId: projectIdKey,
        notificationsCount: projectNotifications.length,
      })
    }

    // Persiste no MCP SEQUENCIALMENTE para evitar race conditions no servidor
    // Agrupa por chatSlug para processar cada chat de uma vez
    const notificationsByChatKey = new Map<
      string,
      typeof notificationsSnapshot
    >()
    for (const notification of notificationsSnapshot) {
      const project = projects.find(p => p.id === notification.projectId)
      const artifact = project?.artifacts?.find(
        a => a.id === notification.artifactId
      )
      if (artifact?.projectSlug && artifact?.chatSlug) {
        const chatKey = `${artifact.projectSlug}|${artifact.chatSlug}`
        const existing = notificationsByChatKey.get(chatKey) || []
        existing.push(notification)
        notificationsByChatKey.set(chatKey, existing)
      }
    }

    // Processa cada chat sequencialmente
    for (const [chatKey, chatNotifications] of notificationsByChatKey) {
      // Processa as notificações do mesmo chat sequencialmente
      for (const notification of chatNotifications) {
        const project = projects.find(p => p.id === notification.projectId)
        const artifact = project?.artifacts?.find(
          a => a.id === notification.artifactId
        )

        if (isCockpitReady && artifact?.projectSlug && artifact?.chatSlug) {
          const artifactKey = `document-${artifact.documentType}-${artifact.projectSlug}-${artifact.chatSlug}`
          // Usar o userId original do sharedWith para persistência no Cockpit
          const matchedSw = artifact.sharedWith?.find(sw =>
            isCurrentUser(sw.userId, sw.userEmail, userId, currentUserEmail)
          )
          const persistUserId = matchedSw?.userId || userId || ''
          try {
            const result = await updateNotificationStatusInMCP(
              artifact.projectSlug,
              artifact.chatSlug,
              artifactKey,
              persistUserId,
              'deleted'
            )
            if (result.success) {
              console.log(
                '[useNotifications] Status persistido no MCP:',
                notification.id
              )
            } else {
              console.warn(
                '[useNotifications] Falha ao persistir no MCP:',
                result.error
              )
            }
          } catch (error) {
            console.error('[useNotifications] Erro ao persistir no MCP:', error)
          }
        }
      }
      console.log('[useNotifications] Chat processado:', chatKey)
    }

    console.log(
      '[useNotifications] Todas as notificações deletadas com sucesso'
    )
  }, [
    userId,
    currentUserEmail,
    notifications,
    projects,
    updateProject,
    isCockpitReady,
    updateNotificationStatusInMCP,
  ])

  return {
    notifications,
    unreadNotifications,
    readNotifications,
    unreadCount,
    readCount,
    unreadCountFormatted,
    notificationsByProject,
    getUnreadCountByProject,
    getUnreadCountFormattedByProject,
    markAsRead,
    markAllAsRead,
    markAsDeleted,
    markAllAsDeleted,
    isLoading: isUserLoading,
  }
}
