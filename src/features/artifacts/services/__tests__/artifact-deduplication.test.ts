/**
 * Testes unitários para lógica de deduplicação de artefatos
 * Garante que apenas um artefato por tipo seja mantido, priorizando versão oficial e mais recente
 */

import { describe, expect, it } from 'vitest'

// Tipos simulados para teste
interface ValidationArtifact {
  id: string
  type: string
  title: string
  version: string
  hasOfficialVersion: boolean
  status: 'validated' | 'pending-validation' | 'rejected'
  createdAt: string
  updatedAt: string
}

/**
 * Função de deduplicação extraída da sda-validation.tsx
 * Prioriza versão oficial, depois versão mais recente
 */
function deduplicateArtifactsByType(
  artifacts: ValidationArtifact[]
): ValidationArtifact[] {
  const artifactsByType = new Map<string, ValidationArtifact>()

  for (const artifact of artifacts) {
    const existing = artifactsByType.get(artifact.type)
    if (!existing) {
      artifactsByType.set(artifact.type, artifact)
    } else {
      // Priorizar artefato com versão oficial
      if (artifact.hasOfficialVersion && !existing.hasOfficialVersion) {
        artifactsByType.set(artifact.type, artifact)
      } else if (artifact.hasOfficialVersion === existing.hasOfficialVersion) {
        // Se ambos têm ou não têm versão oficial, comparar versão
        const artifactVersion = artifact.version?.replace('v', '') || '0'
        const existingVersion = existing.version?.replace('v', '') || '0'
        if (artifactVersion > existingVersion) {
          artifactsByType.set(artifact.type, artifact)
        }
      }
    }
  }

  return Array.from(artifactsByType.values())
}

/**
 * Função para deduplicar documentos mantendo versão mais recente
 */
function deduplicateDocumentsByType(
  documents: ValidationArtifact[]
): ValidationArtifact[] {
  const documentsByType = new Map<string, ValidationArtifact>()

  for (const doc of documents) {
    const existing = documentsByType.get(doc.type)
    if (
      !existing ||
      (doc.version && existing.version && doc.version > existing.version)
    ) {
      documentsByType.set(doc.type, doc)
    }
  }

  return Array.from(documentsByType.values())
}

