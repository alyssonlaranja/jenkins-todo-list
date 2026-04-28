/**
 * Artifact Detail Sheet Component
 *
 * Side sheet that displays detailed artifact information including versions
 */
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Check, Copy, Database, Lock, Tag, Unlock, User } from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Separator } from '@/shared/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs'

import type { ArtifactDetail } from '../types'

interface ArtifactDetailSheetProps {
  artifact: ArtifactDetail | null
  isLoading: boolean
  open: boolean
  onClose: () => void
}

// Accessibility badge colors
const accessibilityColors: Record<string, string> = {
  SYSTEM: 'bg-purple-500/10 text-purple-500',
  LICENSE: 'bg-blue-500/10 text-blue-500',
  LICENSE_USER: 'bg-cyan-500/10 text-cyan-500',
  NAMESPACE: 'bg-green-500/10 text-green-500',
  NAMESPACE_USER: 'bg-amber-500/10 text-amber-500',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? (
        <Check className="size-4 text-green-500" />
      ) : (
        <Copy className="size-4" />
      )}
    </Button>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

export function ArtifactDetailSheet({
  artifact,
  isLoading,
  open,
  onClose,
}: ArtifactDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : artifact ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Database className="size-5 text-muted-foreground" />
                <SheetTitle className="truncate">{artifact.key}</SheetTitle>
                {artifact.locked && <Lock className="size-4 text-amber-500" />}
                {artifact.secret ? (
                  <Badge variant="destructive" className="text-xs">
                    Secret
                  </Badge>
                ) : (
                  <Unlock className="size-4 text-muted-foreground" />
                )}
              </div>
              <SheetDescription>
                {artifact.description || 'No description'}
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="details" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="value">Value</TabsTrigger>
                <TabsTrigger value="versions">
                  Versions ({artifact.versions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-4">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        className={
                          accessibilityColors[artifact.accessibility] ||
                          'bg-gray-500/10'
                        }
                      >
                        {artifact.accessibility}
                      </Badge>
                      {artifact.artifactTypeName && (
                        <Badge variant="outline">
                          {artifact.artifactTypeName}
                        </Badge>
                      )}
                      {artifact.version && (
                        <Badge variant="secondary">v{artifact.version}</Badge>
                      )}
                    </div>

                    <Separator />

                    {/* Info Grid */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DetailRow label="Artifact ID">
                        <div className="flex items-center gap-1">
                          <code className="max-w-[180px] truncate rounded bg-muted px-1 py-0.5 text-xs">
                            {artifact.id}
                          </code>
                          <CopyButton text={artifact.id} />
                        </div>
                      </DetailRow>

                      <DetailRow label="Type">
                        {artifact.type || artifact.artifactTypeName || 'N/A'}
                      </DetailRow>

                      <DetailRow label="Created">
                        {artifact.createdAt
                          ? format(new Date(artifact.createdAt), 'PPpp')
                          : 'N/A'}
                      </DetailRow>

                      <DetailRow label="Updated">
                        {artifact.updatedAt
                          ? format(new Date(artifact.updatedAt), 'PPpp')
                          : 'N/A'}
                      </DetailRow>

                      <DetailRow label="Created By">
                        <div className="flex items-center gap-1">
                          <User className="size-3" />
                          {artifact.createdByName || 'Unknown'}
                        </div>
                      </DetailRow>

                      <DetailRow label="Version Count">
                        {artifact.versionCount}
                      </DetailRow>
                    </div>

                    {/* Tags */}
                    {artifact.tags.length > 0 && (
                      <>
                        <Separator />
                        <DetailRow label="Tags">
                          <div className="flex flex-wrap gap-1">
                            {artifact.tags.map((tag, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                <Tag className="mr-1 size-3" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </DetailRow>
                      </>
                    )}

                    {/* Metadata */}
                    {artifact.metadata &&
                      Object.keys(artifact.metadata).length > 0 && (
                        <>
                          <Separator />
                          <DetailRow label="Metadata">
                            <pre className="max-h-[200px] overflow-auto rounded bg-muted p-2 text-xs">
                              {JSON.stringify(artifact.metadata, null, 2)}
                            </pre>
                          </DetailRow>
                        </>
                      )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="value" className="mt-4">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Artifact Value
                      </span>
                      {!artifact.secret && artifact.value && (
                        <CopyButton text={artifact.value} />
                      )}
                    </div>
                    {artifact.secret ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Lock className="mr-2 size-5" />
                        <span>Secret values are hidden for security</span>
                      </div>
                    ) : artifact.value ? (
                      <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-4 text-xs">
                        {artifact.value}
                      </pre>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        No value set
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="versions" className="mt-4">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {artifact.versions.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No version history available
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {artifact.versions.map(version => (
                        <div
                          key={version.id}
                          className={`rounded-lg border p-3 ${
                            version.isProduction
                              ? 'border-green-500/50 bg-green-500/5'
                              : 'border-border'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {version.version || 'No version label'}
                              </span>
                              {version.isProduction && (
                                <Badge
                                  variant="default"
                                  className="bg-green-500 text-xs"
                                >
                                  Production
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {version.createdAt
                                ? format(
                                    new Date(version.createdAt),
                                    'MMM d, yyyy HH:mm'
                                  )
                                : ''}
                            </span>
                          </div>
                          {version.createdByName && (
                            <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="size-3" />
                              {version.createdByName}
                            </div>
                          )}
                          {!artifact.secret && version.value && (
                            <pre className="max-h-[100px] overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">
                              {version.value.substring(0, 200)}
                              {version.value.length > 200 && '...'}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select an artifact to view details
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
