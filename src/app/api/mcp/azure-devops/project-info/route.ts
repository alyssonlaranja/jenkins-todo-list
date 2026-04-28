// ============================================================================
// API Route: Azure DevOps Project Info
// ============================================================================
// Endpoint para detectar process template e work item types do projeto

import { NextRequest, NextResponse } from 'next/server'

import { AzureDevOpsProcessService } from '@/features/upstream-sda-2/services/azure-devops-process.service'
import type {
  ProcessDetectionOptions,
  ProjectInfoApiResponse,
} from '@/features/upstream-sda-2/types/azure-devops-process.types'

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parâmetros obrigatórios
    const organization = searchParams.get('organization')
    const projectId = searchParams.get('projectId')

    // Parâmetros opcionais
    const pat = searchParams.get('pat')
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    const includeDisabled = searchParams.get('includeDisabled') === 'true'

    // Validação
    if (!organization) {
      return NextResponse.json<ProjectInfoApiResponse>(
        {
          success: false,
          error: 'Parâmetro "organization" é obrigatório',
          errorCode: 'MISSING_ORGANIZATION',
        },
        { status: 400 }
      )
    }

    if (!projectId) {
      return NextResponse.json<ProjectInfoApiResponse>(
        {
          success: false,
          error: 'Parâmetro "projectId" é obrigatório',
          errorCode: 'MISSING_PROJECT_ID',
        },
        { status: 400 }
      )
    }

    // PAT pode vir do header Authorization ou do query param
    let effectivePat = pat
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      effectivePat = authHeader.slice(7)
    }

    if (!effectivePat) {
      return NextResponse.json<ProjectInfoApiResponse>(
        {
          success: false,
          error:
            'Personal Access Token (PAT) é obrigatório. Envie via query param "pat" ou header "Authorization: Bearer <PAT>"',
          errorCode: 'MISSING_PAT',
        },
        { status: 401 }
      )
    }

    // Criar serviço e detectar processo
    const service = new AzureDevOpsProcessService(organization, effectivePat)

    const options: ProcessDetectionOptions = {
      forceRefresh,
      includeDisabled,
    }

    const processInfo = await service.detectProjectProcess(
      projectId,
      projectId, // projectName - será atualizado se disponível
      options
    )

    return NextResponse.json<ProjectInfoApiResponse>({
      success: true,
      data: processInfo,
    })
  } catch (error) {
    console.error('[API] Error detecting project process:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido'

    // Verificar tipo de erro
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json<ProjectInfoApiResponse>(
        {
          success: false,
          error: 'PAT inválido ou sem permissões suficientes',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      )
    }

    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      return NextResponse.json<ProjectInfoApiResponse>(
        {
          success: false,
          error: 'Projeto não encontrado',
          errorCode: 'PROJECT_NOT_FOUND',
        },
        { status: 404 }
      )
    }

    return NextResponse.json<ProjectInfoApiResponse>(
      {
        success: false,
        error: errorMessage,
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST Handler (para compatibilidade com verificação)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { organization, projectId, pat, expectedProcess = 'Agile' } = body

    // Validação
    if (!organization || !projectId || !pat) {
      return NextResponse.json<ProjectInfoApiResponse>(
        {
          success: false,
          error: 'Parâmetros organization, projectId e pat são obrigatórios',
          errorCode: 'MISSING_PARAMS',
        },
        { status: 400 }
      )
    }

    // Criar serviço
    const service = new AzureDevOpsProcessService(organization, pat)

    // Detectar processo
    const processInfo = await service.detectProjectProcess(projectId, projectId)

    // Verificar compatibilidade
    const compatibility = service.checkCompatibility(
      processInfo,
      expectedProcess
    )

    return NextResponse.json({
      success: true,
      data: {
        processInfo,
        compatibility,
      },
    })
  } catch (error) {
    console.error('[API] Error in POST project-info:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
