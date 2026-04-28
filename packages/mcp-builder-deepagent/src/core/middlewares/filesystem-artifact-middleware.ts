// src/core/middlewares/filesystem-artifact-middleware.ts

/**
 * FilesystemArtifactMiddleware
 *
 * Intercepta operações de sistema de arquivos do DeepAgent e mapeia para Artifact API
 * Baseado no padrão Python: cockpit-agents-api/src/agents/langgraph/artifact_backend.py
 */

// Note: AgentMiddleware might not be directly exported from deepagents
// Will implement as a basic middleware class for now
import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import * as path from 'path'

// ============================================================================
// TYPES
// ============================================================================

export interface FilesystemMiddlewareConfig {
  /**
   * Base output directory for generated files
   */
  outputDirectory: string

  /**
   * Playground ID for organizing artifacts
   */
  playgroundId?: string

  /**
   * Project name for artifact organization
   */
  projectName: string

  /**
   * MCP callTool function from useProxyMCP
   */
  callTool: (toolName: string, args: any) => Promise<any>

  /**
   * Auto-promote new artifacts to PRODUCTION
   * @default true
   */
  autoPromoteToProduction?: boolean

  /**
   * Artifact type name for generated files
   * @default 'mcp_server_file'
   */
  artifactTypeName?: string

  /**
   * Accessibility level for artifacts
   * @default 'NAMESPACE'
   */
  accessibility?: 'LICENSE' | 'NAMESPACE' | 'NAMESPACE_USER'

  /**
   * Enable MCP artifact persistence
   * @default true
   */
  persistToArtifacts?: boolean
}

export interface WriteResult {
  path: string
  files_update: any
}

// ============================================================================
// FILESYSTEM ARTIFACT MIDDLEWARE
// ============================================================================

// Base middleware interface based on DeepAgents patterns
interface BaseMiddleware {
  name?: string
  wrap_tool_call?(request: any, handler: (req: any) => any): any
  awrap_tool_call?(
    request: any,
    handler: (req: any) => Promise<any>
  ): Promise<any>
}

/**
 * Middleware que intercepta tools de filesystem do DeepAgent e persiste em Artifacts
 *
 * Inspirado no ArtifactBackend do Python, mas implementado como middleware
 * para evitar conflitos de canal 'files'.
 *
 * @example
 * ```typescript
 * const middleware = new FilesystemArtifactMiddleware({
 *   outputDirectory: '/path/to/output',
 *   projectName: 'my-mcp-server',
 *   callTool: useProxyMCP.callTool
 * });
 *
 * const agent = createDeepAgent({
 *   model,
 *   systemPrompt,
 *   tools: [...tools, ...mcpTools],
 *   middleware: [middleware],  // ← Middleware em vez de backend
 * });
 * ```
 */
export class FilesystemArtifactMiddleware implements BaseMiddleware {
  public readonly name = 'FilesystemArtifactMiddleware'
  private config: Required<FilesystemMiddlewareConfig>

  constructor(config: FilesystemMiddlewareConfig) {
    this.config = {
      outputDirectory: config.outputDirectory,
      playgroundId: config.playgroundId || '',
      projectName: config.projectName,
      callTool: config.callTool,
      autoPromoteToProduction: config.autoPromoteToProduction ?? true,
      artifactTypeName: config.artifactTypeName || 'mcp_server_file',
      accessibility: config.accessibility || 'NAMESPACE',
      persistToArtifacts: config.persistToArtifacts ?? true,
    }
  }

  /**
   * Intercepta tool calls antes da execução
   * Similar ao wrap_tool_call() do Python
   */
  wrap_tool_call(request: any, handler: (req: any) => any): any {
    const toolName = this._extractToolName(request)

    // Intercepta ferramentas de filesystem
    if (this._isFilesystemTool(toolName)) {
      console.log(`[FilesystemMiddleware] Intercepting ${toolName}`)
      return this._handleFilesystemTool(request, handler)
    }

    // Para outras ferramentas, continua normalmente
    return handler(request)
  }

  /**
   * Versão async do wrap_tool_call
   * Similar ao awrap_tool_call() do Python
   */
  async awrap_tool_call(
    request: any,
    handler: (req: any) => Promise<any>
  ): Promise<any> {
    const toolName = this._extractToolName(request)

    // Intercepta ferramentas de filesystem
    if (this._isFilesystemTool(toolName)) {
      console.log(`[FilesystemMiddleware] Intercepting ${toolName} (async)`)
      return await this._handleFilesystemToolAsync(request, handler)
    }

    // Para outras ferramentas, continua normalmente
    return await handler(request)
  }

  /**
   * Extrai o nome da ferramenta da requisição
   */
  private _extractToolName(request: any): string {
    // Padrões possíveis para extrair nome da tool
    return (
      request?.tool?.name || request?.name || request?.tool_name || 'unknown'
    )
  }

