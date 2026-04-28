/**
 * Serviço de detecção de artefatos para o SDA2
 *
 * Detecta artefatos APENAS via metadados do agente (ARTIFACT_METADATA).
 * O artifact_type é definido no objetivo do agente no MCP e injetado no prompt.
 *
 * FLUXO:
 * 1. BFF extrai artifact_type do campo objective do agente no MCP
 * 2. Supervisor injeta no prompt do agente via buildAgentSystemPrompt
 * 3. Agente inclui ARTIFACT_METADATA na resposta com o tipo correto
 * 4. Frontend detecta via extractArtifactMetadata
 *
 * SEM FALLBACK: Se o agente não enviar ARTIFACT_METADATA, a resposta é
 * tratada como texto normal (não gera proposta de artefato).
 */

import type { DetectedArtifact } from '../components/artifacts/ArtifactProposal'

// ============================================================================
// Types
// ============================================================================

export type ArtifactDocumentType =
  | 'briefing'
  | 'brief'
  | 'prd'
  | 'backlog'
  | 'architecture'
  | 'document'
  | 'user-story'
  | 'epic'
  | 'design'
  | 'requirements'
  | 'stakeholder-map'
  | 'personas'
  | 'discovery'

/**
 * Metadados estruturados do artefato (enviados pelo agente)
 */
interface ArtifactMetadata {
  type: string
  title: string
  agent?: string
}

// ============================================================================
// Metadata Extraction (Primary Method)
// ============================================================================

/**
 * Extrai metadados ARTIFACT_METADATA do conteúdo da resposta do agente
 *
 * O agente deve incluir um bloco como:
 * <!-- ARTIFACT_METADATA
 * {
 *   "type": "discovery",
 *   "title": "Documento de Discovery",
 *   "agent": "Discovery Analyst"
 * }
 * -->
 */
