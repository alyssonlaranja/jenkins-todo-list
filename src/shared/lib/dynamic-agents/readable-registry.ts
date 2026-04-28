/**
 * Readable Registry - Centralized CopilotKit Context Readables
 *
 * This file contains all useCopilotReadable configurations for the platform.
 * Readables provide context to the AI about the current state of the application.
 *
 * Usage:
 * - Use `getReadablesForModule(module)` to get all readables for a module
 * - Use with `useDynamicReadables` hook for i18n-aware readable registration
 *
 * @see COPILOT_INTEGRATIONS_INVENTORY.md
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Category of readable for grouping
 */
export type ReadableCategory =
  | 'user' // User info (name, email, role)
  | 'session' // Session info (connection, namespace, license)
  | 'navigation' // Current location (module, page, route)
  | 'state' // Application state (wizard step, form data)
  | 'data' // Data context (epic, feature, tasks)
  | 'config' // Configuration (settings, preferences)

/**
 * Registry entry for CopilotKit readable
 */
export interface ReadableRegistryEntry {
  /** Unique key for this readable */
  key: string
  /** Module this readable belongs to */
  module: ReadableModule
  /** Category for grouping */
  category: ReadableCategory
  /** i18n path for description */
  i18nDescPath: string
  /** Fallback description if i18n not available */
  fallbackDescription: string
  /** Context key in the readable context object */
  contextKey: string
  /** Whether this is a parent readable (for hierarchical context) */
  isParent?: boolean
  /** Parent readable key (for hierarchical context) */
  parentKey?: string
  /** Source file where readable is defined */
  sourceFile: string
}

/**
 * Modules that have CopilotKit readables
 */
export type ReadableModule =
  | 'global'
  | 'atlas'
  | 'kanban'
  | 'upstream'
  | 'downstream'
  | 'migration'
  | 'onboarding'
  | 'feedback'
  | 'my-tasks'

// ============================================================================
// READABLE KEYS CONSTANTS
// ============================================================================

export const READABLE_KEYS = {
  // Global / Session
  CURRENT_USER: 'global.currentUser',
  SESSION_INFO: 'global.sessionInfo',
  CONNECTION_STATUS: 'global.connectionStatus',
  NAMESPACE_CONTEXT: 'global.namespaceContext',
  LICENSE_CONTEXT: 'global.licenseContext',

  // Navigation
  CURRENT_MODULE: 'navigation.currentModule',
  CURRENT_PAGE: 'navigation.currentPage',
  CURRENT_ROUTE: 'navigation.currentRoute',
  BREADCRUMB: 'navigation.breadcrumb',

  // Atlas Quick Agent
  ATLAS_CAPABILITIES: 'atlas.capabilities',
  ATLAS_AVAILABLE_ACTIONS: 'atlas.availableActions',

  // Kanban / Tasks
  KANBAN_BOARD_STATE: 'kanban.boardState',
  KANBAN_TASK_COUNTS: 'kanban.taskCounts',
  KANBAN_OVERDUE_TASKS: 'kanban.overdueTasks',

  // Upstream Wizard
  UPSTREAM_EPIC: 'upstream.epic',
  UPSTREAM_CURRENT_STEP: 'upstream.currentStep',
  UPSTREAM_STEP_DATA: 'upstream.stepData',
  UPSTREAM_HYPOTHESES: 'upstream.hypotheses',
  UPSTREAM_KNOWLEDGE_BASE: 'upstream.knowledgeBase',

  // Downstream Wizard
  DOWNSTREAM_FEATURE: 'downstream.feature',
  DOWNSTREAM_CURRENT_STEP: 'downstream.currentStep',
  DOWNSTREAM_STEP_DATA: 'downstream.stepData',
  DOWNSTREAM_REQUIREMENTS: 'downstream.requirements',

  // Migration Wizard
  MIGRATION_SOURCE_ENV: 'migration.sourceEnv',
  MIGRATION_TARGET_ENV: 'migration.targetEnv',
  MIGRATION_CURRENT_STEP: 'migration.currentStep',
  MIGRATION_SELECTED_AGENTS: 'migration.selectedAgents',
  MIGRATION_PROGRESS: 'migration.progress',

  // Onboarding
  ONBOARDING_TRAINING: 'onboarding.training',
  ONBOARDING_CURRENT_STEP: 'onboarding.currentStep',
  ONBOARDING_PROGRESS: 'onboarding.progress',
  ONBOARDING_QUIZ_STATE: 'onboarding.quizState',

  // Feedback Hub
  FEEDBACK_HUB_STATE: 'feedback.hubState',
  FEEDBACK_CATEGORIES: 'feedback.categories',
  FEEDBACK_STATISTICS: 'feedback.statistics',
} as const

