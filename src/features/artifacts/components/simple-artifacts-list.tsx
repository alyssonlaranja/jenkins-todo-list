/**
 * Simple Artifacts List Component
 *
 * Lista simples de artefatos centralizada na tela
 * Faz requisições diretas à API usando o serviço implementado
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'

import { getApiBaseUrlSafe } from '@/shared/lib/api-helpers'

import {
  ArtifactDto,
  ArtifactService,
  ArtifactVersionDto,
} from '../services/artifact.service'

export function SimpleArtifactsList() {
  const { data: session } = useSession()

  const [artifacts, setArtifacts] = useState<ArtifactDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Estado para o dropdown de versões
  const [versionDropdownId, setVersionDropdownId] = useState<string | null>(
    null
  )
  const [artifactVersions, setArtifactVersions] = useState<
    Record<string, ArtifactVersionDto[]>
  >({})
  const [loadingVersions, setLoadingVersions] = useState<string | null>(null)
  const [selectedVersionValue, setSelectedVersionValue] = useState<
    Record<string, string | null>
  >({})
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setVersionDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cria o serviço com as credenciais
  const createService = useCallback(() => {
    // Obtém credenciais do localStorage
    if (typeof window === 'undefined') return null

    try {
      const permissionStoreRaw = localStorage.getItem('permission-store')
      if (!permissionStoreRaw) {
        console.warn('[SimpleArtifactsList] permission-store not found')
        return null
      }

      const permissionStore = JSON.parse(permissionStoreRaw)

      // Credenciais do permission-store
      const licenseId = permissionStore?.state?.activeLicenseId
      const namespaceId = permissionStore?.state?.activeNamespaceId

      if (!licenseId || !namespaceId) {
        console.warn(
          '[SimpleArtifactsList] Missing license or namespace. Please select them first.'
        )
        return null
      }

      const accessToken = (session as { accessToken?: string })?.accessToken

      if (!accessToken) {
        console.warn('[SimpleArtifactsList] Missing accessToken')
        return null
      }

      // Usa a URL da API via runtime config (funciona em produção com Docker)
      const baseUrl = getApiBaseUrlSafe() || ''

      // 🔍 DEBUG: Log das credenciais para teste
      console.log(
        '%c[ARTIFACTS DEBUG] Credenciais da requisição:',
        'background: #FF6600; color: white; padding: 4px 8px; border-radius: 4px;'
      )
      console.table({
        'API Base URL': baseUrl,
        'License ID': licenseId,
        'Namespace ID': namespaceId,
        'Access Token': accessToken
          ? `${accessToken.substring(0, 20)}...`
          : 'NULL',
        'Token Length': accessToken?.length || 0,
      })

      return new ArtifactService({
        baseUrl,
        accessToken,
        licenseId,
        namespaceId,
      })
    } catch (e) {
      console.error('[SimpleArtifactsList] Error creating service:', e)
      return null
    }
  }, [session])

  // Busca artefatos da API
  const fetchArtifacts = useCallback(async () => {
    const service = createService()
    if (!service) {
      setError('Credenciais não encontradas. Faça login novamente.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[SimpleArtifactsList] Fetching artifacts...')

      const result = await service.getAll({
        page,
        pageSize,
        search: searchTerm || undefined,
      })

      console.log(
        '[SimpleArtifactsList] Received:',
        result.items.length,
        'artifacts'
      )

      setArtifacts(result.items)
      setTotalCount(result.totalCount)
    } catch (e) {
      console.error('[SimpleArtifactsList] Error:', e)
      setError(e instanceof Error ? e.message : 'Erro ao carregar artefatos')
    } finally {
      setIsLoading(false)
    }
  }, [createService, page, pageSize, searchTerm])

  // Busca versões de um artefato específico
  const fetchVersions = useCallback(
    async (artifactId: string) => {
      // Se já temos as versões em cache, não busca novamente
      if (artifactVersions[artifactId]) {
        return
      }

      const service = createService()
      if (!service) return

      setLoadingVersions(artifactId)
      try {
        console.log('[SimpleArtifactsList] Fetching versions for:', artifactId)
        const versions = await service.getVersionsByArtifactId(artifactId)

        // Ordena por data (mais antiga primeiro, mais recente por último)
        // Versão 1 = primeira criada, Versão N = última atualização
        const sortedVersions = [...versions].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateA - dateB // Ascendente
        })

        console.log(
          '[SimpleArtifactsList] Found',
          sortedVersions.length,
          'versions'
        )
        setArtifactVersions(prev => ({ ...prev, [artifactId]: sortedVersions }))
      } catch (e) {
        console.error('[SimpleArtifactsList] Error fetching versions:', e)
      } finally {
        setLoadingVersions(null)
      }
    },
    [createService, artifactVersions]
  )

  // Toggle dropdown de versões
  const toggleVersionDropdown = async (
    e: React.MouseEvent,
    artifactId: string
  ) => {
    e.stopPropagation() // Não expande o card principal

    if (versionDropdownId === artifactId) {
      setVersionDropdownId(null)
    } else {
      setVersionDropdownId(artifactId)
      await fetchVersions(artifactId)
    }
  }

  // Seleciona uma versão específica
  const selectVersion = (artifactId: string, version: ArtifactVersionDto) => {
    setSelectedVersionValue(prev => ({
      ...prev,
      [artifactId]: version.value,
    }))
    setVersionDropdownId(null)
  }

  // Carrega artefatos quando session muda
  useEffect(() => {
    if (session) {
      fetchArtifacts()
    }
  }, [session, fetchArtifacts])

  // Toggle expanded artifact - busca versões e seleciona a mais recente automaticamente
  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      // Busca versões ao expandir e seleciona automaticamente a mais recente
      if (!artifactVersions[id]) {
        await fetchVersionsAndSelectLatest(id)
      } else if (!selectedVersionValue[id]) {
        // Se já tem versões mas não selecionou, seleciona a mais recente
        const versions = artifactVersions[id]
        if (versions && versions.length > 0) {
          const latestVersion = versions[versions.length - 1]
          if (latestVersion?.value) {
            setSelectedVersionValue(prev => ({
              ...prev,
              [id]: latestVersion.value,
            }))
          }
        }
      }
    }
  }

  // Busca versões e seleciona a mais recente automaticamente
  const fetchVersionsAndSelectLatest = async (artifactId: string) => {
    const service = createService()
    if (!service) return

    setLoadingVersions(artifactId)
    try {
      const versions = await service.getVersionsByArtifactId(artifactId)

      const sortedVersions = [...versions].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateA - dateB
      })

      setArtifactVersions(prev => ({ ...prev, [artifactId]: sortedVersions }))

      // Seleciona automaticamente a versão mais recente (última)
      if (sortedVersions.length > 0) {
        const latestVersion = sortedVersions[sortedVersions.length - 1]
        if (latestVersion?.value) {
          setSelectedVersionValue(prev => ({
            ...prev,
            [artifactId]: latestVersion.value,
          }))
        }
      }
    } catch (e) {
      console.error('[SimpleArtifactsList] Error fetching versions:', e)
    } finally {
      setLoadingVersions(null)
    }
  }

  // Handle search
  const handleSearch = () => {
    setPage(1)
    fetchArtifacts()
  }

  // Total pages
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="flex min-h-screen flex-col items-center justify-start p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            Artefatos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {totalCount} artefatos encontrados
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por chave ou descrição..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buscar
          </button>
          <button
            onClick={fetchArtifacts}
            disabled={isLoading}
            className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <RefreshCw
              className={`size-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-4 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-orange-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              Carregando...
            </span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && artifacts.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-4 size-16 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-600 dark:text-gray-400">
              Nenhum artefato encontrado
            </p>
          </div>
        )}

        {/* Artifacts List */}
        {!isLoading && artifacts.length > 0 && (
          <div className="space-y-2">
            {artifacts.map(artifact => (
              <div
                key={artifact.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              >
                {/* List Item Header */}
                <button
                  onClick={() => toggleExpand(artifact.id)}
                  className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3 text-left">
                    <FileText className="size-5 shrink-0 text-orange-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {artifact.key}
                      </p>
                      <p className="max-w-lg truncate text-sm text-gray-500 dark:text-gray-400">
                        {artifact.description || 'Sem descrição'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {artifact.type || artifact.artifactType?.name || 'N/A'}
                    </span>
                    {expandedId === artifact.id ? (
                      <ChevronUp className="size-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="size-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedId === artifact.id && (
                  <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                    <div className="space-y-3">
                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            ID:
                          </span>
                          <span className="ml-2 font-mono text-xs text-gray-900 dark:text-white">
                            {artifact.id}
                          </span>
                        </div>
                        <div
                          className="relative"
                          ref={
                            versionDropdownId === artifact.id
                              ? dropdownRef
                              : null
                          }
                        >
                          <span className="text-gray-500 dark:text-gray-400">
                            Versão:
                          </span>
                          <button
                            onClick={e => toggleVersionDropdown(e, artifact.id)}
                            className="ml-2 inline-flex items-center gap-1 rounded bg-orange-100 px-2 py-0.5 text-sm font-medium text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50"
                          >
                            {loadingVersions === artifact.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <History className="size-3" />
                            )}
                            {artifact.versionCount || 1} versões
                            <ChevronDown className="size-3" />
                          </button>

                          {/* Dropdown de Versões */}
                          {versionDropdownId === artifact.id && (
                            <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                              <div className="max-h-64 overflow-y-auto p-2">
                                {loadingVersions === artifact.id ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="size-5 animate-spin text-orange-500" />
                                    <span className="ml-2 text-sm text-gray-500">
                                      Carregando...
                                    </span>
                                  </div>
                                ) : (artifactVersions[artifact.id]?.length ??
                                    0) > 0 ? (
                                  <div className="space-y-1">
                                    {(artifactVersions[artifact.id] ?? []).map(
                                      (version, idx) => (
                                        <button
                                          key={version.id}
                                          onClick={e => {
                                            e.stopPropagation()
                                            selectVersion(artifact.id, version)
                                          }}
                                          className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                            version.isProduction
                                              ? 'bg-green-50 dark:bg-green-900/20'
                                              : ''
                                          }`}
                                        >
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium text-gray-900 dark:text-white">
                                                Versão {idx + 1}
                                              </span>
                                              {version.isProduction && (
                                                <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                  Produção
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                              {version.createdAt
                                                ? new Date(
                                                    version.createdAt
                                                  ).toLocaleString('pt-BR')
                                                : 'Data desconhecida'}
                                            </div>
                                          </div>
                                          <div className="text-xs text-gray-400">
                                            {version.value
                                              ? `${Math.round(version.value.length / 1024)}KB`
                                              : '-'}
                                          </div>
                                        </button>
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <div className="py-4 text-center text-sm text-gray-500">
                                    Nenhuma versão encontrada
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Acessibilidade:
                          </span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {artifact.accessibility || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Criado por:
                          </span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {artifact.createdByName || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Value/Content - Mostra versão selecionada ou valor atual */}
                      {!artifact.secret && (
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Conteúdo
                              {selectedVersionValue[artifact.id]
                                ? ' (versão selecionada)'
                                : ''}
                              :
                            </p>
                            {selectedVersionValue[artifact.id] && (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  setSelectedVersionValue(prev => {
                                    const newState = { ...prev }
                                    delete newState[artifact.id]
                                    return newState
                                  })
                                }}
                                className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400"
                              >
                                Voltar ao atual
                              </button>
                            )}
                          </div>
                          <pre className="max-h-64 overflow-x-auto rounded bg-gray-900 p-3 text-sm text-green-400 dark:bg-gray-950">
                            {(() => {
                              const content =
                                selectedVersionValue[artifact.id] ||
                                artifact.value ||
                                ''
                              return content.length > 2000
                                ? content.substring(0, 2000) + '...'
                                : content
                            })()}
                          </pre>
                        </div>
                      )}

                      {artifact.secret && (
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">
                          🔒 Conteúdo secreto - não exibido
                        </div>
                      )}

                      {/* Tags */}
                      {artifact.tags && (
                        <div className="flex flex-wrap gap-1">
                          {artifact.tags.split(',').map((tag, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                            >
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
