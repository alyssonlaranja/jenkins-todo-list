// ============================================================================
// Azure DevOps Process Detection Service
// ============================================================================
// Serviço para detecção de process template e mapeamento de work item types

import type {
  GenericWorkItemType,
  ProcessCompatibilityResult,
  ProcessDetectionOptions,
  ProcessMappingConfig,
  ProcessTemplate,
  ProjectProcessInfo,
  WorkItemTypeInfo,
  WorkItemTypeMapping,
} from '../types/azure-devops-process.types'

// ============================================================================
// Mapeamentos de Process Templates
// ============================================================================

/**
 * Mapeamentos padrão para cada process template
 */
export const PROCESS_MAPPINGS: Record<ProcessTemplate, ProcessMappingConfig> = {
  Agile: {
    processTemplate: 'Agile',
    mappings: [
      {
        generic: 'Initiative',
        azureDevOpsType: 'Epic',
        useTag: true,
        tag: 'INICIATIVA',
        description: 'Iniciativas são Epics com tag INICIATIVA',
      },
      {
        generic: 'Epic',
        azureDevOpsType: 'Epic',
        description: 'Epic padrão do Agile',
      },
      {
        generic: 'Feature',
        azureDevOpsType: 'Feature',
        description: 'Feature padrão do Agile',
      },
      {
        generic: 'UserStory',
        azureDevOpsType: 'User Story',
        description: 'User Story padrão do Agile',
      },
      {
        generic: 'Task',
        azureDevOpsType: 'Task',
        description: 'Task padrão do Agile',
      },
      {
        generic: 'Bug',
        azureDevOpsType: 'Bug',
        description: 'Bug padrão do Agile',
      },
    ],
    notes: [
      'Agile é o processo padrão do Azure DevOps',
      'Hierarquia: Epic → Feature → User Story → Task',
    ],
  },

  Scrum: {
    processTemplate: 'Scrum',
    mappings: [
      {
        generic: 'Initiative',
        azureDevOpsType: 'Epic',
        useTag: true,
        tag: 'INICIATIVA',
        description: 'Iniciativas são Epics com tag INICIATIVA',
      },
      {
        generic: 'Epic',
        azureDevOpsType: 'Epic',
        description: 'Epic padrão do Scrum',
      },
      {
        generic: 'Feature',
        azureDevOpsType: 'Feature',
        description:
          'Feature padrão do Scrum - hierarquia Epic → Feature → PBI',
      },
      {
        generic: 'UserStory',
        azureDevOpsType: 'Product Backlog Item',
        description: 'User Stories são Product Backlog Items no Scrum',
      },
      {
        generic: 'Task',
        azureDevOpsType: 'Task',
        description: 'Task padrão do Scrum',
      },
      {
        generic: 'Bug',
        azureDevOpsType: 'Bug',
        description: 'Bug padrão do Scrum',
      },
    ],
    notes: [
      'Scrum usa Feature como nível intermediário entre Epic e PBI',
      'Hierarquia: Epic → Feature → Product Backlog Item → Task',
    ],
  },

  CMMI: {
    processTemplate: 'CMMI',
    mappings: [
      {
        generic: 'Initiative',
        azureDevOpsType: 'Epic',
        useTag: true,
        tag: 'INICIATIVA',
        description: 'Iniciativas são Epics com tag INICIATIVA',
      },
      {
        generic: 'Epic',
        azureDevOpsType: 'Epic',
        description: 'Epic padrão do CMMI',
      },
      {
        generic: 'Feature',
        azureDevOpsType: 'Feature',
        description: 'Feature padrão do CMMI',
      },
      {
        generic: 'UserStory',
        azureDevOpsType: 'Requirement',
        description: 'User Stories são Requirements no CMMI',
      },
      {
        generic: 'Task',
        azureDevOpsType: 'Task',
        description: 'Task padrão do CMMI',
      },
      {
        generic: 'Bug',
        azureDevOpsType: 'Bug',
        description: 'Bug padrão do CMMI',
      },
    ],
    notes: [
      'CMMI usa Requirement ao invés de User Story',
      'Hierarquia: Epic → Feature → Requirement → Task',
    ],
  },

  Basic: {
    processTemplate: 'Basic',
    mappings: [
      {
        generic: 'Initiative',
        azureDevOpsType: 'Epic',
        useTag: true,
        tag: 'INICIATIVA',
        description: 'Iniciativas são Epics com tag INICIATIVA',
      },
      {
        generic: 'Epic',
        azureDevOpsType: 'Epic',
        description: 'Epic padrão do Basic',
      },
      {
        generic: 'Feature',
        azureDevOpsType: 'Issue',
        useTag: true,
        tag: 'FEATURE',
        description: 'Basic não tem Feature - usa Issue com tag FEATURE',
      },
      {
        generic: 'UserStory',
        azureDevOpsType: 'Task',
        useTag: true,
        tag: 'USER STORY',
        description:
          'User Stories são Tasks no Basic para manter hierarquia Epic→Issue→Task',
      },
      {
        generic: 'Task',
        azureDevOpsType: 'Task',
        description: 'Task padrão do Basic',
      },
      {
        generic: 'Bug',
        azureDevOpsType: 'Issue',
        useTag: true,
        tag: 'BUG',
        description: 'Basic não tem Bug - usa Issue com tag BUG',
      },
    ],
    notes: [
      'Basic é muito simplificado',
      'Usa Issue para quase tudo (Feature, User Story, Bug)',
      'Hierarquia: Epic → Issue → Task',
    ],
  },

  Custom: {
    processTemplate: 'Custom',
    mappings: [
      // Custom usa mapeamento dinâmico baseado nos types disponíveis
      {
        generic: 'Initiative',
        azureDevOpsType: 'Epic',
        useTag: true,
        tag: 'INICIATIVA',
        description: 'Tentativa de usar Epic com tag',
      },
      {
        generic: 'Epic',
        azureDevOpsType: 'Epic',
        description: 'Tentativa de usar Epic',
      },
      {
        generic: 'Feature',
        azureDevOpsType: 'Feature',
        description: 'Tentativa de usar Feature',
      },
      {
        generic: 'UserStory',
        azureDevOpsType: 'User Story',
        description: 'Tentativa de usar User Story',
      },
      {
        generic: 'Task',
        azureDevOpsType: 'Task',
        description: 'Tentativa de usar Task',
      },
      {
        generic: 'Bug',
        azureDevOpsType: 'Bug',
        description: 'Tentativa de usar Bug',
      },
    ],
    notes: [
      'Processo customizado - mapeamento baseado nos types disponíveis',
      'Recomenda-se verificar manualmente os types do projeto',
    ],
  },
}

