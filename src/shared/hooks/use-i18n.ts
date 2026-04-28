'use client'

import { useEffect, useState } from 'react'
import { format as formatDateFns, Locale } from 'date-fns'
import { enUS, ptBR } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'

import { defaultLng, supportedLngs } from '@/shared/i18n/core/constants'
import type { NamespaceKey, SupportedLanguage } from '@/shared/i18n/core/types'
import { setLanguageCookie } from '@/shared/i18n/server/language-detector'

// Map language codes to date-fns locales
const dateLocaleMap: Record<SupportedLanguage, Locale> = {
  en: enUS,
  'pt-BR': ptBR,
}

/**
 * Custom hook for i18n with namespace support and cookie persistence.
 * Provides the t function for translations, the current language, and a function to change the language.
 * Prevents hydration mismatches by ensuring consistent server/client rendering through cookie persistence.
 */
export const useI18n = (namespace: NamespaceKey = 'common') => {
  const { t, i18n } = useTranslation(namespace)
  const [isClient, setIsClient] = useState(false)

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true)
  }, [])

  const changeLanguage = async (lng: SupportedLanguage) => {
    const newLang = supportedLngs.includes(lng) ? lng : defaultLng
    console.log('[i18n] Changing language to:', newLang)
    // Persist cookie for SSR consistency
    setLanguageCookie(newLang)
    console.log('[i18n] Cookie set for:', newLang)
    // Switch language
    await i18n.changeLanguage(newLang)
    console.log('[i18n] Language changed to:', i18n.language)
    console.log(
      '[i18n] Has resource bundle?',
      i18n.hasResourceBundle(newLang, 'mcp')
    )
    console.log(
      '[i18n] Test translation:',
      i18n.t('marketplace.title', { lng: newLang, ns: 'mcp' })
    )
  }

  // Use actual language after client hydration
  const currentLanguage = isClient
    ? (i18n.language as SupportedLanguage)
    : defaultLng

  // Get the date-fns locale for the current language
  const dateLocale = dateLocaleMap[currentLanguage] || enUS

  // Helper function to format dates with current locale
  const formatDate = (
    date: Date | string | number,
    formatStr: string
  ): string => {
    const dateObj =
      typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date
    return formatDateFns(dateObj, formatStr, { locale: dateLocale })
  }

  // Get the BCP 47 locale string for Intl APIs (toLocaleString, toLocaleDateString)
  const localeString = currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US'

  return {
    t,
    currentLanguage,
    changeLanguage,
    supportedLanguages: supportedLngs as readonly SupportedLanguage[],
    isReady: i18n.isInitialized && isClient,
    isClient,
    dateLocale,
    formatDate,
    localeString,
  } as const
}
