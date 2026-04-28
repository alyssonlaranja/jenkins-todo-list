/**
 * Atlas Signals Types (Stub)
 *
 * Minimal type stubs for atlas signals referenced by shared hooks.
 * Placeholder types retained for build compatibility after
 * the atlas feature was removed during SDA2 isolation.
 */

export type SignalType = 'info' | 'warning' | 'error' | 'success'
export type SignalStatus = 'active' | 'resolved' | 'dismissed'
export type SignalPriority = 'critical' | 'high' | 'medium' | 'low'

export interface AtlasSignal {
  id: string
  type: SignalType
  status: SignalStatus
  priority: SignalPriority
  title: string
  description: string
  source?: string
  createdAt: string
  resolvedAt?: string
}

export interface AtlasSignalStats {
  total: number
  active: number
  resolved: number
  dismissed: number
  byType: Record<SignalType, number>
  byPriority: Record<SignalPriority, number>
}
