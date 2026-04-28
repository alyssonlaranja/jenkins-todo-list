/**
 * Authentication helpers for API routes
 *
 * This module provides utilities for handling authentication in server-side API routes.
 * It follows the established pattern from the [...path]/route.ts implementation.
 */
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

/**
 * Authentication result interface
 */
export interface AuthResult {
  success: boolean
  token?: string
  error?: string
}

/**
 * Extracts the Bearer token from the NextAuth JWT token
 *
 * @param request - The NextRequest object
 * @returns Promise<AuthResult> - Authentication result with token or error
 */
export async function getAuthToken(request: NextRequest): Promise<AuthResult> {
  try {
    const token = await getToken({ req: request })
    const cockpitApiToken = token?.cockpit_api_token as string

    if (!cockpitApiToken) {
      return {
        success: false,
        error: 'No authentication token available',
      }
    }

    return {
      success: true,
      token: cockpitApiToken,
    }
  } catch (error) {
    console.error('Error retrieving access token:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown authentication error',
    }
  }
}

/**
 * Creates an authenticated headers object with Bearer token
 *
 * @param request - The NextRequest object
 * @param additionalHeaders - Optional additional headers to include
 * @returns Promise<Headers> - Headers object with Authorization header
 */
export async function createAuthHeaders(
  request: NextRequest,
  additionalHeaders?: Record<string, string>
): Promise<Headers> {
  const headers = new Headers(additionalHeaders)

  const authResult = await getAuthToken(request)

  if (authResult.success && authResult.token) {
    headers.set('Authorization', `Bearer ${authResult.token}`)
  }

  return headers
}

/**
 * Creates a standardized error response for authentication failures
 *
 * @param status - HTTP status code
 * @param message - Error message
 * @param details - Optional additional error details
 * @returns Response object with error information
 */
export function createAuthErrorResponse(
  status: number,
  message: string,
  details?: unknown
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      details,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}
