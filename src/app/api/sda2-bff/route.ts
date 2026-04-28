/**
 * Upstream SDA-2 BFF (Backend for Frontend)
 *
 * Implements AG-UI protocol for CopilotKit integration.
 * This endpoint executes the LangGraph Supervisor inline and streams events
 * in the format expected by CopilotKit.
 *
 * Architecture:
 * 1. Fetch agent card from MCP (team members, instructions)
 * 2. Create LangGraph Supervisor dynamically from MCP data
 * 3. Stream supervisor events via AG-UI protocol
 *
 * Protocol: AG-UI (Server-Sent Events with JSON events)
 * Integration: LangGraph Supervisor + MCP Server (Dynamic Multi-Agent)
 *
 * @see https://docs.copilotkit.ai/langgraph/ag-ui-protocol
 */

import { NextRequest } from 'next/server'
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from '@langchain/core/messages'
import { AzureChatOpenAI } from '@langchain/openai'

import { createSDA2Supervisor, type MCPAgentCard } from '@/agents/sda2'
import { callMCPTool } from '@/lib/mcp-client'
import {
  extractKnowledgeAgentConfig,
  formatRAGResultsForPrompt,
  searchKnowledgeBase,
} from '@/lib/rag'
import { getServerEnv } from '@/shared/lib/server/get-server-env'

// ============================================================================
// Constants - Ambiente FIXO do Supervisor SDA2
// ============================================================================

// Usa NEXT_PUBLIC_MCP_* lidas via getServerEnv() com acesso dinâmico
// (process.env[key]) para evitar inlining do webpack DefinePlugin.
// Os fallbacks hardcoded são de PRODUÇÃO (Avanade Demo PRD) para backward compat.

const SUPERVISOR_ID_DEFAULT = getServerEnv(
  'NEXT_PUBLIC_MCP_UTILITY_AGENT_ID',
  '75819ebb-eaa7-4010-a5f8-d6e3353329e7'
)
const MCP_SERVER_URL = getServerEnv(
  'NEXT_PUBLIC_MCP_SERVER_URL',
  'https://mcp-agent.br.avanade.ai/mcp'
)
const MCP_UTILITY_AGENTS_URL = getServerEnv(
  'NEXT_PUBLIC_MCP_SERVER_UTILITY_AGENT_URL',
  'https://mcp-utility-agents.br.avanade.ai/mcp'
)
const MCP_API_KEY = getServerEnv(
  'NEXT_PUBLIC_MCP_API_KEY',
  'cFf4IwGhwy38llzPNxpnv1EUrrs92GWN5mM6xBbNAPMy4Dr6DrjhOA00EnmVTQho'
)
const MCP_LICENSE_ID = getServerEnv(
  'NEXT_PUBLIC_MCP_LICENSE_ID',
  '14234418-f40d-41e5-8915-47f8b2007fbc'
)
const MCP_NAMESPACE_ID = getServerEnv(
  'NEXT_PUBLIC_MCP_NAMESPACE_ID',
  'f1a9bb1c-5d4b-41bf-b23d-c21d66ef2ca9'
)

// ============================================================================
// Agent Card Types
// ============================================================================

// Raw response from MCP get_agent_card
interface MCPAgentCardRaw {
  succeeded?: boolean
  message?: string
  data?: {
    utility_agent?: {
      id: string
      type_id: string
      name: string
      description: string
      objective: string
      model: string
      is_mcp_enabled: boolean
    }
    team_member?: Array<{
      id: string
      type_id: string
      name: string
      description: string
      objective: string
      model: string
      is_mcp_enabled: boolean
      /** Artifact type this agent produces - NEW FIELD from Cockpit */
      artifact_type?: string
    }>
  }
  // Direct error response
  error?: string
}

// Normalized agent card for internal use
interface AgentCardResponse {
  name?: string
  description?: string
  instructions?: string
  capabilities?: string[]
  teamMembers?: Array<{
    name: string
    role: string
    specialty?: string
    id?: string
    /** Artifact type this agent produces - from MCP artifact_type or extracted from objective */
    artifactType?: string
    /** Full instructions from Cockpit - fetched via get_utility_agent_by_id */
    instruction?: string
  }>
}

// ============================================================================
// MCP Integration Functions
// ============================================================================

// NOTE: detectDuplicateDocumentStart() function was REMOVED
// Causa raiz da duplicação foi corrigida em create-sda2-supervisor.ts:
// - Alterado outputMode de 'full_history' para 'last_message'
// - Com 'last_message', apenas a resposta final de cada agente é incluída
// - Isso elimina 100% da duplicação na raiz, sem necessidade de detecção por regex
// Se você está vendo duplicação de conteúdo, verifique se outputMode está correto!

/**
 * Response from MCP get_utility_agent_by_id — used to fetch full instruction
 */
interface MCPAgentByIdResponse {
  succeeded?: boolean
  data?:
    | {
        instruction?: string
        name?: string
        description?: string
        objective?: string
        [key: string]: unknown
      }
    | {
        data?: {
          instruction?: string
          name?: string
          description?: string
          objective?: string
          [key: string]: unknown
        }
        [key: string]: unknown
      }
  error?: string
}

/**
 * Fetches the full instruction for a SINGLE agent via `get_utility_agent_by_id`.
 *
 * IMPORTANT:
 * - Must use MCP_UTILITY_AGENTS_URL (NOT MCP_SERVER_URL)
 * - The `instruction` field only comes from this endpoint
 * - Response may have nested data (data.data) or direct (data)
 *
 * @param agentId - UUID of the agent (from team_member.id)
 * @param mcpHeaders - Headers for the MCP call
 * @returns The instruction content, or null if not found
 */
