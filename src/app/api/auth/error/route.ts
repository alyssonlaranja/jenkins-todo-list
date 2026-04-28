import { NextResponse } from 'next/server'

/**
 * Handler for NextAuth authentication errors
 * Redirects the user to the login page with the appropriate error code
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get('error') || 'default'

  // Get the application base path (if it exists)
  const basePath = process.env.NEXT_PUBLIC_CUSTOM_BASE_PATH || ''
  const loginPath = basePath ? `/${basePath}/login` : '/login'

  // Build redirect URL with error code
  const redirectUrl = `${loginPath}?error=${error}`

  // Log the error to console for debugging
  console.log(`Redirecting to login page due to authentication error: ${error}`)

  // Use NEXTAUTH_URL to get the correct external URL instead of relying on request.url
  // which can be incorrect in containerized environments (e.g., 0.0.0.0:4200)
  const nextAuthUrl = process.env.NEXTAUTH_URL
  const externalBaseUrl = nextAuthUrl
    ? new URL(nextAuthUrl).origin
    : new URL(request.url).origin

  // Redirect to login page with error code using the correct external URL
  return NextResponse.redirect(new URL(redirectUrl, externalBaseUrl))
}
