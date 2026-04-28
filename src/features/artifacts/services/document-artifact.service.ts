/**
 * Document Artifact Service
 *
 * Serviço para gerenciamento de artefatos de documento do SDA
 * (Briefing, PRD, Backlog)
 *
 * REGRAS:
 * - Apenas um artefato de cada tipo por iniciativa
 * - Novas versões em vez de novos artefatos
 * - Mapeamento de agentes para tipos de artefatos:
 *   - João (PM) → Briefing
 *   - Paula (PO) → PRD
 *   - Maria (BA) → Backlog
 */

import { v4 as uuidv4 } from 'uuid'

import {
  ArtifactApprovalStatus,
  OperationResult,
  SDAServiceConfig,
} from '../types/sda-artifacts.types'
import {
  ArtifactAccessibility,
  ArtifactService,
  getArtifactTypes,
} from './artifact.service'

// ============================================================================
// TIPOS E CONSTANTES
// ============================================================================

/**
 * Tipos de documentos suportados
 * Usando string para permitir extensibilidade - novos tipos podem ser adicionados dinamicamente
 */
export type DocumentType = string

/** Tipos de documentos conhecidos (para autocompletar e validação opcional) */
export const KNOWN_DOCUMENT_TYPES = [
  'briefing',
  'prd',
  'backlog',
  'design',
  'architecture',
  'feasibility',
  'requirements',
  'document',
] as const

/** Mapeamento de agentes para tipos de documentos */
export const AGENT_TO_DOCUMENT_TYPE: Record<string, DocumentType> = {
  maria: 'backlog', // Maria = Business Analyst → gera Backlog
  'maria-analyst': 'backlog',
  joao: 'briefing', // João = PM → gera Briefing
  'joao-pm': 'briefing',
  paula: 'prd', // Paula = PO → gera PRD
  'paula-po': 'prd',
  sofia: 'design', // Sofia = UX Designer → gera Especificação de Design
  'sofia-ux': 'design',
  wilson: 'architecture', // Wilson = Arquiteto → gera Arquitetura de Alto Nível
  'wilson-architect': 'architecture',
}

/** Nomes legíveis dos tipos de documentos conhecidos */
export const DOCUMENT_TYPE_NAMES: Record<string, string> = {
  briefing: 'Briefing de Projeto',
  prd: 'PRD (Product Requirements Document)',
  backlog: 'Backlog de Produto',
  design: 'Especificação de Design (Jornada do Usuário)',
  architecture: 'Arquitetura de Alto Nível',
  feasibility: 'Análise de Viabilidade Técnica',
  requirements: 'Requisitos Funcionais e Não Funcionais',
  document: 'Documento',
}

/** Função para obter nome do tipo de documento (com fallback) */
export function getDocumentTypeName(docType: string): string {
  return (
    DOCUMENT_TYPE_NAMES[docType] ||
    `Documento ${docType.charAt(0).toUpperCase() + docType.slice(1)}`
  )
}

/** Interface para dados do documento */
export interface DocumentArtifactData {
  id: string
  initiativeId: string
  initiativeSlug: string
  documentType: DocumentType
  documentName: string
  content: string
  version: string
  hasOfficialVersion: boolean
  status: ArtifactApprovalStatus
  createdAt: string
  updatedAt: string
  createdBy?: string
  createdByName?: string
  approvedAt?: string | null
  approvedBy?: string | null
  approvedByName?: string | null
  /** ID da versão pai (versão que foi promovida para criar esta) */
  parentVersionId?: string | null
  /** Versão pai (para histórico de promoções) */
  parentVersion?: string | null
}

/** Interface para informações de versão do documento */
export interface DocumentVersionInfo {
  id: string
  artifactId: string
  version: string
  hasOfficialVersion: boolean
  status: ArtifactApprovalStatus
  createdAt: string
  createdBy: string
  createdByName: string
  isProduction: boolean
  content: string
  documentName: string
  /** ID da versão pai (versão que foi promovida para criar esta) */
  parentVersionId?: string | null
  /** Versão pai (para histórico de promoções) */
  parentVersion?: string | null
}

/** Função para gerar key do documento */
export function getDocumentKey(
  initiativeSlug: string,
  documentType: DocumentType
): string {
  return `document-${initiativeSlug}-${documentType}`
}

