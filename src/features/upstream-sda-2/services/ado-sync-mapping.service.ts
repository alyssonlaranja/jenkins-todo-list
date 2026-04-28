/**
 * ADO Sync Mapping Service - Upstream SDA-2
 *
 * Serviço para persistir mapeamentos de sincronização entre work items locais
 * e Azure DevOps no Cockpit como artefatos JSON.
 *
 * Estrutura do artefato:
 * - Key: ado-sync-{projectSlug}-{chatSlug}
 * - Type: JSON
 * - Value: { mappings: { [localId]: { adoId, adoUrl, syncedAt, title } }, backlogVersion }
 */

import {
  ArtifactService,
  getArtifactTypeId,
} from '@/features/artifacts/services/artifact.service'

// ============================================================================
// Types
// ============================================================================

export interface SyncMappingEntry {
  /** ID do work item no Azure DevOps */
  adoId: number
  /** URL do work item no Azure DevOps */
  adoUrl?: string
  /** Data/hora da sincronização */
  syncedAt: string
  /** Título do work item (para referência) */
  title: string
  /** Tipo do work item (epic, feature, userstory) */
  type: 'epic' | 'feature' | 'userstory'
}

export interface SyncMappingData {
  /** Versão do backlog quando o mapeamento foi criado/atualizado */
  backlogVersion: string
  /** Mapeamentos: localId -> dados de sincronização */
  mappings: Record<string, SyncMappingEntry>
  /** Data da última atualização */
  updatedAt: string
  /** Organização do Azure DevOps */
  adoOrganization?: string
  /** Projeto do Azure DevOps */
  adoProject?: string
}

export interface AdoSyncMappingServiceConfig {
  baseUrl: string
  accessToken: string
  licenseId: string
  namespaceId: string
}

// ============================================================================
// Service
// ============================================================================

export class AdoSyncMappingService {
  private artifactService: ArtifactService
  private config: AdoSyncMappingServiceConfig

  constructor(config: AdoSyncMappingServiceConfig) {
    this.artifactService = new ArtifactService(config)
    this.config = config
  }

  /**
   * Obtém o ID do tipo JSON dinamicamente
   */
  private async getJsonTypeId(): Promise<string> {
    const typeId = await getArtifactTypeId(
      'JSON',
      this.config.baseUrl,
      this.config.accessToken,
      this.config.licenseId,
      this.config.namespaceId
    )

    if (!typeId) {
      throw new Error('Artifact type "JSON" not found in API')
    }

    return typeId
  }

  /**
   * Gera a chave do artefato de mapeamento
   */
  private getSyncArtifactKey(projectSlug: string, chatSlug: string): string {
    return `ado-sync-${projectSlug}-${chatSlug}`
  }

  /**
   * Carrega os mapeamentos de sincronização para um backlog
   */
  async loadSyncMappings(
    projectSlug: string,
    chatSlug: string
  ): Promise<SyncMappingData | null> {
    const key = this.getSyncArtifactKey(projectSlug, chatSlug)

    try {
      console.log(`🔄 [AdoSyncMapping] Carregando mapeamentos: ${key}`)
      const artifact = await this.artifactService.getByKeyWithLatestVersion(key)

      if (!artifact || !artifact.value) {
        console.log(
          `📋 [AdoSyncMapping] Nenhum mapeamento encontrado para: ${key}`
        )
        return null
      }

      const data: SyncMappingData = JSON.parse(artifact.value)
      console.log(
        `✅ [AdoSyncMapping] Mapeamentos carregados:`,
        Object.keys(data.mappings).length,
        'itens'
      )
      return data
    } catch (error) {
      // Se o artefato não existe, retorna null (não é erro)
      if (error instanceof Error && error.message.includes('not found')) {
        console.log(`📋 [AdoSyncMapping] Artefato não existe ainda: ${key}`)
        return null
      }
      console.error(`❌ [AdoSyncMapping] Erro ao carregar mapeamentos:`, error)
      return null
    }
  }

