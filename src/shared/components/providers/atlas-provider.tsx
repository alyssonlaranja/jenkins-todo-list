'use client'

/**
 * AtlasProvider
 *
 * Simple wrapper that provides Atlas context without CopilotKit.
 *
 * NOTE: CopilotKit is NOT used here to avoid conflicts with module-specific
 * CopilotKit providers (Upstream, Onboarding, Migration, etc.).
 *
 * The AtlasSpotlight in the header works as a navigation/search UI that
 * redirects to the Atlas page where CopilotKit chat is properly configured.
 */

interface AtlasProviderProps {
  children: React.ReactNode
}

export function AtlasProvider({ children }: AtlasProviderProps) {
  // Simple pass-through - no CopilotKit to avoid provider conflicts
  return <>{children}</>
}

export default AtlasProvider
