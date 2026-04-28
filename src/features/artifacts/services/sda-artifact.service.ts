/**
 * SDA Artifact Service
 *
 * Serviço para gerenciamento de artefatos/documentos do SDA
 * Inclui lógica de aprovação e versionamento
 *
 * Nomenclatura: artifact/{initiative-slug}/{artifact-name}
 */

import { v4 as uuidv4 } from 'uuid'

import {
  ApprovedArtifactRef,
  ArtifactApprovalStatus,
  OperationResult,
  SDArtifactCreateDto,
  SDArtifactDto,
  SDArtifactVersion,
  SDAServiceConfig,
} from '../types/sda-artifacts.types'
import {
  ArtifactAccessibility,
  ArtifactCreateDto,
  ArtifactService,
  ArtifactUpdateDto,
} from './artifact.service'
import { ChatHistoryService } from './chat-history.service'
import { getArtifactKey, InitiativeService } from './initiative.service'

// ============================================================================
// VERSION UTILITIES
// ============================================================================

/**
 * Incrementa versão seguindo SemVer
 * @param currentVersion Versão atual (ex: "1.2.3")
 * @param type Tipo de bump: "major", "minor" ou "patch"
 */
export function bumpVersion(
  currentVersion: string,
  type: 'major' | 'minor' | 'patch' = 'patch'
): string {
  const parts = String(currentVersion).split('.').map(Number)
  const [major = 1, minor = 0, patch = 0] = parts

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`
  }
}

// ============================================================================
// SDA ARTIFACT SERVICE
// ============================================================================

export class SDArtifactService {
  private artifactService: ArtifactService
  private initiativeService: InitiativeService
  private chatHistoryService: ChatHistoryService
  private config: SDAServiceConfig

  constructor(config: SDAServiceConfig) {
    this.config = config
    this.artifactService = new ArtifactService({
      baseUrl: config.baseUrl,
      accessToken: config.accessToken,
      licenseId: config.licenseId,
      namespaceId: config.namespaceId,
    })
    this.initiativeService = new InitiativeService(config)
    this.chatHistoryService = new ChatHistoryService(config)
  }

  /**
   * Cria um novo artefato SDA
   */
  async create(
    data: SDArtifactCreateDto
  ): Promise<OperationResult<SDArtifactDto>> {
    try {
      const now = new Date().toISOString()
      const artifactId = uuidv4()
      const key = getArtifactKey(data.initiativeSlug, data.name)

      // Primeira versão
      const initialVersion: SDArtifactVersion = {
        version: '1.0.0',
        createdAt: now,
        createdBy: this.config.userId,
        createdByName: this.config.userName,
        isProduction: false,
        changelog: 'Versão inicial',
      }

      // Dados do artefato SDA
      const sdaArtifact: SDArtifactDto = {
        id: artifactId,
        key,
        name: data.name,
        description: data.description,
        type: data.type,
        initiativeId: '', // Será preenchido se necessário
        initiativeSlug: data.initiativeSlug,
        content: data.content,
        contentType: data.contentType,
        version: '1.0.0',
        versionHistory: [initialVersion],
        status: ArtifactApprovalStatus.PENDING,
        approvedAt: null,
        approvedBy: null,
        approvedByName: null,
        metadata: data.metadata,
        tags: data.tags || [],
        createdAt: now,
        updatedAt: now,
      }

      // Cria artefato no Cockpit
      const createDto: ArtifactCreateDto = {
        key,
        description: data.description,
        value: JSON.stringify(sdaArtifact, null, 2),
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
        type: data.type,
        secret: false,
        tags: [
          'sda',
          'artifact',
          data.initiativeSlug,
          ...(data.tags || []),
        ].join(','),
        version: '1.0.0',
      }

      console.log('[SDArtifactService] Creating artifact:', key)
      await this.artifactService.create(createDto)

      return {
        success: true,
        data: sdaArtifact,
      }
    } catch (error) {
      console.error('[SDArtifactService] Error creating artifact:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create artifact',
      }
    }
  }

  /**
   * Obtém um artefato pelo key
   */
  async getByKey(key: string): Promise<OperationResult<SDArtifactDto>> {
    try {
      console.log('[SDArtifactService] Getting artifact by key:', key)

      const artifact = await this.artifactService.getByKey(key)
      const sdaArtifact = JSON.parse(artifact.value || '{}') as SDArtifactDto

      return {
        success: true,
        data: sdaArtifact,
      }
    } catch (error) {
      console.error('[SDArtifactService] Error getting artifact:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get artifact',
      }
    }
  }

  /**
   * Lista artefatos de uma iniciativa
   */
  async listByInitiative(
    initiativeSlug: string
  ): Promise<OperationResult<SDArtifactDto[]>> {
    try {
      // Usa 'artifact-{slug}-' com hífen (novo formato)
      const prefix = `artifact-${initiativeSlug}-`
      console.log(
        '[SDArtifactService] Listing artifacts for initiative:',
        initiativeSlug
      )

      const result = await this.artifactService.getAll({
        search: prefix,
        pageSize: 100,
      })

      const artifacts: SDArtifactDto[] = result.items
        .filter(item => item.key.startsWith(prefix))
        .map(item => JSON.parse(item.value || '{}') as SDArtifactDto)

      return {
        success: true,
        data: artifacts,
      }
    } catch (error) {
      console.error('[SDArtifactService] Error listing artifacts:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to list artifacts',
      }
    }
  }

  /**
   * Aprova um artefato
   * - Atualiza status para "approved"
   * - Cria nova versão marcada como production
   * - Atualiza histórico de chat
   * - Adiciona referência na iniciativa
   */
  async approve(
    initiativeSlug: string,
    artifactKey: string,
    options?: {
      messageId?: string
      changelog?: string
      versionBump?: 'major' | 'minor' | 'patch'
    }
  ): Promise<OperationResult<SDArtifactDto>> {
    try {
      console.log('[SDArtifactService] Approving artifact:', artifactKey)

      // Busca artefato atual
      const artifactResult = await this.getByKey(artifactKey)
      if (!artifactResult.success || !artifactResult.data) {
        return {
          success: false,
          error: 'Artifact not found',
        }
      }

      const artifact = artifactResult.data
      const now = new Date().toISOString()

      // Calcula nova versão
      const newVersion = bumpVersion(
        artifact.version,
        options?.versionBump || 'patch'
      )

      // Marca versões anteriores como não-production
      artifact.versionHistory = artifact.versionHistory.map(v => ({
        ...v,
        isProduction: false,
      }))

      // Adiciona nova versão
      const newVersionEntry: SDArtifactVersion = {
        version: newVersion,
        createdAt: now,
        createdBy: this.config.userId,
        createdByName: this.config.userName,
        isProduction: true,
        changelog: options?.changelog || 'Artefato aprovado',
      }

      artifact.versionHistory.push(newVersionEntry)
      artifact.version = newVersion
      artifact.status = ArtifactApprovalStatus.APPROVED
      artifact.approvedAt = now
      artifact.approvedBy = this.config.userId
      artifact.approvedByName = this.config.userName
      artifact.updatedAt = now

      // Salva artefato atualizado - seguindo padrão cockpit-portal
      // NÃO enviar: key, type, artifactTypeId
      const existingArtifact = await this.artifactService.getByKey(artifactKey)

      const updateDto: ArtifactUpdateDto = {
        id: existingArtifact.id,
        value: JSON.stringify(artifact, null, 2),
        description: artifact.description,
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
        version: newVersion,
      }

      await this.artifactService.update(updateDto)

      // Atualiza histórico de chat se messageId fornecido
      if (options?.messageId) {
        await this.chatHistoryService.updateArtifactStatus(
          initiativeSlug,
          options.messageId,
          ArtifactApprovalStatus.APPROVED,
          { userId: this.config.userId, userName: this.config.userName }
        )
      }

      // Adiciona referência na iniciativa
      const artifactRef: ApprovedArtifactRef = {
        artifactId: artifact.id,
        artifactKey: artifact.key,
        artifactName: artifact.name,
        artifactType: artifact.type,
        version: newVersion,
        approvedAt: now,
        approvedBy: this.config.userId,
        approvedByName: this.config.userName,
      }

      await this.initiativeService.addApprovedArtifact(
        initiativeSlug,
        artifactRef
      )

      console.log(
        '[SDArtifactService] Artifact approved:',
        artifactKey,
        'v' + newVersion
      )

      return {
        success: true,
        data: artifact,
      }
    } catch (error) {
      console.error('[SDArtifactService] Error approving artifact:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to approve artifact',
      }
    }
  }

  /**
   * Rejeita um artefato
   */
  async reject(
    initiativeSlug: string,
    artifactKey: string,
    reason: string,
    messageId?: string
  ): Promise<OperationResult<SDArtifactDto>> {
    try {
      console.log('[SDArtifactService] Rejecting artifact:', artifactKey)

      // Busca artefato atual
      const artifactResult = await this.getByKey(artifactKey)
      if (!artifactResult.success || !artifactResult.data) {
        return {
          success: false,
          error: 'Artifact not found',
        }
      }

      const artifact = artifactResult.data
      const now = new Date().toISOString()

      // Atualiza status
      artifact.status = ArtifactApprovalStatus.REJECTED
      artifact.updatedAt = now

      // Salva artefato atualizado - seguindo padrão cockpit-portal
      // NÃO enviar: key, type, artifactTypeId
      const existingArtifact = await this.artifactService.getByKey(artifactKey)

      const updateDto: ArtifactUpdateDto = {
        id: existingArtifact.id,
        value: JSON.stringify(artifact, null, 2),
        description: artifact.description,
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
      }

      await this.artifactService.update(updateDto)

      // Atualiza histórico de chat se messageId fornecido
      if (messageId) {
        await this.chatHistoryService.updateArtifactStatus(
          initiativeSlug,
          messageId,
          ArtifactApprovalStatus.REJECTED,
          undefined,
          reason
        )
      }

      console.log('[SDArtifactService] Artifact rejected:', artifactKey)

      return {
        success: true,
        data: artifact,
      }
    } catch (error) {
      console.error('[SDArtifactService] Error rejecting artifact:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to reject artifact',
      }
    }
  }

  /**
   * Atualiza conteúdo de um artefato (cria nova versão)
   */
  async updateContent(
    artifactKey: string,
    newContent: string,
    changelog: string,
    versionBump: 'major' | 'minor' | 'patch' = 'patch'
  ): Promise<OperationResult<SDArtifactDto>> {
    try {
      console.log('[SDArtifactService] Updating artifact content:', artifactKey)

      const artifactResult = await this.getByKey(artifactKey)
      if (!artifactResult.success || !artifactResult.data) {
        return {
          success: false,
          error: 'Artifact not found',
        }
      }

      const artifact = artifactResult.data
      const now = new Date().toISOString()

      // Calcula nova versão
      const newVersion = bumpVersion(artifact.version, versionBump)

      // Adiciona nova versão ao histórico
      const newVersionEntry: SDArtifactVersion = {
        version: newVersion,
        createdAt: now,
        createdBy: this.config.userId,
        createdByName: this.config.userName,
        isProduction: false,
        changelog,
      }

      artifact.versionHistory.push(newVersionEntry)
      artifact.version = newVersion
      artifact.content = newContent
      artifact.updatedAt = now
      artifact.status = ArtifactApprovalStatus.PENDING // Volta para pending após edição

      // Salva artefato atualizado - seguindo padrão cockpit-portal
      // NÃO enviar: key, type, artifactTypeId
      const existingArtifact = await this.artifactService.getByKey(artifactKey)

      const updateDto: ArtifactUpdateDto = {
        id: existingArtifact.id,
        value: JSON.stringify(artifact, null, 2),
        description: artifact.description,
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
        version: newVersion,
      }

      await this.artifactService.update(updateDto)

      console.log(
        '[SDArtifactService] Artifact content updated:',
        artifactKey,
        'v' + newVersion
      )

      return {
        success: true,
        data: artifact,
      }
    } catch (error) {
      console.error(
        '[SDArtifactService] Error updating artifact content:',
        error
      )
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update artifact content',
      }
    }
  }

  /**
   * Obtém histórico de versões de um artefato
   */
  async getVersionHistory(
    artifactKey: string
  ): Promise<OperationResult<SDArtifactVersion[]>> {
    try {
      const artifactResult = await this.getByKey(artifactKey)
      if (!artifactResult.success || !artifactResult.data) {
        return {
          success: false,
          error: 'Artifact not found',
        }
      }

      return {
        success: true,
        data: artifactResult.data.versionHistory,
      }
    } catch (error) {
      console.error('[SDArtifactService] Error getting version history:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get version history',
      }
    }
  }

  /**
   * Define uma versão específica como production
   */
  async setProductionVersion(
    artifactKey: string,
    version: string
  ): Promise<OperationResult<SDArtifactDto>> {
    try {
      console.log(
        '[SDArtifactService] Setting production version:',
        artifactKey,
        version
      )

      const artifactResult = await this.getByKey(artifactKey)
      if (!artifactResult.success || !artifactResult.data) {
        return {
          success: false,
          error: 'Artifact not found',
        }
      }

      const artifact = artifactResult.data

      // Verifica se a versão existe
      const versionExists = artifact.versionHistory.some(
        v => v.version === version
      )
      if (!versionExists) {
        return {
          success: false,
          error: `Version ${version} not found`,
        }
      }

      // Atualiza flags de production
      artifact.versionHistory = artifact.versionHistory.map(v => ({
        ...v,
        isProduction: v.version === version,
      }))

      artifact.version = version
      artifact.updatedAt = new Date().toISOString()

      // Salva artefato atualizado - seguindo padrão cockpit-portal
      // NÃO enviar: key, type, artifactTypeId
      const existingArtifact = await this.artifactService.getByKey(artifactKey)

      const updateDto: ArtifactUpdateDto = {
        id: existingArtifact.id,
        value: JSON.stringify(artifact, null, 2),
        description: artifact.description,
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
        version,
      }

      await this.artifactService.update(updateDto)

      console.log(
        '[SDArtifactService] Production version set:',
        artifactKey,
        'v' + version
      )

      return {
        success: true,
        data: artifact,
      }
    } catch (error) {
      console.error(
        '[SDArtifactService] Error setting production version:',
        error
      )
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to set production version',
      }
    }
  }
}
