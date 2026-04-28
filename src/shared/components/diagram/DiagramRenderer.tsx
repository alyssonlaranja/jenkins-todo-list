/**
 * DiagramRenderer — renders diagram code blocks as images via the server-side
 * diagram proxy (/api/diagram).
 *
 * The proxy fetches the rendered image from Kroki (optionally through the UML
 * MCP server) and returns it as a base64 `data:` URL.  This avoids Content
 * Security Policy (CSP) issues because `data:` is allowed by the policy while
 * external hosts like kroki.io are not.
 *
 * Shows a loading skeleton while the image loads, then reveals the image.
 * Provides copy-code and open-in-playground actions.
 * Used inline in markdown (replaces fenced code blocks for diagram languages).
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Check,
  ClipboardCopy,
  Code2,
  Download,
  Loader2,
  Maximize2,
  RefreshCw,
  X,
} from 'lucide-react'

import { resolveBackend } from '@/lib/diagram/kroki-encoder'
import { cn } from '@/shared/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiagramRendererProps {
  /** Diagram language / type, e.g. "mermaid", "plantuml", "d2" */
  type: string
  /** Diagram source code */
  code: string
  /** Optional extra class on the wrapper */
  className?: string
}

interface ProxyResponse {
  dataUrl: string
  playground: string | null
  backend: string
  diagramType: string
  outputFormat: string
  error?: string
}

// ---------------------------------------------------------------------------
// Hook: fetch diagram from server proxy (with automatic retry)
// ---------------------------------------------------------------------------

/** Maximum number of automatic retries on transient failures. */
const MAX_AUTO_RETRIES = 2

/** Delay (ms) before each automatic retry — progressive back-off. */
const RETRY_DELAYS = [1500, 3000]

