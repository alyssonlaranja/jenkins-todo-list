'use client'

import React from 'react'
import { Check, CheckCircle, FileText, X, XCircle } from 'lucide-react'

import { useI18n } from '@/shared/hooks/use-i18n'

// ============================================================================
// Types
// ============================================================================

export interface DetectedArtifact {
  id: string
  title: string
  content: string
  type: string
  status: 'pending' | 'approved' | 'rejected'
}

interface ArtifactProposalProps {
  artifact: DetectedArtifact
  /** Resumo pré-computado do artefato (carregado do histórico) */
  summaryBullets?: string[]
  onAccept: (artifactId: string) => void
  onReject: (artifactId: string) => void
  onDelete?: (artifactId: string) => void
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extrai resumo inteligente do artefato baseado no conteúdo real.
 * Analisa seções, contagens e estrutura para gerar bullet points específicos.
 */

export function extractArtifactSummary(
  content: string | undefined,
  t?: any
): string[] {
  // Helper for translation with fallback
  const translate = (key: string, params?: Record<string, string | number>) => {
    if (t) {
      return t(`sda2.workspace.summary.${key}` as any, params)
    }
    return key // fallback to key if no t function
  }

  if (!content) {
    return [translate('processing'), translate('waitingContent')]
  }

  const lines: string[] = []

  // ---- Contagens universais ----
  const sections = content.match(/^#{1,3}\s+.+/gm) || []
  const bulletItems = content.match(/^[\s]*[-*]\s+.+/gm) || []
  const tables = content.match(/\|.+\|.+\|/g) || []

  // ---- Detectar tipo do documento pelo conteúdo ----
  const lower = content.toLowerCase()

  // ================================================================
  // BACKLOG
  // ================================================================
  const epicMatches = content.match(
    /(?:^|\n)(?:#{1,4}\s*)?(?:🎯\s*)?(?:ÉPICO|Épico|Epic)\s+\d+[:.]/gim
  )
  const featureMatches = content.match(
    /(?:^|\n)(?:#{1,5}\s*)?(?:📦\s*)?Feature\s+\d+(?:\.\d+)?[:.]/gim
  )
  const storyHeaderMatches = content.match(
    /(?:^|\n)(?:#{1,5}\s*)?(?:📝\s*)?(?:User Story|US)\s+\d+(?:\.\d+)*[:.]/gim
  )
  const storyListMatches = content.match(
    /(?:^|\n)\s*[-*]\s*\*\*(?:User Story|US)\s+\d+(?:\.\d+)*[:.]?\*\*/gim
  )
  const totalStories =
    (storyHeaderMatches?.length || 0) + (storyListMatches?.length || 0)

  if (epicMatches && epicMatches.length > 0) {
    lines.push(translate('epicsIdentified', { count: epicMatches.length }))
  }
  if (featureMatches && featureMatches.length > 0) {
    lines.push(translate('featuresMapped', { count: featureMatches.length }))
  }
  if (totalStories > 0) {
    lines.push(translate('storiesDetailed', { count: totalStories }))
  }

  const pointsMatch = content.match(
    /\*\*Estimativa Total:\*\*\s+(\d+)\s+pontos/i
  )
  if (pointsMatch?.[1]) {
    lines.push(
      translate('estimatePoints', { count: parseInt(pointsMatch[1], 10) })
    )
  }

  // Se já achou itens de backlog, retorna
  if (lines.length >= 2) return lines.slice(0, 4)

  // ================================================================
  // DISCOVERY / BRIEFING
  // ================================================================
  const isDiscovery =
    /briefing|discovery|contexto do projeto|visão geral.*objetivo/i.test(lower)

  if (isDiscovery) {
    // Stakeholders
    const stakeholders =
      content.match(
        /(?:stakeholder|persona|usuário[- ]?alvo|público[- ]?alvo)/gi
      ) || []
    const uniqueStakeholders = new Set(
      stakeholders.map(s => s.toLowerCase().trim())
    )
    if (uniqueStakeholders.size > 0) {
      lines.push(
        translate('stakeholdersMapped', { count: uniqueStakeholders.size })
      )
    }

    // Riscos
    const risks = content.match(/(?:^|\n)\s*[-*]\s*.*(?:risco|risk)/gim) || []
    const riskSections = content.match(
      /#{1,4}\s*.*(?:risco|risk|análise de risco)/gim
    )
    if (risks.length > 0) {
      lines.push(translate('risksIdentified', { count: risks.length }))
    } else if (riskSections) {
      lines.push(translate('riskSection'))
    }

    // Objetivos / OKRs
    const objectives = content.match(/(?:objetivo|okr|meta|goal|kpi)/gi) || []
    if (objectives.length > 0) {
      lines.push(translate('objectivesDefined'))
    }

    // Requisitos encontrados
    const reqCount = (content.match(/(?:requisito|requirement)/gi) || []).length
    if (reqCount > 0) {
      lines.push(translate('requirementsGathered'))
    }

    if (lines.length === 0) {
      lines.push(translate('analysisSections', { count: sections.length }))
      if (bulletItems.length > 0) {
        lines.push(translate('itemsDetailed', { count: bulletItems.length }))
      }
      lines.push(translate('businessContextMapped'))
    }

    return lines.slice(0, 4)
  }

  // ================================================================
  // PRD (Product Requirements Document)
  // ================================================================
  const isPRD =
    /\bprd\b|product requirements|requisitos de produto|requisitos funcionais.*requisitos não/i.test(
      lower
    )

  if (isPRD) {
    // Requisitos funcionais
    const frMatches = content.match(/(?:RF|FR)[\s-]?\d+/gi) || []
    if (frMatches.length > 0) {
      lines.push(
        translate('functionalRequirements', { count: frMatches.length })
      )
    }

    // Requisitos não-funcionais
    const nfrMatches = content.match(/(?:RNF|NFR)[\s-]?\d+/gi) || []
    if (nfrMatches.length > 0) {
      lines.push(
        translate('nonFunctionalRequirements', { count: nfrMatches.length })
      )
    }

    // Épicos dentro do PRD
    if (epicMatches && epicMatches.length > 0) {
      lines.push(translate('epicsDefined', { count: epicMatches.length }))
    }

    // Stories dentro do PRD
    if (totalStories > 0) {
      lines.push(translate('storiesSpecified', { count: totalStories }))
    }

    // Critérios de aceite
    const acMatches =
      content.match(/critério.*aceite|acceptance.*criteria/gi) || []
    if (acMatches.length > 0) {
      lines.push(translate('acceptanceCriteria'))
    }

    // Personas / público-alvo
    if (/persona|público[- ]?alvo|target.*user/i.test(lower)) {
      lines.push(translate('personasDefined'))
    }

    if (lines.length === 0) {
      lines.push(translate('requirementsSections', { count: sections.length }))
      lines.push(translate('productScopeDetailed'))
    }

    return lines.slice(0, 4)
  }

  // ================================================================
  // ARCHITECTURE
  // ================================================================
  const isArchitecture =
    /arquitetura|architecture|microserviço|stack tecnológica|diagrama c4/i.test(
      lower
    )

  if (isArchitecture) {
    // Componentes / serviços
    const services =
      content.match(/(?:serviço|service|microserviço|componente|módulo)/gi) ||
      []
    if (services.length > 0) {
      lines.push(translate('componentsReferenced', { count: services.length }))
    }

    // APIs / endpoints
    const apis =
      content.match(/(?:api|endpoint|rota|route|rest|graphql)/gi) || []
    if (apis.length > 0) {
      lines.push(translate('apisDocumented'))
    }

    // Tecnologias / stack
    const techStack =
      content.match(
        /(?:react|next\.?js|node|python|java|\.net|azure|aws|docker|kubernetes|postgres|mongo|redis|kafka|rabbitmq)/gi
      ) || []
    const uniqueTech = new Set(techStack.map(tc => tc.toLowerCase()))
    if (uniqueTech.size > 0) {
      lines.push(translate('techStack', { count: uniqueTech.size }))
    }

    // Segurança
    if (/segurança|security|autenticação|auth|oauth|jwt/i.test(lower)) {
      lines.push(translate('securitySpecified'))
    }

    // Diagramas
    if (/diagrama|diagram|mermaid|c4|plantuml/i.test(lower)) {
      lines.push(translate('diagramsIncluded'))
    }

    // ADRs
    const adrMatches = content.match(/ADR[\s-]?\d+/gi) || []
    if (adrMatches.length > 0) {
      lines.push(translate('adrsDocumented', { count: adrMatches.length }))
    }

    if (lines.length === 0) {
      lines.push(translate('architectureSections', { count: sections.length }))
      lines.push(translate('technicalVision'))
    }

    return lines.slice(0, 4)
  }

  // ================================================================
  // DESIGN / UX
  // ================================================================
  const isDesign =
    /especificação de design|design system|wireframe|fluxo.*usuário|user.*flow|ui.*component|ux/i.test(
      lower
    )

  if (isDesign) {
    // Telas / páginas
    const screens =
      content.match(/(?:tela|screen|página|page|view|modal)/gi) || []
    if (screens.length > 0) {
      lines.push(translate('screensReferenced', { count: screens.length }))
    }

    // Componentes
    const components =
      content.match(
        /(?:componente|component|botão|button|input|card|form)/gi
      ) || []
    if (components.length > 0) {
      lines.push(translate('uiComponentsSpecified'))
    }

    // Fluxos
    const flows =
      content.match(/(?:fluxo|flow|jornada|journey|navegação|navigation)/gi) ||
      []
    if (flows.length > 0) {
      lines.push(translate('flowsMapped', { count: flows.length }))
    }

    // Acessibilidade
    if (/acessibilidade|accessibility|wcag|a11y/i.test(lower)) {
      lines.push(translate('accessibilityIncluded'))
    }

    // Responsividade
    if (/responsiv|breakpoint|mobile|tablet|desktop/i.test(lower)) {
      lines.push(translate('responsiveDesign'))
    }

    if (lines.length === 0) {
      lines.push(translate('designSections', { count: sections.length }))
      lines.push(translate('visualSpecs'))
    }

    return lines.slice(0, 4)
  }

  // ================================================================
  // FALLBACK INTELIGENTE — analisa o conteúdo de forma genérica
  // ================================================================

  // Contar seções
  if (sections.length > 0) {
    lines.push(translate('sectionsDocumented', { count: sections.length }))
  }

  // Contar itens de lista
  if (bulletItems.length > 5) {
    lines.push(translate('itemsDetailed', { count: bulletItems.length }))
  }

  // Tabelas
  if (tables.length > 2) {
    const tableCount = content.match(/\n\|[-:]+\|/g)?.length || 1
    lines.push(translate('tablesWithData', { count: tableCount }))
  }

  // Blocos de código
  const codeBlocks = content.match(/```[\s\S]*?```/g) || []
  if (codeBlocks.length > 0) {
    lines.push(translate('codeBlocks', { count: codeBlocks.length }))
  }

  // Estimativa de palavras
  const wordCount = content.split(/\s+/).length
  if (wordCount > 100) {
    const readingTime = Math.ceil(wordCount / 200)
    lines.push(
      translate('wordCount', { count: wordCount, minutes: readingTime })
    )
  }

  // Se ainda vazio, pelo menos informar tamanho
  if (lines.length === 0) {
    lines.push(translate('documentSections', { count: sections.length }))
    lines.push(
      translate('charactersContent', { count: content.length.toLocaleString() })
    )
    lines.push(translate('contentReady'))
  }

  return lines.slice(0, 4)
}

/**
 * Detecta tipo do documento baseado no artifact.type ou conteúdo
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detectDocumentType(artifact: DetectedArtifact, t?: any): string {
  // Helper for translation with fallback
  const translate = (key: string) => {
    if (t) {
      return t(`sda2.workspace.documentTypes.${key}` as any)
    }
    return key // fallback to key if no t function
  }

  // PRIORIDADE 1: Se o artefato já tem um tipo definido, usar ele
  if (artifact.type && artifact.type.trim() !== '') {
    const typeToKey: Record<string, string> = {
      // Design/UX
      design: 'designSpecification',
      diagram: 'designSpecification',
      ux: 'designSpecification',
      wireframe: 'designSpecification',
      prototype: 'designSpecification',
      // PRD
      prd: 'prd',
      'prd-greenfield': 'prdGreenfield',
      'prd-brownfield': 'prdBrownfield',
      requirements: 'requirements',
      // Backlog
      backlog: 'productBacklog',
      'user-story': 'userStory',
      epic: 'epic',
      epics: 'epics',
      feature: 'feature',
      // Discovery/Brief
      briefing: 'discoveryDocument',
      brief: 'discoveryDocument',
      discovery: 'discoveryDocument',
      // Arquitetura
      architecture: 'architectureDocument',
      technical: 'technicalDocument',
      'frontend-spec': 'frontendSpec',
      // Outros
      okrs: 'okrs',
      prompts: 'researchPrompts',
      fragments: 'prdFragments',
      document: 'document',
    }

    const typeLower = artifact.type.toLowerCase().trim()
    if (typeToKey[typeLower]) {
      return translate(typeToKey[typeLower])
    }
  }

  // FALLBACK: Detectar pelo conteúdo
  const content = artifact.content
  if (!content) return artifact.title || translate('proposalDocument')

  const lowerContent = content.toLowerCase()

  // Detectar Briefing/Discovery
  if (
    lowerContent.includes('briefing do projeto') ||
    lowerContent.includes('brief do projeto') ||
    lowerContent.includes('documento de discovery')
  ) {
    return translate('discoveryDocument')
  }

  // Detectar PRD
  if (
    lowerContent.includes('prd') ||
    lowerContent.includes('documento de requisitos') ||
    lowerContent.includes('requisitos funcionais')
  ) {
    return translate('prd')
  }

  // Detectar Backlog
  if (/como.*usuário.*quero/i.test(content) || /épico\s+\d+/i.test(content)) {
    return translate('productBacklog')
  }

  // Detectar Arquitetura
  if (
    lowerContent.includes('arquitetura') ||
    lowerContent.includes('diagrama c4') ||
    lowerContent.includes('microserviço')
  ) {
    return translate('architectureDocument')
  }

  return artifact.title || translate('proposalDocument')
}

// ============================================================================
// Component
// ============================================================================

export function ArtifactProposal({
  artifact,
  summaryBullets,
  onAccept,
  onReject,
  onDelete,
}: ArtifactProposalProps): React.JSX.Element {
  const { t } = useI18n('pages')
  const documentType = detectDocumentType(artifact, t)
  const isApproved = artifact.status === 'approved'
  const isRejected = artifact.status === 'rejected'

  // Determinar cores baseado no status
  const getStatusColors = () => {
    if (isApproved) {
      return {
        border: 'border-green-200 dark:border-green-800',
        bg: 'bg-green-50 dark:bg-green-950/50',
        iconBg: 'bg-green-100 dark:bg-green-900/60',
        iconColor: 'text-green-600 dark:text-green-400',
        textPrimary: 'text-green-800 dark:text-green-200',
        textSecondary: 'text-green-700 dark:text-green-300',
        badgeBg: 'bg-green-200 dark:bg-green-900/60',
        badgeText: 'text-green-600 dark:text-green-300',
        Icon: CheckCircle,
      }
    }
    if (isRejected) {
      return {
        border: 'border-red-200 dark:border-red-800',
        bg: 'bg-red-50 dark:bg-red-950/50',
        iconBg: 'bg-red-100 dark:bg-red-900/60',
        iconColor: 'text-red-600 dark:text-red-400',
        textPrimary: 'text-red-800 dark:text-red-200',
        textSecondary: 'text-red-700 dark:text-red-300',
        badgeBg: 'bg-red-200 dark:bg-red-900/60',
        badgeText: 'text-red-600 dark:text-red-300',
        Icon: XCircle,
      }
    }
    // pending (default - laranja)
    return {
      border: 'border-orange-200 dark:border-orange-800',
      bg: 'bg-orange-50 dark:bg-orange-950/50',
      iconBg: 'bg-orange-100 dark:bg-orange-900/60',
      iconColor: 'text-orange-600 dark:text-orange-400',
      textPrimary: 'text-orange-800 dark:text-orange-200',
      textSecondary: 'text-orange-700 dark:text-orange-300',
      badgeBg: 'bg-orange-200 dark:bg-orange-900/60',
      badgeText: 'text-orange-600 dark:text-orange-300',
      Icon: FileText,
    }
  }

  const colors = getStatusColors()

  return (
    <div
      className={`relative mt-4 rounded-lg border p-4 ${colors.border} ${colors.bg}`}
    >
      {/* Botão X no canto superior direito - apenas se pending */}
      {!isApproved && !isRejected && onDelete && (
        <button
          onClick={() => onDelete(artifact.id)}
          className="absolute right-3 top-3 flex size-6 items-center justify-center rounded text-gray-500 transition-colors hover:bg-white hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <X size={14} />
        </button>
      )}

      <div className="flex items-start gap-3 pr-8">
        {/* Ícone do documento */}
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${colors.iconBg}`}
        >
          <colors.Icon size={20} className={colors.iconColor} />
        </div>

        {/* Conteúdo do artefato */}
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className={`text-sm font-semibold ${colors.textPrimary}`}>
              {documentType}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-xs ${colors.badgeBg} ${colors.badgeText}`}
            >
              {isApproved
                ? t('sda2.workspace.artifactProposal.approved' as any)
                : isRejected
                  ? t('sda2.workspace.artifactProposal.rejected' as any)
                  : t('sda2.workspace.artifactProposal.draft' as any)}
            </span>
          </div>

          <div className={`mb-2 text-xs ${colors.textSecondary}`}>
            {isApproved
              ? t('sda2.workspace.artifactProposal.approvedReady' as any)
              : isRejected
                ? t('sda2.workspace.artifactProposal.rejectedFeedback' as any)
                : t('sda2.workspace.artifactProposal.draftVersion' as any)}
          </div>

          {/* Resumo dinâmico do artefato */}
          <div className={`mb-3 text-xs leading-relaxed ${colors.textPrimary}`}>
            <div className="mb-1 font-medium">
              {t('sda2.workspace.artifactProposal.artifactSummary' as any)}
            </div>
            {(summaryBullets && summaryBullets.length > 0
              ? summaryBullets
              : extractArtifactSummary(artifact.content, t)
            ).map((line, idx) => (
              <div key={idx}>— {line}</div>
            ))}
          </div>

          {/* Botões de ação */}
          {isApproved ? (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle size={16} />
              <span className="font-medium">
                {t('sda2.workspace.artifactProposal.artifactApproved' as any)}
              </span>
            </div>
          ) : isRejected ? (
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
              <XCircle size={16} />
              <span className="font-medium">
                {t('sda2.workspace.artifactProposal.artifactRejected' as any)}
              </span>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => onAccept(artifact.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
              >
                <Check size={14} />
                {t('sda2.workspace.artifactProposal.accept' as any)}
              </button>
              <button
                onClick={() => onReject(artifact.id)}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <X size={14} />
                {t('sda2.workspace.artifactProposal.reject' as any)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ArtifactProposal
