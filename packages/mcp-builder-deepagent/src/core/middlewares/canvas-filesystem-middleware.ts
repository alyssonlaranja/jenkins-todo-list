// src/core/middlewares/canvas-filesystem-middleware.ts

/**
 * Canvas-integrated FilesystemMiddleware for DeepAgents
 *
 * Based on DeepAgents documentation, this middleware creates custom filesystem tools
 * that automatically send files to Canvas when written.
 *
 * This replaces the default FilesystemMiddleware with Canvas-aware versions.
 */

import * as fs from 'fs/promises'
import * as path from 'path'

import { tool } from 'langchain'
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

export interface CanvasFilesystemConfig {
  /**
   * Project name for Canvas organization
   */
  projectName: string

  /**
   * Playground ID for Canvas organization
   */
  playgroundId?: string

  /**
   * Root directory for file operations
   */
  rootDir: string

  /**
   * Callback function to add artifacts to Canvas
   */
  onAddArtifact: (artifact: CanvasArtifact) => void

  /**
   * Enable/disable the middleware
   * @default true
   */
  enabled?: boolean

  /**
   * Job ID for download functionality
   */
  jobId?: string
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

export class CanvasFilesystemMiddleware implements AgentMiddleware {
  public readonly name = 'CanvasFilesystemMiddleware'
  public readonly tools: any[]
  private config: CanvasFilesystemConfig & { enabled: boolean }
  private fileCounter = 0

  constructor(config: CanvasFilesystemConfig) {
    this.config = {
      enabled: true,
      ...config,
    }

    // Create custom filesystem tools with Canvas integration
    this.tools = this.createFilesystemTools()

    console.log(
      `[CanvasFilesystemMiddleware] Initialized with ${this.tools.length} tools`
    )
    console.log(`[CanvasFilesystemMiddleware] Root dir: ${this.config.rootDir}`)
    console.log(
      `[CanvasFilesystemMiddleware] Project: ${this.config.projectName}`
    )
  }

  /**
   * Create filesystem tools with Canvas integration
   */
  private createFilesystemTools() {
    const writeFileTool = tool(
      async ({
        path: filePath,
        content,
      }: {
        path: string
        content: string | string[]
      }) => {
        try {
          // Ensure path is within root directory
          const fullPath = path.resolve(this.config.rootDir, filePath)
          if (!fullPath.startsWith(path.resolve(this.config.rootDir))) {
            throw new Error('Path outside root directory')
          }

          // Ensure directory exists
          await fs.mkdir(path.dirname(fullPath), { recursive: true })

          // Convert content to string if array
          const contentStr = Array.isArray(content)
            ? content.join('\n')
            : content

          // Write file
          await fs.writeFile(fullPath, contentStr, 'utf-8')

          // Send to Canvas via callback
          if (this.config.enabled && this.config.onAddArtifact) {
            console.log(
              `[CanvasFilesystemMiddleware] Sending to Canvas: ${filePath}`
            )

            const fileName = path.basename(filePath)
            const fileExtension = path.extname(fileName).toLowerCase()
            const { type, language } = this._determineFileType(
              fileName,
              fileExtension
            )

            const artifact: CanvasArtifact = {
              id: this._generateArtifactId(),
              type,
              title: `${this.config.projectName} - ${fileName}`,
              content: contentStr,
              language,
              timestamp: Date.now(),
              fileName,
              metadata: {
                source: 'mcp_builder',
                projectName: this.config.projectName,
                projectGroup: true,
                fileName,
                fileExtension,
                fileSize: contentStr.length,
                sortOrder: ++this.fileCounter,
                generatedAt: new Date().toISOString(),
                downloadable: true,
                playgroundId: this.config.playgroundId,
                jobId: this.config.jobId,
                downloadUrl: this.config.jobId
                  ? `/api/mcp-builder/download/${this.config.jobId}`
                  : undefined,
              },
            }

            this.config.onAddArtifact(artifact)
          }

          return `File ${filePath} written successfully`
        } catch (error) {
          console.error(
            `[CanvasFilesystemMiddleware] Error writing file ${filePath}:`,
            error
          )
          throw error
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file and send to Canvas',
        schema: z.object({
          path: z.string().describe('Path to the file'),
          content: z
            .union([z.string(), z.array(z.string())])
            .describe('File content'),
        }),
      }
    )

    const readFileTool = tool(
      async ({ path: filePath }: { path: string }) => {
        try {
          const fullPath = path.resolve(this.config.rootDir, filePath)
          if (!fullPath.startsWith(path.resolve(this.config.rootDir))) {
            throw new Error('Path outside root directory')
          }

          const content = await fs.readFile(fullPath, 'utf-8')
          return content
        } catch (error) {
          throw new Error(
            `Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      },
      {
        name: 'read_file',
        description: 'Read content from a file',
        schema: z.object({
          path: z.string().describe('Path to the file'),
        }),
      }
    )

    const lsTool = tool(
      async ({ path: dirPath = '.' }: { path?: string } = {}) => {
        try {
          const fullPath = path.resolve(this.config.rootDir, dirPath)
          if (!fullPath.startsWith(path.resolve(this.config.rootDir))) {
            throw new Error('Path outside root directory')
          }

          const entries = await fs.readdir(fullPath, { withFileTypes: true })
          return entries
            .map(entry => `${entry.isDirectory() ? 'd' : 'f'} ${entry.name}`)
            .join('\n')
        } catch (error) {
          throw new Error(
            `Failed to list directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      },
      {
        name: 'ls',
        description: 'List files and directories',
        schema: z.object({
          path: z
            .string()
            .optional()
            .describe('Directory path (default: current)'),
        }),
      }
    )

    return [writeFileTool, readFileTool, lsTool]
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
