// ============================================================================
// FACTORY FUNCTION
// ============================================================================

import { getApiBaseUrlSafe } from '@/shared/lib/api-helpers'

/**
 * Artifact Service
 *
 * Serviço para comunicação com a API de Artefatos do Cockpit
 * Implementação TypeScript baseada no cockpit-shared-entities SDK (Python)
 *
 * Endpoints implementados conforme SDK:
 * - GetAll: Lista todos artefatos com paginação
 * - GetById: Busca artefato por ID
 * - GetByKey: Busca artefato por chave
 * - GetByAccessibility: Filtra por nível de acesso
 * - GetByType: Filtra por tipo de artefato
 * - Create: Cria novo artefato
 * - Update: Atualiza artefato existente
 * - Delete: Remove artefato
 */

// ============================================================================
// TYPES - Baseados em cockpit_shared_entities/models/artifact.py
// ============================================================================

/**
 * Níveis de acessibilidade do artefato
 * CONFIRMADO: cockpit-portal que funciona usa UPPERCASE (NAMESPACE_USER, LICENSE, etc.)
 */
export enum ArtifactAccessibility {
  SYSTEM = 'SYSTEM',
  LICENSE = 'LICENSE',
  LICENSE_USER = 'LICENSE_USER',
  NAMESPACE = 'NAMESPACE',
  NAMESPACE_USER = 'NAMESPACE_USER',
}

/** Tipo do artefato */
export interface ArtifactTypeDto {
  id: string
  name: string
  description: string | null
  createdAt: string | null
  updatedAt: string | null
}

/** Versão do artefato */
export interface ArtifactVersionDto {
  id: string
  artifactId: string
  version: string | null
  value: string | null
  isProduction: boolean
  createdAt: string | null
  createdBy: string | null
  createdByName: string | null
}

/** DTO do Artefato - Leitura */
export interface ArtifactDto {
  id: string
  key: string
  description: string | null
  value: string | null
  accessibility: string | null
  type: string | null
  artifactTypeId: string | null
  metadata: string | null
  tags: string | null
  version: string | null
  secret: boolean
  versionCount: number
  locked: boolean
  artifactType: ArtifactTypeDto | null
  versions: ArtifactVersionDto[] | null
  createdAt: string | null
  updatedAt: string | null
  createdBy: string | null
  createdByName: string | null
  licenseId: string | null
  namespaceId: string | null
  userId: string | null
}

/** DTO para criação de artefato */
export interface ArtifactCreateDto {
  key: string
  description: string
  value: string
  accessibility: string
  type?: string
  secret?: boolean
  metadata?: string
  tags?: string
  version?: string
  artifactTypeId?: string
  complementaryInfos?: string
}

/**
 * DTO para atualização de artefato
 * IMPORTANTE: Baseado no cockpit-portal UpdateArtifactRequest
 * NÃO enviar: key, type, artifactTypeId - esses campos causam falha silenciosa na API
 */
export interface ArtifactUpdateDto {
  id: string
  value: string
  description: string
  secret: boolean
  accessibility: string
  metadata?: string
  tags?: string
  version?: string
}

/** Resultado paginado */
export interface PagedResultDto<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

/** Parâmetros de filtro e paginação - baseado em FilterPagedDto */
export interface FilterParams {
  page?: number
  pageSize?: number
  sortColumn?: string
  isAscending?: boolean
  licenseId?: string
  namespaceId?: string
  disabled?: boolean
  search?: string
  searchBy?: string
  accessibility?: string
}

/** Configuração do serviço */
export interface ArtifactServiceConfig {
  baseUrl: string
  accessToken: string
  licenseId: string
  namespaceId: string
}

/** Resposta padrão da API */
interface ApiResponse<T> {
  succeeded: boolean
  message?: string
  data?: T
  errors?: string[]
}

/**
 * DTO para busca por regex - baseado em ArtifactRegexSearchDto do SDK Python
 * Usado para buscar artefatos por padrão regex nos campos
 */
