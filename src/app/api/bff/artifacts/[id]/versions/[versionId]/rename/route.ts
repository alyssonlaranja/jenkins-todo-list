/**
 * BFF Endpoint: Rename Artifact Version
 *
 * POST /api/bff/artifacts/[id]/versions/[versionId]/rename
 *
 * Renomeia uma versão de artefato armazenando o label customizado
 * em um artefato SEPARADO (version-labels-{artifactId}) para evitar
 * criar novas versões do artefato principal.
 *
 * @see US-01.02 - Renomear versões de artefatos
 *
 * Headers required:
 * - Authorization: Bearer token (JWT from session)
 * - x-cockpit-license-id: License UUID
 * - x-cockpit-namespace-id: Namespace UUID
 *
 * Body:
 * - newLabel: string (3-60 caracteres)
 */
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

import { authOptions } from '@/auth'
import {
  validateVersionLabel,
  VERSION_LABEL_VALIDATION,
  type RenameVersionResponse,
  type VersionLabelsMap,
} from '@/features/artifacts/types/version-labels.types'

// ============================================================================
// TYPES
// ============================================================================

interface RenameRequestBody {
  newLabel: string
}

interface RouteParams {
  params: Promise<{
    id: string
    versionId: string
  }>
}

/**
 * Estrutura do artefato de labels de versão
 * Armazenado separadamente para não criar novas versões do artefato principal
 */
interface VersionLabelsArtifactValue {
  artifactId: string
  labels: VersionLabelsMap
  updatedAt: string
}

// ============================================================================
// HELPERS
// ============================================================================

function getPortalApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL not configured')
  }
  return url
}

/**
 * Gera a key para o artefato de labels de versão
 */
function getVersionLabelsKey(artifactId: string): string {
  return `version-labels-${artifactId}`
}

/**
 * Busca o artifactTypeId para o tipo "JSON"
 * Necessário para criar artefatos na API do Cockpit
 */
async function getJsonArtifactTypeId(
  accessToken: string,
  licenseId: string,
  namespaceId: string
): Promise<string | null> {
  const apiUrl = getPortalApiUrl()
  const response = await fetch(`${apiUrl}/api/ArtifactType`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      LicenseId: licenseId,
      NamespaceId: namespaceId,
    },
  })

  if (!response.ok) {
    console.error('[BFF] Failed to fetch artifact types:', response.status)
    return null
  }

  const json = await response.json()
  const types = json.data || json.items || json || []

  // Busca o tipo JSON (case-insensitive)
  const jsonType = types.find(
    (t: { name: string; id: string }) => t.name.toLowerCase() === 'json'
  )

  return jsonType?.id || null
}

/**
 * Busca artefato por ID
 */
async function fetchArtifactById(
  artifactId: string,
  accessToken: string,
  licenseId: string,
  namespaceId: string
) {
  const apiUrl = getPortalApiUrl()
  const response = await fetch(`${apiUrl}/api/Artifact/GetById/${artifactId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      LicenseId: licenseId,
      NamespaceId: namespaceId,
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error(`Failed to fetch artifact: ${response.status}`)
  }

  const json = await response.json()
  return json.data || json
}

/**
 * Busca artefato por key
 */
async function fetchArtifactByKey(
  key: string,
  accessToken: string,
  licenseId: string,
  namespaceId: string
) {
  const apiUrl = getPortalApiUrl()
  const response = await fetch(
    `${apiUrl}/api/Artifact/GetByKey/${encodeURIComponent(key)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        LicenseId: licenseId,
        NamespaceId: namespaceId,
      },
    }
  )

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error(`Failed to fetch artifact by key: ${response.status}`)
  }

  const json = await response.json()
  return json.data || json
}

/**
 * Busca versões de um artefato por ID
 */
async function fetchVersionsByArtifactId(
  artifactId: string,
  accessToken: string,
  licenseId: string,
  namespaceId: string
) {
  const apiUrl = getPortalApiUrl()
  const response = await fetch(
    `${apiUrl}/api/ArtifactVersion/GetByArtifactId/${artifactId}?pageSize=100`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        LicenseId: licenseId,
        NamespaceId: namespaceId,
      },
    }
  )

  if (!response.ok) {
    return []
  }

  const json = await response.json()
  return json.data?.items || json.items || []
}

