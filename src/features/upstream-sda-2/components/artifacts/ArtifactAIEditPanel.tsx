'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  CheckCircle,
  Eye,
  FileText,
  GitCompare,
  Loader2,
  Minus,
  Plus,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { DiagramAwareContent } from '@/shared/components/diagram/DiagramAwareContent'
import { tableComponents } from '@/shared/components/markdown/markdown-table-components'
import { useI18n } from '@/shared/hooks/use-i18n'
import { cn } from '@/shared/lib/utils'

import { removeArtifactMetadata } from '../../services/artifact.service'
import { useEditSessionStore } from '../../stores/editSessionStore'
import type { Artifact } from '../../types'

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  artifactContent?: string
  isEditable?: boolean
  isAccepted?: boolean
  isRejected?: boolean
  proposalId?: string
}

interface ArtifactAIEditPanelProps {
  artifact: Artifact
  onCancel: () => void
  onSendMessage?: (message: string) => Promise<string | null>
  onAcceptEdit?: (content: string) => Promise<void>
  isProcessing?: boolean
  streamingContent?: string
}

// ============================================================================
// Diff Types & Functions
// ============================================================================

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'context'
  content: string
  lineNumber?: number
}

function calculateDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines: string[] = oldText.split('\n')
  const newLines: string[] = newText.split('\n')
  const diff: DiffLine[] = []

  const oldSet = new Set<string>(oldLines)
  const newSet = new Set<string>(newLines)

  let oldIndex = 0
  let newIndex = 0

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const oldLine: string =
      oldIndex < oldLines.length ? oldLines[oldIndex]! : ''
    const newLine: string =
      newIndex < newLines.length ? newLines[newIndex]! : ''

    if (oldIndex >= oldLines.length) {
      diff.push({ type: 'added', content: newLine, lineNumber: newIndex + 1 })
      newIndex++
    } else if (newIndex >= newLines.length) {
      diff.push({ type: 'removed', content: oldLine, lineNumber: oldIndex + 1 })
      oldIndex++
    } else if (oldLine === newLine) {
      diff.push({ type: 'unchanged', content: oldLine })
      oldIndex++
      newIndex++
    } else if (!newSet.has(oldLine) && !oldSet.has(newLine)) {
      diff.push({ type: 'removed', content: oldLine, lineNumber: oldIndex + 1 })
      diff.push({ type: 'added', content: newLine, lineNumber: newIndex + 1 })
      oldIndex++
      newIndex++
    } else if (!newSet.has(oldLine)) {
      diff.push({ type: 'removed', content: oldLine, lineNumber: oldIndex + 1 })
      oldIndex++
    } else {
      diff.push({ type: 'added', content: newLine, lineNumber: newIndex + 1 })
      newIndex++
    }
  }

  return compactDiff(diff)
}

function compactDiff(diff: DiffLine[], contextLines: number = 2): DiffLine[] {
  const result: DiffLine[] = []
  const changeIndices = new Set<number>()

  diff.forEach((line, index) => {
    if (line.type === 'added' || line.type === 'removed') {
      changeIndices.add(index)
      for (let i = 1; i <= contextLines; i++) {
        if (index - i >= 0) changeIndices.add(index - i)
        if (index + i < diff.length) changeIndices.add(index + i)
      }
    }
  })

  if (changeIndices.size === 0) {
    return [{ type: 'unchanged', content: '(Nenhuma alteracao detectada)' }]
  }

  let lastIncluded = -1
  const sortedIndices = Array.from(changeIndices).sort((a, b) => a - b)

  for (const index of sortedIndices) {
    if (lastIncluded !== -1 && index > lastIncluded + 1) {
      const omitted = index - lastIncluded - 1
      result.push({
        type: 'context',
        content: `... ${omitted} linhas omitidas ...`,
      })
    }

    const line: DiffLine | undefined = diff[index]
    if (line === undefined) continue

    if (line.type === 'unchanged') {
      result.push({ type: 'context', content: line.content })
    } else {
      result.push(line)
    }
    lastIncluded = index
  }

  return result
}

