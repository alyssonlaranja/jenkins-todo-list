import type {
  AgentType,
  ArtifactType,
  Conversation,
  Project,
  ProjectTeamMember,
} from '../types'

// ============================================================================
// Mock Data - Projeto mock001 para testes
// ============================================================================

/** Equipe mock de 10 pessoas */
const mockTeam: ProjectTeamMember[] = [
  {
    id: 'user-001',
    name: 'Ana Costa',
    email: 'ana.costa@empresa.com',
    role: 'Owner',
  },
  {
    id: 'user-002',
    name: 'Bruno Santos',
    email: 'bruno.santos@empresa.com',
    role: 'Admin',
  },
  {
    id: 'user-003',
    name: 'Carla Oliveira',
    email: 'carla.oliveira@empresa.com',
    role: 'Curador',
  },
  {
    id: 'user-004',
    name: 'Daniel Souza',
    email: 'daniel.souza@empresa.com',
    role: 'User',
  },
  {
    id: 'user-005',
    name: 'Elena Ferreira',
    email: 'elena.ferreira@empresa.com',
    role: 'User',
  },
  {
    id: 'user-006',
    name: 'Fernando Lima',
    email: 'fernando.lima@empresa.com',
    role: 'User',
  },
  {
    id: 'user-007',
    name: 'Gabriela Alves',
    email: 'gabriela.alves@empresa.com',
    role: 'User',
  },
  {
    id: 'user-008',
    name: 'Hugo Pereira',
    email: 'hugo.pereira@empresa.com',
    role: 'User',
  },
  {
    id: 'user-009',
    name: 'Isabella Martins',
    email: 'isabella.martins@empresa.com',
    role: 'User',
  },
  {
    id: 'user-010',
    name: 'João Rodrigues',
    email: 'joao.rodrigues@empresa.com',
    role: 'User',
  },
]

/** Tipos de agentes disponíveis */
const agentTypes: { type: AgentType; name: string }[] = [
  { type: 'pm', name: 'João - PM' },
  { type: 'architect', name: 'Wilson - Arquiteto' },
  { type: 'po', name: 'Paula - PO' },
  { type: 'ux', name: 'Sofia - UX' },
  { type: 'analyst', name: 'Maria - Analista' },
  { type: 'supervisor', name: 'Supervisor' },
]

/** Tipos de artefatos disponíveis */
const artifactTypes: ArtifactType[] = [
  'prd-greenfield',
  'prd-brownfield',
  'architecture',
  'epics',
  'frontend-spec',
  'brief',
  'okrs',
  'prompts',
  'fragments',
]

/** Gera 3 conversas para cada tipo de agente */
function generateMockConversations(projectId: string): Conversation[] {
  const conversations: Conversation[] = []
  const now = new Date()

  agentTypes.forEach((agent, agentIndex) => {
    for (let i = 1; i <= 3; i++) {
      const createdAt = new Date(
        now.getTime() - (agentIndex * 3 + i) * 24 * 60 * 60 * 1000
      )
      conversations.push({
        id: `conv-${agent.type}-${i}`,
        projectId,
        title: `${agent.name} - Conversa ${i}`,
        slug: `mock001-${agent.type}-${i}`,
        agentName: agent.name,
        agentType: agent.type,
        messages: [
          {
            id: `msg-${agent.type}-${i}-1`,
            conversationId: `conv-${agent.type}-${i}`,
            role: 'user',
            content: `Olá ${agent.name}, preciso de ajuda com o projeto.`,
            timestamp: createdAt.toISOString(),
          },
          {
            id: `msg-${agent.type}-${i}-2`,
            conversationId: `conv-${agent.type}-${i}`,
            role: 'assistant',
            content: `Olá! Sou o ${agent.name} e estou aqui para ajudar. O que você precisa?`,
            timestamp: new Date(createdAt.getTime() + 60000).toISOString(),
            agentName: agent.name,
          },
        ],
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        createdBy: mockTeam[0]!.id,
        createdByName: mockTeam[0]!.name,
        acceptedArtifacts: [],
        rejectedArtifacts: [],
      })
    }
  })

  return conversations
}

/** Gera 3 artefatos para cada tipo */
function generateMockArtifacts(projectId: string) {
  const artifacts: Project['artifacts'] = []
  const now = new Date()

  artifactTypes.forEach((type, typeIndex) => {
    for (let i = 1; i <= 3; i++) {
      const createdAt = new Date(
        now.getTime() - (typeIndex * 3 + i) * 12 * 60 * 60 * 1000
      )
      const agentName = agentTypes[typeIndex % agentTypes.length]!.name

      artifacts.push({
        id: `artifact-${type}-${i}`,
        projectId,
        title: `${type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - Versão ${i}`,
        type,
        content: `# ${type.replace(/-/g, ' ').toUpperCase()} - Documento ${i}\n\nEste é um documento de exemplo para o tipo ${type}.\n\n## Seção 1\nConteúdo da seção 1...\n\n## Seção 2\nConteúdo da seção 2...\n\n## Conclusão\nConclusão do documento.`,
        agentName,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        version: i,
        status: i === 3 ? 'approved' : i === 2 ? 'draft' : 'archived',
        chatSlug: `mock001-${agentTypes[typeIndex % agentTypes.length]!.type}-${i}`,
        documentType: type,
        projectSlug: 'mock001',
        ownerId: mockTeam[0]!.id,
      })
    }
  })

  return artifacts
}

/** Projeto mock001 completo */
export const mockProject001: Project = {
  id: 'mock001',
  name: 'Projeto Mock001 - Testes',
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
  team: mockTeam,
  conversations: generateMockConversations('mock001'),
  artifacts: generateMockArtifacts('mock001'),
}

/** Equipe mock exportada para uso em outros componentes */
export const mockTeamMembers = mockTeam

/** Lista de projetos mock (pode ser expandida) */
export const mockProjects: Project[] = [mockProject001]
