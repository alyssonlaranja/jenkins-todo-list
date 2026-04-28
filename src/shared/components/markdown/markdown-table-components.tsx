/**
 * Shared styled Markdown components for ReactMarkdown.
 *
 * Provides consistent, visually appealing rendering of tables, checkboxes,
 * and horizontal rules across all markdown consumers (chat, artifacts, workspace).
 *
 * Uses the design-system CSS variables (--background, --card, --border, etc.)
 * so colors adapt automatically to light/dark mode.
 *
 * Usage:
 *   import { markdownStyleComponents } from '@/shared/components/markdown/markdown-table-components'
 *   import remarkGfm from 'remark-gfm'
 *
 *   <ReactMarkdown
 *     remarkPlugins={[remarkGfm]}
 *     components={{ ...markdownStyleComponents, ...otherOverrides }}
 *   >
 *     {content}
 *   </ReactMarkdown>
 */

import type { Components } from 'react-markdown'

export const tableComponents: Partial<Components> = {
  // ---------------------------------------------------------------------------
  // Tables
  // ---------------------------------------------------------------------------
  table: ({ children }) => (
    <div className="my-4 w-full overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-secondary">{children}</thead>,
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-secondary/50">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-foreground/80">{children}</td>
  ),

  // ---------------------------------------------------------------------------
  // Horizontal rules (section dividers)
  // ---------------------------------------------------------------------------
  hr: () => <hr className="my-6 border-border" />,

  // ---------------------------------------------------------------------------
  // Checkboxes (GFM task lists: - [ ] / - [x])
  // ---------------------------------------------------------------------------
  input: props => {
    if (props.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={props.checked}
          disabled
          className="mr-2 inline-block size-4 cursor-default appearance-none rounded border-2 border-foreground/40 bg-transparent align-middle checked:border-primary checked:bg-primary"
          style={{
            backgroundImage: props.checked
              ? `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")`
              : undefined,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />
      )
    }
    return <input {...props} />
  },
}

/** @deprecated Use `tableComponents` instead (kept for backward compatibility) */
export const markdownStyleComponents = tableComponents
