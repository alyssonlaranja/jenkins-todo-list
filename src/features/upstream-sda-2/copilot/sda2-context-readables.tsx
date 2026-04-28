/**
 * SDA2 Context Readables
 *
 * Provides context to LLM via useCopilotReadable
 * Allows LLM to understand current project, conversation, and artifacts
 */

'use client'

import { useCopilotReadable } from '@copilotkit/react-core'

import {
  selectProposalHistoryForAI,
  useEditSessionStore,
} from '../stores/editSessionStore'
import type { SDA2ContextReadablesProps } from './types'

// ============================================================================
// Context Readables Component
// ============================================================================

export function useSDA2ContextReadables({
  project,
  currentConversation,
  artifacts,
}: SDA2ContextReadablesProps) {
  // ==========================================================================
  // 1. Current Project Context
  // ==========================================================================

  useCopilotReadable({
    description: 'Current SDA2 project with basic information',
    value: project
      ? {
          id: project.id,
          name: project.name,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          conversationsCount: project.conversations?.length || 0,
          artifactsCount: project.artifacts?.length || 0,
        }
      : null,
  })

  // ==========================================================================
  // 2. Current Conversation Context
  // ==========================================================================

  useCopilotReadable({
    description: 'Current conversation/chat with agent and message history',
    value: currentConversation
      ? {
          id: currentConversation.id,
          title: currentConversation.title,
          agentName: currentConversation.agentName,
          agentType: currentConversation.agentType,
          messagesCount: currentConversation.messages?.length || 0,
          lastMessage:
            currentConversation.messages?.[
              currentConversation.messages.length - 1
            ],
          createdAt: currentConversation.createdAt,
          acceptedArtifacts: currentConversation.acceptedArtifacts || [],
        }
      : null,
  })

  // ==========================================================================
  // 3. Available Artifacts
  // ==========================================================================

  useCopilotReadable({
    description:
      'List of all artifacts in current project (PRDs, architectures, epics, etc)',
    value: artifacts.map(artifact => ({
      id: artifact.id,
      title: artifact.title,
      type: artifact.type,
      status: artifact.status,
      agentName: artifact.agentName,
      version: artifact.version,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
      contentPreview: artifact.content.substring(0, 200) + '...',
    })),
  })

  // ==========================================================================
  // 4. Current Session State
  // ==========================================================================
  // NOTE: Available Agents and Artifact Types are now loaded dynamically
  // from Cockpit MCP Server via BFF (src/app/api/sda2-bff/route.ts)
  // The supervisor receives agent cards with team members directly from MCP

  useCopilotReadable({
    description: 'Current session state and navigation context',
    value: {
      hasProject: !!project,
      hasConversation: !!currentConversation,
      currentView: !project ? 'home' : currentConversation ? 'chat' : 'project',
      canCreateArtifact: !!project && !!currentConversation,
      suggestedActions: getSuggestedActions(
        project,
        currentConversation,
        artifacts
      ),
    },
  })

  // ==========================================================================
  // 5. Edit Session Context (for AI-assisted artifact editing)
  // ==========================================================================

  const editSession = useEditSessionStore(state => state.session)
  const proposalHistory = useEditSessionStore(selectProposalHistoryForAI)

  useCopilotReadable({
    description:
      'Current artifact edit session context. When active, this provides the history of edit proposals made during this session, including which were accepted or rejected by the user. Use this to understand the editing context and avoid repeating rejected proposals.',
    value: editSession
      ? {
          isEditingArtifact: true,
          artifactId: editSession.artifactId,
          artifactTitle: editSession.artifactTitle,
          artifactType: editSession.artifactType,
          // The content the user is currently working with
          currentWorkingContent: editSession.currentWorkingContent,
          // Session statistics
          sessionStats: {
            startedAt: editSession.startedAt,
            totalProposals: editSession.proposals.length,
            pendingProposals: editSession.proposals.filter(
              p => p.status === 'pending'
            ).length,
            acceptedProposals: editSession.proposals.filter(
              p => p.status === 'accepted'
            ).length,
            rejectedProposals: editSession.proposals.filter(
              p => p.status === 'rejected'
            ).length,
          },
          // Full proposal history with status
          proposalHistory: proposalHistory,
          // Guidance for the AI
          guidance: {
            useWorkingContent:
              'When making edits, use currentWorkingContent as the base, not the original saved content',
            avoidRejected:
              'Pay attention to rejected proposals - the user did not want those changes',
            buildOnAccepted:
              'Accepted proposals have been incorporated into currentWorkingContent',
          },
        }
      : {
          isEditingArtifact: false,
        },
  })
}

// ============================================================================
// Helper: Get Suggested Actions
// ============================================================================

function getSuggestedActions(
  project: SDA2ContextReadablesProps['project'],
  currentConversation: SDA2ContextReadablesProps['currentConversation'],
  artifacts: SDA2ContextReadablesProps['artifacts']
): string[] {
  const suggestions: string[] = []

  // No project
  if (!project) {
    suggestions.push('Create a new project')
    suggestions.push('List existing projects')
    return suggestions
  }

  // Has project, no conversation
  if (!currentConversation) {
    suggestions.push('Start a new conversation')
    suggestions.push('Select an agent (PM, Architect, PO, etc)')
    suggestions.push('List existing conversations')
    return suggestions
  }

  // Has project and conversation
  suggestions.push('Create an artifact (PRD, Architecture, etc)')
  suggestions.push('Search for templates')
  suggestions.push('Get methodology guidance')

  // Artifact-specific suggestions
  if (artifacts.length === 0) {
    suggestions.push('Start with a Project Brief')
  } else {
    const hasPRD = artifacts.some(a => a.type.startsWith('prd'))
    const hasArchitecture = artifacts.some(a => a.type === 'architecture')
    const hasEpics = artifacts.some(a => a.type === 'epics')

    if (!hasPRD) {
      suggestions.push('Create a PRD')
    } else if (!hasArchitecture) {
      suggestions.push('Design the architecture')
    } else if (!hasEpics) {
      suggestions.push('Break down into epics and stories')
    } else {
      suggestions.push('Review and refine artifacts')
      suggestions.push('Update artifact statuses')
    }
  }

  return suggestions
}
