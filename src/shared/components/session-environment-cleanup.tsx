'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

import { useConnectionManager } from '@/features/connections/hooks/use-connection-manager'
import { useEnvironmentStore } from '@/shared/stores/environment-store'

/**
 * Component to cleanup session resources on logout
 * Removes ephemeral session environment and session connection when user signs out
 */
export function SessionEnvironmentCleanup() {
  const { status } = useSession()
  const { environments, deleteEnvironment } = useEnvironmentStore()
  const { connections, removeConnection } = useConnectionManager()

  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log(
        '[SessionCleanup] User logged out, cleaning up session resources...'
      )

      // Remove session environment
      const sessionEnv = environments.find(env => env.type === 'session')
      if (sessionEnv) {
        console.log(
          '[SessionCleanup] Removing session environment:',
          sessionEnv.id
        )
        deleteEnvironment(sessionEnv.id)
      }

      // Remove session connection
      const sessionConn = connections.find(conn => conn.type === 'session')
      if (sessionConn) {
        console.log(
          '[SessionCleanup] Removing session connection:',
          sessionConn.id
        )
        removeConnection(sessionConn.id)
      }
    }
  }, [status, environments, connections, deleteEnvironment, removeConnection])

  return null // This component doesn't render anything
}
