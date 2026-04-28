/**
 * Extrator de configuração do agente AMS Knowledge
 *
 * 🆕 VERSÃO AMS: Busca também no campo "instruction" (enriquecido com artifacts)
 * 🆕 EXTRAÇÃO GENÉRICA: Captura TODAS as variáveis automaticamente
 *
 * Sistema de parsing universal que captura qualquer variável no formato:
 * - String: chave: "valor"
 * - Numérico: chave: 123
 *
 * Não requer manutenção de regex patterns específicos por campo.
 * Adicionar novas variáveis no artefato = automático no sistema.
 *
 * Mapeia automaticamente openai_api_version → azure_openai_api_version
 *
 * DIFERENÇA vs SDA2:
 * - SDA2: Busca apenas em role/specialty com patterns específicos
 * - AMS: Busca em instruction → role → specialty com extração genérica
 *
 * O campo instruction do AMS contém artifacts resolvidos (${ARTIFACT_NAME}),
 * tornando-o ideal para armazenar configurações RAG em artifacts centralizados.
 */

import type { AMSDynamicSearchConfig } from './types'

/**
 * Interface para team member (AMS version com instruction)
 */
interface TeamMember {
  name: string
  role?: string
  specialty?: string
  instruction?: string // 🆕 Campo enriquecido com artifacts no AMS
}

/**
 * Extrair configuração do Azure AI Search do agente AMS Knowledge
 *
 * 🆕 EXTRAÇÃO SIMPLIFICADA: Captura apenas 5 campos essenciais:
 * - azure_search_endpoint (obrigatório)
 * - index_name (obrigatório)
 * - azure_search_key (obrigatório)
 * - k (opcional, padrão de topK)
 * - search_type (obrigatório: 'semantic' ou 'keyword')
 * - semantic_configuration_name (obrigatório para semantic)
 *
 * ORDEM DE BUSCA (prioridade):
 * 1. instruction (🆕 AMS - artifacts resolvidos)
 * 2. role
 * 3. specialty
 *
 * @param teamMembers - Lista de team members do agent card
 * @returns Configuração extraída ou null se não encontrada
 */
