/**
 * RAG Search Tool for SDA2 Knowledge Agent
 *
 * Esta tool permite ao agente SDA 2 Knowledge buscar na base de conhecimento
 * do Azure AI Search. A configuração (endpoint, index, key) é extraída
 * dinamicamente das instruções do agente no Cockpit.
 *
 * O agente usa esta tool para:
 * - Buscar documentos relevantes baseados em uma query
 * - Recuperar conhecimento de artefatos anteriormente aceitos (feedback positivo)
 * - Fornecer contexto para respostas mais precisas
 *
 * @module src/agents/sda2/tools/rag-search-tool
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

import {
  formatRAGResultsForPrompt,
  searchKnowledgeBase,
  type RAGSearchOptions,
} from '@/lib/rag/indexing-service'
import type { DynamicSearchConfig } from '@/lib/rag/types'

/**
 * Opções para criar a RAG Search Tool
 */
export interface CreateRAGSearchToolOptions {
  /** Configuração do Azure AI Search extraída do agente Knowledge */
  searchConfig: DynamicSearchConfig
  /** Número máximo de resultados por busca */
  defaultTopK?: number
  /** Filtrar apenas por feedback positivo por padrão */
  defaultFeedbackFilter?: 'positive' | 'negative' | 'all'
}

/**
 * Criar ferramenta de busca RAG para o agente Knowledge
 *
 * Esta tool é injetada especificamente no agente SDA 2 Knowledge
 * para permitir buscar documentos na base de conhecimento do Azure AI Search.
 *
 * @example
 * ```typescript
 * const ragTool = createRAGSearchTool({
 *   searchConfig: extractKnowledgeAgentConfig(teamMembers)!,
 *   defaultTopK: 5
 * })
 *
 * // Adicionar ao agente Knowledge
 * const knowledgeAgent = createReactAgent({
 *   llm: model,
 *   tools: [ragTool],
 *   prompt: systemPrompt,
 *   name: 'sda_2_knowledge'
 * })
 * ```
 */
