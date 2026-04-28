/**
 * OCR API Endpoint
 *
 * POST /api/ocr - Processa imagem e extrai texto
 * GET /api/ocr - Health check e status dos provedores
 *
 * Este endpoint serve como ponto de entrada para Azure Vision e GPT-4V
 */

import { NextRequest, NextResponse } from 'next/server'

import { getOcrConfig, performOcr } from '@/lib/ocr'

export const maxDuration = 60 // Vercel timeout
export const dynamic = 'force-dynamic'

// ============================================================================
// POST - OCR Processing
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Arquivo não fornecido',
            retryable: false,
          },
        },
        { status: 400 }
      )
    }

    console.log(
      `[OCR API] Recebido: ${file.name} (${file.type}, ${file.size} bytes)`
    )

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Processar com Azure Vision ou GPT-4V
    const result = await performOcr(buffer, file.type)

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 422 })
    }
  } catch (error) {
    console.error('[OCR API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: 'Erro interno ao processar imagem',
          retryable: true,
        },
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Health Check
// ============================================================================

export async function GET() {
  const config = getOcrConfig()

  const hasAzureVision = !!(
    process.env.AZURE_VISION_ENDPOINT && process.env.AZURE_VISION_KEY
  )
  const hasGpt4v = !!(
    process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_RESOURCE_NAME
  )

  return NextResponse.json({
    status: 'ok',
    providers: {
      azureVision: hasAzureVision ? 'configured' : 'not_configured',
      gpt4vFallback: hasGpt4v ? 'configured' : 'not_configured',
    },
    config: {
      maxFileSizeMB: config.maxFileSizeBytes / (1024 * 1024),
      timeoutMs: config.timeoutMs,
      supportedFormats: config.allowedMimeTypes,
    },
    fallbackOrder: [
      config.enableAzureVisionFallback && hasAzureVision && 'azure-vision',
      config.enableGpt4vFallback && hasGpt4v && 'gpt4v',
    ].filter(Boolean),
  })
}