export function extractKnowledgeAgentConfig(
  teamMembers: TeamMember[] | undefined
): AMSDynamicSearchConfig | null {
  if (!teamMembers) {
    globalThis.console.log('📭 [AMS RAG Config] No team members provided')
    return null
  }

  // Procurar pelo agente Knowledge (flexível para diferentes nomes)
  const knowledgeAgent = teamMembers.find(
    member =>
      member.name.toLowerCase().includes('knowledge') ||
      member.name.toLowerCase().includes('conhecimento') ||
      member.name.toLowerCase().includes('base de conhecimento')
  )

  if (!knowledgeAgent) {
    globalThis.console.log(
      '📭 [AMS RAG Config] Agent "Knowledge" not found in team'
    )
    return null
  }

  globalThis.console.log(
    '🔍 [AMS RAG Config] Found Knowledge agent:',
    knowledgeAgent.name
  )

  // 🆕 PRIORIDADE: instruction (artifacts resolvidos) → role → specialty
  const fullText = `${knowledgeAgent.instruction || ''}\n${knowledgeAgent.role || ''}\n${knowledgeAgent.specialty || ''}`

  globalThis.console.log('📄 [AMS RAG Config] Searching in fields:', {
    hasInstruction: !!knowledgeAgent.instruction,
    hasRole: !!knowledgeAgent.role,
    hasSpecialty: !!knowledgeAgent.specialty,
    totalLength: fullText.length,
  })

  // 🆕 EXTRAÇÃO SIMPLIFICADA: Apenas 5 campos essenciais
  const extracted: Record<string, string> = {}

  // Pattern: Captura variáveis com valores entre aspas: chave: "valor"
  const stringPattern = /(\w+):\s*"([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = stringPattern.exec(fullText)) !== null) {
    const key = match[1]
    const value = match[2]
    if (key && value) {
      // Filtrar apenas os campos que precisamos
      const allowedFields = [
        'azure_search_endpoint',
        'index_name',
        'azure_search_key',
        'search_type',
        'semantic_configuration_name',
      ]
      if (allowedFields.includes(key)) {
        extracted[key] = value
        const isSecret = key.includes('key') || key.includes('Key')
        globalThis.console.log(
          `✅ [AMS RAG Config] Extracted ${key}: ${isSecret ? '***' : value}`
        )
      }
    }
  }

  // Campo numérico opcional (sem aspas): k: 20
  const topKMatch = fullText.match(/\bk\s*:\s*(\d+)\b/i)
  if (topKMatch?.[1]) {
    extracted.k = topKMatch[1]
    globalThis.console.log(`✅ [AMS RAG Config] Extracted k: ${topKMatch[1]}`)
  }

  globalThis.console.log(
    '📦 [AMS RAG Config] Total extracted variables:',
    Object.keys(extracted).length
  )

  // Validar search_type
  const validSearchTypes = ['semantic', 'keyword']
  const searchType = extracted.search_type as 'semantic' | 'keyword' | undefined
  if (searchType && !validSearchTypes.includes(searchType)) {
    globalThis.console.warn(
      `⚠️ [AMS RAG Config] Invalid search_type "${searchType}", must be "semantic" or "keyword"`
    )
    return null
  }

  // Validar que temos todas as variáveis obrigatórias
  if (
    !extracted.azure_search_endpoint ||
    !extracted.index_name ||
    !extracted.azure_search_key ||
    !extracted.search_type
  ) {
    globalThis.console.log(
      '❌ [AMS RAG Config] Missing required variables from agent:',
      {
        hasEndpoint: !!extracted.azure_search_endpoint,
        hasIndexName: !!extracted.index_name,
        hasKey: !!extracted.azure_search_key,
        hasSearchType: !!extracted.search_type,
      }
    )
    return null
  }

  // Validar semantic_configuration_name para semantic search
  if (searchType === 'semantic' && !extracted.semantic_configuration_name) {
    globalThis.console.warn(
      '⚠️ [AMS RAG Config] semantic_configuration_name is required for semantic search'
    )
  }

  // Mapear variáveis extraídas para o tipo AMSDynamicSearchConfig
  const config: AMSDynamicSearchConfig = {
    azure_search_endpoint: extracted.azure_search_endpoint,
    index_name: extracted.index_name,
    azure_search_key: extracted.azure_search_key,
    k: extracted.k ? Number.parseInt(extracted.k, 10) : undefined,
    search_type: searchType!,
    semantic_configuration_name:
      extracted.semantic_configuration_name || 'default',
  }

  globalThis.console.log(
    '🎉 [AMS RAG Config] Complete config extracted from Knowledge agent'
  )
  globalThis.console.log('📋 [AMS RAG Config] Settings:', {
    endpoint: config.azure_search_endpoint,
    index: config.index_name,
    k: config.k,
    search_type: config.search_type,
    semantic_config: config.semantic_configuration_name,
  })

  return config
}

/**
 * Extrair configuração diretamente de texto (instruction, role ou specialty)
 *
 * @param text - Texto contendo as variáveis
 * @returns Configuração extraída ou null
 */
export function extractConfigFromText(
  text: string
): AMSDynamicSearchConfig | null {
  const patterns = {
    azure_search_endpoint: /azure_search_endpoint:\s*"([^"]+)"/i,
    index_name: /index_name:\s*"([^"]+)"/i,
    azure_search_key: /azure_search_key:\s*"([^"]+)"/i,
    k: /\bk\s*:\s*(\d+)\b/i,
    search_type: /search_type:\s*"([^"]+)"/i,
    semantic_configuration_name: /semantic_configuration_name:\s*"([^"]+)"/i,
  }

  const extracted: Partial<AMSDynamicSearchConfig> = {}

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const value = match[1]
      // Type-safe assignment
      if (key === 'search_type') {
        const validTypes = ['semantic', 'keyword']
        if (validTypes.includes(value)) {
          extracted.search_type = value as 'semantic' | 'keyword'
        }
      } else if (key === 'k') {
        extracted.k = Number.parseInt(value, 10)
      } else {
        extracted[key as keyof AMSDynamicSearchConfig] = value as unknown
      }
    }
  }

  // Validar campos obrigatórios
  if (
    extracted.azure_search_endpoint &&
    extracted.index_name &&
    extracted.azure_search_key &&
    extracted.search_type
  ) {
    return {
      azure_search_endpoint: extracted.azure_search_endpoint,
      index_name: extracted.index_name,
      azure_search_key: extracted.azure_search_key,
      k: extracted.k,
      search_type: extracted.search_type,
      semantic_configuration_name:
        extracted.semantic_configuration_name || 'default',
    }
  }

  return null
}
