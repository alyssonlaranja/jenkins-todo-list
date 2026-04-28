'use client'

import { useMemo, useState } from 'react'
import {
  Check,
  FileImage,
  FileSpreadsheet,
  FileText,
  Sparkles,
} from 'lucide-react'

import { hasCsvContext, hasImageContext, removeAllContexts } from '@/lib/ocr'
import { DiagramAwareContent } from '@/shared/components/diagram/DiagramAwareContent'
import { useI18n } from '@/shared/hooks/use-i18n'

import {
  detectArtifactsInMessage,
  isStructuredArtifact,
  removeArtifactMetadata,
} from '../../services/artifact.service'
import type { Message } from '../../types'
import {
  ArtifactProposal,
  type DetectedArtifact,
} from '../artifacts/ArtifactProposal'

// ============================================================================
// HELPERS
// ============================================================================

function getAttachmentIcon(type: string) {
  if (type.startsWith('image/')) {
    return FileImage
  }
  return FileText
}

// ============================================================================
// COMPONENT
// ============================================================================

interface ChatMessageProps {
  message: Message
  /** Keys dos artefatos já aceitos (sincronizado com Cockpit) */
  acceptedArtifactKeys?: string[]
  /** Keys dos artefatos já rejeitados (sincronizado com Cockpit) */
  rejectedArtifactKeys?: string[]
  onArtifactAccept?: (artifact: DetectedArtifact) => void
  onArtifactReject?: (artifactId: string, artifact?: DetectedArtifact) => void
}

