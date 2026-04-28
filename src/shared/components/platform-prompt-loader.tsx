'use client'

/**
 * @deprecated This component is deprecated.
 *
 * USE THE NEW UNIFIED ARCHITECTURE INSTEAD:
 * - For frontend modules: useCopilot(moduleId) from '@/shared/hooks/use-copilot'
 * - For backend agents: resolveAgentPrompt(agentId) from '@/agents/shared/unified-prompt-resolver'
 *
 * The new architecture provides:
 * - Global caching via Zustand store
 * - Single COPILOT_MANIFEST artifact per namespace
 * - i18n as default (zero API calls if not customized)
 * - Variable replacement with {{VARIABLE}} pattern
 *
 * See: COPILOT_ARCHITECTURE_CONSOLIDATION.md for migration guide
 *
 * This file will be removed in a future version.
 *
 * ---
 *
 * OLD DOCUMENTATION (for reference):
 *
 * Platform Prompt Loader Component
 *
 * A wrapper component that loads prompts using Platform > Local hierarchy
 * and provides them to child components via render props.
 *
 * @example
 * ```tsx
 * <PlatformPromptLoader
 *   agentId="atlas"
 *   locale={locale}
 *   fallbackPrompt={t('atlas.copilot.instructions')}
 * >
 *   {({ prompt, isLoading, source }) => (
 *     isLoading ? <Loading /> : (
 *       <CopilotSidebar instructions={prompt}>
 *         <Content />
 *       </CopilotSidebar>
 *     )
 *   )}
 * </PlatformPromptLoader>
 * ```
 */
import type { ReactNode } from 'react'

import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  usePlatformPrompt,
  type UsePlatformPromptOptions,
  type UsePlatformPromptResult,
} from '@/shared/hooks/use-platform-prompt'

// ============================================================================
// Types
// ============================================================================

export interface PlatformPromptLoaderProps {
  /** The agent ID to load the prompt for */
  agentId: string
  /** The locale for the prompt */
  locale: string
  /** Fallback prompt from i18n */
  fallbackPrompt?: string
  /** Additional options */
  options?: Omit<UsePlatformPromptOptions, 'fallbackPrompt'>
  /** Render function with prompt result */
  children: (result: UsePlatformPromptResult) => ReactNode
  /** Custom loading component */
  loadingComponent?: ReactNode
  /** Show loading state while fetching */
  showLoading?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function PlatformPromptLoader({
  agentId,
  locale,
  fallbackPrompt,
  options = {},
  children,
  loadingComponent,
  showLoading = false,
}: PlatformPromptLoaderProps) {
  const result = usePlatformPrompt(agentId, locale, {
    ...options,
    fallbackPrompt,
  })

  // Show loading state if enabled and still loading
  if (showLoading && result.isLoading) {
    return (
      loadingComponent || (
        <div className="flex size-full items-center justify-center p-8">
          <div className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      )
    )
  }

  return <>{children(result)}</>
}

// ============================================================================
// Multi-Prompt Loader
// ============================================================================

export interface MultiPromptConfig {
  key: string
  agentId: string
  locale: string
  fallbackPrompt?: string
}

export interface MultiPlatformPromptLoaderProps {
  /** Array of prompt configurations */
  prompts: MultiPromptConfig[]
  /** Additional options */
  options?: Omit<UsePlatformPromptOptions, 'fallbackPrompt'>
  /** Render function with all prompt results */
  children: (results: Record<string, UsePlatformPromptResult>) => ReactNode
  /** Custom loading component */
  loadingComponent?: ReactNode
  /** Show loading state while any prompt is loading */
  showLoading?: boolean
}

/**
 * Multi-Prompt Loader Component
 *
 * Loads multiple prompts at once and provides them via render props.
 * Useful for pages that need different prompts for different contexts.
 *
 * @example
 * ```tsx
 * <MultiPlatformPromptLoader
 *   prompts={[
 *     { key: 'main', agentId: 'atlas', locale, fallbackPrompt: t('atlas.copilot.instructions') },
 *     { key: 'kanban', agentId: 'atlas-kanban', locale, fallbackPrompt: t('atlas.copilot.kanbanInstructions') },
 *   ]}
 * >
 *   {(prompts) => (
 *     <>
 *       <MainView instructions={prompts.main.prompt} />
 *       <KanbanView instructions={prompts.kanban.prompt} />
 *     </>
 *   )}
 * </MultiPlatformPromptLoader>
 * ```
 */
export function MultiPlatformPromptLoader({
  prompts,
  options = {},
  children,
  loadingComponent,
  showLoading = false,
}: MultiPlatformPromptLoaderProps) {
  // We need to call hooks in a consistent order, so we use a helper component
  // that renders each prompt loader and collects results
  return (
    <MultiPromptLoaderInner
      prompts={prompts}
      options={options}
      loadingComponent={loadingComponent}
      showLoading={showLoading}
    >
      {children}
    </MultiPromptLoaderInner>
  )
}

// Helper component to handle multiple prompts
function MultiPromptLoaderInner({
  prompts,
  options,
  children,
  loadingComponent,
  showLoading,
}: MultiPlatformPromptLoaderProps) {
  // Load first prompt
  const firstPrompt = prompts[0]
  const result1 = usePlatformPrompt(
    firstPrompt?.agentId || '',
    firstPrompt?.locale || 'en',
    { ...options, fallbackPrompt: firstPrompt?.fallbackPrompt }
  )

  // Load second prompt (if exists)
  const secondPrompt = prompts[1]
  const result2 = usePlatformPrompt(
    secondPrompt?.agentId || '',
    secondPrompt?.locale || 'en',
    { ...options, fallbackPrompt: secondPrompt?.fallbackPrompt }
  )

  // Load third prompt (if exists)
  const thirdPrompt = prompts[2]
  const result3 = usePlatformPrompt(
    thirdPrompt?.agentId || '',
    thirdPrompt?.locale || 'en',
    { ...options, fallbackPrompt: thirdPrompt?.fallbackPrompt }
  )

  // Build results object
  const results: Record<string, UsePlatformPromptResult> = {}
  if (firstPrompt) results[firstPrompt.key] = result1
  if (secondPrompt) results[secondPrompt.key] = result2
  if (thirdPrompt) results[thirdPrompt.key] = result3

  // Check if any is loading
  const anyLoading = Object.values(results).some(r => r.isLoading)

  if (showLoading && anyLoading) {
    return (
      loadingComponent || (
        <div className="flex size-full items-center justify-center p-8">
          <div className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      )
    )
  }

  return <>{children(results)}</>
}

export default PlatformPromptLoader
