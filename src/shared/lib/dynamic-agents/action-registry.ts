/**
 * Action Registry - Centralized CopilotKit Action Definitions
 *
 * This file contains all CopilotKit action definitions for the platform.
 * Actions are organized by module and support i18n for descriptions.
 *
 * Usage:
 * - Use `getActionsByModule(module)` to get all actions for a module
 * - Use `getActionByName(name)` to get a specific action
 * - Use with `useDynamicAction` hook for i18n-aware action registration
 *
 * @see COPILOT_INTEGRATIONS_INVENTORY.md
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Parameter definition for a CopilotKit action
 */
export interface ActionParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'string[]'
  required?: boolean
  /** i18n path for parameter description */
  i18nDescPath?: string
  /** Fallback description if i18n not available */
  fallbackDescription: string
  /** Enum values for string type */
  enum?: string[]
  /** Nested attributes for object type */
  attributes?: ActionParameter[]
}

/**
 * Registry entry for a CopilotKit action
 */
export interface ActionRegistryEntry {
  /** Unique action name (CopilotKit identifier) */
  name: string
  /** Human-readable key for lookup */
  key: string
  /** Module this action belongs to */
  module: ActionModule
  /** Step within module (for wizards) */
  step?: number
  /** Category for grouping related actions */
  category: ActionCategory
  /** i18n namespace.key path for description */
  i18nDescPath: string
  /** Fallback description if i18n not available */
  fallbackDescription: string
  /** Parameter definitions */
  parameters: ActionParameter[]
  /** Whether this action has a custom render */
  hasRender: boolean
  /** Whether this action uses renderAndWaitForResponse */
  isHITL: boolean
  /** Source file where action is defined */
  sourceFile: string
}

/**
 * Modules that have CopilotKit actions
 */
export type ActionModule =
  | 'atlas'
  | 'kanban'
  | 'upstream'
  | 'downstream'
  | 'migration'
  | 'onboarding'
  | 'feedback'
  | 'my-tasks'

/**
 * Action categories for organization
 */
export type ActionCategory =
  | 'navigation'
  | 'signal'
  | 'task'
  | 'artifact'
  | 'agent'
  | 'feedback'
  | 'knowledge'
  | 'mcp'
  | 'suggestion'
  | 'quiz'
  | 'instructor'
  | 'content'

// ============================================================================
// ACTION NAMES CONSTANTS
// ============================================================================

export const ACTION_NAMES = {
  // Atlas Quick Agent
  NAVIGATE_TO_PAGE: 'navigateToPage',
  CREATE_SIGNAL: 'createSignal',
  CREATE_TASK: 'createTask',
  LIST_MY_TASKS: 'listMyTasks',
  COMPLETE_TASK: 'completeTask',
  MOVE_TASK: 'moveTask',
  DELETE_TASK: 'deleteTask',
  SEARCH_ARTIFACTS: 'searchArtifacts',
  LIST_ARTIFACTS: 'listArtifacts',
  READ_ARTIFACT: 'readArtifact',
  EXECUTE_UTILITY_AGENT: 'executeUtilityAgent',
  LIST_SIGNALS: 'listSignals',
  LIST_FEEDBACKS: 'listFeedbacks',

  // Atlas Spotlight Actions
  SPOTLIGHT_NAVIGATE_TO_PAGE: 'spotlight_navigateToPage',
  SPOTLIGHT_CREATE_SIGNAL: 'spotlight_createSignal',
  SPOTLIGHT_CAPTURE_FEEDBACK: 'spotlight_captureFeedback',
  SPOTLIGHT_QUICK_BUG_REPORT: 'spotlight_quickBugReport',
  SPOTLIGHT_SUGGEST_FEATURE: 'spotlight_suggestFeature',
  SPOTLIGHT_SHARE_SUCCESS: 'spotlight_shareSuccess',
  SPOTLIGHT_ASK_QUESTION: 'spotlight_askQuestion',
  SPOTLIGHT_SHARE_INSIGHT: 'spotlight_shareInsight',
  SPOTLIGHT_REPORT_ERROR: 'spotlight_reportError',
  SPOTLIGHT_SEARCH_ARTIFACTS: 'spotlight_searchArtifacts',
  SPOTLIGHT_LIST_ARTIFACTS: 'spotlight_listArtifacts',
  SPOTLIGHT_READ_ARTIFACT: 'spotlight_readArtifact',
  SPOTLIGHT_CREATE_ARTIFACT: 'spotlight_createArtifact',
  SPOTLIGHT_EXECUTE_UTILITY_AGENT: 'spotlight_executeUtilityAgent',
  SPOTLIGHT_LIST_SIGNALS: 'spotlight_listSignals',
  SPOTLIGHT_LIST_FEEDBACKS: 'spotlight_listFeedbacks',
  SPOTLIGHT_GET_FEEDBACK_STATISTICS: 'spotlight_getFeedbackStatistics',
  SPOTLIGHT_CREATE_TASK: 'spotlight_createTask',
  SPOTLIGHT_LIST_MY_TASKS: 'spotlight_listMyTasks',
  SPOTLIGHT_COMPLETE_TASK: 'spotlight_completeTask',
  SPOTLIGHT_MOVE_TASK: 'spotlight_moveTask',
  SPOTLIGHT_DELETE_TASK: 'spotlight_deleteTask',
  SPOTLIGHT_SUMMARIZE_DAY: 'spotlight_summarizeDay',
  SPOTLIGHT_GET_TASK_INSIGHTS: 'spotlight_getTaskInsights',
  SPOTLIGHT_CREATE_CONTEXTUAL_TASK: 'spotlight_createContextualTask',

  // MCP Integration (shared across modules)
  SEARCH_ARTIFACTS_NAMESPACE: 'searchArtifactsInNamespace',
  LIST_AVAILABLE_ARTIFACTS: 'listAvailableArtifacts',
  GET_ARTIFACT_DETAILS: 'getArtifactDetails',
  CREATE_ARTIFACT_FOR_EPIC: 'createArtifactForEpic',
  FETCH_ARTIFACTS_FOR_STEP: 'fetchArtifactsForStep',

  // Knowledge Base
  LIST_KNOWLEDGE_DOCUMENTS: 'listKnowledgeDocuments',
  SEARCH_KNOWLEDGE_BASE: 'searchKnowledgeBase',
  READ_KNOWLEDGE_DOCUMENT: 'readKnowledgeDocument',
  SEMANTIC_SEARCH_KB: 'semanticSearchKnowledgeBase',
  SUMMARIZE_KNOWLEDGE: 'summarizeKnowledgeDocument',

  // Feedback (shared across modules)
  REPORT_BUG: 'reportBug',
  SUGGEST_FEATURE: 'suggestFeature',
  SHARE_IMPROVEMENT: 'shareImprovement',
  TRACK_DECISION: 'trackDecision',
  QUICK_NOTE: 'quickNote',

  // Feedback Analyzer (LangGraph integration)
  ANALYZE_FEEDBACK: 'analyzeFeedback',
  CHECK_FEEDBACK_DUPLICATES: 'checkFeedbackDuplicates',
  CALCULATE_FEEDBACK_PRIORITY: 'calculateFeedbackPriority',
  SUGGEST_FEEDBACK_RESOLUTION: 'suggestFeedbackResolution',
  MOVE_FEEDBACK_TO_COLUMN: 'moveFeedbackToColumn',
  GET_KANBAN_SUMMARY: 'getKanbanSummary',
  ADD_FEEDBACK_COMMENT: 'addFeedbackComment',
  GET_FEEDBACK_HISTORY: 'getFeedbackHistory',
  GET_RELATED_FEEDBACKS: 'getRelatedFeedbacks',

  // Onboarding - Instructor Mode
  PRESENT_LESSON: 'presentLesson',
  ASK_LEARNER: 'askLearner',
  START_STEP: 'startStep',
  DEMONSTRATE_CONCEPT: 'demonstrateConcept',
  PROVIDE_FEEDBACK: 'provideFeedback',
  NAVIGATE_TO_STEP: 'navigateToStep',
  EXPLAIN_CONCEPT: 'explainConcept',
  SUMMARIZE_STEP: 'summarizeStep',
  ASK_CLARIFICATION: 'askClarification',
  GET_QUIZ_HINT: 'getQuizHint',
  EXPLAIN_WRONG_ANSWER: 'explainWrongAnswer',
  ENCOURAGE_USER: 'encourageUser',
  SHOW_PROGRESS: 'showProgress',
  SUGGEST_NEXT_STEP: 'suggestNextStep',
  CELEBRATE_COMPLETION: 'celebrateCompletion',

  // Onboarding - Creator Mode (Branding)
  CREATOR_SUGGEST_BRANDING_COLORS: 'creator_suggestBrandingColors',
  CREATOR_SUGGEST_CERTIFICATE_BADGE: 'creator_suggestCertificateBadge',
  CREATOR_APPLY_SPECIALIZATION_THEME: 'creator_applySpecializationTheme',
  CREATOR_SET_TRAINING_ICON: 'creator_setTrainingIcon',
  CREATOR_UPDATE_BRANDING_COLORS: 'creator_updateBrandingColors',

  // Onboarding - Creator Mode (Manifest)
  CREATOR_UPDATE_MANIFEST_METADATA: 'creator_updateManifestMetadata',
  CREATOR_VALIDATE_MANIFEST: 'creator_validateManifest',
  CREATOR_SUGGEST_TRAINING_TITLE: 'creator_suggestTrainingTitle',

  // Onboarding - Creator Mode (Phases)
  CREATOR_ADD_PHASE: 'creator_addPhase',
  CREATOR_UPDATE_PHASE: 'creator_updatePhase',
  CREATOR_REORDER_PHASES: 'creator_reorderPhases',
  CREATOR_DELETE_PHASE: 'creator_deletePhase',
  CREATOR_LIST_PHASES: 'creator_listPhases',
  CREATOR_MOVE_PHASE_UP: 'creator_movePhaseUp',
  CREATOR_MOVE_PHASE_DOWN: 'creator_movePhaseDown',

  // Onboarding - Creator Mode (Steps)
  CREATOR_ADD_STEP: 'creator_addStep',
  CREATOR_UPDATE_STEP: 'creator_updateStep',
  CREATOR_DELETE_STEP: 'creator_deleteStep',

  // Onboarding - Creator Mode (Proposals)
  CREATOR_ANALYZE_DOCUMENTS: 'creator_analyzeDocuments',
  CREATOR_PROPOSE_TRAINING_STRUCTURE: 'creator_proposeTrainingStructure',
  CREATOR_NAVIGATE_TO_CREATOR_STEP: 'creator_navigateToCreatorStep',
  CREATOR_GENERATE_QUIZ_QUESTIONS: 'creator_generateQuizQuestions',

  // Atlas Analysis Actions
  ATLAS_ANALYZE_PATTERNS: 'atlas_analyzePatterns',
  ATLAS_GENERATE_REPORT: 'atlas_generateReport',
  ATLAS_FIND_SIMILAR: 'atlas_findSimilar',
  ATLAS_SUGGEST_PRIORITIES: 'atlas_suggestPriorities',

  // Atlas Resolution Actions
  ATLAS_RESOLVE_FEEDBACK: 'atlas_resolveFeedback',
  ATLAS_UPDATE_STATUS: 'atlas_updateStatus',
  ATLAS_SUGGEST_RESOLUTION: 'atlas_suggestResolution',

  // Atlas Data Actions
  ATLAS_LIST_FEEDBACKS: 'atlas_listFeedbacks',
  ATLAS_GET_FEEDBACK_DETAILS: 'atlas_getFeedbackDetails',
  ATLAS_LIST_COMMENTS: 'atlas_listComments',

  // Atlas Capture Actions
  ATLAS_CAPTURE_FEEDBACK: 'atlas_captureFeedback',

  // Atlas Kanban Actions
  ATLAS_GET_KANBAN_BOARD: 'atlas_getKanbanBoard',
  ATLAS_MOVE_FEEDBACK_COLUMN: 'atlas_moveFeedbackColumn',

  // Atlas Deep Agent Actions
  ATLAS_DEEP_ANALYSIS: 'atlas_deepAnalysis',
  ATLAS_DEEP_PATTERNS: 'atlas_deepPatterns',

  // My Tasks Actions
  MYTASKS_QUICK_ADD: 'quickAddTask',
  MYTASKS_BATCH_MOVE: 'batchMoveTasks',
  MYTASKS_FOCUS: 'focusOnTask',
  MYTASKS_CLEAR_FOCUS: 'clearFocus',
  MYTASKS_CHANGE_PRIORITY: 'changeTaskPriority',
  MYTASKS_GET_OVERVIEW: 'getKanbanOverview',
  MYTASKS_SUGGEST_WORKFLOW: 'suggestWorkflow',
  MYTASKS_COMPLETE_REVIEW: 'completeReviewTasks',

  // Migration Wizard Actions
  MIGRATION_LIST_SOURCE_AGENTS: 'listSourceAgents',
  MIGRATION_GET_AGENT_DETAILS: 'getAgentDetails',
  MIGRATION_VALIDATE_PLAN: 'validateMigrationPlan',
  MIGRATION_ANALYZE_DEPENDENCIES: 'analyzeAgentDependencies',
  MIGRATION_VERIFY_AGENT: 'verifyMigratedAgent',
  MIGRATION_GENERATE_REPORT: 'generateMigrationReport',
  MIGRATION_FEEDBACK_BUG: 'feedback_reportBug',
  MIGRATION_FEEDBACK_QUESTION: 'feedback_askQuestion',
  MIGRATION_FEEDBACK_SUGGESTION: 'feedback_suggestImprovement',
  MIGRATION_FEEDBACK_PRAISE: 'feedback_givePraise',

  // Downstream Wizard Actions - Step 1: TO DO
  DOWNSTREAM_STEP1_SUGGEST_FEATURE_NAME: 'step1_suggestFeatureName',
  DOWNSTREAM_STEP1_SUGGEST_DESCRIPTION: 'step1_suggestDescription',
  DOWNSTREAM_STEP1_SUGGEST_TARGET_QUARTER: 'step1_suggestTargetQuarter',
  DOWNSTREAM_STEP1_SUGGEST_ASSIGNED_SQUAD: 'step1_suggestAssignedSquad',
  DOWNSTREAM_STEP1_SUGGEST_ESTIMATED_SPRINTS: 'step1_suggestEstimatedSprints',
  DOWNSTREAM_STEP1_SUGGEST_PLANNING_NOTES: 'step1_suggestPlanningNotes',
  DOWNSTREAM_STEP1_SUGGEST_PRIORITY: 'step1_suggestPriority',

  // Downstream Wizard Actions - Step 2: IN REFINEMENT
  DOWNSTREAM_STEP2_SUGGEST_BUSINESS_REFINEMENT:
    'step2_suggestBusinessRefinement',
  DOWNSTREAM_STEP2_SUGGEST_FUNCTIONAL_REQUIREMENT:
    'step2_suggestFunctionalRequirement',
  DOWNSTREAM_STEP2_SUGGEST_NON_FUNCTIONAL_REQUIREMENT:
    'step2_suggestNonFunctionalRequirement',
  DOWNSTREAM_STEP2_SUGGEST_ANALYTICAL_IMPACT: 'step2_suggestAnalyticalImpact',
  DOWNSTREAM_STEP2_SUGGEST_SENSITIVE_DATA_HANDLING:
    'step2_suggestSensitiveDataHandling',

  // Downstream Wizard Actions - Step 3: SOLUTION DESIGN
  DOWNSTREAM_STEP3_SUGGEST_TECHNICAL_SOLUTION: 'step3_suggestTechnicalSolution',
  DOWNSTREAM_STEP3_SUGGEST_DAP_LINK: 'step3_suggestDapLink',
  DOWNSTREAM_STEP3_SUGGEST_SECURITY_ANALYSIS: 'step3_suggestSecurityAnalysis',
  DOWNSTREAM_STEP3_SUGGEST_SECURITY_ITEM: 'step3_suggestSecurityItem',
  DOWNSTREAM_STEP3_SUGGEST_ARCHITECTURE_NOTES: 'step3_suggestArchitectureNotes',
  DOWNSTREAM_STEP3_SUGGEST_FEDERATION_NOTES: 'step3_suggestFederationNotes',

  // Downstream Wizard Actions - Step 4: IN PROGRESS
  DOWNSTREAM_STEP4_SUGGEST_STORY: 'step4_suggestStory',
  DOWNSTREAM_STEP4_SUGGEST_TASK: 'step4_suggestTask',
  DOWNSTREAM_STEP4_SUGGEST_APPSEC_NOTES: 'step4_suggestAppSecNotes',
  DOWNSTREAM_STEP4_SUGGEST_EHT_NOTES: 'step4_suggestEHTNotes',
  DOWNSTREAM_STEP4_SUGGEST_TEST_NOTES: 'step4_suggestTestNotes',
  DOWNSTREAM_STEP4_SUGGEST_PDI_TASK: 'step4_suggestPDITask',

  // Downstream Wizard Actions - Step 5: IN REVIEW
  DOWNSTREAM_STEP5_SUGGEST_ARCHITECTURAL_NOTES:
    'step5_suggestArchitecturalNotes',
  DOWNSTREAM_STEP5_SUGGEST_SI_EVIDENCE: 'step5_suggestSIEvidence',
  DOWNSTREAM_STEP5_SUGGEST_BUSINESS_ACCEPTANCE:
    'step5_suggestBusinessAcceptance',
  DOWNSTREAM_STEP5_SUGGEST_REVIEW_NOTES: 'step5_suggestReviewNotes',

  // Downstream Wizard Actions - Step 6: DONE
  DOWNSTREAM_STEP6_SUGGEST_RELEASE_NOTES: 'step6_suggestReleaseNotes',
  DOWNSTREAM_STEP6_SUGGEST_RELEASE_VERSION: 'step6_suggestReleaseVersion',
  DOWNSTREAM_STEP6_SUGGEST_CELEBRATION_NOTES: 'step6_suggestCelebrationNotes',
  DOWNSTREAM_STEP6_SUGGEST_LESSONS_LEARNED: 'step6_suggestLessonsLearned',
  DOWNSTREAM_STEP6_SUGGEST_PRODUCTION_URL: 'step6_suggestProductionUrl',
  DOWNSTREAM_STEP6_SUGGEST_JIRA_LINK: 'step6_suggestJiraLink',

  // Downstream Wizard Actions - MCP Integration
  DOWNSTREAM_SEARCH_ARTIFACTS_IN_NAMESPACE: 'searchArtifactsInNamespace',
  DOWNSTREAM_LIST_AVAILABLE_ARTIFACTS: 'listAvailableArtifacts',
  DOWNSTREAM_GET_ARTIFACT_DETAILS: 'getArtifactDetails',
  DOWNSTREAM_CREATE_ARTIFACT_FOR_FEATURE: 'createArtifactForFeature',
  DOWNSTREAM_EXECUTE_UTILITY_AGENT: 'executeUtilityAgent',
  DOWNSTREAM_FETCH_UPSTREAM_ARTIFACTS: 'fetchUpstreamArtifacts',

  // Upstream Wizard Actions - Step 1: Ideação (Ideation)
  UPSTREAM_STEP1_SUGGEST_NAME: 'upstream_step1_suggestMacroInitiativeName',
  UPSTREAM_STEP1_SUGGEST_DESCRIPTION: 'upstream_step1_suggestDescription',
  UPSTREAM_STEP1_SUGGEST_INITIAL_BUSINESS_VALUE:
    'upstream_step1_suggestInitialBusinessValue',
  UPSTREAM_STEP1_SUGGEST_LINKED_OKRS: 'upstream_step1_suggestLinkedOKRs',
  UPSTREAM_STEP1_SUGGEST_PROBLEM_STATEMENT:
    'upstream_step1_suggestProblemStatement',
  UPSTREAM_STEP1_SUGGEST_HYPOTHESIS: 'upstream_step1_suggestHypothesis',
  UPSTREAM_STEP1_SUGGEST_STRATEGIC_ALIGNMENT:
    'upstream_step1_suggestStrategicAlignment',

  // Upstream Wizard Actions - Step 2: Imersão (Immersion)
  UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_CSD: 'upstream_step2_hypothesis_suggestCSD',
  UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_STAKEHOLDERS:
    'upstream_step2_hypothesis_suggestStakeholders',
  UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_OPPORTUNITY_TREE:
    'upstream_step2_hypothesis_suggestOpportunityTree',
  UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_RISKS:
    'upstream_step2_hypothesis_suggestRisks',
  UPSTREAM_STEP2_SUGGEST_MAIN_PROBLEMS: 'upstream_step2_suggestMainProblems',

  // Upstream Wizard Actions - Step 3: Validação (Validation)
  UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_VALIDATION_METHOD:
    'upstream_step3_hypothesis_suggestValidationMethod',
  UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_VALIDATION_RESULTS:
    'upstream_step3_hypothesis_suggestValidationResults',
  UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_CONCLUSION:
    'upstream_step3_hypothesis_suggestConclusion',
  UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_DATA_SOURCES:
    'upstream_step3_hypothesis_suggestDataSources',
  UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_EVIDENCE:
    'upstream_step3_hypothesis_suggestEvidence',

  // Upstream Wizard Actions - Step 4: Exploração (Exploration)
  UPSTREAM_STEP4_SUGGEST_MACRO_REQUIREMENTS:
    'upstream_step4_suggestMacroRequirements',
  UPSTREAM_STEP4_SUGGEST_ACTOR_MAPPING: 'upstream_step4_suggestActorMapping',
  UPSTREAM_STEP4_SUGGEST_USABILITY_TEST: 'upstream_step4_suggestUsabilityTest',
  UPSTREAM_STEP4_SUGGEST_CAPABILITY_ASSESSMENT:
    'upstream_step4_suggestCapabilityAssessment',
  UPSTREAM_STEP4_SUGGEST_BUSINESS_FLOW_MERMAID:
    'upstream_step4_suggestBusinessFlowMermaid',
  UPSTREAM_STEP4_SUGGEST_USER_JOURNEY_MERMAID:
    'upstream_step4_suggestUserJourneyMermaid',

  // Upstream Wizard Actions - Step 5: Análise (Analysis)
  UPSTREAM_STEP5_SUGGEST_BLUEPRINT_URL: 'upstream_step5_suggestBlueprintUrl',
  UPSTREAM_STEP5_SUGGEST_IMPACT_ANALYSIS:
    'upstream_step5_suggestImpactAnalysis',
  UPSTREAM_STEP5_SUGGEST_GAP_ANALYSIS: 'upstream_step5_suggestGapAnalysis',
  UPSTREAM_STEP5_SUGGEST_DEPENDENCIES: 'upstream_step5_suggestDependencies',
  UPSTREAM_STEP5_SUGGEST_MITIGATION_PLANS:
    'upstream_step5_suggestMitigationPlans',
  UPSTREAM_STEP5_SUGGEST_BLUEPRINT_MERMAID:
    'upstream_step5_suggestBlueprintMermaid',

  // Upstream Wizard Actions - Step 6: Priorização (Prioritization)
  UPSTREAM_STEP6_SUGGEST_FINAL_BUSINESS_VALUE:
    'upstream_step6_suggestFinalBusinessValue',
  UPSTREAM_STEP6_SUGGEST_EFFORT: 'upstream_step6_suggestEffort',
  UPSTREAM_STEP6_SUGGEST_RISK_LEVEL: 'upstream_step6_suggestRiskLevel',
  UPSTREAM_STEP6_SUGGEST_KPIS: 'upstream_step6_suggestKPIs',
  UPSTREAM_STEP6_SUGGEST_STRATEGIC_THEME:
    'upstream_step6_suggestStrategicTheme',
  UPSTREAM_STEP6_SUGGEST_VALUE_PLAN: 'upstream_step6_suggestValuePlan',
  UPSTREAM_STEP6_SUGGEST_PRELIMINARY_KPIS:
    'upstream_step6_suggestPreliminaryKPIs',
  UPSTREAM_STEP6_SUGGEST_QBR_MEMO: 'upstream_step6_suggestQBRMemo',

  // Upstream Wizard Actions - Step 7: Transição (Transition)
  UPSTREAM_STEP7_SUGGEST_BUSINESS_EPIC: 'upstream_step7_suggestBusinessEpic',
  UPSTREAM_STEP7_SUGGEST_FEATURE: 'upstream_step7_suggestFeature',
  UPSTREAM_STEP7_SUGGEST_TARGET_SQUAD_TRIBE:
    'upstream_step7_suggestTargetSquadTribe',
  UPSTREAM_STEP7_UPDATE_TRANSITION_STATUS:
    'upstream_step7_updateTransitionStatus',
  UPSTREAM_STEP7_SUGGEST_HANDOFF_DOCUMENT:
    'upstream_step7_suggestHandoffDocument',
  UPSTREAM_STEP7_SUGGEST_RESPONSIBILITY_AGREEMENT:
    'upstream_step7_suggestResponsibilityAgreement',
} as const

