// src/core/generator.ts

/**
 * MCP Builder Generator using DeepAgents
 *
 * This generator uses DeepAgents with FilesystemBackend to create
 * MCP server projects. It replaces the Claude Agent SDK approach
 * with a LangGraph-based agent.
 */

import * as fs from 'fs/promises'
import * as path from 'path'

import { AzureChatOpenAI } from '@langchain/openai'
import { createDeepAgent, FilesystemBackend } from 'deepagents'

import { jobManager } from './jobs.js'
import { createMcpSlotTools } from './mcp-slots-middleware.js'
import { ArtifactPersistenceMiddleware } from './middlewares/artifact-persistence-middleware.js'
import {
  CanvasStreamingMiddleware,
  type CanvasArtifact,
} from './middlewares/canvas-streaming-middleware.js'
import { buildSystemPrompt, buildUserPrompt } from './prompt-builder.js'
import { SlotManager } from './slots.js'
import type { ConnectedSlot, Job } from './types.js'

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratorConfig {
  /**
   * Azure OpenAI deployment name
   * @default process.env.AZURE_OPENAI_DEPLOYMENT_NAME
   */
  azureDeploymentName?: string

  /**
   * Azure OpenAI API key
   * @default process.env.AZURE_OPENAI_API_KEY
   */
  azureApiKey?: string

  /**
   * Azure OpenAI resource name
   * @default process.env.AZURE_RESOURCE_NAME
   */
  azureResourceName?: string

  /**
   * Azure OpenAI API version
   * @default process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'
   */
  azureApiVersion?: string

  /**
   * Temperature for generation
   * @default 0.3
   */
  temperature?: number

  /**
   * Base directory for generated projects
   * @default process.cwd() + '/generated'
   */
  outputBaseDir?: string

  /**
   * Optional MCP callTool function for artifact persistence
   * This should come from useProxyMCP or similar MCP session
   */
  callTool?: (toolName: string, args: any) => Promise<any>

  /**
   * Enable artifact persistence via MCP
   * @default false (only enable when callTool is provided)
   */
  enableArtifactPersistence?: boolean

  /**
   * Canvas integration callback for real-time file display
   * This callback is called for each generated file to display in Canvas
   */
  onAddArtifact?: (artifact: CanvasArtifact) => void

  /**
   * Playground ID for artifact key generation
   */
  playgroundId?: string
}

// ============================================================================
// MODEL FACTORY
// ============================================================================

/**
 * Create Azure OpenAI model instance
 * Following the pattern from existing deep agents
 */
function createAzureModel(config: RequiredGeneratorConfig) {
  return new AzureChatOpenAI({
    azureOpenAIApiDeploymentName: config.azureDeploymentName,
    azureOpenAIApiKey: config.azureApiKey,
    azureOpenAIApiInstanceName: config.azureResourceName,
    azureOpenAIApiVersion: config.azureApiVersion,
    temperature: config.temperature,
  })
}

// ============================================================================
// GENERATOR CLASS
// ============================================================================

/**
 * MCP Builder Generator
 *
 * Uses DeepAgents with:
 * - FilesystemBackend for writing generated files
 * - MCP slot tools for accessing external MCP servers
 * - AzureChatOpenAI as the LLM
 *
 * @example
 * ```typescript
 * const generator = createGenerator({
 *   azureDeploymentName: 'gpt-4o',
 * });
 *
 * const job = jobManager.createJob(
 *   'my-mcp-server',
 *   'A PostgreSQL MCP server',
 *   slots,
 *   'storage'
 * );
 *
 * await generator.runJob(job);
 * ```
 */
// Custom type for required config (handles optional callTool, onAddArtifact and playgroundId)
type RequiredGeneratorConfig = Required<
  Omit<GeneratorConfig, 'callTool' | 'onAddArtifact' | 'playgroundId'>
> & {
  callTool?: (toolName: string, args: any) => Promise<any>
  onAddArtifact?: (artifact: CanvasArtifact) => void
  playgroundId?: string
}

export class Generator {
  private config: RequiredGeneratorConfig
  private slotManager: SlotManager

  constructor(config: GeneratorConfig = {}) {
    this.config = {
      azureDeploymentName:
        config.azureDeploymentName ||
        process.env.AZURE_OPENAI_DEPLOYMENT_NAME ||
        'gpt-4o',
      azureApiKey: config.azureApiKey || process.env.AZURE_OPENAI_API_KEY || '',
      azureResourceName:
        config.azureResourceName || process.env.AZURE_RESOURCE_NAME || '',
      azureApiVersion:
        config.azureApiVersion ||
        process.env.AZURE_OPENAI_API_VERSION ||
        '2025-01-01-preview',
      temperature: config.temperature ?? 0.3,
      outputBaseDir:
        config.outputBaseDir || path.join(process.cwd(), 'generated'),
      callTool: config.callTool,
      enableArtifactPersistence:
        config.enableArtifactPersistence ?? !!config.callTool,
      onAddArtifact: config.onAddArtifact,
      playgroundId: config.playgroundId,
    }

    this.slotManager = new SlotManager()
  }

