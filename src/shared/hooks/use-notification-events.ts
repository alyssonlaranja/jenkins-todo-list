'use client'

/**
 * Hook to subscribe to notification refresh events
 */
import { useEffect } from 'react'

/**
 * Notification Events
 *
 * Simple event emitter for cross-component notification communication.
 * Used to trigger notification refreshes when signals/feedbacks are created.
 */

type EventCallback = () => void

const listeners: Set<EventCallback> = new Set()

/**
 * Emit a notification refresh event
 * Call this when a signal or feedback is created
 */
export function emitNotificationRefresh(): void {
  listeners.forEach(callback => {
    try {
      callback()
    } catch (error) {
      console.error('[NotificationEvents] Error in callback:', error)
    }
  })
}

/**
 * Subscribe to notification refresh events
 * Returns an unsubscribe function
 */
export function onNotificationRefresh(callback: EventCallback): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

export function useNotificationRefresh(callback: EventCallback): void {
  useEffect(() => {
    const unsubscribe = onNotificationRefresh(callback)
    return unsubscribe
  }, [callback])
}
