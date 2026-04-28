import * as path from 'path'

// src/core/middlewares/artifact-persistence-middleware.ts

/**
 * ArtifactPersistenceMiddleware para DeepAgents
 *
 * Middleware correto que implementa AgentMiddleware para interceptar
 * operações de write_file e persistir em Artifacts via MCP.
 *
 * Baseado na documentação oficial do DeepAgents:
 * - https://github.com/langchain-ai/deepagentsjs
 * - Implementa interface AgentMiddleware corretamente
 * - Usa hooks beforeToolExecution/afterToolExecution
 */

// AgentMiddleware interface (inferred from documentation)
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

export interface ArtifactPersistenceConfig {
  /**
   * Playground ID para organização de artifacts
   */
  playgroundId?: string

  /**
   * Project name para artifact organization
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
  enabled?: boolean
}

// ============================================================================
// ARTIFACT PERSISTENCE MIDDLEWARE
// ============================================================================

/**
 * Middleware para interceptar write_file e persistir em Artifacts
 *
 * Implementa AgentMiddleware corretamente seguindo padrão DeepAgents:
 * - Não adiciona tools próprios (usa os tools padrão do FilesystemMiddleware)
 * - Implementa hooks para interceptar execução de tools
 * - Persiste files criados via write_file em Artifacts
 *
 * @example
 * ```typescript
 * const middleware = new ArtifactPersistenceMiddleware({
 *   projectName: 'my-mcp-server',
 *   callTool: useProxyMCP.callTool,
 *   playgroundId: 'pg-123'
 * });
 *
 * const agent = createDeepAgent({
 *   model,
 *   systemPrompt,
 *   middleware: [middleware], // ← Middleware correto
 * });
 * ```
 */
export class ArtifactPersistenceMiddleware implements AgentMiddleware {
  public readonly name = 'ArtifactPersistenceMiddleware'
  private config: Required<ArtifactPersistenceConfig>

  constructor(config: ArtifactPersistenceConfig) {
    this.config = {
      playgroundId: config.playgroundId || '',
      projectName: config.projectName,
      callTool: config.callTool,
      autoPromoteToProduction: config.autoPromoteToProduction ?? true,
      artifactTypeName: config.artifactTypeName || 'mcp_server_file',
      accessibility: config.accessibility || 'NAMESPACE',
      enabled: config.enabled ?? true,
    }
  }

  /**
   * Hook executado DEPOIS da execução de uma tool
   * Intercepta write_file para persistir em Artifacts
   */
  async afterToolExecution(
    toolName: string,
    toolInput: any,
    _toolOutput: any
  ): Promise<any> {
    // Só intercepta write_file se artifact persistence estiver habilitado
    if (!this.config.enabled || toolName !== 'write_file') {
      return _toolOutput
    }

    try {
      console.log(`[ArtifactPersistenceMiddleware] Intercepting ${toolName}:`, {
        filePath: toolInput?.file_path || toolInput?.path,
        contentLength: toolInput?.content?.length || 0,
      })

      await this._persistFileToArtifacts(toolInput, _toolOutput)

      return _toolOutput
    } catch (error) {
      console.error(
        `[ArtifactPersistenceMiddleware] Failed to persist artifact:`,
        error
      )
      // Não propaga erro para não quebrar o fluxo principal
      return _toolOutput
    }
  }

  /**
   * Persiste arquivo criado em Artifacts usando MCP tools
   */
  private async _persistFileToArtifacts(
    toolInput: any,
    _toolOutput: any
  ): Promise<void> {
    if (!this.config.enabled) {
      console.log(`[ArtifactPersistenceMiddleware] Persistence disabled`)
      return
    }

    // Extrai informações do arquivo
    const filePath = toolInput?.file_path || toolInput?.path
    const content = toolInput?.content || ''

    if (!filePath || !content) {
      console.log(
        `[ArtifactPersistenceMiddleware] Missing file path or content:`,
        {
          hasPath: !!filePath,
          hasContent: !!content,
        }
      )
      return
    }

    try {
      console.log(
        `[ArtifactPersistenceMiddleware] Persisting ${filePath} to Artifacts...`
      )

      // Gera key do artifact
      const artifactKey = this._generateArtifactKey(filePath)

      // Dados do artifact
      const artifactData = {
        key: artifactKey,
        value: content,
        description: `Generated MCP Server file: ${filePath} from project ${this.config.projectName}`,
        type: this.config.artifactTypeName,
        accessibility: this.config.accessibility,
        metadata: JSON.stringify({
          projectName: this.config.projectName,
          playgroundId: this.config.playgroundId,
          fileName: path.basename(filePath),
          filePath: filePath,
          generatedAt: new Date().toISOString(),
          source: 'deepagent-mcp-builder',
        }),
      }

      console.log(`[ArtifactPersistenceMiddleware] Creating artifact:`, {
        key: artifactKey,
        size: content.length,
        type: this.config.artifactTypeName,
      })

      // Usa MCP tools via session connection
      await this._createOrUpdateArtifactMCP(artifactData)

      console.log(
        `[ArtifactPersistenceMiddleware] ✅ Artifact persisted: ${artifactKey}`
      )
    } catch (error) {
      console.error(
        `[ArtifactPersistenceMiddleware] ❌ Failed to persist ${filePath}:`,
        error
      )
      // Não propaga erro
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
            '[ArtifactPersistenceMiddleware] Failed to parse search results:',
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
          key: artifactData.key,
          value: artifactData.value,
          description: artifactData.description,
          metadata: artifactData.metadata,
          // Preserva campos existentes
          accessibility: existing.accessibility,
          type: existing.type,
        }

        console.log(
          `[ArtifactPersistenceMiddleware] Updating existing artifact: ${artifactData.key}`
        )
        await this.config.callTool('update_artifact', updateData)
      } else {
        // 3. CREATE: Novo artifact
        console.log(
          `[ArtifactPersistenceMiddleware] Creating new artifact: ${artifactData.key}`
        )
        await this.config.callTool('create_artifact', artifactData)
      }

      // 4. Auto-promote para PRODUCTION se configurado
      if (this.config.autoPromoteToProduction) {
        console.log(
          `[ArtifactPersistenceMiddleware] TODO: Auto-promote ${artifactData.key} to PRODUCTION`
        )
      }
    } catch (error) {
      console.error(
        `[ArtifactPersistenceMiddleware] Failed MCP artifact operation:`,
        error
      )
      throw error
    }
  }
}