export interface ArtifactRegexSearchDto {
  /** Padrão regex para busca */
  pattern: string
  /** Buscar no campo Key */
  searchKey?: boolean
  /** Buscar no campo Value (JSON) */
  searchValue?: boolean
  /** Buscar no campo Description */
  searchDescription?: boolean
  /** Buscar no campo Metadata */
  searchMetadata?: boolean
  /** Buscar no campo Tags */
  searchTags?: boolean
  /** Número da página (1-based) */
  page?: number
  /** Itens por página */
  pageSize?: number
  /** Busca case insensitive */
  caseInsensitive?: boolean
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * Serviço de Artefatos
 * Implementa os métodos de comunicação com a API REST do Cockpit
 * conforme cockpit_shared_entities/services/artifact_service.py
 */
export class ArtifactService {
  private config: ArtifactServiceConfig
  private basePath = 'Artifact'

  constructor(config: ArtifactServiceConfig) {
    this.config = config
  }

  private get apiUrl(): string {
    return `${this.config.baseUrl}/api/${this.basePath}`
  }

  /** Expõe o namespaceId configurado (para validação externa) */
  get namespaceId(): string {
    return this.config.namespaceId
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.config.accessToken}`,
      LicenseId: this.config.licenseId,
      NamespaceId: this.config.namespaceId,
    }
  }

  /**
   * Converte FilterParams para query string
   * Equivalente a FilterPagedDto.to_query_params() do SDK Python
   */
  private toQueryParams(params?: FilterParams): URLSearchParams {
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params?.sortColumn) queryParams.append('sortColumn', params.sortColumn)
    if (params?.isAscending !== undefined)
      queryParams.append('isAscending', params.isAscending.toString())
    if (params?.licenseId) queryParams.append('licenseId', params.licenseId)
    if (params?.namespaceId)
      queryParams.append('namespaceId', params.namespaceId)
    if (params?.disabled !== undefined)
      queryParams.append('disabled', params.disabled.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.searchBy) queryParams.append('searchBy', params.searchBy)
    if (params?.accessibility)
      queryParams.append('accessibility', params.accessibility)

    return queryParams
  }

  /**
   * Extrai dados da resposta da API
   * Equivalente a BaseService._extract_data() do SDK Python
   */
  private extractData<T>(response: ApiResponse<T>): T {
    if (response.succeeded === false) {
      throw new Error(response.message || 'API request failed')
    }
    return response.data as T
  }

  /**
   * GET GetAll - Lista todos artefatos com paginação
   * Equivalente a ArtifactService.get_all() do SDK Python
   */
  async getAll(params?: FilterParams): Promise<PagedResultDto<ArtifactDto>> {
    const queryParams = this.toQueryParams(params)
    const queryString = queryParams.toString()
    const url = `${this.apiUrl}/GetAll${queryString ? `?${queryString}` : ''}`
    const headers = this.getHeaders()

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch artifacts: ${response.status} ${response.statusText}`
      )
    }

    const json: ApiResponse<PagedResultDto<ArtifactDto>> = await response.json()
    const data = this.extractData(json)

    return {
      items: data.items || [],
      totalCount: data.totalCount || 0,
      page: data.page || 1,
      pageSize: data.pageSize || 10,
    }
  }

  /**
   * GET GetById/{id} - Busca artefato por ID
   * Equivalente a ArtifactService.get_by_id() do SDK Python
   */
  async getById(id: string): Promise<ArtifactDto> {
    const url = `${this.apiUrl}/GetById/${id}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Artifact not found: ${id}`)
      }
      throw new Error(
        `Failed to fetch artifact: ${response.status} ${response.statusText}`
      )
    }

    const json: ApiResponse<ArtifactDto> = await response.json()
    return this.extractData(json)
  }

  /**
   * GET GetByKey/{key} - Busca artefato por chave
   * Equivalente a ArtifactService.get_by_key() do SDK Python
   */
  async getByKey(key: string): Promise<ArtifactDto> {
    const url = `${this.apiUrl}/GetByKey/${encodeURIComponent(key)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Artifact not found with key: ${key}`)
      }
      throw new Error(
        `Failed to fetch artifact: ${response.status} ${response.statusText}`
      )
    }

    const json: ApiResponse<ArtifactDto> = await response.json()
    return this.extractData(json)
  }

  /**
   * GET Get/{accessibility} - Busca artefatos por nível de acessibilidade
   * Equivalente a ArtifactService.get_by_accessibility() do SDK Python
   */
  async getByAccessibility(
    accessibility: ArtifactAccessibility | string,
    params?: FilterParams
  ): Promise<PagedResultDto<ArtifactDto>> {
    const queryParams = this.toQueryParams(params)
    const queryString = queryParams.toString()
    const url = `${this.apiUrl}/Get/${accessibility}${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch artifacts: ${response.status} ${response.statusText}`
      )
    }

    const json: ApiResponse<PagedResultDto<ArtifactDto>> = await response.json()
    const data = this.extractData(json)

    return {
      items: data.items || [],
      totalCount: data.totalCount || 0,
      page: data.page || 1,
      pageSize: data.pageSize || 10,
    }
  }

  /**
   * GET GetByType/{typeId} - Busca artefatos por tipo
   * Equivalente a ArtifactService.get_by_type() do SDK Python
   */
  async getByType(
    typeId: string,
    params?: FilterParams
  ): Promise<PagedResultDto<ArtifactDto>> {
    const queryParams = this.toQueryParams(params)
    const queryString = queryParams.toString()
    const url = `${this.apiUrl}/GetByType/${typeId}${queryString ? `?${queryString}` : ''}`

    console.log('[ArtifactService] GetByType:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch artifacts: ${response.status} ${response.statusText}`
      )
    }

    const json: ApiResponse<PagedResultDto<ArtifactDto>> = await response.json()
    const data = this.extractData(json)

    return {
      items: data.items || [],
      totalCount: data.totalCount || 0,
      page: data.page || 1,
      pageSize: data.pageSize || 10,
    }
  }

  /**
   * POST Create - Cria novo artefato
   * Equivalente a ArtifactService.create() do SDK Python
   */
  async create(artifact: ArtifactCreateDto): Promise<ArtifactDto> {
    const url = `${this.apiUrl}/Create`

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(artifact),
    })

    if (!response.ok) {
      const errorText = await response.text()

      if (response.status === 400) {
        try {
          const error = JSON.parse(errorText)
          // Usar console.warn para "already exists" — não é erro fatal
          if (error.message?.includes('already exists')) {
            console.warn(
              '⚠️ Artifact already exists:',
              artifact.key || errorText
            )
          } else {
            console.error('❌ Error Response:', errorText)
          }
          throw new Error(
            `Validation error: ${error.message || 'Invalid artifact data'}`
          )
        } catch (parseErr) {
          if (
            parseErr instanceof Error &&
            parseErr.message.startsWith('Validation error:')
          ) {
            throw parseErr
          }
          console.error('❌ Error Response:', errorText)
          throw new Error(`Validation error: ${errorText}`)
        }
      }
      console.error('❌ Error Response:', errorText)
      throw new Error(
        `Failed to create artifact: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const json: ApiResponse<ArtifactDto> = await response.json()
    return this.extractData(json)
  }

  /**
   * PUT Update - Atualiza artefato existente
   * Equivalente a ArtifactService.update() do SDK Python
   */
  async update(artifact: ArtifactUpdateDto): Promise<ArtifactDto> {
    const url = `${this.apiUrl}/Update`

    // Log completo do request body
    const requestBody = JSON.stringify(artifact)
    console.log(`[ArtifactService.update] 🔍 Request URL: ${url}`)
    console.log(
      `[ArtifactService.update] 🔍 Request Body Keys:`,
      Object.keys(artifact)
    )
    console.log(
      `[ArtifactService.update] 🔍 Request Body (first 500 chars):`,
      requestBody.substring(0, 500)
    )
    console.log(`[ArtifactService.update] 🔍 Full artifact object:`, {
      id: artifact.id,
      description: artifact.description?.substring(0, 50),
      valueLength: artifact.value?.length || 0,
      accessibility: artifact.accessibility,
      secret: artifact.secret,
      version: artifact.version,
    })

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: requestBody,
    })

    console.log(`[ArtifactService.update] Response status: ${response.status}`)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Artifact not found: ${artifact.id}`)
      }
      if (response.status === 400) {
        const error = await response.json()
        console.error(`[ArtifactService.update] Validation error:`, error)
        throw new Error(
          `Validation error: ${error.message || 'Invalid artifact data'}`
        )
      }
      const errorText = await response.text()
      console.error(`[ArtifactService.update] Error response:`, errorText)
      throw new Error(
        `Failed to update artifact: ${response.status} ${response.statusText}`
      )
    }

    const json: ApiResponse<ArtifactDto> = await response.json()
    console.log(
      `[ArtifactService.update] 🔍 Response JSON completo:`,
      JSON.stringify(json).substring(0, 1000)
    )
    console.log(`[ArtifactService.update] ✅ Resposta da API:`, {
      succeeded: json.succeeded,
      hasData: !!json.data,
      id: json.data?.id,
      responseValueLength: json.data?.value?.length || 0,
    })
    return this.extractData(json)
  }

  /**
   * DELETE Delete/{id} - Remove artefato
   * Equivalente a ArtifactService.delete() do SDK Python
   */
  async delete(id: string): Promise<void> {
    const url = `${this.apiUrl}/Delete/${id}`

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Artifact not found: ${id}`)
      }
      throw new Error(
        `Failed to delete artifact: ${response.status} ${response.statusText}`
      )
    }
  }

  /**
   * POST SearchByRegex - Busca artefatos usando padrão regex
   * Equivalente a ArtifactService.search_by_regex() do SDK Python
   *
   * IMPORTANTE: Busca no campo Value (JSON) para encontrar emails no campo team
   */
  async searchByRegex(
    searchParams: ArtifactRegexSearchDto
  ): Promise<PagedResultDto<ArtifactDto>> {
    const url = `${this.apiUrl}/SearchByRegex`

    // Normalizar valores dos parâmetros
    const body = {
      pattern: searchParams.pattern,
      searchKey: searchParams.searchKey ?? false,
      searchValue: searchParams.searchValue ?? true,
      searchDescription: searchParams.searchDescription ?? false,
      searchMetadata: searchParams.searchMetadata ?? false,
      searchTags: searchParams.searchTags ?? false,
      page: searchParams.page ?? 1,
      pageSize: searchParams.pageSize ?? 10,
      caseInsensitive: searchParams.caseInsensitive ?? true,
    }

    // Converter para snake_case conforme esperado pela API
    const apiBody = {
      pattern: body.pattern,
      search_key: body.searchKey,
      search_value: body.searchValue,
      search_description: body.searchDescription,
      search_metadata: body.searchMetadata,
      search_tags: body.searchTags,
      page: body.page,
      page_size: body.pageSize,
      case_insensitive: body.caseInsensitive,
    }

    console.log('[ArtifactService.searchByRegex] 🔍 Buscando com regex:', {
      pattern: apiBody.pattern,
      search_value: apiBody.search_value,
      search_key: apiBody.search_key,
      page_size: apiBody.page_size,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(apiBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        '[ArtifactService.searchByRegex] ❌ Erro:',
        response.status,
        errorText
      )
      throw new Error(
        `Failed to search artifacts by regex: ${response.status} ${response.statusText}`
      )
    }

    const json: ApiResponse<PagedResultDto<ArtifactDto>> = await response.json()
    const data = this.extractData(json)

    console.log('[ArtifactService.searchByRegex] ✅ Resultados:', {
      totalCount: data.totalCount,
      itemsReturned: data.items?.length || 0,
    })

    return {
      items: data.items || [],
      totalCount: data.totalCount || 0,
      page: data.page || 1,
      pageSize: data.pageSize || 10,
    }
  }

  /**
   * GET ArtifactVersion/GetByArtifact/{artifactId} - Busca todas as versões de um artefato
   * Equivalente a ArtifactVersionService.get_by_artifact() do SDK Python
   */
  async getVersionsByArtifactId(
    artifactId: string
  ): Promise<ArtifactVersionDto[]> {
    // Usa a API de versões: /api/ArtifactVersion/GetByArtifact/{artifactId}
    const url = `${this.config.baseUrl}/api/ArtifactVersion/GetByArtifact/${artifactId}`

    console.log(
      `[ArtifactService.getVersionsByArtifactId] Buscando versões do artefato: ${artifactId}`
    )

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.log(
          `[ArtifactService.getVersionsByArtifactId] Nenhuma versão encontrada`
        )
        return []
      }
      throw new Error(
        `Failed to fetch artifact versions: ${response.status} ${response.statusText}`
      )
    }

    const json: ApiResponse<ArtifactVersionDto[]> = await response.json()
    const versions = this.extractData(json) || []

    console.log(
      `[ArtifactService.getVersionsByArtifactId] ${versions.length} versões encontradas`
    )

    return versions
  }

  /**
   * Busca o valor da versão mais recente de um artefato
   * A API pode retornar a versão de produção no artifact.value,
   * então precisamos buscar explicitamente a versão mais recente
   */
  async getLatestVersionValue(artifactId: string): Promise<string | null> {
    try {
      const versions = await this.getVersionsByArtifactId(artifactId)

      if (!versions || versions.length === 0) {
        console.log(
          `[ArtifactService.getLatestVersionValue] Nenhuma versão encontrada para ${artifactId}`
        )
        return null
      }

      // LOG DETALHADO: Mostrar todas as versões para investigação
      console.log(
        `[ArtifactService.getLatestVersionValue] 📊 INVESTIGAÇÃO - ${versions.length} versões encontradas:`
      )
      versions.forEach((v, idx) => {
        // Tentar extrair contagem de mensagens do value
        let messageCount = 'N/A'
        try {
          const parsed = JSON.parse(v.value || '{}')
          messageCount = String(parsed.messages?.length || 0)
        } catch {
          messageCount = 'parse error'
        }
        console.log(
          `  [${idx}] version=${v.version}, created=${v.createdAt}, isProduction=${v.isProduction}, valueLength=${v.value?.length || 0}, messages=${messageCount}`
        )
      })

      // Ordenar por createdAt (mais antiga primeiro, mais recente por último)
      const sortedVersions = [...versions].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateA - dateB // Ascendente (mais antiga primeiro, mais recente por último)
      })

      // A última versão é a mais recente (último elemento do array)
      const latestVersion = sortedVersions[sortedVersions.length - 1]

      // LOG: Comparar versão de produção vs mais recente
      const productionVersion = versions.find(v => v.isProduction)
      if (productionVersion && productionVersion.id !== latestVersion?.id) {
        let prodMsgCount = 'N/A',
          latestMsgCount = 'N/A'
        try {
          const prodParsed = JSON.parse(productionVersion.value || '{}')
          prodMsgCount = String(prodParsed.messages?.length || 0)
        } catch {
          /* ignore */
        }
        try {
          const latestParsed = JSON.parse(latestVersion?.value || '{}')
          latestMsgCount = String(latestParsed.messages?.length || 0)
        } catch {
          /* ignore */
        }
        console.log(
          `[ArtifactService.getLatestVersionValue] ⚠️ DIVERGÊNCIA: Produção (${prodMsgCount} msgs) vs Mais Recente (${latestMsgCount} msgs)`
        )
      }

      console.log(
        `[ArtifactService.getLatestVersionValue] Versão mais recente:`,
        {
          versionId: latestVersion?.id,
          version: latestVersion?.version,
          createdAt: latestVersion?.createdAt,
          isProduction: latestVersion?.isProduction,
          valueLength: latestVersion?.value?.length || 0,
        }
      )

      return latestVersion?.value || null
    } catch (error) {
      console.error(`[ArtifactService.getLatestVersionValue] Erro:`, error)
      return null
    }
  }

  /**
   * Busca um artefato por key e retorna o valor mais atualizado
   *
   * IMPORTANTE: Compara a data de atualização do artefato base com a versão mais recente
   * e usa o valor que for mais atual. Isso garante que edições feitas diretamente
   * no artefato (sem criar versão) também sejam consideradas.
   */
  async getByKeyWithLatestVersion(key: string): Promise<ArtifactDto> {
    // Primeiro busca o artefato
    const artifact = await this.getByKey(key)

    console.log(
      `[ArtifactService.getByKeyWithLatestVersion] Artefato encontrado:`,
      {
        id: artifact.id,
        key: artifact.key,
        version: artifact.version,
        versionCount: artifact.versionCount,
        updatedAt: artifact.updatedAt,
        valueLength: artifact.value?.length || 0,
      }
    )

    // Buscar as versões para comparar
    console.log(
      `[ArtifactService.getByKeyWithLatestVersion] Buscando versões para comparar...`
    )

    const versions = await this.getVersionsByArtifactId(artifact.id)

    if (!versions || versions.length === 0) {
      console.log(
        `[ArtifactService.getByKeyWithLatestVersion] Nenhuma versão encontrada, usando valor do artefato base`
      )
      return artifact
    }

    // Encontrar a versão mais recente por data
    const sortedVersions = [...versions].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA // Descendente (mais recente primeiro)
    })
    const latestVersion = sortedVersions[0]

    // Comparar datas: artifact.updatedAt vs latestVersion.createdAt
    const artifactUpdatedAt = artifact.updatedAt
      ? new Date(artifact.updatedAt).getTime()
      : 0
    const versionCreatedAt = latestVersion?.createdAt
      ? new Date(latestVersion.createdAt).getTime()
      : 0

    console.log(
      `[ArtifactService.getByKeyWithLatestVersion] Comparando datas:`,
      {
        artifactUpdatedAt: artifact.updatedAt,
        artifactUpdatedAtMs: artifactUpdatedAt,
        versionCreatedAt: latestVersion?.createdAt,
        versionCreatedAtMs: versionCreatedAt,
        latestVersionId: latestVersion?.id,
      }
    )

    // Usar o valor mais recente entre artefato base e versão
    if (artifactUpdatedAt > versionCreatedAt) {
      console.log(
        `[ArtifactService.getByKeyWithLatestVersion] ✅ Usando valor do artefato base (mais recente)`
      )
      // artifact.value já está correto
    } else if (latestVersion?.value) {
      console.log(
        `[ArtifactService.getByKeyWithLatestVersion] ✅ Usando valor da versão mais recente`
      )
      artifact.value = latestVersion.value
    }

    return artifact
  }

  /**
   * Renomeia uma versão de artefato
   * Armazena o label customizado no metadata do artefato pai
   *
   * @param artifactId - ID do artefato pai
   * @param versionId - ID da versão a renomear
   * @param newLabel - Novo nome/label (3-60 caracteres)
   * @param userId - ID do usuário que está renomeando
   * @param userName - Nome do usuário que está renomeando
   * @returns Artefato atualizado com metadata contendo o novo label
   */
  async renameVersion(
    artifactId: string,
    versionId: string,
    newLabel: string,
    userId: string,
    userName: string
  ): Promise<{
    success: boolean
    previousLabel?: string
    newLabel: string
    renamedAt: string
  }> {
    console.log('[ArtifactService.renameVersion] Iniciando renomeação:', {
      artifactId,
      versionId,
      newLabel,
      userId,
    })

    try {
      // 1. Buscar artefato atual
      const artifact = await this.getById(artifactId)

      // 2. Parsear metadata existente
      let metadata: Record<string, unknown> = {}
      if (artifact.metadata) {
        try {
          metadata = JSON.parse(artifact.metadata)
        } catch {
          console.warn(
            '[ArtifactService.renameVersion] Erro ao parsear metadata existente, criando novo'
          )
        }
      }

      // 3. Obter labels existentes
      const versionLabels =
        (metadata.versionLabels as Record<
          string,
          {
            label: string
            renamedAt: string
            renamedBy: string
            renamedByName: string
            previousLabel?: string
          }
        >) || {}

      // 4. Capturar label anterior para auditoria
      const previousLabel = versionLabels[versionId]?.label

      // 5. Atualizar label
      const renamedAt = new Date().toISOString()
      versionLabels[versionId] = {
        label: newLabel,
        renamedAt,
        renamedBy: userId,
        renamedByName: userName,
        previousLabel: previousLabel || undefined,
      }

      // 6. Atualizar metadata
      metadata.versionLabels = versionLabels

      // 7. Salvar artefato atualizado (apenas metadata)
      const updateDto: ArtifactUpdateDto = {
        id: artifact.id,
        value: artifact.value || '',
        description: artifact.description || '',
        secret: artifact.secret,
        accessibility: artifact.accessibility || 'NAMESPACE_USER',
        metadata: JSON.stringify(metadata),
      }

      await this.update(updateDto)

      console.log('[ArtifactService.renameVersion] ✅ Versão renomeada:', {
        versionId,
        previousLabel,
        newLabel,
        renamedAt,
      })

      return {
        success: true,
        previousLabel,
        newLabel,
        renamedAt,
      }
    } catch (error) {
      console.error('[ArtifactService.renameVersion] ❌ Erro:', error)
      throw error
    }
  }

  /**
   * Obtém os labels customizados de versões de um artefato
   * Busca de um artefato SEPARADO (version-labels-{artifactId}) para não
   * criar novas versões ao atualizar labels.
   *
   * @param artifactId - ID do artefato principal
   * @returns Mapa de versionId -> label info
   */
  async getVersionLabels(artifactId: string): Promise<Record<
    string,
    {
      label: string
      renamedAt: string
      renamedBy: string
      renamedByName: string
      previousLabel?: string
    }
  > | null> {
    try {
      // Buscar artefato de labels separado pela key COM A VERSÃO MAIS RECENTE
      // Importante: usar getByKeyWithLatestVersion para garantir que pegamos os labels mais atualizados
      const labelsKey = `version-labels-${artifactId}`
      const labelsArtifact = await this.getByKeyWithLatestVersion(labelsKey)

      if (!labelsArtifact?.value) {
        return null
      }

      const parsed = JSON.parse(labelsArtifact.value)
      return parsed.labels || null
    } catch (error) {
      // Se não encontrar (404 -> "Artifact not found"), retorna null silenciosamente
      if (error instanceof Error && error.message.includes('not found')) {
        return null
      }
      console.error('[ArtifactService.getVersionLabels] Erro:', error)
      return null
    }
  }
}

// ============================================================================
// ARTIFACT TYPE SERVICE
// ============================================================================

/** Interface para item de tipo de artefato */
export interface ArtifactTypeItem {
  id: string // UUID do tipo
  name: string // Nome do tipo (ex: "JSON", "string", "MCPClient")
  description: string | null
  complementaryInfos?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

/** Cache de IDs de tipos de artefatos */
let artifactTypesCache: ArtifactTypeItem[] | null = null

/**
 * Busca todos os tipos de artefatos da API
 * Endpoint: GET /api/ArtifactType
 */
export async function getArtifactTypes(
  baseUrl: string,
  accessToken: string,
  licenseId: string,
  namespaceId: string
): Promise<ArtifactTypeItem[]> {
  // Retorna cache se disponível
  if (artifactTypesCache) {
    return artifactTypesCache
  }

  const url = `${baseUrl}/api/ArtifactType`

  console.log('[ArtifactService] Fetching artifact types from:', url)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      LicenseId: licenseId,
      NamespaceId: namespaceId,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch artifact types: ${response.status} ${response.statusText}`
    )
  }

  const responseData = await response.json()

  // 🔧 DEBUG: Log da resposta crua da API
  console.log('[ArtifactService] Raw API response:', responseData)
  console.log('[ArtifactService] Response type:', typeof responseData)
  console.log('[ArtifactService] Is array?:', Array.isArray(responseData))

  // Trata diferentes formatos de resposta da API
  let types: ArtifactTypeItem[]

  if (Array.isArray(responseData)) {
    // Resposta é diretamente um array
    types = responseData
  } else if (responseData?.data && Array.isArray(responseData.data)) {
    // Resposta no formato { data: [...] }
    types = responseData.data
  } else if (responseData?.items && Array.isArray(responseData.items)) {
    // Resposta no formato { items: [...] }
    types = responseData.items
  } else {
    console.error('[ArtifactService] Unexpected response format:', responseData)
    throw new Error(
      'Invalid response format from ArtifactType API: expected array'
    )
  }

  // Salva no cache
  artifactTypesCache = types

  console.log(
    '[ArtifactService] Artifact types loaded:',
    types.map(t => `${t.name}=${t.id}`)
  )

  return types
}

