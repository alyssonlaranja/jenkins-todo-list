/* eslint-disable no-console */
/**
 * Backlog Parser Service - Upstream SDA-2
 *
 * Parser de markdown para extrair hierarquia de work items (Épicos, Features, User Stories)
 * do conteúdo de artefatos de backlog.
 *
 * Baseado no parser do upstream-sda com adaptações para o contexto do SDA-2.
 */

export type WorkItemType = 'epic' | 'feature' | 'userstory' | 'task'

export type WorkItemStatus =
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'pronta-para-envio'

export type IntegrationStatus =
  | 'not-sent'
  | 'pending'
  | 'synced'
  | 'error'
  | 'Não enviada'

export interface ParsedWorkItem {
  id: string
  title: string
  type: WorkItemType
  description?: string
  acceptanceCriteria?: string[]
  priority?: 'high' | 'medium' | 'low'
  storyPoints?: number
  status: WorkItemStatus
  integrationStatus: IntegrationStatus
  children: ParsedWorkItem[]
  parentId?: string
  selected?: boolean
  expanded?: boolean
  // Contadores para display
  featureCount?: number
  userStoryCount?: number
  // IDs externos após sincronização
  adoId?: string
  jiraId?: string
}

export interface ParseResult {
  success: boolean
  workItems: ParsedWorkItem[]
  metadata: {
    totalItems: number
    epicsCount: number
    featuresCount: number
    userStoriesCount: number
    tasksCount: number
    confidence: number
    processingTime: number
  }
  issues: string[]
  warnings: string[]
}

/**
 * Gera hash simples e determinístico a partir de uma string
 * Usado para criar IDs estáveis baseados no conteúdo
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Converter para string alfanumérica positiva
  return Math.abs(hash).toString(36)
}

/**
 * Gera ID único e DETERMINÍSTICO para work item
 * O ID é baseado no tipo, índice e título, garantindo que o mesmo item
 * sempre tenha o mesmo ID em parses subsequentes.
 */
function generateId(
  type: WorkItemType,
  index: number,
  parentId?: string,
  title?: string
): string {
  const prefix = {
    epic: 'epic',
    feature: 'feature',
    userstory: 'us',
    task: 'task',
  }[type]

  // Criar hash baseado no título para ID determinístico
  const titleHash = title ? simpleHash(title) : simpleHash(`${type}-${index}`)

  if (parentId) {
    // Extrair o índice do parent (ex: "epic-1-abc123" -> "1")
    const parentIndex = parentId.split('-')[1] || '0'
    return `${prefix}-${parentIndex}-${index}-${titleHash}`
  }

  return `${prefix}-${index}-${titleHash}`
}

/**
 * Detecta o tipo de work item baseado no título/linha
 * Suporta múltiplos formatos:
 * - Markdown canônico: ## 🎯 ÉPICO 1:, ### 🚀 Feature 1.1:, #### 📝 US 1.1.1:
 * - Formato CODE 60: E1. Título, F1.1 Título, US-101 — Título
 * - Formato PRD/Backlog: EP-01, FE-01, US-001
 * - Formato simples: Épico 1:, Feature 1.1:, User Story 1.1.1:
 */