/** Função para obter tipo de documento baseado no agente */
export function getDocumentTypeFromAgent(agentId: string): DocumentType | null {
  const cleanId = agentId.toLowerCase().replace(/[-_]/g, '')

  for (const [key, type] of Object.entries(AGENT_TO_DOCUMENT_TYPE)) {
    if (cleanId.includes(key.replace(/[-_]/g, ''))) {
      return type
    }
  }

  return null
}

// ============================================================================
// DOCUMENT ARTIFACT SERVICE
// ============================================================================

export class DocumentArtifactService {
  private artifactService: ArtifactService
  private config: SDAServiceConfig

  constructor(config: SDAServiceConfig) {
    this.config = config
    this.artifactService = new ArtifactService({
      baseUrl: config.baseUrl,
      accessToken: config.accessToken,
      licenseId: config.licenseId,
      namespaceId: config.namespaceId,
    })
  }

  /**
   * Verifica se já existe um documento do tipo para a iniciativa
   */
  async exists(
    initiativeSlug: string,
    documentType: DocumentType
  ): Promise<{ exists: boolean; artifactId?: string }> {
    try {
      const key = getDocumentKey(initiativeSlug, documentType)
      const artifact = await this.artifactService.getByKey(key)
      return { exists: true, artifactId: artifact.id }
    } catch {
      return { exists: false }
    }
  }

