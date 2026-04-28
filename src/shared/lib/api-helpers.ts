/**
 * Utility functions for API error handling and response processing
 * These are shared across all API interactions in the application
 */
import type { RuntimeConfig } from '@/shared/types/runtime-config'

/**
 * Handles error responses from the API
 * @param response - Fetch response object
 * @param operation - Operation being performed (for error context)
 * @throws Error with appropriate message from API or fallback
 */
export async function handleApiError(
  response: Response,
  operation: string
): Promise<void> {
  if (response.ok) return

  const errorMessage = `Failed to ${operation}. Status: ${response.status}`

  try {
    // Clone the response to avoid consuming the body multiple times
    const errorData = await response.json()
    const processedMessage = processErrorData(errorData, errorMessage)
    throw new Error(processedMessage)
  } catch (error) {
    // If not JSON or if body was already read, use the error message
    if (
      error instanceof TypeError &&
      error.message.includes('Body has already been read')
    ) {
      throw new Error(errorMessage)
    }

    // Try to get as text if possible
    try {
      const errorText = await response.clone().text()
      throw new Error(errorText || errorMessage)
    } catch {
      // If all else fails, use the default error message
      throw new Error(errorMessage)
    }
  }
}

/**
 * Processes error data returned from the API
 * @param errorData - Error data from the API
 * @param defaultMessage - Default message to use if no error message can be extracted
 * @returns Processed error message
 */
function processErrorData(
  errorData: Record<string, unknown>,
  defaultMessage: string
): string {
  // Extract basic message if available
  const errorMessage =
    typeof errorData?.message === 'string' ? errorData.message : defaultMessage

  // Check if there are additional error details in an array
  if (
    errorData?.errors &&
    Array.isArray(errorData.errors) &&
    errorData.errors.length > 0
  ) {
    const errorDetails = errorData.errors
      .map(err => (typeof err === 'string' ? err : JSON.stringify(err))) // Handle potential non-string errors
      .join('. ')

    // Special case: database constraint violation
    if (isConstraintViolation(errorDetails)) {
      return 'Cannot complete this operation because this item has associated data. Please remove related items first.'
    }

    // Prioritize the detailed errors if they exist
    return errorDetails
  }

  // Fallback to the main error message if no detailed errors array is present or it's empty
  // Special case: license deletion (check based on the main message now)
  if (errorMessage === 'Fail to delete license') {
    return 'Cannot delete this license because it has associated namespaces. Please remove all associated namespaces first.'
  }

  return errorMessage
}

/**
 * Checks if the error is a database constraint violation
 * @param errorDetails - Error details string
 * @returns True if it's a constraint violation
 */
function isConstraintViolation(errorDetails: string): boolean {
  return (
    errorDetails.includes('entity changes') ||
    errorDetails.includes('constraints') ||
    errorDetails.includes('reference')
  )
}

/**
 * Builds query parameters string from an object
 * @param params - Object containing query parameters
 * @returns Formatted query string
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined>
): string {
  const queryParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, String(value))
    }
  })

  return queryParams.toString()
}

/**
 * Formats error messages for toast notifications
 * @param error - Error object
 * @returns Formatted error message
 */
export function formatErrorMessage(error: unknown): string {
  // Special case: the error is already a string
  if (typeof error === 'string') {
    return error
  }

  // Case: error with message property defined
  if (error instanceof Error) {
    return error.message
  }

  // Case: API response with error object
  if (error && typeof error === 'object') {
    return extractErrorMessageFromObject(error as Record<string, unknown>)
  }

  // Fallback for generic case
  return 'An unknown error occurred. Please try again or contact support.'
}

/**
 * Extracts the error message from an object
 * @param errorObj - Error object
 * @returns Extracted error message
 */
