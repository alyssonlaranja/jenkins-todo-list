// src/core/types.ts

import { z } from 'zod'

/**
 * MCP Transport Configuration (protocol standard)
 */
export const McpStdioTransportSchema = z.object({
  type: z.literal('stdio'),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
})

export const McpSseTransportSchema = z.object({
  type: z.literal('sse'),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
})

export const McpHttpTransportSchema = z.object({
  type: z.literal('http'),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
})

export const McpTransportConfigSchema = z.discriminatedUnion('type', [
  McpStdioTransportSchema,
  McpSseTransportSchema,
  McpHttpTransportSchema,
])

export type McpTransportConfig = z.infer<typeof McpTransportConfigSchema>

/**
 * Tool Instruction
 */
export const ToolInstructionSchema = z.object({
  instruction: z.string(),
})

export type ToolInstruction = z.infer<typeof ToolInstructionSchema>

/**
 * MCP Slot Definition (user input)
 */
export const McpSlotDefinitionSchema = z.object({
  transport: McpTransportConfigSchema,
  instruction: z.string(),
  includeTools: z.array(z.string()).optional(),
  excludeTools: z.array(z.string()).optional(),
  toolInstructions: z.record(z.string(), ToolInstructionSchema).optional(),
})

export type McpSlotDefinition = z.infer<typeof McpSlotDefinitionSchema>

/**
 * Discovered Tool (from MCP handshake)
 */
export interface DiscoveredTool {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
}

/**
 * Connected Slot (after handshake)
 */
export interface ConnectedSlot extends McpSlotDefinition {
  slotName: string
  serverName: string
  serverVersion: string
  tools: DiscoveredTool[]
  allTools: DiscoveredTool[]
  status: 'connected' | 'error'
  error?: string
}

/**
 * Job Status
 */
export type JobStatus =
  | 'pending'
  | 'connecting'
  | 'generating'
  | 'saving'
  | 'completed'
  | 'failed'
  | 'cancelled'

/**
 * Job Progress
 */
export interface JobProgress {
  phase: string
  filesGenerated: string[]
  currentFile?: string
  progress?: number
  status?: string
  lastUpdate?: string
}

/**
 * Job Result
 */
export interface JobResult {
  projectId: string
  storageSlot: string
  files: string[]
  durationMs: number
}

/**
 * Job Error
 */
export interface JobError {
  phase: string
  message: string
}

/**
 * Job
 */
export interface Job {
  id: string
  status: JobStatus
  projectName: string
  description: string
  slots: Record<string, McpSlotDefinition>
  storageSlot: string
  playgroundId?: string // Optional playground ID for folder isolation
  progress?: JobProgress
  result?: JobResult
  error?: JobError
  createdAt: Date
  updatedAt: Date
}

/**
 * Create Project Input
 */
export const CreateProjectInputSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  slots: z.record(z.string(), McpSlotDefinitionSchema),
  storageSlot: z.string().optional().default('storage'),
})

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>