  /**
   * Verifica se é uma ferramenta de filesystem
   */
  private _isFilesystemTool(toolName: string): boolean {
    const filesystemTools = [
      'write_file',
      'edit_file',
      'read_file',
      'create_file',
      'save_file',
      'ls',
      'glob',
      'grep',
    ]

    return filesystemTools.some(
      tool => toolName.includes(tool) || toolName.endsWith(tool)
    )
  }

  /**
   * Manipula ferramentas de filesystem (sync)
   */
  private _handleFilesystemTool(request: any, handler: (req: any) => any): any {
    try {
      const toolName = this._extractToolName(request)
      const args = request.args || request.input || {}

      if (
        toolName.includes('write') ||
        toolName.includes('create') ||
        toolName.includes('save')
      ) {
        return this._handleWriteFile(args)
      }

      // Para outras operações (read, ls, etc.), executa normalmente
      // mas pode adicionar logging ou transformações
      const result = handler(request)
      console.log(`[FilesystemMiddleware] ${toolName} executed:`, result)

      return result
    } catch (error) {
      console.error(
        `[FilesystemMiddleware] Error in ${this._extractToolName(request)}:`,
        error
      )
      throw error
    }
  }

  /**
   * Manipula ferramentas de filesystem (async)
   */
  private async _handleFilesystemToolAsync(
    request: any,
    handler: (req: any) => Promise<any>
  ): Promise<any> {
    try {
      const toolName = this._extractToolName(request)
      const args = request.args || request.input || {}

      if (
        toolName.includes('write') ||
        toolName.includes('create') ||
        toolName.includes('save')
      ) {
        return await this._handleWriteFileAsync(args)
      }

      // Para outras operações, executa normalmente
      const result = await handler(request)
      console.log(
        `[FilesystemMiddleware] ${toolName} executed (async):`,
        result
      )

      return result
    } catch (error) {
      console.error(
        `[FilesystemMiddleware] Error in ${this._extractToolName(request)} (async):`,
        error
      )
      throw error
    }
  }

  /**
   * Manipula write_file (sync)
   * Salva tanto no filesystem quanto em Artifacts
   */
  private _handleWriteFile(args: any): WriteResult {
    const { file_path, content, path: filePath } = args
    const resolvedPath = file_path || filePath
    const fileContent = content || args.content || ''

    if (!resolvedPath) {
      throw new Error('[FilesystemMiddleware] Missing file_path parameter')
    }

    // 1. Salva no filesystem (saída local)
    this._writeToFilesystem(resolvedPath, fileContent)

    // 2. Persiste em Artifacts (se configurado)
    if (this.config.persistToArtifacts) {
      // Para sync, não podemos aguardar async. Agenda para depois.
      this._scheduleArtifactPersistence(resolvedPath, fileContent)
    }

    return {
      path: resolvedPath,
      files_update: null,
    }
  }

  /**
   * Manipula write_file (async)
   * Salva tanto no filesystem quanto em Artifacts
   */
  private async _handleWriteFileAsync(args: any): Promise<WriteResult> {
    const { file_path, content, path: filePath } = args
    const resolvedPath = file_path || filePath
    const fileContent = content || args.content || ''

    if (!resolvedPath) {
      throw new Error('[FilesystemMiddleware] Missing file_path parameter')
    }

    // 1. Salva no filesystem (saída local)
    await this._writeToFilesystemAsync(resolvedPath, fileContent)

    // 2. Persiste em Artifacts (se configurado)
    if (this.config.persistToArtifacts) {
      await this._persistToArtifacts(resolvedPath, fileContent)
    }

    return {
      path: resolvedPath,
      files_update: null,
    }
  }

  /**
   * Salva arquivo no filesystem (sync)
   */
  private _writeToFilesystem(filePath: string, content: string): void {
    try {
      const fullPath = path.resolve(this.config.outputDirectory, filePath)
      const dirPath = path.dirname(fullPath)

      // Cria diretório se não existir
      fsSync.mkdirSync(dirPath, { recursive: true })

      // Escreve arquivo
      fsSync.writeFileSync(fullPath, content, 'utf8')

      console.log(`[FilesystemMiddleware] File written: ${fullPath}`)
    } catch (error) {
      console.error(
        `[FilesystemMiddleware] Failed to write file ${filePath}:`,
        error
      )
      throw error
    }
  }

  /**
   * Salva arquivo no filesystem (async)
   */
  private async _writeToFilesystemAsync(
    filePath: string,
    content: string
  ): Promise<void> {
    try {
      const fullPath = path.resolve(this.config.outputDirectory, filePath)
      const dirPath = path.dirname(fullPath)

      // Cria diretório se não existir
      await fs.mkdir(dirPath, { recursive: true })

      // Escreve arquivo
      await fs.writeFile(fullPath, content, 'utf8')

      console.log(`[FilesystemMiddleware] File written (async): ${fullPath}`)
    } catch (error) {
      console.error(
        `[FilesystemMiddleware] Failed to write file ${filePath} (async):`,
        error
      )
      throw error
    }
  }