/**
 * Nomes de processos que indicam herança
 */
const INHERITED_PROCESS_INDICATORS = [
  'inherited',
  'customizado',
  'custom',
  'modificado',
]

/**
 * Mapeamento de nomes de processos base
 */
const BASE_PROCESS_NAMES: Record<string, ProcessTemplate> = {
  agile: 'Agile',
  scrum: 'Scrum',
  cmmi: 'CMMI',
  basic: 'Basic',
  'microsoft visual studio scrum': 'Scrum',
  msfagile: 'Agile',
  'msf for agile software development': 'Agile',
  'msf for cmmi process improvement': 'CMMI',
}

// ============================================================================
// Mapeamento de Estados por Processo
// ============================================================================

/**
 * Estados disponíveis por processo template
 */
export const PROCESS_STATES: Record<
  ProcessTemplate,
  {
    initial: string
    active: string
    resolved: string
    closed: string
    all: string[]
  }
> = {
  Agile: {
    initial: 'New',
    active: 'Active',
    resolved: 'Resolved',
    closed: 'Closed',
    all: ['New', 'Active', 'Resolved', 'Closed'],
  },
  Scrum: {
    initial: 'New',
    active: 'Approved', // ou 'Committed' quando em sprint
    resolved: 'Committed',
    closed: 'Done',
    all: ['New', 'Approved', 'Committed', 'Done'],
  },
  CMMI: {
    initial: 'Proposed',
    active: 'Active',
    resolved: 'Resolved',
    closed: 'Closed',
    all: ['Proposed', 'Active', 'Resolved', 'Closed'],
  },
  Basic: {
    initial: 'To Do',
    active: 'Doing',
    resolved: 'Doing',
    closed: 'Done',
    all: ['To Do', 'Doing', 'Done'],
  },
  Custom: {
    initial: 'New', // Default, pode precisar de verificação
    active: 'Active',
    resolved: 'Resolved',
    closed: 'Closed',
    all: ['New', 'Active', 'Resolved', 'Closed'],
  },
}

