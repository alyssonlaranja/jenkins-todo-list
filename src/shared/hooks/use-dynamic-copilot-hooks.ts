/**
 * Dynamic CopilotKit Integration Hooks
 *
 * These hooks provide i18n-aware wrappers around CopilotKit's native hooks,
 * using the centralized registries for configuration.
 *
 * Features:
 * - Load action/readable/suggestion configs from registries
 * - Support i18n for descriptions and instructions
 * - Fallback to hardcoded values if platform configs not available
 * - Type-safe parameter handling
 *
 * @see ACTION_REGISTRY, SUGGESTION_REGISTRY, READABLE_REGISTRY
 */
import { useMemo, type ReactElement } from 'react'
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core'
import { useCopilotChatSuggestions } from '@copilotkit/react-ui'

import {
  ACTION_REGISTRY,
  getActionByKey,
  type ActionRegistryEntry,
} from '../lib/dynamic-agents/action-registry'
import {
  getReadableByKey,
  getReadablesForModule,
  type ReadableModule,
  type ReadableRegistryEntry,
} from '../lib/dynamic-agents/readable-registry'
import {
  getSuggestionConfig,
  interpolateSuggestionInstructions,
  type SuggestionModule,
  type SuggestionRegistryEntry,
} from '../lib/dynamic-agents/suggestion-registry'

// ============================================================================
// TYPES
// ============================================================================

/** Action handler arguments (from CopilotKit) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionArgs = Record<string, any>

/** Action render status */
type ActionStatus = 'inProgress' | 'executing' | 'complete'

/** Render props for action */
interface ActionRenderProps {
  status: ActionStatus
  args: ActionArgs
  result?: unknown
}

/**
 * Options for useDynamicAction hook
 */
export interface UseDynamicActionOptions {
  /** Action key from ACTION_REGISTRY */
  actionKey: string
  /** Handler function for the action */
  handler: (params: ActionArgs) => Promise<string> | string
  /** Optional render function - must return ReactElement */
  render?: (props: ActionRenderProps) => ReactElement
  /** i18n translation function (optional) */
  t?: (key: string, defaultValue?: string) => string
  /** Whether action is disabled */
  disabled?: boolean
}

/**
 * Options for useDynamicSuggestions hook
 */
export interface UseDynamicSuggestionsOptions {
  /** Module name */
  module: SuggestionModule
  /** Step number (for wizard modules) */
  step?: number
  /** Context variables for template interpolation */
  context: Record<string, string | number>
  /** i18n translation function (optional) */
  t?: (key: string, defaultValue?: string) => string
  /** Whether suggestions are disabled */
  disabled?: boolean
}

/**
 * Options for useDynamicReadables hook
 */
export interface UseDynamicReadablesOptions {
  /** Module to load readables for */
  module: ReadableModule
  /** Include global readables */
  includeGlobal?: boolean
  /** Context values for each readable */
  values: Record<string, unknown>
  /** i18n translation function (optional) */
  t?: (key: string, defaultValue?: string) => string
  /** Whether readables are disabled */
  disabled?: boolean
}

// ============================================================================
// useDynamicAction
// ============================================================================

/**
 * Hook that wraps useCopilotAction with registry-based configuration
 *
 * @example
 * ```tsx
 * useDynamicAction({
 *   actionKey: 'CREATE_TASK',
 *   handler: async ({ title, description }) => {
 *     await createTask({ title, description })
 *     return `Task "${title}" created`
 *   },
 *   render: ({ status, args }) => (
 *     <TaskCard status={status} title={args.title} />
 *   ),
 * })
 * ```
 */
export function useDynamicAction({
  actionKey,
  handler,
  render,
  t,
  disabled = false,
}: UseDynamicActionOptions): void {
  const config = useMemo(() => getActionByKey(actionKey), [actionKey])

  const description = useMemo(() => {
    if (!config) return ''
    if (t) {
      return t(config.i18nDescPath, config.fallbackDescription)
    }
    return config.fallbackDescription
  }, [config, t])

  const parameters = useMemo(() => {
    if (!config) return []
    return config.parameters.map(param => ({
      name: param.name,
      type: param.type,
      description: t
        ? t(param.i18nDescPath ?? '', param.fallbackDescription)
        : param.fallbackDescription,
      required: param.required,
      enum: param.enum,
    }))
  }, [config, t])

  useCopilotAction(
    {
      name: config?.name ?? actionKey,
      description,
      parameters,
      available: disabled ? 'disabled' : 'enabled',
      handler: async (args: ActionArgs) => handler(args),
      render: render
        ? (props: ActionRenderProps) =>
            render({
              status: props.status,
              args: props.args,
              result: props.result,
            })
        : undefined,
    },
    [config, description, parameters, handler, render, disabled]
  )
}

// ============================================================================
// useDynamicSuggestions
// ============================================================================

