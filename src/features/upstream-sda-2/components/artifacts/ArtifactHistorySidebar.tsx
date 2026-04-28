'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, Loader2, Pencil, User } from 'lucide-react'
import { toast } from 'sonner'

import { SDAServiceConfig } from '@/features/artifacts/services'
import {
  ArtifactService,
  type ArtifactVersionDto,
} from '@/features/artifacts/services/artifact.service'
import {
  getVersionDisplayLabel,
  type VersionLabelsMap,
} from '@/features/artifacts/types/version-labels.types'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

import { RenameVersionModal } from './RenameVersionModal'

interface ArtifactHistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  projectSlug?: string
  chatSlug?: string
  documentType?: string
  currentVersion?: number
  viewingVersionNumber?: number
  config: SDAServiceConfig | null
  onVersionSelect?: (version: ArtifactVersionDto) => void
  /** Callback chamado quando os labels de versão são atualizados */
  onLabelsChange?: (labels: VersionLabelsMap) => void
  /** Labels externos do componente pai para sincronização */
  externalVersionLabels?: VersionLabelsMap | null
}

export function ArtifactHistorySidebar({
  isOpen,
  onClose,
  projectSlug,
  chatSlug,
  documentType,
  currentVersion,
  viewingVersionNumber,
  config,
  onVersionSelect,
  onLabelsChange,
  externalVersionLabels,
}: ArtifactHistorySidebarProps) {
  const [versions, setVersions] = useState<ArtifactVersionDto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [artifactId, setArtifactId] = useState<string | null>(null)
  const [versionLabels, setVersionLabels] = useState<VersionLabelsMap | null>(
    null
  )

  // Estado do modal de renomear
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [selectedVersionForRename, setSelectedVersionForRename] =
    useState<ArtifactVersionDto | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)

  const artifactKey =
    projectSlug && chatSlug && documentType
      ? `document-${documentType}-${projectSlug}-${chatSlug}`
      : null

  useEffect(() => {
    const fetchVersions = async () => {
      // Só carregar quando abrir pela primeira vez ou quando explicitamente solicitado
      if (!isOpen || !config || !artifactKey || hasLoadedOnce) return

      setIsLoading(true)
      try {
        const artifactService = new ArtifactService({
          baseUrl: config.baseUrl,
          accessToken: config.accessToken,
          licenseId: config.licenseId,
          namespaceId: config.namespaceId,
        })

        const artifact = await artifactService.getByKey(artifactKey)
        setArtifactId(artifact.id)

        // Buscar labels customizados
        const labels = await artifactService.getVersionLabels(artifact.id)
        setVersionLabels(labels)

        const artifactVersions = await artifactService.getVersionsByArtifactId(
          artifact.id
        )

        const sortedVersions = [...artifactVersions].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })

        setVersions(sortedVersions)
        setHasLoadedOnce(true)
      } catch (error) {
        console.error('[ArtifactHistorySidebar] Erro ao buscar versões:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVersions()
  }, [isOpen, config, artifactKey, hasLoadedOnce])

  // Sincronizar labels externos do pai quando eles mudarem
  // Isso garante que após renomear, o estado local seja atualizado imediatamente
  useEffect(() => {
    if (externalVersionLabels) {
      setVersionLabels(externalVersionLabels)
    }
  }, [externalVersionLabels])

  // Resetar hasLoadedOnce quando fechar o sidebar para recarregar na próxima abertura
  useEffect(() => {
    if (!isOpen) {
      setHasLoadedOnce(false)
    }
  }, [isOpen])

  const handleVersionClick = useCallback(
    (version: ArtifactVersionDto) => {
      if (onVersionSelect) {
        onVersionSelect(version)
      }
    },
    [onVersionSelect]
  )

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    try {
      // Se a data não tiver 'Z' no final, adicionar para indicar UTC
      const isoString = dateString.endsWith('Z') ? dateString : `${dateString}Z`
      const date = new Date(isoString)
      // date-fns format já converte automaticamente para timezone local
      return format(date, "dd 'de' MMM. 'de' yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return ''
    }
  }

  const getStatusBadge = (index: number) => {
    if (index === 0)
      return { label: 'Atual', className: 'bg-orange-500 text-white' }
    return null
  }

  // Abre o modal de renomear
  const handleOpenRenameModal = useCallback(
    (e: React.MouseEvent, version: ArtifactVersionDto) => {
      e.stopPropagation() // Previne clique no card
      setSelectedVersionForRename(version)
      setRenameModalOpen(true)
    },
    []
  )

  // Processa renomeação via BFF
  const handleRenameVersion = useCallback(
    async (newLabel: string) => {
      if (!selectedVersionForRename || !artifactId || !config) return

      setIsRenaming(true)
      try {
        const response = await fetch(
          `/api/bff/artifacts/${artifactId}/versions/${selectedVersionForRename.id}/rename`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.accessToken}`,
              'x-cockpit-license-id': config.licenseId,
              'x-cockpit-namespace-id': config.namespaceId,
            },
            body: JSON.stringify({ newLabel }),
          }
        )

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Erro ao renomear versão')
        }

        // Atualizar labels localmente
        const updatedLabels: VersionLabelsMap = {
          ...versionLabels,
          [selectedVersionForRename.id]: {
            label: newLabel,
            renamedAt: result.data.renamedAt,
            renamedBy: result.data.renamedBy,
            renamedByName: result.data.renamedByName,
            previousLabel: result.data.previousLabel,
          },
        }
        setVersionLabels(updatedLabels)

        // Propagar atualização para o componente pai
        if (onLabelsChange) {
          onLabelsChange(updatedLabels)
        }

        toast.success('Versão renomeada com sucesso!', {
          description: `Novo nome: ${newLabel}`,
        })
      } catch (error) {
        console.error('[ArtifactHistorySidebar] Erro ao renomear:', error)
        toast.error('Erro ao renomear versão', {
          description:
            error instanceof Error ? error.message : 'Tente novamente',
        })
        throw error // Re-throw para o modal mostrar erro
      } finally {
        setIsRenaming(false)
      }
    },
    [
      selectedVersionForRename,
      artifactId,
      config,
      versionLabels,
      onLabelsChange,
    ]
  )

  if (!isOpen) return null

  return (
    <div className="flex h-full w-[420px] flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Clock className="size-5 text-orange-500" />
          Histórico de Versões
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {versions.length} {versions.length === 1 ? 'versão' : 'versões'} •
          Última atualização{' '}
          {versions[0]?.createdAt
            ? format(new Date(versions[0].createdAt), "dd 'de' MMM.", {
                locale: ptBR,
              })
            : ''}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="size-10 animate-spin text-orange-500" />
            <p className="mt-4 text-sm text-gray-500">
              Carregando histórico...
            </p>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="size-16 text-gray-300" />
            <p className="mt-4 text-sm font-medium text-gray-900">
              Nenhuma versão encontrada
            </p>
            <p className="mt-1 text-xs text-gray-500">
              O histórico estará disponível assim que houver alterações
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {versions.map((version, index) => {
              const versionNum = parseInt(version.version || '0')
              // Se viewingVersionNumber estiver definido, usar ele. Caso contrário, marcar o índice 0 (versão atual)
              const isViewing =
                viewingVersionNumber !== undefined
                  ? versionNum === viewingVersionNumber
                  : index === 0
              const statusBadge = getStatusBadge(index)

              // Usar label customizado se existir
              const displayLabel = getVersionDisplayLabel(
                version.id,
                version.version,
                versionLabels || undefined
              )

              return (
                <div
                  key={version.id}
                  className={cn(
                    'group relative w-full rounded-xl border-2 p-4 text-left transition-all',
                    isViewing
                      ? 'border-orange-500 bg-orange-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-orange-200 hover:shadow-sm'
                  )}
                >
                  {/* Timeline indicator */}
                  <div className="absolute -left-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center">
                    <div
                      className={cn(
                        'size-3 rounded-full border-2 border-white ring-2',
                        isViewing
                          ? 'bg-orange-500 ring-orange-500'
                          : 'bg-gray-300 ring-gray-300 group-hover:bg-orange-300 group-hover:ring-orange-300'
                      )}
                    />
                  </div>

                  {/* Clickable area para selecionar versão */}
                  <button
                    onClick={() => handleVersionClick(version)}
                    className="w-full text-left"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {statusBadge && (
                          <span
                            className={cn(
                              'rounded-lg px-3 py-1 text-sm font-semibold',
                              statusBadge.className
                            )}
                          >
                            {statusBadge.label}
                          </span>
                        )}
                        {/* Tag de versão (v1, v2, etc.) - ao lado do Atual ou acima do nome se não for atual */}
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-xs font-medium',
                            statusBadge
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600'
                          )}
                        >
                          v{version.version || versions.length - index}
                        </span>
                        {version.isProduction && !statusBadge && (
                          <span className="rounded-lg bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                            Produção
                          </span>
                        )}
                      </div>
                      {isViewing && (
                        <span className="text-xs font-medium text-orange-600">
                          Visualizando
                        </span>
                      )}
                    </div>

                    {/* Version Label - Nome customizado ou padrão */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                        {displayLabel}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="mt-3 space-y-1.5">
                      {/* Author & Date */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {version.createdByName && (
                          <div className="flex items-center gap-1.5">
                            <User className="size-3.5" />
                            <span>{version.createdByName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          <span>{formatDateTime(version.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Botão Renomear Versão */}
                  <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => handleOpenRenameModal(e, version)}
                      className="gap-1.5 text-xs text-gray-500 hover:text-orange-600"
                    >
                      <Pencil className="size-3.5" />
                      Renomear versão
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Renomear Versão */}
      {selectedVersionForRename && (
        <RenameVersionModal
          isOpen={renameModalOpen}
          onClose={() => {
            setRenameModalOpen(false)
            setSelectedVersionForRename(null)
          }}
          onConfirm={handleRenameVersion}
          versionId={selectedVersionForRename.id}
          currentLabel={getVersionDisplayLabel(
            selectedVersionForRename.id,
            selectedVersionForRename.version,
            versionLabels || undefined
          )}
          versionNumber={selectedVersionForRename.version}
          existingLabels={versionLabels || undefined}
          auditInfo={versionLabels?.[selectedVersionForRename.id]}
          isLoading={isRenaming}
        />
      )}
    </div>
  )
}
