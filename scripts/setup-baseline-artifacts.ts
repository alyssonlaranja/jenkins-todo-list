/* eslint-disable no-console */

const BASELINE_ARTIFACTS = [
  {
    key: 'COMPANY_OKRS_2025',
    value: [
      {
        id: 1,
        title: 'Aumentar NPS de onboarding em 20 pontos',
        metric: 'NPS',
        target: '+20',
      },
      {
        id: 2,
        title: 'Reduzir churn de clientes PF em 10%',
        metric: 'Churn %',
        target: '-10%',
      },
      {
        id: 3,
        title: 'Lançar 5 novos produtos digitais',
        metric: 'Produtos',
        target: '5',
      },
      {
        id: 4,
        title: 'Crescer base de clientes em 15%',
        metric: 'Clientes',
        target: '+15%',
      },
      {
        id: 5,
        title: 'Aumentar ticket médio em 12%',
        metric: 'R$ médio',
        target: '+12%',
      },
    ],
    description: 'OKRs estratégicos 2025 da empresa',
    type: 'JSON',
  },
  {
    key: 'COMMON_STAKEHOLDERS',
    value: [
      {
        name: 'Maria Silva',
        role: 'Head of Product',
        department: 'Produto',
        influence: 'high',
      },
      {
        name: 'João Santos',
        role: 'Tech Lead',
        department: 'Tecnologia',
        influence: 'high',
      },
      {
        name: 'Ana Costa',
        role: 'UX Manager',
        department: 'Design',
        influence: 'medium',
      },
      {
        name: 'Pedro Alves',
        role: 'Data Scientist',
        department: 'Analytics',
        influence: 'medium',
      },
      {
        name: 'Carlos Mendes',
        role: 'CFO',
        department: 'Financeiro',
        influence: 'high',
      },
    ],
    description: 'Stakeholders comuns em projetos de inovação',
    type: 'JSON',
  },
]

async function setupBaselineArtifacts() {
  console.log('Baseline Artifacts to Create:\n')

  for (const artifact of BASELINE_ARTIFACTS) {
    console.log(`Key: ${artifact.key}`)
    console.log(`Description: ${artifact.description}`)
    console.log(`Type: ${artifact.type}`)
    console.log(`Value:`)
    console.log(JSON.stringify(artifact.value, null, 2))
    console.log('\n---\n')
  }

  console.log('✓ Baseline artifact definitions ready')
  console.log(
    'To create these artifacts, use the MCP Suite server create_artifact tool'
  )
}

setupBaselineArtifacts()
