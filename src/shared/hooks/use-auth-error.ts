import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { toast } from '@/shared/hooks/use-toast'

/**
 * Authentication error codes returned by NextAuth
 * and custom error codes for specific auth scenarios
 */
export type AuthErrorCode =
  | 'OAuthSignin'
  | 'OAuthCallback'
  | 'OAuthCreateAccount'
  | 'EmailCreateAccount'
  | 'Callback'
  | 'AuthenticationFailed'
  | 'OAuthAccountNotLinked'
  | 'EmailSignin'
  | 'CredentialsSignin'
  | 'SessionRequired'
  | 'ServerError'
  | 'ApiServerError'
  | 'insufficient_permissions'
  | 'no_licenses'
  | 'no_namespaces'
  | 'validation_error'
  | 'default'

/**
 * Options for handling authentication errors
 */
interface AuthErrorOptions {
  /** Whether to redirect to the login page */
  redirectToLogin?: boolean
  /** Whether to show a toast notification */
  showToast?: boolean
}

/**
 * Map of error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  OAuthSignin: 'Error during OAuth sign-in process',
  OAuthCallback: 'Error during OAuth callback process',
  OAuthCreateAccount: 'Error creating OAuth user',
  EmailCreateAccount: 'Error creating email user',
  Callback:
    'Authentication with Cockpit failed. Please verify your permissions or try again later.',
  AuthenticationFailed:
    'Authentication with Cockpit failed. The service may be unavailable at this time.',
  OAuthAccountNotLinked: 'Email already in use with different provider',
  EmailSignin: 'Error sending verification email',
  CredentialsSignin: 'Invalid credentials',
  SessionRequired: 'Authentication required to access this page',
  ServerError: 'Authentication server error. Please try again later.',
  ApiServerError: 'Cockpit API server error. Please try again later.',
  insufficient_permissions:
    'Access denied. You must have at least one active license and namespace to access the system.',
  no_licenses:
    'Access denied. No active licenses found for your account. Please contact your administrator.',
  no_namespaces:
    'Access denied. No accessible namespaces found for your account. Please contact your administrator.',
  validation_error:
    'Access validation error occurred. Please try logging in again.',
  default: 'Failed to login! Try again or review your permissions.',
}

/**
 * Custom hook for handling authentication errors
 * Provides functionality to display error messages and redirect to login page
 */
export function useAuthError() {
  const router = useRouter()

  /**
   * Get the base path for the application
   * Handles empty custom base path gracefully
   */
  const getBasePath = (): string => {
    return process.env.NEXT_PUBLIC_CUSTOM_BASE_PATH || ''
  }

  /**
   * Get a user-friendly error message for an error code
   */
  const getErrorMessage = useCallback((errorCode: string): string => {
    const code = errorCode as AuthErrorCode
    return ERROR_MESSAGES[code] || ERROR_MESSAGES.default
  }, [])

  /**
   * Handle an authentication error
   * Can optionally redirect to login page and/or show a toast notification
   */
  const handleAuthError = useCallback(
    (
      errorCode: string,
      options: AuthErrorOptions = { redirectToLogin: true, showToast: true }
    ): void => {
      // Show toast if enabled
      if (options.showToast) {
        toast({
          title: 'Authentication Error',
          description: getErrorMessage(errorCode),
          variant: 'destructive',
        })
      }

      // Redirect to login page if enabled
      if (options.redirectToLogin) {
        const basePath = getBasePath()
        const loginPath = basePath
          ? `/${basePath}/login?error=${errorCode}`
          : `/login?error=${errorCode}`
        router.push(loginPath)
      }
    },
    [getErrorMessage, router]
  )

  return {
    handleAuthError,
    getErrorMessage,
  }
}