function extractErrorMessageFromObject(
  errorObj: Record<string, unknown>
): string {
  // Check if there is a 'message' field
  if ('message' in errorObj && typeof errorObj.message === 'string') {
    return errorObj.message
  }

  // Check if there is a 'error' field
  if ('error' in errorObj && typeof errorObj.error === 'string') {
    return errorObj.error
  }

  // Check if there is an 'errors' array
  if ('errors' in errorObj && Array.isArray(errorObj.errors)) {
    return extractErrorFromErrorsArray(errorObj.errors)
  }

  return 'An unknown error occurred. Please try again or contact support.'
}

/**
 * Extracts error messages from an array of errors
 * @param errors - Array of errors
 * @returns Concatenated error messages
 */
function extractErrorFromErrorsArray(errors: unknown[]): string {
  if (errors.length === 0) {
    return 'An unknown error occurred. Please try again or contact support.'
  }

  // If the first item is a string, join with comma
  if (typeof errors[0] === 'string') {
    return errors.join(', ')
  }

  // If the first item is an object with a 'message' field, join with comma
  if (errors[0] && typeof errors[0] === 'object' && 'message' in errors[0]) {
    return errors
      .map(err => {
        const errorObj = err as { message?: unknown }
        return typeof errorObj.message === 'string' ? errorObj.message : ''
      })
      .filter(Boolean)
      .join(', ')
  }

  return 'An unknown error occurred. Please try again or contact support.'
}

/**
 * Gets cached WebSocket server URL from sessionStorage
 * @returns Cached WebSocket URL or null if not available
 */
function getCachedWebSocketUrl(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const cachedConfig = sessionStorage.getItem('runtime-config')
    if (cachedConfig) {
      const config: RuntimeConfig = JSON.parse(cachedConfig)
      return config.websocketServer || null
    }
  } catch (error) {
    console.warn('Failed to parse cached runtime config:', error)
  }

  return null
}

/**
 * Safely retrieves the API base URL with runtime config fallback.
 * This function is designed to be safe to call in any environment (client, server, build).
 *
 * @throws Error if no valid API URL is available in the expected environment.
 */
export function getApiBaseUrl(): string {
  // 1. Server-side or Build-time: Environment variable is the ONLY source of truth.
  if (typeof window === 'undefined') {
    if (process.env.NEXT_PUBLIC_API_URL) {
      try {
        new URL(process.env.NEXT_PUBLIC_API_URL) // Validate URL
        return process.env.NEXT_PUBLIC_API_URL
      } catch {
        throw new Error(
          `Invalid NEXT_PUBLIC_API_URL on server: ${process.env.NEXT_PUBLIC_API_URL}`
        )
      }
    }
    // During static build, we allow this to pass to avoid build failures.
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PHASE === 'phase-production-build'
    ) {
      return 'BUILD_TIME_PLACEHOLDER_USE_RUNTIME_CONFIG'
    }
    throw new Error('NEXT_PUBLIC_API_URL is not set on the server environment.')
  }

  // 2. Client-side: The rest of the logic only runs in the browser.
  try {
    // Try to get from sessionStorage first
    const cachedConfigStr = sessionStorage.getItem('runtime-config')
    if (cachedConfigStr) {
      const config = JSON.parse(cachedConfigStr) as RuntimeConfig
      if (config.apiUrl) {
        return config.apiUrl
      }
    }
  } catch (error) {
    console.warn('Failed to parse cached runtime-config:', error)
    sessionStorage.removeItem('runtime-config') // Clear corrupted cache
  }

  // Fallback to fetching from the /api/config endpoint
  try {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', '/api/config', false) // Synchronous request is a last resort
    xhr.send()

    if (xhr.status === 200) {
      const config = JSON.parse(xhr.responseText) as RuntimeConfig
      if (config.apiUrl) {
        sessionStorage.setItem('runtime-config', xhr.responseText) // Cache for next time
        return config.apiUrl
      }
    }
  } catch (error) {
    console.warn('Synchronous /api/config fetch failed:', error)
  }

  // Final fallback to environment variable on the client
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  throw new Error(
    'Failed to determine API URL on client. /api/config is down and NEXT_PUBLIC_API_URL is not set.'
  )
}

