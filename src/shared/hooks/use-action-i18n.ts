/**
 * Hook for using i18n-translated action descriptions
 *
 * Provides translated descriptions for CopilotKit actions from the registry.
 * Use this when registering actions to get i18n-aware descriptions.
 *
 * @example
 * ```tsx
 * const { getDescription, getParamDescription } = useActionI18n()
 *
 * useCopilotAction({
 *   name: 'atlas_analyzePatterns',
 *   description: getDescription('ATLAS_ANALYZE_PATTERNS'),
 *   parameters: [
 *     {
 *       name: 'timeframe',
 *       description: getParamDescription('ATLAS_ANALYZE_PATTERNS', 'timeframe'),
 *       ...
 *     }
 *   ],
 *   handler: async (args) => { ... }
 * })
 * ```
 */
'use client'

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ACTION_REGISTRY,
  getActionByKey,
  type ActionRegistryEntry,
} from '@/shared/lib/dynamic-agents/action-registry'

export interface UseActionI18nResult {
  /**
   * Get the i18n-translated description for an action
   * @param actionKey - The registry key (e.g., 'ATLAS_ANALYZE_PATTERNS')
   * @returns Translated description or fallback
   */
  getDescription: (actionKey: keyof typeof ACTION_REGISTRY) => string

  /**
   * Get the i18n-translated description for an action parameter
   * @param actionKey - The registry key
   * @param paramName - The parameter name
   * @returns Translated parameter description or fallback
   */
  getParamDescription: (
    actionKey: keyof typeof ACTION_REGISTRY,
    paramName: string
  ) => string

  /**
   * Get all parameters with translated descriptions
   * @param actionKey - The registry key
   * @returns Array of parameters with translated descriptions
   */
  getParameters: (actionKey: keyof typeof ACTION_REGISTRY) => Array<{
    name: string
    type: string
    required: boolean
    description: string
    enum?: string[]
  }>

  /**
   * Get the full action entry with translated descriptions
   * @param actionKey - The registry key
   * @returns Action entry with translated descriptions
   */
  getAction: (
    actionKey: keyof typeof ACTION_REGISTRY
  ) => ActionRegistryEntry | undefined
}

export function useActionI18n(): UseActionI18nResult {
  const { t } = useTranslation('copilot')

  const getDescription = useCallback(
    (actionKey: keyof typeof ACTION_REGISTRY): string => {
      const action = getActionByKey(actionKey)
      if (!action) {
        console.warn(`[useActionI18n] Action not found: ${actionKey}`)
        return ''
      }

      const translated = t(action.i18nDescPath, {
        defaultValue: action.fallbackDescription,
      })

      return translated
    },
    [t]
  )

  const getParamDescription = useCallback(
    (actionKey: keyof typeof ACTION_REGISTRY, paramName: string): string => {
      const action = getActionByKey(actionKey)
      if (!action) {
        return paramName
      }

      const param = action.parameters.find(p => p.name === paramName)
      if (!param) {
        return paramName
      }

      if (param.i18nDescPath) {
        return t(param.i18nDescPath, {
          defaultValue: param.fallbackDescription,
        })
      }

      return param.fallbackDescription
    },
    [t]
  )

  const getParameters = useCallback(
    (
      actionKey: keyof typeof ACTION_REGISTRY
    ): Array<{
      name: string
      type: string
      required: boolean
      description: string
      enum?: string[]
    }> => {
      const action = getActionByKey(actionKey)
      if (!action) {
        return []
      }

      return action.parameters.map(p => ({
        name: p.name,
        type: p.type,
        required: p.required ?? false,
        description: p.i18nDescPath
          ? t(p.i18nDescPath, { defaultValue: p.fallbackDescription })
          : p.fallbackDescription,
        enum: p.enum,
      }))
    },
    [t]
  )

  const getAction = useCallback(
    (actionKey: keyof typeof ACTION_REGISTRY) => getActionByKey(actionKey),
    []
  )

  return {
    getDescription,
    getParamDescription,
    getParameters,
    getAction,
  }
}

/**
 * Get action descriptions without the hook (for static contexts)
 * Uses fallback descriptions only
 */
export function getActionDescriptionStatic(
  actionKey: keyof typeof ACTION_REGISTRY
): string {
  const action = getActionByKey(actionKey)
  return action?.fallbackDescription ?? ''
}

export default useActionI18n
