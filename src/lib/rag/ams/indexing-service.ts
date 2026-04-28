/**
 * AMS RAG Indexing Service - Serviço para indexação no Azure AI Search (AMS Version)
 *
 * 🆕 VERSÃO AMS: Usada pelo AMS Portal com extração de config do campo instruction
 *
 * Este serviço é responsável por:
 * 1. Gerar embeddings via Azure OpenAI
 * 2. Fazer chunking de documentos longos
 * 3. Indexar documentos no Azure AI Search via REST API
 *
 * DIFERENÇA vs SDA2:
 * - SDA2: Usa extract-knowledge-config.ts (busca em role/specialty)
 * - AMS: Usa ams/extract-knowledge-config.ts (busca em instruction/role/specialty)
 *
 * A BUSCA é feita pelo agente supervisor via tool dedicada.
 * Este serviço cuida apenas da INDEXAÇÃO.
 *
 * NOTA: Usamos a API REST do Azure ao invés do SDK para evitar dependências extras.
 */

import type { IndexResponse } from '../types'
import type { AMSDynamicSearchConfig, AMSIndexArtifactRequest } from './types'

// ============================================================================
// SCORE CONVERSION UTILITIES
// ============================================================================

/**
 * Converter @search.rerankerScore para porcentagem conforme tabela canônica
 *
 * Tabela de conversão:
 * - > 3.0     → 70-100%
 * - 2.0-3.0   → 50-69%
 * - 1.0-2.0   → 40-49%
 * - < 1.0     → <40%
 *
 * @param rerankerScore - Score do reranker do Azure AI Search
 * @returns Porcentagem de relevância (0-100)
 */
