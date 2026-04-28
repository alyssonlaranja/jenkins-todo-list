'use client'

import { useEffect, useState } from 'react'

import type { SupportedLanguage } from '@/shared/i18n'
import { getLanguageCookie } from '@/shared/i18n/server/language-detector'

/**
 * Hook that preloads the language to prevent flash during hydration.
 * Ensures the correct language is set before rendering.
 */
export function useLanguagePreload(initialLanguage?: SupportedLanguage) {
  const [preloadedLanguage, setPreloadedLanguage] = useState<
    SupportedLanguage | undefined
  >(initialLanguage)
  const [isPreloaded, setIsPreloaded] = useState(false)

  useEffect(() => {
    // During hydration, check if there is a language saved in the cookie
    const cookieLanguage = getLanguageCookie()
    const targetLanguage = cookieLanguage || initialLanguage

    if (targetLanguage) {
      setPreloadedLanguage(targetLanguage)
    }

    // Mark as preloaded immediately to prevent flash
    setIsPreloaded(true)
  }, [initialLanguage])

  return {
    preloadedLanguage,
    isPreloaded,
  }
}
