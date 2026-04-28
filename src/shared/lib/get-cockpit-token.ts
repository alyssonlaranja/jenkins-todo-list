import { getExternalApiUrl } from './api-helpers'
import { failure, fromPromise, success, type Result } from './generic-results'

/**
 * Custom error types for authentication
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class ApiServerError extends AuthenticationError {
  constructor(message: string) {
    super(message)
    this.name = 'ApiServerError'
  }
}

export class AuthorizationError extends AuthenticationError {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Response type for authenticate token API
 */
interface AuthenticateTokenResponse {
  succeeded: boolean
  message: string
  data: {
    accessToken: string
    encryptedAccessToken: string
    expireInSeconds: number
    userId: string
    email: string
  }
  errors: null
}

/**
 * API URL for token authentication - lazy loaded to avoid initialization issues
 */

const getAuthUrl = () => {
  return `${getExternalApiUrl()}/api/Authenticate/AuthenticateToken`
}

/**
 * Fetches a token from the Cockpit API using the ID token
 * Uses Result pattern for more functional error handling
 */
export async function getCockpitToken(
  idToken?: string
): Promise<Result<string, AuthenticationError>> {
  if (!idToken) {
    return failure(new AuthenticationError('Access token is required'))
  }

  // Attempt to fetch the token
  const authUrl = getAuthUrl()
  console.log('🔗 Auth URL being used:', authUrl)
  console.log('🎫 ID Token length:', idToken?.length, 'chars')
  console.log('🎫 ID Token preview:', idToken?.substring(0, 50) + '...')

  const requestBody = `"${idToken}"`
  console.log('📦 Request body:', requestBody)

  const fetchResult = await fromPromise<Response, Error>(
    fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: requestBody,
    })
  )

  // Handle fetch errors
  if (!fetchResult.success) {
    console.error('Error fetching Cockpit token:', fetchResult.error)
    return failure(
      new AuthenticationError('Failed to connect to authentication service')
    )
  }

  const response = fetchResult.data

  // Handle HTTP errors
  if (!response.ok) {
    console.error(`❌ HTTP Error ${response.status}: ${response.statusText}`)
    console.error(
      '📄 Response headers:',
      Object.fromEntries(response.headers.entries())
    )

    // Try to get the error response body for debugging
    try {
      const errorText = await response.clone().text()
      console.error('📄 Error response body:', errorText)
    } catch (e) {
      console.error('Could not read error response body:', e)
    }

    if (response.status === 500) {
      return failure(
        new ApiServerError(
          'Failed to authenticate token. The Cockpit API server is unavailable.'
        )
      )
    } else if (response.status === 401 || response.status === 403) {
      return failure(
        new AuthorizationError(
          'Failed to authenticate token. Access denied. Please check your permissions.'
        )
      )
    }

    try {
      // Try to get more details from the response
      const errorData = await response.json()
      const errorMessage =
        errorData.message ||
        `Failed to authenticate token. Status: ${response.status}`
      return failure(new AuthenticationError(errorMessage, response.status))
    } catch {
      // Fallback error message
      return failure(
        new AuthenticationError(
          `Failed to authenticate token. Status: ${response.status}`,
          response.status
        )
      )
    }
  }

  // Parse the response body
  try {
    const responseResult = await fromPromise<AuthenticateTokenResponse, Error>(
      response.json()
    )

    if (!responseResult.success) {
      return failure(new AuthenticationError('Invalid response format'))
    }

    const responseBody = responseResult.data

    // Verify the response format
    if (!responseBody?.data?.accessToken) {
      return failure(
        new AuthenticationError(
          'Invalid response format: accessToken is missing'
        )
      )
    }

    return success(responseBody.data.accessToken)
  } catch (parseError) {
    console.error('Error parsing Cockpit token response:', parseError)
    return failure(
      new AuthenticationError('Failed to parse authentication response')
    )
  }
}
