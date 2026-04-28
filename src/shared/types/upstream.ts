// Epic Model
export interface BusinessEpic {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
  currentStep: UpstreamStep
  artifactPrefix: string // e.g., "EPIC_001"
}

export type UpstreamStep =
  | 'ideacao'
  | 'viabilidade'
  | 'priorizacao'
  | 'refinamento'
  | 'aprovacao'
  | 'acompanhamento'

// Step 1: Ideação
export interface IdeacaoData {
  problem: string
  hypothesis: string
  expectedOutcome: string
  suggestedOKRs?: Array<{
    id: number
    title: string
    rationale: string
  }>
  businessValue?: number
  businessValueRationale?: string
  stakeholders?: Array<{
    name: string
    role: string
    department: string
    rationale: string
  }>
  initialRisks?: Array<{
    id: number
    description: string
    severity: 'low' | 'medium' | 'high'
  }>
}

// Step 2: Viabilidade
export interface ViabilidadeData {
  technicalComplexity: 'low' | 'medium' | 'high'
  estimatedEffort: string // e.g., "2-3 sprints"
  dependencies: string[]
  technicalRisks: Array<{
    description: string
    mitigation: string
  }>
  requiredResources: string[]
}

// Step 3: Priorização
export interface PriorizacaoData {
  priorityScore: number // 0-100
  priorityRationale: string
  alignmentWithOKRs: string
  urgency: 'low' | 'medium' | 'high'
  businessImpact: 'low' | 'medium' | 'high'
}

// Step 4: Refinamento
export interface RefinamentoData {
  detailedRequirements: string
  acceptanceCriteria: string[]
  technicalApproach: string
  dataRequirements: string
  integrationPoints: string[]
}

// Step 5: Aprovação
export interface AprovacaoData {
  approvers: Array<{
    name: string
    role: string
    status: 'pending' | 'approved' | 'rejected'
    comments?: string
  }>
  finalBudget?: string
  finalTimeline?: string
  approvalDate?: string
}

// Step 6: Acompanhamento
export interface AcompanhamentoData {
  status: 'planning' | 'in-progress' | 'blocked' | 'completed'
  completionPercentage: number
  blockers?: string[]
  nextSteps?: string[]
  lastUpdate: string
}

// Wizard State
export interface WizardState {
  epic: BusinessEpic
  ideacao: IdeacaoData | null
  viabilidade: ViabilidadeData | null
  priorizacao: PriorizacaoData | null
  refinamento: RefinamentoData | null
  aprovacao: AprovacaoData | null
  acompanhamento: AcompanhamentoData | null
}

// Artifact Keys
export function getArtifactKey(epicPrefix: string, step: UpstreamStep): string {
  const stepMap: Record<UpstreamStep, string> = {
    ideacao: 'IDEACAO',
    viabilidade: 'VIABILIDADE',
    priorizacao: 'PRIORIZACAO',
    refinamento: 'REFINAMENTO',
    aprovacao: 'APROVACAO',
    acompanhamento: 'ACOMPANHAMENTO',
  }
  return `${epicPrefix}_${stepMap[step]}`
}
