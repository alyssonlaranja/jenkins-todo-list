// Barrel exports for i18n domain
export { default as i18n } from './core/config'
export * from './core/constants'
export { I18nProvider } from './core/provider'
export * from './core/types'
export { loadResourcesFor } from './utils/resource-loader'
// Server-only utilities (actions + language detector)
export * from './server'
