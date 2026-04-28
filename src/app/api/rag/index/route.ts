/**
 * API Route: POST /api/rag/index
 *
 * Endpoint para indexar artefatos no Azure AI Search.
 * Chamado automaticamente quando usuário aceita ou rejeita um artefato.
 *
 * A BUSCA é feita pelo agente supervisor via MCP (front-matter).
 * Este endpoint cuida apenas da INDEXAÇÃO.
 *
 * Suporta configuração dinâmica via campo 'searchConfig' (extraído do agente AMS Knowledge)
 */

import { NextRequest, NextResponse } from 'next/server'

import {
  indexArtifact,
  isRagConfigured,
  type AMSDynamicSearchConfig,
  type AMSIndexArtifactRequest,
} from '@/lib/rag/ams'

/**
 * Request body com config dinâmica opcional
 */
interface IndexRequestBody extends AMSIndexArtifactRequest {
  searchConfig?: AMSDynamicSearchConfig
}

// ============================================================================
// POST /api/rag/index
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse do body
    const body: IndexRequestBody = await request.json()
    const { searchConfig, ...artifactRequest } = body

    // Verificar se RAG está configurado (env OU config dinâmica)
    const hasDynamicConfig = !!(
      searchConfig?.azure_search_endpoint &&
      searchConfig?.azure_search_key &&
      searchConfig?.index_name
    )

    if (!isRagConfigured() && !hasDynamicConfig) {
      console.warn(
        '⚠️ [RAG API] Azure AI Search não configurado, ignorando indexação'
      )
      return NextResponse.json(
        {
          success: false,
          error: 'RAG não configurado',
          message:
            'Configure AZURE_SEARCH_ENDPOINT/KEY ou passe searchConfig do agente Knowledge',
        },
        { status: 503 }
      )
    }

    // Validar campos obrigatórios
    if (
      !artifactRequest.artifactId ||
      !artifactRequest.ticketId ||
      !artifactRequest.content
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Campos obrigatórios faltando: artifactId, ticketId, content',
        },
        { status: 400 }
      )
    }

    // Validar feedbackType
    if (!['positive', 'negative'].includes(artifactRequest.feedbackType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'feedbackType deve ser "positive" ou "negative"',
        },
        { status: 400 }
      )
    }

    console.log(`📥 [RAG API] Recebendo indexação:`, {
      artifactId: artifactRequest.artifactId,
      type: artifactRequest.artifactType,
      feedbackType: artifactRequest.feedbackType,
      contentLength: artifactRequest.content.length,
      hasDynamicConfig,
      indexName: searchConfig?.index_name || 'env default',
    })

    // Indexar artefato (passa config dinâmica se disponível)
    const result = await indexArtifact(artifactRequest, { searchConfig })

    if (result.success) {
      console.log(`✅ [RAG API] Indexação concluída:`, {
        documentId: result.documentId,
        chunkCount: result.chunkCount,
      })

      return NextResponse.json({
        success: true,
        documentId: result.documentId,
        chunkCount: result.chunkCount,
        indexedAt: result.indexedAt,
      })
    } else {
      console.error(`❌ [RAG API] Erro na indexação:`, result.error)

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ [RAG API] Erro inesperado:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET /api/rag/index - Health check
// ============================================================================

export async function GET() {
  const configured = isRagConfigured()

  return NextResponse.json({
    service: 'RAG Indexing',
    configured,
    status: configured ? 'ready' : 'not_configured',
    requiredEnvVars: [
      'AZURE_SEARCH_ENDPOINT',
      'AZURE_SEARCH_KEY',
      'AZURE_OPENAI_RAG_ENDPOINT (não usar AZURE_OPENAI_ENDPOINT para não conflitar com LangChain)',
      'AZURE_OPENAI_API_KEY',
    ],
    optionalEnvVars: [
      'AZURE_SEARCH_KNOWLEDGE_INDEX (default: cockpit-knowledge)',
      'AZURE_OPENAI_EMBEDDING_DEPLOYMENT (default: text-embedding-3-small)',
    ],
  })
}
