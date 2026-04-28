/**
 * API para extração de texto de documentos (PDF, DOCX, XLSX)
 *
 * Converte documentos binários para texto/markdown para uso como contexto no chat.
 * Suporta: PDF, DOCX, XLSX, XLS, TXT, MD
 */

import { NextRequest, NextResponse } from 'next/server'

import { convertToMarkdown } from '@/lib/upstream/document-processor'

// Extensões suportadas para extração de texto
const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'xls', 'txt', 'md', 'csv']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não fornecido' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          error: `Tipo de arquivo não suportado: ${extension}`,
          supportedTypes: SUPPORTED_EXTENSIONS,
        },
        { status: 400 }
      )
    }

    console.log('📄 [API] Extraindo texto do documento:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      extension,
    })

    // Converter arquivo para Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log('📄 [API] Buffer criado:', {
      fileName: file.name,
      bufferSize: buffer.length,
      extension,
    })

    // Converter para markdown/texto
    const extractedText = await convertToMarkdown(file.name, buffer)

    console.log('✅ [API] Texto extraído com sucesso:', {
      fileName: file.name,
      textLength: extractedText.length,
      preview: extractedText.substring(0, 200),
    })

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      extractedText,
      textLength: extractedText.length,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido'
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('❌ [API] Erro ao extrair texto:', {
      message: errorMessage,
      stack: errorStack,
      error: String(error),
    })

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: 'Não foi possível extrair o texto do documento',
        errorType: error?.constructor?.name || 'Unknown',
      },
      { status: 500 }
    )
  }
}
