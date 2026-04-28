/**
 * Uploaded File Service
 *
 * Serviço para gerenciamento de arquivos de upload convertidos em artefatos
 * Quando o usuário faz upload de um arquivo de texto (na modal de criação ou clip),
 * o sistema cria um artefato para esse arquivo e registra no artefato de iniciativa.
 *
 * Nomenclatura de artefatos:
 * - Upload: upload-{initiativeSlug}-{sanitizedFileName}
 */

import { v4 as uuidv4 } from 'uuid'

import {
  ActivityRecord,
  ActivityType,
  InitiativeDto,
  OperationResult,
  SDAServiceConfig,
  UploadedFileRef,
} from '../types/sda-artifacts.types'
import {
  ArtifactAccessibility,
  ArtifactCreateDto,
  ArtifactService,
  ArtifactUpdateDto,
  getArtifactTypeId,
} from './artifact.service'
import { getInitiativeKey, slugify } from './initiative.service'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gera key do artefato de upload
 * Padrão: upload-{initiativeSlug}-{sanitizedFileName}
 */
export function getUploadedFileKey(
  initiativeSlug: string,
  fileName: string
): string {
  const sanitizedName = slugify(fileName.replace(/\.[^/.]+$/, '')) // Remove extensão antes de slugify
  return `upload-${initiativeSlug}-${sanitizedName}`
}

/**
 * Determina o tipo MIME baseado na extensão do arquivo
 */
function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    xml: 'application/xml',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    ts: 'text/typescript',
    py: 'text/x-python',
    java: 'text/x-java',
    cs: 'text/x-csharp',
    sql: 'text/x-sql',
    sh: 'text/x-shellscript',
    csv: 'text/csv',
  }
  return mimeTypes[ext] || 'text/plain'
}

// ============================================================================
// UPLOADED FILE SERVICE
// ============================================================================

export interface UploadFileInput {
  /** Nome original do arquivo */
  fileName: string
  /** Conteúdo do arquivo (texto) */
  content: string
  /** Tamanho do arquivo em bytes */
  fileSize: number
  /** Origem do upload */
  uploadSource: 'modal' | 'workspace'
}

