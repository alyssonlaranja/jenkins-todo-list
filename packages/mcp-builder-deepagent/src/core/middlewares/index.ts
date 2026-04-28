// src/core/middlewares/index.ts

/**
 * Middleware exports for MCP Builder DeepAgent
 */

// Legacy filesystem artifact middleware (deprecated)
export { FilesystemArtifactMiddleware } from './filesystem-artifact-middleware.js'
export type {
  FilesystemMiddlewareConfig,
  WriteResult,
} from './filesystem-artifact-middleware.js'

// Correct DeepAgent middleware implementation
export { ArtifactPersistenceMiddleware } from './artifact-persistence-middleware.js'
export type { ArtifactPersistenceConfig } from './artifact-persistence-middleware.js'

// Canvas integration middleware
export { CanvasCallbackMiddleware } from './canvas-callback-middleware.js'
export type {
  CanvasCallbackConfig,
  CanvasArtifact,
} from './canvas-callback-middleware.js'

// Canvas-integrated Filesystem middleware (replaces default FilesystemMiddleware)
export { CanvasFilesystemMiddleware } from './canvas-filesystem-middleware.js'
export type { CanvasFilesystemConfig } from './canvas-filesystem-middleware.js'

// Streaming-native Canvas middleware (2025 best practices)
export { CanvasStreamingMiddleware } from './canvas-streaming-middleware.js'
export type { CanvasStreamingConfig } from './canvas-streaming-middleware.js'
