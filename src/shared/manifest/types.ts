/**
 * Module Manifest System - Types
 *
 * Defines the schema for module manifests that describe
 * everything about a module: metadata, access control,
 * onboarding, features, and MCP requirements.
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type SupportedLocale = 'pt-BR' | 'en-US' | 'es-ES'

export type OnboardingStepType =
  | 'video'
  | 'document'
  | 'quiz'
  | 'interactive'
  | 'acknowledgment'
  | 'practice'

export type QuestionType = 'single-choice' | 'multiple-choice' | 'true-false'

export type ModuleGroup = 'setup' | 'operations' | 'communication' | 'admin'

export type RoleId = 'globaladmin' | 'admin' | 'curator' | 'userplus' | 'user'

// =============================================================================
// MANIFEST SCHEMA
// =============================================================================

/**
 * Module metadata - basic information
 */
export interface ModuleManifestMetadata {
  /** Unique module identifier (e.g., 'migration', 'upstream') */
  id: string
  /** Semantic version (e.g., '1.0.0') */
  version: string
  /** Module display name */
  name: string
  /** Short description */
  description: string
  /** Lucide icon name */
  icon: string
  /** Module group for sidebar organization */
  group: ModuleGroup
  /** Module author/team */
  author?: string
  /** Repository or documentation URL */
  repository?: string
}

/**
 * Access control configuration
 */
export interface ModuleManifestAccess {
  /** Default roles that can access this module */
  defaultRoles: RoleId[]
  /** Whether module requires onboarding completion */
  requiresOnboarding: boolean
  /** Whether module requires valid certification */
  requiresCertification: boolean
  /** Certification validity in days (0 = never expires) */
  certificationValidityDays?: number
}

/**
 * Quiz question for onboarding
 */
export interface ManifestQuizQuestion {
  /** Question ID */
  id: string
  /** Question text */
  question: string
  /** Question type */
  type: QuestionType
  /** Answer options */
  options: string[]
  /** Correct answer(s) - index or indices */
  correct: number | number[]
  /** Explanation shown after answering */
  explanation?: string
}

/**
 * Onboarding step definition
 */
export interface ManifestOnboardingStep {
  /** Step ID */
  id: string
  /** Step type */
  type: OnboardingStepType
  /** Step title */
  title: string
  /** Step description */
  description?: string
  /** Whether this step is required for certification */
  required: boolean
  /** Estimated duration in minutes */
  estimatedMinutes?: number

  // Type-specific fields

  /** For 'video' type - local path or URL */
  videoPath?: string
  /** TODO: Support external video URLs */
  // videoUrl?: string
  /** Video duration in seconds */
  videoDuration?: number

  /** For 'document' type - path to markdown file relative to manifest */
  markdownFile?: string

  /** For 'quiz' type - questions */
  questions?: ManifestQuizQuestion[]
  /** Passing score percentage (0-100) */
  passingScore?: number

  /** For 'acknowledgment' type - message to acknowledge */
  acknowledgmentMessage?: string
  /** Checkbox label */
  acknowledgmentLabel?: string

  /** For 'interactive' type - component name to render */
  interactiveComponent?: string

  /** For 'practice' type - practice exercise config */
  practiceConfig?: Record<string, unknown>

  /**
   * Alternative nested content format used by some manifests
   * @example { documentPath: "docs/01-intro.md" }
   * @example { questions: [...] }
   */
  content?: {
    documentPath?: string
    questions?: ManifestQuizQuestion[]
    passingScore?: number
  }
}

/**
 * Onboarding configuration
 */
export interface ModuleManifestOnboarding {
  /** Onboarding title */
  title: string
  /** Onboarding description */
  description?: string
  /** Certification title (shown on certificate) */
  certificationTitle?: string
  /** Total estimated time in minutes */
  estimatedTotalMinutes: number
  /** Onboarding steps */
  steps: ManifestOnboardingStep[]
}

/**
 * Feature flag definition
 */
export interface ManifestFeature {
  /** Feature ID */
  id: string
  /** Feature name */
  name: string
  /** Feature description */
  description?: string
  /** Default enabled state */
  default: boolean
  /** Roles required to use this feature (if different from module access) */
  requiresRoles?: RoleId[]
}

/**
 * MCP server requirements
 */
export interface ModuleManifestMCP {
  /** Required MCP servers that must be connected */
  requiredServers?: string[]
  /** Optional MCP servers that enhance functionality */
  optionalServers?: string[]
  /** Required tools from MCP servers */
  requiredTools?: string[]
}

/**
 * Complete Module Manifest
 */
export interface ModuleManifest {
  /** Manifest schema version */
  $schema?: string
  /** Module metadata */
  module: ModuleManifestMetadata
  /** Access control */
  access: ModuleManifestAccess
  /** Onboarding configuration (optional) */
  onboarding?: ModuleManifestOnboarding
  /** Feature flags */
  features?: ManifestFeature[]
  /** MCP requirements */
  mcp?: ModuleManifestMCP
}

// =============================================================================
// LOCALIZED MANIFEST
// =============================================================================

/**
 * Localized strings for a manifest
 * Only contains translatable fields
 */
export interface ModuleManifestLocale {
  /** Locale identifier */
  locale: SupportedLocale
  /** Module name */
  name: string
  /** Module description */
  description: string
  /** Onboarding translations */
  onboarding?: {
    title: string
    description?: string
    certificationTitle?: string
    steps: Array<{
      id: string
      title: string
      description?: string
      acknowledgmentMessage?: string
      acknowledgmentLabel?: string
      questions?: Array<{
        id: string
        question: string
        options: string[]
        explanation?: string
      }>
    }>
  }
  /** Feature translations */
  features?: Array<{
    id: string
    name: string
    description?: string
  }>
}

// =============================================================================
// ARTIFACT TYPES (what gets stored in MCP)
// =============================================================================

/**
 * Module manifest artifact stored in LICENSE scope
 */
export interface ModuleManifestArtifact {
  /** Artifact key pattern: MODULE_MANIFEST_{moduleId} */
  id: string
  /** Manifest version */
  version: string
  /** When this was seeded/updated */
  seedAt: string
  /** The complete manifest */
  manifest: ModuleManifest
  /** Locale-specific overrides */
  locales: Record<SupportedLocale, ModuleManifestLocale>
  /** License-specific overrides (set by admin) */
  overrides?: {
    access?: Partial<ModuleManifestAccess>
    features?: Array<{ id: string; enabled: boolean }>
  }
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Result of loading a manifest from filesystem
 */
export interface LoadedManifest {
  /** Module ID */
  moduleId: string
  /** Base manifest */
  manifest: ModuleManifest
  /** Available locales */
  locales: Map<SupportedLocale, ModuleManifestLocale>
  /** Path to manifest directory */
  basePath: string
}

/**
 * Manifest validation result
 */
export interface ManifestValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