function getDiffStats(diff: DiffLine[]): { added: number; removed: number } {
  return diff.reduce(
    (acc, line) => {
      if (line.type === 'added') acc.added++
      if (line.type === 'removed') acc.removed++
      return acc
    },
    { added: 0, removed: 0 }
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function DiffLineComponent({ line }: { line: DiffLine }) {
  const getLineStyles = () => {
    switch (line.type) {
      case 'added':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-l-4 border-green-500'
      case 'removed':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-l-4 border-red-500 line-through opacity-75'
      case 'context':
        return 'bg-secondary/30 text-muted-foreground italic'
      default:
        return 'text-foreground'
    }
  }

  const getIcon = () => {
    switch (line.type) {
      case 'added':
        return (
          <Plus
            size={12}
            className="shrink-0 text-green-600 dark:text-green-400"
          />
        )
      case 'removed':
        return (
          <Minus
            size={12}
            className="shrink-0 text-red-600 dark:text-red-400"
          />
        )
      default:
        return <span className="w-3" />
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 px-2 py-0.5 font-mono text-xs',
        getLineStyles()
      )}
    >
      {getIcon()}
      <span className="whitespace-pre-wrap break-all">
        {line.content || ' '}
      </span>
    </div>
  )
}

function ArtifactContentBox({
  content,
  originalContent,
  isEditable = false,
  isAccepted = false,
  isRejected = false,
  isAccepting = false,
  onAccept,
  onReject,
  onDelete,
}: {
  content: string
  originalContent?: string
  isEditable?: boolean
  isAccepted?: boolean
  isRejected?: boolean
  isAccepting?: boolean
  onAccept?: () => void
  onReject?: () => void
  onDelete?: () => void
}) {
  const [showFullContent, setShowFullContent] = useState(false)

  const diff = useMemo(() => {
    if (originalContent && isEditable && !isAccepted && !isRejected) {
      return calculateDiff(originalContent, content)
    }
    return null
  }, [originalContent, content, isEditable, isAccepted, isRejected])

  const diffStats = useMemo(() => {
    if (diff) return getDiffStats(diff)
    return { added: 0, removed: 0 }
  }, [diff])

  const getBoxStyles = () => {
    if (isAccepted) return 'border-green-500/30 bg-green-500/10'
    if (isRejected) return 'border-red-500/30 bg-red-500/10 opacity-75'
    if (isEditable) return 'border-primary/30 bg-primary/5'
    return 'border-border bg-secondary/30'
  }

  const getTextStyles = () => {
    if (isAccepted) return 'text-green-700 dark:text-green-400'
    if (isRejected) return 'text-red-700 dark:text-red-400'
    if (isEditable) return 'text-primary'
    return 'text-foreground'
  }

  const getBadgeStyles = () => {
    if (isAccepted) return 'bg-green-500/20 text-green-700 dark:text-green-400'
    if (isRejected) return 'bg-red-500/20 text-red-700 dark:text-red-400'
    return 'bg-primary/20 text-primary'
  }

  const renderMarkdownContent = () => (
    <article className="prose prose-sm max-w-none dark:prose-invert">
      <DiagramAwareContent
        content={content}
        markdownComponents={{
          ...tableComponents,
          h1: ({ children }) => (
            <h1 className="mb-2 text-lg font-bold text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-3 text-base font-semibold text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 mt-2 text-sm font-semibold text-foreground">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-0.5 pl-4 text-sm">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="text-muted-foreground">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
        }}
      />
    </article>
  )

  const renderDiffContent = () => (
    <div className="space-y-0">
      {diff?.map((line, index) => (
        <DiffLineComponent key={index} line={line} />
      ))}
    </div>
  )

  return (
    <div className={cn('mt-3 rounded-lg border p-4', getBoxStyles())}>
      <div className="mb-3 flex items-start gap-3">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            isAccepted
              ? 'bg-green-500/20'
              : isRejected
                ? 'bg-red-500/20'
                : isEditable
                  ? 'bg-primary/15'
                  : 'bg-secondary'
          )}
        >
          {isAccepted ? (
            <CheckCircle
              size={16}
              className="text-green-600 dark:text-green-400"
            />
          ) : isRejected ? (
            <X size={16} className="text-red-600 dark:text-red-400" />
          ) : diff && !showFullContent ? (
            <GitCompare
              size={16}
              className={isEditable ? 'text-primary' : 'text-muted-foreground'}
            />
          ) : (
            <FileText
              size={16}
              className={isEditable ? 'text-primary' : 'text-muted-foreground'}
            />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-semibold', getTextStyles())}>
              {isAccepted
                ? 'Edicao aceita'
                : isRejected
                  ? 'Edicao rejeitada'
                  : isEditable
                    ? showFullContent
                      ? 'Versao completa do artefato'
                      : 'Alteracoes propostas'
                    : 'Conteudo atual'}
            </span>
            {(isEditable || isAccepted || isRejected) && (
              <span
                className={cn('rounded px-2 py-0.5 text-xs', getBadgeStyles())}
              >
                {isAccepted
                  ? 'Aprovado'
                  : isRejected
                    ? 'Rejeitada'
                    : 'Proposta'}
              </span>
            )}
            {diff && !showFullContent && !isAccepted && !isRejected && (
              <div className="flex items-center gap-2 text-xs">
                {diffStats.added > 0 && (
                  <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                    <Plus size={10} />
                    {diffStats.added}
                  </span>
                )}
                {diffStats.removed > 0 && (
                  <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400">
                    <Minus size={10} />
                    {diffStats.removed}
                  </span>
                )}
              </div>
            )}
          </div>
          <div
            className={cn(
              'text-xs',
              isAccepted
                ? 'text-green-700 dark:text-green-400'
                : isRejected
                  ? 'text-red-700 dark:text-red-400'
                  : isEditable
                    ? 'text-primary/80'
                    : 'text-muted-foreground'
            )}
          >
            {isAccepted
              ? 'Artefato salvo com sucesso'
              : isRejected
                ? 'Esta proposta foi descartada'
                : isEditable
                  ? showFullContent
                    ? 'Visualizando resultado final'
                    : 'Revise as alteracoes abaixo'
                  : 'Versao original'}
          </div>
        </div>

        {diff && isEditable && !isAccepted && (
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title={showFullContent ? 'Ver alteracoes' : 'Ver versao completa'}
          >
            {showFullContent ? (
              <>
                <GitCompare size={12} />
                Ver diff
              </>
            ) : (
              <>
                <Eye size={12} />
                Ver completo
              </>
            )}
          </button>
        )}

        {isEditable && !isAccepted && onDelete && (
          <button
            onClick={onDelete}
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="max-h-[250px] overflow-y-auto rounded border border-border bg-background p-3">
        {diff && !showFullContent && !isAccepted && !isAccepting
          ? renderDiffContent()
          : renderMarkdownContent()}
      </div>

      {isAccepted ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <CheckCircle size={16} />
          <span className="font-medium">Edicao aceita e salva no artefato</span>
        </div>
      ) : isRejected ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
          <X size={16} />
          <span className="font-medium">Proposta rejeitada pelo usuario</span>
        </div>
      ) : (
        isEditable && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={onAccept}
              disabled={isAccepting}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                isAccepting
                  ? 'cursor-not-allowed bg-primary/60'
                  : 'bg-primary hover:bg-primary/80'
              )}
            >
              {isAccepting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Aceitar
                </>
              )}
            </button>
            <button
              onClick={onReject}
              disabled={isAccepting}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors',
                isAccepting
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-secondary'
              )}
            >
              <X size={14} />
              Rejeitar
            </button>
          </div>
        )
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ArtifactAIEditPanel({
  artifact,
  onCancel,
  onSendMessage,
  onAcceptEdit,
  isProcessing: externalProcessing = false,
  streamingContent = '',
}: ArtifactAIEditPanelProps) {
  const { formatDate: formatDateI18n, currentLanguage } = useI18n('pages')
  const [editRequest, setEditRequest] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [acceptingMessageId, setAcceptingMessageId] = useState<string | null>(
    null
  )
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const startSession = useEditSessionStore(state => state.startSession)
  const endSession = useEditSessionStore(state => state.endSession)
  const acceptProposal = useEditSessionStore(state => state.acceptProposal)
  const rejectProposal = useEditSessionStore(state => state.rejectProposal)

  useEffect(() => {
    startSession({
      id: artifact.id,
      title: artifact.title,
      type: artifact.type,
      content: artifact.content,
    })
    return () => {
      endSession()
    }
  }, [
    artifact.id,
    artifact.title,
    artifact.type,
    artifact.content,
    startSession,
    endSession,
  ])

  const formatTime = (timestamp: string) => {
    try {
      const timeFormat = currentLanguage === 'pt-BR' ? 'HH:mm' : 'h:mm a'
      return formatDateI18n(new Date(timestamp), timeFormat)
    } catch {
      return '--:--'
    }
  }

  useEffect(() => {
    if (messages.length === 0) {
      const initialMessage: ChatMessage = {
        id: `msg-initial`,
        role: 'system',
        content:
          'Este e o conteudo atual do artefato. Descreva as alteracoes que voce gostaria de fazer.',
        timestamp: new Date().toISOString(),
        artifactContent: artifact.content,
        isEditable: false,
      }
      setMessages([initialMessage])
    }
  }, [artifact.content, messages.length])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
  }, [messages, streamingContent, isProcessing, externalProcessing])

  const handleSubmitRequest = useCallback(async () => {
    if (!editRequest.trim()) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: editRequest.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setEditRequest('')
    setIsProcessing(true)

    if (editInputRef.current) {
      editInputRef.current.style.height = 'auto'
    }

    try {
      if (onSendMessage) {
        const response = await onSendMessage(userMessage.content)
        if (response) {
          const currentSession = useEditSessionStore.getState().session
          const lastProposal =
            currentSession?.proposals[currentSession.proposals.length - 1]

          const assistantMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content:
              'Aqui esta a versao atualizada com as alteracoes solicitadas:',
            timestamp: new Date().toISOString(),
            artifactContent: response,
            isEditable: true,
            proposalId: lastProposal?.id,
          }
          setMessages(prev => [...prev, assistantMessage])
        }
      } else {
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: 'A integracao com o agente de IA sera conectada em breve.',
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Erro ao processar solicitacao:', error)
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content:
          'Ocorreu um erro ao processar sua solicitacao. Por favor, tente novamente.',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }, [editRequest, onSendMessage])

  const handleAcceptEdit = useCallback(
    async (messageId: string) => {
      const message = messages.find(m => m.id === messageId)
      if (message?.artifactContent && onAcceptEdit) {
        setAcceptingMessageId(messageId)
        try {
          await onAcceptEdit(message.artifactContent)
          if (message.proposalId) {
            acceptProposal(message.proposalId)
          }
          setMessages(prev =>
            prev.map(msg =>
              msg.id === messageId
                ? { ...msg, isEditable: false, isAccepted: true }
                : msg
            )
          )
        } catch (error) {
          console.error('Erro ao aceitar edicao:', error)
        } finally {
          setAcceptingMessageId(null)
        }
      }
    },
    [messages, onAcceptEdit, acceptProposal]
  )

  const handleRejectEdit = useCallback(
    (messageId: string) => {
      const message = messages.find(m => m.id === messageId)
      if (message?.proposalId) {
        rejectProposal(message.proposalId)
      }
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, isEditable: false, isRejected: true }
            : msg
        )
      )
    },
    [messages, rejectProposal]
  )

  const processing = isProcessing || externalProcessing

  return (
    <div className="flex h-full flex-col">
      {/* Chat messages area */}
      <div
        ref={scrollContainerRef}
        className="relative min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
      >
        {messages.length === 0 && !processing && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <Sparkles className="mb-3 size-10 opacity-40" />
            <p className="text-sm font-medium">Edicao com IA</p>
            <p className="mt-1 text-xs">
              Descreva as alteracoes que voce gostaria de fazer no artefato.
            </p>
          </div>
        )}

        {messages.map(msg => {
          const displayContent = removeArtifactMetadata(msg.content)

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : ''}`}
            >
              <div
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {(msg.role === 'assistant' || msg.role === 'system') && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <span className="mb-1 block text-[10px] font-medium text-primary">
                      Edicao com IA
                    </span>
                  )}

                  <div
                    className={cn(
                      'rounded-xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-white [&_*]:text-white'
                        : 'bg-secondary/50'
                    )}
                  >
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          ...tableComponents,
                          h1: ({ children }) => (
                            <h1 className="mb-2 text-lg font-bold text-foreground">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="mb-2 mt-3 text-base font-semibold text-foreground">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="mb-1 mt-2 text-sm font-semibold text-foreground">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-2 list-disc space-y-0.5 pl-4 text-sm">
                              {children}
                            </ul>
                          ),
                          li: ({ children }) => (
                            <li className="text-muted-foreground">
                              {children}
                            </li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">
                              {children}
                            </strong>
                          ),
                          code: ({ children, className }) => {
                            const isInline = !className
                            return isInline ? (
                              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                                {children}
                              </code>
                            ) : (
                              <code className={className}>{children}</code>
                            )
                          },
                          pre: ({ children }) => (
                            <pre className="my-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                              {children}
                            </pre>
                          ),
                        }}
                      >
                        {displayContent}
                      </ReactMarkdown>
                    </div>

                    {msg.artifactContent && (
                      <ArtifactContentBox
                        content={msg.artifactContent}
                        originalContent={artifact.content}
                        isEditable={msg.isEditable}
                        isAccepted={msg.isAccepted}
                        isRejected={msg.isRejected}
                        isAccepting={acceptingMessageId === msg.id}
                        onAccept={() => handleAcceptEdit(msg.id)}
                        onReject={() => handleRejectEdit(msg.id)}
                        onDelete={() => handleRejectEdit(msg.id)}
                      />
                    )}
                  </div>

                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <User className="size-4 text-foreground" />
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {processing && streamingContent && !acceptingMessageId && (
          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Sparkles className="size-4 animate-pulse text-primary" />
            </div>
            <div className="max-w-[80%]">
              <div className="rounded-xl bg-secondary/50 px-4 py-3 text-sm leading-relaxed">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      ...tableComponents,
                      h1: ({ children }) => (
                        <h1 className="mb-2 text-lg font-bold text-foreground">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mb-2 mt-3 text-base font-semibold text-foreground">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mb-1 mt-2 text-sm font-semibold text-foreground">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-2 list-disc space-y-0.5 pl-4 text-sm">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-muted-foreground">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">
                          {children}
                        </strong>
                      ),
                      code: ({ children, className }) => {
                        const isInline = !className
                        return isInline ? (
                          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                            {children}
                          </code>
                        ) : (
                          <code className={className}>{children}</code>
                        )
                      },
                      pre: ({ children }) => (
                        <pre className="my-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {removeArtifactMetadata(streamingContent)}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {processing && !streamingContent && !acceptingMessageId && (
          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Sparkles className="size-4 animate-pulse text-primary" />
            </div>
            <div className="max-w-[80%]">
              <div className="rounded-xl bg-secondary/50 px-4 py-3 text-sm leading-relaxed">
                <div className="flex items-center gap-1">
                  <div className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <div className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <div className="size-2 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border bg-background px-6 py-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 shadow-sm">
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
            <Sparkles className="size-3" />
            IA
          </div>

          <div className="flex-1">
            <textarea
              ref={editInputRef}
              value={editRequest}
              onChange={e => {
                setEditRequest(e.target.value)
                if (editInputRef.current) {
                  editInputRef.current.style.height = 'auto'
                  const lineHeight = 20
                  const maxHeight = lineHeight * 4
                  editInputRef.current.style.height = `${Math.min(editInputRef.current.scrollHeight, maxHeight)}px`
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmitRequest()
                }
              }}
              placeholder="Ex: Adicione uma secao sobre testes de performance..."
              className="max-h-[80px] min-h-[24px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:ring-0"
              rows={1}
              disabled={processing}
            />
          </div>

          <button
            onClick={handleSubmitRequest}
            disabled={!editRequest.trim() || processing}
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
              !editRequest.trim() || processing
                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/80'
            )}
          >
            {processing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