function extractArtifactMetadata(content: string): ArtifactMetadata | null {
  // Regex para extrair o bloco ARTIFACT_METADATA
  const metadataRegex = /<!--\s*ARTIFACT_METADATA\s*\n([\s\S]*?)\n\s*-->/i
  const match = content.match(metadataRegex)

  if (!match || !match[1]) {
    return null
  }

  try {
    const jsonContent = match[1].trim()
    const metadata = JSON.parse(jsonContent) as ArtifactMetadata

    // Limpar caracteres inválidos do type (backticks, aspas extras)
    if (metadata.type) {
      metadata.type = metadata.type.replace(/^["'`]+|["'`]+$/g, '').trim()
    }

    console.log('📋 [METADATA] Metadados extraídos do agente:', metadata)

    // Validar campos obrigatórios
    if (!metadata.type || !metadata.title) {
      console.warn('⚠️ [METADATA] Metadados incompletos:', metadata)
      return null
    }

    return metadata
  } catch (error) {
    console.error('❌ [METADATA] Erro ao parsear metadados:', error)
    return null
  }
}

/**
 * Remove o bloco ARTIFACT_METADATA e marcador [FIM] do conteúdo para exibição limpa
 * Suporta formato multi-linha e inline (tudo em uma linha)
 */
export function removeArtifactMetadata(content: string): string {
  return (
    content
      // Formato inline: <!-- ARTIFACT_METADATA { ... } -->
      .replace(/<!--\s*ARTIFACT_METADATA\s*\{[^}]*\}\s*-->\s*/gi, '')
      // Formato multi-linha: <!-- ARTIFACT_METADATA\n...\n-->
      .replace(/<!--\s*ARTIFACT_METADATA\s*\n[\s\S]*?\n\s*-->\s*/gi, '')
      // Remove marcador [FIM] usado para controle de duplicação
      .replace(/<!--\s*\[FIM\]\s*-->\s*/gi, '')
      .trim()
  )
}

/**
 * Mapeia o tipo do agente para o tipo interno de documento
 *
 * Suporta tanto tipos simples (prd, backlog) quanto descritivos:
 * - "Backlog do Produto" → backlog
 * - "PRD(Product Requirements Document)" → prd
 * - "Documento de Discovery" → briefing
 * - "Especificação de Design" → design
 * - "Documento de Arquitetura" → architecture
 */
function mapAgentTypeToDocumentType(agentType: string): ArtifactDocumentType {
  const normalizedType = agentType.toLowerCase().trim()

  // Mapeamento para tipos descritivos do MCP (com espaços e acentos)
  const descriptiveTypeMap: Record<string, ArtifactDocumentType> = {
    'backlog do produto': 'backlog',
    'product backlog': 'backlog',
    'prd(product requirements document)': 'prd',
    'prd (product requirements document)': 'prd',
    'product requirements document': 'prd',
    'documento de discovery': 'briefing',
    'discovery document': 'briefing',
    'especificação de design': 'design',
    'especificacao de design': 'design',
    'design specification': 'design',
    'documento de arquitetura': 'architecture',
    'architecture document': 'architecture',
  }

  // Primeiro tenta o mapeamento descritivo
  if (descriptiveTypeMap[normalizedType]) {
    return descriptiveTypeMap[normalizedType]
  }

  // Fallback para tipos simples
  const typeMap: Record<string, ArtifactDocumentType> = {
    // Tipos principais do agente
    discovery: 'briefing',
    prd: 'prd',
    architecture: 'architecture',
    backlog: 'backlog',
    design: 'design',
    // Aliases comuns
    briefing: 'briefing',
    brief: 'briefing',
    product: 'prd',
    tech: 'architecture',
    ux: 'design',
    ui: 'design',
    epic: 'backlog',
    story: 'backlog',
    'user-story': 'backlog',
  }

  if (typeMap[normalizedType]) {
    return typeMap[normalizedType]
  }

  // Fallback: keyword matching parcial para tipos genéricos/truncados
  // Ex: "Documento" sozinho não bate em nenhum map, mas contém keywords reconhecíveis
  const keywordMap: Array<{ keywords: string[]; type: ArtifactDocumentType }> =
    [
      { keywords: ['discovery', 'briefing', 'descoberta'], type: 'briefing' },
      { keywords: ['prd', 'requisito', 'requirement'], type: 'prd' },
      {
        keywords: ['arquitetura', 'architecture', 'infraestrutura'],
        type: 'architecture',
      },
      {
        keywords: ['backlog', 'épico', 'epic', 'user story', 'história'],
        type: 'backlog',
      },
      {
        keywords: ['design', 'ux', 'interface', 'usabilidade'],
        type: 'design',
      },
    ]

  for (const entry of keywordMap) {
    if (entry.keywords.some(kw => normalizedType.includes(kw))) {
      console.log(
        `📋 [MAP] Keyword match: "${agentType}" → "${entry.type}" (keyword found in type)`
      )
      return entry.type
    }
  }

  return 'document'
}

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Verifica se o conteúdo é uma mensagem informativa (NÃO é artefato)
 * Mensagens informativas incluem:
 * - Recomendações de sequência de artefatos
 * - Recusas de escopo (off-topic)
 * - Perguntas de esclarecimento
 * - Mensagens curtas de orientação
 */
function isInformativeMessage(content: string): boolean {
  const lowerContent = content.toLowerCase()

  // ==========================================================================
  // VERIFICAÇÃO PRÉVIA: Se é um documento estruturado, NÃO é informativo
  // Documentos reais têm estrutura significativa mesmo sem markdown headers
  // ==========================================================================
  const isLongStructuredDocument =
    content.length > 3000 && // Documento substancial
    // Tem seções típicas de documentos
    ((lowerContent.includes('visão geral') &&
      lowerContent.includes('objetivo')) ||
      (lowerContent.includes('contexto') &&
        lowerContent.includes('stakeholder')) ||
      (lowerContent.includes('requisitos') &&
        lowerContent.includes('escopo')) ||
      (lowerContent.includes('arquitetura') &&
        lowerContent.includes('tecnologia')) ||
      // Tem título de documento no início
      /^#?\s*(?:Briefing|PRD|Backlog|Documento|Arquitetura|Design)/im.test(
        content
      ) ||
      /^(?:Briefing|PRD|Backlog|Documento|Arquitetura|Design)\s+(?:do|de|—)/im.test(
        content
      ))

  if (isLongStructuredDocument) {
    console.log(
      '📄 [DETECT] Documento estruturado detectado - NÃO é mensagem informativa',
      {
        length: content.length,
        hasVisaoGeral: lowerContent.includes('visão geral'),
        hasContexto: lowerContent.includes('contexto'),
      }
    )
    return false // É um documento, não uma mensagem informativa
  }

  // ==========================================================================
  // PADRÃO 1: Recomendação de Sequência de Artefatos
  // Só considera informativo se for mensagem CURTA focada em sequência
  // ==========================================================================
  const isSequenceRecommendation =
    content.length < 3000 && // Mensagens informativas são mais curtas
    (lowerContent.includes('recomendação de sequência') ||
      (lowerContent.includes('sequência recomendada') &&
        lowerContent.includes('o que você prefere')) ||
      (lowerContent.includes('percebi que você quer gerar') &&
        lowerContent.includes('mas ainda não temos')) ||
      (lowerContent.includes('por que isso importa?') &&
        lowerContent.includes('o que você prefere?')) ||
      (lowerContent.includes('gerar primeiro') &&
        lowerContent.includes('prosseguir com') &&
        lowerContent.includes('responda com')) ||
      lowerContent.includes('responda com 1 ou 2') ||
      lowerContent.includes('responda com 1, 2'))

  if (isSequenceRecommendation) {
    console.log(
      '🚫 [DETECT] Mensagem informativa detectada: Recomendação de Sequência'
    )
    return true
  }

  // ==========================================================================
  // PADRÃO 2: Recusa de Escopo (Off-topic)
  // ==========================================================================
  const isOffTopicRefusal =
    content.length < 2000 && // Recusas são mensagens curtas
    (lowerContent.includes('fora do meu escopo de atuação') ||
      lowerContent.includes('essa solicitação está fora do meu escopo') ||
      (lowerContent.includes('sou o supervisor avanade') &&
        lowerContent.includes('especializado em desenvolvimento de software') &&
        !lowerContent.includes('visão geral') &&
        !lowerContent.includes('requisitos')))

  if (isOffTopicRefusal) {
    console.log('🚫 [DETECT] Mensagem informativa detectada: Recusa de Escopo')
    return true
  }

  // ==========================================================================
  // PADRÃO 3: Perguntas de Esclarecimento (mensagens curtas)
  // ==========================================================================
  const isClarificationQuestion =
    content.length < 1500 && // Perguntas de esclarecimento são curtas
    (lowerContent.includes('você pode me informar') ||
      lowerContent.includes('pode me fornecer') ||
      lowerContent.includes('preciso de mais informações') ||
      lowerContent.includes('para continuar, preciso saber')) &&
    !lowerContent.includes('visão geral') &&
    !lowerContent.includes('objetivo:') &&
    !lowerContent.includes('escopo')

  if (isClarificationQuestion) {
    console.log(
      '🚫 [DETECT] Mensagem informativa detectada: Pergunta de Esclarecimento'
    )
    return true
  }

  // ==========================================================================
  // PADRÃO 4: Mensagens de Orientação Geral (sem estrutura de documento)
  // ==========================================================================
  const hasNoDocumentStructure =
    !content.includes('# ') && // Sem headers markdown
    !content.includes('## ') &&
    !content.includes('### ')

  // Verificar se tem estrutura de documento mesmo sem markdown headers
  const hasDocumentSections =
    (lowerContent.includes('visão geral') &&
      lowerContent.includes('objetivo')) ||
    (lowerContent.includes('contexto') && lowerContent.includes('escopo')) ||
    (lowerContent.includes('requisitos') &&
      lowerContent.includes('funcional')) ||
    lowerContent.includes('stakeholders e personas') ||
    lowerContent.includes('roadmap') ||
    lowerContent.includes('arquitetura e tecnologia')

  const isShortGuidance =
    content.length < 1500 && // Mensagem curta
    hasNoDocumentStructure &&
    !hasDocumentSections && // Não tem seções de documento
    (lowerContent.includes('posso ajudar') ||
      lowerContent.includes('como posso') ||
      lowerContent.includes('você gostaria') ||
      lowerContent.includes('o que você prefere'))

  if (isShortGuidance) {
    console.log(
      '🚫 [DETECT] Mensagem informativa detectada: Orientação Geral Curta'
    )
    return true
  }

  // ==========================================================================
  // PADRÃO 5: Mensagem com emojis de pergunta/opções sem conteúdo de documento
  // ==========================================================================
  const hasQuestionEmojis =
    (content.includes('📋') ||
      content.includes('🎯') ||
      content.includes('📊')) &&
    (content.includes('?') || content.includes('1.') || content.includes('2.'))

  const lacksDocumentContent =
    !lowerContent.includes('visão geral') &&
    !lowerContent.includes('executive summary') &&
    !lowerContent.includes('requisitos funcionais') &&
    !lowerContent.includes('critérios de aceite') &&
    !lowerContent.includes('arquitetura de') &&
    !lowerContent.includes('contexto de negócio') &&
    !lowerContent.includes('stakeholders') &&
    !lowerContent.includes('roadmap')

  // Só considera informativo se for curto E sem conteúdo de documento
  if (
    content.length < 2000 &&
    hasQuestionEmojis &&
    lacksDocumentContent &&
    hasNoDocumentStructure &&
    !hasDocumentSections
  ) {
    console.log(
      '🚫 [DETECT] Mensagem informativa detectada: Pergunta com Opções'
    )
    return true
  }

  return false
}