  /**
   * Run a generation job
   */
  async runJob(job: Job): Promise<void> {
    const startTime = Date.now()

    try {
      // Phase 1: Connect to slots
      jobManager.updateStatus(job.id, 'connecting')
      jobManager.updateProgress(job.id, {
        phase: 'Connecting to MCP slots...',
        filesGenerated: [],
      })

      await this.slotManager.connectAll(job.slots)
      const connectedSlots = this.slotManager.getAllSlots()

      // Check for connection errors
      const errors = Object.entries(connectedSlots)
        .filter(([, slot]) => slot.status === 'error')
        .map(([name, slot]) => `${name}: ${slot.error}`)

      if (errors.length > 0) {
        throw new Error(`Failed to connect to slots: ${errors.join(', ')}`)
      }

      // Phase 2: Generate with DeepAgent
      jobManager.updateStatus(job.id, 'generating')
      jobManager.updateProgress(job.id, {
        phase: 'Generating MCP server code...',
        filesGenerated: [],
      })

      // Use playground-aware output directory
      const outputDir = job.playgroundId
        ? path.join(
            this.config.outputBaseDir,
            job.playgroundId,
            job.projectName
          )
        : path.join(this.config.outputBaseDir, job.projectName)

      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true })

      // Create and run the agent
      const files = await this.runAgent(job, connectedSlots, outputDir)

      // Phase 3: Complete
      jobManager.updateStatus(job.id, 'saving')
      jobManager.updateProgress(job.id, {
        phase: 'Finalizing...',
        filesGenerated: files,
      })

      const duration = Date.now() - startTime

      jobManager.completeJob(job.id, {
        projectId: job.id,
        storageSlot: job.storageSlot,
        files,
        durationMs: duration,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      jobManager.failJob(job.id, {
        phase: job.status,
        message: errorMessage,
      })

      throw error
    } finally {
      // Always disconnect from slots
      await this.slotManager.disconnectAll()
    }
  }

