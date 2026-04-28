import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

import type { SecureRuntimeConfig } from '@/shared/lib/cockpit/types'

interface UseMcpServerKeyReturn {
  mcpServerKey: string | null
  isLoading: boolean
  error: string | null
}

/**
 * Hook to fetch MCP Server API Key from secure endpoint
 * Pattern: cockpit-portal/src/hooks/use-secure-config.ts
 */
export function useMcpServerKey(): UseMcpServerKeyReturn {
  const [mcpServerKey, setMcpServerKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session, status } = useSession()

  useEffect(() => {
    let isMounted = true

    const fetchMcpServerKey = async () => {
      if (!session) {
        if (isMounted) {
          setMcpServerKey(null)
          setIsLoading(false)
          setError('Authentication required')
        }
        return
      }

      try {
        const response = await fetch('/api/config/secure', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const config: SecureRuntimeConfig = await response.json()

        // Debug log (temporary)
        console.log('[DEBUG] MCP Server Key received:', {
          hasKey: !!config.mcpServerApiKey,
          value: config.mcpServerApiKey,
          length: config.mcpServerApiKey?.length || 0,
        })

        // Check if fallback value is returned (matches cockpit-portal pattern)
        const isFallback =
          config.mcpServerApiKey === 'MCP_SERVER_API_KEY not set'

        if (isMounted) {
          if (isFallback) {
            setMcpServerKey(null)
            setError('MCP Server API Key not configured')
            console.warn(
              '[WARN] MCP_SERVER_API_KEY environment variable not set'
            )
          } else {
            setMcpServerKey(config.mcpServerApiKey)
            setError(null)
          }
        }
      } catch (err) {
        console.error('Failed to fetch MCP Server API Key:', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    if (status !== 'loading') {
      fetchMcpServerKey()
    }

    return () => {
      isMounted = false
    }
  }, [session, status])

  return { mcpServerKey, isLoading, error }
}