// ============================================================================
// READABLE REGISTRY
// ============================================================================

export const READABLE_REGISTRY: Record<string, ReadableRegistryEntry> = {
  // =========================================================================
  // GLOBAL / SESSION READABLES
  // =========================================================================

  [READABLE_KEYS.CURRENT_USER]: {
    key: READABLE_KEYS.CURRENT_USER,
    module: 'global',
    category: 'user',
    i18nDescPath: 'copilot:readables.global.currentUser.description',
    fallbackDescription: 'Current user information including name and email',
    contextKey: 'currentUser',
    isParent: true,
    sourceFile: 'src/shared/hooks/use-atlas-page-context.ts',
  },

  [READABLE_KEYS.SESSION_INFO]: {
    key: READABLE_KEYS.SESSION_INFO,
    module: 'global',
    category: 'session',
    i18nDescPath: 'copilot:readables.global.sessionInfo.description',
    fallbackDescription: 'Current session information and connection status',
    contextKey: 'sessionInfo',
    sourceFile: 'src/shared/hooks/use-atlas-page-context.ts',
  },

  [READABLE_KEYS.CONNECTION_STATUS]: {
    key: READABLE_KEYS.CONNECTION_STATUS,
    module: 'global',
    category: 'session',
    i18nDescPath: 'copilot:readables.global.connectionStatus.description',
    fallbackDescription: 'MCP connection status (connected/disconnected)',
    contextKey: 'isConnected',
    sourceFile: 'src/shared/hooks/use-atlas-page-context.ts',
  },

  [READABLE_KEYS.NAMESPACE_CONTEXT]: {
    key: READABLE_KEYS.NAMESPACE_CONTEXT,
    module: 'global',
    category: 'session',
    i18nDescPath: 'copilot:readables.global.namespaceContext.description',
    fallbackDescription: 'Current namespace ID and name',
    contextKey: 'namespace',
    sourceFile: 'src/shared/hooks/use-atlas-page-context.ts',
  },

  [READABLE_KEYS.LICENSE_CONTEXT]: {
    key: READABLE_KEYS.LICENSE_CONTEXT,
    module: 'global',
    category: 'session',
    i18nDescPath: 'copilot:readables.global.licenseContext.description',
    fallbackDescription: 'Current license ID and name',
    contextKey: 'license',
    sourceFile: 'src/shared/hooks/use-atlas-page-context.ts',
  },

  // =========================================================================
  // NAVIGATION READABLES
  // =========================================================================

  [READABLE_KEYS.CURRENT_MODULE]: {
    key: READABLE_KEYS.CURRENT_MODULE,
    module: 'global',
    category: 'navigation',
    i18nDescPath: 'copilot:readables.navigation.currentModule.description',
    fallbackDescription:
      'Current module (dashboard, upstream, downstream, etc.)',
    contextKey: 'currentModule',
    sourceFile: 'src/shared/hooks/use-atlas-page-context.ts',
  },

  [READABLE_KEYS.CURRENT_PAGE]: {
    key: READABLE_KEYS.CURRENT_PAGE,
    module: 'global',
    category: 'navigation',
    i18nDescPath: 'copilot:readables.navigation.currentPage.description',
    fallbackDescription: 'Current page pathname',
    contextKey: 'pathname',
    sourceFile: 'src/shared/hooks/use-atlas-page-context.ts',
  },

  // =========================================================================
  // ATLAS QUICK AGENT READABLES
  // =========================================================================

  [READABLE_KEYS.ATLAS_CAPABILITIES]: {
    key: READABLE_KEYS.ATLAS_CAPABILITIES,
    module: 'atlas',
    category: 'config',
    i18nDescPath: 'copilot:readables.atlas.capabilities.description',
    fallbackDescription:
      'Available Atlas capabilities and actions for current context',
    contextKey: 'atlasCapabilities',
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/index.tsx',
  },

  // =========================================================================
  // KANBAN READABLES
  // =========================================================================

  [READABLE_KEYS.KANBAN_BOARD_STATE]: {
    key: READABLE_KEYS.KANBAN_BOARD_STATE,
    module: 'kanban',
    category: 'state',
    i18nDescPath: 'copilot:readables.kanban.boardState.description',
    fallbackDescription:
      'Current Kanban board state including all tasks by column',
    contextKey: 'kanbanBoard',
    isParent: true,
    sourceFile: 'src/features/my-tasks/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.KANBAN_TASK_COUNTS]: {
    key: READABLE_KEYS.KANBAN_TASK_COUNTS,
    module: 'kanban',
    category: 'state',
    i18nDescPath: 'copilot:readables.kanban.taskCounts.description',
    fallbackDescription: 'Number of tasks in each status column',
    contextKey: 'taskCounts',
    parentKey: READABLE_KEYS.KANBAN_BOARD_STATE,
    sourceFile: 'src/features/my-tasks/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.KANBAN_OVERDUE_TASKS]: {
    key: READABLE_KEYS.KANBAN_OVERDUE_TASKS,
    module: 'kanban',
    category: 'state',
    i18nDescPath: 'copilot:readables.kanban.overdueTasks.description',
    fallbackDescription: 'List of tasks past their due date',
    contextKey: 'overdueTasks',
    parentKey: READABLE_KEYS.KANBAN_BOARD_STATE,
    sourceFile: 'src/features/my-tasks/copilot-actions/context-readables.tsx',
  },

  // =========================================================================
  // UPSTREAM WIZARD READABLES
  // =========================================================================

  [READABLE_KEYS.UPSTREAM_EPIC]: {
    key: READABLE_KEYS.UPSTREAM_EPIC,
    module: 'upstream',
    category: 'data',
    i18nDescPath: 'copilot:readables.upstream.epic.description',
    fallbackDescription:
      'Current Business Epic data including name, description, and status',
    contextKey: 'epic',
    isParent: true,
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.UPSTREAM_CURRENT_STEP]: {
    key: READABLE_KEYS.UPSTREAM_CURRENT_STEP,
    module: 'upstream',
    category: 'state',
    i18nDescPath: 'copilot:readables.upstream.currentStep.description',
    fallbackDescription: 'Current BV Framework step (1-7)',
    contextKey: 'currentStep',
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.UPSTREAM_STEP_DATA]: {
    key: READABLE_KEYS.UPSTREAM_STEP_DATA,
    module: 'upstream',
    category: 'data',
    i18nDescPath: 'copilot:readables.upstream.stepData.description',
    fallbackDescription: 'Data for the current wizard step',
    contextKey: 'stepData',
    parentKey: READABLE_KEYS.UPSTREAM_EPIC,
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.UPSTREAM_HYPOTHESES]: {
    key: READABLE_KEYS.UPSTREAM_HYPOTHESES,
    module: 'upstream',
    category: 'data',
    i18nDescPath: 'copilot:readables.upstream.hypotheses.description',
    fallbackDescription: 'Validation hypotheses for the epic',
    contextKey: 'hypotheses',
    parentKey: READABLE_KEYS.UPSTREAM_EPIC,
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.UPSTREAM_KNOWLEDGE_BASE]: {
    key: READABLE_KEYS.UPSTREAM_KNOWLEDGE_BASE,
    module: 'upstream',
    category: 'data',
    i18nDescPath: 'copilot:readables.upstream.knowledgeBase.description',
    fallbackDescription: 'Available knowledge base documents',
    contextKey: 'knowledgeBase',
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/context-readables.tsx',
  },

  // =========================================================================
  // DOWNSTREAM WIZARD READABLES
  // =========================================================================

  [READABLE_KEYS.DOWNSTREAM_FEATURE]: {
    key: READABLE_KEYS.DOWNSTREAM_FEATURE,
    module: 'downstream',
    category: 'data',
    i18nDescPath: 'copilot:readables.downstream.feature.description',
    fallbackDescription: 'Current Feature data for execution',
    contextKey: 'feature',
    isParent: true,
    sourceFile:
      'src/features/downstream/components/wizard/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.DOWNSTREAM_CURRENT_STEP]: {
    key: READABLE_KEYS.DOWNSTREAM_CURRENT_STEP,
    module: 'downstream',
    category: 'state',
    i18nDescPath: 'copilot:readables.downstream.currentStep.description',
    fallbackDescription: 'Current downstream step (1-6)',
    contextKey: 'currentStep',
    sourceFile:
      'src/features/downstream/components/wizard/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.DOWNSTREAM_STEP_DATA]: {
    key: READABLE_KEYS.DOWNSTREAM_STEP_DATA,
    module: 'downstream',
    category: 'data',
    i18nDescPath: 'copilot:readables.downstream.stepData.description',
    fallbackDescription: 'Data for the current execution step',
    contextKey: 'stepData',
    parentKey: READABLE_KEYS.DOWNSTREAM_FEATURE,
    sourceFile:
      'src/features/downstream/components/wizard/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.DOWNSTREAM_REQUIREMENTS]: {
    key: READABLE_KEYS.DOWNSTREAM_REQUIREMENTS,
    module: 'downstream',
    category: 'data',
    i18nDescPath: 'copilot:readables.downstream.requirements.description',
    fallbackDescription: 'Feature requirements and acceptance criteria',
    contextKey: 'requirements',
    parentKey: READABLE_KEYS.DOWNSTREAM_FEATURE,
    sourceFile:
      'src/features/downstream/components/wizard/copilot-actions/context-readables.tsx',
  },

  // =========================================================================
  // MIGRATION WIZARD READABLES
  // =========================================================================

  [READABLE_KEYS.MIGRATION_SOURCE_ENV]: {
    key: READABLE_KEYS.MIGRATION_SOURCE_ENV,
    module: 'migration',
    category: 'config',
    i18nDescPath: 'copilot:readables.migration.sourceEnv.description',
    fallbackDescription: 'Source environment for migration',
    contextKey: 'sourceEnvironment',
    sourceFile:
      'src/features/migration-wizard/wizard/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.MIGRATION_TARGET_ENV]: {
    key: READABLE_KEYS.MIGRATION_TARGET_ENV,
    module: 'migration',
    category: 'config',
    i18nDescPath: 'copilot:readables.migration.targetEnv.description',
    fallbackDescription: 'Target environment for migration',
    contextKey: 'targetEnvironment',
    sourceFile:
      'src/features/migration-wizard/wizard/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.MIGRATION_CURRENT_STEP]: {
    key: READABLE_KEYS.MIGRATION_CURRENT_STEP,
    module: 'migration',
    category: 'state',
    i18nDescPath: 'copilot:readables.migration.currentStep.description',
    fallbackDescription: 'Current migration wizard step (1-5)',
    contextKey: 'currentStep',
    sourceFile:
      'src/features/migration-wizard/wizard/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.MIGRATION_SELECTED_AGENTS]: {
    key: READABLE_KEYS.MIGRATION_SELECTED_AGENTS,
    module: 'migration',
    category: 'data',
    i18nDescPath: 'copilot:readables.migration.selectedAgents.description',
    fallbackDescription: 'Agents selected for migration',
    contextKey: 'selectedAgents',
    sourceFile:
      'src/features/migration-wizard/wizard/copilot-actions/context-readables.tsx',
  },

  [READABLE_KEYS.MIGRATION_PROGRESS]: {
    key: READABLE_KEYS.MIGRATION_PROGRESS,
    module: 'migration',
    category: 'state',
    i18nDescPath: 'copilot:readables.migration.progress.description',
    fallbackDescription: 'Migration progress status and statistics',
    contextKey: 'migrationProgress',
    sourceFile:
      'src/features/migration-wizard/wizard/copilot-actions/context-readables.tsx',
  },

  // =========================================================================
  // ONBOARDING READABLES
  // =========================================================================

  [READABLE_KEYS.ONBOARDING_TRAINING]: {
    key: READABLE_KEYS.ONBOARDING_TRAINING,
    module: 'onboarding',
    category: 'data',
    i18nDescPath: 'copilot:readables.onboarding.training.description',
    fallbackDescription: 'Current training manifest and structure',
    contextKey: 'training',
    isParent: true,
    sourceFile:
      'src/features/onboarding/components/copilot-actions/context-readables.ts',
  },

  [READABLE_KEYS.ONBOARDING_CURRENT_STEP]: {
    key: READABLE_KEYS.ONBOARDING_CURRENT_STEP,
    module: 'onboarding',
    category: 'state',
    i18nDescPath: 'copilot:readables.onboarding.currentStep.description',
    fallbackDescription: 'Current training step being viewed',
    contextKey: 'currentStep',
    parentKey: READABLE_KEYS.ONBOARDING_TRAINING,
    sourceFile:
      'src/features/onboarding/components/copilot-actions/context-readables.ts',
  },

  [READABLE_KEYS.ONBOARDING_PROGRESS]: {
    key: READABLE_KEYS.ONBOARDING_PROGRESS,
    module: 'onboarding',
    category: 'state',
    i18nDescPath: 'copilot:readables.onboarding.progress.description',
    fallbackDescription: 'Training progress (completed steps, percentage)',
    contextKey: 'progress',
    parentKey: READABLE_KEYS.ONBOARDING_TRAINING,
    sourceFile:
      'src/features/onboarding/components/copilot-actions/context-readables.ts',
  },

  [READABLE_KEYS.ONBOARDING_QUIZ_STATE]: {
    key: READABLE_KEYS.ONBOARDING_QUIZ_STATE,
    module: 'onboarding',
    category: 'state',
    i18nDescPath: 'copilot:readables.onboarding.quizState.description',
    fallbackDescription: 'Current quiz state (question, attempts, score)',
    contextKey: 'quizState',
    sourceFile:
      'src/features/onboarding/components/copilot-actions/context-readables.ts',
  },

  // =========================================================================
  // FEEDBACK HUB READABLES
  // =========================================================================

  [READABLE_KEYS.FEEDBACK_HUB_STATE]: {
    key: READABLE_KEYS.FEEDBACK_HUB_STATE,
    module: 'feedback',
    category: 'state',
    i18nDescPath: 'copilot:readables.feedback.hubState.description',
    fallbackDescription: 'Current Feedback Hub Kanban board state',
    contextKey: 'feedbackHub',
    isParent: true,
    sourceFile: 'src/features/atlas/pages/atlas-page.tsx',
  },

  [READABLE_KEYS.FEEDBACK_CATEGORIES]: {
    key: READABLE_KEYS.FEEDBACK_CATEGORIES,
    module: 'feedback',
    category: 'config',
    i18nDescPath: 'copilot:readables.feedback.categories.description',
    fallbackDescription: 'Available feedback categories with metadata',
    contextKey: 'feedbackCategories',
    sourceFile: 'src/features/atlas/pages/atlas-page.tsx',
  },

  [READABLE_KEYS.FEEDBACK_STATISTICS]: {
    key: READABLE_KEYS.FEEDBACK_STATISTICS,
    module: 'feedback',
    category: 'data',
    i18nDescPath: 'copilot:readables.feedback.statistics.description',
    fallbackDescription: 'Feedback statistics by category and status',
    contextKey: 'feedbackStats',
    parentKey: READABLE_KEYS.FEEDBACK_HUB_STATE,
    sourceFile: 'src/features/atlas/pages/atlas-page.tsx',
  },
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all readables for a specific module
 */
export function getReadablesForModule(
  module: ReadableModule
): ReadableRegistryEntry[] {
  return Object.values(READABLE_REGISTRY).filter(r => r.module === module)
}

/**
 * Get all readables for a specific category
 */
export function getReadablesByCategory(
  category: ReadableCategory
): ReadableRegistryEntry[] {
  return Object.values(READABLE_REGISTRY).filter(r => r.category === category)
}

/**
 * Get readable by key
 */
export function getReadableByKey(
  key: string
): ReadableRegistryEntry | undefined {
  return READABLE_REGISTRY[key]
}

/**
 * Get parent readables (top-level contexts)
 */
export function getParentReadables(): ReadableRegistryEntry[] {
  return Object.values(READABLE_REGISTRY).filter(r => r.isParent)
}

/**
 * Get child readables for a parent
 */
export function getChildReadables(parentKey: string): ReadableRegistryEntry[] {
  return Object.values(READABLE_REGISTRY).filter(r => r.parentKey === parentKey)
}

/**
 * Get global readables (session, navigation, user)
 */
export function getGlobalReadables(): ReadableRegistryEntry[] {
  return Object.values(READABLE_REGISTRY).filter(r => r.module === 'global')
}

/**
 * Count readables by module
 */
export function countReadablesByModule(): Record<ReadableModule, number> {
  const counts: Record<ReadableModule, number> = {
    global: 0,
    atlas: 0,
    kanban: 0,
    upstream: 0,
    downstream: 0,
    migration: 0,
    onboarding: 0,
    feedback: 0,
  }

  Object.values(READABLE_REGISTRY).forEach(readable => {
    counts[readable.module]++
  })

  return counts
}

/**
 * Count readables by category
 */
export function countReadablesByCategory(): Record<ReadableCategory, number> {
  const counts: Record<ReadableCategory, number> = {
    user: 0,
    session: 0,
    navigation: 0,
    state: 0,
    data: 0,
    config: 0,
  }

  Object.values(READABLE_REGISTRY).forEach(readable => {
    counts[readable.category]++
  })

  return counts
}
