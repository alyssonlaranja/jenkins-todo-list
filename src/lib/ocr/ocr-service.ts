/**
 * OCR Service - Serviço Principal
 *
 * Orquestra múltiplos provedores de OCR com fallback automático:
 * 1. Azure AI Vision (primário - pago, cloud)
 * 2. GPT-4V (fallback - pago, cloud)
 *
 * @license Apache-2.0
 */

import { formatErrorMessage, getOcrConfig } from './ocr-config'
import type {
  OcrConfig,
  OcrError,
  OcrProgressCallback,
  OcrResult,
  OcrSource,
} from './types'

// ============================================================================
// MAIN OCR FUNCTION
// ============================================================================

/**
 * Executa OCR em uma imagem com fallback automático
 *
 * Ordem de tentativa:
 * 1. Azure AI Vision (se configurado)
 * 2. GPT-4V (se configurado)
 *
 * @param imageData - Buffer ou Blob da imagem
 * @param mimeType - Tipo MIME da imagem
 * @param options - Opções de configuração
 * @param onProgress - Callback de progresso
 */
export async function performOcr(
  imageData: Buffer | Blob,
  mimeType: string,
  options?: Partial<OcrConfig>,
  onProgress?: OcrProgressCallback
): Promise<OcrResult> {
  const config = { ...getOcrConfig(), ...options }
  const startTime = Date.now()

  // Validações iniciais
  const validationError = validateImage(imageData, mimeType, config)
  if (validationError) {
    return {
      success: false,
      text: '',
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
      source: 'azure-vision',
      error: validationError,
    }
  }

  let lastResult: OcrResult | null = null
  const sources: OcrSource[] = []

  // 1. Tentar Azure AI Vision como primário
  if (config.enableAzureVisionFallback && hasAzureVisionConfig()) {
    sources.push('azure-vision')
    console.log('[OCR] Tentando Azure AI Vision...')
    onProgress?.(10, 'Iniciando OCR com Azure Vision...')

    try {
      const azureResult = await extractTextWithAzureVision(
        imageData as Buffer,
        mimeType
      )

      if (azureResult.success && azureResult.text.trim()) {
        console.log('[OCR] Azure Vision: sucesso!')
        return azureResult
      }

      lastResult = azureResult
    } catch (error) {
      console.warn('[OCR] Azure Vision falhou:', error)
    }
  }

  // 2. Tentar GPT-4V como fallback
  if (config.enableGpt4vFallback && hasGpt4vConfig()) {
    sources.push('gpt4v')
    console.log('[OCR] Tentando GPT-4V...')
    onProgress?.(50, 'Tentando GPT-4 Vision...')

    try {
      const gpt4vResult = await extractTextWithGpt4V(
        imageData as Buffer,
        mimeType
      )

      if (gpt4vResult.success && gpt4vResult.text.trim()) {
        console.log('[OCR] GPT-4V: sucesso!')
        return gpt4vResult
      }

      lastResult = gpt4vResult
    } catch (error) {
      console.warn('[OCR] GPT-4V falhou:', error)
    }
  }

  // Nenhum provedor conseguiu extrair texto
  console.log('[OCR] Todos os provedores falharam')

  return (
    lastResult || {
      success: false,
      text: '',
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
      source: sources[0] || 'azure-vision',
      error: {
        code: 'UNREADABLE_IMAGE',
        message: formatErrorMessage('UNREADABLE_IMAGE'),
        retryable: true,
      },
    }
  )
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateImage(
  data: Buffer | Blob,
  mimeType: string,
  config: OcrConfig
): OcrError | null {
  // Validar tamanho
  const size = data instanceof Blob ? data.size : data.length

  if (size > config.maxFileSizeBytes) {
    const maxSizeMB = config.maxFileSizeBytes / (1024 * 1024)
    return {
      code: 'FILE_TOO_LARGE',
      message: formatErrorMessage('FILE_TOO_LARGE', { maxSize: maxSizeMB }),
      retryable: false,
    }
  }

  // Validar tipo
  if (!config.allowedMimeTypes.includes(mimeType)) {
    return {
      code: 'INVALID_FORMAT',
      message: formatErrorMessage('INVALID_FORMAT'),
      retryable: false,
    }
  }

  return null
}

// ============================================================================
// AZURE VISION (FALLBACK)
// ============================================================================

function hasAzureVisionConfig(): boolean {
  return !!(process.env.AZURE_VISION_ENDPOINT && process.env.AZURE_VISION_KEY)
}

async function extractTextWithAzureVision(
  imageBuffer: Buffer,
  mimeType: string
): Promise<OcrResult> {
  const startTime = Date.now()
  const endpoint = process.env.AZURE_VISION_ENDPOINT
  const key = process.env.AZURE_VISION_KEY

  if (!endpoint || !key) {
    return {
      success: false,
      text: '',
      confidence: 0,
      processingTimeMs: 0,
      source: 'azure-vision',
      error: {
        code: 'NOT_CONFIGURED',
        message: 'Azure Vision não configurado',
        retryable: false,
      },
    }
  }

  try {
    // Converter Buffer para Uint8Array (compatível com fetch body)
    const bodyData = new Uint8Array(imageBuffer)

    // 1. Iniciar análise
    const analyzeResponse = await fetch(
      `${endpoint}/vision/v3.2/read/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': mimeType,
          'Ocp-Apim-Subscription-Key': key,
        },
        body: bodyData,
      }
    )

    if (!analyzeResponse.ok) {
      throw new Error(`Azure Vision error: ${analyzeResponse.status}`)
    }

    // 2. Obter URL do resultado
    const operationLocation = analyzeResponse.headers.get('Operation-Location')
    if (!operationLocation) {
      throw new Error('Operation-Location not returned')
    }

    // 3. Poll até completar
    const result = await pollAzureResult(operationLocation, key)

    // 4. Extrair texto
    const lines =
      result.analyzeResult?.readResults?.flatMap(
        (r: { lines: Array<{ text: string; confidence?: number }> }) => r.lines
      ) || []

    const text = lines.map((l: { text: string }) => l.text).join('\n')
    const avgConfidence =
      lines.reduce(
        (sum: number, l: { confidence?: number }) => sum + (l.confidence || 0),
        0
      ) / (lines.length || 1)

    return {
      success: text.length > 0,
      text,
      confidence: avgConfidence,
      processingTimeMs: Date.now() - startTime,
      source: 'azure-vision',
    }
  } catch (error) {
    return {
      success: false,
      text: '',
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
      source: 'azure-vision',
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: error instanceof Error ? error.message : 'Azure Vision error',
        retryable: true,
      },
    }
  }
}

async function pollAzureResult(
  operationUrl: string,
  key: string,
  maxAttempts = 60,
  intervalMs = 500
): Promise<{
  analyzeResult?: {
    readResults?: Array<{ lines: Array<{ text: string; confidence?: number }> }>
  }
}> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(operationUrl, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    })

    if (!response.ok) {
      throw new Error(`Azure poll error: ${response.status}`)
    }

    const result = await response.json()

    if (result.status === 'succeeded') {
      return result
    }

    if (result.status === 'failed') {
      throw new Error('Azure Vision analysis failed')
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error('Timeout waiting for Azure Vision result')
}

// ============================================================================
// GPT-4V (ÚLTIMO RECURSO)
// ============================================================================

function hasGpt4vConfig(): boolean {
  return !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_RESOURCE_NAME)
}

async function extractTextWithGpt4V(
  imageBuffer: Buffer,
  mimeType: string
): Promise<OcrResult> {
  const startTime = Date.now()

  try {
    const { AzureOpenAI } = await import('openai')

    const client = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
      endpoint: `https://${process.env.AZURE_RESOURCE_NAME}.openai.azure.com`,
    })

    const base64Image = imageBuffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64Image}`

    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_GPT4V_DEPLOYMENT || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente especializado em OCR.
Extraia TODO o texto visível na imagem fornecida.
Mantenha a formatação original o máximo possível.
Se houver tabelas, preserve a estrutura usando markdown.
Se não conseguir ler alguma parte, indique com [ilegível].
Retorne APENAS o texto extraído, sem explicações adicionais.`,
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            {
              type: 'text',
              text: 'Extraia todo o texto visível nesta imagem.',
            },
          ],
        },
      ],
      max_tokens: 4096,
    })

    const text = response.choices[0]?.message?.content || ''

    return {
      success: text.length > 0,
      text,
      confidence: 0.85, // Estimativa para GPT-4V
      processingTimeMs: Date.now() - startTime,
      source: 'gpt4v',
      warnings: ['Texto extraído via GPT-4 Vision'],
    }
  } catch (error) {
    return {
      success: false,
      text: '',
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
      source: 'gpt4v',
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: error instanceof Error ? error.message : 'GPT-4V error',
        retryable: true,
      },
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica se um arquivo é uma imagem suportada para OCR
 */
export function isOcrSupportedImage(file: File): boolean {
  const config = getOcrConfig()
  return config.allowedMimeTypes.includes(file.type)
}

// Marcadores para contexto de imagem (invisível na UI, processado pelo backend)
export const IMAGE_CONTEXT_START = '<!-- IMAGE_CONTEXT_START -->'
export const IMAGE_CONTEXT_END = '<!-- IMAGE_CONTEXT_END -->'

// Marcadores para contexto de CSV (invisível na UI, processado pelo backend)
export const CSV_CONTEXT_START = '<!-- CSV_CONTEXT_START -->'
export const CSV_CONTEXT_END = '<!-- CSV_CONTEXT_END -->'

/**
 * Formata o texto extraído como contexto invisível para o agente
 * O contexto é envolvido em marcadores que serão removidos na exibição
 */
export function formatOcrContextMessage(text: string): string {
  return `${IMAGE_CONTEXT_START}
[Contexto de Imagem Analisada com GPT-5.1 Vision]

${text}
${IMAGE_CONTEXT_END}`
}

/**
 * Remove o contexto de imagem de uma mensagem para exibição na UI
 * Mantém apenas o conteúdo do usuário
 */
export function removeImageContext(message: string): string {
  const regex = new RegExp(
    `${IMAGE_CONTEXT_START}[\\s\\S]*?${IMAGE_CONTEXT_END}\\s*`,
    'g'
  )
  return message.replace(regex, '').trim()
}

/**
 * Verifica se uma mensagem contém contexto de imagem
 */
export function hasImageContext(message: string): boolean {
  return message.includes(IMAGE_CONTEXT_START)
}

/**
 * Remove o contexto de CSV de uma mensagem para exibição na UI
 * Mantém apenas o conteúdo do usuário
 */
export function removeCsvContext(message: string): string {
  const regex = new RegExp(
    `${CSV_CONTEXT_START}[\\s\\S]*?${CSV_CONTEXT_END}\\s*`,
    'g'
  )
  return message.replace(regex, '').trim()
}

/**
 * Verifica se uma mensagem contém contexto de CSV
 */
export function hasCsvContext(message: string): boolean {
  return message.includes(CSV_CONTEXT_START)
}

/**
 * Remove tanto contexto de imagem quanto de CSV de uma mensagem
 */
export function removeAllContexts(message: string): string {
  let result = removeImageContext(message)
  result = removeCsvContext(result)
  return result
}