  /**
   * Agenda persistência em Artifacts para execução posterior (sync fallback)
   */
  private _scheduleArtifactPersistence(
    filePath: string,
    content: string
  ): void {
    // Para contexto sync, agenda para próximo tick
    process.nextTick(async () => {
      try {
        await this._persistToArtifacts(filePath, content)
      } catch (error) {
        console.error(
          `[FilesystemMiddleware] Failed to persist ${filePath} to artifacts:`,
          error
        )
      }
    })
  }

  /**
   * Persiste arquivo em Artifacts usando MCP tools
   * Adaptado para o universo useProxyMCP + session connections
   */
  private async _persistToArtifacts(
    filePath: string,
    content: string
  ): Promise<void> {
    if (!this.config.persistToArtifacts) {
      console.log(`[FilesystemMiddleware] Artifact persistence disabled`)
      return
    }

    try {
      console.log(
        `[FilesystemMiddleware] Persisting ${filePath} to Artifacts via MCP...`
      )

      // Gera key seguindo padrão do playground
      const artifactKey = this._generateArtifactKey(filePath)

      // Dados do artifact seguindo padrão MCP
      const artifactData = {
        key: artifactKey,
        value: content,
        description: `Generated MCP Server file: ${filePath} from project ${this.config.projectName}`,
        type: this.config.artifactTypeName,
        accessibility: this.config.accessibility,
        // Metadata para organização
        metadata: JSON.stringify({
          projectName: this.config.projectName,
          playgroundId: this.config.playgroundId,
          fileName: path.basename(filePath),
          filePath: filePath,
          generatedAt: new Date().toISOString(),
          source: 'deepagent-mcp-builder',
        }),
      }

      console.log(`[FilesystemMiddleware] Creating MCP artifact:`, {
        key: artifactKey,
        size: content.length,
        type: this.config.artifactTypeName,
        playgroundId: this.config.playgroundId,
      })

      // Usa MCP tools via session connection
      await this._createOrUpdateArtifactMCP(artifactData)

      console.log(
        `[FilesystemMiddleware] ✅ Artifact persisted via MCP: ${artifactKey}`
      )
    } catch (error) {
      console.error(
        `[FilesystemMiddleware] ❌ Failed to persist ${filePath} via MCP:`,
        error
      )
      // Não propaga erro para não quebrar o fluxo principal
    }
  }

  /**
   * Gera key do artifact seguindo padrão do playground
   */
  private _generateArtifactKey(filePath: string): string {
    // Remove leading slash se presente
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath

    // Se tem playground ID, organiza hierarquicamente
    if (this.config.playgroundId) {
      return `MCP_SERVER_${this.config.playgroundId}_${this.config.projectName}_${cleanPath.replace(/[/\\]/g, '_')}`
    }

    // Fallback: usa apenas project name
    return `MCP_SERVER_${this.config.projectName}_${cleanPath.replace(/[/\\]/g, '_')}`
  }

  /**
   * Cria ou atualiza artifact usando MCP tools
   * Usa o padrão useProxyMCP que já funciona no sistema
   */
  private async _createOrUpdateArtifactMCP(artifactData: any): Promise<void> {
    try {
      // 1. Verifica se artifact já existe
      const searchResult = await this.config.callTool('search_artifacts', {
        key_pattern: `^${artifactData.key}$`,
        cursor: null,
      })

      const parseResults = (result: any) => {
        try {
          const data = result.content?.[0]?.text
            ? JSON.parse(result.content[0].text)
            : result
          return data?.items || []
        } catch (error) {
          console.error(
            '[FilesystemMiddleware] Failed to parse search results:',
            error
          )
          return []
        }
      }

      const existingItems = parseResults(searchResult)

      if (existingItems.length > 0) {
        // 2. UPDATE: Artifact já existe
        const existing = JSON.parse(existingItems[0].value)
        const updateData = {
          key: artifactData.key, // Required for updates
          value: artifactData.value,
          description: artifactData.description,
          metadata: artifactData.metadata,
          // Preserva campos existentes
          accessibility: existing.accessibility,
          type: existing.type,
        }

        console.log(
          `[FilesystemMiddleware] Updating existing artifact: ${artifactData.key}`
        )
        await this.config.callTool('update_artifact', updateData)
      } else {
        // 3. CREATE: Novo artifact
        console.log(
          `[FilesystemMiddleware] Creating new artifact: ${artifactData.key}`
        )
        await this.config.callTool('create_artifact', artifactData)
      }

      // 4. Auto-promote para PRODUCTION se configurado
      if (this.config.autoPromoteToProduction) {
        // Note: Esta funcionalidade pode precisar de implementação adicional
        // dependendo dos MCP tools disponíveis
        console.log(
          `[FilesystemMiddleware] TODO: Auto-promote ${artifactData.key} to PRODUCTION`
        )
      }
    } catch (error) {
      console.error(
        `[FilesystemMiddleware] Failed MCP artifact operation:`,
        error
      )
      throw error
    }
  }
}
