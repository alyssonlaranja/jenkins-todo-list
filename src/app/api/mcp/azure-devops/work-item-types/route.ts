import { NextRequest, NextResponse } from 'next/server'

interface WorkItemTypeRequest {
  organization: string
  project: string
  pat: string
}

export async function POST(request: NextRequest) {
  try {
    const { organization, project, pat }: WorkItemTypeRequest =
      await request.json()

    console.log('🔍 [API] Descobrindo tipos de work item:', {
      organization,
      project,
      hasPat: !!pat,
    })

    if (!organization || !project || !pat) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields (organization, project, pat)',
        },
        { status: 400 }
      )
    }

    // Buscar tipos de work item disponíveis no projeto Azure DevOps
    const typesUrl = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitemtypes?api-version=7.1-preview.2`

    console.log('📡 [WORK ITEM TYPES] Consultando Azure DevOps:', typesUrl)

    const response = await fetch(typesUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [WORK ITEM TYPES] Erro na API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })

      return NextResponse.json(
        {
          success: false,
          error: `Azure DevOps API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      )
    }

    const typesData = await response.json()

    // Extrair informações relevantes dos tipos
    const workItemTypes =
      typesData.value?.map((type: any) => ({
        name: type.name,
        description: type.description || '',
        icon: type.icon?.url || '',
        color: type.color || '',
        isDisabled: type.isDisabled || false,
        xmlForm: type.xmlForm || '',
      })) || []

    console.log(
      '✅ [WORK ITEM TYPES] Tipos encontrados:',
      workItemTypes.map((t: any) => t.name)
    )

    return NextResponse.json({
      success: true,
      workItemTypes,
      metadata: {
        organization,
        project,
        totalTypes: workItemTypes.length,
        availableTypes: workItemTypes
          .filter((t: any) => !t.isDisabled)
          .map((t: any) => t.name),
      },
    })
  } catch (error) {
    console.error('❌ [API] Erro ao descobrir tipos de work item:', error)
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
