'use client'

import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from '../locales/en'
import ja from '../locales/ja'
import ptBr from '../locales/pt-BR'
import {
  defaultLng,
  defaultNS,
  LANGUAGE_COOKIE_KEY,
  namespaces,
  supportedLngs,
} from './constants'

const isServer = typeof window === 'undefined'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en,
      ja,
      'pt-BR': ptBr,
    },
    fallbackLng: defaultLng,
    defaultNS,
    ns: namespaces,
    supportedLngs,
    load: 'currentOnly', // Don't try to load language variants
    nonExplicitSupportedLngs: false, // Disable implicit language support
    lng: isServer ? defaultLng : undefined,
    detection: {
      order: isServer ? ['cookie'] : ['cookie', 'localStorage', 'navigator'],
      caches: isServer ? ['cookie'] : ['cookie', 'localStorage'],
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60,
      },
      cookieMinutes: 365 * 24 * 60,
      lookupCookie: LANGUAGE_COOKIE_KEY,
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    initImmediate: false,
    returnNull: false,
    returnEmptyString: false,
    returnObjects: false,
    debug: false, // Disable debug mode
  })

export default i18n
