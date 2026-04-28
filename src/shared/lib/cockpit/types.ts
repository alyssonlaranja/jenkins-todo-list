/**
 * Cockpit API Types
 * Matches cockpit-portal API contracts
 */

/**
 * User Personal API Key from cockpit-portal API
 * Endpoint: GET /api/UserApiKey/GetById/{userId}
 */
export interface APIKey {
  id: string
  key: string // ← This is the actual x-cockpit-api-key value
  fk_user: string
  description?: string
  createdAt: string
  isActive: boolean
}

/**
 * Payload to create new API key
 * Endpoint: POST /api/UserApiKey/Create
 */
export interface CreateApiKeyPayload {
  fk_user: string
  description?: string
}

/**
 * License data from cockpit-portal API
 * Endpoint: GET /api/License/{licenseId}
 */
export interface License {
  id: string
  name: string
  description?: string
  isActive: boolean
}

/**
 * Namespace data from cockpit-portal API
 * Endpoint: GET /api/Namespace/{namespaceId}
 */
export interface Namespace {
  id: string
  name: string
  licenseId: string
  description?: string
  isActive: boolean
}

/**
 * Utility Agent from cockpit-portal API
 * Endpoint: GET /api/UtilityAgents?namespaceId={namespaceId}
 */
export interface UtilityAgent {
  id: string
  name: string
  type: 'Supervisor' | 'Standard'
  namespaceId: string
  description?: string
}

/**
 * MCP Server API Key from secure config
 * Endpoint: GET /api/config/secure (MCP Portal internal)
 */
export interface SecureRuntimeConfig {
  mcpServerApiKey: string
}