/**
 * Busca artefato por key COM o valor da versão mais recente
 * Importante para garantir que pegamos os labels mais atualizados
 */
async function fetchArtifactByKeyWithLatestVersion(
  key: string,
  accessToken: string,
  licenseId: string,
  namespaceId: string
) {
  // Primeiro busca o artefato pela key
  const artifact = await fetchArtifactByKey(
    key,
    accessToken,
    licenseId,
    namespaceId
  )

  if (!artifact) {
    return null
  }

  // Busca todas as versões para pegar a mais recente
  const versions = await fetchVersionsByArtifactId(
    artifact.id,
    accessToken,
    licenseId,
    namespaceId
  )

  if (versions.length > 0) {
    // Ordenar por data (mais recente primeiro)
    const sortedVersions = [...versions].sort(
      (a: { createdAt?: string }, b: { createdAt?: string }) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      }
    )

    // Usar o value da versão mais recente
    const latestVersion = sortedVersions[0]
    if (latestVersion?.value) {
      artifact.value = latestVersion.value
    }
  }

  return artifact
}

/**
 * Cria artefato de labels de versão
 */
async function createVersionLabelsArtifact(
  artifactId: string,
  labels: VersionLabelsMap,
  accessToken: string,
  licenseId: string,
  namespaceId: string,
  artifactTypeId: string
) {
  const apiUrl = getPortalApiUrl()
  const key = getVersionLabelsKey(artifactId)

  const value: VersionLabelsArtifactValue = {
    artifactId,
    labels,
    updatedAt: new Date().toISOString(),
  }

  const response = await fetch(`${apiUrl}/api/Artifact/Create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      LicenseId: licenseId,
      NamespaceId: namespaceId,
    },
    body: JSON.stringify({
      key,
      description: `Labels customizados de versões para artefato ${artifactId}`,
      value: JSON.stringify(value),
      accessibility: 'NAMESPACE_USER',
      type: 'JSON',
      artifactTypeId, // CRÍTICO: Campo obrigatório na API do Cockpit
      secret: false,
      metadata: '',
      tags: 'version-labels,system',
      version: '1.0.0',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to create version labels artifact: ${response.status} - ${errorText}`
    )
  }

  const json = await response.json()
  return json.data || json
}

/**
 * Atualiza artefato de labels de versão
 * Como é um artefato separado, criar nova versão não afeta o artefato principal
 */
