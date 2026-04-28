/**
 * Suggestion Registry - Centralized CopilotKit Chat Suggestions
 *
 * This file contains all chat suggestion configurations for the platform.
 * Suggestions are organized by module and step, with i18n support for instructions.
 *
 * Usage:
 * - Use `getSuggestionConfig(module, step?)` to get suggestion config
 * - Use with `useDynamicSuggestions` hook for i18n-aware suggestion registration
 *
 * @see COPILOT_INTEGRATIONS_INVENTORY.md
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * i18n path for suggestion instructions
 * Format: module.context.suggestions (e.g., 'atlas.quick.suggestions')
 */
export type SuggestionI18nPath = string

/**
 * Registry entry for CopilotKit chat suggestions
 */
export interface SuggestionRegistryEntry {
  /** Unique key for this suggestion config */
  key: string
  /** Module this suggestion belongs to */
  module: SuggestionModule
  /** Step within module (for wizards, undefined for global) */
  step?: number
  /** i18n path for instructions template */
  i18nInstructionsPath: SuggestionI18nPath
  /** Fallback instructions template if i18n not available */
  fallbackInstructions: string
  /** Minimum suggestions to show */
  minSuggestions: number
  /** Maximum suggestions to show */
  maxSuggestions: number
  /** Available context variables for template interpolation */
  contextVariables: string[]
  /** Source file where suggestion is defined */
  sourceFile: string
}

/**
 * Modules that have CopilotKit suggestions
 */
export type SuggestionModule =
  | 'atlas'
  | 'kanban'
  | 'upstream'
  | 'downstream'
  | 'migration'
  | 'onboarding'
  | 'feedback'
  | 'my-tasks'

// ============================================================================
// SUGGESTION KEYS CONSTANTS
// ============================================================================

export const SUGGESTION_KEYS = {
  // Atlas Quick Agent
  ATLAS_GLOBAL: 'atlas.global',

  // Kanban
  KANBAN_BOARD: 'kanban.board',

  // Upstream Wizard (7 steps)
  UPSTREAM_STEP_1: 'upstream.step1.ideation',
  UPSTREAM_STEP_2: 'upstream.step2.immersion',
  UPSTREAM_STEP_3: 'upstream.step3.validation',
  UPSTREAM_STEP_4: 'upstream.step4.exploration',
  UPSTREAM_STEP_5: 'upstream.step5.analysis',
  UPSTREAM_STEP_6: 'upstream.step6.prioritization',
  UPSTREAM_STEP_7: 'upstream.step7.transition',

  // Downstream Wizard (6 steps)
  DOWNSTREAM_STEP_1: 'downstream.step1.todo',
  DOWNSTREAM_STEP_2: 'downstream.step2.refinement',
  DOWNSTREAM_STEP_3: 'downstream.step3.solutionDesign',
  DOWNSTREAM_STEP_4: 'downstream.step4.inProgress',
  DOWNSTREAM_STEP_5: 'downstream.step5.inReview',
  DOWNSTREAM_STEP_6: 'downstream.step6.done',

  // Migration Wizard (5 steps)
  MIGRATION_STEP_1: 'migration.step1.connection',
  MIGRATION_STEP_2: 'migration.step2.discovery',
  MIGRATION_STEP_3: 'migration.step3.analysis',
  MIGRATION_STEP_4: 'migration.step4.execution',
  MIGRATION_STEP_5: 'migration.step5.verification',

  // Onboarding
  ONBOARDING_TRAINING: 'onboarding.training',
  ONBOARDING_QUIZ: 'onboarding.quiz',

  // Feedback Hub
  FEEDBACK_HUB: 'feedback.hub',
} as const

// ============================================================================
// SUGGESTION REGISTRY
// ============================================================================

