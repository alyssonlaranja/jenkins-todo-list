/**
 * Shared Markdown components with diagram rendering support.
 *
 * Provides a `code` component override for ReactMarkdown that detects
 * diagram language fenced blocks (```mermaid, ```plantuml, etc.) and
 * renders them as interactive diagram images via Kroki.
 *
 * Usage:
 *   import { diagramCodeComponent } from '@/shared/components/diagram/markdown-diagram'
 *
 *   <ReactMarkdown components={{ code: diagramCodeComponent, ...others }}>
 *     {content}
 *   </ReactMarkdown>
 */

'use client'

import type { ComponentPropsWithoutRef } from 'react'

import { SUPPORTED_DIAGRAM_LANGUAGES } from '@/lib/diagram/kroki-encoder'

import { DiagramRenderer } from './DiagramRenderer'

/**
 * Extracts the language name from the className applied by ReactMarkdown.
 * ReactMarkdown sets className="language-xxx" on code blocks inside <pre>.
 */
function extractLanguage(className?: string): string | null {
  if (!className) return null
  const match = className.match(/language-(\S+)/)
  return match?.[1]?.toLowerCase() ?? null
}

/**
 * Custom `code` component for ReactMarkdown.
 *
 * When a fenced code block has a diagram language (e.g. ```mermaid),
 * it renders a <DiagramRenderer> instead of the raw code text.
 * Non-diagram code blocks are rendered as normal <code> elements.
 *
 * IMPORTANT: ReactMarkdown v10+ passes `node` as a prop and wraps
 * fenced code blocks in <pre><code>. We detect fenced blocks by
 * checking if className contains "language-".
 */
export function diagramCodeComponent(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { node, ...props }: ComponentPropsWithoutRef<'code'> & { node?: unknown }
) {
  const { children, className, ...rest } = props
  const language = extractLanguage(className)
  const codeText = String(children).replace(/\n$/, '')

  // Check if this is a fenced code block with a diagram language
  if (language && SUPPORTED_DIAGRAM_LANGUAGES.has(language)) {
    return <DiagramRenderer type={language} code={codeText} />
  }

  // Fenced code block (non-diagram) — render with syntax highlight styling
  if (className) {
    return (
      <code
        className={`${className} rounded bg-gray-800 px-1 py-0.5 text-gray-100`}
        {...rest}
      >
        {children}
      </code>
    )
  }

  // Inline code
  return (
    <code
      className="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-gray-800"
      {...rest}
    >
      {children}
    </code>
  )
}

/**
 * Custom `pre` component that strips the default <pre> wrapper
 * when the child is a DiagramRenderer (to avoid double-boxing).
 */
export function diagramPreComponent(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { node, ...props }: ComponentPropsWithoutRef<'pre'> & { node?: unknown }
) {
  const { children, ...rest } = props

  // Check if the child is our DiagramRenderer (it's a div, not a code element)
  // ReactMarkdown wraps fenced code in <pre><code>. When our code component
  // returns a DiagramRenderer (a <div>), we skip the <pre> wrapper.
  const child = Array.isArray(children) ? children[0] : children
  if (
    child &&
    typeof child === 'object' &&
    'type' in child &&
    (child as { type: { name?: string } }).type?.name === 'DiagramRenderer'
  ) {
    return <>{children}</>
  }

  // Check if child code element has a diagram language className
  if (child && typeof child === 'object' && 'props' in child) {
    const childProps = (child as { props: { className?: string } }).props
    const lang = extractLanguage(childProps?.className)
    if (lang && SUPPORTED_DIAGRAM_LANGUAGES.has(lang)) {
      // The code component has already rendered DiagramRenderer
      // so we don't need the <pre> wrapper
      return <>{children}</>
    }
  }

  return (
    <pre
      className="my-2 overflow-auto rounded-lg bg-gray-900 p-3 text-sm"
      {...rest}
    >
      {children}
    </pre>
  )
}
