/**
 * Artifact Card Component
 *
 * Displays a single artifact in a card format with key information
 */
'use client'

import { format } from 'date-fns'
import { Database, Eye, Lock, Tag, Unlock } from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'

import type { Artifact } from '../types'

interface ArtifactCardProps {
  artifact: Artifact
  onViewDetails: (artifact: Artifact) => void
}

// Accessibility badge colors
const accessibilityColors: Record<string, string> = {
  SYSTEM: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
  LICENSE: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  LICENSE_USER: 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20',
  NAMESPACE: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  NAMESPACE_USER: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20',
}

export function ArtifactCard({ artifact, onViewDetails }: ArtifactCardProps) {
  const accessibilityColor =
    accessibilityColors[artifact.accessibility] ||
    'bg-gray-500/10 text-gray-500'

  return (
    <Card className="group transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Database className="size-4 shrink-0 text-muted-foreground" />
            <CardTitle className="truncate text-base font-medium">
              {artifact.key}
            </CardTitle>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {artifact.locked && <Lock className="size-4 text-amber-500" />}
            {artifact.secret ? (
              <Badge
                variant="outline"
                className="bg-red-500/10 text-xs text-red-500"
              >
                Secret
              </Badge>
            ) : (
              <Unlock className="size-4 text-muted-foreground" />
            )}
          </div>
        </div>
        <CardDescription className="mt-1 line-clamp-2">
          {artifact.description || 'No description'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Accessibility & Type */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className={accessibilityColor}>
            {artifact.accessibility}
          </Badge>
          {artifact.artifactTypeName && (
            <Badge variant="outline" className="text-xs">
              {artifact.artifactTypeName}
            </Badge>
          )}
          {artifact.version && (
            <Badge variant="outline" className="text-xs">
              v{artifact.version}
            </Badge>
          )}
        </div>

        {/* Tags */}
        {artifact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {artifact.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                <Tag className="mr-1 size-3" />
                {tag}
              </Badge>
            ))}
            {artifact.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{artifact.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Value Preview */}
        {!artifact.secret && artifact.value && (
          <div className="rounded-md bg-muted p-2">
            <code className="line-clamp-2 break-all text-xs text-muted-foreground">
              {artifact.value.substring(0, 100)}
              {artifact.value.length > 100 && '...'}
            </code>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-2">
          <div className="text-xs text-muted-foreground">
            {artifact.versionCount > 0 && (
              <span>
                {artifact.versionCount} version
                {artifact.versionCount > 1 ? 's' : ''}
              </span>
            )}
            {artifact.createdAt && (
              <span className="ml-2">
                {format(new Date(artifact.createdAt), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(artifact)}
            className="opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Eye className="mr-1 size-4" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