export function createRAGSearchTool(
  options: CreateRAGSearchToolOptions
): DynamicStructuredTool {
  const {
    searchConfig,
    defaultTopK = 5,
    defaultFeedbackFilter = 'positive',
  } = options

  return new DynamicStructuredTool({
    name: 'search_knowledge_base',
    description: `Busca na base de conhecimento do projeto. Use esta ferramenta para:
- Encontrar documentos relevantes sobre um tópico
- Recuperar informações de artefatos anteriores (PRDs, briefings, arquiteturas, backlogs)
- Obter contexto para responder perguntas do usuário
- Verificar se já existe documentação sobre um assunto

A busca retorna documentos ordenados por relevância. Use os resultados para fundamentar suas respostas.`,

    schema: z.object({
      query: z
        .string()
        .describe(
          'Texto de busca. Seja específico sobre o que procura. Exemplos: "arquitetura de microserviços", "requisitos de autenticação", "fluxo de checkout"'
        ),
      topK: z
        .number()
        .optional()
        .default(defaultTopK)
        .describe(
          'Número máximo de documentos a retornar. Padrão: 5. Use mais para buscas amplas.'
        ),
      artifactType: z
        .enum([
          'briefing',
          'prd',
          'architecture',
          'backlog',
          'design',
          'document',
        ])
        .optional()
        .describe(
          'Filtrar por tipo de artefato. Omita para buscar em todos os tipos.'
        ),
      feedbackFilter: z
        .enum(['positive', 'negative', 'all'])
        .optional()
        .default(defaultFeedbackFilter)
        .describe(
          'Filtrar por tipo de feedback. "positive" = aceitos, "negative" = rejeitados, "all" = todos'
        ),
    }),

    func: async ({ query, topK, artifactType, feedbackFilter }) => {
      console.log('\n' + '═'.repeat(70))
      console.log(
        '🔍 [RAG Tool] ========== INICIANDO BUSCA NA BASE DE CONHECIMENTO =========='
      )
      console.log('═'.repeat(70))
      console.log(`📝 Query: "${query}"`)
      console.log(`📊 Parâmetros:`)
      console.log(`   - topK: ${topK || defaultTopK}`)
      console.log(`   - artifactType: ${artifactType || 'todos'}`)
      console.log(
        `   - feedbackFilter: ${feedbackFilter || defaultFeedbackFilter}`
      )
      console.log('─'.repeat(70))

      try {
        // Montar opções de busca
        const searchOptions: RAGSearchOptions = {
          searchConfig,
          topK: topK || defaultTopK,
          feedbackFilter: feedbackFilter || defaultFeedbackFilter,
          artifactTypeFilter: artifactType,
          searchType: 'hybrid', // Busca híbrida (texto + vetor) para melhor precisão
        }

        // Executar busca
        const results = await searchKnowledgeBase(query, searchOptions)

        if (results.length === 0) {
          console.log('⚠️ [RAG Tool] Nenhum documento encontrado')
          console.log('═'.repeat(70) + '\n')
          return `Nenhum documento encontrado para a busca "${query}". Tente termos diferentes ou mais genéricos.`
        }

        // Log detalhado dos resultados classificados
        const positiveCount = results.filter(
          r => r.feedbackType === 'positive'
        ).length
        const negativeCount = results.filter(
          r => r.feedbackType === 'negative'
        ).length

        console.log(
          '\n📋 [RAG Tool] ========== RESUMO DOS RESULTADOS =========='
        )
        console.log(`   📦 Total de documentos: ${results.length}`)
        console.log(`   ✅ Boas Práticas (positive): ${positiveCount}`)
        console.log(`   ❌ Anti-Padrões (negative): ${negativeCount}`)
        console.log('─'.repeat(50))

        // Log de cada resultado
        results.forEach((doc, i) => {
          const emoji =
            doc.feedbackType === 'positive'
              ? '✅'
              : doc.feedbackType === 'negative'
                ? '❌'
                : '📄'
          const label =
            doc.feedbackType === 'positive'
              ? 'BOA PRÁTICA'
              : doc.feedbackType === 'negative'
                ? 'ANTI-PADRÃO'
                : 'NÃO CLASSIFICADO'
          console.log(`   ${emoji} [${i + 1}] ${label}`)
          console.log(`       Título: "${doc.title}"`)
          console.log(
            `       Tipo: ${doc.artifactType} | Agente: ${doc.agentName}`
          )
          console.log(`       Score: ${(doc.score * 100).toFixed(2)}%`)
          console.log(`       Preview: "${doc.content.substring(0, 100)}..."`)
          console.log('─'.repeat(50))
        })

        // Formatar resultados para o LLM (já inclui logs internos)
        const formattedResults = formatRAGResultsForPrompt(results)

        console.log('\n✅ [RAG Tool] ========== BUSCA CONCLUÍDA ==========')
        console.log(`   📤 Retornando ${results.length} documentos para o LLM`)
        console.log(
          `   📏 Tamanho do contexto: ${formattedResults.length} caracteres`
        )
        console.log('═'.repeat(70) + '\n')

        return formattedResults
      } catch (error) {
        console.error('❌ [RAG Tool] Erro na busca:', error)
        console.log('═'.repeat(70) + '\n')
        return `Erro ao buscar na base de conhecimento: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Tente novamente ou reformule a busca.`
      }
    },
  })
}

/**
 * Verificar se o agente é o Knowledge agent
 *
 * @param agentName - Nome do agente (normalizado ou display name)
 * @returns true se for o agente Knowledge
 */
export function isKnowledgeAgent(agentName: string): boolean {
  const nameLower = agentName.toLowerCase()
  return (
    nameLower.includes('knowledge') ||
    nameLower.includes('base de conhecimento') ||
    nameLower.includes('conhecimento')
  )
}
