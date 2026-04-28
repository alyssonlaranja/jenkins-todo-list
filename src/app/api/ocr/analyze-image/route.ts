import { NextRequest, NextResponse } from 'next/server'
import { AzureOpenAI } from 'openai'

// ============================================================================
// TYPES
// ============================================================================

interface ImageAnalysisResponse {
  success: boolean
  description?: string
  error?: string
  processingTimeMs?: number
}

// ============================================================================
// CONFIG
// ============================================================================

const IMAGE_ANALYSIS_PROMPT = `Analise esta imagem de forma objetiva:
1. Descreva o conteúdo principal (1-2 frases)
2. Extraia texto visível importante
3. Se houver dados/gráficos, liste os valores principais
Resposta em Markdown, máximo 300 palavras.`

const MAX_TOKENS = 1000
const SUPPORTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAzureOpenAIClient(): AzureOpenAI | null {
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const resourceName = process.env.AZURE_RESOURCE_NAME
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'

  if (!apiKey || !resourceName) {
    console.error('[OCR] Missing Azure OpenAI configuration')
    return null
  }

  return new AzureOpenAI({
    apiKey,
    endpoint: `https://${resourceName}.openai.azure.com`,
    apiVersion,
  })
}

async function analyzeImageWithVision(
  imageBase64: string,
  mimeType: string,
  deploymentName: string
): Promise<string> {
  const client = getAzureOpenAIClient()
  if (!client) {
    throw new Error('Azure OpenAI client not configured')
  }

  const response = await client.chat.completions.create({
    model: deploymentName,
    max_completion_tokens: MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: IMAGE_ANALYSIS_PROMPT },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: 'auto',
            },
          },
        ],
      },
    ],
  })

  return (
    response.choices[0]?.message?.content ||
    'Não foi possível analisar a imagem.'
  )
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET - Health check
 */
export async function GET(): Promise<NextResponse> {
  const hasConfig = !!(
    process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_RESOURCE_NAME
  )

  return NextResponse.json({
    status: hasConfig ? 'available' : 'not_configured',
    configured: hasConfig,
    supportedTypes: SUPPORTED_TYPES,
  })
}

/**
 * POST - Analyze image with GPT Vision
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ImageAnalysisResponse>> {
  const startTime = Date.now()

  try {
    // Check configuration
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_RESOURCE_NAME) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Serviço de análise de imagem não configurado. Verifique as variáveis de ambiente Azure OpenAI.',
        },
        { status: 503 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma imagem enviada' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!SUPPORTED_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Tipo de arquivo não suportado: ${imageFile.type}. Tipos aceitos: ${SUPPORTED_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `Arquivo muito grande. Tamanho máximo: 20MB`,
        },
        { status: 400 }
      )
    }

    console.log(
      `[OCR Analyze] Processing image: ${imageFile.name} (${imageFile.type}, ${imageFile.size} bytes)`
    )

    // Convert to base64
    const arrayBuffer = await imageFile.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Analyze with GPT Vision
    const description = await analyzeImageWithVision(
      base64,
      imageFile.type,
      deploymentName
    )

    const processingTimeMs = Date.now() - startTime
    console.log(
      `[OCR Analyze] Analysis complete in ${processingTimeMs}ms for ${imageFile.name}`
    )

    return NextResponse.json({
      success: true,
      description,
      processingTimeMs,
    })
  } catch (error) {
    const processingTimeMs = Date.now() - startTime
    console.error('[OCR Analyze] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro desconhecido ao analisar imagem',
        processingTimeMs,
      },
      { status: 500 }
    )
  }
}