describe('Deduplicação de Artefatos', () => {
  describe('deduplicateArtifactsByType', () => {
    it('deve manter apenas um artefato quando não há duplicatas', () => {
      const artifacts: ValidationArtifact[] = [
        {
          id: '1',
          type: 'briefing',
          title: 'Briefing de Projeto',
          version: '1.0.0',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-29T10:00:00Z',
          updatedAt: '2024-12-29T10:00:00Z',
        },
        {
          id: '2',
          type: 'prd',
          title: 'PRD',
          version: '1.0.0',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-29T10:00:00Z',
          updatedAt: '2024-12-29T10:00:00Z',
        },
      ]

      const result = deduplicateArtifactsByType(artifacts)

      expect(result).toHaveLength(2)
      expect(result.map(a => a.type)).toContain('briefing')
      expect(result.map(a => a.type)).toContain('prd')
    })

    it('deve priorizar artefato com versão oficial sobre sem versão oficial', () => {
      const artifacts: ValidationArtifact[] = [
        {
          id: '1',
          type: 'briefing',
          title: 'Briefing v1.0.1',
          version: '1.0.1',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-29T10:00:00Z',
          updatedAt: '2024-12-29T10:00:00Z',
        },
        {
          id: '2',
          type: 'briefing',
          title: 'Briefing v1.1.0 (Oficial)',
          version: '1.1.0',
          hasOfficialVersion: true,
          status: 'validated',
          createdAt: '2024-12-30T10:00:00Z',
          updatedAt: '2024-12-30T10:00:00Z',
        },
      ]

      const result = deduplicateArtifactsByType(artifacts)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
      expect(result[0].hasOfficialVersion).toBe(true)
      expect(result[0].version).toBe('1.1.0')
    })

    it('deve priorizar versão oficial mesmo se vier primeiro na lista', () => {
      const artifacts: ValidationArtifact[] = [
        {
          id: '2',
          type: 'briefing',
          title: 'Briefing v1.1.0 (Oficial)',
          version: '1.1.0',
          hasOfficialVersion: true,
          status: 'validated',
          createdAt: '2024-12-30T10:00:00Z',
          updatedAt: '2024-12-30T10:00:00Z',
        },
        {
          id: '1',
          type: 'briefing',
          title: 'Briefing v1.0.1',
          version: '1.0.1',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-29T10:00:00Z',
          updatedAt: '2024-12-29T10:00:00Z',
        },
      ]

      const result = deduplicateArtifactsByType(artifacts)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
      expect(result[0].hasOfficialVersion).toBe(true)
    })

    it('deve escolher versão mais recente quando ambos têm versão oficial', () => {
      const artifacts: ValidationArtifact[] = [
        {
          id: '1',
          type: 'briefing',
          title: 'Briefing v1.1.0 (Oficial antiga)',
          version: '1.1.0',
          hasOfficialVersion: true,
          status: 'validated',
          createdAt: '2024-12-29T10:00:00Z',
          updatedAt: '2024-12-29T10:00:00Z',
        },
        {
          id: '2',
          type: 'briefing',
          title: 'Briefing v1.2.0 (Oficial nova)',
          version: '1.2.0',
          hasOfficialVersion: true,
          status: 'validated',
          createdAt: '2024-12-30T10:00:00Z',
          updatedAt: '2024-12-30T10:00:00Z',
        },
      ]

      const result = deduplicateArtifactsByType(artifacts)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
      expect(result[0].version).toBe('1.2.0')
    })

    it('deve escolher versão mais recente quando nenhum tem versão oficial', () => {
      const artifacts: ValidationArtifact[] = [
        {
          id: '1',
          type: 'prd',
          title: 'PRD v1.0.0',
          version: '1.0.0',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-28T10:00:00Z',
          updatedAt: '2024-12-28T10:00:00Z',
        },
        {
          id: '2',
          type: 'prd',
          title: 'PRD v1.0.1',
          version: '1.0.1',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-29T10:00:00Z',
          updatedAt: '2024-12-29T10:00:00Z',
        },
        {
          id: '3',
          type: 'prd',
          title: 'PRD v1.0.2',
          version: '1.0.2',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-30T10:00:00Z',
          updatedAt: '2024-12-30T10:00:00Z',
        },
      ]

      const result = deduplicateArtifactsByType(artifacts)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('3')
      expect(result[0].version).toBe('1.0.2')
    })

    it('deve lidar com múltiplos tipos de artefatos com duplicatas', () => {
      const artifacts: ValidationArtifact[] = [
        // Briefings
        {
          id: '1',
          type: 'briefing',
          title: 'Briefing v1.0.1',
          version: '1.0.1',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-29T10:00:00Z',
          updatedAt: '2024-12-29T10:00:00Z',
        },
        {
          id: '2',
          type: 'briefing',
          title: 'Briefing v1.1.0 (Oficial)',
          version: '1.1.0',
          hasOfficialVersion: true,
          status: 'validated',
          createdAt: '2024-12-30T10:00:00Z',
          updatedAt: '2024-12-30T10:00:00Z',
        },
        // PRDs
        {
          id: '3',
          type: 'prd',
          title: 'PRD v1.0.0',
          version: '1.0.0',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-28T10:00:00Z',
          updatedAt: '2024-12-28T10:00:00Z',
        },
        {
          id: '4',
          type: 'prd',
          title: 'PRD v1.0.1',
          version: '1.0.1',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-29T10:00:00Z',
          updatedAt: '2024-12-29T10:00:00Z',
        },
        // Backlog (único)
        {
          id: '5',
          type: 'backlog',
          title: 'Backlog v1.0.0',
          version: '1.0.0',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-29T10:00:00Z',
          updatedAt: '2024-12-29T10:00:00Z',
        },
      ]

      const result = deduplicateArtifactsByType(artifacts)

      expect(result).toHaveLength(3)

      const briefing = result.find(a => a.type === 'briefing')
      expect(briefing?.id).toBe('2')
      expect(briefing?.hasOfficialVersion).toBe(true)

      const prd = result.find(a => a.type === 'prd')
      expect(prd?.id).toBe('4')
      expect(prd?.version).toBe('1.0.1')

      const backlog = result.find(a => a.type === 'backlog')
      expect(backlog?.id).toBe('5')
    })

    it('deve lidar com versões no formato vX.X.X', () => {
      const artifacts: ValidationArtifact[] = [
        {
          id: '1',
          type: 'briefing',
          title: 'Briefing v1.0.1',
          version: 'v1.0.1',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-29T10:00:00Z',
          updatedAt: '2024-12-29T10:00:00Z',
        },
        {
          id: '2',
          type: 'briefing',
          title: 'Briefing v1.1.0',
          version: 'v1.1.0',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-30T10:00:00Z',
          updatedAt: '2024-12-30T10:00:00Z',
        },
      ]

      const result = deduplicateArtifactsByType(artifacts)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
      expect(result[0].version).toBe('v1.1.0')
    })

    it('deve retornar array vazio para input vazio', () => {
      const result = deduplicateArtifactsByType([])
      expect(result).toHaveLength(0)
    })

    it('deve manter artefato único sem alterações', () => {
      const artifact: ValidationArtifact = {
        id: '1',
        type: 'briefing',
        title: 'Briefing',
        version: '1.0.0',
        hasOfficialVersion: true,
        status: 'validated',
        createdAt: '2024-12-29T10:00:00Z',
        updatedAt: '2024-12-29T10:00:00Z',
      }

      const result = deduplicateArtifactsByType([artifact])

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(artifact)
    })
  })

  describe('deduplicateDocumentsByType', () => {
    it('deve manter documento com versão mais recente', () => {
      const documents: ValidationArtifact[] = [
        {
          id: '1',
          type: 'briefing',
          title: 'Briefing v1.0.0',
          version: '1.0.0',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-28T10:00:00Z',
          updatedAt: '2024-12-28T10:00:00Z',
        },
        {
          id: '2',
          type: 'briefing',
          title: 'Briefing v1.1.0',
          version: '1.1.0',
          hasOfficialVersion: true,
          status: 'validated',
          createdAt: '2024-12-30T10:00:00Z',
          updatedAt: '2024-12-30T10:00:00Z',
        },
      ]

      const result = deduplicateDocumentsByType(documents)

      expect(result).toHaveLength(1)
      expect(result[0].version).toBe('1.1.0')
    })

    it('deve lidar com múltiplos tipos de documentos', () => {
      const documents: ValidationArtifact[] = [
        {
          id: '1',
          type: 'briefing',
          title: 'Briefing v1.0.0',
          version: '1.0.0',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-28T10:00:00Z',
          updatedAt: '2024-12-28T10:00:00Z',
        },
        {
          id: '2',
          type: 'briefing',
          title: 'Briefing v1.1.0',
          version: '1.1.0',
          hasOfficialVersion: true,
          status: 'validated',
          createdAt: '2024-12-30T10:00:00Z',
          updatedAt: '2024-12-30T10:00:00Z',
        },
        {
          id: '3',
          type: 'prd',
          title: 'PRD v1.0.0',
          version: '1.0.0',
          hasOfficialVersion: false,
          status: 'pending-validation',
          createdAt: '2024-12-29T10:00:00Z',
          updatedAt: '2024-12-29T10:00:00Z',
        },
      ]

      const result = deduplicateDocumentsByType(documents)

      expect(result).toHaveLength(2)

      const briefing = result.find(d => d.type === 'briefing')
      expect(briefing?.version).toBe('1.1.0')

      const prd = result.find(d => d.type === 'prd')
      expect(prd?.version).toBe('1.0.0')
    })
  })
})

