// src/core/index.ts

/**
 * Core module exports for @cockpit/mcp-builder-deepagent
 */

// Types
export * from './types.js'

// Slot Management
export { SlotManager, discoverTools } from './slots.js'

// Job Management
export { JobManager, jobManager } from './jobs.js'

// Generator
export {
  Generator,
  createGenerator,
  type GeneratorConfig,
} from './generator.js'

// Prompt Builder
export { buildSystemPrompt, buildUserPrompt } from './prompt-builder.js'

// MCP Tools
export {
  createMcpSlotTools,
  createMcpSlotsMiddleware,
  getSlotToolNames,
  type McpSlotsMiddlewareConfig,
  type AgentMiddleware,
} from './mcp-slots-middleware.js'

// Artifact Middleware
export {
  FilesystemArtifactMiddleware,
  type FilesystemMiddlewareConfig,
  type WriteResult,
  ArtifactPersistenceMiddleware,
  type ArtifactPersistenceConfig,
  CanvasCallbackMiddleware,
  type CanvasCallbackConfig,
  type CanvasArtifact,
  CanvasFilesystemMiddleware,
  type CanvasFilesystemConfig,
  CanvasStreamingMiddleware,
  type CanvasStreamingConfig,
} from './middlewares/index.js'
