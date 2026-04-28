/**
 * Runtime configuration type
 * Used for dynamic configuration loaded from /api/config endpoint
 * These values are read from environment variables at runtime (not build-time)
 */
export interface RuntimeConfig {
  /**
   * Main Cockpit API URL
   * @example "https://api-dev.cockpit.avanade.ai"
   */
  apiUrl: string

  /**
   * Chat/Agents API URL
   * @example "https://api-agents-dev.cockpit.avanade.ai"
   */
  chatApiUrl: string

  /**
   * WebSocket server URL
   * @example "https://websocket-dev.cockpit.avanade.ai"
   */
  websocketServer: string

  /**
   * MCP Server URL (Legacy)
   * @example "https://mcp-dev.cockpit.avanade.ai/mcp"
   */
  mcpServerUrl: string

  /**
   * MCP Server URL - Legacy
   * @example "https://mcp-dev.cockpit.avanade.ai/mcp"
   */
  mcpServerLegacyUrl: string

  /**
   * MCP Server URL - Utility Agents
   * @example "https://mcp-utility-agents-dev.cockpit.avanade.ai/mcp"
   */
  mcpServerUtilityAgentUrl: string

  /**
   * MCP Server URL - Suite
   * @example "https://mcp-suite-dev.cockpit.avanade.ai/mcp"
   */
  mcpServerSuiteUrl: string

  /**
   * MCP Server URL - Metrics
   * @example "https://mcp-metrics-dev.cockpit.avanade.ai/mcp"
   */
  mcpServerMetricsUrl: string

  /**
   * MCP Server URL - Telemetry
   * @example "https://mcp-telemetry-dev.cockpit.avanade.ai/mcp"
   */
  mcpServerTelemetryUrl: string

  /**
   * Custom base path for the application (optional)
   * @example "" or "mcp-portal"
   */
  customBasePath?: string
}
