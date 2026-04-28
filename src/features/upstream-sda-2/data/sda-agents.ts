import {
  FileText,
  ListChecks,
  Palette,
  Search,
  Server,
  type LucideIcon,
} from 'lucide-react'

export interface SDAAgent {
  id: string
  name: string
  shortName: string
  icon: LucideIcon
  artifactType: string
  description: string
  color: string
}

export const sdaAgents: SDAAgent[] = [
  {
    id: 'discovery',
    name: 'Discovery Analyst Agent',
    shortName: 'Discovery',
    icon: Search,
    artifactType: 'Documento de Discovery',
    description:
      'Descoberta, briefing, análise inicial, OKRs, mapeamento de necessidades, riscos e oportunidades.',
    color: 'hsl(24, 100%, 50%)',
  },
  {
    id: 'product',
    name: 'Product Advisory Agent',
    shortName: 'PRD',
    icon: FileText,
    artifactType: 'PRD (Product Requirements Document)',
    description:
      'Requisitos de produto, especificação de funcionalidades, histórias de usuário.',
    color: 'hsl(200, 80%, 50%)',
  },
  {
    id: 'ux',
    name: 'UX Advisor Agent',
    shortName: 'UX Design',
    icon: Palette,
    artifactType: 'Especificação de Design',
    description:
      'UX/UI, fluxos de usuário, wireframes, componentes reutilizáveis e padrões de design.',
    color: 'hsl(280, 70%, 55%)',
  },
  {
    id: 'tech',
    name: 'Tech Advisory Agent',
    shortName: 'Arquitetura',
    icon: Server,
    artifactType: 'Documento de Arquitetura',
    description:
      'Arquitetura técnica, integrações, ADRs, stack, segurança, escalabilidade.',
    color: 'hsl(142, 71%, 45%)',
  },
  {
    id: 'backlog',
    name: 'Backlog Engineer Agent',
    shortName: 'Backlog',
    icon: ListChecks,
    artifactType: 'Backlog do Produto',
    description:
      'Épicos, features, user stories (SCRUM), estruturação de backlog e sprints.',
    color: 'hsl(340, 80%, 55%)',
  },
]

// LLM Models supported
export const llmModels = [{ name: 'GPT-5.1' }]

// Benefits list
export const sdaBenefits = [
  'Aceleração do processo de design de soluções',
  'Documentação técnica automatizada e consistente',
  'Análise de trade-offs arquiteturais',
  'Geração de diagramas e especificações',
]
