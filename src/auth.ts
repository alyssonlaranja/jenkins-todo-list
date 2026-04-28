import type { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'

import { ApiServerError, getCockpitToken } from '@/shared/lib/get-cockpit-token'

// Map of error types to standard NextAuth error codes
const ERROR_CODE_MAP = {
  ApiServerError: 'ApiServerError',
  AuthorizationError: 'Callback',
  default: 'AuthenticationFailed',
}

/**
 * Maps authentication error types to NextAuth error codes
 */
function mapErrorToNextAuthCode(error: Error): string {
  const errorType =
    error instanceof ApiServerError ? 'ApiServerError' : error.name
  return (
    ERROR_CODE_MAP[errorType as keyof typeof ERROR_CODE_MAP] ||
    ERROR_CODE_MAP.default
  )
}

// Resolve base path safely — avoid "undefined" in URLs when env var is not set
const customBasePath = process.env.NEXT_PUBLIC_CUSTOM_BASE_PATH?.trim() || ''
const loginPath = customBasePath ? `/${customBasePath}/login` : '/login'

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: { params: { scope: 'openid profile email' } },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: loginPath,
    signOut: loginPath,
    error: loginPath,
  },
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60, // 12 hours
  },
  callbacks: {
    async jwt({ token, account }) {
      // Debug log para troubleshooting de autenticação
      console.log('[AUTH] JWT callback:', {
        hasAccount: !!account,
        hasIdToken: !!account?.id_token,
        hasExistingCockpitToken: !!token.cockpit_api_token,
        tokenError: token.error,
      })

      // Return existing token if no account is present (not in sign-in flow)
      if (!account) {
        return token
      }

      // Skip token retrieval if no id_token is available
      if (!account.id_token) {
        console.warn(
          '[AUTH] No id_token available in account, skipping token retrieval'
        )
        return token
      }

      try {
        // Getting the access token from the account.id_token for future Cockpit API calls
        console.log('[AUTH] Requesting Cockpit token...')
        const result = await getCockpitToken(account.id_token)

        // Handle success case
        if (result.success) {
          console.log('[AUTH] ✅ Cockpit token obtained successfully')
          // Persist tokens in the token object
          token.access_token = account.access_token
          token.id_token = account.id_token
          token.expires_at = account.expires_at
          token.cockpit_api_token = result.data
          return token
        }

        // If we reach here, there was an error but not an exception
        console.error('[AUTH] ❌ Failed to get Cockpit token:', result.error)
        token.error = mapErrorToNextAuthCode(result.error)
        throw result.error
      } catch (error) {
        // Log the error
        console.error('[AUTH] ❌ Authentication error in JWT callback:', error)

        // Set appropriate error code on token
        if (error instanceof Error) {
          token.error = mapErrorToNextAuthCode(error)
        } else {
          token.error = ERROR_CODE_MAP.default
        }

        // Re-throw the error for NextAuth to handle the authentication failure
        throw error
      }
    },
    async session({ session, token }) {
      // Debug log para troubleshooting de sessão
      console.log('[AUTH] Session callback:', {
        hasCockpitToken: !!token.cockpit_api_token,
        tokenLength: token.cockpit_api_token
          ? String(token.cockpit_api_token).length
          : 0,
        error: token.error,
        userName: session.user?.name,
      })

      // Use session to send the token and error information to the client
      return {
        ...session,
        accessToken: token.cockpit_api_token,
        error: token.error,
      }
    },
    async redirect({ url, baseUrl }) {
      await Promise.resolve()

      // Use NEXTAUTH_URL to get the correct external URL instead of relying on baseUrl
      // which can be incorrect in containerized environments (e.g., 0.0.0.0:4200)
      const nextAuthUrl = process.env.NEXTAUTH_URL
      const externalBaseUrl = nextAuthUrl
        ? new URL(nextAuthUrl).origin
        : baseUrl

      if (url.startsWith(externalBaseUrl)) {
        return url
      } else if (url.startsWith('/')) {
        return `${externalBaseUrl}${url}`
      }
      // Fix for redirect loop - handle empty NEXT_PUBLIC_CUSTOM_BASE_PATH
      const customPath = process.env.NEXT_PUBLIC_CUSTOM_BASE_PATH || ''
      const dashboardConnectionsPath = customPath
        ? `/${customPath}/sda`
        : '/sda'
      return `${externalBaseUrl}${dashboardConnectionsPath}`
    },
  },
}
