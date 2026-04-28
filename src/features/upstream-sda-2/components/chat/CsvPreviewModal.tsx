'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Check,
  Copy,
  Eye,
  FileSpreadsheet,
  Pencil,
  RefreshCw,
  Sparkles,
  Table2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import remarkGfm from 'remark-gfm'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'

// ============================================================================
// TYPES
// ============================================================================

interface CsvPreviewModalProps {
  /** Modal open state */
  open: boolean
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void
  /** CSV file being processed */
  csvFile: File | null
  /** Callback to insert analysis as context in chat */
  onInsertAsContext: (text: string, rawCsv: string) => void
  /** Callback when canceling/closing without inserting */
  onCancel: () => void
}

interface ColumnInfo {
  name: string
  inferredType: string
  description: string
  sampleValues: string[]
}

interface CsvAnalysisResult {
  success: boolean
  analysis?: {
    summary: string
    totalRows: number
    totalColumns: number
    columns: ColumnInfo[]
    dataInsights: string[]
    suggestedUseCases: string[]
    warnings: string[]
  }
  rawPreview?: string
  processingTimeMs: number
  error?: {
    code: string
    message: string
  }
}

interface ChartDataPoint {
  name: string
  value: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TYPE_COLORS: Record<string, string> = {
  text: 'bg-gray-100 text-gray-700',
  number: 'bg-blue-100 text-blue-700',
  date: 'bg-purple-100 text-purple-700',
  currency: 'bg-green-100 text-green-700',
  percentage: 'bg-yellow-100 text-yellow-700',
  boolean: 'bg-orange-100 text-orange-700',
  email: 'bg-pink-100 text-pink-700',
  url: 'bg-cyan-100 text-cyan-700',
  category: 'bg-indigo-100 text-indigo-700',
  id: 'bg-slate-100 text-slate-700',
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CsvPreviewModal({
  open,
  onOpenChange,
  csvFile,
  onInsertAsContext,
  onCancel,
}: CsvPreviewModalProps) {
  const [editedAnalysis, setEditedAnalysis] = useState('')
  const [rawCsvContent, setRawCsvContent] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] =
    useState<CsvAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Read raw CSV content when file changes
  useEffect(() => {
    if (csvFile) {
      csvFile.text().then(content => {
        setRawCsvContent(content)
      })
    } else {
      setRawCsvContent('')
    }
  }, [csvFile])

  // Handle AI Analysis with GPT-5.1
  const handleAnalyze = useCallback(async () => {
    if (!csvFile) return

    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysisResult(null)

    try {
      const formData = new FormData()
      formData.append('file', csvFile)

      const response = await fetch('/api/csv/analyze', {
        method: 'POST',
        body: formData,
      })

      const data: CsvAnalysisResult = await response.json()

      if (data.success && data.analysis) {
        setAnalysisResult(data)
        // Format analysis as editable text
        setEditedAnalysis(formatAnalysisForEdit(data.analysis))
      } else {
        setAnalysisError(data.error?.message || 'Falha na análise do CSV')
      }
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : 'Erro na análise do CSV'
      )
    } finally {
      setIsAnalyzing(false)
    }
  }, [csvFile])