/**
 * Encontra o ID (UUID) de um tipo de artefato pelo nome
 * @param typeName Nome do tipo (ex: "JSON", "string")
 * @returns UUID do tipo ou undefined se não encontrar
 */
export async function getArtifactTypeId(
  typeName: string,
  baseUrl: string,
  accessToken: string,
  licenseId: string,
  namespaceId: string
): Promise<string | undefined> {
  const types = await getArtifactTypes(
    baseUrl,
    accessToken,
    licenseId,
    namespaceId
  )

  // Busca pelo nome exato (case-insensitive)
  const found = types.find(t => t.name.toLowerCase() === typeName.toLowerCase())

  if (found) {
    console.log(
      `[ArtifactService] Found type "${typeName}" with ID: ${found.id}`
    )
    return found.id
  }

  console.warn(
    `[ArtifactService] Type "${typeName}" not found in available types:`,
    types.map(t => t.name)
  )
  return undefined
}

/**
 * Limpa o cache de tipos de artefatos
 */
export function clearArtifactTypesCache(): void {
  artifactTypesCache = null
}

/**
 * Cria uma instância do serviço com as credenciais
 * Usa runtime config para obter a base URL (funciona em produção com Docker)
 */
export function createArtifactService(
  accessToken: string,
  licenseId: string,
  namespaceId: string
): ArtifactService {
  const baseUrl = getApiBaseUrlSafe() || ''

  if (!baseUrl) {
    throw new Error('API URL not configured. Check /api/config endpoint.')
  }

  return new ArtifactService({
    baseUrl,
    accessToken,
    licenseId,
    namespaceId,
  })
}
