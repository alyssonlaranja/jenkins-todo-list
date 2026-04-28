'use client'

import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { hideStreamingDiagramCode } from '@/shared/components/diagram/DiagramAwareContent'
import { tableComponents } from '@/shared/components/markdown/markdown-table-components'

import type { Agent } from '../../hooks/useAvailableAgents'
import { removeArtifactMetadata } from '../../services/artifact.service'
import type { Conversation } from '../../types'
import type { DetectedArtifact } from '../artifacts/ArtifactProposal'
import { ChatInput, type ProjectDocument } from './ChatInput'
import { ChatMessage } from './ChatMessage'

interface ChatAreaProps {
  conversation: Conversation | null
  onSendMessage: (
    message: string,
    attachments?: File[],
    selectedDocuments?: ProjectDocument[]
  ) => void
  isLoading?: boolean
  streamingContent?: string
  onArtifactAccept?: (artifact: DetectedArtifact) => void
  onArtifactReject?: (artifactId: string, artifact?: DetectedArtifact) => void
  /** Documentos disponíveis no projeto */
  projectDocuments?: ProjectDocument[]
  /** Se está carregando os documentos */
  isLoadingDocuments?: boolean
  /** Callback quando um documento do projeto é selecionado */
  onDocumentSelect?: (document: ProjectDocument) => void
  /** Callback para carregar documentos do projeto */
  onLoadDocuments?: () => void
  /** Callback quando imagens são anexadas (para processamento OCR) */
  onImagesAttached?: (images: Array<{ file: File; index: number }>) => void
  /** Callback quando arquivos de texto/CSV são anexados (para processamento) */
  onTextFilesAttached?: (files: Array<{ file: File; index: number }>) => void
  /** Callback quando um arquivo é removido (para cancelar processamento) */
  onFileRemoved?: (index: number, type: 'image' | 'text') => void
  /** NOVO: Seletor de agentes */
  selectedAgent?: string
  onAgentChange?: (agentId: string) => void
  availableAgents?: Agent[]
  /** Se está carregando um novo agente */
  isAgentLoading?: boolean
}

export function ChatArea({
  conversation,
  onSendMessage,
  isLoading = false,
  streamingContent = '',
  onArtifactAccept,
  onArtifactReject,
  projectDocuments = [],
  isLoadingDocuments = false,
  onDocumentSelect,
  onLoadDocuments,
  onImagesAttached,
  onTextFilesAttached,
  onFileRemoved,
  selectedAgent,
  onAgentChange,
  availableAgents = [],
  isAgentLoading = false,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll quando mensagens ou conteúdo streaming mudam
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    // Usa requestAnimationFrame para garantir que o DOM foi atualizado
    requestAnimationFrame(() => {
      // Scroll direto no container - mais confiável que scrollIntoView
      container.scrollTop = container.scrollHeight
    })
  }, [conversation?.messages, streamingContent, isLoading])

  // Empty State - New Chat (Novo chat) - Igual ao Figma
  if (!conversation || conversation.messages.length === 0) {
    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Novo chat</h2>
        </div>

        {/* Empty State - Centralizado */}
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <h2 className="mb-2 text-2xl font-light text-gray-300">
            Qual desafio vamos resolver hoje?
          </h2>
          <p className="text-sm text-gray-400">
            Descreva o contexto e nossos agentes irão ajudá-lo
          </p>
        </div>

        {/* Input */}
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          projectDocuments={projectDocuments}
          isLoadingDocuments={isLoadingDocuments}
          onDocumentSelect={onDocumentSelect}
          onLoadDocuments={onLoadDocuments}
          onImagesAttached={onImagesAttached}
          onTextFilesAttached={onTextFilesAttached}
          onFileRemoved={onFileRemoved}
          selectedAgent={selectedAgent}
          onAgentChange={onAgentChange}
          availableAgents={availableAgents}
          isAgentLoading={isAgentLoading}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Conversation Header - apenas título do chat */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-800">
          {conversation.title}
        </h2>
      </div>

      {/* Messages - sem barra vertical nas mensagens */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {conversation.messages.map(message => (
            <ChatMessage
              key={message.id}
              message={message}
              acceptedArtifactKeys={
                conversation.acceptedArtifacts?.map(a => a.artifactId) || []
              }
              rejectedArtifactKeys={
                conversation.rejectedArtifacts?.map(a => a.artifactId) || []
              }
              onArtifactAccept={onArtifactAccept}
              onArtifactReject={onArtifactReject}
            />
          ))}

          {/* Streaming content - mostra resposta em tempo real (plain text) */}
          {/* Diagramas são renderizados apenas após a mensagem completar (ChatMessage) */}
          {isLoading && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <div className="rounded-lg bg-gray-100 px-4 py-3">
                  <div className="prose prose-sm max-w-none text-gray-800">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={tableComponents}
                    >
                      {hideStreamingDiagramCode(
                        removeArtifactMetadata(streamingContent)
                      )}
                    </ReactMarkdown>
                    <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator - apenas dots quando não há streaming */}
          {isLoading && !streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <div className="size-1.5 animate-pulse rounded-full bg-gray-300" />
                    <div
                      className="size-1.5 animate-pulse rounded-full bg-gray-300"
                      style={{ animationDelay: '0.15s' }}
                    />
                    <div
                      className="size-1.5 animate-pulse rounded-full bg-gray-300"
                      style={{ animationDelay: '0.3s' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        projectDocuments={projectDocuments}
        isLoadingDocuments={isLoadingDocuments}
        onDocumentSelect={onDocumentSelect}
        onLoadDocuments={onLoadDocuments}
        onImagesAttached={onImagesAttached}
        onTextFilesAttached={onTextFilesAttached}
        onFileRemoved={onFileRemoved}
        selectedAgent={selectedAgent}
        onAgentChange={onAgentChange}
        availableAgents={availableAgents}
        isAgentLoading={isAgentLoading}
      />
    </div>
  )
}