  // Auto-analyze when modal opens with a file
  useEffect(() => {
    if (open && csvFile && !analysisResult && !isAnalyzing && !analysisError) {
      handleAnalyze()
    }
  }, [open, csvFile, analysisResult, isAnalyzing, analysisError, handleAnalyze])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setIsCopied(false)
      setAnalysisResult(null)
      setAnalysisError(null)
      setIsAnalyzing(false)
      setEditedAnalysis('')
      setRawCsvContent('')
    }
  }, [open])

  // Format analysis for editable textarea
  const formatAnalysisForEdit = (
    analysis: CsvAnalysisResult['analysis']
  ): string => {
    if (!analysis) return ''

    const lines: string[] = []

    lines.push(`## Resumo`)
    lines.push(analysis.summary)
    lines.push('')
    lines.push(
      `## Estrutura (${analysis.totalRows} linhas, ${analysis.totalColumns} colunas)`
    )
    lines.push('')

    analysis.columns.forEach(col => {
      lines.push(`- **${col.name}** [${col.inferredType}]: ${col.description}`)
    })

    if (analysis.dataInsights.length > 0) {
      lines.push('')
      lines.push(`## Insights`)
      analysis.dataInsights.forEach(insight => {
        lines.push(`- ${insight}`)
      })
    }

    if (analysis.suggestedUseCases.length > 0) {
      lines.push('')
      lines.push(`## Sugestões de Uso`)
      analysis.suggestedUseCases.forEach(useCase => {
        lines.push(`- ${useCase}`)
      })
    }

    return lines.join('\n')
  }

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editedAnalysis)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      // Clipboard copy failed silently
    }
  }, [editedAnalysis])

  // Handle insert as context
  const handleInsert = useCallback(() => {
    if (editedAnalysis.trim()) {
      onInsertAsContext(editedAnalysis.trim(), rawCsvContent)
      onOpenChange(false)
    }
  }, [editedAnalysis, rawCsvContent, onInsertAsContext, onOpenChange])

  // Handle close
  const handleClose = useCallback(() => {
    onCancel()
    onOpenChange(false)
  }, [onCancel, onOpenChange])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Generate chart data from CSV if suitable
  const chartData = useMemo((): ChartDataPoint[] | null => {
    if (!rawCsvContent || !analysisResult?.analysis) return null

    const { columns } = analysisResult.analysis
    // Find a numeric column and a categorical column for charting
    const numericCol = columns.find(
      c =>
        c.inferredType === 'number' ||
        c.inferredType === 'currency' ||
        c.inferredType === 'percentage'
    )
    const categoryCol = columns.find(
      c =>
        c.inferredType === 'text' ||
        c.inferredType === 'category' ||
        c.inferredType === 'id'
    )

    if (!numericCol) return null

    try {
      const lines = rawCsvContent.split('\n').filter(l => l.trim())
      if (lines.length < 2) return null

      // Detect delimiter
      const firstLine = lines[0]
      const delimiter = firstLine.includes('\t')
        ? '\t'
        : firstLine.includes(';')
          ? ';'
          : ','

      const headers = lines[0]
        .split(delimiter)
        .map(h => h.trim().replace(/^"|"$/g, ''))
      const numericIndex = headers.findIndex(
        h => h.toLowerCase() === numericCol.name.toLowerCase()
      )
      const categoryIndex = categoryCol
        ? headers.findIndex(
            h => h.toLowerCase() === categoryCol.name.toLowerCase()
          )
        : -1

      if (numericIndex === -1) return null

      const aggregated: Record<string, number> = {}

      // Process rows (max 50 for performance)
      const maxRows = Math.min(lines.length - 1, 50)
      for (let i = 1; i <= maxRows; i++) {
        const values = lines[i]
          .split(delimiter)
          .map(v => v.trim().replace(/^"|"$/g, ''))
        const numericValue = parseFloat(
          values[numericIndex]?.replace(/[^0-9.-]/g, '') || '0'
        )

        if (isNaN(numericValue)) continue

        const category =
          categoryIndex >= 0
            ? values[categoryIndex] || `Item ${i}`
            : `Item ${i}`

        // Aggregate by category
        if (aggregated[category]) {
          aggregated[category] += numericValue
        } else {
          aggregated[category] = numericValue
        }
      }

      // Convert to array and limit to top 10
      const entries = Object.entries(aggregated)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

      if (entries.length < 2) return null

      return entries
    } catch {
      return null
    }
  }, [rawCsvContent, analysisResult])

  // Render content based on state
  const renderContent = () => {
    // Processing state
    if (isAnalyzing) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-75" />
            <div className="relative rounded-full bg-emerald-100 p-4">
              <Sparkles className="size-8 text-emerald-600" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Analisando CSV com IA...
          </h3>
          <p className="text-sm text-gray-500">
            O GPT-5.1 está identificando padrões e estrutura dos dados
          </p>
          {csvFile && csvFile.size > 1024 * 1024 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-amber-700">
              <AlertTriangle className="size-4" />
              <span className="text-sm">
                Arquivo grande ({formatFileSize(csvFile.size)}) - pode demorar
                mais
              </span>
            </div>
          )}
        </div>
      )
    }

    // Error state
    if (analysisError) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 rounded-full bg-red-100 p-4">
            <AlertCircle className="size-8 text-red-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Erro na Análise
          </h3>
          <p className="mb-4 text-center text-sm text-gray-500">
            {analysisError}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            className="gap-2"
          >
            <RefreshCw className="size-4" />
            Tentar novamente
          </Button>
        </div>
      )
    }

    // Success state with results
    if (analysisResult?.analysis) {
      const { analysis } = analysisResult

      return (
        <div className="space-y-4">
          {/* Summary Card with Warnings Tooltip */}
          <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-emerald-600" />
                <span className="font-medium text-gray-900">Resumo</span>
              </div>
              {/* Warnings as Tooltip */}
              {analysis.warnings.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-help items-center gap-1 rounded-full bg-amber-100 px-2 py-1">
                        <AlertTriangle className="size-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700">
                          {analysis.warnings.length}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      className="max-w-xs bg-amber-50 text-amber-900"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold">Avisos:</p>
                        <ul className="list-inside list-disc space-y-1 text-sm">
                          {analysis.warnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-sm text-gray-700">{analysis.summary}</p>
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Table2 className="size-3" />
                {analysis.totalRows} linhas
              </span>
              <span>{analysis.totalColumns} colunas</span>
              <span>{analysisResult.processingTimeMs}ms</span>
            </div>
          </div>

          {/* Columns - Scrollable */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
              <Table2 className="size-4" />
              Estrutura das Colunas ({analysis.columns.length})
            </h4>
            <ScrollArea className="h-[140px] pr-2">
              <div className="space-y-2">
                {analysis.columns.map((col, index) => (
                  <div key={index} className="rounded-md border bg-gray-50 p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {col.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          TYPE_COLORS[col.inferredType] || TYPE_COLORS.text
                        }
                      >
                        {col.inferredType}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      {col.description}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Auto-generated Chart (if data is suitable) */}
          {chartData && chartData.length > 0 && (
            <div className="rounded-lg border p-4">
              <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
                <BarChart3 className="size-4 text-blue-600" />
                Visualização dos Dados
              </h4>
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontSize: 10 }}
                      tickFormatter={val =>
                        val.length > 12 ? `${val.slice(0, 12)}...` : val
                      }
                    />
                    <RechartsTooltip
                      formatter={(value: number) => [
                        value.toLocaleString('pt-BR'),
                        'Valor',
                      ]}
                      contentStyle={{
                        fontSize: '12px',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Analysis with Markdown/Edit Toggle */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Análise Gerada
              </label>
              <div className="flex items-center gap-1">
                <Button
                  variant={isEditMode ? 'ghost' : 'secondary'}
                  size="sm"
                  onClick={() => setIsEditMode(false)}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <Eye className="size-3" />
                  Visualizar
                </Button>
                <Button
                  variant={isEditMode ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setIsEditMode(true)}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <Pencil className="size-3" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  {isCopied ? (
                    <>
                      <Check className="size-3" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </div>
            {isEditMode ? (
              <Textarea
                value={editedAnalysis}
                onChange={e => setEditedAnalysis(e.target.value)}
                className="h-[220px] min-h-[180px] resize-none font-mono text-sm"
                placeholder="Análise do CSV..."
              />
            ) : (
              <ScrollArea className="h-[220px] rounded-md border bg-gray-50 p-3">
                <div className="prose prose-sm max-w-none text-gray-700 prose-headings:font-semibold prose-headings:text-gray-900 prose-h2:mb-2 prose-h2:mt-3 prose-h2:text-base prose-ul:my-1 prose-li:my-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {editedAnalysis}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            )}
            <p className="text-xs text-gray-500">
              {isEditMode
                ? '✏️ Editando análise. '
                : '👁️ Visualizando markdown. '}
              O CSV + esta análise serão enviados como contexto.
            </p>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-emerald-600" />
            Análise de CSV
          </DialogTitle>
          <DialogDescription>
            {csvFile && (
              <span className="flex items-center gap-2 text-sm">
                <span className="font-medium">{csvFile.name}</span>
                <span className="text-gray-400">•</span>
                <span>{formatFileSize(csvFile.size)}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">{renderContent()}</ScrollArea>

        {/* Actions */}
        {analysisResult?.analysis && (
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={handleAnalyze} className="gap-2">
              <RefreshCw className="size-4" />
              Reanalisar
            </Button>
            <Button
              onClick={handleInsert}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={!editedAnalysis.trim()}
            >
              <Sparkles className="size-4" />
              Usar como Contexto
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
