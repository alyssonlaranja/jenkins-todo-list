/**
 * Script de teste para verificar a integração do RAG no supervisor SDA2
 *
 * Executar com: npx tsx src/agents/sda2/tools/__tests__/test-rag-integration.ts
 */

import { extractKnowledgeAgentConfig } from '@/lib/rag/extract-knowledge-config'

// Simular dados que viriam do MCP (Cockpit)
const mockAgentCard = {
  name: 'Avanade Code Supervisor SDA2',
  description: 'Supervisor do time SDA2',
  instructions: 'Você é o supervisor do time SDA2...',
  teamMembers: [
    {
      name: 'SDA 2 Knowledge',
      role: 'Especialista em Base de Conhecimento',
      specialty: `Responsável por buscar e fornecer informações relevantes da base de conhecimento do projeto.

## Configuração Azure AI Search
azure_search_endpoint: "https://sda2-cockpit.search.windows.net"
index_name: "sda2-knowledge-index"
azure_search_key: "your-api-key-here"

## Instruções
- Busque documentos relevantes quando o usuário perguntar sobre conhecimento existente
- Use a tool search_knowledge_base para fazer buscas
- Forneça contexto dos documentos encontrados`,
    },
    {
      name: 'SDA 2 Discovery Analyst',
      role: 'Analista de Descoberta',
      specialty: 'Responsável por análises iniciais e briefings',
    },
    {
      name: 'SDA 2 Tech Lead',
      role: 'Líder Técnico',
      specialty: 'Responsável por decisões de arquitetura',
    },
  ],
}

async function testRAGIntegration() {
  console.log('═'.repeat(60))
  console.log('🧪 TESTE DE INTEGRAÇÃO RAG - UPSTREAM SDA2')
  console.log('═'.repeat(60))

  // 1. Testar extração de config
  console.log('\n📋 1. Extraindo configuração do Knowledge Agent...\n')

  const ragConfig = extractKnowledgeAgentConfig(mockAgentCard.teamMembers)

  if (ragConfig) {
    console.log('✅ Config extraída com sucesso:')
    console.log(
      `   - Endpoint: ${ragConfig.azure_search_endpoint.substring(0, 40)}...`
    )
    console.log(`   - Index: ${ragConfig.index_name}`)
    console.log(`   - Key: ${'*'.repeat(10)} (mascarada)`)
  } else {
    console.log('❌ Falha ao extrair config!')
    process.exit(1)
  }

  // 2. Testar criação da tool
  console.log('\n📋 2. Criando RAG Search Tool...\n')

  const { createRAGSearchTool } = await import('../rag-search-tool')
  const ragTool = createRAGSearchTool({
    searchConfig: ragConfig,
    defaultTopK: 5,
    defaultFeedbackFilter: 'positive',
  })

  console.log('✅ Tool criada:')
  console.log(`   - Nome: ${ragTool.name}`)
  console.log(`   - Descrição: ${ragTool.description.substring(0, 80)}...`)

  // 3. Simular identificação do Knowledge agent
  console.log('\n📋 3. Verificando identificação de agentes...\n')

  const { isKnowledgeAgent } = await import('../rag-search-tool')

  for (const member of mockAgentCard.teamMembers) {
    const isKnowledge = isKnowledgeAgent(member.name)
    const icon = isKnowledge ? '🔍' : '👤'
    const willReceiveTool = isKnowledge ? '(receberá RAG tool)' : ''
    console.log(`   ${icon} ${member.name} ${willReceiveTool}`)
  }

  // 4. Resumo
  console.log('\n' + '═'.repeat(60))
  console.log('✅ INTEGRAÇÃO PRONTA!')
  console.log('═'.repeat(60))
  console.log(`
📝 O que foi implementado:

1. searchKnowledgeBase() - Busca híbrida no Azure AI Search
2. createRAGSearchTool() - Tool para o LangGraph
3. Integração no create-sda2-supervisor.ts

📝 Fluxo de funcionamento:

  Usuário pergunta sobre conhecimento
          ↓
  Supervisor delega para Knowledge Agent
          ↓
  Knowledge Agent usa search_knowledge_base(query)
          ↓
  Busca no Azure AI Search (config do Cockpit)
          ↓
  Resultados retornados para o Knowledge Agent
          ↓
  Resposta contextualizada para o usuário

📝 Para testar em produção:

1. Certifique-se que o agente SDA 2 Knowledge no Cockpit tem:
   - azure_search_endpoint: "https://..."
   - index_name: "..."
   - azure_search_key: "..."
   
2. Inicie o chat e faça uma pergunta como:
   "O que já sabemos sobre arquitetura do projeto?"

3. O supervisor deve delegar ao Knowledge Agent que usará a tool.
`)
}

testRAGIntegration().catch(console.error)
