/**
 * Initiative Service
 *
 * Serviço para gerenciamento de iniciativas do SDA
 * Utiliza a API de Artefatos do Cockpit para persistência
 *
 * Nomenclatura de artefatos (usa hífen ao invés de barra para evitar problemas de URL):
 * - Iniciativa: initiative-{slug}
 * - Histórico: history-{slug}
 * - Artefatos: artifact-{initiative-slug}-{artifact-name}
 */

import { v4 as uuidv4 } from 'uuid'

import { type PersistedChatHistory } from '@/shared/types'

import {
  ActivityRecord,
  ActivityType,
  ApprovedArtifactRef,
  InitiativeCreateDto,
  InitiativeDto,
  InitiativeMilestone,
  InitiativeStatus,
  InitiativeUpdateDto,
  OperationResult,
  SDAServiceConfig,
} from '../types/sda-artifacts.types'
import {
  ArtifactAccessibility,
  ArtifactCreateDto,
  ArtifactService,
  ArtifactUpdateDto,
  getArtifactTypeId,
} from './artifact.service'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Converte nome para slug (kebab-case)
 * Ex: "Meu Projeto Legal" -> "meu-projeto-legal"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .replace(/^-|-$/g, '') // Remove hífens no início/fim
    .substring(0, 100) // Limita a 100 caracteres
}

/**
 * Gera key da iniciativa
 * Usa hífen ao invés de barra para evitar problemas com URLs
 * Padrão: initiative-{slug}
 */
export function getInitiativeKey(slug: string): string {
  return `initiative-${slug}`
}

/**
 * Gera key do histórico
 * Usa hífen ao invés de barra para evitar problemas com URLs
 * Padrão: history-{slug}
 */
export function getHistoryKey(slug: string): string {
  return `history-${slug}`
}

/**
 * Gera key do artefato
 * Usa hífen ao invés de barra para evitar problemas com URLs
 * Padrão: artifact-{initiativeSlug}-{artifactName}
 */
export function getArtifactKey(
  initiativeSlug: string,
  artifactName: string
): string {
  return `artifact-${initiativeSlug}-${slugify(artifactName)}`
}

/**
 * Calcula o progresso baseado no stage atual
 * @param stage Stage atual (1-4)
 * @returns Percentual de progresso (0-100)
 */
export function calculateProgress(stage: number): number {
  const stageProgressMap: Record<number, number> = {
    1: 25, // Criação
    2: 50, // Workspace
    3: 75, // Validação
    4: 100, // Handoff
  }
  return stageProgressMap[stage] || 0
}

/**
 * Obtém o nome do stage a partir do número
 * @param stage Número do stage (1-4)
 * @returns Nome do stage
 */
export function getStageNameFromNumber(stage: number): string {
  const stageNames: Record<number, string> = {
    1: 'creation',
    2: 'workspace',
    3: 'validation',
    4: 'handoff',
  }
  return stageNames[stage] || 'unknown'
}

// ============================================================================
// INITIATIVE SERVICE
// ============================================================================

