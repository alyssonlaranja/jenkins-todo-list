/* eslint-disable no-console */
/**
 * Project Service
 *
 * Serviço para gerenciamento de projetos na nova estrutura hierárquica
 * Estrutura: Project → Chat → History → Documents
 *
 * Keys de artefatos:
 * - Projeto: project-{slug}
 * - Chat: chat-{projectSlug}-{chatSlug}
 * - Histórico: history-{projectSlug}-{chatSlug}
 * - Documento: document-{type}-{projectSlug}-{chatSlug}
 */

import { v4 as uuidv4 } from 'uuid'

import {
  ArtifactAccessibility,
  ArtifactCreateDto,
  ArtifactService,
  ArtifactUpdateDto,
  getArtifactTypeId,
} from '@/features/artifacts/services/artifact.service'
import {
  ApprovedArtifactRef,
  ChatRef,
  OperationResult,
  ProjectCreateDto,
  ProjectDto,
  ProjectStatus,
  ProjectTeamMemberDto,
  SDAServiceConfig,
  SharedWithInfo,
} from '@/features/artifacts/types/sda-artifacts.types'

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
 * Gera key do projeto
 * Padrão: project-{slug}
 */
export function getProjectKey(slug: string): string {
  return `project-${slug}`
}

/**
 * Gera um slug de chat estável e único
 * Formato: {slugified-name}-{8-char-hex}
 * O slug é IMUTÁVEL — renomear o chat altera apenas o display name
 */
export function generateChatSlug(chatName: string): string {
  return `${slugify(chatName)}-${uuidv4().split('-')[0]}`
}

/**
 * Gera key do chat
 * Padrão: chat-{projectSlug}-{chatSlug}
 */
export function getChatKey(projectSlug: string, chatSlug: string): string {
  return `chat-${projectSlug}-${chatSlug}`
}

/**
 * Gera key do histórico de chat
 * Padrão: history-{projectSlug}-{chatSlug}
 */
export function getChatHistoryKey(
  projectSlug: string,
  chatSlug: string
): string {
  return `history-${projectSlug}-${chatSlug}`
}

// ============================================================================
// PROJECT SERVICE
// ============================================================================

export class ProjectService {
  private artifactService: ArtifactService
  private config: SDAServiceConfig

  // Cache progressivo: keys são carregadas uma vez (rápido), dados buscados batch a batch
  private _batchState: {
    allKeys: string[] // Todas as keys únicas de projetos
    nsKeySet: Set<string> // Keys vindas de NAMESPACE
    personalKeySet: Set<string> // Keys vindas de NAMESPACE_USER
    validProjects: ProjectDto[] // Projetos válidos acumulados (cresce a cada batch)
    seenIds: Set<string> // IDs já vistos (para dedup)
    seenSlugs: Set<string> // Slugs já vistos (para dedup)
    processedUpTo: number // Índice até onde já processamos em allKeys
  } | null = null

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
   * Limpa o cache de projetos (chamar após criar/deletar/atualizar projeto)
   */
  clearProjectCache(): void {
    this._batchState = null
  }

  /**
   * Cria um novo projeto
   */
  async create(data: ProjectCreateDto): Promise<OperationResult<ProjectDto>> {
    try {
      const slug = slugify(data.name)
      const now = new Date().toISOString()
      const projectId = uuidv4()

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

      // Criar equipe padrão: se não foi passado team, adicionar o criador como Owner
      const defaultTeam =
        data.team && data.team.length > 0
          ? data.team
          : [
              {
                id: this.config.userId,
                name: this.config.userName,
                email: this.config.userEmail,
                role: 'Owner' as const,
              },
            ]

      console.log('[ProjectService] 👥 Team do projeto:', defaultTeam)

      // Dados do projeto
      const project: ProjectDto = {
        id: projectId,
        name: data.name,
        slug,
        description: data.description,
        createdAt: now,
        updatedAt: now,
        createdBy: this.config.userId,
        createdByName: this.config.userName,
        status: ProjectStatus.ACTIVE,
        chats: [],
        approvedArtifacts: [],
        metadata: {
          totalChats: 0,
          totalArtifacts: 0,
          approvedArtifacts: 0,
        },
        tags: data.tags || [],
        team: defaultTeam,
      }

      // Cria artefato do projeto
      const projectArtifact: ArtifactCreateDto = {
        key: getProjectKey(slug),
        description: `Projeto SDA2: ${data.name}`,
        value: JSON.stringify(project, null, 2),
        accessibility: ArtifactAccessibility.NAMESPACE,
        type: 'JSON',
        artifactTypeId: jsonTypeId,
        secret: false,
        metadata: '',
        tags: ['sda2', 'project', ...(data.tags || [])].join(','),
        version: '1.0.0',
      }

      console.log('[ProjectService] Creating project:', slug)
      await this.artifactService.create(projectArtifact)
      console.log('[ProjectService] ✅ Project created:', slug)

      return {
        success: true,
        data: project,
      }
    } catch (error) {
      console.error('[ProjectService] Error creating project:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create project',
      }
    }
  }

