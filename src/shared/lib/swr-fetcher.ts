/**
 * SWR Fetcher with automatic License/Namespace header injection
 *
 * This fetcher automatically injects the following headers in all API calls:
 * - Authorization: Bearer token from NextAuth session
 * - LicenseId: Active license ID from localStorage
 * - NamespaceId: Active namespace ID from localStorage
 */
import { type Session } from 'next-auth'
import { getSession, signOut } from 'next-auth/react'

import type { ApiResponse } from '@/shared/lib/generic-results'

// eslint-disable-next-line no-undef
type FetchInit = RequestInit

// Helper function to handle redirect
const redirectToLogin = () => {
  const loginPath = `${process.env.NEXT_PUBLIC_CUSTOM_BASE_PATH || ''}/login`
  signOut({ callbackUrl: loginPath })
  return Promise.reject(
    new Error('Session expired or invalid. Redirecting to login.')
  )
}

/**
 * Check if value is a non-null object
 */
const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

/**
 * SWR fetcher with authorization support and automatic header injection
 */
export async function swrFetcher<T = unknown>(
  input: string,
  init?: FetchInit & { token?: string }
): Promise<T> {
  const headers = new Headers(init?.headers)

  // INJECT LICENSE/NAMESPACE HEADERS FROM LOCALSTORAGE
  try {
    const storeRaw =
      typeof window !== 'undefined'
        ? localStorage.getItem('license-namespace-store')
        : null
    const skipAutoHeaders = headers.has('GlobalAdminBypass')

    if (storeRaw && !skipAutoHeaders) {
      const store = JSON.parse(storeRaw)
      const license = store?.state?.activeLicense
      const namespace = store?.state?.activeNamespace

      // Only set LicenseId if not already provided in headers
      if (license?.id && !headers.has('LicenseId')) {
        headers.set('LicenseId', `${license.id}`)
      }

      // Only set NamespaceId if not already provided in headers
      if (namespace?.id && !headers.has('NamespaceId')) {
        headers.set('NamespaceId', `${namespace.id}`)
      }
    }

    // Remove the bypass header before sending
    if (skipAutoHeaders) {
      headers.delete('GlobalAdminBypass')
    }
  } catch (e) {
    // If parsing fails, do not block the request, just log
    console.error('Failed to inject LicenseId/NamespaceId headers:', e)
  }

  // INJECT AUTHORIZATION HEADER
  if (!init?.token) {
    // Only check session if no explicit token is provided
    const session = await getSession()
    if (!session) {
      return redirectToLogin()
    }
    // Assuming accessToken is essential for API calls
    const accessToken = (session as Session & { accessToken?: string })
      .accessToken
    if (!accessToken) {
      return redirectToLogin()
    }
    headers.set('Authorization', `Bearer ${accessToken}`)
  } else {
    // Use the provided token if available
    headers.set('Authorization', `Bearer ${init.token}`)
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  if (!response.ok) {
    // Handle 401 specifically by redirecting
    if (response.status === 401) {
      return redirectToLogin()
    }
    // Handle other HTTP errors
    if (response.status === 404) {
      throw new Error('Resource not found (404).')
    }

    // Error handling
    let errorMessage = ''
    let errorBodyForFallback = ''

    try {
      const errorData = await response.clone().json()

      if (errorData && typeof errorData === 'object') {
        if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          errorMessage = errorData.errors
            .map((err: unknown) =>
              typeof err === 'string' ? err : JSON.stringify(err)
            )
            .join('. ')
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message
        }
      }
    } catch {
      // JSON parsing failed, try reading body as text
      try {
        errorBodyForFallback = await response.text()
      } catch (textReadError) {
        console.error(
          'SWR Fetcher: Failed to read error response body as text:',
          textReadError
        )
        errorBodyForFallback = '(Failed to read error body)'
      }
    }

    if (errorMessage) {
      throw new Error(errorMessage)
    }

    if (!errorBodyForFallback && !errorMessage) {
      try {
        errorBodyForFallback = await response.text()
      } catch (e) {
        console.error(
          'SWR Fetcher: Failed to read error response body as text (final fallback):',
          e
        )
        errorBodyForFallback = response.statusText
      }
    }

    const genericErrorMessage = `Request failed: ${response.status}${errorBodyForFallback ? ` - ${errorBodyForFallback}` : ''}`
    throw new Error(genericErrorMessage)
  }

  // Handle potentially successful HTTP status but failed API operation
  try {
    const jsonResponse = await response.json()

    // Case 1: Response is already of the expected type T directly (no wrapper)
    if (
      isObject(jsonResponse) &&
      !('succeeded' in jsonResponse) &&
      !('data' in jsonResponse)
    ) {
      return jsonResponse as T
    }

    // Case 2: Standard ApiResponse<T> format check with 'succeeded' flag
    if (isObject(jsonResponse) && 'succeeded' in jsonResponse) {
      const apiResponse = jsonResponse as unknown as ApiResponse<T>

      // Check if failed operation with 'succeeded' flag
      if (apiResponse.succeeded === false) {
        if (
          Array.isArray(apiResponse.errors) &&
          apiResponse.errors.length > 0
        ) {
          throw new Error(
            apiResponse.errors
              .map((err: unknown) =>
                typeof err === 'string' ? err : JSON.stringify(err)
              )
              .join('. ')
          )
        } else if (typeof apiResponse.message === 'string') {
          throw new Error(apiResponse.message)
        }
        throw new Error(
          'API operation failed: The request was processed, but the operation was not successful.'
        )
      }

      // Case 2a: Standard ApiResponse<T> with 'data' field
      if ('data' in apiResponse) {
        return apiResponse.data
      }
    }

    // Case 3: Fallback - just return the response as is
    return jsonResponse as T
  } catch (jsonParseError) {
    console.error('SWR Fetcher: Failed to parse JSON response:', jsonParseError)
    throw new Error('Failed to process response from server.')
  }
}
