import { NextRequest, NextResponse } from 'next/server'

interface LinkRequest {
  organization: string
  project: string
  pat: string
  sourceId: number
  targetId: number
  linkType: 'Child' | 'Parent' | 'Related'
}

export async function POST(request: NextRequest) {
  try {
    const {
      organization,
      project,
      pat,
      sourceId,
      targetId,
      linkType = 'Child',
    }: LinkRequest = await request.json()

    console.log('🔗 [LINK API] Criando relacionamento:', {
      organization,
      project,
      sourceId,
      targetId,
      linkType,
      hasPat: !!pat,
    })

    if (!organization || !project || !pat || !sourceId || !targetId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields (organization, project, pat, sourceId, targetId)',
        },
        { status: 400 }
      )
    }

    // Definir o tipo de relacionamento baseado no Azure DevOps
    let relationshipType = ''

    switch (linkType) {
      case 'Child':
        relationshipType = 'System.LinkTypes.Hierarchy-Forward' // sourceId é pai de targetId
        break
      case 'Parent':
        relationshipType = 'System.LinkTypes.Hierarchy-Reverse' // sourceId é filho de targetId
        break
      case 'Related':
        relationshipType = 'System.LinkTypes.Related'
        break
      default:
        relationshipType = 'System.LinkTypes.Hierarchy-Forward'
    }

    // Preparar patch document para adicionar relacionamento
    const patchDocument = [
      {
        op: 'add',
        path: '/relations/-',
        value: {
          rel: relationshipType,
          url: `https://dev.azure.com/${organization}/_apis/wit/workitems/${targetId}`,
        },
      },
    ]

    console.log(
      '📄 [LINK API] Patch Document:',
      JSON.stringify(patchDocument, null, 2)
    )
    console.log(
      '🔗 [LINK API] URL:',
      `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${sourceId}`
    )

    // Fazer requisição para Azure DevOps REST API
    const azureResponse = await fetch(
      `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${sourceId}?api-version=7.1-preview.3`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json-patch+json',
          Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(patchDocument),
      }
    )

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text()
      console.error('❌ [LINK API] Erro ao criar relacionamento:', {
        status: azureResponse.status,
        statusText: azureResponse.statusText,
        error: errorText,
        sourceId,
        targetId,
        linkType,
        relationshipType,
      })

      return NextResponse.json(
        {
          success: false,
          error: `HTTP ${azureResponse.status}: ${errorText}`,
          details: {
            sourceId,
            targetId,
            linkType,
            relationshipType,
          },
        },
        { status: azureResponse.status }
      )
    }

    const result = await azureResponse.json()
    console.log('✅ [LINK API] Relacionamento criado:', {
      sourceId,
      targetId,
      linkType,
      relationshipType,
      rev: result.rev,
    })

    return NextResponse.json({
      success: true,
      sourceId,
      targetId,
      linkType,
      relationshipType,
      rev: result.rev,
      relations: result.relations || [],
    })
  } catch (error) {
    console.error('❌ [LINK API] Erro ao criar relacionamento:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