async function fetchSingleAgentInstruction(
  agentId: string,
  mcpHeaders: Record<string, string>
): Promise<string | null> {
  try {
    console.log(`🔍 [SDA2-BFF] Fetching instruction for agent: ${agentId}`)

    const result = await callMCPTool<MCPAgentByIdResponse>({
      mcpServerUrl: MCP_UTILITY_AGENTS_URL,
      mcpHeaders,
      toolName: 'get_utility_agent_by_id',
      toolArguments: { agent_id: agentId },
    })

    if (!result.success || !result.data) {
      console.warn(
        `⚠️ [SDA2-BFF] Failed to fetch instruction for agent ${agentId}:`,
        result.error
      )
      return null
    }

    // Handle two possible response formats:
    // Format 1: { data: { instruction: "..." } }
    // Format 2: { data: { data: { instruction: "..." } } }
    const data = result.data.data || result.data
    const nestedData = (data as { data?: { instruction?: string } })?.data
    const instruction =
      nestedData?.instruction || (data as { instruction?: string })?.instruction

    if (instruction) {
      console.log(
        `✅ [SDA2-BFF] Instruction for agent ${agentId}: ${instruction.length} chars`
      )
      return instruction
    }

    console.warn(`⚠️ [SDA2-BFF] No 'instruction' field for agent ${agentId}`)
    return null
  } catch (error) {
    console.warn(
      `⚠️ [SDA2-BFF] Error fetching instruction for agent ${agentId}:`,
      error
    )
    return null
  }
}

/**
 * Enriches all team members with their full instructions fetched in parallel.
 * Uses `get_utility_agent_by_id` on MCP_UTILITY_AGENTS_URL for each member.
 */
async function enrichTeamMembersWithInstructions(
  teamMembers: AgentCardResponse['teamMembers'],
  mcpHeaders: Record<string, string>
): Promise<AgentCardResponse['teamMembers']> {
  if (!teamMembers || teamMembers.length === 0) return teamMembers

  console.log(
    `🔍 [SDA2-BFF] Enriching ${teamMembers.length} team members with instructions...`
  )

  const enrichedPromises = teamMembers.map(async member => {
    if (!member.id) {
      console.warn(
        `⚠️ [SDA2-BFF] Member "${member.name}" has no ID, skipping instruction fetch`
      )
      return member
    }

    const instruction = await fetchSingleAgentInstruction(member.id, mcpHeaders)

    return {
      ...member,
      instruction: instruction || undefined,
    }
  })

  const enrichedMembers = await Promise.all(enrichedPromises)

  // Log enrichment summary
  const withInstruction = enrichedMembers.filter(m => m.instruction)
  console.log(
    `✅ [SDA2-BFF] Enrichment complete: ${withInstruction.length}/${enrichedMembers.length} members have instructions`
  )

  for (const m of enrichedMembers) {
    console.log(`
┌─────────────────────────────────────────────────
│ 🤖 Enriched Agent: ${m.name}
│ 📝 Description (role): ${m.role?.substring(0, 100)}${(m.role?.length || 0) > 100 ? '...' : ''}
│ 🎯 Objectives (specialty): ${m.specialty?.substring(0, 100)}${(m.specialty?.length || 0) > 100 ? '...' : ''}
│ 📜 Instructions: ${m.instruction ? `${m.instruction.length} chars` : '(não disponível)'}
│ 📦 ArtifactType: ${m.artifactType || '(não definido)'}
└─────────────────────────────────────────────────`)
  }

  return enrichedMembers
}

/**
 * Fetch agent instructions from Cockpit via MCP Server
 * Returns the agent card with instructions, or null if unavailable
 *
 * Uses FIXED credentials for the supervisor's license/namespace environment
 * The utilityAgentId is DYNAMIC - comes from user selection in the dropdown
 * The only other dynamic value is userCockpitKey (Personal Access Token)
 */
async function fetchAgentInstructions(
  clientMcpHeaders?: Record<string, string>,
  _mcpServerUrl?: string,
  utilityAgentId?: string
): Promise<AgentCardResponse | null> {
  const serverUrl = MCP_SERVER_URL

  // 🔧 DYNAMIC: Use the agent ID selected by the user, fallback to default
  const agentId = utilityAgentId || SUPERVISOR_ID_DEFAULT

  // Use FIXED credentials for the supervisor's environment
  // Only x-cockpit-api-key (Personal Access Token) comes from client request
  const userCockpitKey = clientMcpHeaders?.['x-cockpit-api-key'] || ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    // FIXED values - ambiente do Supervisor
    'x-api-key': MCP_API_KEY,
    'x-cockpit-license-id': MCP_LICENSE_ID,
    'x-cockpit-namespace-id': MCP_NAMESPACE_ID,
    // 🔧 DYNAMIC value - ID do agente selecionado pelo usuário
    'x-cockpit-utility-agent-id': agentId,
    // DYNAMIC value - Personal Access Token do usuário logado
    'x-cockpit-api-key': userCockpitKey,
  }

  console.log('🔍 [SDA2-BFF] Fetching agent instructions from Cockpit...', {
    serverUrl,
    utilityAgentId: agentId,
    isDefaultAgent: agentId === SUPERVISOR_ID_DEFAULT,
    licenseId: MCP_LICENSE_ID,
    namespaceId: MCP_NAMESPACE_ID,
    hasApiKey: true, // Always true now - hardcoded
    hasCockpitKey: !!userCockpitKey,
  })

  try {
    const result = await callMCPTool<MCPAgentCardRaw>({
      mcpServerUrl: serverUrl,
      mcpHeaders: headers,
      toolName: 'get_agent_card',
      toolArguments: {},
    })

    if (result.success && result.data) {
      const raw = result.data

      // Check for error in response
      if (raw.error) {
        console.warn('⚠️ [SDA2-BFF] Agent card returned error:', raw.error)
        return null
      }

      // Parse MCP format to normalized format
      const utilityAgent = raw.data?.utility_agent
      const teamMembers = raw.data?.team_member

      if (!utilityAgent) {
        console.warn('⚠️ [SDA2-BFF] No utility_agent in response')
        return null
      }

      const normalized: AgentCardResponse = {
        name: utilityAgent.name,
        description: utilityAgent.description,
        instructions: utilityAgent.objective, // MCP uses 'objective' for instructions
        teamMembers: teamMembers?.map(member => {
          // Try to extract artifact_type from MCP field, objective text, or description
          let artifactType = member.artifact_type

          // Debug: Log raw data for this member
          console.log(
            `🔍 [SDA2-BFF] Checking artifact_type for "${member.name}":`,
            {
              hasArtifactTypeField: !!member.artifact_type,
              objectivePreview: member.objective?.substring(0, 200),
              descriptionPreview: member.description?.substring(0, 200),
            }
          )

          if (!artifactType && member.objective) {
            // Try to extract from objective text: "artifact_type: Documento de Discovery"
            const match = member.objective.match(/artifact_type:\s*([^\n]+)/i)
            if (match?.[1]) {
              artifactType = match[1].trim()
              console.log(
                `✅ [SDA2-BFF] Found artifact_type in objective for "${member.name}": "${artifactType}"`
              )
            }
          }

          // Also try from description field
          if (!artifactType && member.description) {
            const match = member.description.match(/artifact_type:\s*([^\n]+)/i)
            if (match?.[1]) {
              artifactType = match[1].trim()
              console.log(
                `✅ [SDA2-BFF] Found artifact_type in description for "${member.name}": "${artifactType}"`
              )
            }
          }

          return {
            name: member.name,
            role: member.description,
            specialty: member.objective,
            id: member.id,
            artifactType,
          }
        }),
      }

      // Log detailed team members to debug the "6 vs 5" discrepancy
      console.log('✅ [SDA2-BFF] Agent card fetched successfully:', {
        name: normalized.name,
        hasInstructions: !!normalized.instructions,
        teamMembersCount: normalized.teamMembers?.length || 0,
        teamMemberNames: normalized.teamMembers?.map(m => m.name) || [],
      })

      // Enrich team members with full instructions from get_utility_agent_by_id
      if (normalized.teamMembers && normalized.teamMembers.length > 0) {
        console.log(
          '🔍 [SDA2-BFF] Starting instruction enrichment for team members...'
        )
        normalized.teamMembers = await enrichTeamMembersWithInstructions(
          normalized.teamMembers,
          headers
        )
      }

      return normalized
    } else {
      console.warn('⚠️ [SDA2-BFF] Failed to fetch agent card:', result.error)
      return null
    }
  } catch (error) {
    console.error('❌ [SDA2-BFF] Error fetching agent instructions:', error)
    return null
  }
}

