/**
 * Extrator de configuração do agente SDA 2 Knowledge
 *
 * Parseia as variáveis azure_search_endpoint, index_name e azure_search_key
 * dos campos role/specialty do agente SDA 2 Knowledge.
 */

import type { DynamicSearchConfig } from './types'

/**
 * Interface para team member (simplificada)
 */
interface TeamMember {
  name: string
  role?: string
  specialty?: string
}

/**
 * Extrair configuração do Azure AI Search do agente SDA 2 Knowledge
 *
 * Procura por variáveis no formato:
 * - azure_search_endpoint: "https://..."
 * - index_name: "sda2-knowledge"
 * - azure_search_key: "..."
 *
 * @param teamMembers - Lista de team members do agent card
 * @returns Configuração extraída ou null se não encontrada
 */
export function extractKnowledgeAgentConfig(
  teamMembers: TeamMember[] | undefined
): DynamicSearchConfig | null {
  if (!teamMembers) {
    console.log('📭 [RAG Config] No team members provided')
    return null
  }

  // Procurar pelo agente SDA 2 Knowledge
  const knowledgeAgent = teamMembers.find(
    member =>
      member.name.toLowerCase().includes('knowledge') ||
      member.name.toLowerCase().includes('sda 2 knowledge') ||
      member.name.toLowerCase().includes('base de conhecimento')
  )

  if (!knowledgeAgent) {
    console.log('📭 [RAG Config] Agent "SDA 2 Knowledge" not found in team')
    return null
  }

  console.log('🔍 [RAG Config] Found Knowledge agent:', knowledgeAgent.name)

  // Combinar role e specialty para buscar variáveis
  const fullText = `${knowledgeAgent.role || ''}\n${knowledgeAgent.specialty || ''}`

  // Patterns para extrair variáveis
  const patterns = {
    azure_search_endpoint: /azure_search_endpoint:\s*"([^"]+)"/i,
    index_name: /index_name:\s*"([^"]+)"/i,
    azure_search_key: /azure_search_key:\s*"([^"]+)"/i,
  }

  const extracted: Partial<DynamicSearchConfig> = {}

  // Extrair cada variável
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = fullText.match(pattern)
    if (match?.[1]) {
      extracted[key as keyof DynamicSearchConfig] = match[1]
      console.log(
        `✅ [RAG Config] Extracted ${key}: ${key === 'azure_search_key' ? '***' : match[1]}`
      )
    }
  }

  // Validar que temos todas as variáveis necessárias
  if (
    extracted.azure_search_endpoint &&
    extracted.index_name &&
    extracted.azure_search_key
  ) {
    console.log(
      '🎉 [RAG Config] Complete config extracted from Knowledge agent'
    )
    return extracted as DynamicSearchConfig
  }

  console.warn('⚠️ [RAG Config] Incomplete config from Knowledge agent:', {
    hasEndpoint: !!extracted.azure_search_endpoint,
    hasIndexName: !!extracted.index_name,
    hasKey: !!extracted.azure_search_key,
  })

  return null
}

/**
 * Extrair configuração diretamente de texto (role ou specialty)
 *
 * @param text - Texto contendo as variáveis
 * @returns Configuração extraída ou null
 */
export function extractConfigFromText(
  text: string
): DynamicSearchConfig | null {
  const patterns = {
    azure_search_endpoint: /azure_search_endpoint:\s*"([^"]+)"/i,
    index_name: /index_name:\s*"([^"]+)"/i,
    azure_search_key: /azure_search_key:\s*"([^"]+)"/i,
  }

  const extracted: Partial<DynamicSearchConfig> = {}

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern)
    if (match?.[1]) {
      extracted[key as keyof DynamicSearchConfig] = match[1]
    }
  }

  if (
    extracted.azure_search_endpoint &&
    extracted.index_name &&
    extracted.azure_search_key
  ) {
    return extracted as DynamicSearchConfig
  }

  return null
}