export class InitiativeService {
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
   * Cria uma nova iniciativa
   * Também cria o artefato de histórico de chat associado
   */
  async create(
    data: InitiativeCreateDto
  ): Promise<OperationResult<InitiativeDto>> {
    try {
      const slug = slugify(data.name)
      const now = new Date().toISOString()
      const initiativeId = uuidv4()

      // Busca o artifactTypeId para o tipo JSON
      const jsonTypeId = await getArtifactTypeId(
        'JSON',
        this.config.baseUrl,
        this.config.accessToken,
        this.config.licenseId,
        this.config.namespaceId
      )

      if (!jsonTypeId) {
        throw new Error('Artifact type "JSON" not found in API')
      }

      // Dados da iniciativa
      const initiative: InitiativeDto = {
        id: initiativeId,
        name: data.name,
        slug,
        description: data.description,
        createdAt: now,
        updatedAt: now,
        createdBy: this.config.userId,
        createdByName: this.config.userName,
        status: InitiativeStatus.DRAFT,
        currentStage: 2, // Inicia no workspace (co-criação)
        metadata: {
          totalMessages: 0,
          totalArtifacts: 0,
          approvedArtifacts: 0,
        },
        approvedArtifacts: [],
        tags: data.tags || [],
        progress: 50, // Stage 2 (workspace) = 50%
        milestones: [
          {
            stage: 2,
            stageName: 'workspace',
            progress: 50,
            achievedAt: now,
            achievedBy: this.config.userId,
            achievedByName: this.config.userName,
          },
        ],
        recentActivities: [
          {
            id: uuidv4(),
            type: ActivityType.CREATE_INITIATIVE,
            description: `Criou iniciativa: ${data.name}`,
            timestamp: now,
            userId: this.config.userId,
            userName: this.config.userName,
            metadata: {
              initiativeName: data.name,
            },
          },
        ],
      }

      // Dados do histórico de chat (inicialmente vazio)
      const chatHistory: PersistedChatHistory = {
        initiativeId,
        initiativeName: data.name,
        initiativeSlug: slug,
        createdAt: now,
        updatedAt: now,
        totalMessages: 0,
        messages: [],
      }

      // Cria artefato da iniciativa
      const initiativeArtifact: ArtifactCreateDto = {
        key: getInitiativeKey(slug),
        description: `Iniciativa SDA: ${data.name}`,
        value: JSON.stringify(initiative, null, 2),
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
        type: 'JSON',
        artifactTypeId: jsonTypeId,
        secret: false,
        metadata: '',
        tags: ['sda', 'initiative', ...(data.tags || [])].join(','),
        version: '1.0.0',
      }

      // Cria artefato do histórico
      const historyArtifact: ArtifactCreateDto = {
        key: getHistoryKey(slug),
        description: `Histórico de chat da iniciativa: ${data.name}`,
        value: JSON.stringify(chatHistory, null, 2),
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
        type: 'JSON',
        artifactTypeId: jsonTypeId,
        secret: false,
        metadata: '',
        tags: ['sda', 'history', slug].join(','),
        version: '1.0.0',
      }

      // Salva ambos os artefatos
      console.log('[InitiativeService] Creating initiative:', slug)
      await this.artifactService.create(initiativeArtifact)
      await this.artifactService.create(historyArtifact)
      console.log(
        '[InitiativeService] ✅ Initiative and history created:',
        slug
      )

      return {
        success: true,
        data: initiative,
      }
    } catch (error) {
      console.error('[InitiativeService] Error creating initiative:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create initiative',
      }
    }
  }

  /**
   * Obtém uma iniciativa pelo slug
   * IMPORTANTE: Usa getByKeyWithLatestVersion para garantir dados atualizados
   */
  async getBySlug(slug: string): Promise<OperationResult<InitiativeDto>> {
    try {
      const key = getInitiativeKey(slug)
      console.log('[InitiativeService] Getting initiative by key:', key)

      // CORREÇÃO: Usar getByKeyWithLatestVersion para pegar a versão mais recente
      const artifact = await this.artifactService.getByKeyWithLatestVersion(key)
      console.log(
        '[InitiativeService] Artifact found, value length:',
        artifact.value?.length || 0
      )

      const initiative = JSON.parse(artifact.value || '{}') as InitiativeDto

      return {
        success: true,
        data: initiative,
      }
    } catch (error) {
      console.error('[InitiativeService] Error getting initiative:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get initiative',
      }
    }
  }