  /**
   * Obtém um documento por tipo e iniciativa
   */
  async getByType(
    initiativeSlug: string,
    documentType: DocumentType
  ): Promise<OperationResult<DocumentArtifactData>> {
    try {
      const key = getDocumentKey(initiativeSlug, documentType)
      console.log(
        `[DocumentArtifactService.getByType] 🔍 Buscando documento com key: ${key}`
      )

      // Usar getByKeyWithLatestVersion para garantir versão mais recente
      const artifact = await this.artifactService.getByKeyWithLatestVersion(key)

      console.log(
        `[DocumentArtifactService.getByType] 📄 Artefato encontrado:`,
        {
          id: artifact.id,
          key: artifact.key,
          version: artifact.version,
          versionCount: artifact.versionCount,
          valueLength: artifact.value?.length || 0,
        }
      )

      const data = JSON.parse(artifact.value || '{}') as DocumentArtifactData

      console.log(
        `[DocumentArtifactService.getByType] ✅ Documento parseado:`,
        {
          id: data.id,
          documentType: data.documentType,
          documentName: data.documentName,
          version: data.version,
          hasOfficialVersion: data.hasOfficialVersion,
          status: data.status,
          contentLength: data.content?.length || 0,
        }
      )

      return {
        success: true,
        data,
      }
    } catch (error) {
      // Não logar como erro quando documento não existe - é esperado durante listagem
      const errorMessage =
        error instanceof Error ? error.message : 'Documento não encontrado'
      const isNotFound =
        errorMessage.includes('not found') ||
        errorMessage.includes('não encontrado')

      if (!isNotFound) {
        console.error('[DocumentArtifactService.getByType] ❌ Erro:', error)
      } else {
        console.log(
          '[DocumentArtifactService.getByType] ℹ️ Documento não existe ainda (esperado)'
        )
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Cria ou atualiza um documento (versiona se já existir)
   */
  async saveDocument(
    initiativeSlug: string,
    initiativeId: string,
    documentType: DocumentType,
    content: string,
    userId?: string,
    userName?: string
  ): Promise<OperationResult<DocumentArtifactData>> {
    try {
      const key = getDocumentKey(initiativeSlug, documentType)
      const now = new Date().toISOString()

      console.log(
        `[DocumentArtifactService.saveDocument] Salvando ${documentType} para ${initiativeSlug}`
      )

      // Verificar se já existe
      const { exists, artifactId } = await this.exists(
        initiativeSlug,
        documentType
      )

      if (exists && artifactId) {
        // Atualizar existente (criar nova versão)
        console.log(
          `[DocumentArtifactService.saveDocument] Documento existe, criando nova versão...`
        )

        const existingResult = await this.getByType(
          initiativeSlug,
          documentType
        )
        const existingData = existingResult.data

        // Calcular nova versão
        const currentVersion = existingData?.version || '1.0.0'
        const newVersion = this.bumpVersion(currentVersion)

        const updatedData: DocumentArtifactData = {
          id: existingData?.id || artifactId,
          initiativeId,
          initiativeSlug,
          documentType,
          documentName: getDocumentTypeName(documentType),
          content,
          version: newVersion,
          hasOfficialVersion: existingData?.hasOfficialVersion || false,
          status: ArtifactApprovalStatus.PENDING,
          createdAt: existingData?.createdAt || now,
          updatedAt: now,
          createdBy: existingData?.createdBy || userId,
          createdByName: existingData?.createdByName || userName,
          approvedAt: null,
          approvedBy: null,
          approvedByName: null,
        }

        await this.artifactService.update({
          id: artifactId,
          value: JSON.stringify(updatedData),
          description: `${getDocumentTypeName(documentType)} - v${newVersion}`,
          version: newVersion,
          secret: false,
          accessibility: ArtifactAccessibility.NAMESPACE,
        })

        console.log(
          `[DocumentArtifactService.saveDocument] ✅ Versão ${newVersion} criada`
        )

        return {
          success: true,
          data: updatedData,
        }
      } else {
        // Criar novo
        console.log(
          `[DocumentArtifactService.saveDocument] Criando novo documento...`
        )

        const newData: DocumentArtifactData = {
          id: uuidv4(),
          initiativeId,
          initiativeSlug,
          documentType,
          documentName: getDocumentTypeName(documentType),
          content,
          version: '1.0.0',
          hasOfficialVersion: false,
          status: ArtifactApprovalStatus.PENDING,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          createdByName: userName,
          approvedAt: null,
          approvedBy: null,
          approvedByName: null,
        }

        // Buscar tipo de artefato JSON
        const artifactTypes = await getArtifactTypes(
          this.config.baseUrl,
          this.config.accessToken,
          this.config.licenseId,
          this.config.namespaceId
        )
        const jsonType = artifactTypes.find(
          (t: { name: string }) => t.name === 'JSON'
        )

        if (!jsonType) {
          throw new Error('Tipo de artefato JSON não encontrado')
        }

        await this.artifactService.create({
          key,
          value: JSON.stringify(newData),
          description: `${getDocumentTypeName(documentType)} - v1.0.0`,
          type: 'JSON',
          artifactTypeId: jsonType.id,
          accessibility: ArtifactAccessibility.NAMESPACE,
          secret: false,
          tags: `sda,document,${documentType},${initiativeSlug}`,
          version: '1.0.0',
        })

        console.log(
          `[DocumentArtifactService.saveDocument] ✅ Novo documento criado`
        )

        return {
          success: true,
          data: newData,
        }
      }
    } catch (error) {
      console.error('[DocumentArtifactService.saveDocument] ❌ Erro:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Falha ao salvar documento',
      }
    }
  }

  /**
   * Aprova um documento
   */
  async approveDocument(
    initiativeSlug: string,
    documentType: DocumentType,
    userId: string,
    userName: string
  ): Promise<OperationResult<DocumentArtifactData>> {
    try {
      console.log(
        `[DocumentArtifactService.approveDocument] Aprovando ${documentType} para ${initiativeSlug}`
      )

      const result = await this.getByType(initiativeSlug, documentType)

      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Documento não encontrado',
        }
      }

      const data = result.data
      const now = new Date().toISOString()

      // Atualizar status
      data.status = ArtifactApprovalStatus.APPROVED
      data.approvedAt = now
      data.approvedBy = userId
      data.approvedByName = userName
      data.updatedAt = now

      // Buscar ID do artefato
      const { artifactId } = await this.exists(initiativeSlug, documentType)

      if (!artifactId) {
        return {
          success: false,
          error: 'Artefato não encontrado',
        }
      }

      await this.artifactService.update({
        id: artifactId,
        value: JSON.stringify(data),
        description: `${getDocumentTypeName(documentType)} - v${data.version} (Aprovado)`,
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
      })

      console.log(
        `[DocumentArtifactService.approveDocument] ✅ Documento aprovado`
      )

      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error('[DocumentArtifactService.approveDocument] ❌ Erro:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Falha ao aprovar documento',
      }
    }
  }

  /**
   * Rejeita um documento
   */
  async rejectDocument(
    initiativeSlug: string,
    documentType: DocumentType,
    reason?: string
  ): Promise<OperationResult<DocumentArtifactData>> {
    try {
      console.log(
        `[DocumentArtifactService.rejectDocument] Rejeitando ${documentType} para ${initiativeSlug}`
      )

      const result = await this.getByType(initiativeSlug, documentType)

      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Documento não encontrado',
        }
      }

      const data = result.data
      const now = new Date().toISOString()

      // Atualizar status
      data.status = ArtifactApprovalStatus.REJECTED
      data.updatedAt = now

      // Buscar ID do artefato
      const { artifactId } = await this.exists(initiativeSlug, documentType)

      if (!artifactId) {
        return {
          success: false,
          error: 'Artefato não encontrado',
        }
      }

      await this.artifactService.update({
        id: artifactId,
        value: JSON.stringify(data),
        description: `${getDocumentTypeName(documentType)} - v${data.version} (Rejeitado${reason ? `: ${reason}` : ''})`,
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
      })

      console.log(
        `[DocumentArtifactService.rejectDocument] ✅ Documento rejeitado`
      )

      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error('[DocumentArtifactService.rejectDocument] ❌ Erro:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Falha ao rejeitar documento',
      }
    }
  }

  /**
   * Lista os documentos de uma iniciativa
   * Busca APENAS os artefatos que estão na lista approvedArtifacts da iniciativa
   * (armazenada no JSON initiative-{slug})
   */
  async listByInitiative(
    initiativeSlug: string
  ): Promise<OperationResult<DocumentArtifactData[]>> {
    try {
      console.log(
        `[DocumentArtifactService.listByInitiative] 📄 Listando documentos da iniciativa: ${initiativeSlug}`
      )

      const documents: DocumentArtifactData[] = []

      // 1. Primeiro, buscar a iniciativa para pegar a lista de artefatos aprovados
      const initiativeKey = `initiative-${initiativeSlug}`
      let approvedArtifactKeys: string[] = []

      try {
        const initiativeArtifact =
          await this.artifactService.getByKeyWithLatestVersion(initiativeKey)
        const initiativeData = JSON.parse(initiativeArtifact.value || '{}')

        // Extrair as keys dos artefatos aprovados que são documentos (começam com "document-")
        if (
          initiativeData.approvedArtifacts &&
          Array.isArray(initiativeData.approvedArtifacts)
        ) {
          approvedArtifactKeys = initiativeData.approvedArtifacts
            .filter((ref: { artifactKey?: string }) =>
              ref.artifactKey?.startsWith('document-')
            )
            .map((ref: { artifactKey: string }) => ref.artifactKey)

          console.log(
            `[DocumentArtifactService.listByInitiative] 📋 Artefatos de documentos na iniciativa:`,
            {
              totalApproved: initiativeData.approvedArtifacts.length,
              documentArtifacts: approvedArtifactKeys.length,
              keys: approvedArtifactKeys,
            }
          )
        }
      } catch (initiativeError) {
        console.warn(
          `[DocumentArtifactService.listByInitiative] ⚠️ Não foi possível carregar iniciativa ${initiativeKey}:`,
          initiativeError
        )
        // Se não conseguir carregar a iniciativa, retorna lista vazia
        return {
          success: true,
          data: [],
        }
      }

      // 2. Se não há artefatos aprovados na iniciativa, retorna lista vazia
      if (approvedArtifactKeys.length === 0) {
        console.log(
          `[DocumentArtifactService.listByInitiative] ℹ️ Nenhum documento aprovado na iniciativa`
        )
        return {
          success: true,
          data: [],
        }
      }

      // 3. Buscar cada artefato aprovado pelo seu key
      for (const artifactKey of approvedArtifactKeys) {
        try {
          // Extrair tipo do documento da key (document-{slug}-{type})
          const keyParts = artifactKey.split('-')
          const docType = keyParts[keyParts.length - 1] as DocumentType

          console.log(
            `[DocumentArtifactService.listByInitiative] 🔍 Buscando artefato: ${artifactKey} (tipo: ${docType})`
          )

          // Buscar o artefato pelo key
          const artifact =
            await this.artifactService.getByKeyWithLatestVersion(artifactKey)

          // Tentar parsear como DocumentArtifactData
          try {
            const data = JSON.parse(
              artifact.value || '{}'
            ) as DocumentArtifactData

            // Garantir que tem os campos necessários
            const documentData: DocumentArtifactData = {
              id: data.id || artifact.id,
              initiativeId: data.initiativeId || artifact.id,
              initiativeSlug: data.initiativeSlug || initiativeSlug,
              documentType: data.documentType || docType,
              documentName: data.documentName || getDocumentTypeName(docType),
              content: data.content || artifact.value || '',
              version: data.version || artifact.version || '1.0.0',
              hasOfficialVersion: data.hasOfficialVersion || false,
              status: data.status || ('approved' as ArtifactApprovalStatus),
              createdAt:
                data.createdAt ||
                artifact.createdAt ||
                new Date().toISOString(),
              updatedAt:
                data.updatedAt ||
                artifact.updatedAt ||
                new Date().toISOString(),
              createdBy: data.createdBy,
              createdByName: data.createdByName,
              approvedAt: data.approvedAt,
              approvedBy: data.approvedBy,
              approvedByName: data.approvedByName,
            }

            documents.push(documentData)

            console.log(
              `[DocumentArtifactService.listByInitiative] ✅ Documento carregado:`,
              {
                key: artifactKey,
                type: documentData.documentType,
                name: documentData.documentName,
                status: documentData.status,
              }
            )
          } catch {
            // Se não conseguir parsear como DocumentArtifactData, criar estrutura básica
            console.warn(
              `[DocumentArtifactService.listByInitiative] ⚠️ Artefato ${artifactKey} não é DocumentArtifactData, usando estrutura básica`
            )

            const documentData: DocumentArtifactData = {
              id: artifact.id,
              initiativeId: artifact.id,
              initiativeSlug: initiativeSlug,
              documentType: docType,
              documentName: getDocumentTypeName(docType),
              content: artifact.value || '',
              version: artifact.version || '1.0.0',
              hasOfficialVersion: false,
              status: 'approved' as ArtifactApprovalStatus,
              createdAt: artifact.createdAt || new Date().toISOString(),
              updatedAt: artifact.updatedAt || new Date().toISOString(),
            }
            documents.push(documentData)
          }
        } catch (artifactError) {
          console.warn(
            `[DocumentArtifactService.listByInitiative] ⚠️ Erro ao buscar artefato ${artifactKey}:`,
            artifactError
          )
          // Continua para o próximo artefato
        }
      }

      console.log(
        `[DocumentArtifactService.listByInitiative] ✅ Total de documentos carregados: ${documents.length}`
      )

      return {
        success: true,
        data: documents,
      }
    } catch (error) {
      console.error(
        '[DocumentArtifactService.listByInitiative] ❌ Erro:',
        error
      )
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Falha ao listar documentos',
      }
    }
  }

  /**
   * Promove uma versão ESPECÍFICA do documento para versão oficial
   * Busca o conteúdo da versão selecionada e cria uma nova versão oficial com esse conteúdo
   */
  async promoteSpecificVersionToOfficial(
    initiativeSlug: string,
    documentType: DocumentType,
    versionId: string,
    userId: string,
    userName: string
  ): Promise<OperationResult<DocumentArtifactData>> {
    try {
      console.log(
        `[DocumentArtifactService.promoteSpecificVersionToOfficial] Promovendo versão ${versionId} do ${documentType} para oficial`
      )

      // Buscar todas as versões para encontrar a específica
      const versionsResult = await this.getAllVersionsByType(
        initiativeSlug,
        documentType
      )

      if (!versionsResult.success || !versionsResult.data) {
        return {
          success: false,
          error: 'Não foi possível buscar versões do documento',
        }
      }

      // Encontrar a versão específica
      const targetVersion = versionsResult.data.find(v => v.id === versionId)

      if (!targetVersion) {
        console.error(
          `[DocumentArtifactService.promoteSpecificVersionToOfficial] Versão ${versionId} não encontrada`
        )
        return {
          success: false,
          error: 'Versão não encontrada',
        }
      }

      console.log(
        `[DocumentArtifactService.promoteSpecificVersionToOfficial] Versão encontrada:`,
        {
          id: targetVersion.id,
          version: targetVersion.version,
          contentLength: targetVersion.content?.length || 0,
        }
      )

      const now = new Date().toISOString()

      // Criar dados para a nova versão oficial com o conteúdo da versão selecionada
      const newVersion = this.bumpMinorVersion(targetVersion.version)

      const data: DocumentArtifactData = {
        id: targetVersion.artifactId,
        documentType,
        documentName:
          targetVersion.documentName || getDocumentTypeName(documentType),
        content: targetVersion.content, // Usar o conteúdo da versão selecionada!
        version: newVersion,
        hasOfficialVersion: true,
        status: ArtifactApprovalStatus.APPROVED,
        createdAt: targetVersion.createdAt,
        createdBy: targetVersion.createdBy,
        createdByName: targetVersion.createdByName,
        updatedAt: now,
        approvedAt: now,
        approvedBy: userId,
        approvedByName: userName,
        // NOVO: Referência à versão pai (versão que foi promovida)
        parentVersionId: targetVersion.id,
        parentVersion: targetVersion.version,
      }

      // Buscar ID do artefato
      const { artifactId } = await this.exists(initiativeSlug, documentType)

      if (!artifactId) {
        return {
          success: false,
          error: 'Artefato não encontrado',
        }
      }

      await this.artifactService.update({
        id: artifactId,
        value: JSON.stringify(data),
        description: `${getDocumentTypeName(documentType)} - v${newVersion} (Versão Oficial - baseada em v${targetVersion.version})`,
        version: newVersion,
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
      })

      console.log(
        `[DocumentArtifactService.promoteSpecificVersionToOfficial] ✅ Versão ${targetVersion.version} promovida para oficial como v${newVersion}`
      )

      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error(
        '[DocumentArtifactService.promoteSpecificVersionToOfficial] ❌ Erro:',
        error
      )
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Falha ao promover versão específica para oficial',
      }
    }
  }

  /**
   * Promove documento para versão oficial (versão mais recente)
   * Cria uma nova versão com hasOfficialVersion: true
   * @deprecated Use promoteSpecificVersionToOfficial para promover uma versão específica
   */
  async promoteToOfficialVersion(
    initiativeSlug: string,
    documentType: DocumentType,
    userId: string,
    userName: string
  ): Promise<OperationResult<DocumentArtifactData>> {
    try {
      console.log(
        `[DocumentArtifactService.promoteToOfficialVersion] Promovendo ${documentType} para versão oficial`
      )

      const result = await this.getByType(initiativeSlug, documentType)

      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Documento não encontrado',
        }
      }

      const data = result.data
      const now = new Date().toISOString()

      // Incrementar versão (minor bump para versão oficial)
      const newVersion = this.bumpMinorVersion(data.version)

      // Atualizar dados para versão oficial
      data.version = newVersion
      data.hasOfficialVersion = true
      data.status = ArtifactApprovalStatus.APPROVED
      data.approvedAt = now
      data.approvedBy = userId
      data.approvedByName = userName
      data.updatedAt = now

      // Buscar ID do artefato
      const { artifactId } = await this.exists(initiativeSlug, documentType)

      if (!artifactId) {
        return {
          success: false,
          error: 'Artefato não encontrado',
        }
      }

      await this.artifactService.update({
        id: artifactId,
        value: JSON.stringify(data),
        description: `${getDocumentTypeName(documentType)} - v${newVersion} (Versão Oficial)`,
        version: newVersion,
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
      })

      console.log(
        `[DocumentArtifactService.promoteToOfficialVersion] ✅ Documento promovido para versão oficial v${newVersion}`
      )

      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error(
        '[DocumentArtifactService.promoteToOfficialVersion] ❌ Erro:',
        error
      )
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Falha ao promover documento para versão oficial',
      }
    }
  }

  /**
   * Busca todas as versões de um documento por tipo
   * Retorna array ordenado por data (mais recente primeiro)
   */
  async getAllVersionsByType(
    initiativeSlug: string,
    documentType: DocumentType
  ): Promise<OperationResult<DocumentVersionInfo[]>> {
    try {
      const key = getDocumentKey(initiativeSlug, documentType)
      console.log(
        `[DocumentArtifactService.getAllVersionsByType] 🔍 Buscando versões para: ${key}`
      )

      // Primeiro busca o artefato para pegar o ID
      const artifact = await this.artifactService.getByKey(key)

      if (!artifact) {
        return {
          success: false,
          error: 'Documento não encontrado',
        }
      }

      // Busca todas as versões usando o ID do artefato
      const versions = await this.artifactService.getVersionsByArtifactId(
        artifact.id
      )

      console.log(
        `[DocumentArtifactService.getAllVersionsByType] 📄 ${versions.length} versões encontradas`
      )

      // Mapeia as versões para o formato DocumentVersionInfo
      const versionInfos: DocumentVersionInfo[] = versions.map(v => {
        let parsedData: Partial<DocumentArtifactData> = {}
        try {
          parsedData = JSON.parse(v.value || '{}')
        } catch {
          console.warn(
            `[DocumentArtifactService.getAllVersionsByType] ⚠️ Erro ao parsear versão ${v.version}`
          )
        }

        return {
          id: v.id,
          artifactId: v.artifactId,
          version: v.version || parsedData.version || '1.0.0',
          hasOfficialVersion: parsedData.hasOfficialVersion || false,
          status: parsedData.status || ArtifactApprovalStatus.PENDING,
          createdAt: v.createdAt || parsedData.createdAt || '',
          createdBy: v.createdBy || parsedData.createdBy || '',
          createdByName: v.createdByName || parsedData.createdByName || '',
          isProduction: v.isProduction || false,
          content: parsedData.content || '',
          documentName:
            parsedData.documentName || getDocumentTypeName(documentType),
          // NOVO: Incluir referência à versão pai
          parentVersionId: parsedData.parentVersionId || null,
          parentVersion: parsedData.parentVersion || null,
        }
      })

      // Ordena por data (mais recente primeiro)
      versionInfos.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })

      console.log(
        `[DocumentArtifactService.getAllVersionsByType] ✅ Versões ordenadas:`,
        versionInfos.map(v => ({
          version: v.version,
          hasOfficialVersion: v.hasOfficialVersion,
          createdAt: v.createdAt,
        }))
      )

      return {
        success: true,
        data: versionInfos,
      }
    } catch (error) {
      console.error(
        '[DocumentArtifactService.getAllVersionsByType] ❌ Erro:',
        error
      )
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Falha ao buscar versões do documento',
      }
    }
  }

  /**
   * Busca a versão oficial mais recente de um documento
   * Filtra versões com hasOfficialVersion: true e retorna a mais recente
   */
  async getLatestOfficialVersion(
    initiativeSlug: string,
    documentType: DocumentType
  ): Promise<OperationResult<DocumentVersionInfo | null>> {
    try {
      console.log(
        `[DocumentArtifactService.getLatestOfficialVersion] 🔍 Buscando versão oficial mais recente para ${documentType}`
      )

      const versionsResult = await this.getAllVersionsByType(
        initiativeSlug,
        documentType
      )

      if (!versionsResult.success || !versionsResult.data) {
        return {
          success: false,
          error: versionsResult.error || 'Falha ao buscar versões',
        }
      }

      // Filtra apenas versões oficiais
      const officialVersions = versionsResult.data.filter(
        v => v.hasOfficialVersion === true
      )

      if (officialVersions.length === 0) {
        console.log(
          '[DocumentArtifactService.getLatestOfficialVersion] ℹ️ Nenhuma versão oficial encontrada'
        )
        return {
          success: true,
          data: null,
        }
      }

      // A primeira é a mais recente (já está ordenado por data desc)
      const latestOfficial = officialVersions[0]

      console.log(
        `[DocumentArtifactService.getLatestOfficialVersion] ✅ Versão oficial mais recente: ${latestOfficial.version}`
      )

      return {
        success: true,
        data: latestOfficial,
      }
    } catch (error) {
      console.error(
        '[DocumentArtifactService.getLatestOfficialVersion] ❌ Erro:',
        error
      )
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Falha ao buscar versão oficial',
      }
    }
  }

  /**
   * Incrementa versão (patch)
   */
  private bumpVersion(version: string): string {
    const parts = String(version).split('.')
    if (parts.length !== 3) {
      return '1.0.1'
    }
    const patch = parseInt(parts[2] || '0', 10) || 0
    return `${parts[0]}.${parts[1]}.${patch + 1}`
  }

  /**
   * Incrementa versão (minor) - usado para versões oficiais
   */
  private bumpMinorVersion(version: string): string {
    const parts = String(version).split('.')
    if (parts.length !== 3) {
      return '1.1.0'
    }
    const minor = parseInt(parts[1] || '0', 10) || 0
    return `${parts[0]}.${minor + 1}.0`
  }

  /**
   * Agrupa versões por família (hierarquia de promoções)
   * Versões oficiais apontam para suas versões pai, formando uma cadeia
   *
   * @returns Array de famílias, cada uma com a versão principal e seus filhos (promoções)
   */
  groupVersionsByFamily(versions: DocumentVersionInfo[]): VersionFamily[] {
    if (!versions || versions.length === 0) {
      return []
    }

    // Criar mapa de versões por ID para lookup rápido
    const versionsById = new Map<string, DocumentVersionInfo>()
    for (const v of versions) {
      versionsById.set(v.id, v)
    }

    // Identificar versões que são filhos (têm parentVersionId)
    const childVersionIds = new Set<string>()
    for (const v of versions) {
      if (v.parentVersionId) {
        childVersionIds.add(v.id)
      }
    }

    // Construir famílias a partir de versões raiz (que não são filhos)
    const families: VersionFamily[] = []
    const processedIds = new Set<string>()

    // Ordenar versões por data (mais recente primeiro)
    const sortedVersions = [...versions].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })

    for (const version of sortedVersions) {
      if (processedIds.has(version.id)) continue

      // Se esta versão é oficial e tem pai, encontrar a raiz da família
      let rootVersion = version
      let currentVersion: DocumentVersionInfo | undefined = version

      // Subir na hierarquia para encontrar a raiz
      while (currentVersion?.parentVersionId) {
        const parent = versionsById.get(currentVersion.parentVersionId)
        if (parent && !processedIds.has(parent.id)) {
          rootVersion = parent
          currentVersion = parent
        } else {
          break
        }
      }

      // Coletar todos os filhos (promoções) desta raiz
      const children: DocumentVersionInfo[] = []
      const collectChildren = (parentId: string) => {
        for (const v of versions) {
          if (v.parentVersionId === parentId && !processedIds.has(v.id)) {
            children.push(v)
            processedIds.add(v.id)
            collectChildren(v.id) // Recursivamente coletar filhos dos filhos
          }
        }
      }

      processedIds.add(rootVersion.id)
      collectChildren(rootVersion.id)

      // Ordenar filhos por data (mais recente primeiro)
      children.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })

      // Determinar qual é a versão "atual" (mais recente oficial ou a raiz se não há oficiais)
      const officialChildren = children.filter(c => c.hasOfficialVersion)
      const currentOfficialVersion =
        officialChildren.length > 0
          ? officialChildren[0] // Mais recente oficial
          : rootVersion.hasOfficialVersion
            ? rootVersion
            : null

      families.push({
        id: rootVersion.id,
        rootVersion,
        currentVersion: currentOfficialVersion || rootVersion,
        promotionHistory: children,
        hasOfficialVersion:
          rootVersion.hasOfficialVersion ||
          children.some(c => c.hasOfficialVersion),
      })
    }

    // Ordenar famílias pela versão mais recente
    families.sort((a, b) => {
      const dateA = a.currentVersion.createdAt
        ? new Date(a.currentVersion.createdAt).getTime()
        : 0
      const dateB = b.currentVersion.createdAt
        ? new Date(b.currentVersion.createdAt).getTime()
        : 0
      return dateB - dateA
    })

    console.log(
      `[DocumentArtifactService.groupVersionsByFamily] ✅ ${families.length} famílias criadas:`,
      families.map(f => ({
        rootVersion: f.rootVersion.version,
        currentVersion: f.currentVersion.version,
        promotionCount: f.promotionHistory.length,
        hasOfficialVersion: f.hasOfficialVersion,
      }))
    )

    return families
  }
}

/** Interface para família de versões (agrupamento hierárquico) */
export interface VersionFamily {
  /** ID único da família (ID da versão raiz) */
  id: string
  /** Versão raiz (primeira versão, não promovida) */
  rootVersion: DocumentVersionInfo
  /** Versão atual (mais recente oficial, ou raiz se não há oficiais) */
  currentVersion: DocumentVersionInfo
  /** Histórico de promoções (versões oficiais derivadas) */
  promotionHistory: DocumentVersionInfo[]
  /** Se a família tem pelo menos uma versão oficial */
  hasOfficialVersion: boolean
}
