/**
 * Module Manifest System
 *
 * Single source of truth for module definitions including:
 * - Metadata (name, version, icon)
 * - Access control (roles, onboarding requirements)
 * - Onboarding steps (videos, docs, quizzes)
 * - Feature flags
 * - MCP requirements
 *
 * Architecture:
 * - Manifests are LOCAL files in /src/manifests/{moduleId}/
 * - User progress/certifications are MCP ARTIFACTS (via useUserOnboarding)
 * - i18n via multiple files: manifest.yaml (pt-BR) + manifest.en-US.yaml
 *
 * @example
 * ```typescript
 * // Using the loader directly
 * import { loadManifest } from '@/shared/manifest'
 * const manifest = await loadManifest('migration', 'pt-BR')
 *
 * // Using the React hook
 * import { useManifest } from '@/shared/manifest'
 * const { data: manifest, isLoading } = useManifest('migration')
 * ```
 */

// Types
export type {
  ManifestFeature,
  ManifestOnboardingStep,
  ManifestQuizQuestion,
  ManifestValidationResult,
  ModuleGroup,
  ModuleManifest,
  ModuleManifestAccess,
  ModuleManifestArtifact,
  ModuleManifestLocale,
  ModuleManifestMCP,
  ModuleManifestMetadata,
  ModuleManifestOnboarding,
  LoadedManifest,
  OnboardingStepType,
  QuestionType,
  RoleId,
  SupportedLocale,
} from './types'

// Loader for manifests
export {
  loadManifest,
  loadAllManifests,
  mergeManifestWithLocale,
  clearManifestCache,
  getCachedManifest,
  ALL_MODULE_IDS,
  type ModuleId,
  type ResolvedManifest,
} from './loader'

// React hooks
export { useManifest, useAllManifests, useModuleMetadata } from './use-manifest'

// Note: User progress is stored as MCP artifacts via useUserOnboarding hook