  /**
   * Lista todas as iniciativas do usuário
   */
  async listAll(): Promise<OperationResult<InitiativeDto[]>> {
    try {
      // Busca todos artefatos do tipo INITIATIVE
      // Usa 'initiative-' com hífen (novo formato)
      const result = await this.artifactService.getAll({
        search: 'initiative-',
        pageSize: 100,
      })

      console.log(
        `[InitiativeService] Found ${result.items.length} initiative artifacts`
      )

      // OTIMIZAÇÃO PARALELA: Processar múltiplas iniciativas simultaneamente
      const initiativePromises = result.items
        .filter(item => item.key.startsWith('initiative-'))
        .map(async item => {
          try {
            let finalValue = item.value

            // OTIMIZAÇÃO: Só buscar versões se há múltiplas versões
            // Se versionCount <= 1, o value já é a versão mais recente
            if (item.versionCount > 1) {
              console.log(
                `[InitiativeService] ${item.key} tem ${item.versionCount} versões - buscando mais recente`
              )
              try {
                const artifact =
                  await this.artifactService.getByKeyWithLatestVersion(item.key)
                finalValue = artifact.value
              } catch (versionError) {
                console.warn(
                  `[InitiativeService] ⚠️ Erro ao buscar versão de ${item.key}, usando fallback:`,
                  versionError
                )
                // Fallback: usar o value original se falhar
                finalValue = item.value
              }
            } else {
              console.log(
                `[InitiativeService] ${item.key} tem apenas 1 versão - usando value direto`
              )
            }

            const initiative = JSON.parse(finalValue || '{}') as InitiativeDto

            // Validação básica: verificar se tem pelo menos id ou slug
            if (!initiative.id && !initiative.slug) {
              console.warn(
                `[InitiativeService] ⚠️ Iniciativa inválida em ${item.key} - sem id/slug`
              )
              return null
            }

            // Fallback para iniciativas antigas sem os novos campos
            if (!initiative.progress) {
              initiative.progress = calculateProgress(
                initiative.currentStage || 1
              )
            }
            if (!initiative.milestones) {
              initiative.milestones = []
            }
            if (!initiative.recentActivities) {
              initiative.recentActivities = []
            }

            console.log(`[InitiativeService] ${item.key} - progress:`, {
              progress: initiative.progress,
              currentStage: initiative.currentStage,
              milestones: initiative.milestones?.length || 0,
              versionCount: item.versionCount,
            })

            return initiative
          } catch (error) {
            console.error(
              `[InitiativeService] Erro ao processar ${item.key}:`,
              error
            )
            return null
          }
        })

      // Aguardar TODAS as requisições em paralelo
      const results = await Promise.all(initiativePromises)

      // Filtrar nulls (erros) e contar
      const validInitiatives = results.filter(
        (init): init is InitiativeDto => init !== null
      )
      const errorCount = results.length - validInitiatives.length

      if (errorCount > 0) {
        console.warn(
          `[InitiativeService] ⚠️ ${errorCount} iniciativa(s) com erro foram ignoradas`
        )
      }

      console.log(
        `[InitiativeService] ✅ ${validInitiatives.length}/${results.length} iniciativas carregadas com sucesso`
      )

      return {
        success: true,
        data: validInitiatives,
      }
    } catch (error) {
      console.error('[InitiativeService] Error listing initiatives:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to list initiatives',
      }
    }
  }

  /**
   * Atualiza uma iniciativa
   */
  async update(
    data: InitiativeUpdateDto
  ): Promise<OperationResult<InitiativeDto>> {
    try {
      // Primeiro, busca a iniciativa atual
      const currentResult = await this.getBySlug(data.id)
      if (!currentResult.success || !currentResult.data) {
        return {
          success: false,
          error: 'Initiative not found',
        }
      }

      const current = currentResult.data
      const now = new Date().toISOString()

      // Atualiza apenas os campos fornecidos
      const updated: InitiativeDto = {
        ...current,
        name: data.name ?? current.name,
        description: data.description ?? current.description,
        status: data.status ?? current.status,
        currentStage: data.currentStage ?? current.currentStage,
        tags: data.tags ?? current.tags,
        updatedAt: now,
      }

      // Se o nome mudou, precisamos criar novo artefato e deletar o antigo
      if (data.name && data.name !== current.name) {
        const newSlug = slugify(data.name)
        updated.slug = newSlug

        // Cria novo artefato
        const artifact: ArtifactCreateDto = {
          key: getInitiativeKey(newSlug),
          description: `Iniciativa SDA: ${data.name}`,
          value: JSON.stringify(updated, null, 2),
          accessibility: ArtifactAccessibility.NAMESPACE_USER,
          type: 'JSON',
          secret: false,
          tags: ['sda', 'initiative', ...(updated.tags || [])].join(','),
          version: '1.0.0',
        }

        await this.artifactService.create(artifact)
        // TODO: Deletar artefato antigo
      } else {
        // Busca o artefato existente para obter o ID
        const existingArtifact = await this.artifactService.getByKey(
          getInitiativeKey(current.slug)
        )

        // Atualiza artefato existente - seguindo padrão cockpit-portal
        // NÃO enviar: key, type, artifactTypeId
        const updateDto: ArtifactUpdateDto = {
          id: existingArtifact.id,
          value: JSON.stringify(updated, null, 2),
          description: `Iniciativa SDA: ${updated.name}`,
          secret: false,
          accessibility: ArtifactAccessibility.NAMESPACE_USER,
          tags: ['sda', 'initiative', ...(updated.tags || [])].join(','),
          version: existingArtifact.version || '1.0.0',
        }

        await this.artifactService.update(updateDto)
      }

      console.log('[InitiativeService] Initiative updated:', updated.slug)

      return {
        success: true,
        data: updated,
      }
    } catch (error) {
      console.error('[InitiativeService] Error updating initiative:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update initiative',
      }
    }
  }

