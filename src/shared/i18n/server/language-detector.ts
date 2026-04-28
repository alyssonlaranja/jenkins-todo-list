/**
 * Ultra-robust server-side language detector for Next.js 15
 * Handles all edge cases and prevents any console warnings
 */
import {
  defaultLng,
  LANGUAGE_COOKIE_KEY,
  supportedLngs,
} from '../core/constants'
import type { SupportedLanguage } from '../core/types'

/**
 * Safe language detector that never throws or warns
 * Designed to work in all Next.js 15 contexts including TURBOPACK
 */
export function detectServerLanguage(
  cookieHeader?: string | null
): SupportedLanguage {
  // Type guard: must be a non-empty string
  if (
    !cookieHeader ||
    typeof cookieHeader !== 'string' ||
    cookieHeader.length === 0 ||
    cookieHeader.trim() === ''
  ) {
    return defaultLng
  }

  try {
    // Find our specific cookie in the header
    const languageCookiePattern = new RegExp(
      `(?:^|;)\\s*${LANGUAGE_COOKIE_KEY}=([^;]+)`
    )
    const match = cookieHeader.match(languageCookiePattern)

    if (!match || !match[1]) {
      return defaultLng
    }

    let languageValue = match[1].trim()

    // Try to decode if needed (but don't fail if it's already decoded)
    try {
      const decoded = decodeURIComponent(languageValue)
      languageValue = decoded
    } catch {
      // Keep original value if decode fails
    }

    // Validate against supported languages
    if (
      languageValue &&
      typeof languageValue === 'string' &&
      languageValue.length >= 2 &&
      languageValue.length <= 5 && // reasonable language code length
      (supportedLngs as readonly string[]).includes(languageValue)
    ) {
      return languageValue as SupportedLanguage
    }
  } catch {
    // Absolutely silent fallback - no logging whatsoever
  }

  return defaultLng
}

/**
 * Sets the language preference cookie (client-side)
 */
export function setLanguageCookie(language: SupportedLanguage): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }
}

/**
 * Gets the current language from cookie (client-side)
 */
export function getLanguageCookie(): SupportedLanguage | null {
  if (typeof document === 'undefined') return null

  try {
    const cookies = document.cookie.split(';')
    const languageCookie = cookies.find(cookie =>
      cookie.trim().startsWith(`${LANGUAGE_COOKIE_KEY}=`)
    )

    if (languageCookie) {
      const equalIndex = languageCookie.indexOf('=')
      if (equalIndex > 0) {
        const language = languageCookie.substring(equalIndex + 1).trim()
        if (
          language &&
          (supportedLngs as readonly string[]).includes(language)
        ) {
          return language as SupportedLanguage
        }
      }
    }
  } catch {
    // Silently handle cookie parsing errors
  }

  return null
}