  /**
   * Run the DeepAgent to generate the MCP server
   */
  private async runAgent(
    job: Job,
    slots: Record<string, ConnectedSlot>,
    outputDir: string
  ): Promise<string[]> {
    console.log(`[DEBUG] Starting DeepAgent for job ${job.id}`)
    console.log(`[DEBUG] Output directory: ${outputDir}`)
    console.log(`[DEBUG] Azure config:`, {
      deployment: this.config.azureDeploymentName,
      resource: this.config.azureResourceName,
      hasApiKey: !!this.config.azureApiKey,
      temperature: this.config.temperature,
    })

    // Create the LLM model (following existing pattern)
    const model = createAzureModel(this.config)

    // Build prompts with sequential file writing instructions
    const baseSystemPrompt = buildSystemPrompt(slots)
    const hasCanvasTools = !!this.config.onAddArtifact

    const systemPrompt = `${baseSystemPrompt}

CRITICAL FILE WRITING RULES:
When creating multiple files, write them sequentially, one at a time, to avoid concurrent write conflicts.

Follow this exact order:
1. Create package.json first
2. Then tsconfig.json
3. Then .env.example
4. Then src/main.ts
5. Finally any additional files

Always complete one write_file operation before starting the next to prevent "LastValue can only receive one value per step" errors.

${
  hasCanvasTools
    ? `
CANVAS INTEGRATION:
You have access to the canvas_add_artifact tool! Use this tool to display generated files in the Canvas panel:

- ALWAYS use canvas_add_artifact for EACH file you create
- Call canvas_add_artifact IMMEDIATELY AFTER writing each file with write_file
- Set appropriate type: 'code', 'config', 'document', etc.
- Include the programming language (e.g. 'typescript', 'javascript')
- Use descriptive titles like "Main TypeScript file - main.ts"

Example workflow:
1. write_file with package.json content
2. canvas_add_artifact with package.json content (type: 'config')
3. write_file with src/main.ts content
4. canvas_add_artifact with main.ts content (type: 'code', language: 'typescript')

This ensures users can see all generated code in the Canvas panel immediately!`
    : ''
}`

    const hasSlots = Object.values(slots).some(s => s.status === 'connected')
    const userPrompt = buildUserPrompt(
      job.projectName,
      job.description,
      outputDir,
      hasSlots
    )

    console.log(`[DEBUG] System prompt length: ${systemPrompt.length}`)
    console.log(`[DEBUG] User prompt: ${userPrompt.substring(0, 200)}...`)

    // Create middleware array (don't add filesystem middleware - it's included by default)
    const middlewareArray = []

    // Add MCP slot middleware if we have connected slots
    if (Object.keys(slots).length > 0) {
      const mcpMiddleware = {
        name: 'McpSlotsMiddleware',
        tools: createMcpSlotTools({
          slots,
          slotManager: this.slotManager,
          prefixWithSlotName: true,
        }),
      }
      middlewareArray.push(mcpMiddleware)
      console.log(
        `[DEBUG] Added MCP middleware with ${mcpMiddleware.tools.length} tools`
      )
    }

    // Add artifact persistence middleware if configured
    if (this.config.enableArtifactPersistence && this.config.callTool) {
      const artifactMiddleware = new ArtifactPersistenceMiddleware({
        projectName: job.projectName,
        playgroundId: job.playgroundId,
        callTool: this.config.callTool,
        enabled: true,
      })
      middlewareArray.push(artifactMiddleware)
      console.log(`[DEBUG] Added artifact persistence middleware`)
    }

    // ALWAYS use createDeepAgent for file operations + Canvas integration
    let canvasStreamingMiddleware: CanvasStreamingMiddleware | null = null
    if (this.config.onAddArtifact || this.config.callTool) {
      // Add Canvas middleware for artifacts
      canvasStreamingMiddleware = new CanvasStreamingMiddleware({
        onAddArtifact: this.config.onAddArtifact,
        callTool: this.config.callTool,
        playgroundId: this.config.playgroundId,
        projectName: job.projectName,
        enabled: true,
      })
      middlewareArray.push(canvasStreamingMiddleware)
      console.log(
        `[DEBUG] Added Canvas middleware for artifact integration (${this.config.callTool ? 'platform' : 'SSE'} mode)`
      )
    }

    // ALWAYS use createDeepAgent with FilesystemBackend (includes write_file, read_file, etc.)
    console.log(
      `[DEBUG] Using createDeepAgent with FilesystemBackend + Canvas integration`
    )
    console.log(
      `[DEBUG] Middleware count: ${middlewareArray.length} (Canvas + any custom middleware)`
    )
    console.log(
      `[DEBUG] FilesystemBackend: enabled with write_file, read_file tools`
    )
    console.log(
      `[DEBUG] Canvas mode: ${this.config.callTool || this.config.onAddArtifact ? 'enabled' : 'disabled'}`
    )

    const agent = createDeepAgent({
      model,
      systemPrompt,
      middleware: middlewareArray,
      backend: _config =>
        new FilesystemBackend({
          rootDir: outputDir,
          virtualMode: true,
        }),
    })

    // Run the agent with streaming for real-time Canvas updates
    console.log(`[DEBUG] Starting DeepAgent streaming...`)
    try {
      let finalResult: any = null

      // Use streaming for real-time artifact updates
      const stream = await agent.stream(
        {
          messages: [{ role: 'user', content: userPrompt }],
        },
        {
          recursionLimit: 100, // Set higher limit for complex MCP server generation
          streamMode: 'values', // Stream intermediate values for real-time updates
        }
      )

      for await (const chunk of stream) {
        console.log(
          `[DEBUG] Streaming chunk received:`,
          chunk.messages?.length || 0,
          'messages'
        )

        // Update job progress with streaming updates
        if (chunk.messages && chunk.messages.length > 0) {
          const lastMessage = chunk.messages[chunk.messages.length - 1]
          if (lastMessage?.content) {
            jobManager.updateProgress(job.id, {
              phase: 'Generating files...',
              status: 'streaming',
              lastUpdate: lastMessage.content.slice(0, 200) + '...',
            })
          }
        }

        finalResult = chunk
      }

      console.log(`[DEBUG] DeepAgent streaming completed successfully`)
      console.log(
        `[DEBUG] Final result messages:`,
        finalResult?.messages?.length || 0
      )
      console.log(
        `[DEBUG] Canvas tools were available to the agent for creating artifacts`
      )
    } catch (error) {
      console.error(`[ERROR] DeepAgent streaming failed:`, error)
      throw error
    }

    // Get list of generated files
    const files = await this.listGeneratedFiles(outputDir)

    // Update progress with generated files
    jobManager.updateProgress(job.id, {
      phase: 'Generation complete',
      filesGenerated: files,
    })

    return files
  }

  /**
   * List all files in the output directory (recursively)
   */
  private async listGeneratedFiles(dir: string): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relativePath = path.relative(dir, fullPath)

        if (entry.isDirectory()) {
          const subFiles = await this.listGeneratedFiles(fullPath)
          files.push(...subFiles.map(f => path.join(relativePath, f)))
        } else {
          files.push(relativePath)
        }
      }
    } catch {
      // Directory might not exist or be empty
    }

    return files
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new Generator instance
 */
export function createGenerator(config: GeneratorConfig = {}): Generator {
  return new Generator(config)
}