export const SUGGESTION_REGISTRY: Record<string, SuggestionRegistryEntry> = {
  // =========================================================================
  // ATLAS QUICK AGENT - Global
  // =========================================================================

  [SUGGESTION_KEYS.ATLAS_GLOBAL]: {
    key: SUGGESTION_KEYS.ATLAS_GLOBAL,
    module: 'atlas',
    i18nInstructionsPath: 'copilot:suggestions.atlas.global',
    fallbackInstructions: `Based on the current context:
- User: \${USER_NAME}
- Current module: \${CURRENT_MODULE}
- Current page: \${CURRENT_PAGE}
- Namespace: \${NAMESPACE}

Generate 3 helpful action suggestions the user might want to take.
Consider:
- What page they are on
- Common tasks for this module
- Creating tasks, signals, or navigating
- Quick actions available`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: [
      'USER_NAME',
      'CURRENT_MODULE',
      'CURRENT_PAGE',
      'NAMESPACE',
    ],
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/chat-suggestions.tsx',
  },

  // =========================================================================
  // KANBAN - Board
  // =========================================================================

  [SUGGESTION_KEYS.KANBAN_BOARD]: {
    key: SUGGESTION_KEYS.KANBAN_BOARD,
    module: 'kanban',
    i18nInstructionsPath: 'copilot:suggestions.kanban.board',
    fallbackInstructions: `Based on the Kanban board state:
- User: \${USER_NAME}
- Total tasks: \${TOTAL_TASKS}
- Tasks by status: \${TASK_COUNTS}
- Overdue tasks: \${OVERDUE_COUNT}

Suggest 3 helpful actions:
- Tasks that need attention
- Workflow improvements
- Quick batch actions`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: [
      'USER_NAME',
      'TOTAL_TASKS',
      'TASK_COUNTS',
      'OVERDUE_COUNT',
    ],
    sourceFile: 'src/features/my-tasks/copilot-actions/chat-suggestions.tsx',
  },

  // =========================================================================
  // UPSTREAM WIZARD - Steps 1-7
  // =========================================================================

  [SUGGESTION_KEYS.UPSTREAM_STEP_1]: {
    key: SUGGESTION_KEYS.UPSTREAM_STEP_1,
    module: 'upstream',
    step: 1,
    i18nInstructionsPath: 'copilot:suggestions.upstream.step1',
    fallbackInstructions: `BV Framework Step 1: Ideation
Epic: \${EPIC_NAME}
Status: \${EPIC_STATUS}

Suggest 3 actions to help define the Macro Initiative:
- Suggest epic name if empty
- Help with description
- Suggest OKR alignment
- Define initial business value`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['EPIC_NAME', 'EPIC_STATUS', 'USER_NAME'],
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.UPSTREAM_STEP_2]: {
    key: SUGGESTION_KEYS.UPSTREAM_STEP_2,
    module: 'upstream',
    step: 2,
    i18nInstructionsPath: 'copilot:suggestions.upstream.step2',
    fallbackInstructions: `BV Framework Step 2: Immersion
Epic: \${EPIC_NAME}

Suggest 3 actions for deep dive:
- Build CSD Matrix (Certainties, Suppositions, Doubts)
- Create Opportunity Tree
- Identify Stakeholders
- Document Initial Risks`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['EPIC_NAME', 'EPIC_STATUS', 'CSD_COMPLETE'],
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.UPSTREAM_STEP_3]: {
    key: SUGGESTION_KEYS.UPSTREAM_STEP_3,
    module: 'upstream',
    step: 3,
    i18nInstructionsPath: 'copilot:suggestions.upstream.step3',
    fallbackInstructions: `BV Framework Step 3: Validation
Epic: \${EPIC_NAME}
Hypotheses: \${HYPOTHESES_COUNT}

Suggest 3 actions for hypothesis validation:
- Add validation method
- Document results
- Suggest data sources
- Add supporting evidence`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['EPIC_NAME', 'HYPOTHESES_COUNT', 'VALIDATED_COUNT'],
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.UPSTREAM_STEP_4]: {
    key: SUGGESTION_KEYS.UPSTREAM_STEP_4,
    module: 'upstream',
    step: 4,
    i18nInstructionsPath: 'copilot:suggestions.upstream.step4',
    fallbackInstructions: `BV Framework Step 4: Exploration
Epic: \${EPIC_NAME}

Suggest 3 actions for requirements exploration:
- Define macro requirements
- Map actors and personas
- Create business flow diagrams
- Document user journeys`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['EPIC_NAME', 'REQUIREMENTS_COUNT', 'FLOWS_COUNT'],
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.UPSTREAM_STEP_5]: {
    key: SUGGESTION_KEYS.UPSTREAM_STEP_5,
    module: 'upstream',
    step: 5,
    i18nInstructionsPath: 'copilot:suggestions.upstream.step5',
    fallbackInstructions: `BV Framework Step 5: Analysis
Epic: \${EPIC_NAME}

Suggest 3 actions for technical analysis:
- Create architecture blueprint
- Perform impact analysis
- Document GAP analysis
- Identify dependencies`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['EPIC_NAME', 'BLUEPRINT_URL', 'DEPENDENCIES_COUNT'],
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.UPSTREAM_STEP_6]: {
    key: SUGGESTION_KEYS.UPSTREAM_STEP_6,
    module: 'upstream',
    step: 6,
    i18nInstructionsPath: 'copilot:suggestions.upstream.step6',
    fallbackInstructions: `BV Framework Step 6: Prioritization
Epic: \${EPIC_NAME}
Business Value: \${BUSINESS_VALUE}

Suggest 3 actions for prioritization:
- Calculate final business value
- Estimate effort distribution
- Assess risk level
- Define KPIs and success metrics`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['EPIC_NAME', 'BUSINESS_VALUE', 'EFFORT', 'RISK_LEVEL'],
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.UPSTREAM_STEP_7]: {
    key: SUGGESTION_KEYS.UPSTREAM_STEP_7,
    module: 'upstream',
    step: 7,
    i18nInstructionsPath: 'copilot:suggestions.upstream.step7',
    fallbackInstructions: `BV Framework Step 7: Transition
Epic: \${EPIC_NAME}

Suggest 3 actions for handoff:
- Generate Jira backlog items
- Create handoff document
- Define responsibility agreements
- Prepare QBR memo`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['EPIC_NAME', 'JIRA_ITEMS_COUNT', 'HANDOFF_READY'],
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  // =========================================================================
  // DOWNSTREAM WIZARD - Steps 1-6
  // =========================================================================

  [SUGGESTION_KEYS.DOWNSTREAM_STEP_1]: {
    key: SUGGESTION_KEYS.DOWNSTREAM_STEP_1,
    module: 'downstream',
    step: 1,
    i18nInstructionsPath: 'copilot:suggestions.downstream.step1',
    fallbackInstructions: `Downstream Step 1: TODO (Backlog)
Feature: \${FEATURE_NAME}

Suggest 3 actions for backlog planning:
- Review and prioritize items
- Add acceptance criteria
- Link to upstream epic
- Estimate story points`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['FEATURE_NAME', 'BACKLOG_COUNT'],
    sourceFile:
      'src/features/downstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.DOWNSTREAM_STEP_2]: {
    key: SUGGESTION_KEYS.DOWNSTREAM_STEP_2,
    module: 'downstream',
    step: 2,
    i18nInstructionsPath: 'copilot:suggestions.downstream.step2',
    fallbackInstructions: `Downstream Step 2: Refinement
Feature: \${FEATURE_NAME}

Suggest 3 actions for requirements refinement:
- Detail acceptance criteria
- Identify edge cases
- Define test scenarios
- Document constraints`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['FEATURE_NAME', 'CRITERIA_COUNT'],
    sourceFile:
      'src/features/downstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.DOWNSTREAM_STEP_3]: {
    key: SUGGESTION_KEYS.DOWNSTREAM_STEP_3,
    module: 'downstream',
    step: 3,
    i18nInstructionsPath: 'copilot:suggestions.downstream.step3',
    fallbackInstructions: `Downstream Step 3: Solution Design
Feature: \${FEATURE_NAME}

Suggest 3 actions for solution design:
- Create technical design
- Review security implications
- Document API contracts
- Plan database changes`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['FEATURE_NAME', 'DESIGN_STATUS'],
    sourceFile:
      'src/features/downstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.DOWNSTREAM_STEP_4]: {
    key: SUGGESTION_KEYS.DOWNSTREAM_STEP_4,
    module: 'downstream',
    step: 4,
    i18nInstructionsPath: 'copilot:suggestions.downstream.step4',
    fallbackInstructions: `Downstream Step 4: In Progress
Feature: \${FEATURE_NAME}

Suggest 3 actions for development:
- Track implementation progress
- Document technical decisions
- Add unit tests
- Update progress status`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['FEATURE_NAME', 'PROGRESS_PERCENT'],
    sourceFile:
      'src/features/downstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.DOWNSTREAM_STEP_5]: {
    key: SUGGESTION_KEYS.DOWNSTREAM_STEP_5,
    module: 'downstream',
    step: 5,
    i18nInstructionsPath: 'copilot:suggestions.downstream.step5',
    fallbackInstructions: `Downstream Step 5: In Review
Feature: \${FEATURE_NAME}

Suggest 3 actions for review:
- Complete QA checklist
- Document review findings
- Address review comments
- Prepare for release`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['FEATURE_NAME', 'REVIEW_STATUS'],
    sourceFile:
      'src/features/downstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.DOWNSTREAM_STEP_6]: {
    key: SUGGESTION_KEYS.DOWNSTREAM_STEP_6,
    module: 'downstream',
    step: 6,
    i18nInstructionsPath: 'copilot:suggestions.downstream.step6',
    fallbackInstructions: `Downstream Step 6: Done
Feature: \${FEATURE_NAME}

Suggest 3 actions for completion:
- Generate release notes
- Update documentation
- Close related tickets
- Celebrate success! 🎉`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['FEATURE_NAME', 'RELEASE_DATE'],
    sourceFile:
      'src/features/downstream/components/wizard/copilot-actions/chat-suggestions.tsx',
  },

  // =========================================================================
  // MIGRATION WIZARD - Steps 1-5
  // =========================================================================

  [SUGGESTION_KEYS.MIGRATION_STEP_1]: {
    key: SUGGESTION_KEYS.MIGRATION_STEP_1,
    module: 'migration',
    step: 1,
    i18nInstructionsPath: 'copilot:suggestions.migration.main',
    fallbackInstructions: `Migration Step 1: Connection Setup
Source: \${SOURCE_ENV}
Target: \${TARGET_ENV}

Suggest 3 actions:
- Connect to source environment
- Connect to target environment
- Verify connection health
- Check permissions`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['SOURCE_ENV', 'TARGET_ENV', 'CONNECTION_STATUS'],
    sourceFile:
      'src/features/migration-wizard/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.MIGRATION_STEP_2]: {
    key: SUGGESTION_KEYS.MIGRATION_STEP_2,
    module: 'migration',
    step: 2,
    i18nInstructionsPath: 'copilot:suggestions.migration.main',
    fallbackInstructions: `Migration Step 2: Agent Discovery
Source: \${SOURCE_ENV}

Suggest 3 actions:
- Discover all agents
- Filter by type/status
- Select agents to migrate
- Review agent details`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['SOURCE_ENV', 'AGENTS_FOUND', 'SELECTED_COUNT'],
    sourceFile:
      'src/features/migration-wizard/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.MIGRATION_STEP_3]: {
    key: SUGGESTION_KEYS.MIGRATION_STEP_3,
    module: 'migration',
    step: 3,
    i18nInstructionsPath: 'copilot:suggestions.migration.main',
    fallbackInstructions: `Migration Step 3: Analysis & Validation
Selected agents: \${SELECTED_COUNT}

Suggest 3 actions:
- Analyze compatibility
- Check dependencies
- Validate artifact references
- Review migration plan`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['SELECTED_COUNT', 'COMPATIBILITY_ISSUES', 'WARNINGS'],
    sourceFile:
      'src/features/migration-wizard/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.MIGRATION_STEP_4]: {
    key: SUGGESTION_KEYS.MIGRATION_STEP_4,
    module: 'migration',
    step: 4,
    i18nInstructionsPath: 'copilot:suggestions.migration.main',
    fallbackInstructions: `Migration Step 4: Execution
Agents to migrate: \${AGENTS_TO_MIGRATE}

Suggest 3 actions:
- Start migration
- Monitor progress
- Handle failures
- Review migration log`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['AGENTS_TO_MIGRATE', 'PROGRESS_PERCENT', 'FAILED_COUNT'],
    sourceFile:
      'src/features/migration-wizard/wizard/copilot-actions/chat-suggestions.tsx',
  },

  [SUGGESTION_KEYS.MIGRATION_STEP_5]: {
    key: SUGGESTION_KEYS.MIGRATION_STEP_5,
    module: 'migration',
    step: 5,
    i18nInstructionsPath: 'copilot:suggestions.migration.main',
    fallbackInstructions: `Migration Step 5: Verification
Migrated agents: \${MIGRATED_COUNT}

Suggest 3 actions:
- Verify migrated agents
- Test agent functionality
- Compare source/target
- Generate migration report`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['MIGRATED_COUNT', 'VERIFIED_COUNT', 'ISSUES_FOUND'],
    sourceFile:
      'src/features/migration-wizard/wizard/copilot-actions/chat-suggestions.tsx',
  },

  // =========================================================================
  // ONBOARDING
  // =========================================================================

  [SUGGESTION_KEYS.ONBOARDING_TRAINING]: {
    key: SUGGESTION_KEYS.ONBOARDING_TRAINING,
    module: 'onboarding',
    i18nInstructionsPath: 'copilot:suggestions.onboarding.main',
    fallbackInstructions: `Training Progress:
- Current step: \${CURRENT_STEP}
- Progress: \${PROGRESS_PERCENT}%
- Phase: \${CURRENT_PHASE}

Suggest 3 actions for the learner:
- Explain current concept
- Show related examples
- Ask comprehension question
- Suggest next step`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: ['CURRENT_STEP', 'PROGRESS_PERCENT', 'CURRENT_PHASE'],
    sourceFile:
      'src/features/onboarding/components/copilot-actions/chat-suggestions.ts',
  },

  [SUGGESTION_KEYS.ONBOARDING_QUIZ]: {
    key: SUGGESTION_KEYS.ONBOARDING_QUIZ,
    module: 'onboarding',
    i18nInstructionsPath: 'copilot:suggestions.onboarding.quiz',
    fallbackInstructions: `Quiz in progress:
- Question: \${CURRENT_QUESTION}
- Attempts: \${ATTEMPT_COUNT}
- Score: \${CURRENT_SCORE}

Suggest 3 helpful actions:
- Provide a hint
- Explain the concept
- Encourage the learner
- Move to next question`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: [
      'CURRENT_QUESTION',
      'ATTEMPT_COUNT',
      'CURRENT_SCORE',
      'TOTAL_QUESTIONS',
    ],
    sourceFile:
      'src/features/onboarding/components/copilot-actions/chat-suggestions.ts',
  },

  // =========================================================================
  // FEEDBACK HUB
  // =========================================================================

  [SUGGESTION_KEYS.FEEDBACK_HUB]: {
    key: SUGGESTION_KEYS.FEEDBACK_HUB,
    module: 'feedback',
    i18nInstructionsPath: 'copilot:suggestions.feedback.hub',
    fallbackInstructions: `Feedback Hub Context:
- Total feedbacks: \${TOTAL_FEEDBACKS}
- New: \${NEW_COUNT}
- In Progress: \${IN_PROGRESS_COUNT}

Suggest 3 actions for feedback management:
- Analyze new feedbacks
- Find patterns
- Suggest priorities
- Generate insights`,
    minSuggestions: 1,
    maxSuggestions: 3,
    contextVariables: [
      'TOTAL_FEEDBACKS',
      'NEW_COUNT',
      'IN_PROGRESS_COUNT',
      'RESOLVED_COUNT',
    ],
    sourceFile: 'src/features/atlas/pages/atlas-page.tsx',
  },
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get suggestion config for a module, optionally filtered by step
 */
export function getSuggestionConfig(
  module: SuggestionModule,
  step?: number
): SuggestionRegistryEntry | undefined {
  return Object.values(SUGGESTION_REGISTRY).find(
    s => s.module === module && (step === undefined || s.step === step)
  )
}

/**
 * Get all suggestion configs for a module
 */
export function getSuggestionsForModule(
  module: SuggestionModule
): SuggestionRegistryEntry[] {
  return Object.values(SUGGESTION_REGISTRY).filter(s => s.module === module)
}

/**
 * Get suggestion by key
 */
export function getSuggestionByKey(
  key: string
): SuggestionRegistryEntry | undefined {
  return SUGGESTION_REGISTRY[key]
}

/**
 * Get all suggestion keys for a module
 */
export function getSuggestionKeysForModule(module: SuggestionModule): string[] {
  return getSuggestionsForModule(module).map(s => s.key)
}

/**
 * Interpolate context variables in instructions template
 */
export function interpolateSuggestionInstructions(
  template: string,
  context: Record<string, string | number>
): string {
  return template.replace(/\$\{(\w+)\}/g, (_, key) =>
    String(context[key] ?? `[${key}]`)
  )
}

/**
 * Get context variables required for a suggestion config
 */
export function getRequiredContextVariables(key: string): string[] {
  const config = getSuggestionByKey(key)
  return config?.contextVariables ?? []
}

/**
 * Count suggestions by module
 */
export function countSuggestionsByModule(): Record<SuggestionModule, number> {
  const counts: Record<SuggestionModule, number> = {
    atlas: 0,
    kanban: 0,
    upstream: 0,
    downstream: 0,
    migration: 0,
    onboarding: 0,
    feedback: 0,
  }

  Object.values(SUGGESTION_REGISTRY).forEach(suggestion => {
    counts[suggestion.module]++
  })

  return counts
}
