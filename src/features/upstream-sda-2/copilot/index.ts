/**
 * Copilot Integration - Main Exports
 */

export { SDA2CopilotProvider } from './sda2-copilot-provider'
export { SDA2MCPIntegration } from './sda2-mcp-integration'
export { useSDA2ContextReadables } from './sda2-context-readables'
export { createSDA2Handlers } from './sda2-handlers'

export type {
  ActionHandler,
  ActionHandlerRegistry,
  SDA2HandlerContext,
  SDA2CopilotProviderProps,
  SDA2ContextReadablesProps,
  MCPActionProps,
  PersistenceResult,
  SearchResult,
} from './types'
