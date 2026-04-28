// src/core/middlewares/canvas-callback-middleware.ts

/**
 * CanvasCallbackMiddleware para DeepAgents
 *
 * Middleware que intercepta operações write_file e chama o callback onAddArtifact
 * para enviar arquivos gerados para o Canvas em tempo real.
 *
 * Este middleware trabalha em paralelo com ArtifactPersistenceMiddleware:
 * - ArtifactPersistenceMiddleware: persiste via MCP
 * - CanvasCallbackMiddleware: envia para Canvas via callback
 */

import * as path from 'path'

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

export interface CanvasCallbackConfig {
  /**
   * Project name for Canvas organization
   */
  projectName: string

  /**
   * Playground ID for Canvas organization
   */
  playgroundId?: string

  /**
   * Callback function to add artifacts to Canvas
   * This is called for each file generated
   */
  onAddArtifact: (artifact: CanvasArtifact) => void

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
  fileName?: string
  metadata?: {
    source?: 'mcp_builder' | 'agent' | 'user'
    projectName?: string
    projectGroup?: boolean
    fileName?: string
    fileExtension?: string
    fileSize?: number
    sortOrder?: number
    generatedAt?: string
    downloadable?: boolean
    downloadUrl?: string
    jobId?: string
    [key: string]: any
  }
}

// ============================================================================
// MIDDLEWARE CLASS
// ============================================================================

export class CanvasCallbackMiddleware implements AgentMiddleware {
  public readonly name = 'CanvasCallbackMiddleware'
  private config: CanvasCallbackConfig & { enabled: boolean }
  private fileCounter = 0

  constructor(config: CanvasCallbackConfig) {
    this.config = {
      enabled: true,
      ...config,
    }
  }

  /**
   * Before tool execution - log all tool calls for debugging
   */
  async beforeToolExecution(toolName: string, toolInput: any): Promise<any> {
    if (this.config.enabled) {
      console.log(
        `[CanvasCallbackMiddleware] BEFORE: Tool called: ${toolName}`,
        Object.keys(toolInput)
      )
      console.log(
        `[CanvasCallbackMiddleware] BEFORE: Full toolInput:`,
        toolInput
      )
    }
    return toolInput
  }

  /**
   * After write_file operations, send the file to Canvas via callback
   */
  async afterToolExecution(
    toolName: string,
    toolInput: any,
    toolOutput: any
  ): Promise<any> {
    // Log all tool executions for debugging
    if (this.config.enabled) {
      console.log(
        `[CanvasCallbackMiddleware] AFTER: Tool executed: ${toolName}`
      )
      console.log(`[CanvasCallbackMiddleware] AFTER: toolInput:`, toolInput)
      console.log(`[CanvasCallbackMiddleware] AFTER: toolOutput:`, toolOutput)
    }

    // Handle file writing operations (try different possible tool names)
    const isFileWriteOperation =
      toolName === 'write_file' ||
      toolName === 'writeFile' ||
      toolName === 'write' ||
      (toolName.includes('file') && toolName.includes('write'))

    console.log(
      `[CanvasCallbackMiddleware] DIAGNOSTIC: toolName="${toolName}" isFileWriteOperation=${isFileWriteOperation}`
    )

    if (!this.config.enabled || !isFileWriteOperation) {
      console.log(
        `[CanvasCallbackMiddleware] DIAGNOSTIC: Skipping - enabled=${this.config.enabled} isFileWriteOperation=${isFileWriteOperation}`
      )
      return toolOutput
    }

    try {
      console.log(
        `[CanvasCallbackMiddleware] Processing file write operation: ${toolName}`
      )
      console.log(`[CanvasCallbackMiddleware] Tool input:`, toolInput)

      // Extract file information
      const fileName = path.basename(toolInput.path)
      const fileExtension = path.extname(fileName).toLowerCase()
      const fileContent = Array.isArray(toolInput.content)
        ? toolInput.content.join('\n')
        : toolInput.content

      // Determine file type and language
      const { type, language } = this._determineFileType(
        fileName,
        fileExtension
      )

      // Create Canvas artifact
      const artifact: CanvasArtifact = {
        id: this._generateArtifactId(),
        type,
        title: `${this.config.projectName} - ${fileName}`,
        content: fileContent,
        language,
        timestamp: Date.now(),
        fileName,
        metadata: {
          source: 'mcp_builder',
          projectName: this.config.projectName,
          projectGroup: true, // Enable enhanced Canvas mode
          fileName,
          fileExtension,
          fileSize: fileContent.length,
          sortOrder: ++this.fileCounter, // Sequential order
          generatedAt: new Date().toISOString(),
          downloadable: true,
          playgroundId: this.config.playgroundId,
        },
      }

      // Send to Canvas via callback
      console.log(
        `[CanvasCallbackMiddleware] CANVAS: About to send artifact to Canvas:`,
        artifact
      )
      console.log(
        `[CanvasCallbackMiddleware] CANVAS: onAddArtifact callback exists:`,
        !!this.config.onAddArtifact
      )

      if (this.config.onAddArtifact) {
        console.log(
          `[CanvasCallbackMiddleware] CANVAS: Calling onAddArtifact callback...`
        )
        this.config.onAddArtifact(artifact)
        console.log(
          `[CanvasCallbackMiddleware] CANVAS: onAddArtifact callback completed successfully`
        )
      } else {
        console.error(
          `[CanvasCallbackMiddleware] CANVAS: ERROR - onAddArtifact callback is null/undefined!`
        )
      }
    } catch (error) {
      console.error(
        '[CanvasCallbackMiddleware] ERROR in Canvas processing:',
        error
      )
      console.error(
        '[CanvasCallbackMiddleware] ERROR stack:',
        error instanceof Error ? error.stack : 'No stack trace'
      )
      // Don't throw - this is non-critical for file generation
    }

    return toolOutput
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Determine Canvas artifact type and language from file extension
   */
  private _determineFileType(
    fileName: string,
    extension: string
  ): { type: CanvasArtifact['type']; language: string } {
    // Language mapping for syntax highlighting
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.json': 'json',
      '.md': 'markdown',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.env': 'bash',
      '.sh': 'bash',
      '.py': 'python',
      '.sql': 'sql',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.xml': 'xml',
    }

    // Type mapping for Canvas categories
    let type: CanvasArtifact['type'] = 'code'

    if (
      fileName === 'package.json' ||
      fileName === 'tsconfig.json' ||
      extension === '.env'
    ) {
      type = 'config'
    } else if (extension === '.md') {
      type = 'document'
    } else if (extension === '.html') {
      type = 'html'
    } else if (extension === '.jsx' || extension === '.tsx') {
      type = 'react'
    }

    const language = languageMap[extension] || 'text'

    return { type, language }
  }

  /**
   * Generate unique artifact ID for Canvas
   */
  private _generateArtifactId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `mcp-builder-${timestamp}-${random}`
  }
}