  /**
   * Salva os mapeamentos de sincronização
   */
  async saveSyncMappings(
    projectSlug: string,
    chatSlug: string,
    data: SyncMappingData
  ): Promise<{ success: boolean; error?: string }> {
    const key = this.getSyncArtifactKey(projectSlug, chatSlug)

    try {
      console.log(`💾 [AdoSyncMapping] Salvando mapeamentos: ${key}`)

      // Atualizar timestamp
      const dataToSave: SyncMappingData = {
        ...data,
        updatedAt: new Date().toISOString(),
      }

      // Verificar se o artefato já existe
      let existingArtifact = null
      try {
        existingArtifact = await this.artifactService.getByKey(key)
      } catch {
        // Artefato não existe, será criado
      }

      if (existingArtifact) {
        // Atualizar artefato existente
        await this.artifactService.update({
          id: existingArtifact.id,
          value: JSON.stringify(dataToSave, null, 2),
          description: `Mapeamento de sincronização Azure DevOps - ${projectSlug}/${chatSlug}`,
          secret: false,
          accessibility: 'Namespace_User',
        })
        console.log(`✅ [AdoSyncMapping] Mapeamentos atualizados`)
      } else {
        // Obter ID do tipo JSON dinamicamente
        const jsonTypeId = await this.getJsonTypeId()

        // Criar novo artefato
        await this.artifactService.create({
          key,
          value: JSON.stringify(dataToSave, null, 2),
          description: `Mapeamento de sincronização Azure DevOps - ${projectSlug}/${chatSlug}`,
          type: 'Json', // Campo obrigatório - tipo do artefato
          artifactTypeId: jsonTypeId,
          accessibility: 'Namespace_User',
          secret: false,
        })
        console.log(`✅ [AdoSyncMapping] Mapeamentos criados`)
      }

      return { success: true }
    } catch (error) {
      console.error(`❌ [AdoSyncMapping] Erro ao salvar mapeamentos:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Adiciona novos mapeamentos após uma sincronização
   */
  async addSyncMappings(
    projectSlug: string,
    chatSlug: string,
    backlogVersion: string,
    newMappings: Array<{
      localId: string
      adoId: number
      adoUrl?: string
      title: string
      type: 'epic' | 'feature' | 'userstory'
    }>,
    adoConfig?: { organization?: string; project?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Carregar mapeamentos existentes
      const existing = await this.loadSyncMappings(projectSlug, chatSlug)

      const now = new Date().toISOString()

      // Mesclar com novos mapeamentos
      const data: SyncMappingData = {
        backlogVersion,
        mappings: existing?.mappings || {},
        updatedAt: now,
        adoOrganization: adoConfig?.organization || existing?.adoOrganization,
        adoProject: adoConfig?.project || existing?.adoProject,
      }

      // Adicionar novos mapeamentos
      for (const mapping of newMappings) {
        data.mappings[mapping.localId] = {
          adoId: mapping.adoId,
          adoUrl: mapping.adoUrl,
          syncedAt: now,
          title: mapping.title,
          type: mapping.type,
        }
      }

      // Salvar
      return await this.saveSyncMappings(projectSlug, chatSlug, data)
    } catch (error) {
      console.error(`❌ [AdoSyncMapping] Erro ao adicionar mapeamentos:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Remove um mapeamento específico
   */
  async removeSyncMapping(
    projectSlug: string,
    chatSlug: string,
    localId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await this.loadSyncMappings(projectSlug, chatSlug)

      if (!existing) {
        return { success: true } // Nada para remover
      }

      delete existing.mappings[localId]

      return await this.saveSyncMappings(projectSlug, chatSlug, existing)
    } catch (error) {
      console.error(`❌ [AdoSyncMapping] Erro ao remover mapeamento:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /**
   * Limpa todos os mapeamentos
   */
  async clearSyncMappings(
    projectSlug: string,
    chatSlug: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const key = this.getSyncArtifactKey(projectSlug, chatSlug)

      const artifact = await this.artifactService.getByKey(key)
      if (artifact) {
        // Atualizar com mapeamentos vazios (manter histórico)
        await this.artifactService.update({
          id: artifact.id,
          value: JSON.stringify(
            {
              backlogVersion: '',
              mappings: {},
              updatedAt: new Date().toISOString(),
            },
            null,
            2
          ),
          description: `Mapeamento de sincronização Azure DevOps - ${projectSlug}/${chatSlug} (limpo)`,
          secret: false,
          accessibility: 'Namespace_User',
        })
      }

      return { success: true }
    } catch (error) {
      console.error(`❌ [AdoSyncMapping] Erro ao limpar mapeamentos:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createAdoSyncMappingService(
  config: AdoSyncMappingServiceConfig
): AdoSyncMappingService {
  return new AdoSyncMappingService(config)
}
