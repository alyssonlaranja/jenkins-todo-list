// src/core/generator.ts

import fs from 'fs/promises'
import os from 'os'
import path from 'path'

import { query } from '@anthropic-ai/claude-agent-sdk'

import { jobManager } from './jobs.js'
import { buildSystemPrompt, buildUserPrompt } from './prompt-builder.js'
import { SlotManager } from './slots.js'
import type { ConnectedSlot, Job, McpTransportConfig } from './types.js'

interface GeneratorConfig {
  model: string
  maxTurns: number
  maxBudgetUsd: number
  anthropicBaseUrl?: string
  anthropicApiKey?: string
}

interface GeneratorMessage {
  type: string
  tool_name?: string
  tool_input?: Record<string, unknown>
  message?: { content: Array<{ type: string; text?: string }> }
  subtype?: string
  duration_ms?: number
  total_cost_usd?: number
}

/**
 * Generator Engine - orchestrates project generation
 */
export class Generator {
  private config: GeneratorConfig
  private slotManager: SlotManager

  constructor(config: GeneratorConfig) {
    this.config = config
    this.slotManager = new SlotManager()
  }

  /**
   * Run a generation job
   */
  async runJob(job: Job): Promise<void> {
    const startTime = performance.now()

    try {
      // Phase 1: Connect to slots
      jobManager.updateStatus(job.id, 'connecting')
      jobManager.updateProgress(job.id, { phase: 'Connecting to MCP slots...' })

      const connectedSlots = await this.slotManager.connectAll(job.slots)

      // Check for connection errors
      const errors = Object.entries(connectedSlots)
        .filter(([_, slot]) => slot.status === 'error')
        .map(([name, slot]) => `${name}: ${slot.error}`)

      if (errors.length > 0) {
        throw new Error(`Failed to connect to slots: ${errors.join(', ')}`)
      }

      // Phase 2: Generate with Claude
      jobManager.updateStatus(job.id, 'generating')
      jobManager.updateProgress(job.id, {
        phase: 'Generating code with Claude...',
      })

      const filesGenerated = await this.generate(job, connectedSlots)

      // Phase 3: Mark as completed
      const durationMs = performance.now() - startTime

      jobManager.completeJob(job.id, {
        projectId: job.projectName,
        storageSlot: job.storageSlot,
        files: filesGenerated,
        durationMs,
      })
    } catch (error) {
      const phase = jobManager.getJob(job.id)?.progress?.phase || 'Unknown'
      jobManager.failJob(job.id, {
        phase,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      await this.slotManager.disconnectAll()
    }
  }

  /**
   * Generate project using Claude Agent SDK
   */
  private async generate(
    job: Job,
    connectedSlots: Record<string, ConnectedSlot>
  ): Promise<string[]> {
    // Create temp directory
    const tempDir = path.join(os.tmpdir(), 'mcp-builder', job.id)
    await fs.mkdir(tempDir, { recursive: true })

    const systemPrompt = buildSystemPrompt(connectedSlots)
    const hasSlots = Object.keys(connectedSlots).length > 0
    const userPrompt = buildUserPrompt(
      job.projectName,
      job.description,
      job.storageSlot,
      hasSlots
    )

    const mcpServers = this.slotManager.getMcpServersForSdk()
    const filesGenerated: string[] = []

    try {
      const result = query({
        prompt: userPrompt,
        options: {
          model: this.config.model,
          cwd: tempDir,
          tools: ['Write', 'Edit', 'Read', 'Bash', 'Glob'],
          permissionMode: 'acceptEdits',
          systemPrompt,
          maxTurns: this.config.maxTurns,
          maxBudgetUsd: this.config.maxBudgetUsd,
          mcpServers:
            Object.keys(mcpServers).length > 0 ? mcpServers : undefined,
          env: {
            ...process.env,
            ANTHROPIC_BASE_URL: this.config.anthropicBaseUrl || '',
            ANTHROPIC_API_KEY: this.config.anthropicApiKey || '',
          },
        },
      })

      for await (const message of result as AsyncIterable<GeneratorMessage>) {
        // Check if job was cancelled
        const currentJob = jobManager.getJob(job.id)
        if (currentJob?.status === 'cancelled') {
          break
        }

        // Debug: log all message types
        if (process.env.DEBUG_GENERATOR) {
          console.log(
            `[Generator] Message: ${message.type}`,
            JSON.stringify(message).slice(0, 200)
          )
        }

        // Track file writes - check multiple event types
        if (message.type === 'tool_use' || message.type === 'tool_result') {
          const toolName =
            message.tool_name || (message as unknown as { name?: string }).name
          const toolInput =
            message.tool_input ||
            (message as unknown as { input?: Record<string, unknown> }).input

          if ((toolName === 'Write' || toolName === 'write') && toolInput) {
            const filePath = (toolInput.file_path || toolInput.path) as string
            if (filePath && !filesGenerated.includes(filePath)) {
              const relativePath = filePath.startsWith(tempDir)
                ? filePath.replace(tempDir + '/', '')
                : filePath
              filesGenerated.push(relativePath)

              jobManager.updateProgress(job.id, {
                phase: 'Generating code with Claude...',
                filesGenerated,
                currentFile: relativePath,
              })
            }
          }
        }
      }
    } finally {
      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true })
    }

    return filesGenerated
  }
}

/**
 * Create generator with default config from environment
 */
export function createGenerator(): Generator {
  return new Generator({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    maxTurns: 50,
    maxBudgetUsd: 5.0,
    anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  })
}