/**
 * Safe version of getApiBaseUrl that returns null instead of throwing
 * Use this when you want to check if configuration is available without causing errors
 * @returns API base URL or null if not available
 */
export function getApiBaseUrlSafe(): string | null {
  try {
    return getApiBaseUrl()
  } catch {
    return null
  }
}

/**
 * Safely retrieves the WebSocket server URL with runtime config fallback
 * Uses the /api/config endpoint response when available
 * @throws Error if no valid WebSocket URL is available
 */
export function getWebSocketServerUrl(): string {
  // Build-time: provide a placeholder that will be replaced at runtime
  if (
    typeof window === 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    // During static build, return a placeholder that indicates runtime config is needed
    // This prevents build failures while ensuring runtime configuration is used
    return 'BUILD_TIME_PLACEHOLDER_USE_RUNTIME_CONFIG'
  }

  // Client-side: try cached config from /api/config first
  const cachedUrl = getCachedWebSocketUrl()
  if (cachedUrl) return cachedUrl

  // Server-side runtime: environment variable is required
  if (process.env.NEXT_PUBLIC_WEBSOCKET_SERVER) {
    try {
      new URL(process.env.NEXT_PUBLIC_WEBSOCKET_SERVER) // Validate URL
      return process.env.NEXT_PUBLIC_WEBSOCKET_SERVER
    } catch {
      throw new Error(
        `Invalid NEXT_PUBLIC_WEBSOCKET_SERVER: ${process.env.NEXT_PUBLIC_WEBSOCKET_SERVER}`
      )
    }
  }

  // No valid configuration found
  throw new Error(
    'No valid WebSocket server URL configuration found. Please set NEXT_PUBLIC_WEBSOCKET_SERVER environment variable or ensure /api/config is accessible.'
  )
}

/**
 * Safe version of getWebSocketServerUrl that returns null instead of throwing
 * Use this when you want to check if WebSocket configuration is available without causing errors
 * @returns WebSocket server URL or null if not available
 */
export function getWebSocketServerUrlSafe(): string | null {
  try {
    return getWebSocketServerUrl()
  } catch {
    return null
  }
}

/**
 * Alias for getApiBaseUrl() - both functions serve the same purpose
 * @deprecated Use getApiBaseUrl() instead for consistency
 */
export function getExternalApiUrl(): string {
  return getApiBaseUrl()
}

/**
 * Gets the application base URL for constructing absolute URLs
 * This is used for uploads and other application-specific URLs
 * @throws Error if no valid app URL configuration is found
 */
export function getAppBaseUrl(request?: Request): string {
  // If we have a request object (server-side), use it to construct the URL
  if (request) {
    const host = request.headers.get('host')
    if (!host) {
      throw new Error('No host header found in request')
    }
    const protocol =
      request.headers.get('x-forwarded-proto') ||
      (host.includes('localhost') ? 'http' : 'https')
    return `${protocol}://${host}`
  }

  // Client-side: use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Server-side: check environment variables
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_APP_URL) // Validate URL
      return process.env.NEXT_PUBLIC_APP_URL
    } catch {
      throw new Error(
        `Invalid NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`
      )
    }
  }

  // Development environment: try to construct from NODE_ENV
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4200'
  }

  throw new Error(
    'No valid app URL configuration found. Please set NEXT_PUBLIC_APP_URL environment variable.'
  )
}
export function createSecureErrorResponse(
  status: number,
  message: string,
  error?: unknown,
  additionalDetails?: Record<string, unknown>
): Response {
  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error(`[API Error] ${message}`, {
      status,
      error: errorMessage,
      stack: errorStack,
      details: additionalDetails,
    })
  }

  const responseBody: {
    error: string
    details?: {
      message: string
      stack?: string
      [key: string]: unknown
    }
  } = {
    error: message,
  }

  if (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test'
  ) {
    responseBody.details = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ...additionalDetails,
    }
  }

  return new Response(JSON.stringify(responseBody), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