describe('Promoção de Versão Específica', () => {
  interface DocumentVersionInfo {
    id: string
    artifactId: string
    version: string
    hasOfficialVersion: boolean
    content: string
    createdAt: string
  }

  /**
   * Simula a lógica de encontrar versão específica para promoção
   */
  function findVersionById(
    versions: DocumentVersionInfo[],
    versionId: string
  ): DocumentVersionInfo | undefined {
    return versions.find(v => v.id === versionId)
  }

  it('deve encontrar versão específica pelo ID', () => {
    const versions: DocumentVersionInfo[] = [
      {
        id: 'version-3',
        artifactId: 'artifact-1',
        version: '1.0.2',
        hasOfficialVersion: false,
        content: 'Conteúdo da versão 3',
        createdAt: '2024-12-30T10:00:00Z',
      },
      {
        id: 'version-2',
        artifactId: 'artifact-1',
        version: '1.0.1',
        hasOfficialVersion: false,
        content: 'Conteúdo da versão 2',
        createdAt: '2024-12-29T10:00:00Z',
      },
      {
        id: 'version-1',
        artifactId: 'artifact-1',
        version: '1.0.0',
        hasOfficialVersion: false,
        content: 'Conteúdo da versão 1',
        createdAt: '2024-12-28T10:00:00Z',
      },
    ]

    // Usuário seleciona versão 1 para promover
    const selectedVersion = findVersionById(versions, 'version-1')

    expect(selectedVersion).toBeDefined()
    expect(selectedVersion?.version).toBe('1.0.0')
    expect(selectedVersion?.content).toBe('Conteúdo da versão 1')
  })

  it('deve retornar undefined para ID inexistente', () => {
    const versions: DocumentVersionInfo[] = [
      {
        id: 'version-1',
        artifactId: 'artifact-1',
        version: '1.0.0',
        hasOfficialVersion: false,
        content: 'Conteúdo',
        createdAt: '2024-12-28T10:00:00Z',
      },
    ]

    const selectedVersion = findVersionById(versions, 'version-inexistente')

    expect(selectedVersion).toBeUndefined()
  })

  it('deve promover conteúdo da versão selecionada, não da mais recente', () => {
    const versions: DocumentVersionInfo[] = [
      {
        id: 'version-3',
        artifactId: 'artifact-1',
        version: '1.0.2',
        hasOfficialVersion: false,
        content: 'Conteúdo NOVO da versão 3',
        createdAt: '2024-12-30T10:00:00Z',
      },
      {
        id: 'version-1',
        artifactId: 'artifact-1',
        version: '1.0.0',
        hasOfficialVersion: false,
        content: 'Conteúdo ORIGINAL da versão 1',
        createdAt: '2024-12-28T10:00:00Z',
      },
    ]

    // Simular promoção da versão 1 (não a mais recente)
    const selectedVersionId = 'version-1'
    const selectedVersion = findVersionById(versions, selectedVersionId)

    // O conteúdo promovido deve ser da versão selecionada
    expect(selectedVersion?.content).toBe('Conteúdo ORIGINAL da versão 1')
    expect(selectedVersion?.content).not.toBe('Conteúdo NOVO da versão 3')
  })
})