function useDiagramProxy(
  type: string,
  code: string,
  outputFormat: 'svg' | 'png' = 'svg'
) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    'loading'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [serverPlayground, setServerPlayground] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Keep the latest code in a ref so the cleanup closure captures staleness correctly.
  const codeRef = useRef(code)
  codeRef.current = code

  const fetchDiagram = useCallback(
    async (signal: AbortSignal, attempt: number): Promise<boolean> => {
      try {
        const res = await fetch('/api/diagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            diagramType: type,
            code,
            outputFormat,
          }),
          signal,
        })

        if (signal.aborted) return false

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(
            (err as { error?: string }).error ?? `Server returned ${res.status}`
          )
        }

        const data = (await res.json()) as ProxyResponse

        if (signal.aborted) return false

        if (data.dataUrl) {
          setDataUrl(data.dataUrl)
          setServerPlayground(data.playground ?? null)
          setStatus('loaded')
          setRetryCount(0)
          return true
        } else {
          throw new Error(data.error ?? 'No dataUrl in response')
        }
      } catch (err) {
        if (signal.aborted) return false

        // Auto-retry on transient failures (400/422 from Kroki can be
        // intermittent — the same diagram may succeed on a second try)
        if (attempt < MAX_AUTO_RETRIES) {
          const delay = RETRY_DELAYS[attempt] ?? 3000
          // eslint-disable-next-line no-console
          console.info(
            `[DiagramRenderer] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`
          )
          setRetryCount(attempt + 1)
          setStatus('loading')

          await new Promise(resolve => setTimeout(resolve, delay))

          if (signal.aborted) return false
          return fetchDiagram(signal, attempt + 1)
        }

        // All retries exhausted — show error
        setErrorMessage(
          err instanceof Error ? err.message : 'Erro desconhecido'
        )
        setStatus('error')
        return false
      }
    },
    [type, code, outputFormat]
  )

  // Trigger on mount / dependency change
  useEffect(() => {
    const abortController = new AbortController()

    setStatus('loading')
    setDataUrl(null)
    setErrorMessage(null)
    setRetryCount(0)

    fetchDiagram(abortController.signal, 0)

    return () => {
      abortController.abort()
    }
  }, [fetchDiagram])

  // Manual retry triggered by user clicking the button
  const manualRetry = useCallback(() => {
    setStatus('loading')
    setDataUrl(null)
    setErrorMessage(null)
    setRetryCount(0)

    const abortController = new AbortController()
    fetchDiagram(abortController.signal, 0)

    // NOTE: no cleanup needed because the next useEffect will abort if
    // dependencies change. For the manual retry path we accept this.
  }, [fetchDiagram])

  return {
    dataUrl,
    status,
    errorMessage,
    serverPlayground,
    retryCount,
    manualRetry,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DiagramRenderer({
  type,
  code,
  className,
}: DiagramRendererProps) {
  const {
    dataUrl: svgDataUrl,
    status,
    errorMessage,
    retryCount,
    manualRetry,
  } = useDiagramProxy(type, code, 'svg')

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const backend = resolveBackend(type)

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-secure contexts
      const textArea = document.createElement('textarea')
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code])

  const handleDownloadPng = useCallback(async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagramType: type,
          code,
          outputFormat: 'png',
        }),
      })
      if (!res.ok) throw new Error('Download failed')
      const data = (await res.json()) as ProxyResponse
      if (!data.dataUrl) throw new Error('No PNG data')

      const link = document.createElement('a')
      link.href = data.dataUrl
      link.download = `diagram-${backend}-${Date.now()}.png`
      link.click()
    } catch {
      // Download failed — silently ignore
    } finally {
      setDownloading(false)
    }
  }, [type, code, backend])

  // Close fullscreen on ESC
  useEffect(() => {
    if (!fullscreen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [fullscreen])

  return (
    <div
      className={cn('group/diagram my-3 overflow-hidden rounded-lg', className)}
    >
      {/* Diagram image area */}
      <div className="relative min-h-[120px]">
        {/* Loading skeleton overlay (including auto-retry state) */}
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {retryCount > 0
                  ? `Tentativa ${retryCount + 1} — Gerando diagrama...`
                  : 'Gerando diagrama...'}
              </span>
            </div>
          </div>
        )}

        {/* Error state — with manual retry button */}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <X className="size-8 text-red-400 dark:text-red-500" />
            <span className="text-sm text-red-500 dark:text-red-400">
              Erro ao renderizar o diagrama ({type})
            </span>
            {errorMessage && (
              <span className="max-w-md text-xs text-muted-foreground">
                {errorMessage}
              </span>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={manualRetry}
                className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <RefreshCw className="size-3.5" />
                Tentar novamente
              </button>
              <button
                onClick={() => setShowCode(true)}
                className="text-xs text-blue-500 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Ver código-fonte
              </button>
            </div>
          </div>
        )}

        {/* The actual image – uses data: URL from server proxy (CSP-safe) */}
        {svgDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={svgDataUrl}
            alt={`${type} diagram`}
            className={cn(
              'mx-auto max-w-full cursor-pointer transition-opacity duration-300',
              status === 'loaded' ? 'opacity-100' : 'opacity-0',
              isDark && 'diagram-dark-invert'
            )}
            style={
              isDark
                ? {
                    filter:
                      'invert(0.88) hue-rotate(180deg) saturate(1.2) brightness(1.1)',
                  }
                : undefined
            }
            onClick={() => status === 'loaded' && setFullscreen(true)}
          />
        )}
      </div>

      {/* Toolbar — visible on hover */}
      <div className="flex items-center justify-between px-3 py-1.5 opacity-0 transition-opacity duration-200 group-hover/diagram:opacity-100">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {backend}
        </span>

        <div className="flex items-center gap-1">
          {/* Toggle code view */}
          <button
            onClick={() => setShowCode(prev => !prev)}
            className={cn(
              'rounded p-1 transition-colors hover:bg-secondary',
              showCode
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title={showCode ? 'Ocultar código' : 'Ver código'}
          >
            <Code2 className="size-3.5" />
          </button>

          {/* Copy code */}
          <button
            onClick={handleCopyCode}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Copiar código"
          >
            {copied ? (
              <Check className="size-3.5 text-green-500" />
            ) : (
              <ClipboardCopy className="size-3.5" />
            )}
          </button>

          {/* Download PNG */}
          <button
            onClick={handleDownloadPng}
            disabled={downloading}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            title="Baixar PNG"
          >
            {downloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
          </button>

          {/* Open fullscreen */}
          {svgDataUrl && status === 'loaded' && (
            <button
              onClick={() => setFullscreen(true)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Tela cheia"
            >
              <Maximize2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && svgDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setFullscreen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setFullscreen(false)}
            className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            title="Fechar (ESC)"
          >
            <X className="size-6" />
          </button>

          {/* Fullscreen image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={svgDataUrl}
            alt={`${type} diagram — fullscreen`}
            className="max-h-[90vh] max-w-[95vw] object-contain"
            style={
              isDark
                ? {
                    filter:
                      'invert(0.88) hue-rotate(180deg) saturate(1.2) brightness(1.1)',
                  }
                : undefined
            }
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Collapsible code view */}
      {showCode && (
        <div className="border-t border-border">
          <pre className="max-h-60 overflow-auto bg-secondary p-3 text-xs leading-relaxed text-foreground">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
