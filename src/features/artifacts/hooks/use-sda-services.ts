/**
 * useSDAServices Hook
 *
 * Hook para facilitar o uso dos serviços de artefatos do SDA
 * Gerencia autenticação e fornece instâncias dos serviços
 */

'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'

import { getApiBaseUrlSafe } from '@/shared/lib/api-helpers'
import { usePermissionStore } from '@/shared/stores/permission-store'

import {
  ChatHistoryService,
  InitiativeService,
  SDArtifactService,
  SDAServiceConfig,
  UploadedFileService,
} from '../services'
import { DocumentArtifactService } from '../services/document-artifact.service'

interface UseSDAServicesResult {
  /** Serviço de iniciativas */
  initiativeService: InitiativeService | null
  /** Serviço de histórico de chat */
  chatHistoryService: ChatHistoryService | null
  /** Serviço de artefatos SDA */
  sdaArtifactService: SDArtifactService | null
  /** Serviço de documentos (Briefing, PRD, Backlog) */
  documentArtifactService: DocumentArtifactService | null
  /** Serviço de upload de arquivos como artefatos */
  uploadedFileService: UploadedFileService | null
  /** Se os serviços estão prontos para uso */
  isReady: boolean
  /** Mensagem de erro se houver problema de configuração */
  error: string | null
  /** Configuração atual dos serviços */
  config: SDAServiceConfig | null
}

/**
 * Hook para acessar os serviços de artefatos do SDA
 *
 * @example
 * ```tsx
 * const { initiativeService, isReady, error } = useSDAServices()
 *
 * if (!isReady) return <Loading />
 * if (error) return <Error message={error} />
 *
 * const result = await initiativeService.create({
 *   name: 'Minha Iniciativa',
 *   description: 'Descrição...',
 * })
 * ```
 */
export function useSDAServices(): UseSDAServicesResult {
  const { data: session } = useSession()
  const { activeLicenseId, activeNamespaceId } = usePermissionStore()

  const result = useMemo<UseSDAServicesResult>(() => {
    // Verifica se há sessão
    const accessToken = (session as { accessToken?: string })?.accessToken
    const user = session?.user

    if (!accessToken) {
      return {
        initiativeService: null,
        chatHistoryService: null,
        sdaArtifactService: null,
        documentArtifactService: null,
        uploadedFileService: null,
        isReady: false,
        error: 'Sessão não encontrada. Faça login novamente.',
        config: null,
      }
    }

    // Verifica licença e namespace
    if (!activeLicenseId || !activeNamespaceId) {
      return {
        initiativeService: null,
        chatHistoryService: null,
        sdaArtifactService: null,
        documentArtifactService: null,
        uploadedFileService: null,
        isReady: false,
        error: 'Selecione uma licença e namespace primeiro.',
        config: null,
      }
    }

    // Obtém URL da API via runtime config (funciona em produção com Docker)
    const baseUrl = getApiBaseUrlSafe() || ''
    if (!baseUrl) {
      return {
        initiativeService: null,
        chatHistoryService: null,
        sdaArtifactService: null,
        documentArtifactService: null,
        uploadedFileService: null,
        isReady: false,
        error: 'URL da API não configurada. Verifique /api/config.',
        config: null,
      }
    }

    // Configuração dos serviços
    const config: SDAServiceConfig = {
      baseUrl,
      accessToken,
      licenseId: activeLicenseId,
      namespaceId: activeNamespaceId,
      userId: (user as { id?: string })?.id || 'unknown',
      userName: user?.name || 'Usuário',
      userEmail: user?.email || '',
    }

    return {
      initiativeService: new InitiativeService(config),
      chatHistoryService: new ChatHistoryService(config),
      sdaArtifactService: new SDArtifactService(config),
      documentArtifactService: new DocumentArtifactService(config),
      uploadedFileService: new UploadedFileService(config),
      isReady: true,
      error: null,
      config,
    }
  }, [session, activeLicenseId, activeNamespaceId])

  return result
}

/**
 * Hook para criar uma nova iniciativa
 * Wrapper conveniente para o InitiativeService.create()
 */
export function useCreateInitiative() {
  const { initiativeService, isReady, error } = useSDAServices()

  const createInitiative = async (data: {
    name: string
    description: string
    tags?: string[]
  }) => {
    if (!isReady || !initiativeService) {
      return {
        success: false,
        error: error || 'Serviço não disponível',
      }
    }

    return initiativeService.create(data)
  }

  return {
    createInitiative,
    isReady,
    error,
  }
}
