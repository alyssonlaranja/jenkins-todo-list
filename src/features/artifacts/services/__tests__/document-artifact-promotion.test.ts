/**
 * Testes unitários para DocumentArtifactService
 * Testa lógica de promoção de versões e gerenciamento de documentos
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dos tipos
enum ArtifactApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

interface DocumentArtifactData {
  id: string
  documentType:
    | 'briefing'
    | 'prd'
    | 'backlog'
    | 'design'
    | 'architecture'
    | 'feasibility'
    | 'requirements'
  documentName: string
  content: string
  version: string
  hasOfficialVersion: boolean
  status: ArtifactApprovalStatus
  createdAt: string
  createdBy: string
  createdByName: string
  updatedAt: string
  approvedAt?: string
  approvedBy?: string
  approvedByName?: string
}

interface DocumentVersionInfo {
  id: string
  artifactId: string
  version: string
  hasOfficialVersion: boolean
  status: ArtifactApprovalStatus
  content: string
  documentName: string
  createdAt: string
  createdBy: string
  createdByName: string
  isProduction: boolean
}

// Funções utilitárias extraídas do serviço
function bumpMinorVersion(version: string): string {
  const cleanVersion = version.replace(/^v/, '')
  const parts = cleanVersion.split('.')

  if (parts.length >= 2) {
    const major = parseInt(parts[0], 10) || 1
    const minor = parseInt(parts[1], 10) || 0
    return `${major}.${minor + 1}.0`
  }

  return '1.1.0'
}

function createOfficialVersionData(
  targetVersion: DocumentVersionInfo,
  userId: string,
  userName: string
): DocumentArtifactData {
  const now = new Date().toISOString()
  const newVersion = bumpMinorVersion(targetVersion.version)

  return {
    id: targetVersion.artifactId,
    documentType: 'briefing', // Para teste
    documentName: targetVersion.documentName,
    content: targetVersion.content, // CRÍTICO: usar conteúdo da versão selecionada
    version: newVersion,
    hasOfficialVersion: true,
    status: ArtifactApprovalStatus.APPROVED,
    createdAt: targetVersion.createdAt,
    createdBy: targetVersion.createdBy,
    createdByName: targetVersion.createdByName,
    updatedAt: now,
    approvedAt: now,
    approvedBy: userId,
    approvedByName: userName,
  }
}

describe('DocumentArtifactService - Promoção de Versão Específica', () => {
  describe('createOfficialVersionData', () => {
    it('deve criar dados de versão oficial com conteúdo da versão selecionada', () => {
      const targetVersion: DocumentVersionInfo = {
        id: 'version-1',
        artifactId: 'artifact-123',
        version: '1.0.0',
        hasOfficialVersion: false,
        status: ArtifactApprovalStatus.PENDING,
        content: '# Briefing Original\n\nConteúdo da versão 1',
        documentName: 'Briefing de Projeto',
        createdAt: '2024-12-28T10:00:00Z',
        createdBy: 'user-1',
        createdByName: 'João',
        isProduction: false,
      }

      const result = createOfficialVersionData(
        targetVersion,
        'admin-1',
        'Admin'
      )

      expect(result.content).toBe('# Briefing Original\n\nConteúdo da versão 1')
      expect(result.version).toBe('1.1.0')
      expect(result.hasOfficialVersion).toBe(true)
      expect(result.status).toBe(ArtifactApprovalStatus.APPROVED)
      expect(result.approvedBy).toBe('admin-1')
      expect(result.approvedByName).toBe('Admin')
    })

    it('deve preservar metadados originais ao promover', () => {
      const targetVersion: DocumentVersionInfo = {
        id: 'version-1',
        artifactId: 'artifact-123',
        version: '1.0.5',
        hasOfficialVersion: false,
        status: ArtifactApprovalStatus.PENDING,
        content: 'Conteúdo específico',
        documentName: 'Meu Documento',
        createdAt: '2024-01-15T08:30:00Z',
        createdBy: 'autor-original',
        createdByName: 'Maria Autora',
        isProduction: false,
      }

      const result = createOfficialVersionData(
        targetVersion,
        'reviewer',
        'Revisor'
      )

      // Metadados originais preservados
      expect(result.createdAt).toBe('2024-01-15T08:30:00Z')
      expect(result.createdBy).toBe('autor-original')
      expect(result.createdByName).toBe('Maria Autora')
      expect(result.documentName).toBe('Meu Documento')

      // Novos metadados de aprovação
      expect(result.approvedBy).toBe('reviewer')
      expect(result.approvedByName).toBe('Revisor')
      expect(result.version).toBe('1.1.0') // Bump minor de 1.0.5
    })

    it('deve usar conteúdo de versão antiga quando selecionada', () => {
      // Simula cenário onde usuário seleciona versão antiga para promover
      const versaoAntiga: DocumentVersionInfo = {
        id: 'version-1',
        artifactId: 'artifact-123',
        version: '1.0.0',
        hasOfficialVersion: false,
        status: ArtifactApprovalStatus.PENDING,
        content: 'CONTEÚDO VERSÃO ANTIGA - Este é o conteúdo correto',
        documentName: 'Briefing',
        createdAt: '2024-12-01T10:00:00Z',
        createdBy: 'user-1',
        createdByName: 'User 1',
        isProduction: false,
      }

      const versaoNova: DocumentVersionInfo = {
        id: 'version-2',
        artifactId: 'artifact-123',
        version: '1.0.1',
        hasOfficialVersion: false,
        status: ArtifactApprovalStatus.PENDING,
        content: 'CONTEÚDO VERSÃO NOVA - Este NÃO deve ser usado',
        documentName: 'Briefing',
        createdAt: '2024-12-30T10:00:00Z',
        createdBy: 'user-2',
        createdByName: 'User 2',
        isProduction: false,
      }

      // Usuário seleciona versão antiga
      const resultadoPromocao = createOfficialVersionData(
        versaoAntiga,
        'admin',
        'Admin'
      )

      expect(resultadoPromocao.content).toBe(
        'CONTEÚDO VERSÃO ANTIGA - Este é o conteúdo correto'
      )
      expect(resultadoPromocao.content).not.toBe(
        'CONTEÚDO VERSÃO NOVA - Este NÃO deve ser usado'
      )
    })
  })

  describe('bumpMinorVersion', () => {
    it('deve incrementar minor version e resetar patch', () => {
      expect(bumpMinorVersion('1.0.0')).toBe('1.1.0')
      expect(bumpMinorVersion('1.0.5')).toBe('1.1.0')
      expect(bumpMinorVersion('2.3.9')).toBe('2.4.0')
      expect(bumpMinorVersion('10.99.88')).toBe('10.100.0')
    })

    it('deve remover prefixo v', () => {
      expect(bumpMinorVersion('v1.0.0')).toBe('1.1.0')
      expect(bumpMinorVersion('v2.5.3')).toBe('2.6.0')
    })
  })
})

describe('Seleção de Versão para Promoção', () => {
  const mockVersions: DocumentVersionInfo[] = [
    {
      id: 'v3-id',
      artifactId: 'artifact-1',
      version: '1.0.2',
      hasOfficialVersion: false,
      status: ArtifactApprovalStatus.PENDING,
      content: 'Conteúdo mais recente (v3)',
      documentName: 'Briefing',
      createdAt: '2024-12-30T15:00:00Z',
      createdBy: 'user-3',
      createdByName: 'User 3',
      isProduction: false,
    },
    {
      id: 'v2-id',
      artifactId: 'artifact-1',
      version: '1.0.1',
      hasOfficialVersion: false,
      status: ArtifactApprovalStatus.PENDING,
      content: 'Conteúdo intermediário (v2)',
      documentName: 'Briefing',
      createdAt: '2024-12-29T10:00:00Z',
      createdBy: 'user-2',
      createdByName: 'User 2',
      isProduction: false,
    },
    {
      id: 'v1-id',
      artifactId: 'artifact-1',
      version: '1.0.0',
      hasOfficialVersion: false,
      status: ArtifactApprovalStatus.PENDING,
      content: 'Conteúdo original (v1)',
      documentName: 'Briefing',
      createdAt: '2024-12-28T08:00:00Z',
      createdBy: 'user-1',
      createdByName: 'User 1',
      isProduction: false,
    },
  ]

  it('deve encontrar versão correta pelo ID quando usuário seleciona v1', () => {
    const selectedVersionId = 'v1-id'
    const selectedVersion = mockVersions.find(v => v.id === selectedVersionId)

    expect(selectedVersion).toBeDefined()
    expect(selectedVersion?.version).toBe('1.0.0')
    expect(selectedVersion?.content).toBe('Conteúdo original (v1)')
  })

  it('deve encontrar versão correta pelo ID quando usuário seleciona v2', () => {
    const selectedVersionId = 'v2-id'
    const selectedVersion = mockVersions.find(v => v.id === selectedVersionId)

    expect(selectedVersion).toBeDefined()
    expect(selectedVersion?.version).toBe('1.0.1')
    expect(selectedVersion?.content).toBe('Conteúdo intermediário (v2)')
  })

  it('deve promover conteúdo da v1 mesmo quando v3 é mais recente', () => {
    const selectedVersionId = 'v1-id'
    const selectedVersion = mockVersions.find(v => v.id === selectedVersionId)!

    const promoted = createOfficialVersionData(
      selectedVersion,
      'admin',
      'Admin'
    )

    // O conteúdo promovido deve ser da v1
    expect(promoted.content).toBe('Conteúdo original (v1)')
    // A nova versão oficial deve ser 1.1.0 (bump da v1)
    expect(promoted.version).toBe('1.1.0')
    // Não deve conter conteúdo das outras versões
    expect(promoted.content).not.toContain('v2')
    expect(promoted.content).not.toContain('v3')
  })

  it('deve permitir promover versão intermediária', () => {
    const selectedVersionId = 'v2-id'
    const selectedVersion = mockVersions.find(v => v.id === selectedVersionId)!

    const promoted = createOfficialVersionData(
      selectedVersion,
      'admin',
      'Admin'
    )

    expect(promoted.content).toBe('Conteúdo intermediário (v2)')
    expect(promoted.version).toBe('1.1.0') // Bump da 1.0.1
  })
})

describe('Cenários de Edge Cases', () => {
  it('deve lidar com conteúdo vazio', () => {
    const targetVersion: DocumentVersionInfo = {
      id: 'version-1',
      artifactId: 'artifact-123',
      version: '1.0.0',
      hasOfficialVersion: false,
      status: ArtifactApprovalStatus.PENDING,
      content: '',
      documentName: 'Documento Vazio',
      createdAt: '2024-12-28T10:00:00Z',
      createdBy: 'user-1',
      createdByName: 'User 1',
      isProduction: false,
    }

    const result = createOfficialVersionData(targetVersion, 'admin', 'Admin')

    expect(result.content).toBe('')
    expect(result.hasOfficialVersion).toBe(true)
  })

  it('deve lidar com conteúdo muito grande', () => {
    const largeContent = 'X'.repeat(100000) // 100KB de conteúdo

    const targetVersion: DocumentVersionInfo = {
      id: 'version-1',
      artifactId: 'artifact-123',
      version: '1.0.0',
      hasOfficialVersion: false,
      status: ArtifactApprovalStatus.PENDING,
      content: largeContent,
      documentName: 'Documento Grande',
      createdAt: '2024-12-28T10:00:00Z',
      createdBy: 'user-1',
      createdByName: 'User 1',
      isProduction: false,
    }

    const result = createOfficialVersionData(targetVersion, 'admin', 'Admin')

    expect(result.content.length).toBe(100000)
    expect(result.content).toBe(largeContent)
  })

  it('deve preservar caracteres especiais no conteúdo', () => {
    const specialContent =
      '# Título\n\n## Seção com émojis 🚀\n\n- Item com "aspas"\n- Item com \'apóstrofe\'\n- Caracteres: ñ, ü, ç, 日本語'

    const targetVersion: DocumentVersionInfo = {
      id: 'version-1',
      artifactId: 'artifact-123',
      version: '1.0.0',
      hasOfficialVersion: false,
      status: ArtifactApprovalStatus.PENDING,
      content: specialContent,
      documentName: 'Documento Especial',
      createdAt: '2024-12-28T10:00:00Z',
      createdBy: 'user-1',
      createdByName: 'User 1',
      isProduction: false,
    }

    const result = createOfficialVersionData(targetVersion, 'admin', 'Admin')

    expect(result.content).toBe(specialContent)
    expect(result.content).toContain('🚀')
    expect(result.content).toContain('日本語')
  })

  it('deve lidar com versão já oficial sendo re-promovida', () => {
    const targetVersion: DocumentVersionInfo = {
      id: 'version-1',
      artifactId: 'artifact-123',
      version: '1.1.0', // Já é uma versão oficial anterior
      hasOfficialVersion: true,
      status: ArtifactApprovalStatus.APPROVED,
      content: 'Conteúdo oficial anterior',
      documentName: 'Documento',
      createdAt: '2024-12-28T10:00:00Z',
      createdBy: 'user-1',
      createdByName: 'User 1',
      isProduction: true,
    }

    const result = createOfficialVersionData(targetVersion, 'admin', 'Admin')

    // Deve criar nova versão oficial
    expect(result.version).toBe('1.2.0')
    expect(result.hasOfficialVersion).toBe(true)
    expect(result.content).toBe('Conteúdo oficial anterior')
  })
})

describe('Validação de Dados de Aprovação', () => {
  it('deve incluir timestamp de aprovação', () => {
    const beforeTest = new Date().toISOString()

    const targetVersion: DocumentVersionInfo = {
      id: 'version-1',
      artifactId: 'artifact-123',
      version: '1.0.0',
      hasOfficialVersion: false,
      status: ArtifactApprovalStatus.PENDING,
      content: 'Conteúdo',
      documentName: 'Documento',
      createdAt: '2024-12-28T10:00:00Z',
      createdBy: 'user-1',
      createdByName: 'User 1',
      isProduction: false,
    }

    const result = createOfficialVersionData(targetVersion, 'admin', 'Admin')

    const afterTest = new Date().toISOString()

    expect(result.approvedAt).toBeDefined()
    expect(result.approvedAt! >= beforeTest).toBe(true)
    expect(result.approvedAt! <= afterTest).toBe(true)
  })

  it('deve incluir informações do aprovador', () => {
    const targetVersion: DocumentVersionInfo = {
      id: 'version-1',
      artifactId: 'artifact-123',
      version: '1.0.0',
      hasOfficialVersion: false,
      status: ArtifactApprovalStatus.PENDING,
      content: 'Conteúdo',
      documentName: 'Documento',
      createdAt: '2024-12-28T10:00:00Z',
      createdBy: 'user-1',
      createdByName: 'User 1',
      isProduction: false,
    }

    const result = createOfficialVersionData(
      targetVersion,
      'admin-id-123',
      'João Administrador'
    )

    expect(result.approvedBy).toBe('admin-id-123')
    expect(result.approvedByName).toBe('João Administrador')
  })

  it('deve atualizar timestamp de modificação', () => {
    const originalCreatedAt = '2024-01-01T00:00:00Z'

    const targetVersion: DocumentVersionInfo = {
      id: 'version-1',
      artifactId: 'artifact-123',
      version: '1.0.0',
      hasOfficialVersion: false,
      status: ArtifactApprovalStatus.PENDING,
      content: 'Conteúdo',
      documentName: 'Documento',
      createdAt: originalCreatedAt,
      createdBy: 'user-1',
      createdByName: 'User 1',
      isProduction: false,
    }

    const result = createOfficialVersionData(targetVersion, 'admin', 'Admin')

    // createdAt deve ser preservado
    expect(result.createdAt).toBe(originalCreatedAt)
    // updatedAt deve ser atualizado
    expect(result.updatedAt).not.toBe(originalCreatedAt)
    expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(
      new Date(originalCreatedAt).getTime()
    )
  })
})
