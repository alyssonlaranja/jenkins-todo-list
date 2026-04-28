/**
 * RAG Indexing Service - Serviço para indexação no Azure AI Search
 *
 * Este serviço é responsável por:
 * 1. Gerar embeddings via Azure OpenAI
 * 2. Fazer chunking de documentos longos
 * 3. Indexar documentos no Azure AI Search via REST API
 *
 * A BUSCA é feita pelo agente supervisor via MCP (configurado no front-matter).
 * Este serviço cuida apenas da INDEXAÇÃO.
 *
 * NOTA: Usamos a API REST do Azure ao invés do SDK para evitar dependências extras.
 */

import type {
  DynamicSearchConfig,
  IndexArtifactRequest,
  IndexResponse,
  KnowledgeDocument,
} from './types'

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

/**
 * Obter configuração do Azure AI Search
 *
 * Prioridade:
 * 1. Configuração dinâmica passada como parâmetro (do agente SDA 2 Knowledge)
 * 2. Variáveis de ambiente (fallback)
 */
function getSearchConfig(dynamicConfig?: DynamicSearchConfig) {
  // Prioridade 1: Config dinâmica do agente Knowledge
  if (dynamicConfig) {
    console.log('🔧 [RAG] Usando config dinâmica do agente SDA 2 Knowledge:', {
      endpoint: dynamicConfig.azure_search_endpoint,
      indexName: dynamicConfig.index_name,
    })
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

  console.log('🔧 [RAG] Usando config de variáveis de ambiente:', {
    endpoint,
    indexName,
  })
  return { endpoint, apiKey, indexName }
}

/**
 * Obter configuração do Azure OpenAI para embeddings
 * NOTA: Usamos AZURE_OPENAI_EMBEDDING_ENDPOINT e AZURE_OPENAI_EMBEDDING_API_KEY
 * que são específicos para o serviço de embeddings (oai-cockpit-br-prd01)
 */
function getOpenAIConfig() {
  // Usar variáveis específicas para embeddings
  const endpoint = process.env.AZURE_OPENAI_EMBEDDING_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_EMBEDDING_API_KEY

  if (!endpoint || !apiKey) {
    throw new Error(
      'Azure OpenAI Embedding não configurado. Defina AZURE_OPENAI_EMBEDDING_ENDPOINT e AZURE_OPENAI_EMBEDDING_API_KEY'
    )
  }

  return { endpoint, apiKey }
}

// ============================================================================
// EMBEDDING SERVICE (via REST API)
// ============================================================================

const EMBEDDING_DEPLOYMENT =
  process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small'

const AZURE_OPENAI_API_VERSION = '2024-06-01'

/**
 * Gerar embedding para um texto via REST API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { endpoint, apiKey } = getOpenAIConfig()

  // Limitar tamanho do texto (8000 tokens ≈ 32000 caracteres)
  const truncatedText = text.slice(0, 32000)

  const url = `${endpoint}/openai/deployments/${EMBEDDING_DEPLOYMENT}/embeddings?api-version=${AZURE_OPENAI_API_VERSION}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      input: truncatedText,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(
      `Azure OpenAI Embedding error: ${response.status} - ${error}`
    )
  }

  const data = await response.json()
  return data.data[0].embedding
}

/**
 * Gerar embeddings para múltiplos textos (batch) via REST API
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { endpoint, apiKey } = getOpenAIConfig()

  // Limitar tamanho de cada texto
  const truncatedTexts = texts.map(t => t.slice(0, 32000))

  const url = `${endpoint}/openai/deployments/${EMBEDDING_DEPLOYMENT}/embeddings?api-version=${AZURE_OPENAI_API_VERSION}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      input: truncatedTexts,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(
      `Azure OpenAI Embedding error: ${response.status} - ${error}`
    )
  }

  const data = await response.json()
  return data.data.map((d: { embedding: number[] }) => d.embedding)
}

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
    // O overlap não pode fazer o cursor voltar para antes do início do chunk atual
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
  searchConfig?: DynamicSearchConfig
}

/**
 * Indexar um artefato no Azure AI Search
 *
 * Este é o ponto de entrada principal para indexação.
 * Faz chunking, gera embeddings e indexa no Azure.
 *
 * @param request - Dados do artefato a indexar
 * @param options - Opções incluindo config dinâmica do agente Knowledge
 */
export async function indexArtifact(
  request: IndexArtifactRequest,
  options?: IndexArtifactOptions
): Promise<IndexResponse> {
  try {
    // Log detalhado do início da indexação
    const feedbackEmoji = request.feedbackType === 'positive' ? '✅' : '❌'
    const feedbackLabel =
      request.feedbackType === 'positive' ? 'BOA PRÁTICA' : 'ANTI-PADRÃO'

    console.log('\n' + '═'.repeat(70))
    console.log(
      `📥 [RAG Index] ========== INDEXANDO ${feedbackLabel} ==========`
    )
    console.log('═'.repeat(70))
    console.log(
      `   ${feedbackEmoji} Feedback: ${request.feedbackType.toUpperCase()}`
    )
    console.log(`   📝 Título: "${request.title}"`)
    console.log(`   📁 Tipo: ${request.artifactType}`)
    console.log(`   🆔 ID: ${request.artifactId}`)
    console.log(`   📂 Projeto: ${request.projectSlug}`)
    console.log(`   💬 Chat: ${request.chatSlug}`)
    console.log(`   🤖 Agente: ${request.agentName}`)
    console.log(`   📏 Tamanho: ${request.content.length} caracteres`)
    console.log(
      `   ⚙️ Config dinâmica: ${options?.searchConfig ? 'SIM' : 'NÃO (usando env vars)'}`
    )
    if (request.rejectionReason) {
      console.log(`   ⚠️ Motivo da rejeição: "${request.rejectionReason}"`)
    }
    console.log('─'.repeat(70))

    // 1. Fazer chunking do conteúdo
    const chunks = chunkDocument(request.content)
    console.log(
      `📦 [RAG Index] Documento dividido em ${chunks.length} chunk(s)`
    )

    // 2. Gerar embeddings para todos os chunks
    const embeddings = await generateEmbeddings(chunks.map(c => c.content))
    console.log(`🧠 [RAG] Embeddings gerados: ${embeddings.length}`)

    // 3. Preparar documentos para indexação
    // Campos no índice: id, content, contentVector, feedbackType, title, artifactType, projectId, agentName, createdAt
    const documents = chunks.map((chunk, index) => ({
      id: `${request.artifactId}-chunk-${index}`,
      content: chunk.content,
      contentVector: embeddings[index],
      feedbackType: request.feedbackType || 'positive',
      title: request.title,
      artifactType: request.artifactType,
      projectId: request.projectId,
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
      console.warn(
        `⚠️ [RAG Index] ${failedCount} chunk(s) falharam na indexação`
      )
    }

    // Log de conclusão detalhado (usar inline para evitar redeclaração)
    console.log('\n✅ [RAG Index] ========== INDEXAÇÃO CONCLUÍDA ==========')
    console.log(
      `   ${request.feedbackType === 'positive' ? '✅' : '❌'} Tipo: ${request.feedbackType === 'positive' ? 'BOA PRÁTICA' : 'ANTI-PADRÃO'}`
    )
    console.log(`   📝 Documento: "${request.title}"`)
    console.log(`   📦 Chunks indexados: ${successCount}/${chunks.length}`)
    console.log(`   🗂️ Índice: ${indexName}`)
    console.log(`   🕐 Timestamp: ${new Date().toISOString()}`)
    console.log('═'.repeat(70) + '\n')

    return {
      success: true,
      documentId: request.artifactId,
      chunkCount: successCount,
      indexedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('❌ [RAG Index] Erro na indexação:', error)
    console.log('═'.repeat(70) + '\n')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Remover artefato do índice via REST API
 *
 * Útil para quando o usuário rejeita um artefato previamente aceito.
 */
export async function deleteArtifactFromIndex(
  artifactId: string
): Promise<boolean> {
  try {
    const { endpoint, apiKey, indexName } = getSearchConfig()

    // Buscar todos os chunks do artefato
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
      console.log(`ℹ️ [RAG] Artefato não encontrado no índice: ${artifactId}`)
      return true
    }

    // Deletar todos os chunks via REST API
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

    console.log(
      `🗑️ [RAG] Artefato removido do índice: ${artifactId} (${idsToDelete.length} chunks)`
    )
    return true
  } catch (error) {
    console.error('❌ [RAG] Erro ao remover artefato:', error)
    return false
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verificar se o serviço está configurado
 * NOTA: Usamos AZURE_OPENAI_RAG_ENDPOINT para não conflitar com LangChain
 */
export function isRagConfigured(): boolean {
  return !!(
    process.env.AZURE_SEARCH_ENDPOINT &&
    process.env.AZURE_SEARCH_KEY &&
    process.env.AZURE_OPENAI_RAG_ENDPOINT &&
    process.env.AZURE_OPENAI_API_KEY
  )
}

/**
 * Obter nome do índice configurado
 */
export function getIndexName(): string {
  return process.env.AZURE_SEARCH_KNOWLEDGE_INDEX || 'cockpit-knowledge'
}

// ============================================================================
// SEARCH SERVICE (para o agente SDA 2 Knowledge)
// ============================================================================

/**
 * Resultado de busca RAG
 */
export interface RAGSearchResult {
  /** ID do documento */
  id: string
  /** Conteúdo do chunk */
  content: string
  /** Título do artefato original */
  title: string
  /** Tipo do artefato (prd, briefing, architecture, etc.) */
  artifactType: string
  /** Nome do agente que gerou */
  agentName: string
  /** Tipo de feedback (positive/negative) */
  feedbackType: string
  /** Score de relevância (0-1) */
  score: number
  /** Contexto de header (se houver) */
  headerContext?: string
}

/**
 * Opções de busca RAG
 */
export interface RAGSearchOptions {
  /** Configuração dinâmica do Azure Search (do agente Knowledge) */
  searchConfig: DynamicSearchConfig
  /** Número máximo de resultados */
  topK?: number
  /** Filtro por tipo de feedback */
  feedbackFilter?: 'positive' | 'negative' | 'all'
  /** Filtro por tipo de artefato */
  artifactTypeFilter?: string
  /** Filtro por ID do projeto */
  projectIdFilter?: string
  /** Tipo de busca: hybrid (text + vector), semantic, ou vector */
  searchType?: 'hybrid' | 'semantic' | 'vector'
}

/**
 * Buscar documentos na base de conhecimento RAG
 *
 * Realiza busca híbrida (texto + vetor) no Azure AI Search.
 * Usa a configuração dinâmica extraída do agente SDA 2 Knowledge.
 *
 * @param query - Texto de busca
 * @param options - Opções incluindo config do Azure Search
 * @returns Lista de resultados ordenados por relevância
 *
 * @example
 * ```typescript
 * const results = await searchKnowledgeBase('arquitetura de microserviços', {
 *   searchConfig: extractKnowledgeAgentConfig(teamMembers)!,
 *   topK: 5,
 *   feedbackFilter: 'all' // 'all' retorna positivos E negativos, 'positive' só positivos, 'negative' só negativos
 * })
 * ```
 */
export async function searchKnowledgeBase(
  query: string,
  options: RAGSearchOptions
): Promise<RAGSearchResult[]> {
  const {
    searchConfig,
    topK = 5,
    feedbackFilter = 'all', // Retorna positivos E negativos para que o LLM saiba o que fazer e o que NÃO fazer
    artifactTypeFilter,
    projectIdFilter,
    searchType = 'hybrid',
  } = options

  console.log(`🔍 [RAG Search] Query: "${query.substring(0, 50)}..."`, {
    topK,
    feedbackFilter,
    searchType,
    indexName: searchConfig.index_name,
  })

  try {
    // 1. Gerar embedding para a query (para busca vetorial)
    const queryEmbedding = await generateEmbedding(query)
    console.log('🧠 [RAG Search] Query embedding gerado')

    // 2. Construir filtro OData (apenas campos filtráveis: artifactType, projectId, agentName)
    // Nota: feedbackType não é filtrável no índice atual
    const filters: string[] = []
    if (artifactTypeFilter) {
      filters.push(`artifactType eq '${artifactTypeFilter}'`)
    }
    if (projectIdFilter) {
      filters.push(`projectId eq '${projectIdFilter}'`)
    }
    const filterString = filters.length > 0 ? filters.join(' and ') : undefined

    // 3. Construir requisição de busca
    const searchUrl = `${searchConfig.azure_search_endpoint}/indexes/${searchConfig.index_name}/docs/search?api-version=2024-07-01`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchBody: any = {
      count: true,
      top: topK,
      select: 'id,content,title,artifactType,agentName,feedbackType',
    }

    // Adicionar filtro se existir
    if (filterString) {
      searchBody.filter = filterString
    }

    // Configurar tipo de busca
    if (searchType === 'hybrid' || searchType === 'semantic') {
      // Busca híbrida: texto + vetor
      searchBody.search = query
      searchBody.vectorQueries = [
        {
          kind: 'vector',
          vector: queryEmbedding,
          fields: 'contentVector',
          k: topK,
        },
      ]
      // Semantic ranking (se disponível no índice)
      if (searchType === 'semantic') {
        searchBody.queryType = 'semantic'
        searchBody.semanticConfiguration = 'default'
      }
    } else {
      // Busca apenas por vetor
      searchBody.vectorQueries = [
        {
          kind: 'vector',
          vector: queryEmbedding,
          fields: 'contentVector',
          k: topK,
        },
      ]
    }

    console.log('🔎 [RAG Search] Executando busca no Azure AI Search...')

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': searchConfig.azure_search_key,
      },
      body: JSON.stringify(searchBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Azure AI Search error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const totalCount = data['@odata.count'] || 0

    console.log(
      `✅ [RAG Search] ${totalCount} documentos encontrados no índice`
    )

    // 4. Mapear resultados
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: RAGSearchResult[] = (data.value || []).map((doc: any) => ({
      id: doc.id,
      content: doc.content,
      title: doc.title || 'Sem título',
      artifactType: doc.artifactType || 'document',
      agentName: doc.agentName || 'unknown',
      feedbackType: doc.feedbackType || 'positive',
      score: doc['@search.score'] || 0,
    }))

    // 5. Log detalhado de cada documento para verificação
    console.log(`\n📋 [RAG Search] ========== DOCUMENTOS RETORNADOS ==========`)
    if (results.length === 0) {
      console.log(
        `⚠️ [RAG Search] Nenhum documento encontrado para a query: "${query.substring(0, 100)}..."`
      )
      console.log(
        `📊 [RAG Search] Filtros aplicados: ${filterString || 'nenhum'}`
      )
    } else {
      results.forEach((doc, index) => {
        console.log(
          `\n📄 [RAG Search] Documento ${index + 1}/${results.length}:`
        )
        console.log(`   🆔 ID: ${doc.id}`)
        console.log(`   📌 Título: ${doc.title}`)
        console.log(`   📁 Tipo: ${doc.artifactType}`)
        console.log(`   🤖 Agente: ${doc.agentName}`)
        console.log(`   👍 Feedback: ${doc.feedbackType}`)
        console.log(`   ⭐ Score: ${(doc.score * 100).toFixed(2)}%`)
        console.log(`   📝 Conteúdo completo: ${doc.content}`)
      })
    }
    console.log(`\n📋 [RAG Search] ========================================\n`)

    console.log(
      `🎯 [RAG Search] Retornando ${results.length} resultados para contexto LLM`
    )

    return results
  } catch (error) {
    console.error('❌ [RAG Search] Erro na busca:', error)
    throw error
  }
}

/**
 * Formatar resultados de busca para uso em prompt de LLM
 *
 * NOTA: Esta função retorna apenas os DADOS classificados por feedbackType.
 * As INSTRUÇÕES de como usar (boas práticas vs anti-padrões) vêm das
 * instruções do agente Supervisor SDA2 no Cockpit, não deste código.
 *
 * O Supervisor SDA2 (id: 3d8b0c99-24ba-4d79-b136-2a75d04d97d1) já possui
 * nas suas instruções toda a lógica de:
 * - Como analisar retorno do Knowledge (positivos vs negativos)
 * - Como repassar contexto enriquecido para especialistas
 *
 * @param results - Resultados da busca RAG
 * @returns Texto formatado com documentos classificados por feedbackType
 */
export function formatRAGResultsForPrompt(results: RAGSearchResult[]): string {
  if (results.length === 0) {
    console.log('📋 [RAG Format] Nenhum documento para formatar')
    return 'Nenhum documento relevante encontrado na base de conhecimento.'
  }

  // Separar resultados por tipo de feedback
  const positiveResults = results.filter(r => r.feedbackType === 'positive')
  const negativeResults = results.filter(r => r.feedbackType === 'negative')
  const unclassified = results.filter(
    r => r.feedbackType !== 'positive' && r.feedbackType !== 'negative'
  )

  // Log detalhado da classificação
  console.log(
    '\n📊 [RAG Format] ========== CLASSIFICAÇÃO DOS RESULTADOS =========='
  )
  console.log(
    `   ✅ feedbackType=positive: ${positiveResults.length} documento(s)`
  )
  positiveResults.forEach((doc, i) => {
    console.log(
      `      ${i + 1}. "${doc.title}" - Tipo: ${doc.artifactType} - Score: ${(doc.score * 100).toFixed(1)}%`
    )
  })
  console.log(
    `   ❌ feedbackType=negative: ${negativeResults.length} documento(s)`
  )
  negativeResults.forEach((doc, i) => {
    console.log(
      `      ${i + 1}. "${doc.title}" - Tipo: ${doc.artifactType} - Score: ${(doc.score * 100).toFixed(1)}%`
    )
  })
  if (unclassified.length > 0) {
    console.log(`   ⚠️ Sem feedbackType: ${unclassified.length} documento(s)`)
  }
  console.log(
    '📊 [RAG Format] ================================================\n'
  )

  // Formatar documento com feedbackType (sem instruções de uso - vem do agente)
  const formatDocument = (result: RAGSearchResult, index: number) => {
    return `### Documento ${index + 1}: ${result.title}
**Tipo:** ${result.artifactType} | **Agente:** ${result.agentName} | **Relevância:** ${(result.score * 100).toFixed(1)}%
**feedbackType:** ${result.feedbackType}

${result.content}
`
  }

  // Montar output estruturado (dados apenas, sem instruções)
  let output = ''

  // Seção de documentos com feedbackType=positive
  if (positiveResults.length > 0) {
    output += '## Documentos com feedbackType=positive\n\n'
    output += positiveResults
      .map((r, i) => formatDocument(r, i + 1))
      .join('\n---\n\n')
    output += '\n'
  }

  // Seção de documentos com feedbackType=negative
  if (negativeResults.length > 0) {
    output += '---\n\n## Documentos com feedbackType=negative\n\n'
    output += negativeResults
      .map((r, i) => formatDocument(r, i + 1))
      .join('\n---\n\n')
    output += '\n'
  }

  // Documentos sem feedbackType
  if (unclassified.length > 0) {
    output += '---\n\n## Documentos sem feedbackType\n\n'
    output += unclassified
      .map((r, i) => formatDocument(r, i + 1))
      .join('\n---\n\n')
  }

  // Log do tamanho final
  console.log(
    `📤 [RAG Format] Output gerado: ${output.length} chars (${positiveResults.length} positive, ${negativeResults.length} negative)`
  )

  return output
}