// ============================================================================
// Types
// ============================================================================

interface ContextItem {
  key: string
  value: string | Record<string, unknown>
}

interface RunAgentInput {
  runId: string
  threadId: string
  messages: Array<{
    id: string
    role: string
    content: string
  }>
  context?: ContextItem[]
  forwardedProps?: {
    utilityAgentId?: string
    mcpHeaders?: Record<string, string>
    mcpServerUrl?: string
    supervisorName?: string
    projectId?: string
    projectName?: string
    conversationId?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Check if a message is a LangGraph handoff message that should not be shown to users
 */
function isHandoffMessage(content: string): boolean {
  if (!content) return false
  const handoffPatterns = [
    /^Successfully transferred to \w+$/i,
    /^Successfully transferred back to \w+$/i,
    /^Transferring to \w+$/i,
    /^Transferring back to \w+$/i, // Added: "Transferring back to supervisor" pattern
    /^Handing off to \w+$/i,
  ]
  return handoffPatterns.some(pattern => pattern.test(content.trim()))
}

/**
 * Check if content is a structured document (briefing, PRD, architecture, etc.)
 * Used as fallback when ARTIFACT_METADATA is not present
 * Detects documents by looking for common section patterns
 */
function isStructuredDocument(content: string): boolean {
  if (!content || content.length < 500) return false // Too short to be a document

  const documentPatterns = [
    // Document title patterns
    /^#\s+(briefing|prd|documento|arquitetura|design|backlog)/im,
    // Numbered sections (1. Contexto, 2. Objetivos, etc.)
    /\n\d+\.\s+(contexto|objetivo|escopo|público|proposta|requisito|cronograma)/im,
    // Markdown headers for common sections
    /##\s+(visão geral|objetivo|público-?alvo|proposta de valor|escopo|requisitos|kpis?|cronograma)/im,
    // Multiple markdown headers indicating structured content
    /^#{1,3}\s+.+\n[\s\S]*^#{1,3}\s+.+\n[\s\S]*^#{1,3}\s+/m,
  ]

  const matchCount = documentPatterns.filter(pattern =>
    pattern.test(content)
  ).length

  // Consider it a structured document if at least 2 patterns match
  return matchCount >= 2
}

/**
 * 🔧 FIX 2026-03-06: Detect and handle duplicate content in streaming
 * The model sometimes repeats the same question twice due to:
 * - Long prompts with many example questions
 * - Pattern matching on checklist examples in Cockpit instructions
 *
 * This class tracks recently sent content and detects duplicates
 */
class DuplicateDetector {
  private recentContent: string[] = []
  private fullContent: string = ''
  private readonly minDuplicateLength = 30 // Minimum chars to consider as duplicate
  private readonly maxRecentItems = 5 // How many recent chunks to track
  private questionAlreadySent = false // True after first "?" is sent
  private isDocumentMode = false // True when generating ARTIFACT_METADATA document

  /**
   * @param forceDocumentMode When true, disables "?"-based truncation from the
   * start. Used when the incoming user message is an artifact edit request
   * (contains "MODO DE EDIÇÃO") — the LLM response is expected to be a full
   * document that naturally contains "?" characters.
   */
  constructor(forceDocumentMode = false) {
    if (forceDocumentMode) {
      this.isDocumentMode = true
      console.log(
        '📄 [DuplicateDetector] Document mode forced via constructor (edit request detected)'
      )
    }
  }

  /**
   * Check if the new content is a duplicate of something already sent
   * Returns the non-duplicate portion of the content, or empty string if fully duplicate
   */
  filterDuplicate(newContent: string): string {
    if (!newContent) {
      return newContent
    }

    // Check if we're entering document mode (ARTIFACT_METADATA or structured document)
    if (
      newContent.includes('ARTIFACT_METADATA') ||
      this.fullContent.includes('ARTIFACT_METADATA')
    ) {
      this.isDocumentMode = true
    }

    // 🔧 FIX 2026-03-09: Also detect structured documents and edit-mode responses
    // as "document mode" to prevent ?-based truncation on artifact content.
    // Edit responses contain plain markdown without ARTIFACT_METADATA but should
    // NOT be truncated at the first "?" character.
    if (
      !this.isDocumentMode &&
      (isStructuredDocument(this.fullContent + newContent) ||
        this.fullContent.includes('MODO DE EDIÇÃO') ||
        this.fullContent.includes('````markdown'))
    ) {
      this.isDocumentMode = true
      console.log(
        `📄 [DuplicateDetector] Detected document/edit mode via structured content detection`
      )
    }

    // 🔧 FIX: If we're NOT in document mode and a question was already sent,
    // block any additional content after the "?"
    // This prevents "Question 1?Question 2?" pattern
    if (!this.isDocumentMode && this.questionAlreadySent) {
      console.log(
        `⏭️ [DuplicateDetector] BLOCKING content after first question (${newContent.length} chars): "${newContent.substring(0, 50)}..."`
      )
      return ''
    }

    // Check if this content contains a "?" - if so, we need to handle it specially
    const questionIndex = newContent.indexOf('?')
    if (!this.isDocumentMode && questionIndex >= 0) {
      // If this is the first question mark, allow content up to and including it
      if (!this.questionAlreadySent) {
        this.questionAlreadySent = true
        const contentUpToQuestion = newContent.substring(0, questionIndex + 1)

        // Check if there's more content after the "?"
        if (questionIndex < newContent.length - 1) {
          console.log(
            `✂️ [DuplicateDetector] Truncating response at first "?" - blocking ${newContent.length - questionIndex - 1} chars after question`
          )
        }

        this.addContent(contentUpToQuestion)
        return contentUpToQuestion
      }
    }

    // If content is too short, just pass through
    if (newContent.length < this.minDuplicateLength) {
      this.addContent(newContent)
      return newContent
    }

    // Check if this exact content was recently sent
    if (this.recentContent.some(recent => recent === newContent)) {
      console.log(
        `⏭️ [DuplicateDetector] Skipping exact duplicate chunk (${newContent.length} chars): "${newContent.substring(0, 50)}..."`
      )
      return ''
    }

    // Check if the new content already exists in the full response
    const normalizedNew = this.normalizeForComparison(newContent)
    const normalizedFull = this.normalizeForComparison(this.fullContent)

    if (
      normalizedNew.length >= this.minDuplicateLength &&
      normalizedFull.includes(normalizedNew)
    ) {
      console.log(
        `⏭️ [DuplicateDetector] Skipping duplicate content found in full response (${newContent.length} chars): "${newContent.substring(0, 50)}..."`
      )
      return ''
    }

    this.addContent(newContent)
    return newContent
  }

  private addContent(content: string): void {
    if (!content) return
    this.fullContent += content
    this.recentContent.push(content)
    if (this.recentContent.length > this.maxRecentItems) {
      this.recentContent.shift()
    }
  }

  private normalizeForComparison(text: string): string {
    // Remove whitespace and normalize for comparison
    return text.toLowerCase().replace(/\s+/g, ' ').trim()
  }

  /**
   * Get statistics about duplicate detection
   */
  getStats(): {
    fullLength: number
    recentChunks: number
    questionSent: boolean
    isDocument: boolean
  } {
    return {
      fullLength: this.fullContent.length,
      recentChunks: this.recentContent.length,
      questionSent: this.questionAlreadySent,
      isDocument: this.isDocumentMode,
    }
  }
}

// NOTE: buildSDA2SystemPrompt (FALLBACK) was REMOVED to test pure Cockpit MCP communication
// If you see this comment and the chat works, we are 100% using Cockpit instructions!
// Original function had ~240 lines of hardcoded prompts for 5 agents (Maria, Paula, Wilson, Roberto, Sofia)

// REMOVED FALLBACK START
// The following function was removed to prove Cockpit MCP integration is working:
// function buildSDA2SystemPrompt(context?: ContextItem[]): string { ... }
// REMOVED FALLBACK END

/**
 * Convert messages to LangChain format
 */
function convertMessages(messages: RunAgentInput['messages']): BaseMessage[] {
  return messages.map(msg => {
    const content = msg.content

    switch (msg.role.toLowerCase()) {
      case 'user':
        return new HumanMessage({ content, id: msg.id })
      case 'assistant':
      case 'ai':
        return new AIMessage({ content, id: msg.id })
      case 'system':
        return new SystemMessage({ content, id: msg.id })
      default:
        return new HumanMessage({ content, id: msg.id })
    }
  })
}

// NOTE: The original buildSDA2SystemPrompt had the following agents HARDCODED:
// 1. Discovery Analyst Agent (Maria)
// 2. Product Advisory Agent (Paula)
// 3. Tech Advisory Agent (Wilson)
// 4. Backlog Engineer Agent (Roberto)
// 5. UX Advisor Agent (Sofia)
//
// NOW we get agents DYNAMICALLY from Cockpit:
// - Avanade Code Supervisor (VSCode + MCP Integration)
// - 6 team members including Sofia - UX Designer Specialist [DUAL-MODE AGENT]

/**
 * Stream SSE event to client
 */
function streamEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: {
    type: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }
) {
  const data = JSON.stringify(event)
  const message = `data: ${data}\n\n`
  controller.enqueue(encoder.encode(message))
}

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(req: NextRequest) {
  console.log('📨 [SDA2-BFF] Received request (LangGraph mode)')

  try {
    // Parse request body
    const input = (await req.json()) as RunAgentInput

    console.log('📋 [SDA2-BFF] Request:', {
      runId: input.runId,
      threadId: input.threadId,
      messagesCount: input.messages.length,
      context: input.context?.map(c => c.key),
      forwardedProps: input.forwardedProps
        ? Object.keys(input.forwardedProps)
        : [],
    })

    // Validate Azure OpenAI configuration
    if (!process.env.AZURE_RESOURCE_NAME || !process.env.AZURE_OPENAI_API_KEY) {
      console.error('❌ [SDA2-BFF] Azure OpenAI credentials not configured')
      return new Response(
        JSON.stringify({
          error:
            'Azure OpenAI is not configured. Please set AZURE_RESOURCE_NAME and AZURE_OPENAI_API_KEY.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Setup Azure OpenAI
    const azureInstance = process.env.AZURE_RESOURCE_NAME
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5'
    const azureApiVersion =
      process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'

    // Note: Some models (like o1, gpt-4.1, gpt-5.1) don't support the legacy
    // "max_tokens" parameter — they require "max_completion_tokens" instead.
    //
    // 🔧 FIX 2026-03-09: Set max output tokens to prevent Azure's default 4096
    // limit from truncating long artifact content during AI edits.
    // 16384 allows ~12K words which covers large PRDs, architectures, etc.
    //
    // We use modelKwargs to pass "max_completion_tokens" directly, which the
    // newer models accept. This avoids the "Unsupported parameter: max_tokens"
    // error from gpt-5.1 and similar models.
    const maxOutputTokens = parseInt(
      process.env.AZURE_OPENAI_MAX_OUTPUT_TOKENS || '16384',
      10
    )
    const model = new AzureChatOpenAI({
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureOpenAIApiInstanceName: azureInstance,
      azureOpenAIApiDeploymentName: azureDeployment,
      azureOpenAIApiVersion: azureApiVersion,
      streaming: true,
      modelKwargs: {
        max_completion_tokens: maxOutputTokens,
      },
    })

    console.log('🤖 [SDA2-BFF] Azure OpenAI configured:', {
      instance: azureInstance,
      deployment: azureDeployment,
      apiVersion: azureApiVersion,
      maxOutputTokens,
    })

    // =========================================================================
    // Fetch agent instructions from Cockpit via MCP
    // =========================================================================
    const mcpHeaders = input.forwardedProps?.mcpHeaders

    // IMPORTANTE: Ignoramos mcpServerUrl e utilityAgentId do client.
    // O client envia valores NEXT_PUBLIC_* que são baked em build-time pelo webpack,
    // portanto sempre refletem o ambiente de BUILD (geralmente PRD fallback),
    // não o ambiente de RUNTIME (dev, stg, prd). Usamos valores server-side via getServerEnv().
    const clientAgentId = input.forwardedProps?.utilityAgentId

    console.log('🎯 [SDA2-BFF] Agent selection:', {
      clientAgentId,
      serverDefault: SUPERVISOR_ID_DEFAULT,
      usingServerDefault: true,
      supervisorName: input.forwardedProps?.supervisorName,
    })

    // Sempre usar SUPERVISOR_ID_DEFAULT (NEXT_PUBLIC_MCP_UTILITY_AGENT_ID) do server.
    // O client não sabe qual agent ID usar por ambiente (build-time vs runtime).
    const agentCard = await fetchAgentInstructions(
      mcpHeaders,
      undefined, // mcpServerUrl ignorado - usa MCP_SERVER_URL server-side
      undefined // utilityAgentId ignorado - usa SUPERVISOR_ID_DEFAULT
    )

    if (!agentCard || !agentCard.instructions) {
      console.error(
        '❌ [SDA2-BFF] COCKPIT UNAVAILABLE - No agent card fetched!'
      )
      return new Response(
        JSON.stringify({
          error: 'Cockpit MCP is unavailable. Please check MCP connection.',
          details: 'Agent card could not be fetched from Cockpit MCP Server',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('🎯 [SDA2-BFF] Agent card fetched:', {
      name: agentCard.name,
      teamMembersCount: agentCard.teamMembers?.length || 0,
    })

    // Extract project context
    const projectContext = {
      projectId:
        (input.context?.find(c => c.key === 'projeto_id')?.value as string) ||
        '',
      projectName:
        (input.context?.find(c => c.key === 'projeto_nome')?.value as string) ||
        '',
      conversationId:
        (input.context?.find(c => c.key === 'conversa_id')?.value as string) ||
        input.threadId,
    }

    // Convert messages
    const messages = convertMessages(input.messages)

    // =========================================================================
    // Validate team members from MCP
    // =========================================================================
    if (!agentCard.teamMembers || agentCard.teamMembers.length === 0) {
      console.error('❌ [SDA2-BFF] No team members in agent card!')
      return new Response(
        JSON.stringify({
          error: 'No team members configured in Cockpit',
          details:
            'Agent card has no team members. Please configure team in Cockpit.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // =========================================================================
    // LangGraph Multi-Agent Supervisor
    // =========================================================================
    console.log('🚀 [SDA2-BFF] Using LangGraph Supervisor mode')

    // Extract RAG config from Knowledge agent (if present in team)
    const ragSearchConfig = extractKnowledgeAgentConfig(agentCard.teamMembers)
    if (ragSearchConfig) {
      console.log('🔍 [SDA2-BFF] RAG config extracted from Knowledge agent:', {
        endpoint: ragSearchConfig.azure_search_endpoint,
        indexName: ragSearchConfig.index_name,
        hasKey: !!ragSearchConfig.azure_search_key,
      })
    } else {
      console.log(
        '📭 [SDA2-BFF] No RAG config found - Knowledge agent not in team or missing config'
      )
    }

    // =========================================================================
    // 🔍 RAG: Buscar contexto ANTES de acionar a LLM
    // =========================================================================
    let ragContextMessage: SystemMessage | null = null

    // =========================================================================
    // FEATURE FLAG: RAG_ENABLED
    // Se RAG_ENABLED=false, pula a busca RAG silenciosamente
    // Para reativar: definir RAG_ENABLED=true no .env.local
    // =========================================================================
    const ragEnabledValue = process.env.RAG_ENABLED ?? 'false'
    const isRagEnabled = ragEnabledValue === 'true'

    if (!isRagEnabled) {
      console.log(
        '⏸️ [SDA2-BFF] RAG desativado (RAG_ENABLED=false) - busca ignorada'
      )
    } else if (ragSearchConfig) {
      try {
        // Pegar a última mensagem do usuário para usar como query
        const lastUserMessage = input.messages
          .filter(m => m.role === 'user')
          .pop()

        if (lastUserMessage?.content) {
          const userQuery =
            typeof lastUserMessage.content === 'string'
              ? lastUserMessage.content
              : JSON.stringify(lastUserMessage.content)

          console.log(
            `🔍 [SDA2-BFF] RAG Search: Buscando contexto para: "${userQuery.substring(0, 80)}..."`
          )
          console.log(
            `🏷️ [SDA2-BFF] RAG Search: Filtro de projeto: ${projectContext.projectId || 'nenhum'}`
          )

          // Buscar no Azure AI Search
          const ragResults = await searchKnowledgeBase(userQuery, {
            searchConfig: ragSearchConfig,
            topK: 5,
            feedbackFilter: 'positive', // Apenas documentos aceitos
            searchType: 'hybrid',
            projectIdFilter: projectContext.projectId || undefined, // Filtrar por projeto
          })

          // Log detalhado dos resultados RAG no BFF
          console.log(
            `\n🔎 [SDA2-BFF] ========== RAG SEARCH RESULTS ==========`
          )
          console.log(
            `📊 [SDA2-BFF] Query utilizada: "${userQuery.substring(0, 150)}"`
          )
          console.log(
            `📊 [SDA2-BFF] Total de documentos retornados: ${ragResults.length}`
          )

          if (ragResults.length > 0) {
            ragResults.forEach((doc, idx) => {
              console.log(`\n📄 [SDA2-BFF] Doc ${idx + 1}: ${doc.title}`)
              console.log(
                `   📁 Tipo: ${doc.artifactType} | 🤖 Agente: ${doc.agentName}`
              )
              console.log(`   ⭐ Score: ${(doc.score * 100).toFixed(2)}%`)
              console.log(`   📝 Preview: ${doc.content?.substring(0, 150)}...`)
            })

            // Formatar resultados para incluir no contexto
            const ragContext = formatRAGResultsForPrompt(ragResults)
            console.log(
              `\n✅ [SDA2-BFF] RAG: ${ragResults.length} documentos formatados para contexto LLM`
            )
            console.log(
              `📏 [SDA2-BFF] Tamanho do contexto RAG: ${ragContext.length} caracteres`
            )
            console.log(
              `🔎 [SDA2-BFF] ==========================================\n`
            )

            // Criar mensagem de sistema com contexto RAG
            ragContextMessage = new SystemMessage(
              `## 📚 Contexto da Base de Conhecimento

Os seguintes documentos foram encontrados na base de conhecimento do projeto e podem ser úteis para responder:

${ragContext}

---
Use estas informações para fundamentar sua resposta quando relevante. Se nenhum documento for diretamente relevante, ignore e responda normalmente.`
            )
          } else {
            console.log(
              '📭 [SDA2-BFF] RAG: Nenhum documento relevante encontrado'
            )
          }
        }
      } catch (ragError) {
        // RAG é opcional - não bloqueia o fluxo se falhar
        console.warn(
          '⚠️ [SDA2-BFF] RAG Search falhou (continuando sem contexto):',
          ragError instanceof Error ? ragError.message : ragError
        )
      }
    }

    // Convert agent card to MCPAgentCard format
    // IMPORTANTE: Incluir o campo instruction enriquecido via get_utility_agent_by_id
    const mcpAgentCard: MCPAgentCard = {
      name: agentCard.name,
      description: agentCard.description,
      instructions: agentCard.instructions,
      teamMembers: agentCard.teamMembers?.map(m => ({
        name: m.name,
        role: m.role,
        specialty: m.specialty,
        instruction: m.instruction,
      })),
    }

    // Create LangGraph supervisor dynamically from MCP data
    const { supervisor, agentCount, agentNames } = await createSDA2Supervisor({
      agentCard: mcpAgentCard,
      model,
      enableMemory: true,
      projectContext,
    })

    console.log(
      `🤖 [SDA2-BFF] LangGraph Supervisor created with ${agentCount} agents:`,
      agentNames
    )

    // Create streaming response with LangGraph using streamMode: "messages"
    // This enables token-by-token streaming for better UX
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          // Send RUN_START event
          streamEvent(controller, encoder, {
            type: 'RUN_START',
            runId: input.runId,
          })

          // Send RAG_CONFIG event if Knowledge agent config was extracted
          // This allows frontend to use dynamic Azure Search config for indexing
          if (ragSearchConfig) {
            streamEvent(controller, encoder, {
              type: 'RAG_CONFIG',
              config: ragSearchConfig,
            })
            console.log('📤 [SDA2-BFF] Sent RAG_CONFIG event to frontend')
          }

          // =========================================================================
          // 🚀 TOKEN-BY-TOKEN STREAMING usando stream() com streamMode: "messages"
          // Referência: https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens
          // =========================================================================
          let fullResponse = ''
          let currentAgent = 'supervisor'
          let specialistHasArtifactMetadata = false

          // 🔧 FIX: Track specialist responses to prevent duplication from multiple agents
          let specialistHasResponded = false // True after any specialist sends meaningful content
          let primarySpecialist = '' // First specialist that responded with content
          const SPECIALIST_MIN_CONTENT_LENGTH = 500 // Threshold to consider "meaningful content"

          // 🔧 FIX 2026-01-21 (v2): Flag to stop streaming when [FIM] marker is detected
          let documentComplete = false

          // 🔧 FIX 2026-01-21 (v3): AbortController to actually CANCEL the LangGraph stream
          // Previously, we just stopped processing but LLM continued generating in background
          // Now we abort the stream entirely, stopping generation at the source
          const streamAbortController = new AbortController()

          // 🔧 FIX 2026-03-06: DuplicateDetector to handle model-level question duplication
          // The model sometimes repeats the same question twice due to long prompts with
          // many example questions in Cockpit instructions (checklists marked with ✅)
          //
          // 🔧 FIX 2026-03-09: Detect edit-mode requests from the user message.
          // Edit prompts built by buildEditPrompt() contain "MODO DE EDIÇÃO" — when
          // present, we force document mode so the DuplicateDetector never truncates
          // the response at the first "?" character (which is common in artifact
          // content like "## 1. O que é o produto?").
          const lastUserMsg = input.messages
            .filter(m => m.role === 'user')
            .pop()
          const isEditRequest =
            !!lastUserMsg &&
            typeof lastUserMsg.content === 'string' &&
            lastUserMsg.content.includes('MODO DE EDIÇÃO')
          const duplicateDetector = new DuplicateDetector(isEditRequest)

          console.log(
            '🚀 [SDA2-BFF] Starting stream with streamMode: "messages" for real-time token streaming...'
          )

          // Preparar mensagens com contexto RAG (se disponível)
          // O contexto RAG é inserido ANTES das mensagens para enriquecer o prompt
          const messagesWithContext: BaseMessage[] = ragContextMessage
            ? [ragContextMessage, ...messages]
            : messages

          if (ragContextMessage) {
            console.log(
              '📚 [SDA2-BFF] RAG context added to messages (total:',
              messagesWithContext.length,
              ')'
            )
          }

          // Use stream() with streamMode: "messages" for direct LLM token streaming
          const messageStream = await supervisor.stream(
            { messages: messagesWithContext },
            {
              streamMode: 'messages',
              configurable: {
                thread_id: input.threadId,
              },
              signal: streamAbortController.signal, // 🔧 FIX: Pass abort signal to cancel stream
            }
          )

          for await (const streamOutput of messageStream) {
            // 🔧 FIX: Exit loop if document is complete
            if (documentComplete) {
              console.log(
                `⏭️ [SDA2-BFF] Document already complete, ignoring remaining stream`
              )
              break
            }

            // streamMode: "messages" returns [message, metadata] tuples

            const [message, metadata] = streamOutput as [
              any,
              { langgraph_node?: string },
            ]

            // 🔧 FIX: Process AI messages but detect and skip duplicate complete messages
            // streamMode: "messages" can emit:
            // - AIMessageChunk: incremental streaming tokens (what we want) - _getType() returns 'ai'
            // - HumanMessage: user messages (skip) - _getType() returns 'human'
            // - AIMessage: complete messages at the end (would duplicate chunks!) - _getType() returns 'ai'
            //
            // The issue: Both AIMessage and AIMessageChunk return 'ai' from _getType()
            // We need to check lc_id to differentiate: AIMessageChunk has lc_id[2] = 'AIMessageChunk'
            const messageType = message?._getType?.()
            const lcId = message?.lc_id?.[2] // 'AIMessageChunk' or 'AIMessage'
            const isAIMessageChunk = lcId === 'AIMessageChunk'
            const isAIMessage = messageType === 'ai' && !isAIMessageChunk

            // Debug log to understand what message types we're receiving
            console.log(
              `📨 [SDA2-BFF] Message from "${metadata?.langgraph_node || 'unknown'}": type=${messageType}, lc_id=${lcId}, isChunk=${isAIMessageChunk}, contentLen=${message?.content?.length || 0}, preview="${String(
                message?.content || ''
              )
                .substring(0, 50)
                .replace(/\n/g, ' ')}..."`
            )

            // Skip non-AI messages (like HumanMessage)
            if (messageType !== 'ai') {
              console.log(
                `⏭️ [SDA2-BFF] Skipping non-AI message type "${messageType}"`
              )
              continue
            }

            // 🔧 CRITICAL: Skip complete AIMessage if we already streamed chunks
            // AIMessage (not chunk) at the end duplicates all content we already streamed
            if (isAIMessage && fullResponse.length > 0) {
              console.log(
                `⏭️ [SDA2-BFF] Skipping complete AIMessage (${message?.content?.length || 0} chars) - already streamed ${fullResponse.length} chars to prevent duplication`
              )
              continue
            }

            // Track agent transitions
            const nodeAgent = metadata?.langgraph_node as string
            if (nodeAgent && nodeAgent !== currentAgent) {
              console.log(
                `🔄 [SDA2-BFF] Agent transition: ${currentAgent} → ${nodeAgent}`
              )

              // 🔍 DEBUG: Log when we're switching BACK to supervisor after a specialist
              if (
                currentAgent !== 'supervisor' &&
                nodeAgent === 'supervisor' &&
                specialistHasArtifactMetadata
              ) {
                console.log(
                  `⚠️ [SDA2-BFF] WARNING: Supervisor is responding AFTER specialist already generated document!`
                )
                console.log(
                  `   This may cause duplication. Current fullResponse length: ${fullResponse.length}`
                )
              }

              currentAgent = nodeAgent

              // 🔧 FIX: Check if a specialist has already responded with significant content
              // If a NEW specialist is trying to respond after we already have content, skip it
              if (
                nodeAgent !== 'supervisor' &&
                !primarySpecialist &&
                fullResponse.length >= SPECIALIST_MIN_CONTENT_LENGTH
              ) {
                primarySpecialist = currentAgent
                specialistHasResponded = true
                console.log(
                  `✅ [SDA2-BFF] Primary specialist identified: "${primarySpecialist}" (${fullResponse.length} chars already streamed)`
                )
              }
            }

            // Extract content from the AIMessageChunk
            let tokenContent = ''

            // Handle different message content formats
            if (message.content) {
              if (typeof message.content === 'string') {
                tokenContent = message.content
              } else if (Array.isArray(message.content)) {
                // Handle content blocks (e.g., from Claude or structured responses)
                for (const block of message.content) {
                  if (typeof block === 'string') {
                    tokenContent += block
                  } else if (typeof block === 'object' && block !== null) {
                    const blockObj = block as { text?: string; type?: string }
                    if (blockObj.text) {
                      tokenContent += blockObj.text
                    }
                  }
                }
              }
            }

            // Stream non-empty tokens to the client immediately
            if (tokenContent.length > 0) {
              // Skip handoff messages
              if (!isHandoffMessage(tokenContent)) {
                // Check for ARTIFACT_METADATA in streaming content (do this before deciding to skip)
                if (
                  tokenContent.includes('ARTIFACT_METADATA') ||
                  fullResponse.includes('ARTIFACT_METADATA')
                ) {
                  specialistHasArtifactMetadata = true
                }

                // 🔧 ENHANCED: Also detect structured documents without ARTIFACT_METADATA
                // Some agents may not include the metadata comment but still generate valid documents
                // Detect by looking for document patterns in specialist responses
                if (
                  !specialistHasArtifactMetadata &&
                  currentAgent !== 'supervisor' &&
                  isStructuredDocument(fullResponse)
                ) {
                  specialistHasArtifactMetadata = true
                  console.log(
                    `🔍 [SDA2-BFF] Detected structured document from "${currentAgent}" without ARTIFACT_METADATA`
                  )
                }

                // 🔧 FIX 2026-01-21 (v2): Detect [FIM] marker to stop processing
                // When agent writes <!-- [FIM] -->, document is complete - stop accepting more content
                const hasEndMarker =
                  fullResponse.includes('<!-- [FIM] -->') ||
                  tokenContent.includes('<!-- [FIM] -->')

                if (hasEndMarker && !fullResponse.includes('<!-- [FIM] -->')) {
                  // The [FIM] marker is in this chunk - add content up to the marker
                  const markerIndex = tokenContent.indexOf('<!-- [FIM] -->')
                  const contentBeforeMarker =
                    tokenContent.substring(0, markerIndex) + '<!-- [FIM] -->'
                  fullResponse += contentBeforeMarker

                  streamEvent(controller, encoder, {
                    type: 'TEXT_MESSAGE_CONTENT',
                    delta: contentBeforeMarker,
                    messageId: generateId(),
                    agentName: currentAgent,
                  })

                  console.log(
                    `🛑 [SDA2-BFF] Document complete - [FIM] marker detected. ABORTING stream to stop LLM generation.`
                  )

                  // 🔧 FIX 2026-01-21 (v3): Actually abort the stream to stop LLM from generating more
                  // This is the key fix - previously we just stopped processing but LLM continued
                  documentComplete = true
                  streamAbortController.abort(
                    'Document complete - [FIM] marker detected'
                  )
                  break // Exit loop immediately
                }

                // If we already have [FIM] in fullResponse, abort and exit
                if (
                  fullResponse.includes('<!-- [FIM] -->') ||
                  documentComplete
                ) {
                  console.log(
                    `⏭️ [SDA2-BFF] Ignoring content after [FIM] marker (${tokenContent.length} chars)`
                  )
                  // 🔧 FIX 2026-01-21 (v4): Ensure abort is called even if [FIM] was detected in previous chunk
                  // The async iterator may continue yielding chunks after break, so we need to abort here too
                  if (!documentComplete) {
                    documentComplete = true
                    console.log(
                      `🛑 [SDA2-BFF] Late [FIM] detection - ABORTING stream now`
                    )
                    streamAbortController.abort(
                      'Document complete - [FIM] marker detected (late)'
                    )
                  }
                  break // Exit loop - don't just continue
                }

                // 🔧 FIX: Skip supervisor messages when specialist already sent structured document
                // This prevents the supervisor from adding a duplicate summary after the agent's document
                if (
                  currentAgent === 'supervisor' &&
                  specialistHasArtifactMetadata
                ) {
                  console.log(
                    `⏭️ [SDA2-BFF] Skipping supervisor response (${tokenContent.length} chars) - specialist already sent structured document`
                  )
                  continue
                }

                // 🔧 FIX: Skip secondary specialist responses to prevent duplication
                // If a primary specialist has already responded with significant content,
                // skip any subsequent specialist responses (including from the same agent)
                if (
                  currentAgent !== 'supervisor' &&
                  specialistHasResponded &&
                  primarySpecialist &&
                  currentAgent !== primarySpecialist
                ) {
                  console.log(
                    `⏭️ [SDA2-BFF] Skipping secondary specialist "${currentAgent}" response (${tokenContent.length} chars) - primary specialist "${primarySpecialist}" already responded`
                  )
                  continue
                }

                // 🔧 FIX 2026-03-06: Filter duplicate content before sending
                // This handles cases where the model repeats the same question twice
                const filteredContent =
                  duplicateDetector.filterDuplicate(tokenContent)
                if (!filteredContent) {
                  // Content was detected as duplicate, skip sending
                  continue
                }

                // 🔧 FIX: Mark when specialist has responded with meaningful content
                if (
                  currentAgent !== 'supervisor' &&
                  !specialistHasResponded &&
                  fullResponse.length + filteredContent.length >=
                    SPECIALIST_MIN_CONTENT_LENGTH
                ) {
                  primarySpecialist = currentAgent
                  specialistHasResponded = true
                  console.log(
                    `✅ [SDA2-BFF] Primary specialist identified: "${primarySpecialist}" (reaching ${fullResponse.length + filteredContent.length} chars)`
                  )
                }

                fullResponse += filteredContent

                // Send token to client immediately - this is the key for real-time feedback
                streamEvent(controller, encoder, {
                  type: 'TEXT_MESSAGE_CONTENT',
                  delta: filteredContent,
                  messageId: generateId(),
                  agentName: currentAgent,
                })
              }
            }
          }

          // Log summary of responses
          const duplicateStats = duplicateDetector.getStats()
          console.log('═'.repeat(70))
          console.log('📊 [SDA2-BFF] STREAMING RESPONSE ANALYSIS:')
          console.log(`  - Total response length: ${fullResponse.length}`)
          console.log(
            `  - Has ARTIFACT_METADATA: ${specialistHasArtifactMetadata}`
          )
          console.log(
            `  - Document complete ([FIM] detected): ${documentComplete}`
          )
          console.log(`  - Primary specialist: ${primarySpecialist || 'none'}`)
          console.log(`  - Specialist has responded: ${specialistHasResponded}`)
          console.log(`  - Last agent: ${currentAgent}`)
          console.log(
            `  - Duplicate detector: ${duplicateStats.fullLength} chars, questionSent=${duplicateStats.questionSent}, isDocument=${duplicateStats.isDocument}`
          )
          console.log('═'.repeat(70))

          console.log('✅ [SDA2-BFF] Token streaming completed:', {
            length: fullResponse.length,
            preview: fullResponse.substring(0, 100),
            hasArtifactMetadata: fullResponse.includes('ARTIFACT_METADATA'),
            hasEndMarker: fullResponse.includes('<!-- [FIM] -->'),
            wasAborted: documentComplete,
          })

          // Send RUN_END event
          streamEvent(controller, encoder, {
            type: 'RUN_END',
            runId: input.runId,
          })

          // Send [DONE] marker
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (error) {
          // 🔧 FIX: Handle abort errors gracefully - they're expected when [FIM] is detected
          const isAbortError =
            error instanceof Error &&
            (error.name === 'AbortError' ||
              error.message.includes('aborted') ||
              error.message.includes('[FIM]'))

          if (isAbortError) {
            console.log(
              '✅ [SDA2-BFF] Stream aborted successfully (document complete)'
            )
            // Send RUN_END even for aborted streams
            streamEvent(controller, encoder, {
              type: 'RUN_END',
              runId: input.runId,
            })
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          } else {
            console.error('❌ [SDA2-BFF] LangGraph streaming error:', error)
            streamEvent(controller, encoder, {
              type: 'RUN_ERROR',
              runId: input.runId,
              message: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('❌ [SDA2-BFF] Fatal error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
