/**
 * Custom event system for cross-component communication
 *
 * This module provides a simple event-based communication mechanism
 * for components that need to react to session-related changes without
 * sharing direct state references.
 *
 * Used primarily for notifying UI components when Session Environment
 * and Session Connection are auto-created during login.
 */

export const SESSION_EVENTS = {
  ENVIRONMENT_CREATED: 'session:environment:created',
  CONNECTION_CREATED: 'session:connection:created',
  ENVIRONMENT_UPDATED: 'session:environment:updated',
  CONNECTION_UPDATED: 'session:connection:updated',
} as const

export type SessionEventType =
  (typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS]

/**
 * Emit a custom session event
 *
 * @param event - The event type to emit
 * @param data - Optional data to pass with the event
 *
 * @example
 * ```typescript
 * emitSessionEvent(SESSION_EVENTS.CONNECTION_CREATED, { connectionId: '123' })
 * ```
 */
export function emitSessionEvent(
  event: SessionEventType,
  data?: unknown
): void {
  if (typeof window === 'undefined') {
    console.warn('[emitSessionEvent] Cannot emit event in server context')
    return
  }

  console.log(`[emitSessionEvent] Emitting: ${event}`, data)

  window.dispatchEvent(
    new CustomEvent(event, {
      detail: data,
    })
  )
}

/**
 * Listen to a custom session event
 *
 * @param event - The event type to listen for
 * @param handler - Callback function to handle the event
 * @returns Cleanup function to remove the event listener
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   return listenToSessionEvent(
 *     SESSION_EVENTS.CONNECTION_CREATED,
 *     (data) => {
 *       console.log('Connection created:', data)
 *       refreshConnections()
 *     }
 *   )
 * }, [refreshConnections])
 * ```
 */
export function listenToSessionEvent(
  event: SessionEventType,
  handler: (data: unknown) => void
): () => void {
  if (typeof window === 'undefined') {
    console.warn('[listenToSessionEvent] Cannot listen in server context')
    return () => {}
  }

  const listener = (e: Event) => {
    const customEvent = e as CustomEvent
    console.log(`[listenToSessionEvent] Received: ${event}`, customEvent.detail)
    handler(customEvent.detail)
  }

  window.addEventListener(event, listener)

  // Return cleanup function
  return () => {
    window.removeEventListener(event, listener)
  }
}
