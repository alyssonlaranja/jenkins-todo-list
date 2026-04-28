'use client'

import { useEffect } from 'react'
import { mutate } from 'swr'

import { useActiveLicense } from '@/shared/hooks/use-active-license'
import { useActiveNamespace } from '@/shared/hooks/use-active-namespace'

import { LicenseNamespacePopover } from './license-namespace-popover'
import { Skeleton } from './ui/skeleton'

// SWR keys that should be revalidated when license/namespace changes
const knownSWRKeys = [
  ['artifacts'],
  ['agents'],
  ['connections'],
  ['environments'],
  ['utilityAgents'],
  ['managementAgents'],
  ['schedules'],
  ['namespaces'],
  ['licenses'],
]

/**
 * LicenseSelector Component
 *
 * Manages the active license and namespace selection for the current user.
 * Displays a popover with license and namespace selectors.
 * Automatically revalidates SWR cache when selection changes.
 */

interface LicenseSelectorProps {
  /** When true, always shows the label text (not hidden on small screens) */
  showLabelAlways?: boolean
  /** When true, the selector is informational only (no interaction) */
  readOnly?: boolean
}

export function LicenseSelector({
  showLabelAlways = false,
  readOnly = false,
}: LicenseSelectorProps = {}) {
  const {
    licenses,
    activeLicense,
    setActiveLicense,
    isLoading: isLoadingLicense,
    hasLicenses,
  } = useActiveLicense()

  const {
    namespaces,
    activeNamespace,
    setActiveNamespace,
    isLoading: isLoadingNamespace,
    hasNamespaces,
  } = useActiveNamespace()

  // Set default namespace when namespaces are available (only once)
  useEffect(() => {
    if (hasNamespaces && namespaces.length > 0 && !activeNamespace) {
      if (namespaces[0]) {
        setActiveNamespace(namespaces[0].id)
      }
    }
  }, [hasNamespaces, namespaces, activeNamespace, setActiveNamespace])

  // Set default license when licenses are available (only once)
  useEffect(() => {
    if (hasLicenses && licenses.length > 0 && !activeLicense) {
      if (licenses[0]) {
        setActiveLicense(licenses[0].id)
      }
    }
  }, [hasLicenses, licenses, activeLicense, setActiveLicense])

  const handleLicenseChange = (licenseName: string) => {
    const selectedLicense = licenses.find(
      license => license.name === licenseName
    )
    if (selectedLicense) {
      // 🔍 DEBUG: Log da mudança de license
      console.log(
        '%c[LICENSE SELECTOR] License alterada:',
        'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px;'
      )
      console.table({
        'License ID': selectedLicense.id,
        'License Name': selectedLicense.name,
        'Namespace ID': '(será resetado para null)',
      })

      setActiveLicense(selectedLicense.id)
      setActiveNamespace(null)

      // Revalidate SWR cache
      knownSWRKeys.forEach(key => {
        mutate(key)
      })
    }
  }

  const handleNamespaceChange = (namespaceName: string) => {
    const selectedNamespace = namespaces.find(ns => ns.name === namespaceName)
    if (selectedNamespace) {
      // 🔍 DEBUG: Log da mudança de namespace
      console.log(
        '%c[LICENSE SELECTOR] Namespace alterado:',
        'background: #2196F3; color: white; padding: 4px 8px; border-radius: 4px;'
      )
      console.table({
        'License ID': activeLicense?.id || 'N/A',
        'License Name': activeLicense?.name || 'N/A',
        'Namespace ID': selectedNamespace.id,
        'Namespace Name': selectedNamespace.name,
      })

      setActiveNamespace(selectedNamespace.id)

      // Revalidate SWR cache
      knownSWRKeys.forEach(key => {
        mutate(key)
      })
    }
  }

  if (isLoadingLicense || isLoadingNamespace) {
    return <Skeleton className="size-8 lg:w-[220px]" />
  }

  if (!hasLicenses) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-transparent px-4 py-2 text-muted/80 dark:text-muted">
        <span className="text-sm">No licenses assigned</span>
      </div>
    )
  }

  const licenseOptions: string[] = licenses.map(license => license.name)
  const namespaceOptions: string[] = namespaces.map(ns => ns.name)

  return (
    <LicenseNamespacePopover
      licenses={licenseOptions}
      namespaces={namespaceOptions}
      selectedLicense={activeLicense?.name || ''}
      selectedNamespace={activeNamespace?.name || ''}
      onLicenseChange={handleLicenseChange}
      onNamespaceChange={handleNamespaceChange}
      showLabelAlways={showLabelAlways}
      readOnly={readOnly}
    />
  )
}
