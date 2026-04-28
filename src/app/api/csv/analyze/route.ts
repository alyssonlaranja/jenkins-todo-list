import { NextRequest, NextResponse } from 'next/server'
import { AzureOpenAI } from 'openai'

// ============================================================================
// TYPES
// ============================================================================

interface CsvAnalysisResponse {
  success: boolean
  analysis?: string
  rawContent?: string
  metadata?: {
    headers: string[]
    totalRows: number
    delimiter: string
    sampleData: string[][]
  }
  error?: string
  processingTimeMs?: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detecta delimitador do CSV (vírgula, ponto-e-vírgula, tab)
 */
function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/)[0] || ''

  const delimiters = [',', ';', '\t', '|']
  let bestDelimiter = ','
  let maxCount = 0

  for (const delimiter of delimiters) {
    const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || [])
      .length
    if (count > maxCount) {
      maxCount = count
      bestDelimiter = delimiter
    }
  }

  return bestDelimiter
}

/**
 * Faz parse básico do CSV
 */
function parseCsvBasics(content: string): {
  headers: string[]
  rows: string[][]
  totalRows: number
  delimiter: string
} {
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0, delimiter: ',' }
  }

  const delimiter = detectDelimiter(content)

  // Parse simples - não lida com campos com aspas/escapes complexos
  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const firstLine = lines[0]
  if (!firstLine) {
    return { headers: [], rows: [], totalRows: 0, delimiter }
  }

  const headers = parseRow(firstLine)
  const rows = lines.slice(1).map(line => parseRow(line))

  return {
    headers,
    rows,
    totalRows: rows.length,
    delimiter,
  }
}

/**
 * Extrai amostras únicas de uma coluna
 */
function getSampleValues(
  rows: string[][],
  columnIndex: number,
  maxSamples = 5
): string[] {
  const uniqueValues = new Set<string>()

  for (const row of rows) {
    if (row[columnIndex] && uniqueValues.size < maxSamples) {
      uniqueValues.add(row[columnIndex])
    }
  }

  return Array.from(uniqueValues)
}

function getAzureOpenAIClient(): AzureOpenAI | null {
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const resourceName = process.env.AZURE_RESOURCE_NAME
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'

  if (!apiKey || !resourceName) {
    console.error('[CSV Analyze] Missing Azure OpenAI configuration')
    return null
  }

  return new AzureOpenAI({
    apiKey,
    endpoint: `https://${resourceName}.openai.azure.com`,
    apiVersion,
  })
}

async function analyzeCsvWithGPT(
  headers: string[],
  sampleRows: string[][],
  totalRows: number,
  deploymentName: string
): Promise<string> {
  const client = getAzureOpenAIClient()
  if (!client) {
    throw new Error('Azure OpenAI client not configured')
  }

  // Preparar contexto para o modelo
  const headersInfo = headers
    .map(
      (h, i) => `${i + 1}. ${h}: ${getSampleValues(sampleRows, i).join(', ')}`
    )
    .join('\n')

  const sampleDataText = sampleRows
    .slice(0, 5)
    .map((row, i) => `Linha ${i + 1}: ${row.join(' | ')}`)
    .join('\n')

  const prompt = `Analise este arquivo CSV de forma concisa:

**Colunas (${headers.length}):**
${headersInfo}

**Amostra de dados (${Math.min(5, sampleRows.length)} de ${totalRows} linhas):**
${sampleDataText}

**Forneça:**
1. Descrição do que este CSV contém (1-2 frases)
2. Principais insights ou padrões observáveis
3. Tipo de dados de cada coluna relevante
4. Possíveis usos ou análises recomendadas

Seja breve e objetivo. Formate em Markdown.`

  const response = await client.chat.completions.create({
    model: deploymentName,
    max_completion_tokens: 1000, // Reduzido para respostas mais rápidas
    messages: [
      {
        role: 'system',
        content:
          'Analista de dados. Respostas objetivas em Markdown, máximo 200 palavras.',
      },
      { role: 'user', content: prompt },
    ],
  })

  return (
    response.choices[0]?.message?.content || 'Não foi possível analisar o CSV.'
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
  })
}

/**
 * POST - Analyze CSV file
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CsvAnalysisResponse>> {
  const startTime = Date.now()

  try {
    // Check configuration
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_RESOURCE_NAME) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Serviço de análise de CSV não configurado. Verifique as variáveis de ambiente Azure OpenAI.',
        },
        { status: 503 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nenhum arquivo CSV enviado' },
        { status: 400 }
      )
    }

    // Validate file type
    const isCSV =
      file.type === 'text/csv' ||
      file.type === 'application/csv' ||
      file.name.toLowerCase().endsWith('.csv')

    if (!isCSV) {
      return NextResponse.json(
        {
          success: false,
          error: `Tipo de arquivo não suportado: ${file.type}. Apenas arquivos .csv são aceitos.`,
        },
        { status: 400 }
      )
    }

    console.log(
      `[CSV Analyze] Processing file: ${file.name} (${file.type}, ${file.size} bytes)`
    )

    // Read file content
    const content = await file.text()

    if (!content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Arquivo CSV vazio' },
        { status: 400 }
      )
    }

    // Parse CSV
    const { headers, rows, totalRows, delimiter } = parseCsvBasics(content)

    if (headers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Não foi possível detectar colunas no CSV' },
        { status: 400 }
      )
    }

    console.log(
      `[CSV Analyze] Parsed: ${headers.length} columns, ${totalRows} rows, delimiter: "${delimiter}"`
    )

    // Analyze with GPT
    const analysis = await analyzeCsvWithGPT(
      headers,
      rows,
      totalRows,
      deploymentName
    )

    const processingTimeMs = Date.now() - startTime
    console.log(
      `[CSV Analyze] Analysis complete in ${processingTimeMs}ms for ${file.name}`
    )

    return NextResponse.json({
      success: true,
      analysis,
      rawContent: content,
      metadata: {
        headers,
        totalRows,
        delimiter,
        sampleData: rows.slice(0, 10),
      },
      processingTimeMs,
    })
  } catch (error) {
    const processingTimeMs = Date.now() - startTime
    console.error('[CSV Analyze] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro desconhecido ao analisar CSV',
        processingTimeMs,
      },
      { status: 500 }
    )
  }
}
