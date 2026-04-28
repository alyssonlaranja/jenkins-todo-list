'use client'

/**
 * Visual UI Components for Artifact Action Results
 *
 * Beautiful visual components for displaying artifact operations results
 * in the chat interface.
 */
import {
  CheckCircle2,
  Copy,
  FileCode,
  FileText,
  FolderOpen,
  Loader2,
  Package,
  Search,
  Settings,
} from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'

// ============================================================================
// TYPES
// ============================================================================

export interface ArtifactItem {
  key: string
  type?: string
  description?: string
  value?: string
}

export interface ArtifactSearchResult {
  artifacts: ArtifactItem[]
  searchTerm: string
}

export interface ArtifactReadResult {
  key: string
  type?: string
  description?: string
  value: string
}

export interface ArtifactCreatedResult {
  key: string
  type: string
  description?: string
}

// ============================================================================
// CONFIG
// ============================================================================

const TYPE_ICONS: Record<string, React.ReactNode> = {
  document: <FileText className="size-4" />,
  template: <FileCode className="size-4" />,
  config: <Settings className="size-4" />,
  general: <Package className="size-4" />,
  feedback: <FileText className="size-4" />,
  signal: <FileText className="size-4" />,
}

const DEFAULT_TYPE_CONFIG = {
  bg: 'bg-gray-50',
  text: 'text-gray-600',
  border: 'border-gray-200',
}

const TYPE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  document: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
  template: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
  },
  config: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
  },
  general: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
  feedback: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
  },
  signal: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
  },
}

// Helper function to get type config with fallback
function getTypeConfig(type?: string) {
  return TYPE_COLORS[type || 'general'] || DEFAULT_TYPE_CONFIG
}

function getTypeIcon(type?: string) {
  return TYPE_ICONS[type || 'general'] || TYPE_ICONS.general
}

// ============================================================================
// SEARCH ARTIFACTS UI
// ============================================================================

interface ArtifactSearchUIProps {
  data?: ArtifactSearchResult
  status: 'complete' | 'inProgress' | 'executing'
}

export function ArtifactSearchUI({ data, status }: ArtifactSearchUIProps) {
  if (status !== 'complete' || !data) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Search className="size-5 animate-pulse text-blue-600" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Buscando artefatos...
              </span>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.artifacts.length === 0) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Search className="size-5 text-gray-400" />
            <span className="text-sm text-muted-foreground">
              Nenhum artefato encontrado para &quot;{data.searchTerm}&quot;
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-blue-200">
      <CardHeader className="border-b border-blue-100 bg-blue-50 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Search className="size-4 text-blue-600" />
          <span>
            {data.artifacts.length} artefato(s) para &quot;{data.searchTerm}
            &quot;
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {data.artifacts.slice(0, 10).map((artifact, index) => {
            const typeConfig = getTypeConfig(artifact.type)
            const icon = getTypeIcon(artifact.type)

            return (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50"
              >
                <div
                  className={`rounded p-1.5 ${typeConfig.bg} ${typeConfig.text}`}
                >
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{artifact.key}</p>
                  {artifact.description && (
                    <p className="truncate text-xs text-muted-foreground">
                      {artifact.description}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {artifact.type || 'general'}
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// LIST ARTIFACTS UI
// ============================================================================

interface ArtifactListUIProps {
  artifacts?: ArtifactItem[]
  status: 'complete' | 'inProgress' | 'executing'
}

export function ArtifactListUI({ artifacts, status }: ArtifactListUIProps) {
  if (status !== 'complete' || !artifacts) {
    return (
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <FolderOpen className="size-5 animate-pulse text-purple-600" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Listando artefatos...
              </span>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (artifacts.length === 0) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <FolderOpen className="size-5 text-gray-400" />
            <span className="text-sm text-muted-foreground">
              Nenhum artefato no namespace
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-purple-200">
      <CardHeader className="border-b border-purple-100 bg-purple-50 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FolderOpen className="size-4 text-purple-600" />
          <span>{artifacts.length} artefato(s) no namespace</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {artifacts.slice(0, 20).map((artifact, index) => {
            const typeConfig = getTypeConfig(artifact.type)
            const icon = getTypeIcon(artifact.type)

            return (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50"
              >
                <div
                  className={`rounded p-1.5 ${typeConfig.bg} ${typeConfig.text}`}
                >
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{artifact.key}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {artifact.type || 'general'}
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// READ ARTIFACT UI
// ============================================================================

interface ArtifactReadUIProps {
  data?: ArtifactReadResult
  status: 'complete' | 'inProgress' | 'executing'
}

export function ArtifactReadUI({ data, status }: ArtifactReadUIProps) {
  if (status !== 'complete' || !data) {
    return (
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="size-5 animate-pulse text-gray-600" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Lendo artefato...
              </span>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const typeConfig = getTypeConfig(data.type)
  const icon = getTypeIcon(data.type)
  const truncatedValue =
    data.value.length > 500 ? data.value.substring(0, 500) + '...' : data.value

  const handleCopy = () => {
    navigator.clipboard.writeText(data.value)
  }

  return (
    <Card className={`overflow-hidden ${typeConfig.border}`}>
      <CardHeader
        className={`border-b px-4 py-3 ${typeConfig.bg} ${typeConfig.border}`}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className={typeConfig.text}>{icon}</span>
            <span className="truncate">{data.key}</span>
            <Badge variant="outline" className="text-xs">
              {data.type || 'general'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="size-8 p-0"
          >
            <Copy className="size-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {data.description && (
          <p className="mb-3 text-sm text-muted-foreground">
            {data.description}
          </p>
        )}
        <pre className="max-h-60 overflow-auto rounded-lg bg-muted p-3 text-xs">
          {truncatedValue}
        </pre>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CREATE ARTIFACT UI
// ============================================================================

interface ArtifactCreatedUIProps {
  data?: ArtifactCreatedResult
  status: 'complete' | 'inProgress' | 'executing'
}

export function ArtifactCreatedUI({ data, status }: ArtifactCreatedUIProps) {
  if (status !== 'complete' || !data) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Package className="size-5 animate-pulse text-green-600" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Criando artefato...
              </span>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const typeConfig = getTypeConfig(data.type)
  const icon = getTypeIcon(data.type)

  return (
    <Card className="overflow-hidden border-green-200">
      {/* Success header */}
      <div className="border-b border-green-100 bg-green-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-green-600" />
          <span className="font-medium text-green-700">
            Artefato criado com sucesso!
          </span>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 rounded-lg p-2 ${typeConfig.bg} ${typeConfig.text}`}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${typeConfig.text} border-current`}
              >
                📦 {data.type || 'general'}
              </Badge>
            </div>
            <p className="mt-2 truncate text-sm font-medium">{data.key}</p>
            {data.description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {data.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
