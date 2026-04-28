import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { organization, project, pat } = await request.json()

    console.log('🔍 [API] Testando conexão Azure DevOps:', {
      organization,
      project,
      hasPat: !!pat,
    })

    if (!organization || !project || !pat) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      )
    }

    // Testar conexão real com Azure DevOps REST API
    const testUrl = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitemtypes?api-version=7.1-preview.2`

    console.log('📡 [TEST CONNECTION] Testando:', testUrl)

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [TEST CONNECTION] Erro na API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })

      return NextResponse.json(
        {
          success: false,
          error: `Authentication failed: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      )
    }

    // Se chegou aqui, a conexão está funcionando
    // Aproveitar para buscar os tipos de work item disponíveis
    const typesData = await response.json()
    const workItemTypes =
      typesData.value
        ?.map((type: any) => ({
          name: type.name,
          description: type.description || '',
          isDisabled: type.isDisabled || false,
        }))
        .filter((type: any) => !type.isDisabled) || []

    console.log(
      '✅ [TEST CONNECTION] Conexão bem-sucedida. Tipos disponíveis:',
      workItemTypes.map((t: any) => t.name)
    )

    return NextResponse.json({
      success: true,
      message: 'Connection successful',
      organization,
      project,
      workItemTypes: workItemTypes.map((t: any) => t.name),
      metadata: {
        totalTypes: workItemTypes.length,
        connectionTested: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('❌ [API] Erro no teste de conexão:', error)
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
