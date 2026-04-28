'use client'

import { useActiveLicense } from '@/shared/hooks/use-active-license'
import { useActiveNamespace } from '@/shared/hooks/use-active-namespace'
import { useAutoEnvironment } from '@/shared/hooks/use-auto-environment'

// Metadata moved to page.tsx or removed (client component can't export metadata)

export default function SDA2Layout({
  children,
}: {
  children: React.ReactNode
}) {
  // Populate permission-store with active license and namespace
  useActiveLicense()
  useActiveNamespace()

  // Auto-create Session Environment and Connection (required for MCP)
  useAutoEnvironment()

  return <>{children}</>
}
