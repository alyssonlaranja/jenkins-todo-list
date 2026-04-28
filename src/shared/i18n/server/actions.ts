'use server'

import { cookies } from 'next/headers'

import { LANGUAGE_COOKIE_KEY, supportedLngs } from '../core/constants'
import type { SupportedLanguage } from '../core/types'

/**
 * Server Action to set language cookie
 * This is the proper way to set cookies in Next.js 15
 */
export async function setLanguageCookieAction(
  language: SupportedLanguage
): Promise<void> {
  if (!supportedLngs.includes(language)) {
    throw new Error(`Unsupported language: ${language}`)
  }

  const cookieStore = await cookies()
  cookieStore.set(LANGUAGE_COOKIE_KEY, language, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

/**
 * Server Action to get language cookie
 * This is the proper way to read cookies in Next.js 15
 */
export async function getLanguageCookieAction(): Promise<SupportedLanguage | null> {
  try {
    const cookieStore = await cookies()
    const languageCookie = cookieStore.get(LANGUAGE_COOKIE_KEY)

    if (
      languageCookie?.value &&
      (supportedLngs as readonly string[]).includes(languageCookie.value)
    ) {
      return languageCookie.value as SupportedLanguage
    }
  } catch (error) {
    console.warn('Failed to read language cookie:', error)
  }

  return null
}
