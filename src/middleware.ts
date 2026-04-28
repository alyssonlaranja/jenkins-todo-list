import { withAuth } from 'next-auth/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { escapeRegex } from '@/shared/lib/utils'

/**
 * Authentication Middleware
 *
 * This file manages the application's authentication flow and redirections:
 *
 * 1. Integration with NextAuth for authentication
 * 2. Redirections based on authentication state
 * 3. Authentication error handling
 * 4. Public vs. protected routes
 *
 * The error flow is coordinated with src/auth.ts, which maps specific
 * authentication errors to standard NextAuth error codes.
 */

// Application configuration
const APP_CONFIG = {
  basePath: (process.env.NEXT_PUBLIC_CUSTOM_BASE_PATH as string) || '',
  publicRoutes: [
    '/login',
    '/api/auth',
    '/api/config',
    '/api/health',
    '/images',
  ],
  defaultDashboardPath: '/sda2',
}

// Route types for better organization
const ROUTE_PATTERNS = {
  root: ['', '/'],
  dashboard: ['/dashboard', '/dashboard/'],
  authError: ['/api/auth/error', '/api/auth/undefined/login'],
}

/**
 * Normalizes a pathname by removing the basePath prefix
 */
function normalizePathname(pathname: string): string {
  return pathname.replace(
    new RegExp(`^${escapeRegex(APP_CONFIG.basePath)}`),
    ''
  )
}

/**
 * Creates a redirect URL using the correct external base URL
 * Uses NEXTAUTH_URL to avoid issues with internal container URLs (e.g., 0.0.0.0:4200)
 */
function createRedirectUrl(path: string, req: NextRequest | Request): URL {
  // Use NEXTAUTH_URL to get the correct external URL instead of relying on req.url
  // which can be incorrect in containerized environments (e.g., 0.0.0.0:4200)
  const nextAuthUrl = process.env.NEXTAUTH_URL
  const externalBaseUrl = nextAuthUrl
    ? new URL(nextAuthUrl).origin
    : new URL(req.url).origin

  return new URL(path, externalBaseUrl)
}

/**
 * Builds a login URL with optional error parameter
 */
function buildLoginUrl(errorCode?: string): string {
  const { basePath } = APP_CONFIG
  const loginPath = basePath ? `/${basePath}/login` : '/login'

  return errorCode ? `${loginPath}?error=${errorCode}` : loginPath
}

/**
 * Handles redirection to the default dashboard
 */
function handleDashboardRedirect(req: NextRequest): NextResponse {
  return NextResponse.redirect(
    createRedirectUrl(APP_CONFIG.defaultDashboardPath, req)
  )
}

/**
 * Handles authentication error redirection
 */
function handleAuthErrorRedirect(req: NextRequest): NextResponse {
  const searchParams = req.nextUrl.searchParams
  const errorCode = searchParams.get('error') || 'default'

  return NextResponse.redirect(createRedirectUrl(buildLoginUrl(errorCode), req))
}

/**
 * Determines if the request path is a root path
 */
function isRootPath(path: string): boolean {
  return ROUTE_PATTERNS.root.includes(path)
}

/**
 * Determines if the request path is a dashboard base path
 */
function isDashboardBasePath(path: string): boolean {
  return ROUTE_PATTERNS.dashboard.includes(path)
}

/**
 * Determines if the request path is an auth error path
 */
function isAuthErrorPath(path: string): boolean {
  return ROUTE_PATTERNS.authError.some(pattern => path.startsWith(pattern))
}

/**
 * Determines if a route is public (doesn't require authentication)
 */
function isPublicRoute(path: string): boolean {
  return APP_CONFIG.publicRoutes.some(route => path.startsWith(route))
}

// Middleware that uses NextAuth.js withAuth for secure session validation
export default withAuth(
  function middleware(req) {
    const normalizedPath = normalizePathname(req.nextUrl.pathname)

    // Root path: redirect authenticated users to dashboard
    if (isRootPath(normalizedPath) && req.nextauth.token) {
      return handleDashboardRedirect(req)
    }

    // Dashboard base path: redirect to default dashboard view
    if (isDashboardBasePath(normalizedPath)) {
      return handleDashboardRedirect(req)
    }

    // Auth error paths: redirect to login with error
    if (isAuthErrorPath(normalizedPath)) {
      return handleAuthErrorRedirect(req)
    }

    // All other routes are handled by withAuth
    return NextResponse.next()
  },
  {
    // NextAuth configuration
    pages: {
      signIn: '/login',
    },
    callbacks: {
      authorized({ req, token }) {
        const path = normalizePathname(req.nextUrl.pathname)
        return isPublicRoute(path) || !!token
      },
    },
  }
)

// Matcher configuration to apply middleware only to necessary routes
export const config = {
  matcher: [
    // Apply to all routes except Next.js internal routes, static files, and upload API routes
    '/((?!_next|static|favicon\\.ico|robots\\.txt|api/uploads).*)',
  ],
}
