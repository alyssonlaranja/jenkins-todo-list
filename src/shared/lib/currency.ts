/**
 * Currency formatting utilities
 * Provides locale-aware currency formatting and parsing
 */
import type { SupportedLanguage } from '@/shared/i18n/core/types'

// Map languages to currency codes and locales
const currencyConfig: Record<
  SupportedLanguage,
  { locale: string; currency: string }
> = {
  en: { locale: 'en-US', currency: 'USD' },
  ja: { locale: 'ja-JP', currency: 'JPY' },
  'pt-BR': { locale: 'pt-BR', currency: 'BRL' },
}

/**
 * Format a number as currency based on the user's language
 * @param value - Numeric value to format
 * @param language - User's current language
 * @returns Formatted currency string (e.g., "$1,000.00", "R$ 1.000,00", "¥1,000")
 */
export function formatCurrency(
  value: number,
  language: SupportedLanguage
): string {
  const config = currencyConfig[language] || currencyConfig.en
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Parse a currency string to extract the numeric value
 * Handles different formats: "$1,000", "R$ 1.000", "¥1000"
 * @param value - Currency string to parse
 * @returns Numeric value or 0 if invalid
 */
export function parseCurrency(value: string): number {
  // Remove all non-numeric characters except decimal separators
  const cleaned = value.replace(/[^\d,.-]/g, '')

  // Replace comma with dot (for pt-BR format: 1.000,00 → 1000.00)
  // Handle both formats: 1,000.00 (US) and 1.000,00 (BR)
  let normalized = cleaned

  // If there's a comma after the last dot, it's BR format (1.000,00)
  // Otherwise it's US format (1,000.00)
  const lastDot = normalized.lastIndexOf('.')
  const lastComma = normalized.lastIndexOf(',')

  if (lastComma > lastDot) {
    // BR format: 1.000,00 → remove dots, replace comma with dot
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else {
    // US format: 1,000.00 → remove commas
    normalized = normalized.replace(/,/g, '')
  }

  const parsed = parseFloat(normalized)
  return isNaN(parsed) ? 0 : Math.round(parsed)
}

/**
 * Get the currency symbol for a language
 * @param language - User's current language
 * @returns Currency symbol (e.g., "$", "R$", "¥")
 */
export function getCurrencySymbol(language: SupportedLanguage): string {
  const config = currencyConfig[language] || currencyConfig.en
  return (
    new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
    })
      .formatToParts(0)
      .find(part => part.type === 'currency')?.value || '$'
  )
}