/**
 * Mapear estado do Agile para outro processo
 * @param agileState Estado original (geralmente do Agile)
 * @param targetProcess Processo alvo
 * @param baseProcess Processo base (usado quando targetProcess é Custom)
 */
export function mapStateToProcess(
  agileState: string,
  targetProcess: ProcessTemplate,
  baseProcess?: ProcessTemplate
): string {
  console.log(
    `🔄 [mapStateToProcess] Mapeando estado: '${agileState}' para processo: '${targetProcess}' (base: ${baseProcess || 'N/A'})`
  )

  // Se não tiver processo ou for Agile, retornar estado original
  if (!targetProcess || targetProcess === 'Agile') {
    console.log(
      `🔄 [mapStateToProcess] Retornando estado original: '${agileState}'`
    )
    return agileState
  }

  // Para Custom, usar o processo base se disponível
  const effectiveProcess =
    targetProcess === 'Custom' && baseProcess ? baseProcess : targetProcess

  const targetStates = PROCESS_STATES[effectiveProcess]

  // Validação: se não encontrar estados para o processo, usar Agile como fallback
  if (!targetStates) {
    console.warn(
      `⚠️ [mapStateToProcess] Processo '${effectiveProcess}' não encontrado em PROCESS_STATES, usando estado original`
    )
    return agileState
  }

  const normalizedState = agileState.toLowerCase().trim()

  // Mapeamento por estado
  let mappedState: string
  switch (normalizedState) {
    case 'new':
      mappedState = targetStates.initial
      break
    case 'active':
      mappedState = targetStates.active
      break
    case 'resolved':
      mappedState = targetStates.resolved
      break
    case 'closed':
    case 'done':
      mappedState = targetStates.closed
      break
    default:
      // Tentar encontrar estado similar
      if (targetStates.all.some(s => s.toLowerCase() === normalizedState)) {
        mappedState = agileState
      } else {
        // Default para estado inicial
        mappedState = targetStates.initial
      }
  }

  console.log(
    `🔄 [mapStateToProcess] Estado mapeado: '${agileState}' → '${mappedState}' (Processo efetivo: ${effectiveProcess})`
  )
  return mappedState
}

/**
 * Mapear tipo de work item do Agile para outro processo
 */
export function mapWorkItemTypeToProcess(
  agileType: string,
  targetProcess: ProcessTemplate
): string {
  const mapping = PROCESS_MAPPINGS[targetProcess]
  if (!mapping) return agileType

  // Encontrar mapeamento pelo tipo Agile (genérico)
  const normalizedType = agileType.toLowerCase().trim()

  // Mapeamento direto de tipos Agile
  const typeMap: Record<string, GenericWorkItemType> = {
    'user story': 'UserStory',
    epic: 'Epic',
    feature: 'Feature',
    task: 'Task',
    bug: 'Bug',
  }

  const genericType = typeMap[normalizedType]
  if (genericType) {
    const targetMapping = mapping.mappings.find(m => m.generic === genericType)
    if (targetMapping) {
      return targetMapping.azureDevOpsType
    }
  }

  return agileType
}