async function updateVersionLabelsArtifact(
  labelsArtifactId: string,
  artifactId: string,
  labels: VersionLabelsMap,
  accessToken: string,
  licenseId: string,
  namespaceId: string
) {
  const apiUrl = getPortalApiUrl()

  const value: VersionLabelsArtifactValue = {
    artifactId,
    labels,
    updatedAt: new Date().toISOString(),
  }

  const response = await fetch(`${apiUrl}/api/Artifact/Update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      LicenseId: licenseId,
      NamespaceId: namespaceId,
    },
    body: JSON.stringify({
      id: labelsArtifactId,
      value: JSON.stringify(value),
      description: `Labels customizados de versões para artefato ${artifactId}`,
      secret: false,
      accessibility: 'NAMESPACE_USER',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to update version labels artifact: ${response.status} - ${errorText}`
    )
  }

  const json = await response.json()
  return json.data || json
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<RenameVersionResponse>> {
  const startTime = Date.now()
  const { id: artifactId, versionId } = await params

  console.log(
    '[BFF] POST /api/bff/artifacts/[id]/versions/[versionId]/rename',
    {
      artifactId,
      versionId,
    }
  )

  try {
    // 1. Autenticação - Validar sessão
    const session = await getServerSession(authOptions)

    // Permitir bypass em desenvolvimento
    const disableAuth = process.env.DISABLE_AUTH === 'true'
    if (!session && !disableAuth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Headers obrigatórios
    const authHeader = request.headers.get('authorization')
    const licenseId = request.headers.get('x-cockpit-license-id')
    const namespaceId = request.headers.get('x-cockpit-namespace-id')

    // Extrair Bearer token do header Authorization
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null

    if (!accessToken || !licenseId || !namespaceId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required headers: Authorization (Bearer token), x-cockpit-license-id, x-cockpit-namespace-id',
        },
        { status: 400 }
      )
    }

    // 3. Parsear body
    let body: RenameRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { newLabel } = body
    const trimmedLabel = newLabel?.trim()

    // 4. Validação básica
    if (!trimmedLabel) {
      return NextResponse.json(
        { success: false, error: VERSION_LABEL_VALIDATION.ERRORS.EMPTY },
        { status: 400 }
      )
    }

    // 5. Verificar se artefato principal existe
    const mainArtifact = await fetchArtifactById(
      artifactId,
      accessToken,
      licenseId,
      namespaceId
    )

    if (!mainArtifact) {
      return NextResponse.json(
        { success: false, error: 'Artifact not found' },
        { status: 404 }
      )
    }

    // 6. Buscar artefato de labels existente (COM versão mais recente)
    const labelsKey = getVersionLabelsKey(artifactId)
    const labelsArtifact = await fetchArtifactByKeyWithLatestVersion(
      labelsKey,
      accessToken,
      licenseId,
      namespaceId
    )

    // 7. Obter labels existentes
    let versionLabels: VersionLabelsMap = {}
    if (labelsArtifact?.value) {
      try {
        const parsed = JSON.parse(
          labelsArtifact.value
        ) as VersionLabelsArtifactValue
        versionLabels = parsed.labels || {}
      } catch {
        console.warn('[BFF] Failed to parse existing labels artifact')
      }
    }

    // 8. Validar label (incluindo duplicados)
    const validation = validateVersionLabel(
      trimmedLabel,
      versionLabels,
      versionId
    )
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // 9. Capturar label anterior para auditoria
    const previousLabel = versionLabels[versionId]?.label

    // 10. Atualizar label
    const renamedAt = new Date().toISOString()
    const userId = session?.user?.email || 'unknown'
    const userName = session?.user?.name || 'Unknown User'

    versionLabels[versionId] = {
      label: trimmedLabel,
      renamedAt,
      renamedBy: userId,
      renamedByName: userName,
      previousLabel: previousLabel || undefined,
    }

    // 11. Salvar labels em artefato SEPARADO (não afeta artefato principal)
    if (labelsArtifact) {
      // Atualizar artefato existente
      await updateVersionLabelsArtifact(
        labelsArtifact.id,
        artifactId,
        versionLabels,
        accessToken,
        licenseId,
        namespaceId
      )
    } else {
      // Buscar o artifactTypeId para JSON (obrigatório na API do Cockpit)
      const jsonTypeId = await getJsonArtifactTypeId(
        accessToken,
        licenseId,
        namespaceId
      )

      if (!jsonTypeId) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Artifact type "JSON" not found in API. Cannot create labels artifact.',
          },
          { status: 500 }
        )
      }

      // Criar novo artefato de labels
      await createVersionLabelsArtifact(
        artifactId,
        versionLabels,
        accessToken,
        licenseId,
        namespaceId,
        jsonTypeId
      )
    }

    // 12. Log de auditoria
    console.log('[BFF] ✅ Version renamed successfully:', {
      artifactId,
      versionId,
      previousLabel,
      newLabel: trimmedLabel,
      renamedBy: userName,
      renamedAt,
      labelsArtifactKey: labelsKey,
      processingMs: Date.now() - startTime,
    })

    // 13. Retornar sucesso
    return NextResponse.json({
      success: true,
      data: {
        versionId,
        newLabel: trimmedLabel,
        previousLabel,
        renamedAt,
        renamedBy: userId,
        renamedByName: userName,
      },
    })
  } catch (error) {
    console.error('[BFF] ❌ Error renaming version:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