  /**
   * Obtém um projeto pelo slug
   */
  async getBySlug(slug: string): Promise<OperationResult<ProjectDto>> {
    try {
      const key = getProjectKey(slug)
      console.log('[ProjectService] Getting project by key:', key)

      // Buscar artefato - pode não existir ainda
      let artifact
      try {
        artifact = await this.artifactService.getByKeyWithLatestVersion(key)
      } catch {
        // Artefato não existe - retornar success: false sem erro
        console.log('[ProjectService] Project not found:', key)
        return {
          success: false,
          error: 'Project not found',
        }
      }

      const project = JSON.parse(artifact.value || '{}') as ProjectDto

      return {
        success: true,
        data: project,
      }
    } catch (error) {
      console.error('[ProjectService] Error getting project:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project',
      }
    }
  }

  /**
   * Lista todos os projetos acessíveis pelo usuário atual
   *
   * Busca em DOIS níveis de acessibilidade:
   * 1. NAMESPACE - Projetos compartilhados (valida se usuário está no team)
   * 2. NAMESPACE_USER - Projetos pessoais do usuário (não precisa validação)
   *
   * IMPORTANTE: Cada busca é independente com tratamento de erro próprio.
   * Se uma falhar, a outra continua. SEMPRE busca versão mais recente dos artefatos.
   *
   * Usa carregamento PROGRESSIVO por batch:
   * 1. Busca apenas KEYS (rápido: 2 chamadas HTTP paralelas)
   * 2. Para cada batch de keys, busca dados com retry (15 chamadas paralelas)
   * 3. Emite callback por batch para que a UI atualize progressivamente
   *
   * @param onPageProcessed Callback chamado a cada batch de projetos processados
   * @param batchSize Quantidade de keys processadas por batch (padrão: 15)
   * @returns Lista completa de todos os projetos acessíveis
   */
  async listAll(
    onPageProcessed?: (projects: ProjectDto[]) => void,
    batchSize: number = 15
  ): Promise<OperationResult<ProjectDto[]>> {
    const userEmail = this.config.userEmail

    if (!userEmail) {
      console.warn(
        '[ProjectService] ⚠️ Email do usuário não disponível, retornando lista vazia'
      )
      return { success: true, data: [] }
    }

    console.log('[ProjectService] 🔍 Carregando projetos progressivamente...')

    // ========================================================================
    // 1. BUSCAR KEYS (rápido: 2 chamadas HTTP paralelas)
    // ========================================================================
    this._batchState = null // Limpar estado anterior
    const initResult = await this._initBatchState()
    if (!initResult.success) {
      return { success: false, error: initResult.error }
    }

    const state = this._batchState!

    if (state.allKeys.length === 0) {
      console.log('[ProjectService] ℹ️ Nenhuma key de projeto encontrada')
      return { success: true, data: [] }
    }

    // ========================================================================
    // 2. PROCESSAR KEYS EM BATCHES (com retry e callback progressivo)
    // ========================================================================
    let batchStart = 0
    let batchNumber = 0

    while (batchStart < state.allKeys.length) {
      // Verificar se o estado foi limpo (abort por mudança de namespace)
      if (!this._batchState) {
        console.log('[ProjectService] ⚠️ Carregamento abortado (state cleared)')
        break
      }

      batchNumber++
      const batchEnd = Math.min(batchStart + batchSize, state.allKeys.length)
      const batchKeys = state.allKeys.slice(batchStart, batchEnd)

      console.log(
        `[ProjectService] 🔄 Batch ${batchNumber}: buscando ${batchKeys.length} projetos (${batchStart + 1}→${batchEnd} de ${state.allKeys.length})...`
      )

      // Buscar dados deste batch em paralelo (com retry para cada um)
      const fetchResults = await Promise.allSettled(
        batchKeys.map(key => this._fetchProjectWithRetry(key))
      )

      const batchProjects: ProjectDto[] = []

      for (let i = 0; i < fetchResults.length; i++) {
        const result = fetchResults[i]
        if (!result || result.status !== 'fulfilled' || !result.value) continue

        const project = result.value
        const key = batchKeys[i]
        if (!key) continue

        // NAMESPACE projects precisam validar team membership
        // Nota: pela regra de negócio, só pode ter artefatos compartilhados se já está no time
        if (state.nsKeySet.has(key) && !state.personalKeySet.has(key)) {
          const isInTeam = project.team?.some(
            (m: { email?: string }) =>
              m.email?.toLowerCase() === userEmail.toLowerCase()
          )
          if (!isInTeam) continue
        }

        // Filtrar inativos
        if (project.status !== ProjectStatus.ACTIVE) continue

        // Deduplicar por id E slug
        if (state.seenIds.has(project.id) || state.seenSlugs.has(project.slug))
          continue
        state.seenIds.add(project.id)
        state.seenSlugs.add(project.slug)

        state.validProjects.push(project)
        batchProjects.push(project)
      }

      // ✅ Emitir callback com projetos válidos deste batch
      if (batchProjects.length > 0 && onPageProcessed) {
        console.log(
          `[ProjectService] 📤 Batch ${batchNumber}: emitindo ${batchProjects.length} projetos (total acumulado: ${state.validProjects.length})`
        )
        onPageProcessed(batchProjects)

        // Yield ao event loop para o React renderizar entre batches.
        // 30ms é suficiente para separar state updates sem adicionar delay perceptível.
        await new Promise(resolve => setTimeout(resolve, 30))
      }

      batchStart = batchEnd
    }

    // ========================================================================
    // 3. RETORNAR TODOS OS PROJETOS ACUMULADOS
    // ========================================================================
    const allProjects = this._batchState?.validProjects || []

    console.log(
      `[ProjectService] ✅ Total: ${allProjects.length} projetos ativos carregados`
    )

    return {
      success: true,
      data: allProjects,
    }
  }