export class UploadedFileService {
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
   * Faz upload de um arquivo como artefato e atualiza a iniciativa
   * Retorna a referência do arquivo criado
   */
  async uploadFile(
    initiativeSlug: string,
    input: UploadFileInput
  ): Promise<OperationResult<UploadedFileRef>> {
    try {
      const now = new Date().toISOString()
      const artifactKey = getUploadedFileKey(initiativeSlug, input.fileName)
      const mimeType = getMimeType(input.fileName)

      console.log(
        `[UploadedFileService] Uploading file: ${input.fileName} -> ${artifactKey}`
      )

      // Busca o artifactTypeId para o tipo STRING (arquivos de texto)
      const stringTypeId = await getArtifactTypeId(
        'string',
        this.config.baseUrl,
        this.config.accessToken,
        this.config.licenseId,
        this.config.namespaceId
      )

      if (!stringTypeId) {
        throw new Error('Artifact type "string" not found in API')
      }

      // Cria artefato do arquivo
      const fileArtifact: ArtifactCreateDto = {
        key: artifactKey,
        description: `Arquivo de upload: ${input.fileName} (iniciativa: ${initiativeSlug})`,
        value: input.content,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
        type: 'string',
        artifactTypeId: stringTypeId,
        secret: false,
        metadata: JSON.stringify({
          originalFileName: input.fileName,
          mimeType,
          fileSize: input.fileSize,
          uploadSource: input.uploadSource,
          uploadedAt: now,
        }),
        tags: ['sda', 'upload', initiativeSlug, input.uploadSource].join(','),
        version: '1.0.0',
      }

      // Cria o artefato
      const createdArtifact = await this.artifactService.create(fileArtifact)
      console.log(
        `[UploadedFileService] ✅ File artifact created: ${artifactKey}`
      )

      // Cria a referência do arquivo
      const uploadedFileRef: UploadedFileRef = {
        artifactId: createdArtifact.id,
        artifactKey,
        originalFileName: input.fileName,
        mimeType,
        fileSize: input.fileSize,
        uploadedAt: now,
        uploadedBy: this.config.userId,
        uploadedByName: this.config.userName,
        uploadSource: input.uploadSource,
      }

      // Atualiza a iniciativa com a referência do arquivo
      await this.addFileToInitiative(initiativeSlug, uploadedFileRef)

      return {
        success: true,
        data: uploadedFileRef,
      }
    } catch (error) {
      console.error('[UploadedFileService] Error uploading file:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      }
    }
  }

  /**
   * Faz upload de múltiplos arquivos
   */
  async uploadFiles(
    initiativeSlug: string,
    inputs: UploadFileInput[]
  ): Promise<OperationResult<UploadedFileRef[]>> {
    try {
      const results: UploadedFileRef[] = []
      const errors: string[] = []

      for (const input of inputs) {
        const result = await this.uploadFile(initiativeSlug, input)
        if (result.success && result.data) {
          results.push(result.data)
        } else {
          errors.push(`${input.fileName}: ${result.error}`)
        }
      }

      if (errors.length > 0 && results.length === 0) {
        return {
          success: false,
          error: `Failed to upload files: ${errors.join(', ')}`,
        }
      }

      console.log(
        `[UploadedFileService] ✅ Uploaded ${results.length}/${inputs.length} files`
      )

      return {
        success: true,
        data: results,
      }
    } catch (error) {
      console.error('[UploadedFileService] Error uploading files:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to upload files',
      }
    }
  }

  /**
   * Adiciona referência de arquivo à iniciativa (atualiza versão)
   */
  private async addFileToInitiative(
    initiativeSlug: string,
    fileRef: UploadedFileRef
  ): Promise<void> {
    try {
      const initiativeKey = getInitiativeKey(initiativeSlug)
      console.log(
        `[UploadedFileService] Adding file ref to initiative: ${initiativeKey}`
      )

      // Busca a iniciativa atual
      const artifact =
        await this.artifactService.getByKeyWithLatestVersion(initiativeKey)
      const initiative = JSON.parse(artifact.value || '{}') as InitiativeDto

      const now = new Date().toISOString()

      // Adiciona arquivo à lista
      const uploadedFiles = initiative.uploadedFiles || []
      uploadedFiles.push(fileRef)

      // Cria registro de atividade
      const activity: ActivityRecord = {
        id: uuidv4(),
        type: ActivityType.UPLOAD_FILE,
        description: `Upload de arquivo: ${fileRef.originalFileName}`,
        timestamp: now,
        userId: this.config.userId,
        userName: this.config.userName,
        metadata: {
          fileName: fileRef.originalFileName,
          artifactKey: fileRef.artifactKey,
          uploadSource: fileRef.uploadSource,
        },
      }

      // Atualiza a iniciativa
      const updatedInitiative: InitiativeDto = {
        ...initiative,
        uploadedFiles,
        updatedAt: now,
        recentActivities: [
          activity,
          ...initiative.recentActivities.slice(0, 7), // Mantém máximo 8
        ],
        metadata: {
          ...initiative.metadata,
          totalArtifacts: (initiative.metadata.totalArtifacts || 0) + 1,
        },
      }

      // Atualiza o artefato (cria nova versão)
      const updateDto: ArtifactUpdateDto = {
        id: artifact.id,
        value: JSON.stringify(updatedInitiative, null, 2),
        description: `Iniciativa SDA: ${initiative.name}`,
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
        tags: ['sda', 'initiative', ...(initiative.tags || [])].join(','),
        version: artifact.version || '1.0.0',
      }

      await this.artifactService.update(updateDto)
      console.log(
        `[UploadedFileService] ✅ Initiative updated with file ref: ${fileRef.artifactKey}`
      )
    } catch (error) {
      console.error(
        '[UploadedFileService] Error adding file to initiative:',
        error
      )
      throw error
    }
  }

  /**
   * Lista todos os arquivos de upload de uma iniciativa
   */
  async listFiles(
    initiativeSlug: string
  ): Promise<OperationResult<UploadedFileRef[]>> {
    try {
      const initiativeKey = getInitiativeKey(initiativeSlug)
      const artifact =
        await this.artifactService.getByKeyWithLatestVersion(initiativeKey)
      const initiative = JSON.parse(artifact.value || '{}') as InitiativeDto

      return {
        success: true,
        data: initiative.uploadedFiles || [],
      }
    } catch (error) {
      console.error('[UploadedFileService] Error listing files:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list files',
      }
    }
  }

  /**
   * Obtém o conteúdo de um arquivo de upload
   */
  async getFileContent(
    artifactKey: string
  ): Promise<
    OperationResult<{ content: string; metadata: Record<string, any> }>
  > {
    try {
      const artifact =
        await this.artifactService.getByKeyWithLatestVersion(artifactKey)

      return {
        success: true,
        data: {
          content: artifact.value || '',
          metadata: artifact.metadata ? JSON.parse(artifact.metadata) : {},
        },
      }
    } catch (error) {
      console.error('[UploadedFileService] Error getting file content:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get file content',
      }
    }
  }
}