// ============================================================================
// ACTION REGISTRY
// ============================================================================

export const ACTION_REGISTRY: Record<string, ActionRegistryEntry> = {
  // =========================================================================
  // ATLAS QUICK AGENT - Navigation
  // =========================================================================

  NAVIGATE_TO_PAGE: {
    name: ACTION_NAMES.NAVIGATE_TO_PAGE,
    key: 'NAVIGATE_TO_PAGE',
    module: 'atlas',
    category: 'navigation',
    i18nDescPath: 'copilot:actions.navigation.navigateToPage.description',
    fallbackDescription:
      'Navigate to a specific page or module in the application',
    parameters: [
      {
        name: 'path',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.navigation.navigateToPage.params.path',
        fallbackDescription:
          'The path to navigate to (e.g., /dashboard, /upstream, /downstream)',
        enum: [
          '/dashboard',
          '/upstream',
          '/downstream',
          '/migration',
          '/onboarding',
          '/atlas',
          '/messages',
          '/settings',
          '/my-tasks',
        ],
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/navigation-actions.tsx',
  },

  // =========================================================================
  // ATLAS QUICK AGENT - Signals
  // =========================================================================

  CREATE_SIGNAL: {
    name: ACTION_NAMES.CREATE_SIGNAL,
    key: 'CREATE_SIGNAL',
    module: 'atlas',
    category: 'signal',
    i18nDescPath: 'copilot:actions.signal.createSignal.description',
    fallbackDescription:
      'Create a new signal (insight, feedback, or message) for the current context',
    parameters: [
      {
        name: 'type',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.signal.createSignal.params.type',
        fallbackDescription: 'Type of signal: insight, feedback, or message',
        enum: ['insight', 'feedback', 'message'],
      },
      {
        name: 'category',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.signal.createSignal.params.category',
        fallbackDescription: 'Category of the signal',
        enum: [
          'discovery',
          'pattern',
          'opportunity',
          'risk',
          'bug',
          'feature',
          'improvement',
          'innovation',
          'note',
          'alert',
        ],
      },
      {
        name: 'content',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.signal.createSignal.params.content',
        fallbackDescription: 'The content of the signal',
      },
      {
        name: 'priority',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.signal.createSignal.params.priority',
        fallbackDescription: 'Priority level: low, medium, high, or critical',
        enum: ['low', 'medium', 'high', 'critical'],
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/signal-actions.tsx',
  },

  // =========================================================================
  // ATLAS QUICK AGENT - Tasks
  // =========================================================================

  CREATE_TASK: {
    name: ACTION_NAMES.CREATE_TASK,
    key: 'CREATE_TASK',
    module: 'atlas',
    category: 'task',
    i18nDescPath: 'copilot:actions.task.createTask.description',
    fallbackDescription: 'Create a new personal task on the Kanban board',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.task.createTask.params.title',
        fallbackDescription: 'Title of the task',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.task.createTask.params.description',
        fallbackDescription: 'Detailed description of the task',
      },
      {
        name: 'priority',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.task.createTask.params.priority',
        fallbackDescription: 'Priority level: low, medium, high',
        enum: ['low', 'medium', 'high'],
      },
      {
        name: 'dueDate',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.task.createTask.params.dueDate',
        fallbackDescription: 'Due date in ISO format',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/task-actions.tsx',
  },

  LIST_MY_TASKS: {
    name: ACTION_NAMES.LIST_MY_TASKS,
    key: 'LIST_MY_TASKS',
    module: 'atlas',
    category: 'task',
    i18nDescPath: 'copilot:actions.task.listMyTasks.description',
    fallbackDescription: "List user's personal tasks, optionally filtered",
    parameters: [
      {
        name: 'status',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.task.listMyTasks.params.status',
        fallbackDescription:
          'Filter by status: backlog, todo, in_progress, review, done',
        enum: ['backlog', 'todo', 'in_progress', 'review', 'done'],
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/task-actions.tsx',
  },

  COMPLETE_TASK: {
    name: ACTION_NAMES.COMPLETE_TASK,
    key: 'COMPLETE_TASK',
    module: 'atlas',
    category: 'task',
    i18nDescPath: 'copilot:actions.task.completeTask.description',
    fallbackDescription: 'Mark a task as completed',
    parameters: [
      {
        name: 'taskId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.task.completeTask.params.taskId',
        fallbackDescription: 'ID of the task to complete',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/task-actions.tsx',
  },

  MOVE_TASK: {
    name: ACTION_NAMES.MOVE_TASK,
    key: 'MOVE_TASK',
    module: 'atlas',
    category: 'task',
    i18nDescPath: 'copilot:actions.task.moveTask.description',
    fallbackDescription: 'Move a task to a different status column',
    parameters: [
      {
        name: 'taskId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.task.moveTask.params.taskId',
        fallbackDescription: 'ID of the task to move',
      },
      {
        name: 'newStatus',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.task.moveTask.params.newStatus',
        fallbackDescription: 'Target status column',
        enum: ['backlog', 'todo', 'in_progress', 'review', 'done'],
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/task-actions.tsx',
  },

  DELETE_TASK: {
    name: ACTION_NAMES.DELETE_TASK,
    key: 'DELETE_TASK',
    module: 'atlas',
    category: 'task',
    i18nDescPath: 'copilot:actions.task.deleteTask.description',
    fallbackDescription: 'Delete a personal task',
    parameters: [
      {
        name: 'taskId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.task.deleteTask.params.taskId',
        fallbackDescription: 'ID of the task to delete',
      },
    ],
    hasRender: true,
    isHITL: true, // Confirm before delete
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/task-actions.tsx',
  },

  // =========================================================================
  // ATLAS QUICK AGENT - Artifacts
  // =========================================================================

  SEARCH_ARTIFACTS: {
    name: ACTION_NAMES.SEARCH_ARTIFACTS,
    key: 'SEARCH_ARTIFACTS',
    module: 'atlas',
    category: 'artifact',
    i18nDescPath: 'copilot:actions.artifact.searchArtifacts.description',
    fallbackDescription:
      'Search for artifacts in the current namespace by term',
    parameters: [
      {
        name: 'searchTerm',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.artifact.searchArtifacts.params.searchTerm',
        fallbackDescription: 'Search term to find artifacts',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/artifact-actions.tsx',
  },

  LIST_ARTIFACTS: {
    name: ACTION_NAMES.LIST_ARTIFACTS,
    key: 'LIST_ARTIFACTS',
    module: 'atlas',
    category: 'artifact',
    i18nDescPath: 'copilot:actions.artifact.listArtifacts.description',
    fallbackDescription: 'List all artifacts in the current namespace',
    parameters: [
      {
        name: 'cursor',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.artifact.listArtifacts.params.cursor',
        fallbackDescription: 'Pagination cursor for next page',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/artifact-actions.tsx',
  },

  READ_ARTIFACT: {
    name: ACTION_NAMES.READ_ARTIFACT,
    key: 'READ_ARTIFACT',
    module: 'atlas',
    category: 'artifact',
    i18nDescPath: 'copilot:actions.artifact.readArtifact.description',
    fallbackDescription: 'Read the content of a specific artifact',
    parameters: [
      {
        name: 'artifactId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.artifact.readArtifact.params.artifactId',
        fallbackDescription: 'ID of the artifact to read',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/artifact-actions.tsx',
  },

  // =========================================================================
  // ATLAS QUICK AGENT - Agents
  // =========================================================================

  EXECUTE_UTILITY_AGENT: {
    name: ACTION_NAMES.EXECUTE_UTILITY_AGENT,
    key: 'EXECUTE_UTILITY_AGENT',
    module: 'atlas',
    category: 'agent',
    i18nDescPath: 'copilot:actions.agent.executeUtilityAgent.description',
    fallbackDescription: 'Execute a utility agent with a specific prompt',
    parameters: [
      {
        name: 'agentName',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.agent.executeUtilityAgent.params.agentName',
        fallbackDescription: 'Name of the utility agent to execute',
      },
      {
        name: 'prompt',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.agent.executeUtilityAgent.params.prompt',
        fallbackDescription: 'Prompt to send to the agent',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.agent.executeUtilityAgent.params.reasoning',
        fallbackDescription: 'Explanation for why this agent was chosen',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot-actions/agent-actions.tsx',
  },

  // =========================================================================
  // ONBOARDING - Instructor Actions
  // =========================================================================

  PRESENT_LESSON: {
    name: ACTION_NAMES.PRESENT_LESSON,
    key: 'PRESENT_LESSON',
    module: 'onboarding',
    category: 'instructor',
    i18nDescPath: 'copilot:actions.onboarding.presentLesson.description',
    fallbackDescription: 'Present a lesson with content and key points',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.onboarding.presentLesson.params.title',
        fallbackDescription: 'Title of the lesson',
      },
      {
        name: 'content',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.onboarding.presentLesson.params.content',
        fallbackDescription: 'Main content of the lesson',
      },
      {
        name: 'keyPoints',
        type: 'string[]',
        required: false,
        i18nDescPath:
          'copilot:actions.onboarding.presentLesson.params.keyPoints',
        fallbackDescription: 'Key points to highlight',
      },
      {
        name: 'nextTopic',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.onboarding.presentLesson.params.nextTopic',
        fallbackDescription: 'Preview of the next topic',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/onboarding/components/copilot-actions/instructor-actions.tsx',
  },

  ASK_LEARNER: {
    name: ACTION_NAMES.ASK_LEARNER,
    key: 'ASK_LEARNER',
    module: 'onboarding',
    category: 'instructor',
    i18nDescPath: 'copilot:actions.onboarding.askLearner.description',
    fallbackDescription: 'Ask the learner a question to check understanding',
    parameters: [
      {
        name: 'question',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.onboarding.askLearner.params.question',
        fallbackDescription: 'The question to ask',
      },
      {
        name: 'context',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.onboarding.askLearner.params.context',
        fallbackDescription: 'Context for the question',
      },
      {
        name: 'expectedThemes',
        type: 'string[]',
        required: false,
        i18nDescPath:
          'copilot:actions.onboarding.askLearner.params.expectedThemes',
        fallbackDescription: 'Expected themes in the answer',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile:
      'src/features/onboarding/components/copilot-actions/instructor-actions.tsx',
  },

  START_STEP: {
    name: ACTION_NAMES.START_STEP,
    key: 'START_STEP',
    module: 'onboarding',
    category: 'instructor',
    i18nDescPath: 'copilot:actions.onboarding.startStep.description',
    fallbackDescription: 'Start a new training step with introduction',
    parameters: [
      {
        name: 'stepNumber',
        type: 'number',
        required: true,
        i18nDescPath: 'copilot:actions.onboarding.startStep.params.stepNumber',
        fallbackDescription: 'Step number in the training',
      },
      {
        name: 'stepTitle',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.onboarding.startStep.params.stepTitle',
        fallbackDescription: 'Title of the step',
      },
      {
        name: 'stepType',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.onboarding.startStep.params.stepType',
        fallbackDescription: 'Type: content, quiz, or exercise',
        enum: ['content', 'quiz', 'exercise'],
      },
      {
        name: 'introduction',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.onboarding.startStep.params.introduction',
        fallbackDescription: 'Introduction text for the step',
      },
      {
        name: 'objectives',
        type: 'string[]',
        required: false,
        i18nDescPath: 'copilot:actions.onboarding.startStep.params.objectives',
        fallbackDescription: 'Learning objectives for this step',
      },
      {
        name: 'estimatedMinutes',
        type: 'number',
        required: false,
        i18nDescPath:
          'copilot:actions.onboarding.startStep.params.estimatedMinutes',
        fallbackDescription: 'Estimated time in minutes',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/onboarding/components/copilot-actions/instructor-actions.tsx',
  },

  // =========================================================================
  // ONBOARDING - Quiz Actions
  // =========================================================================

  GET_QUIZ_HINT: {
    name: ACTION_NAMES.GET_QUIZ_HINT,
    key: 'GET_QUIZ_HINT',
    module: 'onboarding',
    category: 'quiz',
    i18nDescPath: 'copilot:actions.onboarding.getQuizHint.description',
    fallbackDescription: 'Provide a hint for the current quiz question',
    parameters: [
      {
        name: 'questionText',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.onboarding.getQuizHint.params.questionText',
        fallbackDescription: 'The quiz question text',
      },
      {
        name: 'hint',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.onboarding.getQuizHint.params.hint',
        fallbackDescription: 'The hint to provide',
      },
      {
        name: 'thinkAbout',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.onboarding.getQuizHint.params.thinkAbout',
        fallbackDescription: 'Guidance on what to think about',
      },
      {
        name: 'relatedConcept',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.onboarding.getQuizHint.params.relatedConcept',
        fallbackDescription: 'Related concept to review',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/onboarding/components/copilot-actions/quiz-actions.tsx',
  },

  EXPLAIN_WRONG_ANSWER: {
    name: ACTION_NAMES.EXPLAIN_WRONG_ANSWER,
    key: 'EXPLAIN_WRONG_ANSWER',
    module: 'onboarding',
    category: 'quiz',
    i18nDescPath: 'copilot:actions.onboarding.explainWrongAnswer.description',
    fallbackDescription: 'Explain why an answer was incorrect',
    parameters: [
      {
        name: 'questionText',
        type: 'string',
        required: true,
        i18nDescPath:
          'actions.onboarding.explainWrongAnswer.params.questionText',
        fallbackDescription: 'The quiz question text',
      },
      {
        name: 'userAnswer',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.onboarding.explainWrongAnswer.params.userAnswer',
        fallbackDescription: "The user's incorrect answer",
      },
      {
        name: 'explanation',
        type: 'string',
        required: true,
        i18nDescPath:
          'actions.onboarding.explainWrongAnswer.params.explanation',
        fallbackDescription: 'Explanation of why the answer is wrong',
      },
      {
        name: 'suggestion',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.onboarding.explainWrongAnswer.params.suggestion',
        fallbackDescription: 'Suggestion for improvement',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/onboarding/components/copilot-actions/quiz-actions.tsx',
  },

  ENCOURAGE_USER: {
    name: ACTION_NAMES.ENCOURAGE_USER,
    key: 'ENCOURAGE_USER',
    module: 'onboarding',
    category: 'quiz',
    i18nDescPath: 'copilot:actions.onboarding.encourageUser.description',
    fallbackDescription: 'Encourage the user after an achievement',
    parameters: [
      {
        name: 'achievement',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.onboarding.encourageUser.params.achievement',
        fallbackDescription: 'What the user achieved',
      },
      {
        name: 'message',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.onboarding.encourageUser.params.message',
        fallbackDescription: 'Encouraging message',
      },
      {
        name: 'nextStep',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.onboarding.encourageUser.params.nextStep',
        fallbackDescription: 'What to do next',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/onboarding/components/copilot-actions/quiz-actions.tsx',
  },

  // =========================================================================
  // ONBOARDING - Creator Mode (Branding)
  // =========================================================================

  CREATOR_SUGGEST_BRANDING_COLORS: {
    name: ACTION_NAMES.CREATOR_SUGGEST_BRANDING_COLORS,
    key: 'CREATOR_SUGGEST_BRANDING_COLORS',
    module: 'onboarding',
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.creator.suggestBrandingColors.description',
    fallbackDescription: 'Suggest branding colors based on specialization',
    parameters: [],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_SUGGEST_CERTIFICATE_BADGE: {
    name: ACTION_NAMES.CREATOR_SUGGEST_CERTIFICATE_BADGE,
    key: 'CREATOR_SUGGEST_CERTIFICATE_BADGE',
    module: 'onboarding',
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.creator.suggestCertificateBadge.description',
    fallbackDescription: 'Suggest certificate badge design',
    parameters: [],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_APPLY_SPECIALIZATION_THEME: {
    name: ACTION_NAMES.CREATOR_APPLY_SPECIALIZATION_THEME,
    key: 'CREATOR_APPLY_SPECIALIZATION_THEME',
    module: 'onboarding',
    category: 'task',
    i18nDescPath:
      'copilot:actions.creator.applySpecializationTheme.description',
    fallbackDescription: 'Apply a specialization theme to branding',
    parameters: [
      {
        name: 'specializationType',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.creator.applySpecializationTheme.params.specializationType',
        fallbackDescription: 'Type of specialization theme to apply',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_SET_TRAINING_ICON: {
    name: ACTION_NAMES.CREATOR_SET_TRAINING_ICON,
    key: 'CREATOR_SET_TRAINING_ICON',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.setTrainingIcon.description',
    fallbackDescription: 'Set the training icon',
    parameters: [
      {
        name: 'iconName',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.setTrainingIcon.params.iconName',
        fallbackDescription: 'Name of the icon to set',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_UPDATE_BRANDING_COLORS: {
    name: ACTION_NAMES.CREATOR_UPDATE_BRANDING_COLORS,
    key: 'CREATOR_UPDATE_BRANDING_COLORS',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.updateBrandingColors.description',
    fallbackDescription: 'Update branding colors',
    parameters: [
      {
        name: 'primary',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.creator.updateBrandingColors.params.primary',
        fallbackDescription: 'Primary color',
      },
      {
        name: 'secondary',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.creator.updateBrandingColors.params.secondary',
        fallbackDescription: 'Secondary color',
      },
      {
        name: 'accent',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.creator.updateBrandingColors.params.accent',
        fallbackDescription: 'Accent color',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  // =========================================================================
  // ONBOARDING - Creator Mode (Manifest)
  // =========================================================================

  CREATOR_UPDATE_MANIFEST_METADATA: {
    name: ACTION_NAMES.CREATOR_UPDATE_MANIFEST_METADATA,
    key: 'CREATOR_UPDATE_MANIFEST_METADATA',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.updateManifestMetadata.description',
    fallbackDescription: 'Update training manifest metadata',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.creator.updateManifestMetadata.params.title',
        fallbackDescription: 'Training title',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.creator.updateManifestMetadata.params.description',
        fallbackDescription: 'Training description',
      },
      {
        name: 'category',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.creator.updateManifestMetadata.params.category',
        fallbackDescription: 'Training category',
      },
      {
        name: 'icon',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.creator.updateManifestMetadata.params.icon',
        fallbackDescription: 'Training icon',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_VALIDATE_MANIFEST: {
    name: ACTION_NAMES.CREATOR_VALIDATE_MANIFEST,
    key: 'CREATOR_VALIDATE_MANIFEST',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.validateManifest.description',
    fallbackDescription: 'Validate the training manifest',
    parameters: [],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_SUGGEST_TRAINING_TITLE: {
    name: ACTION_NAMES.CREATOR_SUGGEST_TRAINING_TITLE,
    key: 'CREATOR_SUGGEST_TRAINING_TITLE',
    module: 'onboarding',
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.creator.suggestTrainingTitle.description',
    fallbackDescription: 'Suggest training titles based on topic and audience',
    parameters: [
      {
        name: 'topic',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.creator.suggestTrainingTitle.params.topic',
        fallbackDescription: 'Training topic',
      },
      {
        name: 'audience',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.creator.suggestTrainingTitle.params.audience',
        fallbackDescription: 'Target audience',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  // =========================================================================
  // ONBOARDING - Creator Mode (Phases)
  // =========================================================================

  CREATOR_ADD_PHASE: {
    name: ACTION_NAMES.CREATOR_ADD_PHASE,
    key: 'CREATOR_ADD_PHASE',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.addPhase.description',
    fallbackDescription: 'Add a new phase to the training',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.addPhase.params.title',
        fallbackDescription: 'Phase title',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.creator.addPhase.params.description',
        fallbackDescription: 'Phase description',
      },
      {
        name: 'position',
        type: 'number',
        required: false,
        i18nDescPath: 'copilot:actions.creator.addPhase.params.position',
        fallbackDescription: 'Position to insert the phase',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_UPDATE_PHASE: {
    name: ACTION_NAMES.CREATOR_UPDATE_PHASE,
    key: 'CREATOR_UPDATE_PHASE',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.updatePhase.description',
    fallbackDescription: 'Update an existing phase',
    parameters: [
      {
        name: 'phaseId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.updatePhase.params.phaseId',
        fallbackDescription: 'ID of the phase to update',
      },
      {
        name: 'title',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.creator.updatePhase.params.title',
        fallbackDescription: 'New phase title',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.creator.updatePhase.params.description',
        fallbackDescription: 'New phase description',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_REORDER_PHASES: {
    name: ACTION_NAMES.CREATOR_REORDER_PHASES,
    key: 'CREATOR_REORDER_PHASES',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.reorderPhases.description',
    fallbackDescription: 'Reorder phases in the training',
    parameters: [
      {
        name: 'phaseId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.reorderPhases.params.phaseId',
        fallbackDescription: 'ID of the phase to move',
      },
      {
        name: 'newPosition',
        type: 'number',
        required: true,
        i18nDescPath:
          'copilot:actions.creator.reorderPhases.params.newPosition',
        fallbackDescription: 'New position for the phase',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_DELETE_PHASE: {
    name: ACTION_NAMES.CREATOR_DELETE_PHASE,
    key: 'CREATOR_DELETE_PHASE',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.deletePhase.description',
    fallbackDescription: 'Delete a phase from the training',
    parameters: [
      {
        name: 'phaseId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.deletePhase.params.phaseId',
        fallbackDescription: 'ID of the phase to delete',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_LIST_PHASES: {
    name: ACTION_NAMES.CREATOR_LIST_PHASES,
    key: 'CREATOR_LIST_PHASES',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.listPhases.description',
    fallbackDescription: 'List all phases in the training',
    parameters: [],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_MOVE_PHASE_UP: {
    name: ACTION_NAMES.CREATOR_MOVE_PHASE_UP,
    key: 'CREATOR_MOVE_PHASE_UP',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.movePhaseUp.description',
    fallbackDescription: 'Move a phase up in the order',
    parameters: [
      {
        name: 'phaseId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.movePhaseUp.params.phaseId',
        fallbackDescription: 'ID of the phase to move',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_MOVE_PHASE_DOWN: {
    name: ACTION_NAMES.CREATOR_MOVE_PHASE_DOWN,
    key: 'CREATOR_MOVE_PHASE_DOWN',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.movePhaseDown.description',
    fallbackDescription: 'Move a phase down in the order',
    parameters: [
      {
        name: 'phaseId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.movePhaseDown.params.phaseId',
        fallbackDescription: 'ID of the phase to move',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  // =========================================================================
  // ONBOARDING - Creator Mode (Steps)
  // =========================================================================

  CREATOR_ADD_STEP: {
    name: ACTION_NAMES.CREATOR_ADD_STEP,
    key: 'CREATOR_ADD_STEP',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.addStep.description',
    fallbackDescription: 'Add a new step to a phase',
    parameters: [
      {
        name: 'phaseId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.addStep.params.phaseId',
        fallbackDescription: 'ID of the phase',
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.addStep.params.title',
        fallbackDescription: 'Step title',
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.creator.addStep.params.type',
        fallbackDescription: 'Step type (document, quiz, etc.)',
      },
      {
        name: 'content',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.creator.addStep.params.content',
        fallbackDescription: 'Step content',
      },
      {
        name: 'estimatedMinutes',
        type: 'number',
        required: false,
        i18nDescPath: 'copilot:actions.creator.addStep.params.estimatedMinutes',
        fallbackDescription: 'Estimated time in minutes',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_UPDATE_STEP: {
    name: ACTION_NAMES.CREATOR_UPDATE_STEP,
    key: 'CREATOR_UPDATE_STEP',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.updateStep.description',
    fallbackDescription: 'Update an existing step',
    parameters: [
      {
        name: 'phaseId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.updateStep.params.phaseId',
        fallbackDescription: 'ID of the phase',
      },
      {
        name: 'stepId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.updateStep.params.stepId',
        fallbackDescription: 'ID of the step to update',
      },
      {
        name: 'title',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.creator.updateStep.params.title',
        fallbackDescription: 'New step title',
      },
      {
        name: 'content',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.creator.updateStep.params.content',
        fallbackDescription: 'New step content',
      },
      {
        name: 'estimatedMinutes',
        type: 'number',
        required: false,
        i18nDescPath:
          'copilot:actions.creator.updateStep.params.estimatedMinutes',
        fallbackDescription: 'New estimated time',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_DELETE_STEP: {
    name: ACTION_NAMES.CREATOR_DELETE_STEP,
    key: 'CREATOR_DELETE_STEP',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.deleteStep.description',
    fallbackDescription: 'Delete a step from a phase',
    parameters: [
      {
        name: 'phaseId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.deleteStep.params.phaseId',
        fallbackDescription: 'ID of the phase',
      },
      {
        name: 'stepId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.creator.deleteStep.params.stepId',
        fallbackDescription: 'ID of the step to delete',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  // =========================================================================
  // ONBOARDING - Creator Mode (Proposals)
  // =========================================================================

  CREATOR_ANALYZE_DOCUMENTS: {
    name: ACTION_NAMES.CREATOR_ANALYZE_DOCUMENTS,
    key: 'CREATOR_ANALYZE_DOCUMENTS',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.analyzeDocuments.description',
    fallbackDescription: 'Analyze uploaded documents for training structure',
    parameters: [
      {
        name: 'targetSpecialization',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.creator.analyzeDocuments.params.targetSpecialization',
        fallbackDescription: 'Target specialization type',
      },
      {
        name: 'targetAudience',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.creator.analyzeDocuments.params.targetAudience',
        fallbackDescription: 'Target audience',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_PROPOSE_TRAINING_STRUCTURE: {
    name: ACTION_NAMES.CREATOR_PROPOSE_TRAINING_STRUCTURE,
    key: 'CREATOR_PROPOSE_TRAINING_STRUCTURE',
    module: 'onboarding',
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.creator.proposeTrainingStructure.description',
    fallbackDescription: 'Propose a training structure based on documents',
    parameters: [],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_NAVIGATE_TO_CREATOR_STEP: {
    name: ACTION_NAMES.CREATOR_NAVIGATE_TO_CREATOR_STEP,
    key: 'CREATOR_NAVIGATE_TO_CREATOR_STEP',
    module: 'onboarding',
    category: 'navigation',
    i18nDescPath: 'copilot:actions.creator.navigateToCreatorStep.description',
    fallbackDescription: 'Navigate to a specific creator wizard step',
    parameters: [
      {
        name: 'step',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.creator.navigateToCreatorStep.params.step',
        fallbackDescription:
          'Step to navigate to (knowledge, proposal, structure, branding, preview)',
        enum: ['knowledge', 'proposal', 'structure', 'branding', 'preview'],
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  CREATOR_GENERATE_QUIZ_QUESTIONS: {
    name: ACTION_NAMES.CREATOR_GENERATE_QUIZ_QUESTIONS,
    key: 'CREATOR_GENERATE_QUIZ_QUESTIONS',
    module: 'onboarding',
    category: 'task',
    i18nDescPath: 'copilot:actions.creator.generateQuizQuestions.description',
    fallbackDescription: 'Generate quiz questions for a step',
    parameters: [],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/onboarding/copilot/onboarding-handlers.ts',
  },

  // =========================================================================
  // KNOWLEDGE BASE (shared)
  // =========================================================================

  LIST_KNOWLEDGE_DOCUMENTS: {
    name: ACTION_NAMES.LIST_KNOWLEDGE_DOCUMENTS,
    key: 'LIST_KNOWLEDGE_DOCUMENTS',
    module: 'upstream',
    category: 'knowledge',
    i18nDescPath: 'copilot:actions.knowledge.listDocuments.description',
    fallbackDescription: 'List available knowledge base documents',
    parameters: [
      {
        name: 'filterBySlotType',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.knowledge.listDocuments.params.filterBySlotType',
        fallbackDescription: 'Filter by document slot type',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/knowledge-base-actions.tsx',
  },

  SEARCH_KNOWLEDGE_BASE: {
    name: ACTION_NAMES.SEARCH_KNOWLEDGE_BASE,
    key: 'SEARCH_KNOWLEDGE_BASE',
    module: 'upstream',
    category: 'knowledge',
    i18nDescPath: 'copilot:actions.knowledge.searchKB.description',
    fallbackDescription: 'Search the knowledge base for relevant documents',
    parameters: [
      {
        name: 'query',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.knowledge.searchKB.params.query',
        fallbackDescription: 'Search query',
      },
      {
        name: 'maxResults',
        type: 'number',
        required: false,
        i18nDescPath: 'copilot:actions.knowledge.searchKB.params.maxResults',
        fallbackDescription: 'Maximum number of results',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/knowledge-base-actions.tsx',
  },

  SEMANTIC_SEARCH_KB: {
    name: ACTION_NAMES.SEMANTIC_SEARCH_KB,
    key: 'SEMANTIC_SEARCH_KB',
    module: 'upstream',
    category: 'knowledge',
    i18nDescPath: 'copilot:actions.knowledge.semanticSearch.description',
    fallbackDescription: 'Perform semantic search on knowledge base',
    parameters: [
      {
        name: 'query',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.knowledge.semanticSearch.params.query',
        fallbackDescription: 'Semantic search query',
      },
      {
        name: 'topK',
        type: 'number',
        required: false,
        i18nDescPath: 'copilot:actions.knowledge.semanticSearch.params.topK',
        fallbackDescription: 'Number of top results',
      },
      {
        name: 'threshold',
        type: 'number',
        required: false,
        i18nDescPath:
          'copilot:actions.knowledge.semanticSearch.params.threshold',
        fallbackDescription: 'Similarity threshold (0-1)',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/upstream/components/wizard/copilot-actions/knowledge-base-actions.tsx',
  },

  // =========================================================================
  // FEEDBACK - LangGraph Integration Actions
  // =========================================================================

  ANALYZE_FEEDBACK: {
    name: ACTION_NAMES.ANALYZE_FEEDBACK,
    key: 'ANALYZE_FEEDBACK',
    module: 'feedback',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.feedback.analyzeFeedback.description',
    fallbackDescription:
      'Analyze feedback content to extract category, severity, and keywords',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.feedback.analyzeFeedback.params.feedbackId',
        fallbackDescription: 'ID of the feedback to analyze',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/kanban/components/copilot-actions/feedback-actions.tsx',
  },

  CHECK_FEEDBACK_DUPLICATES: {
    name: ACTION_NAMES.CHECK_FEEDBACK_DUPLICATES,
    key: 'CHECK_FEEDBACK_DUPLICATES',
    module: 'feedback',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.feedback.checkDuplicates.description',
    fallbackDescription: 'Check if there are duplicate feedbacks in the system',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.feedback.checkDuplicates.params.feedbackId',
        fallbackDescription: 'ID of the feedback to check for duplicates',
      },
      {
        name: 'threshold',
        type: 'number',
        required: false,
        i18nDescPath:
          'copilot:actions.feedback.checkDuplicates.params.threshold',
        fallbackDescription: 'Similarity threshold (0-1, default 0.8)',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/kanban/components/copilot-actions/feedback-actions.tsx',
  },

  CALCULATE_FEEDBACK_PRIORITY: {
    name: ACTION_NAMES.CALCULATE_FEEDBACK_PRIORITY,
    key: 'CALCULATE_FEEDBACK_PRIORITY',
    module: 'feedback',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.feedback.calculatePriority.description',
    fallbackDescription: 'Calculate priority score for a feedback item',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.feedback.calculatePriority.params.feedbackId',
        fallbackDescription: 'ID of the feedback to calculate priority',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/kanban/components/copilot-actions/feedback-actions.tsx',
  },

  SUGGEST_FEEDBACK_RESOLUTION: {
    name: ACTION_NAMES.SUGGEST_FEEDBACK_RESOLUTION,
    key: 'SUGGEST_FEEDBACK_RESOLUTION',
    module: 'feedback',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.feedback.suggestResolution.description',
    fallbackDescription: 'Suggest resolution steps for a feedback item',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.feedback.suggestResolution.params.feedbackId',
        fallbackDescription: 'ID of the feedback to suggest resolution',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/kanban/components/copilot-actions/feedback-actions.tsx',
  },

  MOVE_FEEDBACK_TO_COLUMN: {
    name: ACTION_NAMES.MOVE_FEEDBACK_TO_COLUMN,
    key: 'MOVE_FEEDBACK_TO_COLUMN',
    module: 'feedback',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.feedback.moveToColumn.description',
    fallbackDescription: 'Move feedback to a different Kanban column',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.feedback.moveToColumn.params.feedbackId',
        fallbackDescription: 'ID of the feedback to move',
      },
      {
        name: 'column',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.feedback.moveToColumn.params.column',
        fallbackDescription: 'Target column name',
        enum: ['new', 'acknowledged', 'in_progress', 'resolved', 'wont_fix'],
      },
      {
        name: 'comment',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.feedback.moveToColumn.params.comment',
        fallbackDescription: 'Optional comment explaining the move',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile:
      'src/features/kanban/components/copilot-actions/feedback-actions.tsx',
  },

  GET_KANBAN_SUMMARY: {
    name: ACTION_NAMES.GET_KANBAN_SUMMARY,
    key: 'GET_KANBAN_SUMMARY',
    module: 'kanban',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.feedback.getKanbanSummary.description',
    fallbackDescription: 'Get summary of the Kanban board status',
    parameters: [],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/kanban/components/copilot-actions/feedback-actions.tsx',
  },

  ADD_FEEDBACK_COMMENT: {
    name: ACTION_NAMES.ADD_FEEDBACK_COMMENT,
    key: 'ADD_FEEDBACK_COMMENT',
    module: 'feedback',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.feedback.addComment.description',
    fallbackDescription: 'Add a comment to a feedback item',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.feedback.addComment.params.feedbackId',
        fallbackDescription: 'ID of the feedback',
      },
      {
        name: 'comment',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.feedback.addComment.params.comment',
        fallbackDescription: 'Comment text',
      },
      {
        name: 'isInternal',
        type: 'boolean',
        required: false,
        i18nDescPath: 'copilot:actions.feedback.addComment.params.isInternal',
        fallbackDescription: 'Whether the comment is internal only',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/kanban/components/copilot-actions/feedback-actions.tsx',
  },

  GET_FEEDBACK_HISTORY: {
    name: ACTION_NAMES.GET_FEEDBACK_HISTORY,
    key: 'GET_FEEDBACK_HISTORY',
    module: 'feedback',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.feedback.getHistory.description',
    fallbackDescription: 'Get the history of changes for a feedback item',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.feedback.getHistory.params.feedbackId',
        fallbackDescription: 'ID of the feedback',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/kanban/components/copilot-actions/feedback-actions.tsx',
  },

  GET_RELATED_FEEDBACKS: {
    name: ACTION_NAMES.GET_RELATED_FEEDBACKS,
    key: 'GET_RELATED_FEEDBACKS',
    module: 'feedback',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.feedback.getRelated.description',
    fallbackDescription: 'Get feedbacks related to a specific feedback item',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.feedback.getRelated.params.feedbackId',
        fallbackDescription: 'ID of the feedback',
      },
      {
        name: 'maxResults',
        type: 'number',
        required: false,
        i18nDescPath: 'copilot:actions.feedback.getRelated.params.maxResults',
        fallbackDescription: 'Maximum number of related feedbacks to return',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/features/kanban/components/copilot-actions/feedback-actions.tsx',
  },

  // =========================================================================
  // ATLAS ANALYSIS ACTIONS
  // =========================================================================

  ATLAS_ANALYZE_PATTERNS: {
    name: ACTION_NAMES.ATLAS_ANALYZE_PATTERNS,
    key: 'ATLAS_ANALYZE_PATTERNS',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.analyzePatterns.description',
    fallbackDescription:
      'Analyze feedback patterns to identify recurring issues, common themes, and areas that need attention.',
    parameters: [
      {
        name: 'timeframe',
        type: 'string',
        required: false,
        enum: ['last_24h', 'last_week', 'last_month', 'all_time'],
        i18nDescPath: 'copilot:actions.atlas.analyzePatterns.params.timeframe',
        fallbackDescription: 'Time period to analyze',
      },
      {
        name: 'focusArea',
        type: 'string',
        required: false,
        enum: ['bugs', 'questions', 'suggestions', 'all'],
        i18nDescPath: 'copilot:actions.atlas.analyzePatterns.params.focusArea',
        fallbackDescription: 'Which category to focus on',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/analysis-actions.tsx',
  },

  ATLAS_GENERATE_REPORT: {
    name: ACTION_NAMES.ATLAS_GENERATE_REPORT,
    key: 'ATLAS_GENERATE_REPORT',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.generateReport.description',
    fallbackDescription:
      'Generate a comprehensive summary report of the feedback status for stakeholder updates.',
    parameters: [
      {
        name: 'format',
        type: 'string',
        required: false,
        enum: ['brief', 'detailed', 'executive'],
        i18nDescPath: 'copilot:actions.atlas.generateReport.params.format',
        fallbackDescription: 'Report format/length',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/analysis-actions.tsx',
  },

  ATLAS_FIND_SIMILAR: {
    name: ACTION_NAMES.ATLAS_FIND_SIMILAR,
    key: 'ATLAS_FIND_SIMILAR',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.findSimilar.description',
    fallbackDescription:
      'Find feedbacks that are similar or potentially duplicates of a given feedback.',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.atlas.findSimilar.params.feedbackId',
        fallbackDescription: 'ID of the feedback to find similar items for',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/analysis-actions.tsx',
  },

  ATLAS_SUGGEST_PRIORITIES: {
    name: ACTION_NAMES.ATLAS_SUGGEST_PRIORITIES,
    key: 'ATLAS_SUGGEST_PRIORITIES',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.suggestPriorities.description',
    fallbackDescription:
      'Analyze pending feedbacks and suggest a priority order for addressing them.',
    parameters: [
      {
        name: 'limit',
        type: 'number',
        required: false,
        i18nDescPath: 'copilot:actions.atlas.suggestPriorities.params.limit',
        fallbackDescription: 'Maximum number of items to prioritize',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/analysis-actions.tsx',
  },

  // =========================================================================
  // ATLAS RESOLUTION ACTIONS
  // =========================================================================

  ATLAS_RESOLVE_FEEDBACK: {
    name: ACTION_NAMES.ATLAS_RESOLVE_FEEDBACK,
    key: 'ATLAS_RESOLVE_FEEDBACK',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.resolveFeedback.description',
    fallbackDescription: 'Mark a feedback as resolved with a resolution note.',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.atlas.resolveFeedback.params.feedbackId',
        fallbackDescription: 'ID of the feedback to resolve',
      },
      {
        name: 'resolution',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.atlas.resolveFeedback.params.resolution',
        fallbackDescription: 'Resolution description',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/resolution-actions.tsx',
  },

  ATLAS_UPDATE_STATUS: {
    name: ACTION_NAMES.ATLAS_UPDATE_STATUS,
    key: 'ATLAS_UPDATE_STATUS',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.updateStatus.description',
    fallbackDescription: 'Update the status of a feedback item.',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.atlas.updateStatus.params.feedbackId',
        fallbackDescription: 'ID of the feedback',
      },
      {
        name: 'status',
        type: 'string',
        required: true,
        enum: ['new', 'in_progress', 'resolved', 'wont_fix'],
        i18nDescPath: 'copilot:actions.atlas.updateStatus.params.status',
        fallbackDescription: 'New status',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/resolution-actions.tsx',
  },

  ATLAS_SUGGEST_RESOLUTION: {
    name: ACTION_NAMES.ATLAS_SUGGEST_RESOLUTION,
    key: 'ATLAS_SUGGEST_RESOLUTION',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.suggestResolution.description',
    fallbackDescription: 'Suggest a resolution approach for a feedback item.',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.atlas.suggestResolution.params.feedbackId',
        fallbackDescription: 'ID of the feedback',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/resolution-actions.tsx',
  },

  // =========================================================================
  // ATLAS DATA ACTIONS
  // =========================================================================

  ATLAS_LIST_FEEDBACKS: {
    name: ACTION_NAMES.ATLAS_LIST_FEEDBACKS,
    key: 'ATLAS_LIST_FEEDBACKS',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.listFeedbacks.description',
    fallbackDescription: 'List feedbacks with optional filters.',
    parameters: [
      {
        name: 'status',
        type: 'string',
        required: false,
        enum: ['new', 'in_progress', 'resolved', 'wont_fix', 'all'],
        i18nDescPath: 'copilot:actions.atlas.listFeedbacks.params.status',
        fallbackDescription: 'Filter by status',
      },
      {
        name: 'category',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.atlas.listFeedbacks.params.category',
        fallbackDescription: 'Filter by category',
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        i18nDescPath: 'copilot:actions.atlas.listFeedbacks.params.limit',
        fallbackDescription: 'Maximum number of results',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/data-actions.tsx',
  },

  ATLAS_GET_FEEDBACK_DETAILS: {
    name: ACTION_NAMES.ATLAS_GET_FEEDBACK_DETAILS,
    key: 'ATLAS_GET_FEEDBACK_DETAILS',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.getFeedbackDetails.description',
    fallbackDescription: 'Get detailed information about a specific feedback.',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.atlas.getFeedbackDetails.params.feedbackId',
        fallbackDescription: 'ID of the feedback',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/data-actions.tsx',
  },

  ATLAS_LIST_COMMENTS: {
    name: ACTION_NAMES.ATLAS_LIST_COMMENTS,
    key: 'ATLAS_LIST_COMMENTS',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.listComments.description',
    fallbackDescription: 'List comments for a feedback item.',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.atlas.listComments.params.feedbackId',
        fallbackDescription: 'ID of the feedback',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/data-actions.tsx',
  },

  // =========================================================================
  // ATLAS CAPTURE ACTIONS
  // =========================================================================

  ATLAS_CAPTURE_FEEDBACK: {
    name: ACTION_NAMES.ATLAS_CAPTURE_FEEDBACK,
    key: 'ATLAS_CAPTURE_FEEDBACK',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.captureFeedback.description',
    fallbackDescription:
      'Capture and save a new feedback from the conversation.',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.atlas.captureFeedback.params.title',
        fallbackDescription: 'Feedback title',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.atlas.captureFeedback.params.description',
        fallbackDescription: 'Detailed description',
      },
      {
        name: 'category',
        type: 'string',
        required: true,
        enum: ['bug', 'suggestion', 'question', 'praise'],
        i18nDescPath: 'copilot:actions.atlas.captureFeedback.params.category',
        fallbackDescription: 'Feedback category',
      },
      {
        name: 'severity',
        type: 'string',
        required: false,
        enum: ['low', 'medium', 'high', 'critical'],
        i18nDescPath: 'copilot:actions.atlas.captureFeedback.params.severity',
        fallbackDescription: 'Severity level',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile:
      'src/features/atlas/copilot-actions/feedback-capture-actions.tsx',
  },

  // =========================================================================
  // ATLAS KANBAN ACTIONS
  // =========================================================================

  ATLAS_GET_KANBAN_BOARD: {
    name: ACTION_NAMES.ATLAS_GET_KANBAN_BOARD,
    key: 'ATLAS_GET_KANBAN_BOARD',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.getKanbanBoard.description',
    fallbackDescription: 'Get the current kanban board state with all columns.',
    parameters: [],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/kanban-actions.tsx',
  },

  ATLAS_MOVE_FEEDBACK_COLUMN: {
    name: ACTION_NAMES.ATLAS_MOVE_FEEDBACK_COLUMN,
    key: 'ATLAS_MOVE_FEEDBACK_COLUMN',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.atlas.moveFeedbackColumn.description',
    fallbackDescription: 'Move a feedback to a different kanban column.',
    parameters: [
      {
        name: 'feedbackId',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.atlas.moveFeedbackColumn.params.feedbackId',
        fallbackDescription: 'ID of the feedback',
      },
      {
        name: 'targetColumn',
        type: 'string',
        required: true,
        enum: ['new', 'in_progress', 'resolved', 'wont_fix'],
        i18nDescPath:
          'copilot:actions.atlas.moveFeedbackColumn.params.targetColumn',
        fallbackDescription: 'Target column/status',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/kanban-actions.tsx',
  },

  // =========================================================================
  // ATLAS DEEP AGENT ACTIONS
  // =========================================================================

  ATLAS_DEEP_ANALYSIS: {
    name: ACTION_NAMES.ATLAS_DEEP_ANALYSIS,
    key: 'ATLAS_DEEP_ANALYSIS',
    module: 'atlas',
    category: 'agent',
    i18nDescPath: 'copilot:actions.atlas.deepAnalysis.description',
    fallbackDescription:
      'Trigger deep AI analysis of feedbacks using LangGraph agents.',
    parameters: [
      {
        name: 'analysisType',
        type: 'string',
        required: true,
        enum: ['patterns', 'sentiment', 'priorities', 'full'],
        i18nDescPath: 'copilot:actions.atlas.deepAnalysis.params.analysisType',
        fallbackDescription: 'Type of analysis to perform',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/deep-agent-actions.tsx',
  },

  ATLAS_DEEP_PATTERNS: {
    name: ACTION_NAMES.ATLAS_DEEP_PATTERNS,
    key: 'ATLAS_DEEP_PATTERNS',
    module: 'atlas',
    category: 'agent',
    i18nDescPath: 'copilot:actions.atlas.deepPatterns.description',
    fallbackDescription:
      'Use DeepAgent to identify complex patterns across all feedbacks.',
    parameters: [
      {
        name: 'timeRange',
        type: 'string',
        required: false,
        i18nDescPath: 'copilot:actions.atlas.deepPatterns.params.timeRange',
        fallbackDescription: 'Time range for analysis',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/atlas/copilot-actions/deep-agent-actions.tsx',
  },

  // =========================================================================
  // MY TASKS ACTIONS
  // =========================================================================

  MYTASKS_QUICK_ADD: {
    name: ACTION_NAMES.MYTASKS_QUICK_ADD,
    key: 'MYTASKS_QUICK_ADD',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.myTasks.quickAddTask.description',
    fallbackDescription: 'Quickly add a task to a specific Kanban column',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.myTasks.quickAddTask.params.title',
        fallbackDescription: 'Task title',
      },
      {
        name: 'column',
        type: 'string',
        required: true,
        enum: ['backlog', 'todo', 'in_progress', 'review', 'done'],
        i18nDescPath: 'copilot:actions.myTasks.quickAddTask.params.column',
        fallbackDescription: 'Target column',
      },
      {
        name: 'priority',
        type: 'string',
        required: false,
        enum: ['low', 'medium', 'high', 'critical'],
        i18nDescPath: 'copilot:actions.myTasks.quickAddTask.params.priority',
        fallbackDescription: 'Task priority (default: medium)',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/my-tasks/copilot-actions/task-kanban-actions.tsx',
  },

  MYTASKS_BATCH_MOVE: {
    name: ACTION_NAMES.MYTASKS_BATCH_MOVE,
    key: 'MYTASKS_BATCH_MOVE',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.myTasks.batchMoveTasks.description',
    fallbackDescription: 'Move multiple tasks from one column to another',
    parameters: [
      {
        name: 'fromColumn',
        type: 'string',
        required: true,
        enum: ['backlog', 'todo', 'in_progress', 'review', 'done'],
        i18nDescPath:
          'copilot:actions.myTasks.batchMoveTasks.params.fromColumn',
        fallbackDescription: 'Source column',
      },
      {
        name: 'toColumn',
        type: 'string',
        required: true,
        enum: ['backlog', 'todo', 'in_progress', 'review', 'done'],
        i18nDescPath: 'copilot:actions.myTasks.batchMoveTasks.params.toColumn',
        fallbackDescription: 'Target column',
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        i18nDescPath: 'copilot:actions.myTasks.batchMoveTasks.params.limit',
        fallbackDescription: 'Maximum number of tasks to move',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/my-tasks/copilot-actions/task-kanban-actions.tsx',
  },

  MYTASKS_FOCUS: {
    name: ACTION_NAMES.MYTASKS_FOCUS,
    key: 'MYTASKS_FOCUS',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.myTasks.focusOnTask.description',
    fallbackDescription: 'Activate focus mode on a specific task',
    parameters: [
      {
        name: 'taskTitle',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.myTasks.focusOnTask.params.taskTitle',
        fallbackDescription: 'Task title or partial title',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/my-tasks/copilot-actions/task-kanban-actions.tsx',
  },

  MYTASKS_CLEAR_FOCUS: {
    name: ACTION_NAMES.MYTASKS_CLEAR_FOCUS,
    key: 'MYTASKS_CLEAR_FOCUS',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.myTasks.clearFocus.description',
    fallbackDescription: 'Deactivate focus mode',
    parameters: [],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/my-tasks/copilot-actions/task-kanban-actions.tsx',
  },

  MYTASKS_CHANGE_PRIORITY: {
    name: ACTION_NAMES.MYTASKS_CHANGE_PRIORITY,
    key: 'MYTASKS_CHANGE_PRIORITY',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.myTasks.changeTaskPriority.description',
    fallbackDescription: 'Change the priority of a task',
    parameters: [
      {
        name: 'taskTitle',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.myTasks.changeTaskPriority.params.taskTitle',
        fallbackDescription: 'Task title or partial title',
      },
      {
        name: 'newPriority',
        type: 'string',
        required: true,
        enum: ['low', 'medium', 'high', 'critical'],
        i18nDescPath:
          'copilot:actions.myTasks.changeTaskPriority.params.newPriority',
        fallbackDescription: 'New priority level',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/my-tasks/copilot-actions/task-kanban-actions.tsx',
  },

  MYTASKS_GET_OVERVIEW: {
    name: ACTION_NAMES.MYTASKS_GET_OVERVIEW,
    key: 'MYTASKS_GET_OVERVIEW',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.myTasks.getKanbanOverview.description',
    fallbackDescription: 'Get an overview of the Kanban board with statistics',
    parameters: [],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/my-tasks/copilot-actions/task-kanban-actions.tsx',
  },

  MYTASKS_SUGGEST_WORKFLOW: {
    name: ACTION_NAMES.MYTASKS_SUGGEST_WORKFLOW,
    key: 'MYTASKS_SUGGEST_WORKFLOW',
    module: 'my-tasks',
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.myTasks.suggestWorkflow.description',
    fallbackDescription: 'Suggest the ideal workflow based on current tasks',
    parameters: [],
    hasRender: true,
    isHITL: false,
    sourceFile: 'src/features/my-tasks/copilot-actions/task-kanban-actions.tsx',
  },

  MYTASKS_COMPLETE_REVIEW: {
    name: ACTION_NAMES.MYTASKS_COMPLETE_REVIEW,
    key: 'MYTASKS_COMPLETE_REVIEW',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.myTasks.completeReviewTasks.description',
    fallbackDescription: 'Mark all tasks in Review as completed',
    parameters: [
      {
        name: 'confirm',
        type: 'boolean',
        required: false,
        i18nDescPath:
          'copilot:actions.myTasks.completeReviewTasks.params.confirm',
        fallbackDescription: 'Confirm the operation (default: true)',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/my-tasks/copilot-actions/task-kanban-actions.tsx',
  },

  // =========================================================================
  // MIGRATION WIZARD ACTIONS
  // =========================================================================

  MIGRATION_LIST_SOURCE_AGENTS: {
    name: ACTION_NAMES.MIGRATION_LIST_SOURCE_AGENTS,
    key: 'MIGRATION_LIST_SOURCE_AGENTS',
    module: 'migration',
    category: 'mcp',
    i18nDescPath: 'copilot:actions.migration.listSourceAgents.description',
    fallbackDescription: 'List all agents available in the source namespace',
    parameters: [],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/migration-wizard/copilot/migration-handlers.ts',
  },

  MIGRATION_GET_AGENT_DETAILS: {
    name: ACTION_NAMES.MIGRATION_GET_AGENT_DETAILS,
    key: 'MIGRATION_GET_AGENT_DETAILS',
    module: 'migration',
    category: 'mcp',
    i18nDescPath: 'copilot:actions.migration.getAgentDetails.description',
    fallbackDescription: 'Get detailed information about a specific agent',
    parameters: [
      {
        name: 'agentId',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.migration.getAgentDetails.params.agentId',
        fallbackDescription: 'The ID of the agent to get details for',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/migration-wizard/copilot/migration-handlers.ts',
  },

  MIGRATION_VALIDATE_PLAN: {
    name: ACTION_NAMES.MIGRATION_VALIDATE_PLAN,
    key: 'MIGRATION_VALIDATE_PLAN',
    module: 'migration',
    category: 'mcp',
    i18nDescPath: 'copilot:actions.migration.validatePlan.description',
    fallbackDescription: 'Validate migration plan and check for conflicts',
    parameters: [],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/migration-wizard/copilot/migration-handlers.ts',
  },

  MIGRATION_ANALYZE_DEPENDENCIES: {
    name: ACTION_NAMES.MIGRATION_ANALYZE_DEPENDENCIES,
    key: 'MIGRATION_ANALYZE_DEPENDENCIES',
    module: 'migration',
    category: 'mcp',
    i18nDescPath: 'copilot:actions.migration.analyzeDependencies.description',
    fallbackDescription: 'Analyze dependencies between selected agents',
    parameters: [],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/migration-wizard/copilot/migration-handlers.ts',
  },

  MIGRATION_VERIFY_AGENT: {
    name: ACTION_NAMES.MIGRATION_VERIFY_AGENT,
    key: 'MIGRATION_VERIFY_AGENT',
    module: 'migration',
    category: 'mcp',
    i18nDescPath: 'copilot:actions.migration.verifyAgent.description',
    fallbackDescription: 'Verify a migrated agent exists in the target',
    parameters: [
      {
        name: 'agentId',
        type: 'string',
        required: true,
        i18nDescPath: 'copilot:actions.migration.verifyAgent.params.agentId',
        fallbackDescription: 'The ID of the agent to verify',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/migration-wizard/copilot/migration-handlers.ts',
  },

  MIGRATION_GENERATE_REPORT: {
    name: ACTION_NAMES.MIGRATION_GENERATE_REPORT,
    key: 'MIGRATION_GENERATE_REPORT',
    module: 'migration',
    category: 'mcp',
    i18nDescPath: 'copilot:actions.migration.generateReport.description',
    fallbackDescription: 'Generate a comprehensive migration report',
    parameters: [],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/migration-wizard/copilot/migration-handlers.ts',
  },

  MIGRATION_FEEDBACK_BUG: {
    name: ACTION_NAMES.MIGRATION_FEEDBACK_BUG,
    key: 'MIGRATION_FEEDBACK_BUG',
    module: 'migration',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.migration.feedback.reportBug.description',
    fallbackDescription: 'Report a bug or error in the Migration Wizard',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.migration.feedback.reportBug.params.title',
        fallbackDescription: 'Short summary of the bug',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.migration.feedback.reportBug.params.description',
        fallbackDescription: 'Detailed description of the bug',
      },
      {
        name: 'severity',
        type: 'string',
        required: true,
        enum: ['low', 'medium', 'high', 'critical'],
        i18nDescPath:
          'copilot:actions.migration.feedback.reportBug.params.severity',
        fallbackDescription: 'Bug severity level',
      },
      {
        name: 'reproductionSteps',
        type: 'string[]',
        required: false,
        i18nDescPath:
          'copilot:actions.migration.feedback.reportBug.params.reproductionSteps',
        fallbackDescription: 'Steps to reproduce the bug',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/migration-wizard/copilot/migration-handlers.ts',
  },

  MIGRATION_FEEDBACK_QUESTION: {
    name: ACTION_NAMES.MIGRATION_FEEDBACK_QUESTION,
    key: 'MIGRATION_FEEDBACK_QUESTION',
    module: 'migration',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.migration.feedback.askQuestion.description',
    fallbackDescription: 'Register a question about the Migration Wizard',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.migration.feedback.askQuestion.params.title',
        fallbackDescription: 'Short summary of the question',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.migration.feedback.askQuestion.params.description',
        fallbackDescription: 'Detailed explanation of the doubt',
      },
      {
        name: 'fieldOrAction',
        type: 'string',
        required: false,
        i18nDescPath:
          'copilot:actions.migration.feedback.askQuestion.params.fieldOrAction',
        fallbackDescription: 'Which field or feature caused confusion',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/migration-wizard/copilot/migration-handlers.ts',
  },

  MIGRATION_FEEDBACK_SUGGESTION: {
    name: ACTION_NAMES.MIGRATION_FEEDBACK_SUGGESTION,
    key: 'MIGRATION_FEEDBACK_SUGGESTION',
    module: 'migration',
    category: 'feedback',
    i18nDescPath:
      'copilot:actions.migration.feedback.suggestImprovement.description',
    fallbackDescription: 'Suggest an improvement for the Migration Wizard',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.migration.feedback.suggestImprovement.params.title',
        fallbackDescription: 'Short summary of the suggestion',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.migration.feedback.suggestImprovement.params.description',
        fallbackDescription: 'Detailed description of the improvement',
      },
      {
        name: 'tags',
        type: 'string[]',
        required: false,
        i18nDescPath:
          'copilot:actions.migration.feedback.suggestImprovement.params.tags',
        fallbackDescription: 'Tags to categorize the suggestion',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/migration-wizard/copilot/migration-handlers.ts',
  },

  MIGRATION_FEEDBACK_PRAISE: {
    name: ACTION_NAMES.MIGRATION_FEEDBACK_PRAISE,
    key: 'MIGRATION_FEEDBACK_PRAISE',
    module: 'migration',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.migration.feedback.givePraise.description',
    fallbackDescription: 'Record positive feedback about the Migration Wizard',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.migration.feedback.givePraise.params.title',
        fallbackDescription: 'What was good',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        i18nDescPath:
          'copilot:actions.migration.feedback.givePraise.params.description',
        fallbackDescription: 'More details about what worked well',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/migration-wizard/copilot/migration-handlers.ts',
  },

  // =========================================================================
  // DOWNSTREAM WIZARD - Step 1: TO DO
  // =========================================================================

  DOWNSTREAM_STEP1_SUGGEST_FEATURE_NAME: {
    name: ACTION_NAMES.DOWNSTREAM_STEP1_SUGGEST_FEATURE_NAME,
    key: 'DOWNSTREAM_STEP1_SUGGEST_FEATURE_NAME',
    module: 'downstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step1_suggestFeatureName.description',
    fallbackDescription: 'Suggest a name for the Downstream Feature',
    parameters: [
      {
        name: 'suggestion',
        type: 'string',
        required: true,
        fallbackDescription: 'The suggested feature name',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this name is appropriate',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP1_SUGGEST_DESCRIPTION: {
    name: ACTION_NAMES.DOWNSTREAM_STEP1_SUGGEST_DESCRIPTION,
    key: 'DOWNSTREAM_STEP1_SUGGEST_DESCRIPTION',
    module: 'downstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step1_suggestDescription.description',
    fallbackDescription: 'Suggest a detailed description for the feature',
    parameters: [
      {
        name: 'description',
        type: 'string',
        required: true,
        fallbackDescription: 'The suggested feature description',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this description is comprehensive',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP1_SUGGEST_TARGET_QUARTER: {
    name: ACTION_NAMES.DOWNSTREAM_STEP1_SUGGEST_TARGET_QUARTER,
    key: 'DOWNSTREAM_STEP1_SUGGEST_TARGET_QUARTER',
    module: 'downstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step1_suggestTargetQuarter.description',
    fallbackDescription: 'Suggest a target quarter for delivery',
    parameters: [
      {
        name: 'quarter',
        type: 'string',
        required: true,
        fallbackDescription: 'The target quarter (e.g., Q1 2025)',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this quarter is realistic',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP1_SUGGEST_ASSIGNED_SQUAD: {
    name: ACTION_NAMES.DOWNSTREAM_STEP1_SUGGEST_ASSIGNED_SQUAD,
    key: 'DOWNSTREAM_STEP1_SUGGEST_ASSIGNED_SQUAD',
    module: 'downstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step1_suggestAssignedSquad.description',
    fallbackDescription: 'Suggest a squad and tribe assignment',
    parameters: [
      {
        name: 'squad',
        type: 'string',
        required: true,
        fallbackDescription: 'The suggested squad name',
      },
      {
        name: 'tribe',
        type: 'string',
        required: false,
        fallbackDescription: 'The suggested tribe name',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this squad is appropriate',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP1_SUGGEST_ESTIMATED_SPRINTS: {
    name: ACTION_NAMES.DOWNSTREAM_STEP1_SUGGEST_ESTIMATED_SPRINTS,
    key: 'DOWNSTREAM_STEP1_SUGGEST_ESTIMATED_SPRINTS',
    module: 'downstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step1_suggestEstimatedSprints.description',
    fallbackDescription: 'Suggest estimated sprints for feature completion',
    parameters: [
      {
        name: 'sprints',
        type: 'number',
        required: true,
        fallbackDescription: 'Estimated number of sprints',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Explanation of the estimation',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP1_SUGGEST_PLANNING_NOTES: {
    name: ACTION_NAMES.DOWNSTREAM_STEP1_SUGGEST_PLANNING_NOTES,
    key: 'DOWNSTREAM_STEP1_SUGGEST_PLANNING_NOTES',
    module: 'downstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step1_suggestPlanningNotes.description',
    fallbackDescription: 'Suggest planning notes for backlog management',
    parameters: [
      {
        name: 'notes',
        type: 'string',
        required: true,
        fallbackDescription: 'Planning notes',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these notes are important',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP1_SUGGEST_PRIORITY: {
    name: ACTION_NAMES.DOWNSTREAM_STEP1_SUGGEST_PRIORITY,
    key: 'DOWNSTREAM_STEP1_SUGGEST_PRIORITY',
    module: 'downstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step1_suggestPriority.description',
    fallbackDescription: 'Suggest MoSCoW priority for the feature',
    parameters: [
      {
        name: 'priority',
        type: 'string',
        required: true,
        enum: ['must', 'should', 'could', 'wont'],
        fallbackDescription: 'The suggested priority level',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this priority is appropriate',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  // =========================================================================
  // DOWNSTREAM WIZARD - Step 2: IN REFINEMENT
  // =========================================================================

  DOWNSTREAM_STEP2_SUGGEST_BUSINESS_REFINEMENT: {
    name: ACTION_NAMES.DOWNSTREAM_STEP2_SUGGEST_BUSINESS_REFINEMENT,
    key: 'DOWNSTREAM_STEP2_SUGGEST_BUSINESS_REFINEMENT',
    module: 'downstream',
    step: 2,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step2_suggestBusinessRefinement.description',
    fallbackDescription: 'Suggest business refinement text',
    parameters: [
      {
        name: 'refinement',
        type: 'string',
        required: true,
        fallbackDescription: 'Business refinement text',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this refinement is comprehensive',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP2_SUGGEST_FUNCTIONAL_REQUIREMENT: {
    name: ACTION_NAMES.DOWNSTREAM_STEP2_SUGGEST_FUNCTIONAL_REQUIREMENT,
    key: 'DOWNSTREAM_STEP2_SUGGEST_FUNCTIONAL_REQUIREMENT',
    module: 'downstream',
    step: 2,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step2_suggestFunctionalRequirement.description',
    fallbackDescription: 'Add functional requirement',
    parameters: [
      {
        name: 'description',
        type: 'string',
        required: true,
        fallbackDescription: 'Requirement description',
      },
      {
        name: 'priority',
        type: 'string',
        required: true,
        enum: ['high', 'medium', 'low'],
        fallbackDescription: 'Priority level',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this requirement is necessary',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP2_SUGGEST_NON_FUNCTIONAL_REQUIREMENT: {
    name: ACTION_NAMES.DOWNSTREAM_STEP2_SUGGEST_NON_FUNCTIONAL_REQUIREMENT,
    key: 'DOWNSTREAM_STEP2_SUGGEST_NON_FUNCTIONAL_REQUIREMENT',
    module: 'downstream',
    step: 2,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step2_suggestNonFunctionalRequirement.description',
    fallbackDescription: 'Add non-functional requirement',
    parameters: [
      {
        name: 'type',
        type: 'string',
        required: true,
        enum: [
          'performance',
          'security',
          'scalability',
          'availability',
          'reliability',
          'maintainability',
          'usability',
          'other',
        ],
        fallbackDescription: 'Type of NFR',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        fallbackDescription: 'Requirement description',
      },
      {
        name: 'acceptanceCriteria',
        type: 'string',
        required: true,
        fallbackDescription: 'Measurable acceptance criteria',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this requirement is important',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP2_SUGGEST_ANALYTICAL_IMPACT: {
    name: ACTION_NAMES.DOWNSTREAM_STEP2_SUGGEST_ANALYTICAL_IMPACT,
    key: 'DOWNSTREAM_STEP2_SUGGEST_ANALYTICAL_IMPACT',
    module: 'downstream',
    step: 2,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step2_suggestAnalyticalImpact.description',
    fallbackDescription: 'Analyze analytical/data impact',
    parameters: [
      {
        name: 'hasImpact',
        type: 'boolean',
        required: true,
        fallbackDescription: 'Whether feature has analytical impact',
      },
      {
        name: 'details',
        type: 'string',
        required: false,
        fallbackDescription: 'Details about the analytical impact',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this assessment is accurate',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP2_SUGGEST_SENSITIVE_DATA_HANDLING: {
    name: ACTION_NAMES.DOWNSTREAM_STEP2_SUGGEST_SENSITIVE_DATA_HANDLING,
    key: 'DOWNSTREAM_STEP2_SUGGEST_SENSITIVE_DATA_HANDLING',
    module: 'downstream',
    step: 2,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step2_suggestSensitiveDataHandling.description',
    fallbackDescription: 'Analyze sensitive data handling',
    parameters: [
      {
        name: 'handlesSensitiveData',
        type: 'boolean',
        required: true,
        fallbackDescription: 'Whether feature handles sensitive data',
      },
      {
        name: 'details',
        type: 'string',
        required: false,
        fallbackDescription: 'Details about data types and handling',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this assessment is accurate',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  // =========================================================================
  // DOWNSTREAM WIZARD - Step 3: SOLUTION DESIGN
  // =========================================================================

  DOWNSTREAM_STEP3_SUGGEST_TECHNICAL_SOLUTION: {
    name: ACTION_NAMES.DOWNSTREAM_STEP3_SUGGEST_TECHNICAL_SOLUTION,
    key: 'DOWNSTREAM_STEP3_SUGGEST_TECHNICAL_SOLUTION',
    module: 'downstream',
    step: 3,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step3_suggestTechnicalSolution.description',
    fallbackDescription: 'Suggest technical solution diagram in Mermaid format',
    parameters: [
      {
        name: 'mermaidDiagram',
        type: 'string',
        required: true,
        fallbackDescription: 'Mermaid diagram code',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this solution approach',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP3_SUGGEST_DAP_LINK: {
    name: ACTION_NAMES.DOWNSTREAM_STEP3_SUGGEST_DAP_LINK,
    key: 'DOWNSTREAM_STEP3_SUGGEST_DAP_LINK',
    module: 'downstream',
    step: 3,
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.downstream.step3_suggestDapLink.description',
    fallbackDescription: 'Suggest DAP document link',
    parameters: [
      {
        name: 'dapLink',
        type: 'string',
        required: true,
        fallbackDescription: 'URL for DAP document',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this document is relevant',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP3_SUGGEST_SECURITY_ANALYSIS: {
    name: ACTION_NAMES.DOWNSTREAM_STEP3_SUGGEST_SECURITY_ANALYSIS,
    key: 'DOWNSTREAM_STEP3_SUGGEST_SECURITY_ANALYSIS',
    module: 'downstream',
    step: 3,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step3_suggestSecurityAnalysis.description',
    fallbackDescription: 'Suggest security analysis',
    parameters: [
      {
        name: 'analysis',
        type: 'string',
        required: true,
        fallbackDescription: 'Comprehensive security analysis',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these security concerns matter',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP3_SUGGEST_SECURITY_ITEM: {
    name: ACTION_NAMES.DOWNSTREAM_STEP3_SUGGEST_SECURITY_ITEM,
    key: 'DOWNSTREAM_STEP3_SUGGEST_SECURITY_ITEM',
    module: 'downstream',
    step: 3,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step3_suggestSecurityItem.description',
    fallbackDescription: 'Suggest security item to track',
    parameters: [
      {
        name: 'description',
        type: 'string',
        required: true,
        fallbackDescription: 'Security concern description',
      },
      {
        name: 'severity',
        type: 'string',
        required: true,
        enum: ['low', 'medium', 'high', 'critical'],
        fallbackDescription: 'Severity level',
      },
      {
        name: 'mitigation',
        type: 'string',
        required: false,
        fallbackDescription: 'Suggested mitigation',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this is a concern',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP3_SUGGEST_ARCHITECTURE_NOTES: {
    name: ACTION_NAMES.DOWNSTREAM_STEP3_SUGGEST_ARCHITECTURE_NOTES,
    key: 'DOWNSTREAM_STEP3_SUGGEST_ARCHITECTURE_NOTES',
    module: 'downstream',
    step: 3,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step3_suggestArchitectureNotes.description',
    fallbackDescription: 'Suggest architecture forum notes',
    parameters: [
      {
        name: 'notes',
        type: 'string',
        required: true,
        fallbackDescription: 'Notes for architecture forum',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Key decisions and trade-offs',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP3_SUGGEST_FEDERATION_NOTES: {
    name: ACTION_NAMES.DOWNSTREAM_STEP3_SUGGEST_FEDERATION_NOTES,
    key: 'DOWNSTREAM_STEP3_SUGGEST_FEDERATION_NOTES',
    module: 'downstream',
    step: 3,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step3_suggestFederationNotes.description',
    fallbackDescription: 'Suggest federation review notes',
    parameters: [
      {
        name: 'notes',
        type: 'string',
        required: true,
        fallbackDescription: 'Notes for federation review',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Cross-team impacts',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  // =========================================================================
  // DOWNSTREAM WIZARD - Step 4: IN PROGRESS
  // =========================================================================

  DOWNSTREAM_STEP4_SUGGEST_STORY: {
    name: ACTION_NAMES.DOWNSTREAM_STEP4_SUGGEST_STORY,
    key: 'DOWNSTREAM_STEP4_SUGGEST_STORY',
    module: 'downstream',
    step: 4,
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.downstream.step4_suggestStory.description',
    fallbackDescription: 'Suggest a user story',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        fallbackDescription: 'Story title',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        fallbackDescription: 'Story description',
      },
      {
        name: 'acceptanceCriteria',
        type: 'string[]',
        required: true,
        fallbackDescription: 'Acceptance criteria',
      },
      {
        name: 'storyPoints',
        type: 'number',
        required: false,
        fallbackDescription: 'Estimated story points',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP4_SUGGEST_TASK: {
    name: ACTION_NAMES.DOWNSTREAM_STEP4_SUGGEST_TASK,
    key: 'DOWNSTREAM_STEP4_SUGGEST_TASK',
    module: 'downstream',
    step: 4,
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.downstream.step4_suggestTask.description',
    fallbackDescription: 'Suggest a task',
    parameters: [
      {
        name: 'type',
        type: 'string',
        required: true,
        enum: ['development', 'test', 'documentation', 'bug', 'spike'],
        fallbackDescription: 'Task type',
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        fallbackDescription: 'Task title',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        fallbackDescription: 'Task description',
      },
      {
        name: 'estimatedHours',
        type: 'number',
        required: false,
        fallbackDescription: 'Estimated hours',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP4_SUGGEST_APPSEC_NOTES: {
    name: ACTION_NAMES.DOWNSTREAM_STEP4_SUGGEST_APPSEC_NOTES,
    key: 'DOWNSTREAM_STEP4_SUGGEST_APPSEC_NOTES',
    module: 'downstream',
    step: 4,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step4_suggestAppSecNotes.description',
    fallbackDescription: 'Suggest AppSec notes',
    parameters: [
      {
        name: 'notes',
        type: 'string',
        required: true,
        fallbackDescription: 'AppSec process notes',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP4_SUGGEST_EHT_NOTES: {
    name: ACTION_NAMES.DOWNSTREAM_STEP4_SUGGEST_EHT_NOTES,
    key: 'DOWNSTREAM_STEP4_SUGGEST_EHT_NOTES',
    module: 'downstream',
    step: 4,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step4_suggestEHTNotes.description',
    fallbackDescription: 'Suggest EHT notes',
    parameters: [
      {
        name: 'notes',
        type: 'string',
        required: true,
        fallbackDescription: 'EHT process notes',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP4_SUGGEST_TEST_NOTES: {
    name: ACTION_NAMES.DOWNSTREAM_STEP4_SUGGEST_TEST_NOTES,
    key: 'DOWNSTREAM_STEP4_SUGGEST_TEST_NOTES',
    module: 'downstream',
    step: 4,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step4_suggestTestNotes.description',
    fallbackDescription: 'Suggest test notes',
    parameters: [
      {
        name: 'notes',
        type: 'string',
        required: true,
        fallbackDescription: 'Test execution notes',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP4_SUGGEST_PDI_TASK: {
    name: ACTION_NAMES.DOWNSTREAM_STEP4_SUGGEST_PDI_TASK,
    key: 'DOWNSTREAM_STEP4_SUGGEST_PDI_TASK',
    module: 'downstream',
    step: 4,
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.downstream.step4_suggestPDITask.description',
    fallbackDescription: 'Suggest PDI task',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        fallbackDescription: 'PDI task title',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        fallbackDescription: 'PDI task description',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  // =========================================================================
  // DOWNSTREAM WIZARD - Step 5: IN REVIEW
  // =========================================================================

  DOWNSTREAM_STEP5_SUGGEST_ARCHITECTURAL_NOTES: {
    name: ACTION_NAMES.DOWNSTREAM_STEP5_SUGGEST_ARCHITECTURAL_NOTES,
    key: 'DOWNSTREAM_STEP5_SUGGEST_ARCHITECTURAL_NOTES',
    module: 'downstream',
    step: 5,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step5_suggestArchitecturalNotes.description',
    fallbackDescription: 'Suggest architectural adherence notes',
    parameters: [
      {
        name: 'notes',
        type: 'string',
        required: true,
        fallbackDescription: 'Architectural adherence notes',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP5_SUGGEST_SI_EVIDENCE: {
    name: ACTION_NAMES.DOWNSTREAM_STEP5_SUGGEST_SI_EVIDENCE,
    key: 'DOWNSTREAM_STEP5_SUGGEST_SI_EVIDENCE',
    module: 'downstream',
    step: 5,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step5_suggestSIEvidence.description',
    fallbackDescription: 'Suggest SI requirements evidence',
    parameters: [
      {
        name: 'evidence',
        type: 'string',
        required: true,
        fallbackDescription: 'SI requirements evidence',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP5_SUGGEST_BUSINESS_ACCEPTANCE: {
    name: ACTION_NAMES.DOWNSTREAM_STEP5_SUGGEST_BUSINESS_ACCEPTANCE,
    key: 'DOWNSTREAM_STEP5_SUGGEST_BUSINESS_ACCEPTANCE',
    module: 'downstream',
    step: 5,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step5_suggestBusinessAcceptance.description',
    fallbackDescription: 'Suggest business acceptance status',
    parameters: [
      {
        name: 'accepted',
        type: 'boolean',
        required: true,
        fallbackDescription: 'Whether business accepted',
      },
      {
        name: 'acceptedBy',
        type: 'string',
        required: false,
        fallbackDescription: 'Who accepted',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP5_SUGGEST_REVIEW_NOTES: {
    name: ACTION_NAMES.DOWNSTREAM_STEP5_SUGGEST_REVIEW_NOTES,
    key: 'DOWNSTREAM_STEP5_SUGGEST_REVIEW_NOTES',
    module: 'downstream',
    step: 5,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step5_suggestReviewNotes.description',
    fallbackDescription: 'Suggest review notes',
    parameters: [
      {
        name: 'notes',
        type: 'string',
        required: true,
        fallbackDescription: 'Review notes',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  // =========================================================================
  // DOWNSTREAM WIZARD - Step 6: DONE
  // =========================================================================

  DOWNSTREAM_STEP6_SUGGEST_RELEASE_NOTES: {
    name: ACTION_NAMES.DOWNSTREAM_STEP6_SUGGEST_RELEASE_NOTES,
    key: 'DOWNSTREAM_STEP6_SUGGEST_RELEASE_NOTES',
    module: 'downstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step6_suggestReleaseNotes.description',
    fallbackDescription: 'Suggest release notes',
    parameters: [
      {
        name: 'releaseNotes',
        type: 'string',
        required: true,
        fallbackDescription: 'Release notes',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP6_SUGGEST_RELEASE_VERSION: {
    name: ACTION_NAMES.DOWNSTREAM_STEP6_SUGGEST_RELEASE_VERSION,
    key: 'DOWNSTREAM_STEP6_SUGGEST_RELEASE_VERSION',
    module: 'downstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step6_suggestReleaseVersion.description',
    fallbackDescription: 'Suggest release version',
    parameters: [
      {
        name: 'version',
        type: 'string',
        required: true,
        fallbackDescription: 'Release version (semver)',
      },
      {
        name: 'releaseDate',
        type: 'string',
        required: false,
        fallbackDescription: 'Release date',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP6_SUGGEST_CELEBRATION_NOTES: {
    name: ACTION_NAMES.DOWNSTREAM_STEP6_SUGGEST_CELEBRATION_NOTES,
    key: 'DOWNSTREAM_STEP6_SUGGEST_CELEBRATION_NOTES',
    module: 'downstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step6_suggestCelebrationNotes.description',
    fallbackDescription: 'Suggest celebration notes',
    parameters: [
      {
        name: 'notes',
        type: 'string',
        required: true,
        fallbackDescription: 'Celebration/announcement notes',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP6_SUGGEST_LESSONS_LEARNED: {
    name: ACTION_NAMES.DOWNSTREAM_STEP6_SUGGEST_LESSONS_LEARNED,
    key: 'DOWNSTREAM_STEP6_SUGGEST_LESSONS_LEARNED',
    module: 'downstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step6_suggestLessonsLearned.description',
    fallbackDescription: 'Suggest lessons learned',
    parameters: [
      {
        name: 'lessons',
        type: 'string',
        required: true,
        fallbackDescription: 'Lessons learned',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP6_SUGGEST_PRODUCTION_URL: {
    name: ACTION_NAMES.DOWNSTREAM_STEP6_SUGGEST_PRODUCTION_URL,
    key: 'DOWNSTREAM_STEP6_SUGGEST_PRODUCTION_URL',
    module: 'downstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step6_suggestProductionUrl.description',
    fallbackDescription: 'Suggest production URL',
    parameters: [
      {
        name: 'url',
        type: 'string',
        required: true,
        fallbackDescription: 'Production URL',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_STEP6_SUGGEST_JIRA_LINK: {
    name: ACTION_NAMES.DOWNSTREAM_STEP6_SUGGEST_JIRA_LINK,
    key: 'DOWNSTREAM_STEP6_SUGGEST_JIRA_LINK',
    module: 'downstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.downstream.step6_suggestJiraLink.description',
    fallbackDescription: 'Suggest Jira link',
    parameters: [
      {
        name: 'jiraLink',
        type: 'string',
        required: true,
        fallbackDescription: 'Jira epic/feature link',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  // =========================================================================
  // DOWNSTREAM WIZARD - MCP Integration
  // =========================================================================

  DOWNSTREAM_SEARCH_ARTIFACTS_IN_NAMESPACE: {
    name: ACTION_NAMES.DOWNSTREAM_SEARCH_ARTIFACTS_IN_NAMESPACE,
    key: 'DOWNSTREAM_SEARCH_ARTIFACTS_IN_NAMESPACE',
    module: 'downstream',
    category: 'mcp',
    i18nDescPath:
      'copilot:actions.downstream.searchArtifactsInNamespace.description',
    fallbackDescription: 'Search artifacts in namespace',
    parameters: [
      {
        name: 'query',
        type: 'string',
        required: true,
        fallbackDescription: 'Search query',
      },
      {
        name: 'filters',
        type: 'object',
        required: false,
        fallbackDescription: 'Search filters',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_LIST_AVAILABLE_ARTIFACTS: {
    name: ACTION_NAMES.DOWNSTREAM_LIST_AVAILABLE_ARTIFACTS,
    key: 'DOWNSTREAM_LIST_AVAILABLE_ARTIFACTS',
    module: 'downstream',
    category: 'mcp',
    i18nDescPath:
      'copilot:actions.downstream.listAvailableArtifacts.description',
    fallbackDescription: 'List available artifacts',
    parameters: [
      {
        name: 'type',
        type: 'string',
        required: false,
        fallbackDescription: 'Artifact type filter',
      },
      {
        name: 'tags',
        type: 'string[]',
        required: false,
        fallbackDescription: 'Tag filters',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_GET_ARTIFACT_DETAILS: {
    name: ACTION_NAMES.DOWNSTREAM_GET_ARTIFACT_DETAILS,
    key: 'DOWNSTREAM_GET_ARTIFACT_DETAILS',
    module: 'downstream',
    category: 'mcp',
    i18nDescPath: 'copilot:actions.downstream.getArtifactDetails.description',
    fallbackDescription: 'Get artifact details',
    parameters: [
      {
        name: 'artifactId',
        type: 'string',
        required: true,
        fallbackDescription: 'Artifact ID',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_CREATE_ARTIFACT_FOR_FEATURE: {
    name: ACTION_NAMES.DOWNSTREAM_CREATE_ARTIFACT_FOR_FEATURE,
    key: 'DOWNSTREAM_CREATE_ARTIFACT_FOR_FEATURE',
    module: 'downstream',
    category: 'mcp',
    i18nDescPath:
      'copilot:actions.downstream.createArtifactForFeature.description',
    fallbackDescription: 'Create artifact for feature',
    parameters: [
      {
        name: 'key',
        type: 'string',
        required: true,
        fallbackDescription: 'Artifact key',
      },
      {
        name: 'value',
        type: 'string',
        required: true,
        fallbackDescription: 'Artifact value',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        fallbackDescription: 'Artifact description',
      },
      {
        name: 'type',
        type: 'string',
        required: true,
        fallbackDescription: 'Artifact type',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_EXECUTE_UTILITY_AGENT: {
    name: ACTION_NAMES.DOWNSTREAM_EXECUTE_UTILITY_AGENT,
    key: 'DOWNSTREAM_EXECUTE_UTILITY_AGENT',
    module: 'downstream',
    category: 'mcp',
    i18nDescPath: 'copilot:actions.downstream.executeUtilityAgent.description',
    fallbackDescription: 'Execute utility agent',
    parameters: [
      {
        name: 'agentName',
        type: 'string',
        required: true,
        fallbackDescription: 'Agent name',
      },
      {
        name: 'input',
        type: 'string',
        required: true,
        fallbackDescription: 'Agent input',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  DOWNSTREAM_FETCH_UPSTREAM_ARTIFACTS: {
    name: ACTION_NAMES.DOWNSTREAM_FETCH_UPSTREAM_ARTIFACTS,
    key: 'DOWNSTREAM_FETCH_UPSTREAM_ARTIFACTS',
    module: 'downstream',
    category: 'mcp',
    i18nDescPath:
      'copilot:actions.downstream.fetchUpstreamArtifacts.description',
    fallbackDescription: 'Fetch artifacts from parent Business Epic',
    parameters: [
      {
        name: 'businessEpicId',
        type: 'string',
        required: true,
        fallbackDescription: 'Business Epic ID',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/downstream/copilot/downstream-handlers.ts',
  },

  // =========================================================================
  // UPSTREAM WIZARD - Step 1: Ideação (Ideation)
  // =========================================================================

  UPSTREAM_STEP1_SUGGEST_NAME: {
    name: ACTION_NAMES.UPSTREAM_STEP1_SUGGEST_NAME,
    key: 'UPSTREAM_STEP1_SUGGEST_NAME',
    module: 'upstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step1_suggestMacroInitiativeName.description',
    fallbackDescription:
      'STEP 1 ONLY - Suggest a name for the Macro Initiative (Macroiniciativa)',
    parameters: [
      {
        name: 'suggestion',
        type: 'string',
        required: true,
        fallbackDescription: 'The suggested Macro Initiative name',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this name is appropriate',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP1_SUGGEST_DESCRIPTION: {
    name: ACTION_NAMES.UPSTREAM_STEP1_SUGGEST_DESCRIPTION,
    key: 'UPSTREAM_STEP1_SUGGEST_DESCRIPTION',
    module: 'upstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step1_suggestDescription.description',
    fallbackDescription:
      'STEP 1 ONLY - Suggest a detailed description for the Macro Initiative',
    parameters: [
      {
        name: 'description',
        type: 'string',
        required: true,
        fallbackDescription: 'The suggested description',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this description is comprehensive',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP1_SUGGEST_INITIAL_BUSINESS_VALUE: {
    name: ACTION_NAMES.UPSTREAM_STEP1_SUGGEST_INITIAL_BUSINESS_VALUE,
    key: 'UPSTREAM_STEP1_SUGGEST_INITIAL_BUSINESS_VALUE',
    module: 'upstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step1_suggestInitialBusinessValue.description',
    fallbackDescription:
      'STEP 1 ONLY - Suggest initial business value estimation (0-100 score)',
    parameters: [
      {
        name: 'value',
        type: 'number',
        required: true,
        fallbackDescription: 'Suggested initial business value (0-100)',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Explanation of value calculation',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP1_SUGGEST_LINKED_OKRS: {
    name: ACTION_NAMES.UPSTREAM_STEP1_SUGGEST_LINKED_OKRS,
    key: 'UPSTREAM_STEP1_SUGGEST_LINKED_OKRS',
    module: 'upstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step1_suggestLinkedOKRs.description',
    fallbackDescription:
      'STEP 1 ONLY - Suggest OKRs to link with this Macro Initiative',
    parameters: [
      {
        name: 'okrs',
        type: 'string[]',
        required: true,
        fallbackDescription: 'Array of OKR descriptions',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these OKRs are relevant',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP1_SUGGEST_PROBLEM_STATEMENT: {
    name: ACTION_NAMES.UPSTREAM_STEP1_SUGGEST_PROBLEM_STATEMENT,
    key: 'UPSTREAM_STEP1_SUGGEST_PROBLEM_STATEMENT',
    module: 'upstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step1_suggestProblemStatement.description',
    fallbackDescription:
      'STEP 1 ONLY - Suggest a clear problem statement for the Macro Initiative',
    parameters: [
      {
        name: 'problemStatement',
        type: 'string',
        required: true,
        fallbackDescription: 'A clear problem statement',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this problem statement is relevant',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP1_SUGGEST_HYPOTHESIS: {
    name: ACTION_NAMES.UPSTREAM_STEP1_SUGGEST_HYPOTHESIS,
    key: 'UPSTREAM_STEP1_SUGGEST_HYPOTHESIS',
    module: 'upstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step1_suggestHypothesis.description',
    fallbackDescription:
      'STEP 1 ONLY - Suggest and ADD a single hypothesis to the Macro Initiative',
    parameters: [
      {
        name: 'hypothesisStatement',
        type: 'string',
        required: true,
        fallbackDescription: 'The hypothesis statement',
      },
      {
        name: 'hypothesisType',
        type: 'string',
        required: true,
        enum: ['value', 'usability', 'feasibility', 'viability'],
        fallbackDescription: 'Type of hypothesis',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this hypothesis should be validated',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP1_SUGGEST_STRATEGIC_ALIGNMENT: {
    name: ACTION_NAMES.UPSTREAM_STEP1_SUGGEST_STRATEGIC_ALIGNMENT,
    key: 'UPSTREAM_STEP1_SUGGEST_STRATEGIC_ALIGNMENT',
    module: 'upstream',
    step: 1,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step1_suggestStrategicAlignment.description',
    fallbackDescription:
      'STEP 1 ONLY - Suggest how this Macro Initiative aligns with organizational strategy',
    parameters: [
      {
        name: 'strategicAlignment',
        type: 'string',
        required: true,
        fallbackDescription: 'Strategic alignment explanation',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this alignment is relevant',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  // =========================================================================
  // UPSTREAM WIZARD - Step 2: Imersão (Immersion)
  // =========================================================================

  UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_CSD: {
    name: ACTION_NAMES.UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_CSD,
    key: 'UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_CSD',
    module: 'upstream',
    step: 2,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step2_hypothesis_suggestCSD.description',
    fallbackDescription:
      'STEP 2 ONLY - Suggest CSD Matrix (Certainties, Suppositions, Doubts) for the SELECTED hypothesis',
    parameters: [
      {
        name: 'certezas',
        type: 'string[]',
        required: false,
        fallbackDescription: 'Array of certainties',
      },
      {
        name: 'suposicoes',
        type: 'string[]',
        required: false,
        fallbackDescription: 'Array of assumptions',
      },
      {
        name: 'duvidas',
        type: 'string[]',
        required: false,
        fallbackDescription: 'Array of doubts/questions',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these CSD items are important',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_STAKEHOLDERS: {
    name: ACTION_NAMES.UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_STAKEHOLDERS,
    key: 'UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_STAKEHOLDERS',
    module: 'upstream',
    step: 2,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step2_hypothesis_suggestStakeholders.description',
    fallbackDescription:
      'STEP 2 ONLY - Suggest stakeholders relevant to the SELECTED hypothesis',
    parameters: [
      {
        name: 'stakeholders',
        type: 'object',
        required: true,
        fallbackDescription: 'Array of stakeholder objects',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these stakeholders are important',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_OPPORTUNITY_TREE: {
    name: ACTION_NAMES.UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_OPPORTUNITY_TREE,
    key: 'UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_OPPORTUNITY_TREE',
    module: 'upstream',
    step: 2,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step2_hypothesis_suggestOpportunityTree.description',
    fallbackDescription:
      'STEP 2 ONLY - Suggest opportunities for the Opportunity Tree of the SELECTED hypothesis',
    parameters: [
      {
        name: 'opportunities',
        type: 'string[]',
        required: true,
        fallbackDescription: 'Array of business opportunities',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these opportunities are relevant',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_RISKS: {
    name: ACTION_NAMES.UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_RISKS,
    key: 'UPSTREAM_STEP2_HYPOTHESIS_SUGGEST_RISKS',
    module: 'upstream',
    step: 2,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step2_hypothesis_suggestRisks.description',
    fallbackDescription:
      'STEP 2 ONLY - Suggest initial risks for the SELECTED hypothesis',
    parameters: [
      {
        name: 'risks',
        type: 'string[]',
        required: true,
        fallbackDescription: 'Array of potential risks',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these risks should be considered',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP2_SUGGEST_MAIN_PROBLEMS: {
    name: ACTION_NAMES.UPSTREAM_STEP2_SUGGEST_MAIN_PROBLEMS,
    key: 'UPSTREAM_STEP2_SUGGEST_MAIN_PROBLEMS',
    module: 'upstream',
    step: 2,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step2_suggestMainProblems.description',
    fallbackDescription:
      'STEP 2 ONLY - Suggest main problems to solve (Macro Initiative level)',
    parameters: [
      {
        name: 'problems',
        type: 'string[]',
        required: true,
        fallbackDescription: 'Array of main problems',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these problems are important',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  // =========================================================================
  // UPSTREAM WIZARD - Step 3: Validação (Validation)
  // =========================================================================

  UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_VALIDATION_METHOD: {
    name: ACTION_NAMES.UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_VALIDATION_METHOD,
    key: 'UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_VALIDATION_METHOD',
    module: 'upstream',
    step: 3,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step3_hypothesis_suggestValidationMethod.description',
    fallbackDescription:
      'STEP 3 ONLY - Suggest a validation method for the SELECTED hypothesis',
    parameters: [
      {
        name: 'method',
        type: 'string',
        required: true,
        fallbackDescription: 'The validation method to use',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this validation method is appropriate',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_VALIDATION_RESULTS: {
    name: ACTION_NAMES.UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_VALIDATION_RESULTS,
    key: 'UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_VALIDATION_RESULTS',
    module: 'upstream',
    step: 3,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step3_hypothesis_suggestValidationResults.description',
    fallbackDescription:
      'STEP 3 ONLY - Suggest validation results for the SELECTED hypothesis',
    parameters: [
      {
        name: 'qualitativeResults',
        type: 'string',
        required: false,
        fallbackDescription: 'Qualitative findings',
      },
      {
        name: 'quantitativeResults',
        type: 'string',
        required: false,
        fallbackDescription: 'Quantitative metrics',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Analysis of results',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_CONCLUSION: {
    name: ACTION_NAMES.UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_CONCLUSION,
    key: 'UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_CONCLUSION',
    module: 'upstream',
    step: 3,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step3_hypothesis_suggestConclusion.description',
    fallbackDescription:
      'STEP 3 ONLY - Suggest a validation conclusion for the SELECTED hypothesis',
    parameters: [
      {
        name: 'conclusion',
        type: 'string',
        required: true,
        enum: ['validated', 'rejected', 'needs_more_data', 'pivot'],
        fallbackDescription: 'The validation conclusion',
      },
      {
        name: 'evidenceLevel',
        type: 'string',
        required: true,
        enum: ['weak', 'medium', 'strong'],
        fallbackDescription: 'Strength of evidence',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Justification for conclusion',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_DATA_SOURCES: {
    name: ACTION_NAMES.UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_DATA_SOURCES,
    key: 'UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_DATA_SOURCES',
    module: 'upstream',
    step: 3,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step3_hypothesis_suggestDataSources.description',
    fallbackDescription:
      'STEP 3 ONLY - Suggest data sources to validate the SELECTED hypothesis',
    parameters: [
      {
        name: 'qualitativeDataSources',
        type: 'object',
        required: true,
        fallbackDescription: 'Qualitative data sources',
      },
      {
        name: 'quantitativeDataSources',
        type: 'object',
        required: true,
        fallbackDescription: 'Quantitative data sources',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these data sources are appropriate',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_EVIDENCE: {
    name: ACTION_NAMES.UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_EVIDENCE,
    key: 'UPSTREAM_STEP3_HYPOTHESIS_SUGGEST_EVIDENCE',
    module: 'upstream',
    step: 3,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step3_hypothesis_suggestEvidence.description',
    fallbackDescription:
      'STEP 3 ONLY - Suggest evidence items for the SELECTED hypothesis validation',
    parameters: [
      {
        name: 'evidenceItems',
        type: 'object',
        required: true,
        fallbackDescription: 'Array of evidence items',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these evidence items are relevant',
      },
    ],
    hasRender: true,
    isHITL: true,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  // =========================================================================
  // UPSTREAM WIZARD - STEP 4: EXPLORATION
  // =========================================================================

  UPSTREAM_STEP4_SUGGEST_MACRO_REQUIREMENTS: {
    name: ACTION_NAMES.UPSTREAM_STEP4_SUGGEST_MACRO_REQUIREMENTS,
    key: 'UPSTREAM_STEP4_SUGGEST_MACRO_REQUIREMENTS',
    module: 'upstream',
    step: 4,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step4_suggestMacroRequirements.description',
    fallbackDescription:
      'STEP 4 ONLY - Suggest macro requirements for the initiative',
    parameters: [
      {
        name: 'macroRequirements',
        type: 'object',
        required: true,
        fallbackDescription: 'Array of macro requirement objects',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these requirements are recommended',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP4_SUGGEST_ACTOR_MAPPING: {
    name: ACTION_NAMES.UPSTREAM_STEP4_SUGGEST_ACTOR_MAPPING,
    key: 'UPSTREAM_STEP4_SUGGEST_ACTOR_MAPPING',
    module: 'upstream',
    step: 4,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step4_suggestActorMapping.description',
    fallbackDescription:
      'STEP 4 ONLY - Suggest actors with their roles and involvement levels',
    parameters: [
      {
        name: 'actors',
        type: 'object',
        required: true,
        fallbackDescription:
          'Array of actor objects with type, role, department, criticality',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these actors are relevant',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP4_SUGGEST_USABILITY_TEST: {
    name: ACTION_NAMES.UPSTREAM_STEP4_SUGGEST_USABILITY_TEST,
    key: 'UPSTREAM_STEP4_SUGGEST_USABILITY_TEST',
    module: 'upstream',
    step: 4,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step4_suggestUsabilityTest.description',
    fallbackDescription:
      'STEP 4 ONLY - Suggest usability test results and critical issues',
    parameters: [
      {
        name: 'url',
        type: 'string',
        required: false,
        fallbackDescription: 'URL to usability test report',
      },
      {
        name: 'results',
        type: 'string',
        required: false,
        fallbackDescription: 'Summary of test results',
      },
      {
        name: 'criticalIssues',
        type: 'string[]',
        required: false,
        fallbackDescription: 'List of critical issues found',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these test results are important',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP4_SUGGEST_CAPABILITY_ASSESSMENT: {
    name: ACTION_NAMES.UPSTREAM_STEP4_SUGGEST_CAPABILITY_ASSESSMENT,
    key: 'UPSTREAM_STEP4_SUGGEST_CAPABILITY_ASSESSMENT',
    module: 'upstream',
    step: 4,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step4_suggestCapabilityAssessment.description',
    fallbackDescription:
      'STEP 4 ONLY - Suggest capability assessments with current and target levels',
    parameters: [
      {
        name: 'assessments',
        type: 'object',
        required: true,
        fallbackDescription: 'Array of capability assessment objects',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these capability assessments are needed',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP4_SUGGEST_BUSINESS_FLOW_MERMAID: {
    name: ACTION_NAMES.UPSTREAM_STEP4_SUGGEST_BUSINESS_FLOW_MERMAID,
    key: 'UPSTREAM_STEP4_SUGGEST_BUSINESS_FLOW_MERMAID',
    module: 'upstream',
    step: 4,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step4_suggestBusinessFlowMermaid.description',
    fallbackDescription:
      'STEP 4 ONLY - Suggest business flow as Mermaid diagram',
    parameters: [
      {
        name: 'mermaidCode',
        type: 'string',
        required: true,
        fallbackDescription: 'Mermaid diagram code for business flow',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this flow diagram is recommended',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP4_SUGGEST_USER_JOURNEY_MERMAID: {
    name: ACTION_NAMES.UPSTREAM_STEP4_SUGGEST_USER_JOURNEY_MERMAID,
    key: 'UPSTREAM_STEP4_SUGGEST_USER_JOURNEY_MERMAID',
    module: 'upstream',
    step: 4,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step4_suggestUserJourneyMermaid.description',
    fallbackDescription:
      'STEP 4 ONLY - Suggest user journey as Mermaid diagram',
    parameters: [
      {
        name: 'mermaidCode',
        type: 'string',
        required: true,
        fallbackDescription: 'Mermaid diagram code for user journey',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this journey diagram is recommended',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  // =========================================================================
  // UPSTREAM WIZARD - STEP 5: ANALYSIS
  // =========================================================================

  UPSTREAM_STEP5_SUGGEST_BLUEPRINT_URL: {
    name: ACTION_NAMES.UPSTREAM_STEP5_SUGGEST_BLUEPRINT_URL,
    key: 'UPSTREAM_STEP5_SUGGEST_BLUEPRINT_URL',
    module: 'upstream',
    step: 5,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step5_suggestBlueprintUrl.description',
    fallbackDescription:
      'STEP 5 ONLY - Suggest a blueprint URL with type and description',
    parameters: [
      {
        name: 'blueprintUrl',
        type: 'string',
        required: true,
        fallbackDescription: 'URL to the blueprint document',
      },
      {
        name: 'blueprintType',
        type: 'string',
        required: false,
        fallbackDescription: 'Type of blueprint (wireframe, mockup, etc.)',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        fallbackDescription: 'Description of the blueprint',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this blueprint is relevant',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP5_SUGGEST_IMPACT_ANALYSIS: {
    name: ACTION_NAMES.UPSTREAM_STEP5_SUGGEST_IMPACT_ANALYSIS,
    key: 'UPSTREAM_STEP5_SUGGEST_IMPACT_ANALYSIS',
    module: 'upstream',
    step: 5,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step5_suggestImpactAnalysis.description',
    fallbackDescription:
      'STEP 5 ONLY - Suggest impact analysis items with positive/negative impacts',
    parameters: [
      {
        name: 'impacts',
        type: 'object',
        required: true,
        fallbackDescription: 'Array of impact analysis items',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this impact analysis is important',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP5_SUGGEST_GAP_ANALYSIS: {
    name: ACTION_NAMES.UPSTREAM_STEP5_SUGGEST_GAP_ANALYSIS,
    key: 'UPSTREAM_STEP5_SUGGEST_GAP_ANALYSIS',
    module: 'upstream',
    step: 5,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step5_suggestGapAnalysis.description',
    fallbackDescription:
      'STEP 5 ONLY - Suggest gap analysis with current vs desired state',
    parameters: [
      {
        name: 'gaps',
        type: 'object',
        required: true,
        fallbackDescription: 'Array of gap analysis items',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this gap analysis is necessary',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP5_SUGGEST_DEPENDENCIES: {
    name: ACTION_NAMES.UPSTREAM_STEP5_SUGGEST_DEPENDENCIES,
    key: 'UPSTREAM_STEP5_SUGGEST_DEPENDENCIES',
    module: 'upstream',
    step: 5,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step5_suggestDependencies.description',
    fallbackDescription:
      'STEP 5 ONLY - Suggest dependencies (inbound, outbound, bidirectional)',
    parameters: [
      {
        name: 'dependencies',
        type: 'object',
        required: true,
        fallbackDescription: 'Array of dependency objects',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these dependencies are important',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP5_SUGGEST_MITIGATION_PLANS: {
    name: ACTION_NAMES.UPSTREAM_STEP5_SUGGEST_MITIGATION_PLANS,
    key: 'UPSTREAM_STEP5_SUGGEST_MITIGATION_PLANS',
    module: 'upstream',
    step: 5,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step5_suggestMitigationPlans.description',
    fallbackDescription:
      'STEP 5 ONLY - Suggest mitigation plans for identified risks',
    parameters: [
      {
        name: 'mitigations',
        type: 'object',
        required: true,
        fallbackDescription: 'Array of mitigation plan objects',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these mitigation plans are necessary',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP5_SUGGEST_BLUEPRINT_MERMAID: {
    name: ACTION_NAMES.UPSTREAM_STEP5_SUGGEST_BLUEPRINT_MERMAID,
    key: 'UPSTREAM_STEP5_SUGGEST_BLUEPRINT_MERMAID',
    module: 'upstream',
    step: 5,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step5_suggestBlueprintMermaid.description',
    fallbackDescription: 'STEP 5 ONLY - Suggest blueprint as Mermaid diagram',
    parameters: [
      {
        name: 'mermaidCode',
        type: 'string',
        required: true,
        fallbackDescription: 'Mermaid diagram code for blueprint',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this blueprint diagram is recommended',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  // =========================================================================
  // UPSTREAM WIZARD - STEP 6: PRIORITIZATION
  // =========================================================================

  UPSTREAM_STEP6_SUGGEST_FINAL_BUSINESS_VALUE: {
    name: ACTION_NAMES.UPSTREAM_STEP6_SUGGEST_FINAL_BUSINESS_VALUE,
    key: 'UPSTREAM_STEP6_SUGGEST_FINAL_BUSINESS_VALUE',
    module: 'upstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step6_suggestFinalBusinessValue.description',
    fallbackDescription:
      'STEP 6 ONLY - Suggest final business value score (0-100)',
    parameters: [
      {
        name: 'value',
        type: 'number',
        required: true,
        fallbackDescription: 'Business value score (0-100)',
      },
      {
        name: 'breakdown',
        type: 'object',
        required: false,
        fallbackDescription: 'Value breakdown details',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this value score is accurate',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP6_SUGGEST_EFFORT: {
    name: ACTION_NAMES.UPSTREAM_STEP6_SUGGEST_EFFORT,
    key: 'UPSTREAM_STEP6_SUGGEST_EFFORT',
    module: 'upstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.upstream.step6_suggestEffort.description',
    fallbackDescription:
      'STEP 6 ONLY - Suggest effort estimation score (0-100)',
    parameters: [
      {
        name: 'value',
        type: 'number',
        required: true,
        fallbackDescription: 'Effort score (0-100)',
      },
      {
        name: 'breakdown',
        type: 'object',
        required: false,
        fallbackDescription: 'Effort breakdown by dimension',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this effort estimation is accurate',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP6_SUGGEST_RISK_LEVEL: {
    name: ACTION_NAMES.UPSTREAM_STEP6_SUGGEST_RISK_LEVEL,
    key: 'UPSTREAM_STEP6_SUGGEST_RISK_LEVEL',
    module: 'upstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.upstream.step6_suggestRiskLevel.description',
    fallbackDescription:
      'STEP 6 ONLY - Suggest risk level (low, medium, high, critical)',
    parameters: [
      {
        name: 'riskLevel',
        type: 'string',
        required: true,
        fallbackDescription: 'Risk level: low, medium, high, or critical',
      },
      {
        name: 'riskFactors',
        type: 'object',
        required: false,
        fallbackDescription: 'Array of risk factors',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this risk level is appropriate',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP6_SUGGEST_KPIS: {
    name: ACTION_NAMES.UPSTREAM_STEP6_SUGGEST_KPIS,
    key: 'UPSTREAM_STEP6_SUGGEST_KPIS',
    module: 'upstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.upstream.step6_suggestKPIs.description',
    fallbackDescription: 'STEP 6 ONLY - Suggest key performance indicators',
    parameters: [
      {
        name: 'kpis',
        type: 'string[]',
        required: true,
        fallbackDescription: 'Array of KPI names or descriptions',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these KPIs are relevant',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP6_SUGGEST_STRATEGIC_THEME: {
    name: ACTION_NAMES.UPSTREAM_STEP6_SUGGEST_STRATEGIC_THEME,
    key: 'UPSTREAM_STEP6_SUGGEST_STRATEGIC_THEME',
    module: 'upstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step6_suggestStrategicTheme.description',
    fallbackDescription:
      'STEP 6 ONLY - Suggest strategic theme and adherence score',
    parameters: [
      {
        name: 'strategicTheme',
        type: 'string',
        required: true,
        fallbackDescription: 'Strategic theme name',
      },
      {
        name: 'strategicAdherence',
        type: 'number',
        required: false,
        fallbackDescription: 'Adherence score (0-100)',
      },
      {
        name: 'strategicJustification',
        type: 'string',
        required: false,
        fallbackDescription: 'Justification for the theme',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this strategic theme is appropriate',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP6_SUGGEST_VALUE_PLAN: {
    name: ACTION_NAMES.UPSTREAM_STEP6_SUGGEST_VALUE_PLAN,
    key: 'UPSTREAM_STEP6_SUGGEST_VALUE_PLAN',
    module: 'upstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.upstream.step6_suggestValuePlan.description',
    fallbackDescription:
      'STEP 6 ONLY - Suggest value plan with phases and deliverables',
    parameters: [
      {
        name: 'phases',
        type: 'object',
        required: true,
        fallbackDescription: 'Array of phase objects with deliverables',
      },
      {
        name: 'totalDuration',
        type: 'string',
        required: false,
        fallbackDescription: 'Total duration for all phases',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this value plan is recommended',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP6_SUGGEST_PRELIMINARY_KPIS: {
    name: ACTION_NAMES.UPSTREAM_STEP6_SUGGEST_PRELIMINARY_KPIS,
    key: 'UPSTREAM_STEP6_SUGGEST_PRELIMINARY_KPIS',
    module: 'upstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step6_suggestPreliminaryKPIs.description',
    fallbackDescription:
      'STEP 6 ONLY - Suggest preliminary KPIs with targets and baselines',
    parameters: [
      {
        name: 'kpis',
        type: 'object',
        required: true,
        fallbackDescription: 'Array of KPI objects with targets and baselines',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why these KPIs are preliminary indicators',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP6_SUGGEST_QBR_MEMO: {
    name: ACTION_NAMES.UPSTREAM_STEP6_SUGGEST_QBR_MEMO,
    key: 'UPSTREAM_STEP6_SUGGEST_QBR_MEMO',
    module: 'upstream',
    step: 6,
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.upstream.step6_suggestQBRMemo.description',
    fallbackDescription:
      'STEP 6 ONLY - Suggest QBR memo with executive summary and business case',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: false,
        fallbackDescription: 'QBR memo title',
      },
      {
        name: 'executiveSummary',
        type: 'string',
        required: false,
        fallbackDescription: 'Executive summary',
      },
      {
        name: 'businessCase',
        type: 'string',
        required: false,
        fallbackDescription: 'Business case description',
      },
      {
        name: 'keyMetrics',
        type: 'object',
        required: false,
        fallbackDescription: 'Array of key metrics',
      },
      {
        name: 'timeline',
        type: 'string',
        required: false,
        fallbackDescription: 'Timeline description',
      },
      {
        name: 'resourcesRequired',
        type: 'string',
        required: false,
        fallbackDescription: 'Resources required',
      },
      {
        name: 'risksAndMitigations',
        type: 'string',
        required: false,
        fallbackDescription: 'Risks and mitigations',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this QBR memo structure is appropriate',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  // =========================================================================
  // UPSTREAM WIZARD - STEP 7: TRANSITION
  // =========================================================================

  UPSTREAM_STEP7_SUGGEST_BUSINESS_EPIC: {
    name: ACTION_NAMES.UPSTREAM_STEP7_SUGGEST_BUSINESS_EPIC,
    key: 'UPSTREAM_STEP7_SUGGEST_BUSINESS_EPIC',
    module: 'upstream',
    step: 7,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step7_suggestBusinessEpic.description',
    fallbackDescription:
      'STEP 7 ONLY - Suggest a complete Business Epic with features',
    parameters: [
      {
        name: 'name',
        type: 'string',
        required: true,
        fallbackDescription: 'Business Epic name',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        fallbackDescription: 'Business Epic description',
      },
      {
        name: 'scope',
        type: 'string',
        required: true,
        fallbackDescription: 'Scope of the Business Epic',
      },
      {
        name: 'targetSquad',
        type: 'string',
        required: true,
        fallbackDescription: 'Target squad for execution',
      },
      {
        name: 'targetTribe',
        type: 'string',
        required: true,
        fallbackDescription: 'Target tribe for execution',
      },
      {
        name: 'features',
        type: 'object',
        required: true,
        fallbackDescription: 'Array of feature objects',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this Business Epic structure is recommended',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP7_SUGGEST_FEATURE: {
    name: ACTION_NAMES.UPSTREAM_STEP7_SUGGEST_FEATURE,
    key: 'UPSTREAM_STEP7_SUGGEST_FEATURE',
    module: 'upstream',
    step: 7,
    category: 'suggestion',
    i18nDescPath: 'copilot:actions.upstream.step7_suggestFeature.description',
    fallbackDescription:
      'STEP 7 ONLY - Suggest a feature for the SELECTED Business Epic',
    parameters: [
      {
        name: 'name',
        type: 'string',
        required: true,
        fallbackDescription: 'Feature name',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        fallbackDescription: 'Feature description',
      },
      {
        name: 'priority',
        type: 'string',
        required: true,
        fallbackDescription: 'MoSCoW priority: must, should, could, wont',
      },
      {
        name: 'acceptanceCriteria',
        type: 'string[]',
        required: true,
        fallbackDescription: 'Acceptance criteria for the feature',
      },
      {
        name: 'estimatedSprints',
        type: 'number',
        required: false,
        fallbackDescription: 'Estimated sprints to complete',
      },
      {
        name: 'dependencies',
        type: 'string[]',
        required: false,
        fallbackDescription: 'Dependencies on other features or systems',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this feature and priority are recommended',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP7_SUGGEST_TARGET_SQUAD_TRIBE: {
    name: ACTION_NAMES.UPSTREAM_STEP7_SUGGEST_TARGET_SQUAD_TRIBE,
    key: 'UPSTREAM_STEP7_SUGGEST_TARGET_SQUAD_TRIBE',
    module: 'upstream',
    step: 7,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step7_suggestTargetSquadTribe.description',
    fallbackDescription:
      'STEP 7 ONLY - Suggest target squad and tribe for the SELECTED Business Epic',
    parameters: [
      {
        name: 'targetSquad',
        type: 'string',
        required: true,
        fallbackDescription: 'Target squad name for execution',
      },
      {
        name: 'targetTribe',
        type: 'string',
        required: true,
        fallbackDescription: 'Target tribe name for execution',
      },
      {
        name: 'squadCapabilities',
        type: 'string[]',
        required: false,
        fallbackDescription: 'Key capabilities of the squad',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this squad/tribe is the best fit',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP7_UPDATE_TRANSITION_STATUS: {
    name: ACTION_NAMES.UPSTREAM_STEP7_UPDATE_TRANSITION_STATUS,
    key: 'UPSTREAM_STEP7_UPDATE_TRANSITION_STATUS',
    module: 'upstream',
    step: 7,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step7_updateTransitionStatus.description',
    fallbackDescription:
      'STEP 7 ONLY - Update transition status of the SELECTED Business Epic',
    parameters: [
      {
        name: 'status',
        type: 'string',
        required: true,
        fallbackDescription:
          'New transition status: pending, handed_off, or accepted',
      },
      {
        name: 'acceptedBy',
        type: 'string',
        required: false,
        fallbackDescription:
          'Name of person accepting (only for accepted status)',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription: 'Why this status change is appropriate',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP7_SUGGEST_HANDOFF_DOCUMENT: {
    name: ACTION_NAMES.UPSTREAM_STEP7_SUGGEST_HANDOFF_DOCUMENT,
    key: 'UPSTREAM_STEP7_SUGGEST_HANDOFF_DOCUMENT',
    module: 'upstream',
    step: 7,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step7_suggestHandoffDocument.description',
    fallbackDescription:
      'STEP 7 ONLY - Suggest handoff document for transitioning to downstream teams',
    parameters: [
      {
        name: 'context',
        type: 'string',
        required: true,
        fallbackDescription: 'Context and background of the initiative',
      },
      {
        name: 'objectives',
        type: 'string[]',
        required: true,
        fallbackDescription: 'Key objectives to achieve',
      },
      {
        name: 'constraints',
        type: 'string[]',
        required: true,
        fallbackDescription: 'Known constraints and limitations',
      },
      {
        name: 'assumptions',
        type: 'string[]',
        required: true,
        fallbackDescription: 'Key assumptions made during upstream',
      },
      {
        name: 'risks',
        type: 'object',
        required: true,
        fallbackDescription: 'Risks with mitigation strategies',
      },
      {
        name: 'successCriteria',
        type: 'string[]',
        required: true,
        fallbackDescription: 'Success criteria for the initiative',
      },
      {
        name: 'openQuestions',
        type: 'string[]',
        required: false,
        fallbackDescription: 'Open questions for downstream teams',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription:
          'Why this handoff document structure is recommended',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  UPSTREAM_STEP7_SUGGEST_RESPONSIBILITY_AGREEMENT: {
    name: ACTION_NAMES.UPSTREAM_STEP7_SUGGEST_RESPONSIBILITY_AGREEMENT,
    key: 'UPSTREAM_STEP7_SUGGEST_RESPONSIBILITY_AGREEMENT',
    module: 'upstream',
    step: 7,
    category: 'suggestion',
    i18nDescPath:
      'copilot:actions.upstream.step7_suggestResponsibilityAgreement.description',
    fallbackDescription:
      'STEP 7 ONLY - Suggest responsibility agreements between upstream and downstream teams',
    parameters: [
      {
        name: 'agreements',
        type: 'object',
        required: true,
        fallbackDescription: 'Array of responsibility agreement objects',
      },
      {
        name: 'reasoning',
        type: 'string',
        required: true,
        fallbackDescription:
          'Why these responsibility agreements are recommended',
      },
    ],
    hasRender: false,
    isHITL: false,
    sourceFile: 'src/features/upstream/copilot/upstream-handlers.ts',
  },

  // =========================================================================
  // ATLAS SPOTLIGHT - Navigation
  // =========================================================================

  SPOTLIGHT_NAVIGATE_TO_PAGE: {
    name: ACTION_NAMES.SPOTLIGHT_NAVIGATE_TO_PAGE,
    key: 'SPOTLIGHT_NAVIGATE_TO_PAGE',
    module: 'atlas',
    category: 'navigation',
    i18nDescPath: 'copilot:actions.spotlight.navigateToPage.description',
    fallbackDescription: 'Navigate to a page or module in the system',
    parameters: [
      {
        name: 'destination',
        type: 'string',
        required: true,
        fallbackDescription: 'Destination module',
      },
      {
        name: 'subpath',
        type: 'string',
        required: false,
        fallbackDescription: 'Optional subpath',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  // =========================================================================
  // ATLAS SPOTLIGHT - Signals
  // =========================================================================

  SPOTLIGHT_CREATE_SIGNAL: {
    name: ACTION_NAMES.SPOTLIGHT_CREATE_SIGNAL,
    key: 'SPOTLIGHT_CREATE_SIGNAL',
    module: 'atlas',
    category: 'signal',
    i18nDescPath: 'copilot:actions.spotlight.createSignal.description',
    fallbackDescription: 'Create a new signal (insight or message)',
    parameters: [
      {
        name: 'type',
        type: 'string',
        required: true,
        fallbackDescription: 'Signal type: insight, message',
      },
      {
        name: 'category',
        type: 'string',
        required: true,
        fallbackDescription: 'Signal category',
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        fallbackDescription: 'Signal title',
      },
      {
        name: 'content',
        type: 'string',
        required: true,
        fallbackDescription: 'Signal content',
      },
      {
        name: 'priority',
        type: 'string',
        required: true,
        fallbackDescription: 'Priority level',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  // =========================================================================
  // ATLAS SPOTLIGHT - Feedback
  // =========================================================================

  SPOTLIGHT_CAPTURE_FEEDBACK: {
    name: ACTION_NAMES.SPOTLIGHT_CAPTURE_FEEDBACK,
    key: 'SPOTLIGHT_CAPTURE_FEEDBACK',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.spotlight.captureFeedback.description',
    fallbackDescription: 'Capture user feedback intelligently',
    parameters: [
      {
        name: 'category',
        type: 'string',
        required: true,
        fallbackDescription: 'Feedback category',
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        fallbackDescription: 'Feedback title',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        fallbackDescription: 'Feedback description',
      },
      {
        name: 'severity',
        type: 'string',
        required: true,
        fallbackDescription: 'Severity level',
      },
      {
        name: 'tags',
        type: 'string[]',
        required: false,
        fallbackDescription: 'Tags for categorization',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_QUICK_BUG_REPORT: {
    name: ACTION_NAMES.SPOTLIGHT_QUICK_BUG_REPORT,
    key: 'SPOTLIGHT_QUICK_BUG_REPORT',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.spotlight.quickBugReport.description',
    fallbackDescription: 'Quick action to report a bug',
    parameters: [
      {
        name: 'issue',
        type: 'string',
        required: true,
        fallbackDescription: 'Bug description',
      },
      {
        name: 'severity',
        type: 'string',
        required: true,
        fallbackDescription: 'Bug severity',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_SUGGEST_FEATURE: {
    name: ACTION_NAMES.SPOTLIGHT_SUGGEST_FEATURE,
    key: 'SPOTLIGHT_SUGGEST_FEATURE',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.spotlight.suggestFeature.description',
    fallbackDescription: 'Suggest a new feature or improvement',
    parameters: [
      {
        name: 'suggestion',
        type: 'string',
        required: true,
        fallbackDescription: 'Feature suggestion',
      },
      {
        name: 'benefit',
        type: 'string',
        required: false,
        fallbackDescription: 'Expected benefit',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_SHARE_SUCCESS: {
    name: ACTION_NAMES.SPOTLIGHT_SHARE_SUCCESS,
    key: 'SPOTLIGHT_SHARE_SUCCESS',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.spotlight.shareSuccess.description',
    fallbackDescription: 'Share a success story or positive experience',
    parameters: [
      {
        name: 'success',
        type: 'string',
        required: true,
        fallbackDescription: 'Success description',
      },
      {
        name: 'impact',
        type: 'string',
        required: false,
        fallbackDescription: 'Impact of the success',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_ASK_QUESTION: {
    name: ACTION_NAMES.SPOTLIGHT_ASK_QUESTION,
    key: 'SPOTLIGHT_ASK_QUESTION',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.spotlight.askQuestion.description',
    fallbackDescription: 'Ask a question or clarification',
    parameters: [
      {
        name: 'question',
        type: 'string',
        required: true,
        fallbackDescription: 'The question',
      },
      {
        name: 'context',
        type: 'string',
        required: false,
        fallbackDescription: 'Additional context',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_SHARE_INSIGHT: {
    name: ACTION_NAMES.SPOTLIGHT_SHARE_INSIGHT,
    key: 'SPOTLIGHT_SHARE_INSIGHT',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.spotlight.shareInsight.description',
    fallbackDescription: 'Share an insight or discovery',
    parameters: [
      {
        name: 'insight',
        type: 'string',
        required: true,
        fallbackDescription: 'The insight',
      },
      {
        name: 'implication',
        type: 'string',
        required: false,
        fallbackDescription: 'Implications',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_REPORT_ERROR: {
    name: ACTION_NAMES.SPOTLIGHT_REPORT_ERROR,
    key: 'SPOTLIGHT_REPORT_ERROR',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.spotlight.reportError.description',
    fallbackDescription: 'Report a runtime error or exception',
    parameters: [
      {
        name: 'errorMessage',
        type: 'string',
        required: true,
        fallbackDescription: 'Error message',
      },
      {
        name: 'context',
        type: 'string',
        required: false,
        fallbackDescription: 'Error context',
      },
      {
        name: 'severity',
        type: 'string',
        required: true,
        fallbackDescription: 'Error severity',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  // =========================================================================
  // ATLAS SPOTLIGHT - Artifacts
  // =========================================================================

  SPOTLIGHT_SEARCH_ARTIFACTS: {
    name: ACTION_NAMES.SPOTLIGHT_SEARCH_ARTIFACTS,
    key: 'SPOTLIGHT_SEARCH_ARTIFACTS',
    module: 'atlas',
    category: 'artifact',
    i18nDescPath: 'copilot:actions.spotlight.searchArtifacts.description',
    fallbackDescription: 'Search for artifacts in the namespace',
    parameters: [
      {
        name: 'searchTerm',
        type: 'string',
        required: true,
        fallbackDescription: 'Search term',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_LIST_ARTIFACTS: {
    name: ACTION_NAMES.SPOTLIGHT_LIST_ARTIFACTS,
    key: 'SPOTLIGHT_LIST_ARTIFACTS',
    module: 'atlas',
    category: 'artifact',
    i18nDescPath: 'copilot:actions.spotlight.listArtifacts.description',
    fallbackDescription: 'List all available artifacts',
    parameters: [],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_READ_ARTIFACT: {
    name: ACTION_NAMES.SPOTLIGHT_READ_ARTIFACT,
    key: 'SPOTLIGHT_READ_ARTIFACT',
    module: 'atlas',
    category: 'artifact',
    i18nDescPath: 'copilot:actions.spotlight.readArtifact.description',
    fallbackDescription: 'Read a specific artifact',
    parameters: [
      {
        name: 'key',
        type: 'string',
        required: true,
        fallbackDescription: 'Artifact key',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_CREATE_ARTIFACT: {
    name: ACTION_NAMES.SPOTLIGHT_CREATE_ARTIFACT,
    key: 'SPOTLIGHT_CREATE_ARTIFACT',
    module: 'atlas',
    category: 'artifact',
    i18nDescPath: 'copilot:actions.spotlight.createArtifact.description',
    fallbackDescription: 'Create a new artifact',
    parameters: [
      {
        name: 'key',
        type: 'string',
        required: true,
        fallbackDescription: 'Artifact key',
      },
      {
        name: 'value',
        type: 'string',
        required: true,
        fallbackDescription: 'Artifact value',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        fallbackDescription: 'Artifact description',
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        fallbackDescription: 'Artifact type',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  // =========================================================================
  // ATLAS SPOTLIGHT - Agent
  // =========================================================================

  SPOTLIGHT_EXECUTE_UTILITY_AGENT: {
    name: ACTION_NAMES.SPOTLIGHT_EXECUTE_UTILITY_AGENT,
    key: 'SPOTLIGHT_EXECUTE_UTILITY_AGENT',
    module: 'atlas',
    category: 'agent',
    i18nDescPath: 'copilot:actions.spotlight.executeUtilityAgent.description',
    fallbackDescription: 'Execute the utility agent supervisor',
    parameters: [
      {
        name: 'user_input',
        type: 'string',
        required: true,
        fallbackDescription: 'Task description',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  // =========================================================================
  // ATLAS SPOTLIGHT - Lists
  // =========================================================================

  SPOTLIGHT_LIST_SIGNALS: {
    name: ACTION_NAMES.SPOTLIGHT_LIST_SIGNALS,
    key: 'SPOTLIGHT_LIST_SIGNALS',
    module: 'atlas',
    category: 'signal',
    i18nDescPath: 'copilot:actions.spotlight.listSignals.description',
    fallbackDescription: 'List recent signals',
    parameters: [
      {
        name: 'type',
        type: 'string',
        required: false,
        fallbackDescription: 'Signal type filter',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_LIST_FEEDBACKS: {
    name: ACTION_NAMES.SPOTLIGHT_LIST_FEEDBACKS,
    key: 'SPOTLIGHT_LIST_FEEDBACKS',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.spotlight.listFeedbacks.description',
    fallbackDescription: 'List all feedbacks with filters',
    parameters: [
      {
        name: 'status',
        type: 'string',
        required: false,
        fallbackDescription: 'Status filter',
      },
      {
        name: 'category',
        type: 'string',
        required: false,
        fallbackDescription: 'Category filter',
      },
      {
        name: 'severity',
        type: 'string',
        required: false,
        fallbackDescription: 'Severity filter',
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        fallbackDescription: 'Maximum results',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_GET_FEEDBACK_STATISTICS: {
    name: ACTION_NAMES.SPOTLIGHT_GET_FEEDBACK_STATISTICS,
    key: 'SPOTLIGHT_GET_FEEDBACK_STATISTICS',
    module: 'atlas',
    category: 'feedback',
    i18nDescPath: 'copilot:actions.spotlight.getFeedbackStatistics.description',
    fallbackDescription: 'Get detailed feedback statistics',
    parameters: [],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  // =========================================================================
  // ATLAS SPOTLIGHT - Tasks
  // =========================================================================

  SPOTLIGHT_CREATE_TASK: {
    name: ACTION_NAMES.SPOTLIGHT_CREATE_TASK,
    key: 'SPOTLIGHT_CREATE_TASK',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.spotlight.createTask.description',
    fallbackDescription: 'Create a new personal task',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        fallbackDescription: 'Task title',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        fallbackDescription: 'Task description',
      },
      {
        name: 'priority',
        type: 'string',
        required: false,
        fallbackDescription: 'Task priority',
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        fallbackDescription: 'Initial status',
      },
      {
        name: 'dueDate',
        type: 'string',
        required: false,
        fallbackDescription: 'Due date (ISO)',
      },
      {
        name: 'tags',
        type: 'string',
        required: false,
        fallbackDescription: 'Comma-separated tags',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_LIST_MY_TASKS: {
    name: ACTION_NAMES.SPOTLIGHT_LIST_MY_TASKS,
    key: 'SPOTLIGHT_LIST_MY_TASKS',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.spotlight.listMyTasks.description',
    fallbackDescription: 'List personal tasks',
    parameters: [
      {
        name: 'status',
        type: 'string',
        required: false,
        fallbackDescription: 'Status filter',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_COMPLETE_TASK: {
    name: ACTION_NAMES.SPOTLIGHT_COMPLETE_TASK,
    key: 'SPOTLIGHT_COMPLETE_TASK',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.spotlight.completeTask.description',
    fallbackDescription: 'Mark a task as complete',
    parameters: [
      {
        name: 'taskTitle',
        type: 'string',
        required: true,
        fallbackDescription: 'Task title to complete',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_MOVE_TASK: {
    name: ACTION_NAMES.SPOTLIGHT_MOVE_TASK,
    key: 'SPOTLIGHT_MOVE_TASK',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.spotlight.moveTask.description',
    fallbackDescription: 'Move task to different status',
    parameters: [
      {
        name: 'taskTitle',
        type: 'string',
        required: true,
        fallbackDescription: 'Task title',
      },
      {
        name: 'newStatus',
        type: 'string',
        required: true,
        fallbackDescription: 'New status',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_DELETE_TASK: {
    name: ACTION_NAMES.SPOTLIGHT_DELETE_TASK,
    key: 'SPOTLIGHT_DELETE_TASK',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.spotlight.deleteTask.description',
    fallbackDescription: 'Delete a task permanently',
    parameters: [
      {
        name: 'taskTitle',
        type: 'string',
        required: true,
        fallbackDescription: 'Task title to delete',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_SUMMARIZE_DAY: {
    name: ACTION_NAMES.SPOTLIGHT_SUMMARIZE_DAY,
    key: 'SPOTLIGHT_SUMMARIZE_DAY',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.spotlight.summarizeDay.description',
    fallbackDescription: 'Generate a daily task summary',
    parameters: [],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_GET_TASK_INSIGHTS: {
    name: ACTION_NAMES.SPOTLIGHT_GET_TASK_INSIGHTS,
    key: 'SPOTLIGHT_GET_TASK_INSIGHTS',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.spotlight.getTaskInsights.description',
    fallbackDescription: 'Analyze tasks and provide insights',
    parameters: [],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },

  SPOTLIGHT_CREATE_CONTEXTUAL_TASK: {
    name: ACTION_NAMES.SPOTLIGHT_CREATE_CONTEXTUAL_TASK,
    key: 'SPOTLIGHT_CREATE_CONTEXTUAL_TASK',
    module: 'my-tasks',
    category: 'task',
    i18nDescPath: 'copilot:actions.spotlight.createContextualTask.description',
    fallbackDescription: 'Create a task from current context',
    parameters: [
      {
        name: 'title',
        type: 'string',
        required: true,
        fallbackDescription: 'Task title',
      },
      {
        name: 'notes',
        type: 'string',
        required: false,
        fallbackDescription: 'Additional notes',
      },
    ],
    hasRender: true,
    isHITL: false,
    sourceFile:
      'src/shared/components/atlas-spotlight/copilot/spotlight-handlers.ts',
  },
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all actions for a specific module
 */
export function getActionsByModule(
  module: ActionModule
): ActionRegistryEntry[] {
  return Object.values(ACTION_REGISTRY).filter(a => a.module === module)
}

/**
 * Get all actions for a specific category
 */
export function getActionsByCategory(
  category: ActionCategory
): ActionRegistryEntry[] {
  return Object.values(ACTION_REGISTRY).filter(a => a.category === category)
}

/**
 * Get action by name
 */
export function getActionByName(name: string): ActionRegistryEntry | undefined {
  return Object.values(ACTION_REGISTRY).find(a => a.name === name)
}

/**
 * Get action by key
 */
export function getActionByKey(key: string): ActionRegistryEntry | undefined {
  return ACTION_REGISTRY[key]
}

/**
 * Get all action names for a module
 */
export function getActionNamesForModule(module: ActionModule): string[] {
  return getActionsByModule(module).map(a => a.name)
}

/**
 * Get all HITL (Human-in-the-Loop) actions
 */
export function getHITLActions(): ActionRegistryEntry[] {
  return Object.values(ACTION_REGISTRY).filter(a => a.isHITL)
}

/**
 * Get actions with custom render
 */
export function getActionsWithRender(): ActionRegistryEntry[] {
  return Object.values(ACTION_REGISTRY).filter(a => a.hasRender)
}

/**
 * Count actions by module
 */
export function countActionsByModule(): Record<ActionModule, number> {
  const counts: Record<ActionModule, number> = {
    atlas: 0,
    kanban: 0,
    upstream: 0,
    downstream: 0,
    migration: 0,
    onboarding: 0,
    feedback: 0,
    'my-tasks': 0,
  }

  Object.values(ACTION_REGISTRY).forEach(action => {
    counts[action.module]++
  })

  return counts
}