  /**
   * Inicializa o batch state: busca SOMENTE as keys de projetos (rápido: 2 chamadas HTTP paralelas).
   * Os dados dos projetos são buscados posteriormente, batch a batch, em listAll().
   */
  private async _initBatchState(): Promise<OperationResult<void>> {
    const userEmail = this.config.userEmail

    if (!userEmail) {
      this._batchState = {
        allKeys: [],
        nsKeySet: new Set(),
        personalKeySet: new Set(),
        validProjects: [],
        seenIds: new Set(),
        seenSlugs: new Set(),
        processedUpTo: 0,
      }
      return { success: true }
    }

    console.log(
      '[ProjectService] 🔄 Buscando keys de projetos (2 chamadas paralelas)...'
    )

    try {
      const [namespaceItemsResult, personalItemsResult] =
        await Promise.allSettled([
          this._getNamespaceItems(),
          this._getAllPersonalProjectItems(),
        ])

      const namespaceItems =
        namespaceItemsResult.status === 'fulfilled'
          ? namespaceItemsResult.value
          : []
      const personalItems =
        personalItemsResult.status === 'fulfilled'
          ? personalItemsResult.value
          : []

      const nsProjectKeys = namespaceItems
        .filter(i => i.key.startsWith('project-'))
        .map(i => i.key)
      const personalProjectKeys = personalItems.map(i => i.key)

      const allUniqueKeys = [
        ...new Set([...nsProjectKeys, ...personalProjectKeys]),
      ]

      console.log(
        `[ProjectService] 📊 Keys encontradas: ${nsProjectKeys.length} NAMESPACE + ${personalProjectKeys.length} NAMESPACE_USER = ${allUniqueKeys.length} únicas`
      )

      this._batchState = {
        allKeys: allUniqueKeys,
        nsKeySet: new Set(nsProjectKeys),
        personalKeySet: new Set(personalProjectKeys),
        validProjects: [],
        seenIds: new Set(),
        seenSlugs: new Set(),
        processedUpTo: 0,
      }

      return { success: true }
    } catch (error) {
      console.error(
        '[ProjectService] ❌ Erro ao buscar keys:',
        error instanceof Error ? error.message : error
      )
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao buscar keys de projetos',
      }
    }
  }

  /**
   * Busca dados de um projeto com retry automático para lidar com falhas de rede.
   *
   * IMPORTANTE: Usa getByKeyWithLatestVersion para garantir que pegamos os dados
   * mais recentes, incluindo approvedArtifacts com sharedWith para notificações.
   * Isso faz 2 HTTP calls por projeto mas é necessário para consistência.
   */
  private async _fetchProjectWithRetry(
    key: string,
    maxRetries: number = 2
  ): Promise<ProjectDto | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const artifact =
          await this.artifactService.getByKeyWithLatestVersion(key)
        const project = JSON.parse(artifact.value || '{}') as ProjectDto
        if (!project.id || !project.slug) return null
        return project
      } catch {
        if (attempt === maxRetries) {
          console.warn(
            `[ProjectService] ⚠️ Falha ao buscar ${key} após ${maxRetries + 1} tentativas`
          )
          return null
        }
        // Backoff progressivo: 200ms, 400ms
        await new Promise(r => setTimeout(r, 200 * (attempt + 1)))
      }
    }
    return null
  }

  /**
   * Busca items NAMESPACE — projetos compartilhados no namespace.
   *
   * CORREÇÃO: Antes buscava por email do usuário no campo Value (searchValue: true),
   * o que retornava TODOS os tipos de artefatos (chats, documentos, históricos, etc.)
   * que continham o email. Com pageSize: 1000 e sem paginação, projetos podiam ficar
   * fora da primeira página e nunca serem carregados.
   *
   * AGORA: Busca por key com padrão "^project-" (apenas projetos) com paginação
   * completa para garantir que TODOS os projetos do namespace são encontrados.
   * A validação de team membership continua sendo feita na fase 2 (ao carregar o JSON).
   */
  private async _getNamespaceItems(): Promise<
    Array<{ key: string; versionCount: number }>
  > {
    const allItems: Array<{ key: string; versionCount: number }> = []

    try {
      let page = 1
      const pageSize = 1000

      while (true) {
        const result = await this.artifactService.searchByRegex({
          pattern: '^project-',
          searchKey: true,
          searchValue: false,
          searchDescription: false,
          searchMetadata: false,
          searchTags: false,
          pageSize,
          page,
          caseInsensitive: false,
        })

        allItems.push(...result.items)

        console.log(
          `[ProjectService] 🔍 NAMESPACE searchByRegex page ${page}: ${result.items.length} items (total API: ${result.totalCount}, acumulado: ${allItems.length})`
        )

        // Se já temos todos os itens ou a página veio vazia, parar
        if (allItems.length >= result.totalCount || result.items.length === 0) {
          break
        }
        page++
      }

      return allItems
    } catch {
      console.warn(
        '[ProjectService] ⚠️ SearchByRegex por key falhou, usando fallback getByAccessibility'
      )
      try {
        // Fallback: buscar todos artefatos NAMESPACE com paginação
        let page = 1
        const pageSize = 1000

        while (true) {
          const fallback = await this.artifactService.getByAccessibility(
            ArtifactAccessibility.NAMESPACE,
            { page, pageSize }
          )

          // Filtrar apenas project keys
          const projectItems = fallback.items.filter(i =>
            i.key.startsWith('project-')
          )
          allItems.push(...projectItems)

          console.log(
            `[ProjectService] 🔍 NAMESPACE fallback page ${page}: ${fallback.items.length} items, ${projectItems.length} projetos (total API: ${fallback.totalCount}, acumulado: ${allItems.length})`
          )

          if (
            page * pageSize >= fallback.totalCount ||
            fallback.items.length === 0
          ) {
            break
          }
          page++
        }

        return allItems
      } catch {
        console.error('[ProjectService] ❌ Fallback também falhou')
        return []
      }
    }
  }

  /**
   * Busca items NAMESPACE_USER — projetos pessoais do usuário.
   *
   * CORREÇÃO: Antes usava { page: 1, pageSize: 1000 } sem verificar totalCount.
   * Se o usuário tinha mais de 1000 artefatos pessoais, projetos podiam ficar
   * fora da primeira página. Agora pagina completamente e filtra apenas project keys.
   */
  private async _getAllPersonalProjectItems(): Promise<
    Array<{ key: string; versionCount: number }>
  > {
    const allProjectItems: Array<{ key: string; versionCount: number }> = []

    try {
      let page = 1
      const pageSize = 1000

      while (true) {
        const result = await this.artifactService.getByAccessibility(
          ArtifactAccessibility.NAMESPACE_USER,
          { page, pageSize }
        )

        // Filtrar apenas project keys direto na paginação
        const projectItems = result.items.filter(i =>
          i.key.startsWith('project-')
        )
        allProjectItems.push(...projectItems)

        console.log(
          `[ProjectService] 🔍 NAMESPACE_USER page ${page}: ${result.items.length} items, ${projectItems.length} projetos (total API: ${result.totalCount}, acumulado projetos: ${allProjectItems.length})`
        )

        // Se já percorremos todos os itens ou página veio vazia, parar
        if (page * pageSize >= result.totalCount || result.items.length === 0) {
          break
        }
        page++
      }

      return allProjectItems
    } catch (error) {
      console.error(
        '[ProjectService] ❌ Erro ao buscar projetos pessoais (NAMESPACE_USER):',
        error instanceof Error ? error.message : error
      )
      return []
    }
  }

  /**
   * Lista projetos em batches progressivos.
   * Cada chamada processa um lote de keys (pageSize), buscando dados SOMENTE para esse lote.
   *
   * Fluxo: página 0  → busca dados de 7 keys → retorna projetos válidos
   *        página 1  → busca dados das próximas 7 keys → retorna projetos válidos
   *        ...até processar todas as keys
   *
   * @param page Número do batch (0-indexed)
   * @param pageSize Quantidade de keys a processar por batch
   * @returns Projetos válidos do batch + total acumulado + hasMore
   */
  async listPaginated(
    page: number,
    pageSize: number
  ): Promise<
    OperationResult<{
      projects: ProjectDto[]
      totalCount: number
      hasMore: boolean
      page: number
      pageSize: number
    }>
  > {
    // Inicializar batch state se necessário (busca apenas keys — rápido)
    if (!this._batchState) {
      const initResult = await this._initBatchState()
      if (!initResult.success) {
        return { success: false, error: initResult.error }
      }
    }

    const state = this._batchState!
    const batchStart = page * pageSize
    const batchEnd = Math.min(batchStart + pageSize, state.allKeys.length)

    // Se já processamos todas as keys, não há mais nada para buscar
    if (batchStart >= state.allKeys.length) {
      return {
        success: true,
        data: {
          projects: [],
          totalCount: state.validProjects.length,
          hasMore: false,
          page,
          pageSize,
        },
      }
    }

    const batchKeys = state.allKeys.slice(batchStart, batchEnd)
    console.log(
      `[ProjectService] 🔄 Batch ${page + 1}: buscando dados para ${batchKeys.length} keys (${batchStart}→${batchEnd} de ${state.allKeys.length})...`
    )

    // Buscar dados deste batch em paralelo (com retry para cada um)
    const fetchResults = await Promise.allSettled(
      batchKeys.map(key => this._fetchProjectWithRetry(key))
    )

    const batchProjects: ProjectDto[] = []
    const userEmail = this.config.userEmail

    for (let i = 0; i < fetchResults.length; i++) {
      const result = fetchResults[i]
      if (result.status !== 'fulfilled' || !result.value) continue

      const project = result.value
      const key = batchKeys[i]

      // NAMESPACE projects precisam validar team membership
      if (state.nsKeySet.has(key) && !state.personalKeySet.has(key)) {
        const isInTeam = project.team?.some(
          m => m.email?.toLowerCase() === userEmail?.toLowerCase()
        )
        if (!isInTeam) continue
      }

      // Filtrar inativos
      if (project.status !== ProjectStatus.ACTIVE) continue

      // Deduplicar por id E slug
      if (state.seenIds.has(project.id) || state.seenSlugs.has(project.slug))
        continue
      state.seenIds.add(project.id)
      state.seenSlugs.add(project.slug)

      state.validProjects.push(project)
      batchProjects.push(project)
    }

    state.processedUpTo = batchEnd
    const hasMore = batchEnd < state.allKeys.length

    console.log(
      `[ProjectService] ✅ Batch ${page + 1}: +${batchProjects.length} projetos válidos (total acumulado: ${state.validProjects.length}, hasMore: ${hasMore})`
    )

    return {
      success: true,
      data: {
        projects: batchProjects,
        totalCount: state.validProjects.length,
        hasMore,
        page,
        pageSize,
      },
    }
  }

  /**
   * Adiciona referência de chat ao projeto
   */
  async addChat(
    projectSlug: string,
    chatRef: ChatRef
  ): Promise<OperationResult<ProjectDto>> {
    try {
      const projectResult = await this.getBySlug(projectSlug)
      if (!projectResult.success || !projectResult.data) {
        return {
          success: false,
          error: `Project not found: ${projectSlug}`,
        }
      }

      const project = projectResult.data

      // Verifica se chat já existe
      const existingIndex = project.chats.findIndex(
        c => c.chatSlug === chatRef.chatSlug
      )

      if (existingIndex >= 0) {
        // Atualiza existente
        project.chats[existingIndex] = chatRef
      } else {
        // Adiciona novo
        project.chats.push(chatRef)
      }

      // Atualiza metadados
      project.metadata.totalChats = project.chats.length
      project.updatedAt = new Date().toISOString()

      // Salva projeto atualizado
      return await this.update(projectSlug, project)
    } catch (error) {
      console.error('[ProjectService] Error adding chat:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add chat',
      }
    }
  }

  /**
   * Adiciona artefato aprovado ao projeto
   * IMPORTANTE: Este método NÃO incrementa a versão - usa a versão passada no artifactRef
   * O incremento de versão é feito em chat.service.ts (saveDocument e addAcceptedArtifact)
   */
  async addApprovedArtifact(
    projectSlug: string,
    artifactRef: ApprovedArtifactRef
  ): Promise<OperationResult<ProjectDto>> {
    try {
      const projectResult = await this.getBySlug(projectSlug)
      if (!projectResult.success || !projectResult.data) {
        return {
          success: false,
          error: `Project not found: ${projectSlug}`,
        }
      }

      const project = projectResult.data

      // Verifica se artefato do mesmo TIPO e CHAT já existe
      // - Mesmo tipo + mesmo chat = atualiza (usa versão do artifactRef)
      // - Mesmo tipo + chat diferente = cria nova entidade
      const existingIndex = project.approvedArtifacts.findIndex(
        a =>
          a.documentType === artifactRef.documentType &&
          a.chatSlug === artifactRef.chatSlug
      )

      if (existingIndex >= 0) {
        // Atualiza existente - USA a versão que veio no artifactRef (já incrementada pelo chat.service)
        const existingVersion =
          project.approvedArtifacts[existingIndex]?.version || '1.0.0'

        console.log(
          `[ProjectService] Updating existing artifact of type ${artifactRef.documentType}:`,
          {
            oldVersion: existingVersion,
            newVersion: artifactRef.version,
            oldKey: project.approvedArtifacts[existingIndex]?.artifactKey,
            newKey: artifactRef.artifactKey,
          }
        )

        project.approvedArtifacts[existingIndex] = artifactRef
      } else {
        // Adiciona novo
        console.log(
          `[ProjectService] Adding new artifact of type ${artifactRef.documentType}`
        )
        project.approvedArtifacts.push(artifactRef)
      }

      // Atualiza metadados
      project.metadata.approvedArtifacts = project.approvedArtifacts.length
      project.updatedAt = new Date().toISOString()

      // Salva projeto atualizado
      return await this.update(projectSlug, project)
    } catch (error) {
      console.error('[ProjectService] Error adding approved artifact:', error)
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
   * Remove artefato aprovado do projeto
   */
  async removeApprovedArtifact(
    projectSlug: string,
    artifactKey: string
  ): Promise<OperationResult<ProjectDto>> {
    try {
      const projectResult = await this.getBySlug(projectSlug)
      if (!projectResult.success || !projectResult.data) {
        return {
          success: false,
          error: `Project not found: ${projectSlug}`,
        }
      }

      const project = projectResult.data

      // Remove artefato
      project.approvedArtifacts = project.approvedArtifacts.filter(
        a => a.artifactKey !== artifactKey
      )

      // Atualiza metadados
      project.metadata.approvedArtifacts = project.approvedArtifacts.length
      project.updatedAt = new Date().toISOString()

      // Salva projeto atualizado
      return await this.update(projectSlug, project)
    } catch (error) {
      console.error('[ProjectService] Error removing approved artifact:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to remove approved artifact',
      }
    }
  }

  /**
   * Desativa (soft-delete) um artefato aprovado no projeto
   * Muda o status para 'inactive' em vez de remover fisicamente
   */
  async deactivateApprovedArtifact(
    projectSlug: string,
    artifactKey: string
  ): Promise<OperationResult<ProjectDto>> {
    try {
      const projectResult = await this.getBySlug(projectSlug)
      if (!projectResult.success || !projectResult.data) {
        return {
          success: false,
          error: `Project not found: ${projectSlug}`,
        }
      }

      const project = projectResult.data

      // Encontrar e marcar como inativo
      const artifactIndex = project.approvedArtifacts.findIndex(
        a => a.artifactKey === artifactKey
      )

      if (artifactIndex === -1) {
        return {
          success: false,
          error: `Artifact not found in project: ${artifactKey}`,
        }
      }

      project.approvedArtifacts[artifactIndex]!.status = 'inactive'
      project.updatedAt = new Date().toISOString()

      console.log(
        '[ProjectService] Deactivating artifact:',
        artifactKey,
        'in project:',
        projectSlug
      )

      // Salva projeto atualizado
      return await this.update(projectSlug, project)
    } catch (error) {
      console.error(
        '[ProjectService] Error deactivating approved artifact:',
        error
      )
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to deactivate approved artifact',
      }
    }
  }

  /**
   * Atualiza projeto existente
   */
  async update(
    slug: string,
    project: ProjectDto
  ): Promise<OperationResult<ProjectDto>> {
    try {
      const key = getProjectKey(slug)

      console.log('[ProjectService] 🔍 Updating project:', {
        slug,
        approvedArtifactsCount: project.approvedArtifacts?.length || 0,
        approvedArtifacts: project.approvedArtifacts?.map(a => ({
          documentType: a.documentType,
          customName: a.customName,
          artifactName: a.artifactName,
        })),
      })

      // Busca artefato existente para obter o ID
      const existing = await this.artifactService.getByKey(key)

      const projectValue = JSON.stringify(project, null, 2)
      console.log('[ProjectService] 🔍 Project value (first 1000 chars):', {
        valuePreview: projectValue.substring(0, 1000),
        approvedArtifactsInValue: projectValue.includes('approvedArtifacts'),
      })

      const updateDto: ArtifactUpdateDto = {
        id: existing.id,
        value: projectValue,
        description: `Projeto SDA2: ${project.name}`,
        secret: false,
        accessibility: ArtifactAccessibility.NAMESPACE,
        tags: ['sda2', 'project', ...project.tags].join(','),
      }

      await this.artifactService.update(updateDto)

      console.log('[ProjectService] ✅ Project updated:', slug)

      return {
        success: true,
        data: project,
      }
    } catch (error) {
      console.error('[ProjectService] Error updating project:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update project',
      }
    }
  }

  /**
   * Soft delete de um projeto (altera status para INACTIVE)
   * O projeto não é deletado fisicamente, apenas marcado como inativo
   */
  async softDelete(slug: string): Promise<OperationResult<ProjectDto>> {
    try {
      console.log('[ProjectService] 🗑️ Soft deleting project:', slug)

      // Buscar projeto atual
      const result = await this.getBySlug(slug)
      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Project not found',
        }
      }

      const project = result.data

      // Atualizar status para INACTIVE
      project.status = ProjectStatus.INACTIVE
      project.updatedAt = new Date().toISOString()

      // Salvar com nova versão
      const updateResult = await this.update(slug, project)

      if (updateResult.success) {
        console.log('[ProjectService] ✅ Project soft deleted:', slug)
      }

      return updateResult
    } catch (error) {
      console.error('[ProjectService] Error soft deleting project:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to soft delete project',
      }
    }
  }

  /**
   * Atualiza a equipe do projeto (adiciona, remove ou altera membros)
   * Persiste a lista completa de membros no Cockpit
   */
  async updateTeam(
    projectSlug: string,
    team: ProjectTeamMemberDto[]
  ): Promise<OperationResult<ProjectDto>> {
    try {
      console.log('[ProjectService] Updating project team:', {
        projectSlug,
        memberCount: team.length,
        members: team.map(m => `${m.name} (${m.role})`),
      })

      const projectResult = await this.getBySlug(projectSlug)
      if (!projectResult.success || !projectResult.data) {
        return {
          success: false,
          error: `Project not found: ${projectSlug}`,
        }
      }

      const project = projectResult.data

      // Substituir lista de membros inteira
      project.team = team
      project.updatedAt = new Date().toISOString()

      // Salvar projeto atualizado
      const updateResult = await this.update(projectSlug, project)

      if (updateResult.success) {
        console.log(`[ProjectService] ✅ Team updated: ${team.length} members`)
      }

      return updateResult
    } catch (error) {
      console.error('[ProjectService] Error updating team:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update project team',
      }
    }
  }

  /**
   * Atualiza o compartilhamento de um artefato no projeto
   * Usado quando um artefato é compartilhado via shareArtifact
   */
  async updateArtifactSharing(
    projectSlug: string,
    artifactKey: string,
    sharedWith: SharedWithInfo[]
  ): Promise<OperationResult<ProjectDto>> {
    try {
      console.log('[ProjectService] Updating artifact sharing:', {
        projectSlug,
        artifactKey,
        sharedWithCount: sharedWith.length,
      })

      const projectResult = await this.getBySlug(projectSlug)
      if (!projectResult.success || !projectResult.data) {
        return {
          success: false,
          error: `Project not found: ${projectSlug}`,
        }
      }

      const project = projectResult.data

      // Encontrar o artefato nos approvedArtifacts
      const artifactIndex = project.approvedArtifacts.findIndex(
        a => a.artifactKey === artifactKey
      )

      if (artifactIndex === -1) {
        console.warn(
          `[ProjectService] Artifact ${artifactKey} not found in project approvedArtifacts`
        )
        // Não é erro crítico - pode ser um artefato que ainda não foi aprovado
        return {
          success: true,
          data: project,
        }
      }

      // Atualizar o sharedWith do artefato
      project.approvedArtifacts[artifactIndex]!.sharedWith = sharedWith
      project.updatedAt = new Date().toISOString()

      console.log(
        `[ProjectService] ✅ Updated sharedWith for artifact ${artifactKey}: ${sharedWith.length} users`
      )

      // Salvar projeto atualizado
      return await this.update(projectSlug, project)
    } catch (error) {
      console.error('[ProjectService] Error updating artifact sharing:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update artifact sharing',
      }
    }
  }

  /**
   * Deleta um projeto (exclusão física)
   */
  async delete(slug: string): Promise<OperationResult<void>> {
    try {
      const key = getProjectKey(slug)
      const existing = await this.artifactService.getByKey(key)

      await this.artifactService.delete(existing.id)

      console.log('[ProjectService] ✅ Project deleted:', slug)

      return { success: true }
    } catch (error) {
      console.error('[ProjectService] Error deleting project:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete project',
      }
    }
  }
}
