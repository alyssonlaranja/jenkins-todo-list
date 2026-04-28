'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Global component that dynamically changes the page title based on URL
 * Detects "ams" in the URL and changes title between "Avanade AMS" and "Avanade SDA"
 */
export function DynamicTitle() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if URL contains "ams" reference
    const checkAMS = () => {
      const url = window.location.href.toLowerCase()
      const path = pathname?.toLowerCase() || ''
      const search = searchParams?.toString().toLowerCase() || ''

      return (
        url.includes('ams') || path.includes('/ams') || search.includes('ams')
      )
    }

    // Update page title based on URL
    const isAMS = checkAMS()
    const newTitle = isAMS ? 'Avanade AMS' : 'Avanade SDA'

    // Set title immediately
    document.title = newTitle

    // Also update on visibility change (when tab becomes visible)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        document.title = newTitle
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // MutationObserver to prevent title from being overwritten
    const observer = new MutationObserver(() => {
      if (document.title !== newTitle) {
        document.title = newTitle
      }
    })

    const titleElement = document.querySelector('title')
    if (titleElement) {
      observer.observe(titleElement, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      observer.disconnect()
    }
  }, [pathname, searchParams]) // Re-run when route changes

  return null
}