function convertRerankerScoreToPercentage(rerankerScore: number): number {
  if (rerankerScore > 3.0) {
    // 3.0-4.0 → 70-100% (interpolação linear)
    // Assumindo que o max prático é ~4.0
    const normalized = Math.min((rerankerScore - 3.0) / 1.0, 1.0)
    return 70 + normalized * 30
  } else if (rerankerScore >= 2.0) {
    // 2.0-3.0 → 50-69%
    const normalized = (rerankerScore - 2.0) / 1.0
    return 50 + normalized * 19
  } else if (rerankerScore >= 1.0) {
    // 1.0-2.0 → 40-49%
    const normalized = (rerankerScore - 1.0) / 1.0
    return 40 + normalized * 9
  } else {
    // < 1.0 → 0-39%
    return Math.max(0, rerankerScore * 40)
  }
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

/**
 * Obter configuração do Azure AI Search
 *
 * Prioridade:
 * 1. Configuração dinâmica passada como parâmetro (do agente AMS Knowledge)
 * 2. Variáveis de ambiente (fallback)
 */
function getSearchConfig(dynamicConfig?: AMSDynamicSearchConfig) {
  // Prioridade 1: Config dinâmica do agente Knowledge
  if (dynamicConfig) {
    globalThis.console.log(
      '🔧 [AMS RAG] Usando config dinâmica do agente AMS Knowledge:',
      {
        endpoint: dynamicConfig.azure_search_endpoint,
        indexName: dynamicConfig.index_name,
      }
    )
    return {
      endpoint: dynamicConfig.azure_search_endpoint,
      apiKey: dynamicConfig.azure_search_key,
      indexName: dynamicConfig.index_name,
    }
  }

  // Prioridade 2: Variáveis de ambiente (fallback)
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT
  const apiKey = process.env.AZURE_SEARCH_KEY
  const indexName =
    process.env.AZURE_SEARCH_KNOWLEDGE_INDEX || 'cockpit-knowledge'

  if (!endpoint || !apiKey) {
    throw new Error(
      'Azure AI Search não configurado. Passe searchConfig ou defina AZURE_SEARCH_ENDPOINT e AZURE_SEARCH_KEY'
    )
  }

  globalThis.console.log(
    '🔧 [AMS RAG] Usando config de variáveis de ambiente:',
    {
      endpoint,
      indexName,
    }
  )
  return { endpoint, apiKey, indexName }
}

// ============================================================================
// EMBEDDING SERVICE (DEPRECATED)
// ============================================================================
// NOTA: Embeddings não são mais necessários para semantic/keyword search
// Funções removidas: getOpenAIConfig, generateEmbedding, generateEmbeddings
//
// Semantic search usa reranking L2 nativo do Azure AI Search (modelo Microsoft Bing)
// Keyword search usa BM25 tradicional
//
// Para hybrid/vector search com embeddings externos, use implementação SDA2 original

// ============================================================================
// CHUNKING SERVICE
// ============================================================================

interface ChunkResult {
  content: string
  chunkIndex: number
  headerContext?: string
}

/**
 * Configuração de chunking
 */
const CHUNK_CONFIG = {
  /** Tamanho máximo do chunk em caracteres (≈250 tokens) */
  maxChars: 4000,
  /** Overlap entre chunks em caracteres */
  overlapChars: 400,
  /** Tamanho mínimo para fazer chunking */
  minSizeForChunking: 5000,
}

/**
 * Fazer chunking de documento longo
 *
 * Para documentos pequenos, retorna o documento inteiro.
 * Para documentos grandes, divide em chunks com overlap.
 */
export function chunkDocument(content: string): ChunkResult[] {
  // Se o documento é pequeno, retorna inteiro
  if (content.length <= CHUNK_CONFIG.minSizeForChunking) {
    return [{ content, chunkIndex: 0 }]
  }

  const chunks: ChunkResult[] = []
  let currentPosition = 0
  let chunkIndex = 0

  // Extrair headers markdown para contexto
  const headerPattern = /^#{1,3}\s+(.+)$/gm
  const headers: { position: number; text: string }[] = []
  let match

  while ((match = headerPattern.exec(content)) !== null) {
    headers.push({ position: match.index, text: match[0] })
  }

  while (currentPosition < content.length) {
    const endPosition = Math.min(
      currentPosition + CHUNK_CONFIG.maxChars,
      content.length
    )

    // Tentar quebrar em um ponto natural (final de parágrafo)
    let actualEnd = endPosition
    if (endPosition < content.length) {
      const paragraphBreak = content.lastIndexOf('\n\n', endPosition)
      if (paragraphBreak > currentPosition + CHUNK_CONFIG.maxChars / 2) {
        actualEnd = paragraphBreak + 2
      }
    }

    // Encontrar header mais recente para contexto
    const relevantHeaders = headers.filter(h => h.position < currentPosition)
    const lastHeader = relevantHeaders[relevantHeaders.length - 1]

    chunks.push({
      content: content.slice(currentPosition, actualEnd).trim(),
      chunkIndex,
      headerContext: lastHeader?.text,
    })

    // Próximo chunk: avançar garantindo progresso mínimo
    const minAdvance = Math.max(
      CHUNK_CONFIG.maxChars / 2,
      actualEnd - currentPosition - CHUNK_CONFIG.overlapChars
    )
    const nextPosition = currentPosition + Math.max(minAdvance, 100)

    // Se não avançamos ou chegamos ao fim, parar
    if (nextPosition >= content.length || nextPosition <= currentPosition) {
      break
    }

    currentPosition = nextPosition
    chunkIndex++

    // Limite de segurança
    if (chunkIndex > 100) break
  }

  return chunks
}

// ============================================================================
// INDEXING SERVICE
// ============================================================================

/**
 * Opções para indexação
 */
export interface IndexArtifactOptions {
  /** Configuração dinâmica do Azure Search (do agente Knowledge) */
  searchConfig?: AMSDynamicSearchConfig
}

/**
 * Indexar um artefato no Azure AI Search
 *
 * Este é o ponto de entrada principal para indexação.
 * Faz chunking, gera embeddings e indexa no Azure.
 *
 * @param request - Dados do artefato a indexar (AMS usa ticketId)
 * @param options - Opções incluindo config dinâmica do agente Knowledge
 */
export async function indexArtifact(
  request: AMSIndexArtifactRequest,
  options?: IndexArtifactOptions
): Promise<IndexResponse> {
  try {
    // Log detalhado do início da indexação
    const feedbackEmoji = request.feedbackType === 'positive' ? '✅' : '❌'
    const feedbackLabel =
      request.feedbackType === 'positive' ? 'BOA PRÁTICA' : 'ANTI-PADRÃO'

    globalThis.console.log('\n' + '═'.repeat(70))
    globalThis.console.log(
      `📥 [AMS RAG Index] ========== INDEXANDO ${feedbackLabel} ==========`
    )
    globalThis.console.log('═'.repeat(70))
    globalThis.console.log(
      `   ${feedbackEmoji} Feedback: ${request.feedbackType.toUpperCase()}`
    )
    globalThis.console.log(`   📝 Título: "${request.title}"`)
    globalThis.console.log(`   📁 Tipo: ${request.artifactType}`)
    globalThis.console.log(`   🆔 ID: ${request.artifactId}`)
    globalThis.console.log(`   🎫 Ticket: ${request.ticketSlug}`)
    globalThis.console.log(`   💬 Chat: ${request.chatSlug}`)
    globalThis.console.log(`   🤖 Agente: ${request.agentName}`)
    globalThis.console.log(
      `   📏 Tamanho: ${request.content.length} caracteres`
    )
    globalThis.console.log(
      `   ⚙️ Config dinâmica: ${options?.searchConfig ? 'SIM' : 'NÃO (usando env vars)'}`
    )
    if (request.rejectionReason) {
      globalThis.console.log(
        `   ⚠️ Motivo da rejeição: "${request.rejectionReason}"`
      )
    }
    globalThis.console.log('─'.repeat(70))

    // 1. Fazer chunking do conteúdo
    const chunks = chunkDocument(request.content)
    globalThis.console.log(
      `📦 [AMS RAG Index] Documento dividido em ${chunks.length} chunk(s)`
    )

    // 2. NÃO gerar embeddings (semantic/keyword search usa apenas texto)
    globalThis.console.log(
      '📝 [AMS RAG Index] Usando semantic/keyword search - sem embeddings'
    )

    // 3. Preparar documentos para indexação (SEM contentVector)
    const documents = chunks.map((chunk, index) => ({
      id: `${request.artifactId}-chunk-${index}`,
      content: chunk.content,
      // contentVector removido - não necessário para semantic/keyword search
      feedbackType: request.feedbackType || 'positive',
      title: request.title,
      artifactType: request.artifactType,
      ticketId: request.ticketId,
      agentName: request.agentName,
      createdAt: new Date().toISOString(),
    }))

    // 4. Indexar no Azure AI Search via REST API (usa config dinâmica se disponível)
    const { endpoint, apiKey, indexName } = getSearchConfig(
      options?.searchConfig
    )
    const indexUrl = `${endpoint}/indexes/${indexName}/docs/index?api-version=2024-07-01`

    const indexResponse = await fetch(indexUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        value: documents.map(doc => ({
          '@search.action': 'mergeOrUpload',
          ...doc,
        })),
      }),
    })

    if (!indexResponse.ok) {
      const error = await indexResponse.text()
      throw new Error(
        `Azure AI Search indexing error: ${indexResponse.status} - ${error}`
      )
    }

    const result = await indexResponse.json()
    const successCount =
      result.value?.filter((r: { status: boolean }) => r.status === true)
        .length || documents.length
    const failedCount =
      result.value?.filter((r: { status: boolean }) => r.status === false)
        .length || 0

    if (failedCount > 0) {
      globalThis.console.warn(
        `⚠️ [AMS RAG Index] ${failedCount} chunk(s) falharam na indexação`
      )
    }

    globalThis.console.log(
      '\n✅ [AMS RAG Index] ========== INDEXAÇÃO CONCLUÍDA =========='
    )
    globalThis.console.log(
      `   ${request.feedbackType === 'positive' ? '✅' : '❌'} Tipo: ${request.feedbackType === 'positive' ? 'BOA PRÁTICA' : 'ANTI-PADRÃO'}`
    )
    globalThis.console.log(`   📝 Documento: "${request.title}"`)
    globalThis.console.log(
      `   📦 Chunks indexados: ${successCount}/${chunks.length}`
    )
    globalThis.console.log(`   🗂️ Índice: ${indexName}`)
    globalThis.console.log(`   🕐 Timestamp: ${new Date().toISOString()}`)
    globalThis.console.log('═'.repeat(70) + '\n')

    return {
      success: true,
      documentId: request.artifactId,
      chunkCount: successCount,
      indexedAt: new Date().toISOString(),
    }
  } catch (error: unknown) {
    globalThis.console.error('❌ [AMS RAG Index] Erro na indexação:', error)
    globalThis.console.log('═'.repeat(70) + '\n')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Remover artefato do índice via REST API
 */
export async function deleteArtifactFromIndex(
  artifactId: string
): Promise<boolean> {
  try {
    const { endpoint, apiKey, indexName } = getSearchConfig()

    const searchUrl = `${endpoint}/indexes/${indexName}/docs/search?api-version=2024-07-01`
    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        search: '*',
        filter: `artifactId eq '${artifactId}'`,
        select: 'id',
      }),
    })

    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status}`)
    }

    const searchResult = await searchResponse.json()
    const idsToDelete: string[] =
      searchResult.value?.map((doc: { id: string }) => doc.id) || []

    if (idsToDelete.length === 0) {
      globalThis.console.log(
        `ℹ️ [AMS RAG] Artefato não encontrado no índice: ${artifactId}`
      )
      return true
    }

    const deleteUrl = `${endpoint}/indexes/${indexName}/docs/index?api-version=2024-07-01`
    const deleteResponse = await fetch(deleteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        value: idsToDelete.map(id => ({
          '@search.action': 'delete',
          id,
        })),
      }),
    })

    if (!deleteResponse.ok) {
      throw new Error(`Delete failed: ${deleteResponse.status}`)
    }

    globalThis.console.log(
      `🗑️ [AMS RAG] Artefato removido do índice: ${artifactId} (${idsToDelete.length} chunks)`
    )
    return true
  } catch (error: unknown) {
    globalThis.console.error('❌ [AMS RAG] Erro ao remover artefato:', error)
    return false
  }
}

// ============================================================================
// HELPERS
// ============================================================================

export function isRagConfigured(): boolean {
  return !!(
    process.env.AZURE_SEARCH_ENDPOINT &&
    process.env.AZURE_SEARCH_KEY &&
    process.env.AZURE_OPENAI_RAG_ENDPOINT &&
    process.env.AZURE_OPENAI_API_KEY
  )
}

export function getIndexName(): string {
  return process.env.AZURE_SEARCH_KNOWLEDGE_INDEX || 'cockpit-knowledge'
}

// ============================================================================
// SEARCH SERVICE (para o agente AMS Knowledge)
// ============================================================================

export interface RAGSearchResult {
  id: string
  content: string
  title: string
  artifactType: string
  agentName: string
  feedbackType: string
  /**
   * Score de relevância do documento
   * - Para busca semântica: porcentagem 0-100 (convertida do @search.rerankerScore)
   * - Para outros tipos: score bruto do Azure AI Search
   */
  score: number
  headerContext?: string
}

export interface RAGSearchOptions {
  searchConfig: AMSDynamicSearchConfig
  topK?: number
  artifactTypeFilter?: string
  ticketIdFilter?: string
  searchType?: 'hybrid' | 'semantic' | 'vector' | 'keyword'
}

/**
 * Buscar documentos na base de conhecimento RAG
 *
 * Usa a configuração dinâmica extraída do agente AMS Knowledge.
 */
export async function searchKnowledgeBase(
  query: string,
  options: RAGSearchOptions
): Promise<RAGSearchResult[]> {
  // Ler topK do env como fallback
  const defaultTopK = process.env.AZURE_SEARCH_K
    ? parseInt(process.env.AZURE_SEARCH_K, 10)
    : 5

  const {
    searchConfig,
    topK = defaultTopK,
    artifactTypeFilter,
    ticketIdFilter,
    searchType = 'semantic',
  } = options

  try {
    // Determinar configuração semântica do artefato
    const semanticConfigName =
      searchConfig.semantic_configuration_name || 'default'

    // 1. Usar search_type do config ou fallback para parâmetro da função
    const effectiveSearchType = searchConfig.search_type || searchType

    // Apenas semantic e keyword não precisam de embeddings
    const useVectorSearch = false // AMS usa semantic/keyword apenas

    // 2. NÃO gerar embedding para semantic/keyword search
    globalThis.console.log(
      '🔧 [AMS RAG Search] Tipo de busca:',
      effectiveSearchType
    )
    globalThis.console.log(
      '📦 [AMS RAG Search] Vector search:',
      useVectorSearch ? 'SIM' : 'NÃO (semantic/keyword nativo)'
    )

    const filters: string[] = []
    if (artifactTypeFilter) {
      filters.push(`artifactType eq '${artifactTypeFilter}'`)
    }
    if (ticketIdFilter) {
      filters.push(`ticketId eq '${ticketIdFilter}'`)
    }
    const filterString = filters.length > 0 ? filters.join(' and ') : undefined

    const searchUrl = `${searchConfig.azure_search_endpoint}/indexes/${searchConfig.index_name}/docs/search?api-version=2024-07-01`

    const searchBody: unknown = {
      count: true,
      top: topK,
      // Sem 'select' - deixa Azure retornar todos os campos disponíveis no índice
      // (o schema do índice rag-ams pode ser diferente do esperado)
    }

    if (filterString) {
      searchBody.filter = filterString
    }

    // Configurar tipo de busca
    if (effectiveSearchType === 'semantic') {
      // Busca semântica (usa reranking L2 nativo do Azure Search)
      searchBody.search = query
      searchBody.queryType = 'semantic'
      searchBody.semanticConfiguration = semanticConfigName
      globalThis.console.log(
        `🔧 [AMS RAG] Usando semantic search com config: ${semanticConfigName}`
      )
    } else {
      // Busca por palavra-chave (BM25)
      searchBody.search = query
      globalThis.console.log('🔧 [AMS RAG] Usando keyword search (BM25)')
    }

    let response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': searchConfig.azure_search_key,
      },
      body: JSON.stringify(searchBody),
    })

    // Se falhou por campo vetorial inválido, retry com busca textual apenas
    if (!response.ok) {
      const errorText = await response.text()

      // Checar se é erro de campo no filtro (artifactType, ticketId, etc não existe no índice)
      if (
        errorText.includes('Could not find a property named') &&
        errorText.includes('$filter')
      ) {
        globalThis.console.warn(
          `⚠️ [AMS RAG Search] Campo do filtro não existe no índice, fazendo retry sem filtros`
        )

        // Retry sem filtros
        delete searchBody.filter

        globalThis.console.log('🔄 [AMS RAG] Retry: Busca sem filtros de campo')

        response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': searchConfig.azure_search_key,
          },
          body: JSON.stringify(searchBody),
        })

        if (!response.ok) {
          const retryError = await response.text()
          throw new Error(
            `Azure AI Search error (filter retry): ${response.status} - ${retryError}`
          )
        }
      }
      // Checar se é erro de configuração semântica
      else if (
        errorText.includes('Unknown semantic configuration') &&
        effectiveSearchType === 'semantic'
      ) {
        globalThis.console.warn(
          `⚠️ [AMS RAG Search] Configuração semântica '${semanticConfigName}' não existe no índice, fazendo retry com keyword search`
        )

        // Retry com busca keyword apenas
        const keywordBody: unknown = {
          count: true,
          top: topK,
          search: query,
        }

        if (filterString) {
          keywordBody.filter = filterString
        }

        globalThis.console.log('🔄 [AMS RAG] Retry: Keyword search (BM25)')

        response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': searchConfig.azure_search_key,
          },
          body: JSON.stringify(keywordBody),
        })

        if (!response.ok) {
          const retryError = await response.text()
          throw new Error(
            `Azure AI Search error (semantic retry): ${response.status} - ${retryError}`
          )
        }
      } else {
        throw new Error(
          `Azure AI Search error: ${response.status} - ${errorText}`
        )
      }
    }

    const data = await response.json()
    const totalCount = data['@odata.count'] || 0
    const returnedCount = data.value?.length || 0

    globalThis.console.log(
      `✅ [AMS RAG] ${returnedCount} docs retornados (topK: ${topK}, total no índice: ${totalCount})`
    )

    if (returnedCount < topK && returnedCount === totalCount) {
      globalThis.console.log(
        `   ⚠️  Índice tem apenas ${totalCount} documentos`
      )
    } else if (returnedCount < topK) {
      globalThis.console.log(`   ⚠️  Filtros ativos ou limitação do índice`)
    }

    // Debug: Logar campos disponíveis do primeiro documento
    if (data.value && data.value.length > 0 && returnedCount === 0) {
      globalThis.console.log(
        '🔧 [AMS RAG] Campos disponíveis no índice:',
        Object.keys(data.value[0])
      )
    }

    const results: RAGSearchResult[] = (data.value || []).map(
      (doc: unknown, index: number) => {
        // Para busca semântica, usar @search.rerankerScore; caso contrário @search.score
        const rawScore =
          (effectiveSearchType === 'semantic'
            ? doc['@search.rerankerScore']
            : doc['@search.score']) ||
          doc['@search.score'] ||
          0

        // Converter reranker score para porcentagem se for busca semântica
        const score =
          effectiveSearchType === 'semantic'
            ? convertRerankerScoreToPercentage(rawScore)
            : rawScore

        return {
          id: doc.id || doc.chunk_id || `chunk-${index}`, // Tentar id, chunk_id ou fallback
          content:
            doc.content || doc.chunk_content || doc.chunk || doc.text || '', // Campo de conteúdo padrão
          title: doc.title || doc.artifact_name || 'Sem título',
          artifactType: doc.artifactType || doc.artifact_type || 'document',
          agentName: doc.agentName || doc.agent_name || 'unknown',
          feedbackType: doc.feedbackType || doc.feedback_type || 'positive',
          score,
        }
      }
    )

    if (results.length === 0) {
      globalThis.console.log(
        `⚠️ [AMS RAG] Nenhum documento encontrado para: "${query.substring(0, 80)}"`
      )
    }

    return results
  } catch (error: unknown) {
    globalThis.console.error('❌ [AMS RAG Search] Erro na busca:', error)
    throw error
  }
}

/**
 * Formatar resultados de busca para uso em prompt de LLM
 *
 * NOTA: Esta função retorna apenas os DADOS classificados por feedbackType.
 * As INSTRUÇÕES de como usar vêm das instruções do agente Supervisor AMS no Cockpit.
 */
export function formatRAGResultsForPrompt(results: RAGSearchResult[]): string {
  if (results.length === 0) {
    globalThis.console.log('📋 [AMS RAG Format] Nenhum documento para formatar')
    return 'Nenhum documento relevante encontrado na base de conhecimento.'
  }

  const positiveResults = results.filter(r => r.feedbackType === 'positive')
  const negativeResults = results.filter(r => r.feedbackType === 'negative')
  const unclassified = results.filter(
    r => r.feedbackType !== 'positive' && r.feedbackType !== 'negative'
  )

  globalThis.console.log(
    '\n📊 [AMS RAG Format] ========== CLASSIFICAÇÃO DOS RESULTADOS =========='
  )
  globalThis.console.log(
    `   ✅ feedbackType=positive: ${positiveResults.length} documento(s)`
  )
  positiveResults.forEach((doc, i) => {
    globalThis.console.log(
      `      ${i + 1}. "${doc.title}" - Tipo: ${doc.artifactType} - Score: ${doc.score.toFixed(1)}%`
    )
  })
  globalThis.console.log(
    `   ❌ feedbackType=negative: ${negativeResults.length} documento(s)`
  )
  negativeResults.forEach((doc, i) => {
    globalThis.console.log(
      `      ${i + 1}. "${doc.title}" - Tipo: ${doc.artifactType} - Score: ${doc.score.toFixed(1)}%`
    )
  })
  if (unclassified.length > 0) {
    globalThis.console.log(
      `   ⚠️ Sem feedbackType: ${unclassified.length} documento(s)`
    )
  }
  globalThis.console.log(
    '📊 [AMS RAG Format] ================================================\n'
  )

  const formatDocument = (result: RAGSearchResult, index: number) => {
    return `### Documento ${index + 1}: ${result.title}
**Tipo:** ${result.artifactType} | **Agente:** ${result.agentName} | **Score:** ${result.score.toFixed(1)}%
**feedbackType:** ${result.feedbackType}

${result.content}
`
  }

  let output = ''

  if (positiveResults.length > 0) {
    output += '## Documentos com feedbackType=positive\n\n'
    output += positiveResults
      .map((r, i) => formatDocument(r, i + 1))
      .join('\n---\n\n')
    output += '\n'
  }

  if (negativeResults.length > 0) {
    output += '---\n\n## Documentos com feedbackType=negative\n\n'
    output += negativeResults
      .map((r, i) => formatDocument(r, i + 1))
      .join('\n---\n\n')
    output += '\n'
  }

  if (unclassified.length > 0) {
    output += '---\n\n## Documentos sem feedbackType\n\n'
    output += unclassified
      .map((r, i) => formatDocument(r, i + 1))
      .join('\n---\n\n')
  }

  globalThis.console.log(
    `📤 [AMS RAG Format] Output gerado: ${output.length} chars (${positiveResults.length} positive, ${negativeResults.length} negative)`
  )

  return output
}
