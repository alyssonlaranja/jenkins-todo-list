// ============================================================================
// Azure DevOps Process Detection Types
// ============================================================================
// Tipos para detecção automática de process template e mapeamento de work items

/**
 * Process templates suportados pelo Azure DevOps
 */
export type ProcessTemplate = 'Agile' | 'Scrum' | 'CMMI' | 'Basic' | 'Custom'

/**
 * Tipos de work item genéricos usados internamente
 */
export type GenericWorkItemType =
  | 'Initiative'
  | 'Epic'
  | 'Feature'
  | 'UserStory'
  | 'Task'
  | 'Bug'

/**
 * Informações de um work item type do Azure DevOps
 */
export interface WorkItemTypeInfo {
  /** Nome do work item type (ex: "User Story", "Product Backlog Item") */
  name: string
  /** Nome de referência completo (ex: "Microsoft.VSTS.WorkItemTypes.UserStory") */
  referenceName: string
  /** Descrição do tipo */
  description?: string
  /** Cor do tipo (hex) */
  color?: string
  /** Ícone do tipo */
  icon?: {
    id: string
    url: string
  }
  /** Se é um tipo desabilitado */
  isDisabled?: boolean
}

/**
 * Informações do processo do projeto
 */
export interface ProjectProcessInfo {
  /** Nome do projeto */
  projectName: string
  /** ID do projeto */
  projectId: string
  /** Nome do process template (Agile, Scrum, CMMI, Basic, Custom) */
  processTemplate: ProcessTemplate
  /** ID do processo */
  processId?: string
  /** Descrição do processo */
  processDescription?: string
  /** Lista de work item types disponíveis no projeto */
  workItemTypes: WorkItemTypeInfo[]
  /** Se é um processo customizado (herdado ou totalmente custom) */
  isCustomProcess: boolean
  /** Nome do processo pai (se for herdado) */
  parentProcessName?: string
  /** Processo base detectado (usado para mapeamento de estados quando é Custom) */
  baseProcessTemplate?: ProcessTemplate
}

/**
 * Mapeamento de work item types para um processo específico
 */
export interface WorkItemTypeMapping {
  /** Tipo genérico interno */
  generic: GenericWorkItemType
  /** Nome do work item type no Azure DevOps */
  azureDevOpsType: string
  /** Se deve usar tags para diferenciar (ex: Scrum PBI para Feature vs User Story) */
  useTag?: boolean
  /** Tag a ser aplicada quando useTag é true */
  tag?: string
  /** Descrição do mapeamento */
  description?: string
}

/**
 * Configuração completa de mapeamento para um processo
 */
export interface ProcessMappingConfig {
  /** Template do processo */
  processTemplate: ProcessTemplate
  /** Mapeamentos de tipos */
  mappings: WorkItemTypeMapping[]
  /** Notas especiais sobre o processo */
  notes?: string[]
}

/**
 * Resultado da verificação de compatibilidade
 */
export interface ProcessCompatibilityResult {
  /** Se o processo é compatível com o backlog gerado */
  isCompatible: boolean
  /** Nível de compatibilidade (0-100) */
  compatibilityLevel: number
  /** Process template detectado */
  detectedProcess: ProcessTemplate
  /** Process template esperado pelo backlog */
  expectedProcess: ProcessTemplate
  /** Mapeamento a ser usado */
  mapping: ProcessMappingConfig
  /** Avisos sobre o processo */
  warnings: string[]
  /** Work item types faltantes no projeto */
  missingTypes: string[]
  /** Sugestões de ação */
  suggestions: string[]
}

/**
 * Opções para detecção de processo
 */
export interface ProcessDetectionOptions {
  /** Forçar refresh do cache */
  forceRefresh?: boolean
  /** Incluir tipos desabilitados */
  includeDisabled?: boolean
  /** Timeout em ms para as requisições */
  timeout?: number
}

/**
 * Estado do hook useProjectProcess
 */
export interface UseProjectProcessState {
  /** Informações do processo */
  processInfo: ProjectProcessInfo | null
  /** Resultado da compatibilidade */
  compatibility: ProcessCompatibilityResult | null
  /** Se está carregando */
  isLoading: boolean
  /** Erro se houver */
  error: Error | null
  /** Se já foi carregado pelo menos uma vez */
  isLoaded: boolean
}

/**
 * Ações do hook useProjectProcess
 */
export interface UseProjectProcessActions {
  /** Detectar processo do projeto */
  detectProcess: (
    organization: string,
    projectId: string,
    options?: ProcessDetectionOptions
  ) => Promise<ProjectProcessInfo>
  /** Verificar compatibilidade com backlog */
  checkCompatibility: (
    expectedProcess?: ProcessTemplate
  ) => ProcessCompatibilityResult | null
  /** Obter mapeamento de work item type */
  getMappedType: (genericType: GenericWorkItemType) => string | null
  /** Limpar estado */
  reset: () => void
}

/**
 * Retorno completo do hook useProjectProcess
 */
export type UseProjectProcessReturn = UseProjectProcessState &
  UseProjectProcessActions

/**
 * Propriedades do componente ProcessCompatibilityWarning
 */
export interface ProcessCompatibilityWarningProps {
  /** Resultado da compatibilidade */
  compatibility: ProcessCompatibilityResult | null
  /** Se está carregando */
  isLoading?: boolean
  /** Callback quando usuário quer prosseguir mesmo com aviso */
  onProceed?: () => void
  /** Callback quando usuário quer cancelar */
  onCancel?: () => void
  /** Se deve mostrar detalhes expandidos */
  showDetails?: boolean
  /** Classe CSS adicional */
  className?: string
}

/**
 * Resposta da API de project info
 */
export interface ProjectInfoApiResponse {
  success: boolean
  data?: ProjectProcessInfo
  error?: string
  errorCode?: string
}

/**
 * Parâmetros da API de project info
 */
export interface ProjectInfoApiParams {
  organization: string
  projectId: string
  pat?: string
  forceRefresh?: boolean
}
