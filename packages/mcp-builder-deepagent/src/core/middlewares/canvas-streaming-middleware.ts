// src/core/middlewares/canvas-streaming-middleware.ts

/**
 * Canvas Streaming Middleware for DeepAgents
 *
 * This middleware integrates with LangGraph's streaming capabilities to provide
 * real-time Canvas artifact updates. Instead of using callbacks as side effects,
 * it monitors the streaming state and emits artifacts as they're created.
 *
 * Based on 2025 best practices for streaming-native agent architectures.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

// AgentMiddleware interface (from DeepAgents documentation)
interface AgentMiddleware {
  name?: string
  tools?: any[]
  beforeToolExecution?(toolName: string, toolInput: any): Promise<any>
  afterToolExecution?(
    toolName: string,
    toolInput: any,
    toolOutput: any
  ): Promise<any>
}

// ============================================================================
// TYPES
// ============================================================================

export interface CanvasStreamingConfig {
  /**
   * Callback function to add artifacts to Canvas (legacy SSE approach)
   */
  onAddArtifact?: (artifact: CanvasArtifact) => void

  /**
   * MCP callTool function for saving artifacts to platform (new async approach)
   */
  callTool?: (toolName: string, args: any) => Promise<any>

  /**
   * Playground ID for artifact key generation
   */
  playgroundId?: string

  /**
   * Project name for artifact organization
   */
  projectName?: string

  /**
   * Enable/disable the middleware
   * @default true
   */
  enabled?: boolean
}

export interface CanvasArtifact {
  id: string
  type: 'code' | 'document' | 'config' | 'diagram' | 'html' | 'react'
  title: string
  content: string
  language?: string
  timestamp: number
}

// ============================================================================
// MIDDLEWARE CLASS
// ============================================================================

export class CanvasStreamingMiddleware implements AgentMiddleware {
  public readonly name = 'CanvasStreamingMiddleware'
  public readonly tools: any[]
  private config: CanvasStreamingConfig & { enabled: boolean }

  constructor(config: CanvasStreamingConfig) {
    this.config = {
      enabled: true,
      ...config,
    }

    // Create Canvas tools (simple approach)
    this.tools = this.createCanvasTools()

    console.log(`[CanvasStreamingMiddleware] Initialized with Canvas tools`)
  }

  /**
   * Create Canvas tools (copy from supervisor canvas-tools.ts)
   */
  private createCanvasTools() {
    if (!this.config.enabled) {
      return []
    }

    // Extract config for tools

    // Single artifact schema
    const singleArtifactSchema = z.object({
      type: z
        .enum(['code', 'document', 'config', 'diagram', 'html', 'react'])
        .describe('Type of artifact to create'),
      title: z.string().describe('Title/name of the artifact'),
      content: z.string().describe('Content of the artifact'),
      language: z
        .string()
        .optional()
        .describe(
          'Programming language for code artifacts (e.g., typescript, python)'
        ),
    })

    // Tool for adding a single artifact
    const canvasAddArtifactTool = new DynamicStructuredTool({
      name: 'canvas_add_artifact',
      description:
        'Add a single artifact to the Canvas panel. Use this to create code snippets, documents, diagrams, configurations, HTML, or React components that the user can view and interact with.',
      schema: singleArtifactSchema,
      func: async ({ type, title, content, language }) => {
        const artifact: CanvasArtifact = {
          id: this.generateArtifactId(),
          type,
          title,
          content,
          language,
          timestamp: Date.now(),
        }

        // ONLY artifact storage approach - NO SSE fallback (SSE causes controller closed errors)
        if (this.config.callTool && this.config.playgroundId) {
          try {
            const artifactKey = `MCP_BUILDER_FILE_${this.config.playgroundId}_${this.config.projectName || 'unknown'}_${artifact.id}`

            // Calculate file size
            const contentSize = new Blob([content]).size
            const formattedSize =
              contentSize < 1024
                ? `${contentSize} B`
                : `${(contentSize / 1024).toFixed(1)} KB`

            // Determine file extension from title
            const fileExtension = title.includes('.')
              ? title.split('.').pop()?.toLowerCase() || 'txt'
              : 'txt'
            const fileTypeMapping: Record<string, string> = {
              ts: 'typescript',
              tsx: 'typescript',
              js: 'javascript',
              jsx: 'javascript',
              json: 'json',
              md: 'markdown',
              py: 'python',
              yml: 'yaml',
              yaml: 'yaml',
              html: 'html',
              css: 'css',
              scss: 'scss',
              txt: 'text',
            }

            // Create artifact value following the EXACT pattern that the hook expects
            const artifactValue = {
              filename: title,
              content: content,
              status: 'ready',
              size: formattedSize,
              fileType: fileTypeMapping[fileExtension] || language || 'text',
              projectName: this.config.projectName,
              playgroundId: this.config.playgroundId,
              metadata: {
                originalId: artifact.id,
                generatedAt: artifact.timestamp,
                type: type,
                language: language || fileTypeMapping[fileExtension],
              },
            }

            await this.config.callTool('create_artifact', {
              key: artifactKey,
              value: JSON.stringify(artifactValue, null, 2), // Store as JSON string (upstream pattern)
              description: `${title} (${type}) - Generated by MCP Builder`,
              artifact_type_name: 'mcp-builder-file',
              accessibility: 'NAMESPACE',
            })

            console.log(
              `[CanvasStreamingMiddleware] ✅ Saved artifact "${title}" to platform with key: ${artifactKey}`
            )
          } catch (error) {
            console.error(
              `[CanvasStreamingMiddleware] ❌ FAILED to save artifact "${title}":`,
              error
            )
            // NO SSE fallback - if artifact saving fails, we want to know why
            throw error
          }
        } else {
          console.error(
            `[CanvasStreamingMiddleware] ❌ Missing callTool or playgroundId - cannot save artifact "${title}"`
          )
          console.log('Config:', {
            hasCallTool: !!this.config.callTool,
            playgroundId: this.config.playgroundId,
            projectName: this.config.projectName,
          })
          throw new Error(
            'Missing callTool or playgroundId for artifact storage'
          )
        }

        return JSON.stringify({
          success: true,
          message: `Artifact "${title}" saved via platform storage`,
          artifactId: artifact.id,
          type: artifact.type,
          approach: 'platform',
        })
      },
    })

    return [canvasAddArtifactTool]
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Generate unique artifact ID for Canvas
   */
  private generateArtifactId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    return `mcp-builder-${timestamp}-${random}`
  }
}
