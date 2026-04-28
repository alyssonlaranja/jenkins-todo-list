/**
 * Cockpit API Client
 * Follows cockpit-portal patterns for API communication
 */
import type { Session } from 'next-auth'
import { getSession } from 'next-auth/react'

// RequestInit is a global type from TypeScript DOM lib

/**
 * Base URL from runtime configuration
 * Uses the helper from api-helpers.ts which supports runtime config from /api/config
 * This ensures the URL works in Container Apps where env vars are set at runtime
 */
import { getApiBaseUrl as getApiBaseUrlHelper } from '@/shared/lib/api-helpers'

import type {
  APIKey,
  CreateApiKeyPayload,
  License,
  Namespace,
  UtilityAgent,
} from './types'

const getApiBaseUrl = (): string => {
  return getApiBaseUrlHelper()
}

/**
 * Generic fetch wrapper with auth and error handling
 * CLIENT-SIDE ONLY: Uses getSession() from next-auth/react
 * Pattern: cockpit-portal/src/lib/swr-fetcher.ts
 * Automatically injects LicenseId/NamespaceId from permission-store
 */
async function cockpitFetch<T>(
  endpoint: string,
  options?: Parameters<typeof fetch>[1],
  accessTokenOverride?: string // Allow passing token directly to avoid getSession() HTTP call
): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`

  // Use Headers object like cockpit-portal does
  const headers = new Headers(options?.headers)

  // Get session and inject Authorization header (cockpit-portal pattern)
  // IMPORTANT: If accessTokenOverride is provided, use it directly to avoid getSession() HTTP call
  let accessToken = accessTokenOverride
  if (!accessToken) {
    const session = await getSession()
    console.log('[DEBUG cockpitFetch] Session object:', session)
    console.log(
      '[DEBUG cockpitFetch] Session keys:',
      session ? Object.keys(session) : 'null'
    )
    accessToken = (session as Session & { accessToken?: string })?.accessToken
    console.log(
      '[DEBUG cockpitFetch] Extracted accessToken:',
      accessToken?.substring(0, 50)
    )
  }

  // Set Content-Type if not already set
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Add Authorization header if accessToken exists
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  // Inject LicenseId/NamespaceId from permission-store (cockpit-portal pattern)
  // IMPORTANT: Bootstrap endpoints should NOT receive these headers
  // Bootstrap endpoints are those that fetch initial user data WITHOUT needing license/namespace context
  const bootstrapEndpoints = [
    '/api/UserApiKey/GetById',
    '/api/ActiveDirectoryUser',
    '/api/License/',
  ]
  const isBootstrapEndpoint = bootstrapEndpoints.some(pattern =>
    endpoint.includes(pattern)
  )

  try {
    if (typeof window !== 'undefined' && !isBootstrapEndpoint) {
      const permissionStoreRaw = localStorage.getItem('permission-store')
      console.log('[DEBUG cockpitFetch] localStorage check:', {
        endpoint,
        isBootstrapEndpoint,
        hasPermissionStore: !!permissionStoreRaw,
      })

      if (permissionStoreRaw) {
        const permissionStore = JSON.parse(permissionStoreRaw)
        const activeLicenseId = permissionStore?.state?.activeLicenseId
        const activeNamespaceId = permissionStore?.state?.activeNamespaceId

        console.log('[DEBUG cockpitFetch] Parsed store:', {
          activeLicenseId,
          activeNamespaceId,
        })

        // Only set headers if not already provided
        if (activeLicenseId && !headers.has('LicenseId')) {
          headers.set('LicenseId', activeLicenseId)
        }
        if (activeNamespaceId && !headers.has('NamespaceId')) {
          headers.set('NamespaceId', activeNamespaceId)
        }
      }
    } else if (isBootstrapEndpoint) {
      console.log(
        '[DEBUG cockpitFetch] Skipping LicenseId/NamespaceId for bootstrap endpoint:',
        endpoint
      )
    }
  } catch (e) {
    console.error('Failed to inject LicenseId/NamespaceId headers:', e)
  }

  // Debug: Log all headers being sent
  const headersObj = Object.fromEntries(headers.entries())
  console.log('[DEBUG cockpitFetch] Full headers:', headersObj)
  console.log('[DEBUG cockpitFetch] Token exists:', !!accessToken)
  console.log(
    '[DEBUG cockpitFetch] Token preview:',
    accessToken?.substring(0, 50)
  )

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    if (response.status === 404) {
      // Return null for 404s (e.g., user has no API key)
      return null as T
    }

    // Try to extract error details
    let errorDetails = response.statusText
    try {
      const errorBody = await response.clone().json()
      console.log('[DEBUG cockpitFetch] Error response body:', errorBody)
      console.log('[DEBUG cockpitFetch] Validation errors:', errorBody.errors)
      errorDetails = errorBody.message || errorBody.title || errorDetails
    } catch {
      // If JSON parsing fails, try text
      try {
        const errorText = await response.clone().text()
        console.log('[DEBUG cockpitFetch] Error response text:', errorText)
        if (errorText) errorDetails = errorText
      } catch {
        // Keep default statusText
      }
    }

    throw new Error(`HTTP ${response.status}: ${errorDetails}`)
  }

  return response.json()
}

/**
 * Server-side fetch wrapper with explicit token and headers
 * For use in API routes where session is already available
 * Pattern: cockpit-portal/src/lib/swr-fetcher.ts with LicenseId/NamespaceId headers
 */
async function cockpitFetchServer<T>(
  endpoint: string,
  accessToken: string | undefined,
  licenseId: string | null | undefined,
  namespaceId: string | null | undefined,
  options?: Parameters<typeof fetch>[1]
): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`

  // Use Headers object like cockpit-portal does
  const headers = new Headers(options?.headers)

  // Set Content-Type if not already set
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Add Authorization header if accessToken exists
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  // Add LicenseId and NamespaceId headers (pattern from cockpit-portal)
  if (licenseId) {
    headers.set('LicenseId', licenseId)
  }
  if (namespaceId) {
    headers.set('NamespaceId', namespaceId)
  }

  // Debug log headers (temporary)
  console.log('[DEBUG cockpitFetchServer]', {
    endpoint,
    hasToken: !!accessToken,
    licenseId,
    namespaceId,
    headers: Array.from(headers.entries()).map(([k]) => k),
  })

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    if (response.status === 404) {
      // Return null for 404s (e.g., user has no API key)
      return null as T
    }
    console.error('[ERROR cockpitFetchServer]', {
      status: response.status,
      statusText: response.statusText,
      url,
    })
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Cockpit API Client
 * All methods match cockpit-portal's proven endpoints
 */
