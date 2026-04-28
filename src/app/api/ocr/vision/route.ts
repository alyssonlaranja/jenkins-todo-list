/**
 * OCR Vision API Route
 *
 * Usa GPT-5.1 Vision para análise inteligente de imagens com reasoning.
 * Auto-detecta o tipo de conteúdo e extrai informações relevantes.
 *
 * @license Apache-2.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { AzureOpenAI } from 'openai'

// ============================================================================
// TYPES
// ============================================================================

interface VisionAnalysisResult {
  success: boolean
  text: string
  confidence: number
  processingTimeMs: number
  source: 'gpt5-vision'
  detectedType: string
  error?: {
    code: string
    message: string
  }
}

// ============================================================================
// UNIFIED INTELLIGENT PROMPT
// ============================================================================

const UNIFIED_VISION_PROMPT = `Você é um assistente avançado de análise de imagens, potencializado por GPT-5.1 com capacidades de reasoning.

PRIMEIRO, identifique automaticamente o tipo de conteúdo da imagem:
- GRÁFICO: barras, linhas, pizza, área, dispersão, histogramas, etc.
- TABELA: dados tabulares, planilhas, grades de dados
- DOCUMENTO: texto, formulários, contratos, notas, PDFs
- DIAGRAMA: fluxogramas, arquitetura de software, processos, ERDs
- INTERFACE: screenshots, UI/UX, dashboards, aplicativos
- CÓDIGO: snippets de código, terminais, IDEs
- OUTRO: fotos, ilustrações, arte, etc.

DEPOIS, extraia as informações de acordo com o tipo detectado:

### Para GRÁFICOS:
1. Identifique tipo de gráfico, título, subtítulo e legenda
2. Extraia TODOS os valores numéricos com seus rótulos exatos
3. Formate os dados em tabela Markdown preservando precisão
4. Calcule totais, médias ou percentuais quando relevante
5. Liste 3-4 insights principais baseados nos dados
6. Forneça um resumo analítico conciso

### Para TABELAS:
1. Extraia TODOS os dados preservando estrutura completa
2. Formate como tabela Markdown com alinhamento correto
3. Identifique padrões, totais, subtotais se houver
4. Destaque células importantes ou outliers

### Para DOCUMENTOS:
1. Extraia TODO o texto visível com alta precisão
2. Preserve formatação hierárquica (títulos, listas, parágrafos)
3. Use Markdown apropriado para estrutura
4. Indique texto ilegível com [ilegível]
5. Extraia metadados visíveis (datas, números, assinaturas)

### Para DIAGRAMAS:
1. Descreva a estrutura completa e fluxo
2. Liste todos os elementos/nós e suas conexões
3. Explique o processo, arquitetura ou lógica
4. Identifique pontos de decisão e loops

### Para INTERFACES:
1. Descreva os elementos UI visíveis
2. Extraia textos de labels, botões, menus, inputs
3. Identifique funcionalidades e estado da aplicação
4. Note erros ou mensagens exibidas

### Para CÓDIGO:
1. Extraia o código completo preservando indentação
2. Identifique a linguagem de programação
3. Descreva brevemente a funcionalidade
4. Note quaisquer erros ou warnings visíveis

## FORMATO DE SAÍDA:

**Tipo Detectado:** [tipo]

---

[Conteúdo extraído formatado em Markdown de alta qualidade]

---

**Resumo para Contexto:**
[Uma descrição concisa de 2-3 frases que um agente de IA pode usar para entender rapidamente o conteúdo da imagem e tomar decisões baseadas nela]`

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Validate environment
    // Usando EXATAMENTE as mesmas variáveis de ambiente que supervisor-bff
    const apiKey = process.env.AZURE_OPENAI_API_KEY
    const resourceName = process.env.AZURE_RESOURCE_NAME
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME
    const apiVersion =
      process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'

    if (!apiKey || !resourceName || !deployment) {
      return NextResponse.json(
        {
          success: false,
          text: '',
          confidence: 0,
          processingTimeMs: Date.now() - startTime,
          source: 'gpt5-vision',
          detectedType: 'unknown',
          error: {
            code: 'CONFIG_ERROR',
            message:
              'Azure OpenAI não configurado (AZURE_OPENAI_API_KEY, AZURE_RESOURCE_NAME, AZURE_OPENAI_DEPLOYMENT_NAME)',
          },
        } as VisionAnalysisResult,
        { status: 500 }
      )
    }

    // Parse request
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          text: '',
          confidence: 0,
          processingTimeMs: Date.now() - startTime,
          source: 'gpt5-vision',
          detectedType: 'unknown',
          error: {
            code: 'NO_IMAGE',
            message: 'Nenhuma imagem fornecida',
          },
        } as VisionAnalysisResult,
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        {
          success: false,
          text: '',
          confidence: 0,
          processingTimeMs: Date.now() - startTime,
          source: 'gpt5-vision',
          detectedType: 'unknown',
          error: {
            code: 'INVALID_FORMAT',
            message: 'Arquivo deve ser uma imagem',
          },
        } as VisionAnalysisResult,
        { status: 400 }
      )
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          text: '',
          confidence: 0,
          processingTimeMs: Date.now() - startTime,
          source: 'gpt5-vision',
          detectedType: 'unknown',
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Imagem muito grande. Máximo: 20MB',
          },
        } as VisionAnalysisResult,
        { status: 400 }
      )
    }

    // Convert to base64
    const base64Start = Date.now()
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`
    console.log(
      `[Vision API] ⏱️ Base64 conversion: ${Date.now() - base64Start}ms`
    )

    // Initialize Azure OpenAI client
    const client = new AzureOpenAI({
      apiKey,
      apiVersion,
      endpoint: `https://${resourceName}.openai.azure.com`,
    })

    const apiStart = Date.now()
    console.log(
      `[Vision API] Analyzing image with GPT-5.1 Vision, deployment: ${deployment}`
    )

    // Call GPT-5.1 Vision with unified prompt and reasoning capabilities
    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        {
          role: 'system',
          content: UNIFIED_VISION_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: 'Analise esta imagem, identifique o tipo de conteúdo e extraia todas as informações relevantes.',
            },
          ],
        },
      ],
      max_completion_tokens: 8192, // GPT-5.1 usa max_completion_tokens em vez de max_tokens
      temperature: 0.1,
    })

    const text = response.choices[0]?.message?.content || ''
    const apiTimeMs = Date.now() - apiStart
    const processingTimeMs = Date.now() - startTime

    console.log(
      `[Vision API] ⏱️ Azure API call: ${apiTimeMs}ms (${Math.round((apiTimeMs / processingTimeMs) * 100)}% of total)`
    )

    // Extract detected type from response
    const typeMatch = text.match(/\*\*Tipo Detectado:\*\*\s*([^\n]+)/i)
    const detectedType = typeMatch?.[1]?.trim() ?? 'general'

    console.log(
      `[Vision API] GPT-5.1 analysis complete in ${processingTimeMs}ms, detected type: ${detectedType}`
    )

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          text: '',
          confidence: 0,
          processingTimeMs,
          source: 'gpt5-vision',
          detectedType: 'unknown',
          error: {
            code: 'NO_CONTENT',
            message: 'Não foi possível extrair conteúdo da imagem',
          },
        } as VisionAnalysisResult,
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      text,
      confidence: 0.95,
      processingTimeMs,
      source: 'gpt5-vision',
      detectedType,
    } as VisionAnalysisResult)
  } catch (error) {
    console.error('[Vision API] Error:', error)

    const processingTimeMs = Date.now() - startTime
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido'

    return NextResponse.json(
      {
        success: false,
        text: '',
        confidence: 0,
        processingTimeMs,
        source: 'gpt5-vision',
        detectedType: 'unknown',
        error: {
          code: 'PROCESSING_ERROR',
          message: errorMessage,
        },
      } as VisionAnalysisResult,
      { status: 500 }
    )
  }
}