describe('Bump de Versão', () => {
  /**
   * Simula a lógica de bump de versão minor
   */
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

  it('deve incrementar versão minor corretamente', () => {
    expect(bumpMinorVersion('1.0.0')).toBe('1.1.0')
    expect(bumpMinorVersion('1.0.1')).toBe('1.1.0')
    expect(bumpMinorVersion('1.1.0')).toBe('1.2.0')
    expect(bumpMinorVersion('2.5.3')).toBe('2.6.0')
  })

  it('deve lidar com prefixo v', () => {
    expect(bumpMinorVersion('v1.0.0')).toBe('1.1.0')
    expect(bumpMinorVersion('v2.3.1')).toBe('2.4.0')
  })

  it('deve lidar com versões incompletas', () => {
    expect(bumpMinorVersion('1.0')).toBe('1.1.0')
    expect(bumpMinorVersion('1')).toBe('1.1.0')
  })
})

describe('Filtro de Artefatos por Tipo para Sincronização', () => {
  interface SyncArtifact {
    artifactId: string
    type: string
  }

  it('deve filtrar artefatos que já existem na sincronização por tipo', () => {
    const officialArtifacts: ValidationArtifact[] = [
      {
        id: '1',
        type: 'briefing',
        title: 'Briefing',
        version: '1.1.0',
        hasOfficialVersion: true,
        status: 'validated',
        createdAt: '2024-12-30T10:00:00Z',
        updatedAt: '2024-12-30T10:00:00Z',
      },
      {
        id: '2',
        type: 'prd',
        title: 'PRD',
        version: '1.1.0',
        hasOfficialVersion: true,
        status: 'validated',
        createdAt: '2024-12-30T10:00:00Z',
        updatedAt: '2024-12-30T10:00:00Z',
      },
      {
        id: '3',
        type: 'backlog',
        title: 'Backlog',
        version: '1.1.0',
        hasOfficialVersion: true,
        status: 'validated',
        createdAt: '2024-12-30T10:00:00Z',
        updatedAt: '2024-12-30T10:00:00Z',
      },
    ]

    const existingSyncArtifacts: SyncArtifact[] = [
      { artifactId: 'sync-1', type: 'briefing' },
    ]

    const existingTypes = new Set(existingSyncArtifacts.map(a => a.type))
    const artifactsToSync = officialArtifacts.filter(
      a => !existingTypes.has(a.type)
    )

    expect(artifactsToSync).toHaveLength(2)
    expect(artifactsToSync.map(a => a.type)).toContain('prd')
    expect(artifactsToSync.map(a => a.type)).toContain('backlog')
    expect(artifactsToSync.map(a => a.type)).not.toContain('briefing')
  })

  it('deve sincronizar todos quando não há artefatos existentes', () => {
    const officialArtifacts: ValidationArtifact[] = [
      {
        id: '1',
        type: 'briefing',
        title: 'Briefing',
        version: '1.1.0',
        hasOfficialVersion: true,
        status: 'validated',
        createdAt: '2024-12-30T10:00:00Z',
        updatedAt: '2024-12-30T10:00:00Z',
      },
      {
        id: '2',
        type: 'prd',
        title: 'PRD',
        version: '1.1.0',
        hasOfficialVersion: true,
        status: 'validated',
        createdAt: '2024-12-30T10:00:00Z',
        updatedAt: '2024-12-30T10:00:00Z',
      },
    ]

    const existingSyncArtifacts: SyncArtifact[] = []

    const existingTypes = new Set(existingSyncArtifacts.map(a => a.type))
    const artifactsToSync = officialArtifacts.filter(
      a => !existingTypes.has(a.type)
    )

    expect(artifactsToSync).toHaveLength(2)
  })

  it('não deve sincronizar nada quando todos já existem', () => {
    const officialArtifacts: ValidationArtifact[] = [
      {
        id: '1',
        type: 'briefing',
        title: 'Briefing',
        version: '1.1.0',
        hasOfficialVersion: true,
        status: 'validated',
        createdAt: '2024-12-30T10:00:00Z',
        updatedAt: '2024-12-30T10:00:00Z',
      },
    ]

    const existingSyncArtifacts: SyncArtifact[] = [
      { artifactId: 'sync-1', type: 'briefing' },
    ]

    const existingTypes = new Set(existingSyncArtifacts.map(a => a.type))
    const artifactsToSync = officialArtifacts.filter(
      a => !existingTypes.has(a.type)
    )

    expect(artifactsToSync).toHaveLength(0)
  })
})