export const cockpitApiClient = {
  /**
   * Get User Personal API Key (CLIENT-SIDE)
   * Pattern: cockpit-portal/src/features/profile/services/profile-api.ts
   */
  getUserApiKey: async (
    userId: string,
    accessToken?: string
  ): Promise<APIKey | null> => {
    if (!userId) return null

    try {
      const response = await cockpitFetch<
        APIKey | { data: APIKey } | { succeeded: boolean; data: APIKey } | null
      >(`/api/UserApiKey/GetById/${userId}`, undefined, accessToken)

      console.log('[DEBUG getUserApiKey] Raw API response:', {
        hasResponse: !!response,
        responseKeys: response ? Object.keys(response) : [],
        fullObject: response, // Log the full object to see actual structure
      })

      if (!response) return null

      // IMPORTANT: Cockpit API wraps responses in {succeeded, message, data, errors} envelope
      // Check if response is wrapped and unwrap it
      let apiKey: APIKey | null = null

      if ('data' in response && response.data) {
        // Response is wrapped: {data: APIKey} or {succeeded: true, data: APIKey}
        console.log('[DEBUG getUserApiKey] Unwrapping data from envelope')
        apiKey = response.data as APIKey
      } else if ('key' in response || 'fk_user' in response) {
        // Response is direct APIKey object
        console.log('[DEBUG getUserApiKey] Direct APIKey response')
        apiKey = response as APIKey
      } else {
        console.warn(
          '[DEBUG getUserApiKey] Unknown response structure:',
          response
        )
        return null
      }

      console.log('[DEBUG getUserApiKey] Unwrapped API key:', {
        hasApiKey: !!apiKey,
        apiKeyKeys: apiKey ? Object.keys(apiKey) : [],
        hasKeyProperty: !!apiKey?.key,
        hasIdProperty: !!apiKey?.id,
        hasFkUserProperty: !!apiKey?.fk_user,
      })

      if (!apiKey) return null

      // Fix inconsistent API response (from cockpit-portal pattern)
      if (!apiKey.id && apiKey.fk_user) {
        apiKey.id = apiKey.fk_user
      }

      return apiKey
    } catch (error) {
      // Return null for 404 (user has no key yet)
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  },

  /**
   * Get User Personal API Key (SERVER-SIDE)
   * For use in API routes where session is already available
   * Pattern: cockpit-portal with LicenseId/NamespaceId headers
   */
  getUserApiKeyServer: async (
    userId: string,
    accessToken: string | undefined,
    licenseId: string | null | undefined,
    namespaceId: string | null | undefined
  ): Promise<APIKey | null> => {
    if (!userId) return null

    try {
      const apiKey = await cockpitFetchServer<APIKey | null>(
        `/api/UserApiKey/GetById/${userId}`,
        accessToken,
        licenseId,
        namespaceId
      )

      if (!apiKey) return null

      // Fix inconsistent API response (from cockpit-portal pattern)
      if (!apiKey.id && apiKey.fk_user) {
        apiKey.id = apiKey.fk_user
      }

      return apiKey
    } catch (error) {
      // Return null for 404 (user has no key yet)
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  },

  /**
   * Create User Personal API Key
   * Pattern: cockpit-portal/src/features/profile/services/profile-api.ts
   */
  createUserApiKey: async (payload: CreateApiKeyPayload): Promise<APIKey> => {
    const response = await cockpitFetch<APIKey>('/api/UserApiKey/Create', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (!response) {
      throw new Error('Failed to create API key: No response from server')
    }

    return response
  },

  /**
   * Get License by ID
   */
  getLicense: async (
    licenseId: string,
    accessToken?: string
  ): Promise<License> => {
    const license = await cockpitFetch<License>(
      `/api/License/${licenseId}`,
      undefined,
      accessToken
    )
    if (!license) {
      throw new Error(`License not found: ${licenseId}`)
    }
    return license
  },

  /**
   * Get Namespace by ID
   */
  getNamespace: async (
    namespaceId: string,
    accessToken?: string
  ): Promise<Namespace> => {
    const namespace = await cockpitFetch<Namespace>(
      `/api/Namespace/${namespaceId}`,
      undefined,
      accessToken
    )
    if (!namespace) {
      throw new Error(`Namespace not found: ${namespaceId}`)
    }
    return namespace
  },

  /**
   * Get Utility Agents for Namespace
   * Pattern: cockpit-portal/src/features/utility_agent_ai_registry/services/utility-agent-service.ts
   */
  getUtilityAgents: async (
    namespaceId: string,
    accessToken?: string
  ): Promise<UtilityAgent[]> => {
    try {
      const response = await cockpitFetch<{
        data?: { items: UtilityAgent[] }
        items?: UtilityAgent[]
      }>(
        `/api/ArtifactUtilityAgent/GetAllUtilityAgents?namespaceId=${namespaceId}&page=1&pageSize=1000`,
        undefined,
        accessToken
      )

      // Handle different response formats (pattern from cockpit-portal)
      if (response?.data?.items) {
        return response.data.items
      } else if (response?.items) {
        return response.items
      }

      return []
    } catch (error) {
      console.error('[ERROR getUtilityAgents] Failed:', error)
      return []
    }
  },

  /**
   * Create Bootstrap Utility Agent
   * Creates a default utility agent for MCP Portal if none exists
   * Required for MCP Legacy to save artifacts (needs x-cockpit-utility-agent-id header)
   */
  createBootstrapUtilityAgent: async (
    namespaceId: string,
    accessToken?: string
  ): Promise<UtilityAgent> => {
    const payload = {
      name: 'MCP Portal Agent',
      description:
        'Auto-created utility agent for MCP Portal artifact management',
      instruction: 'Default agent for MCP Portal operations',
      objective: 'Manage artifacts and configurations for MCP Portal',
      model: 'azure-gpt-4o',
      enabled: true,
      is_mcp_enabled: false,
      type_id: 'a7c9d077-e2f9-5f4f-bf1e-1c7d9f8a0a5c', // Supervisor agent type (REQUIRED for x-cockpit-utility-agent-id)
      isSelected: false,
      disabled: false,
      namespace_id: namespaceId,
      productionVersion: '',
      pipeline_status: '',
    }

    const agent = await cockpitFetch<UtilityAgent>(
      '/api/ArtifactUtilityAgent/AddUtilityAgent',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      accessToken
    )

    if (!agent) {
      throw new Error('Failed to create bootstrap utility agent')
    }

    return agent
  },

  /**
   * Ensure Bootstrap Utility Agent Exists
   * Gets or creates a bootstrap utility agent for the namespace
   * Strategy:
   * 1. Try to get existing agents
   * 2. Look for "MCP Portal Agent" by name
   * 3. If not found, create one
   * 4. Return the agent (ensures we have utility-agent-id for MCP Legacy)
   */
  ensureBootstrapUtilityAgent: async (
    namespaceId: string,
    accessToken?: string
  ): Promise<UtilityAgent> => {
    // Get existing agents
    const agents = await cockpitApiClient.getUtilityAgents(
      namespaceId,
      accessToken
    )

    // Look for bootstrap agent by name
    const bootstrapAgent = agents.find(
      agent => agent.name === 'MCP Portal Agent'
    )

    if (bootstrapAgent) {
      console.log(
        '[ensureBootstrapUtilityAgent] Found existing agent:',
        bootstrapAgent.id
      )
      return bootstrapAgent
    }

    // No bootstrap agent found, create one
    console.log('[ensureBootstrapUtilityAgent] Creating new bootstrap agent...')
    const newAgent = await cockpitApiClient.createBootstrapUtilityAgent(
      namespaceId,
      accessToken
    )
    console.log('[ensureBootstrapUtilityAgent] Created agent:', newAgent.id)

    return newAgent
  },

  /**
   * Get Licenses for User
   * Pattern: cockpit-portal/src/features/users/services/users-api.ts
   */
  getUserLicenses: async (
    userId: string,
    accessToken?: string
  ): Promise<License[]> => {
    if (!userId) return []

    try {
      const response = await cockpitFetch<{ data: License[] }>(
        `/api/ActiveDirectoryUser/${userId}/licenses`,
        undefined,
        accessToken
      )
      return response?.data || []
    } catch (error) {
      console.error('Failed to fetch user licenses:', error)
      return []
    }
  },

  /**
   * Get Namespaces for License
   * Pattern: cockpit-portal/src/features/namespaces/services/namespaces-api.ts
   */
  getNamespacesForLicense: async (
    licenseId: string,
    accessToken?: string
  ): Promise<Namespace[]> => {
    if (!licenseId) return []

    try {
      // IMPORTANT: API requires Page and PageSize query params (default PageSize is 10, too small)
      // Using PageSize=1000 to get all namespaces (cockpit-portal pattern)
      console.log(
        '[DEBUG getNamespacesForLicense] Fetching for licenseId:',
        licenseId
      )
      const response = await cockpitFetch<{
        data: {
          items: Namespace[]
          totalCount: number
          page: number
          limit: number
        }
      }>(
        `/api/Namespace/GetAllNamespacesByLicenseId/${licenseId}?Page=1&PageSize=1000`,
        undefined,
        accessToken
      )
      console.log('[DEBUG getNamespacesForLicense] Response:', response)
      console.log(
        '[DEBUG getNamespacesForLicense] Namespaces items:',
        response?.data?.items
      )
      return response?.data?.items || []
    } catch (error) {
      console.error('[ERROR getNamespacesForLicense] Failed:', error)
      return []
    }
  },
}
