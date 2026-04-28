/**
 * Testes para RAG Search Tool
 */

import { describe, expect, it, vi } from 'vitest'

import { createRAGSearchTool, isKnowledgeAgent } from '../rag-search-tool'

// Mock do indexing-service
vi.mock('@/lib/rag/indexing-service', () => ({
  searchKnowledgeBase: vi.fn().mockResolvedValue([
    {
      id: 'doc-1',
      content: 'Conteúdo sobre arquitetura de microserviços...',
      title: 'Documento de Arquitetura',
      artifactType: 'architecture',
      agentName: 'SDA 2 Tech Lead',
      feedbackType: 'positive',
      score: 0.95,
    },
    {
      id: 'doc-2',
      content: 'Requisitos de autenticação OAuth2...',
      title: 'PRD - Sistema de Login',
      artifactType: 'prd',
      agentName: 'SDA 2 Product Advisory',
      feedbackType: 'positive',
      score: 0.87,
    },
  ]),
  formatRAGResultsForPrompt: vi.fn()
    .mockReturnValue(`## 📚 Documentos da Base de Conhecimento

### Documento 1: Documento de Arquitetura
**Tipo:** architecture | **Agente:** SDA 2 Tech Lead | **Relevância:** 95.0%

Conteúdo sobre arquitetura de microserviços...

---

### Documento 2: PRD - Sistema de Login
**Tipo:** prd | **Agente:** SDA 2 Product Advisory | **Relevância:** 87.0%

Requisitos de autenticação OAuth2...
`),
}))

describe('RAG Search Tool', () => {
  const mockSearchConfig = {
    azure_search_endpoint: 'https://test-search.search.windows.net',
    index_name: 'test-index',
    azure_search_key: 'test-key-123',
  }

  describe('createRAGSearchTool', () => {
    it('deve criar uma tool com nome correto', () => {
      const tool = createRAGSearchTool({
        searchConfig: mockSearchConfig,
      })

      expect(tool.name).toBe('search_knowledge_base')
    })

    it('deve ter descrição adequada', () => {
      const tool = createRAGSearchTool({
        searchConfig: mockSearchConfig,
      })

      expect(tool.description).toContain('base de conhecimento')
      expect(tool.description).toContain('documentos relevantes')
    })

    it('deve ter schema com campos obrigatórios', () => {
      const tool = createRAGSearchTool({
        searchConfig: mockSearchConfig,
      })

      // O schema deve incluir query como campo obrigatório
      expect(tool.schema).toBeDefined()
    })

    it('deve executar busca e retornar resultados formatados', async () => {
      const tool = createRAGSearchTool({
        searchConfig: mockSearchConfig,
        defaultTopK: 5,
      })

      const result = await tool.invoke({
        query: 'arquitetura de microserviços',
      })

      expect(result).toContain('Documentos da Base de Conhecimento')
      expect(result).toContain('Documento de Arquitetura')
    })
  })

  describe('isKnowledgeAgent', () => {
    it('deve identificar agente Knowledge pelo nome', () => {
      expect(isKnowledgeAgent('SDA 2 Knowledge')).toBe(true)
      expect(isKnowledgeAgent('sda_2_knowledge')).toBe(true)
      expect(isKnowledgeAgent('Base de Conhecimento')).toBe(true)
    })

    it('deve rejeitar outros agentes', () => {
      expect(isKnowledgeAgent('SDA 2 Tech Lead')).toBe(false)
      expect(isKnowledgeAgent('SDA 2 Product Advisory')).toBe(false)
      expect(isKnowledgeAgent('SDA 2 Discovery Analyst')).toBe(false)
    })
  })
})

describe('Integração com Supervisor', () => {
  it('deve verificar que a config é extraída corretamente', async () => {
    // Simular team members do MCP
    const mockTeamMembers = [
      {
        name: 'SDA 2 Knowledge',
        role: 'Especialista em base de conhecimento',
        specialty: `Responsável por buscar informações relevantes.
        
azure_search_endpoint: "https://sda2-search.search.windows.net"
index_name: "sda2-knowledge"
azure_search_key: "abc123secret"`,
      },
      {
        name: 'SDA 2 Tech Lead',
        role: 'Arquiteto de soluções',
        specialty: 'Especialista em arquitetura de software',
      },
    ]

    // Importar extrator real
    const { extractKnowledgeAgentConfig } =
      await import('@/lib/rag/extract-knowledge-config')

    const config = extractKnowledgeAgentConfig(mockTeamMembers)

    expect(config).not.toBeNull()
    expect(config?.azure_search_endpoint).toBe(
      'https://sda2-search.search.windows.net'
    )
    expect(config?.index_name).toBe('sda2-knowledge')
    expect(config?.azure_search_key).toBe('abc123secret')
  })
})
