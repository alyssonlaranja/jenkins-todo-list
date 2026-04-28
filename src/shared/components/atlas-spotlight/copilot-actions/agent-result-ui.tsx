'use client'

/**
 * Visual UI Components for Agent Execution Results
 *
 * Beautiful visual components for displaying agent execution results
 * in the chat interface.
 */
import { Bot, CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'

// ============================================================================
// TYPES
// ============================================================================

export interface AgentExecutionResult {
  success: boolean
  input: string
  output: string
  error?: string
}

// ============================================================================
// LOADING STATE
// ============================================================================

export function AgentExecutionLoading({ input }: { input?: string }) {
  return (
    <Card className="overflow-hidden border-indigo-200">
      <CardHeader className="border-b border-indigo-100 bg-indigo-50 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-indigo-700">
          <Bot className="size-5 animate-bounce" />
          <span>Executando Agente Utilitário...</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {input && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Comando:
              </p>
              <p className="mt-1 line-clamp-2 text-sm">{input}</p>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Processando com Standard Agents...</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// AGENT EXECUTION UI
// ============================================================================

interface AgentExecutionUIProps {
  data?: AgentExecutionResult
  status: 'complete' | 'inProgress' | 'executing'
  input?: string
}

export function AgentExecutionUI({
  data,
  status,
  input,
}: AgentExecutionUIProps) {
  if (status !== 'complete' || !data) {
    return <AgentExecutionLoading input={input} />
  }

  const isSuccess = data.success
  const truncatedOutput =
    data.output.length > 2000
      ? data.output.substring(0, 2000) + '\n\n[... resultado truncado ...]'
      : data.output

  return (
    <Card
      className={`overflow-hidden ${isSuccess ? 'border-green-200' : 'border-red-200'}`}
    >
      {/* Header */}
      <CardHeader
        className={`border-b px-4 py-3 ${
          isSuccess
            ? 'border-green-100 bg-green-50'
            : 'border-red-100 bg-red-50'
        }`}
      >
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {isSuccess ? (
            <>
              <CheckCircle2 className="size-5 text-green-600" />
              <span className="text-green-700">
                Agente executado com sucesso!
              </span>
            </>
          ) : (
            <>
              <XCircle className="size-5 text-red-600" />
              <span className="text-red-700">Erro na execução do agente</span>
            </>
          )}
        </CardTitle>
      </CardHeader>

      {/* Content */}
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Input */}
          {data.input && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">
                🎯 Comando enviado:
              </p>
              <p className="mt-1 line-clamp-2 text-sm">{data.input}</p>
            </div>
          )}

          {/* Output */}
          <div
            className={`rounded-lg p-3 ${isSuccess ? 'bg-green-50' : 'bg-red-50'}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <Sparkles
                className={`size-4 ${isSuccess ? 'text-green-600' : 'text-red-600'}`}
              />
              <span
                className={`text-xs font-medium ${isSuccess ? 'text-green-700' : 'text-red-700'}`}
              >
                {isSuccess ? 'Resultado:' : 'Erro:'}
              </span>
            </div>
            <div className="max-h-60 overflow-auto">
              <pre className="whitespace-pre-wrap text-sm">
                {isSuccess ? truncatedOutput : data.error || data.output}
              </pre>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