function detectWorkItemType(line: string): WorkItemType | null {
  const trimmedLine = line.trim()
  const normalizedLine = trimmedLine.toLowerCase()

  // ==========================================
  // FILTROS PARA IGNORAR REFERÊNCIAS/LISTAS
  // ==========================================

  // Ignorar épicos em listas numeradas (são apenas referências)
  // Ex: "1. **EP-001 – Catálogo..." ou "1. EP-001 –"
  if (normalizedLine.match(/^\d+\.\s*\*{0,2}ep[-–—]?\d+/i)) {
    return null
  }

  // Ignorar features em listas com bullets (são apenas referências)
  // Ex: "- **FE-001.1 – Home..." ou "- FE-001.1 –"
  if (normalizedLine.match(/^[-*•]\s*\*{0,2}fe[-–—]?\d+/i)) {
    return null
  }

  // ==========================================
  // FORMATO PRD/BACKLOG (EP-01, FE-01, US-001)
  // ==========================================

  // Épicos: "## EP-01", "## 3. EP-001" (com número de seção, precisa de header markdown)
  // Precisa começar com ## para ser um épico real, não uma referência
  if (normalizedLine.match(/^#{2,3}\s*(?:\d+\.?\s*)?ep[-–—]?\d+\b/i)) {
    return 'epic'
  }

  // Features: "### FE-001.1", "### 3.1 FE-001.1" (precisa de header markdown)
  // Formato com header markdown
  if (normalizedLine.match(/^#{2,4}\s*(?:\d+\.?\d*\s*)?fe[-–—]?\d+/i)) {
    return 'feature'
  }

  // User Stories: "**US-001.1.1 – ..." (negrito no início da linha)
  // Também aceita: "## US-001", "### US-001.1.1"
  if (
    normalizedLine.match(/^\*{2}us[-–—]?\d+/i) || // **US-001.1.1
    normalizedLine.match(/^#{2,5}\s*us[-–—]?\d+/i) // ## US-001
  ) {
    return 'userstory'
  }

  // ==========================================
  // FORMATO CODE 60 (E1., F1.1, US-101)
  // ==========================================

  // Épicos: "E1. Fluxo Crítico" ou "## E1. Fluxo" ou header seguido de "E1."
  if (
    normalizedLine.match(/^#{0,3}\s*e\d+\.\s+/i) ||
    normalizedLine.match(/^#{0,3}\s*e\d+[:\s]/i)
  ) {
    return 'epic'
  }

  // Features: "F1.1 Modelagem" ou "**F1.1" ou header seguido de "F1.1"
  if (
    normalizedLine.match(/^#{0,4}\s*\*{0,2}f\d+\.\d+\s+/i) ||
    normalizedLine.match(/^#{0,4}\s*\*{0,2}f\d+\.\d+[:\s]/i)
  ) {
    return 'feature'
  }

  // ==========================================
  // FORMATO MARKDOWN CANÔNICO
  // ==========================================

  // Épicos: ## 🎯 ÉPICO, ## Épico, ### Épico N:
  if (
    normalizedLine.match(
      /^#{2,3}\s*(?:🎯\s*)?(?:épico|epico|epic)\s*\d*[:\s-]/i
    ) ||
    normalizedLine.match(/^#{2,3}\s*(?:épico|epico|epic)\s+\d+/i)
  ) {
    return 'epic'
  }

  // Features: ### 🚀 Feature, ### Feature N.M:, **Feature N.M:
  if (
    normalizedLine.match(/^#{2,4}\s*(?:🚀\s*)?feature\s*\d*\.?\d*[:\s-]/i) ||
    normalizedLine.match(/^\*{2}(?:🚀\s*)?feature\s*\d*\.?\d*[:\s-]/i)
  ) {
    return 'feature'
  }

  // User Stories: #### 📝 US, - **User Story, #### Como
  if (
    normalizedLine.match(
      /^#{2,5}\s*(?:📝\s*)?(?:us|user\s*story)\s*\d*\.?\d*\.?\d*[:\s-]/i
    ) ||
    normalizedLine.match(
      /^[-*]\s*\*{0,2}(?:📝\s*)?(?:us|user\s*story)\s*\d*\.?\d*\.?\d*[:\s-]/i
    ) ||
    normalizedLine.match(/^#{2,5}\s*(?:📝\s*)?como\s/i)
  ) {
    return 'userstory'
  }

  // ==========================================
  // FORMATO ALTERNATIVO (texto simples)
  // ==========================================

  // Épicos em texto: "Épico 1:" ou "Epic 1:"
  if (normalizedLine.match(/^(?:épico|epico|epic)\s*\d+[:\s-]/i)) {
    return 'epic'
  }

  // Features em texto: "Feature 1.1:" ou "Funcionalidade 1.1:"
  if (normalizedLine.match(/^(?:feature|funcionalidade)\s*\d+\.?\d*[:\s-]/i)) {
    return 'feature'
  }

  // User Stories em texto: "User Story 1.1.1:" ou "História 1.1.1:"
  if (
    normalizedLine.match(
      /^(?:user\s*story|história|historia)\s*\d+\.?\d*\.?\d*[:\s-]/i
    )
  ) {
    return 'userstory'
  }

  // Tasks (para compatibilidade futura)
  if (normalizedLine.match(/^#{2,5}\s*(?:⚡\s*)?task\s*\d*/i)) {
    return 'task'
  }

  return null
}

/**
 * Resultado da extração de título com descrição separada
 */
interface TitleExtraction {
  title: string
  userStoryDescription?: string // A parte "Como X, quero Y para Z"
}

/**
 * Extrai o título limpo de uma linha de work item
 * Para User Stories, separa o ID (US-XX.YY) da descrição (Como...)
 * Suporta múltiplos formatos de entrada
 */
function extractTitle(line: string, type: WorkItemType): TitleExtraction {
  let title = line
  let userStoryDescription: string | undefined

  // Remover markdown headers
  title = title.replace(/^#{1,6}\s*/, '')

  // Remover número de seção antes de EP/FE/US (formato: "3. EP-001" → "EP-001")
  title = title.replace(/^\d+\.?\s+(?=(?:ep|fe|us)[-–—]?\d)/i, '')

  // Remover emojis (regex abrangente para suporte Unicode)
  // Inclui emojis variados, símbolos e modificadores
  /* eslint-disable no-misleading-character-class */
  title = title.replace(
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu,
    ''
  )
  /* eslint-enable no-misleading-character-class */

  // Remover marcadores de lista e negrito
  title = title.replace(/^[-*]\s*\*{0,2}/, '')
  title = title.replace(/\*{2}$/, '')

  // ==========================================
  // SEPARAR TÍTULO DE DESCRIÇÃO PARA USER STORIES
  // ==========================================
  // Para User Stories: extrair apenas o ID (US-XX.YY) como título
  // e mover a parte "Como X, quero Y para Z" para a descrição

  if (type === 'userstory') {
    // Padrão: "US-01.01 Como gerente..." ou "US-101 Como usuário..."
    const usMatch = title.match(/^(US[-–—]?\d+(?:[.-]\d+)?)\s+(.+)$/i)
    if (usMatch && usMatch[1] && usMatch[2]) {
      title = usMatch[1].trim() // Apenas "US-01.01"
      userStoryDescription = usMatch[2].trim() // "Como gerente de vendas..."
    }
  }

  // ==========================================
  // FORMATO CANÔNICO (para outros tipos)
  // ==========================================
  // Remover prefixos de tipo com números (NÃO inclui 'us' pois já tratamos acima)
  title = title.replace(
    /^(?:épico|epico|epic|feature|funcionalidade|user\s*story|história|historia|task|pbi)\s*\d*\.?\d*\.?\d*[:\s-]*/i,
    ''
  )

  // Remover indicadores de prioridade entre parênteses no final: (P0), (P1), etc
  title = title.replace(/\s*\(p\d\)\s*$/i, '')

  // Remover indicadores (Must), (Should), (Could) no final
  title = title.replace(/\s*\((?:must|should|could)\)\s*$/i, '')

  // Limpar espaços extras
  title = title.trim()

  // Se o título ficou vazio, usar um fallback
  if (!title) {
    title = `${type.charAt(0).toUpperCase() + type.slice(1)} sem título`
  }

  return { title, userStoryDescription }
}

/**
 * Extrai critérios de aceitação de um bloco de conteúdo
 * Suporta formatos:
 * - "Critérios de Aceitação:" ou "**Critérios de aceite:**"
 * - "Critérios:" seguido de lista
 * - Itens com "Dado/Quando/Então" (BDD)
 */
function extractAcceptanceCriteria(contentLines: string[]): string[] {
  const criteria: string[] = []
  let inCriteriaSection = false

  for (const line of contentLines) {
    const normalizedLine = line.toLowerCase().trim()

    // Formato inline "- Aceite:" - extrair diretamente sem precisar de seção
    const aceiteMatch = line.match(/^[-*•]\s*(?:aceite|ac)\s*:\s*(.+)$/i)
    if (aceiteMatch && aceiteMatch[1]) {
      criteria.push(aceiteMatch[1].trim())
      continue
    }

    // Detectar início de seção de critérios (múltiplos formatos)
    if (
      normalizedLine.match(/^\*{0,2}critérios?\s*(?:de\s*aceit)?/i) ||
      normalizedLine.match(/^\*{0,2}acceptance\s*criteria/i) ||
      normalizedLine.match(/^critérios?\s*:/i)
    ) {
      inCriteriaSection = true
      continue
    }

    // Detectar fim de seção (novo header, novo item, ou seção diferente)
    if (
      inCriteriaSection &&
      (normalizedLine.match(/^#{1,6}\s/) ||
        normalizedLine.match(/^ep[-–—]?\d+\b/i) || // Novo épico PRD
        normalizedLine.match(/^fe[-–—]?\d+\b/i) || // Nova feature PRD
        normalizedLine.match(/^e\d+\./i) || // Novo épico CODE 60
        normalizedLine.match(/^f\d+\.\d+/i) || // Nova feature CODE 60
        normalizedLine.match(/^us[-–—]?\d+/i) || // Nova user story
        normalizedLine.match(/^\d+\)\s*us/i) || // Nova US numerada
        normalizedLine.match(/^\*{2}(?![\s-])/) ||
        normalizedLine.match(
          /^(?:prioridade|priority|story\s*points|features:|user\s*stories:)/i
        ))
    ) {
      break
    }

    // Extrair itens de lista como critérios
    if (inCriteriaSection) {
      // Formato com checkbox: - [ ] texto ou - [x] texto
      const checkboxMatch = line.match(/^[\s]*[-*•]\s*\[[\s xX]?\]\s*(.+)$/)
      if (checkboxMatch && checkboxMatch[1]) {
        criteria.push(checkboxMatch[1].trim())
        continue
      }

      // Formato lista simples: - texto ou * texto
      const listMatch = line.match(/^[\s]*[-*•]\s+(.+)$/)
      if (listMatch && listMatch[1]) {
        criteria.push(listMatch[1].trim())
        continue
      }

      // Formato BDD: Dado que..., Quando..., Então...
      const bddMatch = line.match(
        /^[\s]*(dado|quando|então|given|when|then)\s+/i
      )
      if (bddMatch) {
        criteria.push(line.trim())
      }
    }
  }

  return criteria
}

/**
 * Extrai prioridade do conteúdo
 * Suporta formatos:
 * - "Prioridade: Alta" ou "Priority: High"
 * - "P0" (Crítico), "P1" (Importante), "P2" (Desejável)
 * - Inline: "(P0)" no título
 */
function extractPriority(
  contentLines: string[]
): 'high' | 'medium' | 'low' | undefined {
  for (const line of contentLines) {
    const normalizedLine = line.toLowerCase()

    // Formato P0, P1, P2 (CODE 60)
    if (normalizedLine.match(/\bp0\b/i)) {
      return 'high' // P0 = Crítico/MVP
    }
    if (normalizedLine.match(/\bp1\b/i)) {
      return 'medium' // P1 = Importante
    }
    if (normalizedLine.match(/\bp2\b/i)) {
      return 'low' // P2 = Desejável
    }

    // Formato tradicional
    if (
      normalizedLine.includes('prioridade') ||
      normalizedLine.includes('priority')
    ) {
      if (
        normalizedLine.includes('alta') ||
        normalizedLine.includes('high') ||
        normalizedLine.includes('crítica') ||
        normalizedLine.includes('critical')
      ) {
        return 'high'
      }
      if (
        normalizedLine.includes('média') ||
        normalizedLine.includes('medium')
      ) {
        return 'medium'
      }
      if (normalizedLine.includes('baixa') || normalizedLine.includes('low')) {
        return 'low'
      }
    }
  }

  return undefined
}

/**
 * Extrai story points do conteúdo
 */
function extractStoryPoints(contentLines: string[]): number | undefined {
  for (const line of contentLines) {
    const match = line.match(/story\s*points?[:\s]*(\d+)/i)
    if (match && match[1]) {
      return parseInt(match[1], 10)
    }
  }

  return undefined
}

/**
 * Conta itens por tipo na hierarquia
 */
function countItemsByType(items: ParsedWorkItem[]): {
  epics: number
  features: number
  userStories: number
  tasks: number
} {
  let epics = 0
  let features = 0
  let userStories = 0
  let tasks = 0

  const countRecursively = (item: ParsedWorkItem) => {
    switch (item.type) {
      case 'epic':
        epics++
        break
      case 'feature':
        features++
        break
      case 'userstory':
        userStories++
        break
      case 'task':
        tasks++
        break
    }

    item.children.forEach(countRecursively)
  }

  items.forEach(countRecursively)

  return { epics, features, userStories, tasks }
}

/**
 * Atualiza contadores de children (featureCount, userStoryCount)
 */
function updateChildCounts(items: ParsedWorkItem[]): void {
  const updateRecursively = (item: ParsedWorkItem): void => {
    // Primeiro atualizar children
    item.children.forEach(updateRecursively)

    // Depois calcular contadores
    if (item.type === 'epic') {
      item.featureCount = item.children.filter(c => c.type === 'feature').length
      item.userStoryCount = item.children.reduce((acc, child) => {
        if (child.type === 'userstory') return acc + 1
        if (child.type === 'feature') {
          return acc + (child.userStoryCount || 0)
        }
        return acc
      }, 0)
    } else if (item.type === 'feature') {
      item.userStoryCount = item.children.filter(
        c => c.type === 'userstory'
      ).length
    }
  }

  items.forEach(updateRecursively)
}

/**
 * Extrai número do épico do título de uma user story
 * US-01.01, US-01.02 → 01
 * US-1.1, US-1.2 → 1
 */
function extractEpicNumberFromUserStory(title: string): string | null {
  // Tentar extrair padrão US-XX.YY ou US-XXX
  const match = title.match(/us[-–—]?(\d+)[.-]?\d*/i)
  if (match && match[1]) {
    return match[1]
  }
  return null
}

/**
 * Extrai número da feature do título de uma user story
 * US-01.01, US-01.02 → 01
 * US-1.1, US-1.2 → 1
 */
function extractFeatureNumberFromUserStory(title: string): string | null {
  // Tentar extrair padrão US-XX.YY onde YY é o número da feature
  const match = title.match(/us[-–—]?\d+[.-](\d+)/i)
  if (match && match[1]) {
    return match[1]
  }
  return null
}

/**
 * Extrai número do épico do título
 * EP-01, EP-1 → 01/1
 */
function extractEpicNumber(title: string): string | null {
  const match = title.match(/ep[-–—]?(\d+)/i)
  if (match && match[1]) {
    return match[1]
  }
  return null
}

/**
 * Extrai número da feature do título
 * FE-01.1, FE-1.2 → 1/2 (segundo número)
 */
function extractFeatureNumber(title: string): string | null {
  const match = title.match(/fe[-–—]?\d+[.-](\d+)/i)
  if (match && match[1]) {
    return match[1]
  }
  return null
}

/**
 * Pós-processamento: associa user stories órfãs às features corretas
 * baseado no padrão de numeração (US-01.01 → EP-01, primeira feature com FE-01.x)
 */
function reassociateOrphanUserStories(
  workItems: ParsedWorkItem[],
  warnings: string[]
): void {
  // Coletar todas as user stories órfãs (no nível top ou em épicos sem features)
  const orphanUserStories: ParsedWorkItem[] = []

  // Remover user stories do nível top
  for (let i = workItems.length - 1; i >= 0; i--) {
    const item = workItems[i]
    if (item && item.type === 'userstory') {
      orphanUserStories.push(item)
      workItems.splice(i, 1)
    }
  }

  // Verificar user stories diretamente em épicos (sem feature intermediária)
  for (const epic of workItems) {
    if (epic.type === 'epic') {
      for (let i = epic.children.length - 1; i >= 0; i--) {
        const child = epic.children[i]
        if (child && child.type === 'userstory') {
          orphanUserStories.push(child)
          epic.children.splice(i, 1)
        }
      }
    }
  }

  if (orphanUserStories.length === 0) return

  console.log(
    `🔄 [PARSER] Reassociando ${orphanUserStories.length} user stories órfãs...`
  )

  // Construir mapa de épicos por número
  const epicsByNumber = new Map<string, ParsedWorkItem>()
  for (const epic of workItems) {
    if (epic.type === 'epic') {
      const epicNum = extractEpicNumber(epic.title)
      if (epicNum) {
        epicsByNumber.set(epicNum.padStart(2, '0'), epic)
        epicsByNumber.set(epicNum, epic) // sem padding também
      }
    }
  }

  // Para cada user story órfã, tentar encontrar o épico e feature corretos
  for (const userStory of orphanUserStories) {
    const usEpicNum = extractEpicNumberFromUserStory(userStory.title)
    const usFeatureNum = extractFeatureNumberFromUserStory(userStory.title)

    if (!usEpicNum) {
      warnings.push(
        `User Story "${userStory.title}" não tem número de épico identificável`
      )
      continue
    }

    // Encontrar o épico correspondente
    const targetEpic =
      epicsByNumber.get(usEpicNum.padStart(2, '0')) ||
      epicsByNumber.get(usEpicNum)

    if (!targetEpic) {
      warnings.push(
        `User Story "${userStory.title}" referencia EP-${usEpicNum} que não foi encontrado`
      )
      continue
    }

    // Se temos número de feature, tentar encontrar feature específica
    let targetFeature: ParsedWorkItem | null = null

    if (usFeatureNum) {
      for (const child of targetEpic.children) {
        if (child.type === 'feature') {
          const featureNum = extractFeatureNumber(child.title)
          if (
            featureNum === usFeatureNum ||
            featureNum === usFeatureNum.padStart(2, '0')
          ) {
            targetFeature = child
            break
          }
        }
      }
    }

    // NÃO usar fallback para primeira feature - se não encontrou a feature
    // específica pelo número, vamos criar uma nova feature para o número correto

    // Associar a user story
    if (targetFeature) {
      userStory.parentId = targetFeature.id
      targetFeature.children.push(userStory)
      console.log(
        `✅ [PARSER] US "${userStory.title}" → Feature "${targetFeature.title}"`
      )
    } else if (targetEpic && usFeatureNum) {
      // Criar feature automaticamente baseado no número da user story
      const featureTitle = `FE-${usEpicNum.padStart(3, '0')}.${usFeatureNum} – Feature Auto-criada`

      // Verificar se já criamos esta feature (buscar por título)
      let autoFeature = targetEpic.children.find(
        c => c.type === 'feature' && c.title === featureTitle
      ) as ParsedWorkItem | undefined

      if (!autoFeature) {
        const featureId = generateId(
          'feature',
          parseInt(usFeatureNum, 10),
          targetEpic.id,
          featureTitle
        )

        autoFeature = {
          id: featureId,
          title: featureTitle,
          type: 'feature',
          status: 'not-started',
          integrationStatus: 'Não enviada',
          children: [],
          parentId: targetEpic.id,
          selected: false,
          expanded: false,
        }
        targetEpic.children.push(autoFeature)
        console.log(
          `🔧 [PARSER] Criada feature automática: "${autoFeature.title}"`
        )
      }

      userStory.parentId = autoFeature.id
      autoFeature.children.push(userStory)
      console.log(
        `✅ [PARSER] US "${userStory.title}" → Feature auto-criada "${autoFeature.title}"`
      )
    } else if (targetEpic) {
      // Fallback: criar feature genérica para o épico
      const genericFeatureId = generateId(
        'feature',
        1,
        targetEpic.id,
        `FE-${usEpicNum?.padStart(3, '0') || '000'}.1-generic`
      )

      let genericFeature = targetEpic.children.find(
        c => c.type === 'feature' && c.title.includes('Funcionalidades Gerais')
      ) as ParsedWorkItem | undefined

      if (!genericFeature) {
        genericFeature = {
          id: genericFeatureId,
          title: `FE-${usEpicNum?.padStart(3, '0') || '000'}.1 – Funcionalidades Gerais`,
          type: 'feature',
          status: 'not-started',
          integrationStatus: 'Não enviada',
          children: [],
          parentId: targetEpic.id,
          selected: false,
          expanded: false,
        }
        targetEpic.children.push(genericFeature)
        console.log(
          `🔧 [PARSER] Criada feature genérica: "${genericFeature.title}"`
        )
      }

      userStory.parentId = genericFeature.id
      genericFeature.children.push(userStory)
      console.log(
        `✅ [PARSER] US "${userStory.title}" → Feature genérica "${genericFeature.title}"`
      )
    }
  }
}

/**
 * Parser principal - Transforma markdown em hierarquia de work items
 */
export function parseBacklogMarkdown(content: string): ParseResult {
  const startTime = Date.now()
  const workItems: ParsedWorkItem[] = []
  const issues: string[] = []
  const warnings: string[] = []

  if (!content || content.trim().length === 0) {
    return {
      success: false,
      workItems: [],
      metadata: {
        totalItems: 0,
        epicsCount: 0,
        featuresCount: 0,
        userStoriesCount: 0,
        tasksCount: 0,
        confidence: 0,
        processingTime: Date.now() - startTime,
      },
      issues: ['Conteúdo vazio ou não fornecido'],
      warnings: [],
    }
  }

  const lines = content.split('\n')
  let epicIndex = 0
  let featureIndex = 0
  let userStoryIndex = 0

  let currentEpic: ParsedWorkItem | null = null
  let currentFeature: ParsedWorkItem | null = null
  let currentItem: ParsedWorkItem | null = null
  let contentBuffer: string[] = []

  // Função para finalizar item atual com conteúdo acumulado
  const finalizeCurrentItem = () => {
    if (currentItem && contentBuffer.length > 0) {
      currentItem.acceptanceCriteria = extractAcceptanceCriteria(contentBuffer)
      currentItem.priority = extractPriority(contentBuffer)
      currentItem.storyPoints = extractStoryPoints(contentBuffer)
      // Filtrar descrição para remover linhas de critérios de aceite, prioridade e story points
      const additionalDescription = contentBuffer
        .filter(
          l =>
            // Remover checkboxes de critérios
            !l.match(/^[-*•]\s*\[/) &&
            // Remover formato "- Aceite:" ou "- AC:"
            !l.match(/^[-*•]\s*(?:aceite|ac)\s*:/i) &&
            // Remover cabeçalhos de critérios
            !l.match(/^\*{0,2}critério/i) &&
            !l.match(/^\*{0,2}acceptance/i) &&
            // Remover prioridade
            !l.match(/^\*{0,2}prioridade/i) &&
            !l.match(/^\*{0,2}priority/i) &&
            // Remover story points (SP: ou Story Points:)
            !l.match(/^[-*•]?\s*(?:sp|story\s*points)\s*:/i)
        )
        .join('\n')
        .trim()

      // Combinar descrição existente (da user story "Como...") com conteúdo adicional
      if (currentItem.description && additionalDescription) {
        currentItem.description = `${currentItem.description}\n\n${additionalDescription}`
      } else if (additionalDescription) {
        currentItem.description = additionalDescription
      }
    }
    contentBuffer = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || ''
    const trimmedLine = line.trim()

    // Skip linhas vazias no início
    if (!trimmedLine && !currentItem) continue

    const detectedType = detectWorkItemType(trimmedLine)

    if (detectedType) {
      // Finalizar item anterior
      finalizeCurrentItem()

      const { title, userStoryDescription } = extractTitle(
        trimmedLine,
        detectedType
      )

      if (detectedType === 'epic') {
        epicIndex++
        featureIndex = 0
        userStoryIndex = 0

        const epic: ParsedWorkItem = {
          id: generateId('epic', epicIndex, undefined, title),
          title,
          type: 'epic',
          status: 'not-started',
          integrationStatus: 'Não enviada',
          children: [],
          selected: false,
          expanded: true,
        }

        workItems.push(epic)
        currentEpic = epic
        currentFeature = null
        currentItem = epic

        console.log(`🎯 [PARSER] Found Epic: ${title}`)
      } else if (detectedType === 'feature') {
        featureIndex++
        userStoryIndex = 0

        const feature: ParsedWorkItem = {
          id: generateId('feature', featureIndex, currentEpic?.id, title),
          title,
          type: 'feature',
          status: 'not-started',
          integrationStatus: 'Não enviada',
          children: [],
          parentId: currentEpic?.id,
          selected: false,
          expanded: false,
        }

        if (currentEpic) {
          currentEpic.children.push(feature)
        } else {
          // Feature órfã - criar épico virtual
          warnings.push(`Feature "${title}" não está associada a um épico`)
          workItems.push(feature)
        }

        currentFeature = feature
        currentItem = feature

        console.log(`🚀 [PARSER] Found Feature: ${title}`)
      } else if (detectedType === 'userstory') {
        userStoryIndex++

        const userStory: ParsedWorkItem = {
          id: generateId(
            'userstory',
            userStoryIndex,
            currentFeature?.id || currentEpic?.id,
            title
          ),
          title,
          type: 'userstory',
          status: 'not-started',
          integrationStatus: 'Não enviada',
          children: [],
          parentId: currentFeature?.id || currentEpic?.id,
          selected: false,
          expanded: false,
          // Adicionar a descrição da user story (parte "Como X, quero Y para Z")
          description: userStoryDescription,
        }

        if (currentFeature) {
          currentFeature.children.push(userStory)
        } else if (currentEpic) {
          // US diretamente no épico
          currentEpic.children.push(userStory)
          warnings.push(
            `User Story "${title}" está diretamente no épico sem feature`
          )
        } else {
          // US órfã
          warnings.push(
            `User Story "${title}" não está associada a épico ou feature`
          )
          workItems.push(userStory)
        }

        currentItem = userStory

        console.log(`📝 [PARSER] Found User Story: ${title}`)
      }
    } else if (currentItem && trimmedLine) {
      // Acumular conteúdo para o item atual
      contentBuffer.push(trimmedLine)
    }
  }

  // Finalizar último item
  finalizeCurrentItem()

  // Pós-processamento: reassociar user stories órfãs baseado na numeração
  reassociateOrphanUserStories(workItems, warnings)

  // Atualizar contadores
  updateChildCounts(workItems)

  // Calcular estatísticas
  const counts = countItemsByType(workItems)
  const totalItems =
    counts.epics + counts.features + counts.userStories + counts.tasks

  // Calcular confiança
  let confidence = 0
  if (totalItems > 0) {
    confidence = Math.min(1, totalItems / 10) // Base de 10 itens para 100%

    // Bonus por ter épicos
    if (counts.epics > 0) confidence = Math.min(1, confidence + 0.2)

    // Bonus por ter features
    if (counts.features > 0) confidence = Math.min(1, confidence + 0.1)

    // Bonus por ter user stories
    if (counts.userStories > 0) confidence = Math.min(1, confidence + 0.1)
  }

  // Validações
  if (counts.epics === 0) {
    warnings.push('Nenhum épico encontrado no backlog')
  }

  if (counts.userStories === 0) {
    warnings.push('Nenhuma user story encontrada no backlog')
  }

  const processingTime = Date.now() - startTime

  console.log('✅ [PARSER] Parse concluído:', {
    totalItems,
    epics: counts.epics,
    features: counts.features,
    userStories: counts.userStories,
    confidence: `${(confidence * 100).toFixed(0)}%`,
    time: `${processingTime}ms`,
  })

  return {
    success: totalItems > 0,
    workItems,
    metadata: {
      totalItems,
      epicsCount: counts.epics,
      featuresCount: counts.features,
      userStoriesCount: counts.userStories,
      tasksCount: counts.tasks,
      confidence,
      processingTime,
    },
    issues,
    warnings,
  }
}

/**
 * Flatten da hierarquia para lista linear
 */
export function flattenWorkItems(items: ParsedWorkItem[]): ParsedWorkItem[] {
  const result: ParsedWorkItem[] = []

  const flatten = (item: ParsedWorkItem) => {
    result.push(item)
    item.children.forEach(flatten)
  }

  items.forEach(flatten)
  return result
}

/**
 * Obter todos os IDs de children de um item
 */
export function getAllChildrenIds(item: ParsedWorkItem): string[] {
  const ids: string[] = []

  const collect = (workItem: ParsedWorkItem) => {
    workItem.children.forEach(child => {
      ids.push(child.id)
      collect(child)
    })
  }

  collect(item)
  return ids
}

// Exportar tipos
export type { WorkItemType as BacklogWorkItemType }