/**
 * Detecta artefatos em uma mensagem do assistente
 *
 * Prioridade:
 * 1. Verificar se é mensagem informativa (NÃO detectar)
 * 2. Metadados ARTIFACT_METADATA (enviados pelo agente)
 * 3. Fallback: detecção por padrões no conteúdo
 */
export function detectArtifactsInMessage(
  content: string,
  messageId: string
): DetectedArtifact[] {
  const artifacts: DetectedArtifact[] = []

  // Verificar se conteúdo é muito curto para ser artefato
  if (!content || content.length < 200) {
    return artifacts
  }

  // ==========================================================================
  // PRIORIDADE 0: Verificar se é mensagem INFORMATIVA (NÃO é artefato)
  // Isso DEVE vir ANTES de qualquer detecção de artefato
  // ==========================================================================
  if (isInformativeMessage(content)) {
    console.log(
      `🚫 [DETECT] Mensagem identificada como INFORMATIVA - NÃO é artefato`
    )
    return artifacts // Retorna array vazio
  }

  console.log(`🔍 [DETECT] Iniciando detecção de artefatos:`, {
    contentLength: content.length,
    contentPreview: content.substring(0, 150) + '...',
  })

  // PRIORIDADE 1: Tentar extrair metadados do agente
  const metadata = extractArtifactMetadata(content)

  if (metadata) {
    let type = mapAgentTypeToDocumentType(metadata.type)

    // Se o type ficou genérico ('document'), tentar desambiguar pelo title
    // Ex: type="Documento" mas title="Documento de Discovery" → briefing
    if (type === 'document' && metadata.title) {
      const titleType = mapAgentTypeToDocumentType(metadata.title)
      if (titleType !== 'document') {
        console.log(
          `📋 [DETECT] Type genérico "${metadata.type}" desambiguado pelo title "${metadata.title}" → "${titleType}"`
        )
        type = titleType
      }
    }

    const cleanContent = removeArtifactMetadata(content)

    // ID determinístico baseado no messageId + tipo do artefato
    // Garante que o mesmo artefato na mesma mensagem sempre gera o mesmo ID
    // Isso é essencial para que acceptedArtifactKeys funcione entre re-renders
    artifacts.push({
      id: `artifact-${messageId}-${type}`,
      title: metadata.title,
      content: cleanContent,
      type,
      status: 'pending',
    })

    console.log(`✅ [DETECT] Artefato detectado via METADATA:`, {
      type,
      title: metadata.title,
      agent: metadata.agent,
      contentLength: cleanContent.length,
    })

    return artifacts
  }

  // SEM METADATA = SEM ARTEFATO
  // Os agentes SDA DEVEM enviar ARTIFACT_METADATA com o tipo correto
  // Se não enviaram, não é um artefato estruturado - é apenas uma resposta de texto
  console.log(
    `ℹ️ [DETECT] Metadados não encontrados - agente NÃO enviou ARTIFACT_METADATA`
  )
  console.log(
    `📝 [DETECT] Resposta tratada como texto normal (não é artefato estruturado)`
  )
  console.log(
    `💡 [DETECT] Para gerar artefato, configure artifact_type no objetivo do agente no MCP`
  )

  // Retorna array vazio - sem fallback para 'document'
  return artifacts
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verifica se o conteúdo parece ser um artefato estruturado
 */
export function isStructuredArtifact(content: string): boolean {
  if (!content || content.length < 200) {
    return false
  }

  // PRIORIDADE 1: Verificar se tem metadados do agente
  const hasMetadata = /<!--\s*ARTIFACT_METADATA/i.test(content)
  if (hasMetadata) {
    return true
  }

  // Verificar se tem estrutura markdown significativa
  const hasHeaders = /^#{1,3}\s+.+$/m.test(content)
  const hasLists = /^[-*]\s+.+$/m.test(content)
  const hasSubsections = content.split(/^#{1,3}\s/m).length > 2

  // Verificar padrões específicos de artefatos
  const hasArtifactPatterns =
    /(?:requisitos|épico|feature|user story|como.*quero|briefing|prd|backlog|arquitetura)/i.test(
      content
    )

  return (hasHeaders && hasLists && hasSubsections) || hasArtifactPatterns
}

/**
 * Detecta o tipo do artefato baseado no conteúdo (versão exportada)
 * Tenta primeiro via metadados, senão usa tipo genérico
 * IMPORTANTE: Retorna null para mensagens informativas
 */
export function detectArtifactTypeFromContent(
  content: string
): ArtifactDocumentType | null {
  // PRIORIDADE 0: Verificar se é mensagem informativa (NÃO é artefato)
  if (isInformativeMessage(content)) {
    console.log(`🚫 [DETECT TYPE] Mensagem informativa - retornando null`)
    return null
  }

  // Tentar via metadados primeiro
  const metadata = extractArtifactMetadata(content)
  if (metadata) {
    return mapAgentTypeToDocumentType(metadata.type)
  }

  // Sem metadados - retornar tipo genérico 'document'
  // Os agentes SDA devem SEMPRE enviar ARTIFACT_METADATA
  console.log(
    `📝 [DETECT TYPE] Sem metadados - usando tipo genérico 'document'`
  )
  return 'document'
}
