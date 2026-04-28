/**
 * LangGraph State Schema for SDA2 Supervisor
 *
 * Defines the state structure for the multi-agent supervisor.
 * Based on cockpit-agents-api's supervisor_dynamic_agent.py pattern.
 */

import { Annotation, MessagesAnnotation } from '@langchain/langgraph'

import type { ConversationArtifact, HandoffEvent } from './types'

/**
 * SDA2 Supervisor State Annotation
 *
 * Extends MessagesAnnotation with additional state for:
 * - Project context
 * - Current agent tracking
 * - Artifacts generated
 * - Handoff history
 */
export const SDA2StateAnnotation = Annotation.Root({
  // Inherit message handling from MessagesAnnotation
  ...MessagesAnnotation.spec,

  // =========================================================================
  // Project Context
  // =========================================================================

  /** Current project ID */
  projectId: Annotation<string>({
    default: () => '',
    reducer: (_, next) => next,
  }),

  /** Current project name */
  projectName: Annotation<string>({
    default: () => '',
    reducer: (_, next) => next,
  }),

  /** Current conversation ID */
  conversationId: Annotation<string>({
    default: () => '',
    reducer: (_, next) => next,
  }),

  // =========================================================================
  // Agent State
  // =========================================================================

  /** Currently active agent (null = supervisor) */
  currentAgent: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),

  /** Previous agent (for handoff tracking) */
  previousAgent: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),

  // =========================================================================
  // Artifacts & History
  // =========================================================================

  /** Artifacts generated during conversation */
  artifacts: Annotation<ConversationArtifact[]>({
    default: () => [],
    reducer: (prev, next) => [...prev, ...next],
  }),

  /** History of handoffs between agents */
  handoffHistory: Annotation<HandoffEvent[]>({
    default: () => [],
    reducer: (prev, next) => [...prev, ...next],
  }),

  // =========================================================================
  // Execution Metadata
  // =========================================================================

  /** Execution ID for tracing */
  executionId: Annotation<string>({
    default: () => '',
    reducer: (_, next) => next,
  }),

  /** Turn count for limiting recursion */
  turnCount: Annotation<number>({
    default: () => 0,
    reducer: (prev, next) => (next !== undefined ? next : prev + 1),
  }),
})

/**
 * Type for SDA2 State
 */
export type SDA2State = typeof SDA2StateAnnotation.State