// ============================================================================
// Azure DevOps Process Service
// ============================================================================

export class AzureDevOpsProcessService {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(organization: string, pat: string) {
    this.baseUrl = `https://dev.azure.com/${organization}`
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
    }
  }

  // ==========================================================================
  // API Methods
  // ==========================================================================

  /**
   * Obter informações do projeto (incluindo o GUID real)
   */
  async getProject(
    projectNameOrId: string
  ): Promise<{ id: string; name: string }> {
    const url = `${this.baseUrl}/_apis/projects/${encodeURIComponent(projectNameOrId)}?api-version=7.1`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.defaultHeaders,
    })

    if (!response.ok) {
      throw new Error(
        `Failed to get project: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
    }
  }

  /**
   * Obter propriedades do projeto (inclui process template)
   * NOTA: Requer o GUID do projeto, não o nome
   */
  async getProjectProperties(projectId: string): Promise<{
    processTemplateId?: string
    processTemplateName?: string
  }> {
    const url = `${this.baseUrl}/_apis/projects/${projectId}/properties?api-version=7.1-preview.1`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.defaultHeaders,
    })

    if (!response.ok) {
      throw new Error(
        `Failed to get project properties: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    const properties = data.value || []

    let processTemplateId: string | undefined
    let processTemplateName: string | undefined

    for (const prop of properties) {
      if (
        prop.name === 'System.ProcessTemplateType' ||
        prop.name === 'System.Process'
      ) {
        processTemplateId = prop.value
      }
      if (prop.name === 'System.ProcessTemplateName') {
        processTemplateName = prop.value
      }
    }

    return { processTemplateId, processTemplateName }
  }

  /**
   * Listar work item types do projeto
   */
  async getWorkItemTypes(projectId: string): Promise<WorkItemTypeInfo[]> {
    const url = `${this.baseUrl}/${projectId}/_apis/wit/workitemtypes?api-version=7.1`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.defaultHeaders,
    })

    if (!response.ok) {
      throw new Error(
        `Failed to get work item types: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    return (data.value || []).map(
      (wit: {
        name: string
        referenceName: string
        description?: string
        color?: string
        icon?: { id: string; url: string }
        isDisabled?: boolean
      }) => ({
        name: wit.name,
        referenceName: wit.referenceName,
        description: wit.description,
        color: wit.color,
        icon: wit.icon,
        isDisabled: wit.isDisabled,
      })
    )
  }

  /**
   * Obter informações do processo (se disponível)
   */
  async getProcessInfo(
    processId: string
  ): Promise<{ name: string; description?: string; parentProcessId?: string }> {
    const url = `${this.baseUrl}/_apis/work/processes/${processId}?api-version=7.1-preview.2`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.defaultHeaders,
      })

      if (!response.ok) {
        // Processo pode não ser acessível dependendo das permissões
        return { name: 'Unknown' }
      }

      const data = await response.json()
      return {
        name: data.name,
        description: data.description,
        parentProcessId: data.parentProcessTypeId,
      }
    } catch {
      return { name: 'Unknown' }
    }
  }

  // ==========================================================================
  // Process Detection
  // ==========================================================================

  /**
   * Detectar process template do projeto
   */
  async detectProjectProcess(
    projectNameOrId: string,
    projectName: string,
    options: ProcessDetectionOptions = {}
  ): Promise<ProjectProcessInfo> {
    // 0. Obter informações do projeto (incluindo GUID real)
    const projectInfo = await this.getProject(projectNameOrId)
    const projectGuid = projectInfo.id
    const resolvedProjectName = projectInfo.name || projectName

    // 1. Obter propriedades do projeto (usando GUID)
    const { processTemplateId, processTemplateName } =
      await this.getProjectProperties(projectGuid)

    // 2. Obter work item types (pode usar nome ou GUID)
    const workItemTypes = await this.getWorkItemTypes(projectNameOrId)

    // 3. Filtrar tipos desabilitados se necessário
    const filteredTypes = options.includeDisabled
      ? workItemTypes
      : workItemTypes.filter(t => !t.isDisabled)

    // 4. Detectar template base
    const detectedTemplate = this.detectBaseTemplate(
      processTemplateName,
      filteredTypes
    )

    // 5. Verificar se é processo customizado
    const isCustom = this.isCustomProcess(
      processTemplateName,
      detectedTemplate,
      filteredTypes
    )

    // 6. Obter informações adicionais do processo se disponível
    let processDescription: string | undefined
    let parentProcessName: string | undefined

    if (processTemplateId) {
      const processInfo = await this.getProcessInfo(processTemplateId)
      processDescription = processInfo.description

      if (processInfo.parentProcessId) {
        const parentInfo = await this.getProcessInfo(
          processInfo.parentProcessId
        )
        parentProcessName = parentInfo.name
      }
    }

    return {
      projectName: resolvedProjectName,
      projectId: projectGuid,
      processTemplate: isCustom ? 'Custom' : detectedTemplate,
      processId: processTemplateId,
      processDescription,
      workItemTypes: filteredTypes,
      isCustomProcess: isCustom,
      parentProcessName,
      // Importante: guardar o processo base para mapeamento de estados
      baseProcessTemplate: detectedTemplate,
    }
  }

  /**
   * Detectar template base a partir do nome e work item types
   */
  private detectBaseTemplate(
    processName: string | undefined,
    workItemTypes: WorkItemTypeInfo[]
  ): ProcessTemplate {
    // Tentar detectar pelo nome primeiro
    if (processName) {
      const normalizedName = processName.toLowerCase().trim()

      // Verificar mapeamento direto
      for (const [key, value] of Object.entries(BASE_PROCESS_NAMES)) {
        if (normalizedName.includes(key)) {
          return value
        }
      }
    }

    // Detectar pelos work item types disponíveis
    const typeNames = new Set(workItemTypes.map(t => t.name.toLowerCase()))

    // Scrum tem "Product Backlog Item" e não tem "User Story"
    if (typeNames.has('product backlog item') && !typeNames.has('user story')) {
      return 'Scrum'
    }

    // CMMI tem "Requirement" e não tem "User Story"
    if (typeNames.has('requirement') && !typeNames.has('user story')) {
      return 'CMMI'
    }

    // Basic tem "Issue" mas não tem "Feature" nem "User Story"
    if (
      typeNames.has('issue') &&
      !typeNames.has('feature') &&
      !typeNames.has('user story')
    ) {
      return 'Basic'
    }

    // Agile tem "User Story" e "Feature"
    if (typeNames.has('user story') && typeNames.has('feature')) {
      return 'Agile'
    }

    // Default para Agile se não conseguir detectar
    return 'Agile'
  }

  /**
   * Verificar se é um processo customizado
   */
  private isCustomProcess(
    processName: string | undefined,
    detectedTemplate: ProcessTemplate,
    workItemTypes: WorkItemTypeInfo[]
  ): boolean {
    if (!processName) return false

    const normalizedName = processName.toLowerCase()

    // Verificar indicadores de processo herdado
    for (const indicator of INHERITED_PROCESS_INDICATORS) {
      if (normalizedName.includes(indicator)) {
        return true
      }
    }

    // Verificar se o nome não corresponde exatamente a um processo base
    const isExactMatch = Object.keys(BASE_PROCESS_NAMES).some(
      key => normalizedName === key
    )

    if (!isExactMatch && !BASE_PROCESS_NAMES[normalizedName]) {
      return true
    }

    // Verificar se tem work item types customizados
    const standardTypes = this.getStandardTypesForTemplate(detectedTemplate)
    const hasCustomTypes = workItemTypes.some(
      t =>
        !standardTypes.includes(t.name) &&
        !t.name.startsWith('Microsoft.') &&
        !this.isSystemType(t.name)
    )

    return hasCustomTypes
  }

  /**
   * Obter tipos padrão para um template
   */
  private getStandardTypesForTemplate(template: ProcessTemplate): string[] {
    const commonTypes = [
      'Task',
      'Bug',
      'Epic',
      'Test Case',
      'Test Suite',
      'Test Plan',
    ]

    switch (template) {
      case 'Agile':
        return [...commonTypes, 'User Story', 'Feature', 'Issue']
      case 'Scrum':
        return [...commonTypes, 'Product Backlog Item', 'Impediment']
      case 'CMMI':
        return [
          ...commonTypes,
          'Requirement',
          'Feature',
          'Change Request',
          'Issue',
          'Review',
          'Risk',
        ]
      case 'Basic':
        return [...commonTypes, 'Issue']
      default:
        return commonTypes
    }
  }

  /**
   * Verificar se é um tipo de sistema
   */
  private isSystemType(typeName: string): boolean {
    const systemTypes = [
      'Test Case',
      'Test Suite',
      'Test Plan',
      'Shared Steps',
      'Shared Parameter',
      'Code Review Request',
      'Code Review Response',
      'Feedback Request',
      'Feedback Response',
    ]
    return systemTypes.includes(typeName)
  }

  // ==========================================================================
  // Compatibility Check
  // ==========================================================================

  /**
   * Verificar compatibilidade do processo com backlog
   */
  checkCompatibility(
    processInfo: ProjectProcessInfo,
    expectedProcess: ProcessTemplate = 'Agile'
  ): ProcessCompatibilityResult {
    const detectedProcess = processInfo.isCustomProcess
      ? 'Custom'
      : processInfo.processTemplate
    const mapping = this.getMappingForProcess(
      detectedProcess,
      processInfo.workItemTypes
    )

    const warnings: string[] = []
    const suggestions: string[] = []
    const missingTypes: string[] = []

    // Verificar tipos disponíveis
    const availableTypes = new Set(
      processInfo.workItemTypes.map(t => t.name.toLowerCase())
    )

    for (const m of mapping.mappings) {
      const normalizedType = m.azureDevOpsType.toLowerCase()
      if (!availableTypes.has(normalizedType)) {
        missingTypes.push(m.azureDevOpsType)
        warnings.push(
          `Work item type "${m.azureDevOpsType}" não encontrado no projeto`
        )
      }
    }

    // Verificar compatibilidade
    const isCompatible =
      detectedProcess === expectedProcess && missingTypes.length === 0
    let compatibilityLevel = 100

    if (detectedProcess !== expectedProcess) {
      compatibilityLevel -= 30
      warnings.push(
        `Processo detectado (${detectedProcess}) difere do esperado (${expectedProcess})`
      )

      if (detectedProcess === 'Scrum') {
        suggestions.push(
          'Scrum não possui o tipo Feature - será usado Product Backlog Item com tag FEATURE'
        )
        suggestions.push(
          'User Stories serão criadas como Product Backlog Items'
        )
      } else if (detectedProcess === 'CMMI') {
        suggestions.push('User Stories serão criadas como Requirements no CMMI')
      } else if (detectedProcess === 'Basic') {
        suggestions.push(
          'Basic é muito simplificado - Features e User Stories serão Issues com tags'
        )
      }
    }

    if (processInfo.isCustomProcess) {
      compatibilityLevel -= 10
      warnings.push(
        'Processo customizado detectado - verifique os tipos manualmente'
      )
      suggestions.push(
        `Processo parece ser baseado em ${processInfo.parentProcessName || processInfo.processTemplate}`
      )
    }

    compatibilityLevel -= missingTypes.length * 15
    compatibilityLevel = Math.max(0, compatibilityLevel)

    return {
      isCompatible,
      compatibilityLevel,
      detectedProcess,
      expectedProcess,
      mapping,
      warnings,
      missingTypes,
      suggestions,
    }
  }

  /**
   * Obter mapeamento para um processo
   */
  getMappingForProcess(
    process: ProcessTemplate,
    availableTypes: WorkItemTypeInfo[]
  ): ProcessMappingConfig {
    const baseMapping = PROCESS_MAPPINGS[process] || PROCESS_MAPPINGS['Custom']

    // Para processos custom, ajustar mapeamento baseado nos tipos disponíveis
    if (process === 'Custom') {
      return this.createDynamicMapping(baseMapping, availableTypes)
    }

    return baseMapping
  }

  /**
   * Criar mapeamento dinâmico para processo custom
   */
  private createDynamicMapping(
    baseMapping: ProcessMappingConfig,
    availableTypes: WorkItemTypeInfo[]
  ): ProcessMappingConfig {
    const typeNames = new Set(availableTypes.map(t => t.name.toLowerCase()))

    const adjustedMappings: WorkItemTypeMapping[] = baseMapping.mappings.map(
      m => {
        const normalizedType = m.azureDevOpsType.toLowerCase()

        if (typeNames.has(normalizedType)) {
          return m
        }

        // Tentar encontrar alternativa
        const alternative = this.findAlternativeType(m.generic, typeNames)
        if (alternative) {
          return {
            ...m,
            azureDevOpsType: alternative,
            description: `Alternativa para ${m.azureDevOpsType}: usando ${alternative}`,
          }
        }

        return m
      }
    )

    return {
      ...baseMapping,
      mappings: adjustedMappings,
      notes: [
        ...(baseMapping.notes || []),
        'Mapeamento ajustado dinamicamente para tipos disponíveis',
      ],
    }
  }

  /**
   * Encontrar tipo alternativo
   */
  private findAlternativeType(
    generic: GenericWorkItemType,
    availableTypes: Set<string>
  ): string | null {
    const alternatives: Record<GenericWorkItemType, string[]> = {
      Initiative: ['epic'],
      Epic: ['epic', 'initiative'],
      Feature: [
        'feature',
        'product backlog item',
        'requirement',
        'issue',
        'work item',
      ],
      UserStory: [
        'user story',
        'product backlog item',
        'requirement',
        'issue',
        'work item',
      ],
      Task: ['task', 'work item', 'issue'],
      Bug: ['bug', 'issue', 'defect'],
    }

    const options = alternatives[generic] || []
    for (const option of options) {
      if (availableTypes.has(option)) {
        // Retornar com capitalização correta
        return this.capitalizeTypeName(option)
      }
    }

    return null
  }

  /**
   * Capitalizar nome do tipo corretamente
   */
  private capitalizeTypeName(name: string): string {
    const specialCases: Record<string, string> = {
      'user story': 'User Story',
      'product backlog item': 'Product Backlog Item',
      epic: 'Epic',
      feature: 'Feature',
      task: 'Task',
      bug: 'Bug',
      issue: 'Issue',
      requirement: 'Requirement',
    }

    return (
      specialCases[name] ||
      name
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    )
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Obter tipo mapeado para um tipo genérico
   */
  getMappedType(
    genericType: GenericWorkItemType,
    processTemplate: ProcessTemplate
  ): WorkItemTypeMapping | null {
    const mapping = PROCESS_MAPPINGS[processTemplate]
    if (!mapping) return null

    return mapping.mappings.find(m => m.generic === genericType) || null
  }

  /**
   * Obter todos os processos suportados
   */
  getSupportedProcesses(): ProcessTemplate[] {
    return ['Agile', 'Scrum', 'CMMI', 'Basic', 'Custom']
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Criar instância do serviço
 */
export function createAzureDevOpsProcessService(
  organization: string,
  pat: string
): AzureDevOpsProcessService {
  return new AzureDevOpsProcessService(organization, pat)
}
