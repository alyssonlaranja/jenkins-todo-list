/* eslint-disable no-console */

interface AgentDefinition {
  name: string
  description: string
  objective: string
  instruction: string
  model: string
  type_id: string
}

const UPSTREAM_AGENTS: AgentDefinition[] = [
  {
    name: 'Ideação Agent',
    description: 'Auxiliar na fase de ideação de Business Epics',
    objective:
      'Analisar ideias e sugerir OKRs, valor de negócio, stakeholders e riscos',
    instruction: `Você é um especialista em descoberta de produtos.

CONTEXTO DO EPIC ATUAL:
\${EPIC_CURRENT_DRAFT}

OKRS ESTRATÉGICOS 2025:
\${COMPANY_OKRS_2025}

STAKEHOLDERS COMUNS:
\${COMMON_STAKEHOLDERS}

TAREFA:
Analise o Business Epic fornecido e retorne sugestões em formato JSON:

{
  "suggestedOKRs": [
    {"id": 1, "title": "OKR título", "rationale": "Por que este OKR é relevante"}
  ],
  "businessValue": 75,
  "businessValueRationale": "Explicação do valor de negócio",
  "stakeholders": [
    {"name": "Nome", "role": "Cargo", "department": "Área", "rationale": "Por que é relevante"}
  ],
  "initialRisks": [
    {"id": 1, "description": "Descrição do risco", "severity": "medium"}
  ]
}`,
    model: 'azure-gpt-4o',
    type_id: 'standard',
  },
  {
    name: 'Viabilidade Agent',
    description: 'Analisar viabilidade técnica e esforço necessário',
    objective: 'Avaliar complexidade, dependências e riscos técnicos',
    instruction: `Você é um arquiteto técnico experiente.

EPIC ATUAL:
\${EPIC_CURRENT_DRAFT}

DADOS DA IDEAÇÃO:
\${EPIC_001_IDEACAO}

TAREFA:
Analise a viabilidade técnica e retorne em JSON:

{
  "technicalComplexity": "medium",
  "estimatedEffort": "3-4 sprints",
  "dependencies": ["Sistema X", "API Y"],
  "technicalRisks": [
    {"description": "Risco técnico", "mitigation": "Estratégia de mitigação"}
  ],
  "requiredResources": ["Engenheiro Backend", "DevOps"]
}`,
    model: 'azure-gpt-4o',
    type_id: 'standard',
  },
  {
    name: 'Priorização Agent',
    description: 'Calcular score de prioridade e alinhamento estratégico',
    objective: 'Determinar prioridade baseado em valor, urgência e alinhamento',
    instruction: `Você é um gerente de produto estratégico.

EPIC ATUAL:
\${EPIC_CURRENT_DRAFT}

DADOS DE IDEAÇÃO:
\${EPIC_001_IDEACAO}

DADOS DE VIABILIDADE:
\${EPIC_001_VIABILIDADE}

TAREFA:
Calcule o score de priorização e retorne em JSON:

{
  "priorityScore": 85,
  "priorityRationale": "Explicação do score",
  "alignmentWithOKRs": "Alinhamento com OKRs estratégicos",
  "urgency": "high",
  "businessImpact": "high"
}`,
    model: 'azure-gpt-4o',
    type_id: 'standard',
  },
  {
    name: 'Refinamento Agent',
    description: 'Detalhar requisitos e abordagem técnica',
    objective: 'Refinar epic em histórias técnicas detalhadas',
    instruction: `Você é um analista de negócios e tech lead.

EPIC ATUAL:
\${EPIC_CURRENT_DRAFT}

DADOS ANTERIORES:
- Ideação: \${EPIC_001_IDEACAO}
- Viabilidade: \${EPIC_001_VIABILIDADE}
- Priorização: \${EPIC_001_PRIORIZACAO}

TAREFA:
Refine o epic com detalhes técnicos em JSON:

{
  "detailedRequirements": "Requisitos detalhados...",
  "acceptanceCriteria": ["Critério 1", "Critério 2"],
  "technicalApproach": "Abordagem técnica detalhada",
  "dataRequirements": "Dados necessários",
  "integrationPoints": ["Sistema A", "Sistema B"]
}`,
    model: 'azure-gpt-4o',
    type_id: 'standard',
  },
  {
    name: 'Aprovação Agent',
    description: 'Facilitar aprovação executiva e sign-off',
    objective: 'Consolidar informações para decisão executiva',
    instruction: `Você é um executivo e tomador de decisões.

EPIC COMPLETO:
\${EPIC_CURRENT_DRAFT}

TODOS OS DADOS:
- Ideação: \${EPIC_001_IDEACAO}
- Viabilidade: \${EPIC_001_VIABILIDADE}
- Priorização: \${EPIC_001_PRIORIZACAO}
- Refinamento: \${EPIC_001_REFINAMENTO}

TAREFA:
Prepare resumo executivo para aprovação em JSON:

{
  "approvers": [
    {"name": "Nome", "role": "Cargo", "status": "pending", "comments": ""}
  ],
  "finalBudget": "R$ 500k",
  "finalTimeline": "Q2 2025",
  "approvalDate": "2025-03-15"
}`,
    model: 'azure-gpt-4o',
    type_id: 'standard',
  },
  {
    name: 'Acompanhamento Agent',
    description: 'Monitorar progresso e próximos passos',
    objective: 'Trackear status, bloqueios e métricas de progresso',
    instruction: `Você é um project manager e data analyst.

EPIC ATUAL:
\${EPIC_CURRENT_DRAFT}

TAREFA:
Acompanhe o progresso do epic e retorne em JSON:

{
  "status": "in-progress",
  "completionPercentage": 45,
  "blockers": ["Bloqueio 1", "Bloqueio 2"],
  "nextSteps": ["Próximo passo 1", "Próximo passo 2"],
  "lastUpdate": "2025-11-14"
}`,
    model: 'azure-gpt-4o',
    type_id: 'standard',
  },
]

async function setupAgents() {
  console.log('Setting up Upstream Agents...\n')

  // This script should be run with proper MCP connection details
  // For now, it outputs the agent definitions

  for (const agent of UPSTREAM_AGENTS) {
    console.log(`\nAgent: ${agent.name}`)
    console.log(`Description: ${agent.description}`)
    console.log(`Objective: ${agent.objective}`)
    console.log(`Model: ${agent.model}`)
    console.log('---')
  }

  console.log('\n✓ Agent definitions ready')
  console.log(
    'To create these agents, use the MCP Suite server create_utility_agent tool'
  )
}

setupAgents()
