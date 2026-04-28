/**
 * Knowledge Slots Types (Stub)
 *
 * Minimal type stubs for onboarding knowledge slots referenced by API routes.
 * Placeholder types retained for build compatibility after
 * the onboarding feature was removed during SDA2 isolation.
 */

export type KnowledgeSlotType =
  | 'document'
  | 'text'
  | 'url'
  | 'image'
  | 'video'

export interface ExtractedKnowledge {
  type?: KnowledgeSlotType
  title?: string
  content?: string
  markdown?: string
  wordCount?: number
  sectionHeaders?: string[]
  sections?: { title: string; content: string; level: number }[]
  keyTerms?: string[]
  extractedTopics?: string[]
  parsedAt?: string
  parsingMethod?: 'mammoth' | 'officeparser' | 'direct'
  contentHash?: string
  metadata?: Record<string, unknown>
}
