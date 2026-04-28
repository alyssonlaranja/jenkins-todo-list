'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Code,
  Eye,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react'
import mermaid from 'mermaid'

import { cn } from '@/shared/lib/utils'

import { Button } from './button'
import { Card } from './card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { Textarea } from './textarea'

interface MermaidRendererProps {
  /** Mermaid diagram code */
  code: string
  /** Callback when code changes (for editable mode) */
  onChange?: (code: string) => void
  /** Whether the diagram is editable */
  editable?: boolean
  /** Custom className for the container */
  className?: string
  /** Diagram title for display */
  title?: string
  /** Placeholder text when empty */
  placeholder?: string
  /** Height of the preview area */
  previewHeight?: string
}

// Initialize mermaid once
let mermaidInitialized = false

const initMermaid = (theme: 'dark' | 'default') => {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme,
    securityLevel: 'loose',
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis',
    },
    sequence: {
      useMaxWidth: true,
    },
    gantt: {
      useMaxWidth: true,
    },
  })
  mermaidInitialized = true
}

export function MermaidRenderer({
  code,
  onChange,
  editable = false,
  className,
  title,
  placeholder = 'Enter Mermaid diagram code...',
  previewHeight = '300px',
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showCode, setShowCode] = useState(!code)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [renderKey, setRenderKey] = useState(0)

  // Detect theme
  const isDarkMode =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches

  const renderDiagram = useCallback(async () => {
    if (!code?.trim()) {
      setSvg('')
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Initialize mermaid with current theme
      if (!mermaidInitialized) {
        initMermaid(isDarkMode ? 'dark' : 'default')
      }

      // Generate unique ID for each render
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Render the diagram
      const { svg: renderedSvg } = await mermaid.render(id, code)
      setSvg(renderedSvg)
      setShowCode(false)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to render diagram'
      setError(errorMessage)
      setSvg('')
    } finally {
      setIsLoading(false)
    }
  }, [code, isDarkMode])

  // Render diagram when code changes
  useEffect(() => {
    const timer = setTimeout(() => {
      renderDiagram()
    }, 500) // Debounce rendering

    return () => clearTimeout(timer)
  }, [code, renderKey, renderDiagram])

  // Listen for theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      mermaidInitialized = false
      setRenderKey(k => k + 1)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const handleRefresh = () => {
    mermaidInitialized = false
    setRenderKey(k => k + 1)
  }

  const DiagramPreview = ({ fullscreen = false }: { fullscreen?: boolean }) => (
    <div
      className={cn(
        'relative rounded-lg border bg-card',
        fullscreen ? 'h-full' : ''
      )}
      style={fullscreen ? undefined : { minHeight: previewHeight }}
    >
      {/* Toolbar */}
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        {editable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCode(!showCode)}
            className="size-7 p-0"
            title={showCode ? 'Preview' : 'Edit code'}
          >
            {showCode ? (
              <Eye className="size-4" />
            ) : (
              <Code className="size-4" />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="size-7 p-0"
          title="Refresh diagram"
        >
          <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
        </Button>
        {!fullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(true)}
            className="size-7 p-0"
            title="Fullscreen"
          >
            <Maximize2 className="size-4" />
          </Button>
        )}
        {fullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(false)}
            className="size-7 p-0"
            title="Exit fullscreen"
          >
            <Minimize2 className="size-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className={cn('p-4', fullscreen ? 'h-full overflow-auto' : '')}>
        {showCode && editable ? (
          <Textarea
            value={code}
            onChange={e => onChange?.(e.target.value)}
            placeholder={placeholder}
            className="min-h-[200px] resize-none font-mono text-sm"
            style={fullscreen ? { minHeight: '80vh' } : undefined}
          />
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center">
            <RefreshCw className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-destructive">
            <AlertCircle className="size-8" />
            <p className="text-sm font-medium">Diagram Error</p>
            <p className="max-w-md text-center text-xs text-muted-foreground">
              {error}
            </p>
            {editable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCode(true)}
                className="mt-2"
              >
                <Code className="mr-2 size-4" />
                Edit Code
              </Button>
            )}
          </div>
        ) : svg ? (
          <div
            ref={containerRef}
            className="flex min-h-[350px] items-center justify-center overflow-auto"
            style={{ maxHeight: fullscreen ? '80vh' : '500px' }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Code className="size-8" />
            <p className="text-sm">No diagram to display</p>
            {editable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCode(true)}
                className="mt-2"
              >
                <Code className="mr-2 size-4" />
                Add Diagram
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        </div>
      )}

      <DiagramPreview />

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="h-[90vh] max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>{title || 'Mermaid Diagram'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <DiagramPreview fullscreen />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * DiagramField component - combines URL input with Mermaid editor
 * Allows users to either provide an external URL or create a diagram inline
 */
interface DiagramFieldProps {
  /** External URL value */
  url: string
  /** Mermaid code value */
  mermaidCode: string
  /** Callback when URL changes */
  onUrlChange: (url: string) => void
  /** Callback when Mermaid code changes */
  onMermaidChange: (code: string) => void
  /** Label for the field */
  label: string
  /** URL placeholder */
  urlPlaceholder?: string
  /** Mermaid placeholder */
  mermaidPlaceholder?: string
  /** Help text */
  helpText?: string
  /** Icon component */
  icon?: React.ReactNode
}

export function DiagramField({
  url,
  mermaidCode,
  onUrlChange,
  onMermaidChange,
  label,
  urlPlaceholder = 'https://...',
  mermaidPlaceholder = 'Enter Mermaid diagram code...',
  helpText,
  icon,
}: DiagramFieldProps) {
  // Default to mermaid mode (preferred option)
  const [mode, setMode] = useState<'url' | 'mermaid'>('mermaid')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {icon}
          {label}
        </label>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <Button
            variant={mode === 'url' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('url')}
            className="h-7 px-3 text-xs"
          >
            URL Externa
          </Button>
          <Button
            variant={mode === 'mermaid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('mermaid')}
            className="h-7 px-3 text-xs"
          >
            Mermaid
          </Button>
        </div>
      </div>

      {mode === 'url' ? (
        <div className="space-y-2">
          <input
            type="url"
            value={url}
            onChange={e => onUrlChange(e.target.value)}
            placeholder={urlPlaceholder}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {url && url.startsWith('http') && (
            <Button variant="outline" size="sm" className="w-full" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                Abrir Link Externo
              </a>
            </Button>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <MermaidRenderer
            code={mermaidCode}
            onChange={onMermaidChange}
            editable
            placeholder={mermaidPlaceholder}
            previewHeight="400px"
          />
        </Card>
      )}

      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  )
}

export default MermaidRenderer
