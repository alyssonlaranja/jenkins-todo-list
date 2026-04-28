'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'

import { useLanguagePreload } from '@/shared/hooks/use-language-preload'

import { LanguageLoading } from '../ui/language-loading'
import { loadResourcesFor } from '../utils/resource-loader'
import i18n from './config'
import type { SupportedLanguage } from './types'

interface I18nProviderProps {
  readonly children: ReactNode
  readonly initialLanguage?: SupportedLanguage
}

export function I18nProvider({ children, initialLanguage }: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { preloadedLanguage, isPreloaded } = useLanguagePreload(initialLanguage)

  useEffect(() => {
    if (!isPreloaded || !preloadedLanguage) return

    const initializeI18n = async () => {
      if (!i18n.hasResourceBundle(preloadedLanguage, 'common')) {
        await loadResourcesFor(preloadedLanguage)
      }

      startTransition(async () => {
        if (preloadedLanguage !== i18n.language) {
          await i18n.changeLanguage(preloadedLanguage)
        }
        setIsInitialized(true)
      })
    }

    void initializeI18n()
  }, [preloadedLanguage, isPreloaded])

  if (!isInitialized || isPending || !isPreloaded) {
    return <LanguageLoading />
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