  /**
   * Atualiza o status da iniciativa
   */
  async updateStatus(
    slug: string,
    status: InitiativeStatus,
    stage?: number
  ): Promise<OperationResult<InitiativeDto>> {
    try {
      const currentResult = await this.getBySlug(slug)
      if (!currentResult.success || !currentResult.data) {
        return { success: false, error: 'Initiative not found' }
      }

      const current = currentResult.data
      const now = new Date().toISOString()

      const updated: InitiativeDto = {
        ...current,
        status,
        currentStage: stage ?? current.currentStage,
        updatedAt: now,
      }

      const existingArtifact = await this.artifactService.getByKey(
        getInitiativeKey(slug)
      )

      // Atualiza artefato - seguindo padrão cockpit-portal
      // NÃO enviar: key, type, artifactTypeId
      const updateDto: ArtifactUpdateDto = {
        id: existingArtifact.id,
        value: JSON.stringify(updated, null, 2),
        description: existingArtifact.description || '',
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
      }

      await this.artifactService.update(updateDto)

      console.log('[InitiativeService] Status updated:', slug, '->', status)

      return { success: true, data: updated }
    } catch (error) {
      console.error('[InitiativeService] Error updating status:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update status',
      }
    }
  }

  /**
   * Adiciona referência de artefato aprovado à iniciativa
   */
  async addApprovedArtifact(
    slug: string,
    artifactRef: ApprovedArtifactRef
  ): Promise<OperationResult<InitiativeDto>> {
    try {
      const currentResult = await this.getBySlug(slug)
      if (!currentResult.success || !currentResult.data) {
        return { success: false, error: 'Initiative not found' }
      }

      const current = currentResult.data
      const now = new Date().toISOString()

      // Adiciona o artefato à lista (evita duplicatas)
      const existingIndex = current.approvedArtifacts.findIndex(
        a => a.artifactKey === artifactRef.artifactKey
      )

      if (existingIndex >= 0) {
        // Atualiza existente
        current.approvedArtifacts[existingIndex] = artifactRef
      } else {
        // Adiciona novo
        current.approvedArtifacts.push(artifactRef)
      }

      // Atualiza metadados
      current.metadata.approvedArtifacts = current.approvedArtifacts.length
      current.updatedAt = now

      const existingArtifact = await this.artifactService.getByKey(
        getInitiativeKey(slug)
      )

      // Atualiza artefato - seguindo padrão cockpit-portal
      // NÃO enviar: key, type, artifactTypeId
      const updateDto: ArtifactUpdateDto = {
        id: existingArtifact.id,
        value: JSON.stringify(current, null, 2),
        description: existingArtifact.description || '',
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
      }

      await this.artifactService.update(updateDto)

      console.log(
        '[InitiativeService] Approved artifact added:',
        artifactRef.artifactKey
      )

      return { success: true, data: current }
    } catch (error) {
      console.error(
        '[InitiativeService] Error adding approved artifact:',
        error
      )
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to add approved artifact',
      }
    }
  }

  /**
   * Atualiza o stage da iniciativa e registra progresso
   * REGRA: O progresso nunca diminui
   */
  async updateStage(
    slug: string,
    newStage: number
  ): Promise<OperationResult<InitiativeDto>> {
    try {
      const currentResult = await this.getBySlug(slug)
      if (!currentResult.success || !currentResult.data) {
        return { success: false, error: 'Initiative not found' }
      }

      const current = currentResult.data
      const newProgress = calculateProgress(newStage)

      // REGRA: Progress nunca diminui
      if (newProgress <= current.progress) {
        console.log(
          '[InitiativeService] Progress não aumentou, ignorando atualização'
        )
        return { success: true, data: current }
      }

      const now = new Date().toISOString()
      const stageName = getStageNameFromNumber(newStage)

      // Cria milestone
      const milestone: InitiativeMilestone = {
        stage: newStage,
        stageName,
        progress: newProgress,
        achievedAt: now,
        achievedBy: this.config.userId,
        achievedByName: this.config.userName,
      }

      // Cria atividade
      const activity: ActivityRecord = {
        id: uuidv4(),
        type: ActivityType.ADVANCE_STAGE,
        description: `Avançou para ${stageName}`,
        timestamp: now,
        userId: this.config.userId,
        userName: this.config.userName,
        metadata: {
          stageName,
          progress: newProgress,
        },
      }

      // Atualiza iniciativa
      const updated: InitiativeDto = {
        ...current,
        currentStage: newStage,
        progress: newProgress,
        milestones: [...current.milestones, milestone],
        recentActivities: [
          activity,
          ...current.recentActivities.slice(0, 7), // Mantém últimas 8
        ],
        updatedAt: now,
      }

      // Persiste
      const existingArtifact = await this.artifactService.getByKey(
        getInitiativeKey(slug)
      )

      const updateDto: ArtifactUpdateDto = {
        id: existingArtifact.id,
        value: JSON.stringify(updated, null, 2),
        description: existingArtifact.description || '',
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
      }

      await this.artifactService.update(updateDto)

      console.log('[InitiativeService] Stage updated:', slug, '->', newStage)

      return { success: true, data: updated }
    } catch (error) {
      console.error('[InitiativeService] Error updating stage:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update stage',
      }
    }
  }

  /**
   * Adiciona uma atividade ao histórico recente
   * Mantém máximo de 8 atividades (FIFO)
   */
  async addActivity(
    slug: string,
    type: ActivityType,
    description: string,
    metadata?: Record<string, any>
  ): Promise<OperationResult<InitiativeDto>> {
    try {
      const currentResult = await this.getBySlug(slug)
      if (!currentResult.success || !currentResult.data) {
        return { success: false, error: 'Initiative not found' }
      }

      const current = currentResult.data
      const now = new Date().toISOString()

      const activity: ActivityRecord = {
        id: uuidv4(),
        type,
        description,
        timestamp: now,
        userId: this.config.userId,
        userName: this.config.userName,
        metadata,
      }

      const updated: InitiativeDto = {
        ...current,
        recentActivities: [
          activity,
          ...current.recentActivities.slice(0, 7), // Mantém últimas 8
        ],
        updatedAt: now,
      }

      // Persiste
      const existingArtifact = await this.artifactService.getByKey(
        getInitiativeKey(slug)
      )

      const updateDto: ArtifactUpdateDto = {
        id: existingArtifact.id,
        value: JSON.stringify(updated, null, 2),
        description: existingArtifact.description || '',
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE_USER,
      }

      await this.artifactService.update(updateDto)

      console.log('[InitiativeService] Activity added:', type, '-', description)

      return { success: true, data: updated }
    } catch (error) {
      console.error('[InitiativeService] Error adding activity:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to add activity',
      }
    }
  }

  /**
   * Deleta uma iniciativa e seus artefatos relacionados
   */
  async delete(slug: string): Promise<OperationResult> {
    try {
      console.log('[InitiativeService] Deleting initiative:', slug)

      // Busca e deleta artefato da iniciativa
      try {
        const initiative = await this.artifactService.getByKey(
          getInitiativeKey(slug)
        )
        await this.artifactService.delete(initiative.id)
      } catch (e) {
        console.warn(
          '[InitiativeService] Initiative artifact not found for deletion'
        )
      }

      // Busca e deleta artefato do histórico
      try {
        const history = await this.artifactService.getByKey(getHistoryKey(slug))
        await this.artifactService.delete(history.id)
      } catch (e) {
        console.warn(
          '[InitiativeService] History artifact not found for deletion'
        )
      }

      // TODO: Deletar artefatos de documentos relacionados

      console.log('[InitiativeService] Initiative deleted:', slug)

      return { success: true }
    } catch (error) {
      console.error('[InitiativeService] Error deleting initiative:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete initiative',
      }
    }
  }
}