export function ChatMessage({
  message,
  acceptedArtifactKeys = [],
  rejectedArtifactKeys = [],
  onArtifactAccept,
  onArtifactReject,
}: ChatMessageProps) {
  const isUser = message.role === 'user'
  const { formatDate: formatDateI18n, currentLanguage } = useI18n('pages')

  // Estado local para artefatos (para gerenciar status aceito/rejeitado durante a sessão)
  const [localStatuses, setLocalStatuses] = useState<
    Record<string, 'pending' | 'approved' | 'rejected'>
  >({})

  // Detectar artefatos na mensagem do assistente
  const detectedArtifacts = useMemo(() => {
    if (isUser || !isStructuredArtifact(message.content)) {
      return []
    }
    return detectArtifactsInMessage(message.content, message.id)
  }, [isUser, message.content, message.id])

  // DEBUG: Log do status da mensagem ao renderizar
  useMemo(() => {
    if (detectedArtifacts.length > 0) {
      // eslint-disable-next-line no-console
      console.log('🔍 [ChatMessage] Renderizando mensagem com artefato:', {
        messageId: message.id,
        isArtifact: message.isArtifact,
        artifactType: message.artifactType,
        isAccepted: message.isAccepted,
        isRejected: message.isRejected,
        rejectedAt: message.rejectedAt,
        detectedArtifactsCount: detectedArtifacts.length,
      })
    }
  }, [message, detectedArtifacts])

  // Função para obter o status do artefato
  const getArtifactStatus = (
    artifact: DetectedArtifact
  ): 'pending' | 'approved' | 'rejected' => {
    // 1. PRIORIDADE: Verificar campos persistidos na mensagem (histórico do Cockpit)
    if (message.isAccepted === true) {
      return 'approved'
    }

    if (message.isRejected === true) {
      return 'rejected'
    }

    // 2. Verificar se foi aceito via acceptedArtifactKeys (durante a sessão)
    const isThisArtifactAccepted = acceptedArtifactKeys.includes(artifact.id)
    if (isThisArtifactAccepted) {
      return 'approved'
    }

    // 3. Verificar se foi rejeitado via rejectedArtifactKeys (durante a sessão)
    const isThisArtifactRejected = rejectedArtifactKeys.includes(artifact.id)
    if (isThisArtifactRejected) {
      return 'rejected'
    }

    // 4. Usar status local (durante a sessão)
    return localStatuses[artifact.id] || 'pending'
  }

  // Handler para aceitar artefato
  const handleAccept = (artifactId: string) => {
    const artifact = detectedArtifacts.find(a => a.id === artifactId)
    if (artifact) {
      setLocalStatuses(prev => ({ ...prev, [artifactId]: 'approved' }))
      onArtifactAccept?.({ ...artifact, status: 'approved' })
    }
  }

  // Handler para rejeitar artefato
  const handleReject = (artifactId: string) => {
    const artifact = detectedArtifacts.find(a => a.id === artifactId)
    setLocalStatuses(prev => ({ ...prev, [artifactId]: 'rejected' }))
    // Passar artefato completo para permitir indexação RAG
    if (artifact) {
      onArtifactReject?.(artifactId, artifact)
    } else {
      onArtifactReject?.(artifactId)
    }
  }

  const formatTime = (timestamp: string) => {
    // Format time - use 12-hour format for English, 24-hour for Portuguese
    const timeFormat = currentLanguage === 'pt-BR' ? 'HH:mm' : 'h:mm a'
    return formatDateI18n(new Date(timestamp), timeFormat)
  }

  // User message - right aligned, orange background (igual ao Figma)
  if (isUser) {
    const hasAttachments = message.attachments && message.attachments.length > 0
    // Remove contexto de imagem e CSV da exibição (mas mantém no backend)
    const displayContent = removeAllContexts(message.content)
    const hasVisionContext = hasImageContext(message.content)
    const hasCsvCtx = hasCsvContext(message.content)

    return (
      <div className="flex justify-end">
        <div className="max-w-[85%]">
          {/* Vision context indicator */}
          {hasVisionContext && (
            <div className="mb-2 flex items-center justify-end gap-1.5 text-xs text-purple-600">
              <Sparkles className="size-3" />
              <span>Contexto de imagem anexado</span>
            </div>
          )}

          {/* CSV context indicator */}
          {hasCsvCtx && (
            <div className="mb-2 flex items-center justify-end gap-1.5 text-xs text-emerald-600">
              <FileSpreadsheet className="size-3" />
              <span>Análise CSV anexada</span>
            </div>
          )}

          {/* Message content */}
          {displayContent && (
            <div className="rounded-lg bg-orange-500 px-4 py-3 text-white">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {displayContent}
              </p>
            </div>
          )}

          {/* Empty message with only vision context */}
          {!displayContent && hasVisionContext && !hasCsvCtx && (
            <div className="rounded-lg bg-purple-500 px-4 py-3 text-white">
              <p className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4" />
                Imagem analisada enviada como contexto
              </p>
            </div>
          )}

          {/* Empty message with only CSV context */}
          {!displayContent && hasCsvCtx && !hasVisionContext && (
            <div className="rounded-lg bg-emerald-500 px-4 py-3 text-white">
              <p className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="size-4" />
                CSV analisado enviado como contexto
              </p>
            </div>
          )}

          {/* Empty message with both contexts */}
          {!displayContent && hasVisionContext && hasCsvCtx && (
            <div className="rounded-lg bg-gradient-to-r from-purple-500 to-emerald-500 px-4 py-3 text-white">
              <p className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4" />
                Imagem e CSV analisados enviados como contexto
              </p>
            </div>
          )}

          {/* Attachment bubbles - below message */}
          {hasAttachments && (
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              {message.attachments!.map(attachment => {
                const Icon = getAttachmentIcon(attachment.type)
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <Icon className="size-4 text-gray-500" />
                    <span className="max-w-[150px] truncate text-xs font-medium text-gray-700">
                      {attachment.name}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <p className="mt-1 text-right text-xs text-gray-400">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    )
  }

  // Assistant message - left aligned, gray background, SEM barra vertical (igual ao Figma)
  return (
    <div className="flex flex-col">
      <div className="flex justify-start">
        <div className="max-w-[85%]">
          <div className="rounded-lg bg-gray-100 px-4 py-3">
            <div className="prose prose-sm max-w-none text-gray-800">
              <DiagramAwareContent
                content={removeArtifactMetadata(message.content)}
                markdownComponents={{
                  // Render checkmarks for items with ✅
                  p: ({ children }) => {
                    const content = String(children)
                    if (content.includes('✅')) {
                      const items = content.split('✅').filter(Boolean)
                      return (
                        <div className="space-y-1">
                          {items.map((item, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Check className="mt-0.5 size-4 shrink-0 text-green-500" />
                              <span>{item.trim()}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                    return <p className="mb-2 last:mb-0">{children}</p>
                  },
                  ul: ({ children }) => (
                    <ul className="my-2 ml-4 list-disc space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-2 ml-4 list-decimal space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">
                      {children}
                    </strong>
                  ),
                }}
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>

      {/* Propostas de artefatos detectados */}
      {detectedArtifacts.length > 0 && (
        <div className="mt-2 max-w-[85%]">
          {detectedArtifacts.map(artifact => {
            const status = getArtifactStatus(artifact)
            return (
              <ArtifactProposal
                key={artifact.id}
                artifact={{
                  ...artifact,
                  status,
                }}
                summaryBullets={message.artifactSummary}
                onAccept={handleAccept}
                onReject={handleReject}
                onDelete={status !== 'rejected' ? handleReject : undefined}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
