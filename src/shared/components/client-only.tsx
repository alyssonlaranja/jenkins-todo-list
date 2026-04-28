'use client'

import { useEffect, useState } from 'react'

interface ClientOnlyProps {
  readonly children: React.ReactNode
  readonly fallback?: React.ReactNode
}

/**
 * ClientOnly component that only renders children on the client side.
 * Prevents hydration mismatches by ensuring content is only rendered after client hydration.
 * Useful for components that depend on browser-only APIs or client-side state.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
