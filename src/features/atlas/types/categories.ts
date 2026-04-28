/**
 * Atlas Categories Types (Stub)
 *
 * Minimal type stubs for atlas categories referenced by shared components.
 * These are placeholder types retained for build compatibility after
 * the atlas feature was removed during SDA2 isolation.
 */

// ============================================================================
// Types
// ============================================================================

export type FeedbackCategoryType = string

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low'

export interface FeedbackCategoryMap {
  [key: string]: {
    id: string
    name: string
    description: string
    icon?: string
    severity?: SeverityLevel
  }
}

// ============================================================================
// Constants
// ============================================================================

export const FEEDBACK_CATEGORIES: FeedbackCategoryMap = {}

export const CATEGORY_DESCRIPTIONS_FOR_AI: Record<string, string> = {}

// ============================================================================
// Functions
// ============================================================================

export function getAllCategoryIds(): string[] {
  return Object.keys(FEEDBACK_CATEGORIES)
}

export function getCategoryIcon(_categoryId: string): string {
  return '📋'
}

export function getCategoryMetadata(categoryId: string) {
  return FEEDBACK_CATEGORIES[categoryId] ?? null
}

export function isValidCategory(categoryId: string): boolean {
  return categoryId in FEEDBACK_CATEGORIES
}
