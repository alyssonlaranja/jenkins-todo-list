/**
 * i18n constants (moved from root constants.ts)
 */
export const LANGUAGE_COOKIE_KEY = 'i18next-language'
export const supportedLngs = ['en', 'pt-BR'] as const
export const defaultLng = 'en'
export const defaultNS = 'common'
export const namespaces = [
  'common',
  'auth',
  'navigation',
  'pages',
  'forms',
  'errors',
  'mcp',
] as const