/**
 * Hook that wraps useCopilotChatSuggestions with registry-based configuration
 *
 * @example
 * ```tsx
 * useDynamicSuggestions({
 *   module: 'upstream',
 *   step: 1,
 *   context: {
 *     EPIC_NAME: epicData.name,
 *     EPIC_STATUS: epicData.status,
 *     USER_NAME: userName,
 *   },
 * })
 * ```
 */
export function useDynamicSuggestions({
  module,
  step,
  context,
  t,
  disabled = false,
}: UseDynamicSuggestionsOptions): void {
  const config = useMemo(
    () => getSuggestionConfig(module, step),
    [module, step]
  )

  const instructions = useMemo(() => {
    if (!config) return ''

    // Get base instructions (from i18n or fallback)
    const baseInstructions = t
      ? t(config.i18nInstructionsPath, config.fallbackInstructions)
      : config.fallbackInstructions

    // Interpolate context variables
    return interpolateSuggestionInstructions(baseInstructions, context)
  }, [config, context, t])

  useCopilotChatSuggestions(
    {
      instructions,
      minSuggestions: config?.minSuggestions ?? 1,
      maxSuggestions: config?.maxSuggestions ?? 3,
    },
    [instructions, config, disabled]
  )
}

// ============================================================================
// useDynamicReadable
// ============================================================================

/**
 * Hook that registers a single readable with registry-based configuration
 *
 * @example
 * ```tsx
 * useDynamicReadable({
 *   readableKey: 'global.currentUser',
 *   value: { name: userName, email: userEmail },
 * })
 * ```
 */
export function useDynamicReadable({
  readableKey,
  value,
  t,
  disabled = false,
}: {
  readableKey: string
  value: unknown
  t?: (key: string, defaultValue?: string) => string
  disabled?: boolean
}): string | undefined {
  const config = useMemo(() => getReadableByKey(readableKey), [readableKey])

  const description = useMemo(() => {
    if (!config) return ''
    if (t) {
      return t(config.i18nDescPath, config.fallbackDescription)
    }
    return config.fallbackDescription
  }, [config, t])

  return useCopilotReadable(
    {
      description,
      value,
      available: disabled ? 'disabled' : 'enabled',
    },
    [config, description, value, disabled]
  )
}

// ============================================================================
// useDynamicReadables (batch)
// ============================================================================

/**
 * Hook that registers multiple readables for a module
 *
 * @example
 * ```tsx
 * useDynamicReadables({
 *   module: 'upstream',
 *   includeGlobal: true,
 *   values: {
 *     epic: epicData,
 *     currentStep: step,
 *     stepData: wizardData[step],
 *     hypotheses: epicData.hypotheses,
 *   },
 * })
 * ```
 */
export function useDynamicReadables({
  module,
  includeGlobal = true,
  values,
  t,
  disabled = false,
}: UseDynamicReadablesOptions): void {
  // Get readables for the module
  const moduleReadables = useMemo(() => getReadablesForModule(module), [module])

  // Optionally include global readables
  const globalReadables = useMemo(
    () => (includeGlobal ? getReadablesForModule('global') : []),
    [includeGlobal]
  )

  const allReadables = useMemo(
    () => [...globalReadables, ...moduleReadables],
    [globalReadables, moduleReadables]
  )

  // Register each readable
  // Note: This creates multiple useCopilotReadable calls
  // For optimal performance, consider using a component-based approach
  allReadables.forEach(config => {
    const value = values[config.contextKey]
    const description = t
      ? t(config.i18nDescPath, config.fallbackDescription)
      : config.fallbackDescription

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useCopilotReadable(
      {
        description,
        value,
        available: disabled ? 'disabled' : 'enabled',
      },
      [config, description, value, disabled]
    )
  })
}

// ============================================================================
// useModuleActions
// ============================================================================

/**
 * Hook to get all action configs for a module
 * Useful for dynamically registering all module actions
 */
export function useModuleActions(module: string): ActionRegistryEntry[] {
  return useMemo(
    () =>
      Object.values(ACTION_REGISTRY).filter(action => action.module === module),
    [module]
  )
}

// ============================================================================
// useModuleReadables
// ============================================================================

/**
 * Hook to get all readable configs for a module
 */
export function useModuleReadables(
  module: ReadableModule
): ReadableRegistryEntry[] {
  return useMemo(() => getReadablesForModule(module), [module])
}

// ============================================================================
// useModuleSuggestion
// ============================================================================

/**
 * Hook to get suggestion config for a module/step
 */
export function useModuleSuggestion(
  module: SuggestionModule,
  step?: number
): SuggestionRegistryEntry | undefined {
  return useMemo(() => getSuggestionConfig(module, step), [module, step])
}

// ============================================================================
// Helper: createActionHandler
// ============================================================================

/**
 * Helper to create a typed action handler from registry config
 * @param implementation - The action handler function
 * @returns A wrapped handler that ensures Promise<string> return type
 */
export function createActionHandler<T extends ActionArgs>(
  implementation: (params: T) => Promise<string> | string
): (params: T) => Promise<string> {
  return async (params: T) => {
    const result = await implementation(params)
    return result
  }
}
