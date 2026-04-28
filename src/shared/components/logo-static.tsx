'use client'

import { useEffect, useState } from 'react'

import { AvanadeLogo } from './ui/avanade-logo'

interface LogoStaticProps {
  className?: string
}

export function LogoStatic({ className = '' }: LogoStaticProps) {
  const [isAMS, setIsAMS] = useState(false)

  useEffect(() => {
    // Check if URL contains "ams" reference
    const checkAMS = () => {
      const url = window.location.href.toLowerCase()
      const pathname = window.location.pathname.toLowerCase()
      const search = window.location.search.toLowerCase()

      return (
        url.includes('ams') ||
        pathname.includes('/ams') ||
        search.includes('ams')
      )
    }

    setIsAMS(checkAMS())
  }, [])

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="mb-1 flex items-center space-x-2">
        <AvanadeLogo
          size="lg"
          className="h-10 w-auto"
          aria-label="Avanade - Logotipo oficial da empresa"
        />
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          <span>{isAMS ? 'Avanade AMS' : 'Avanade SDA'}</span>
        </h1>
      </div>
    </div>
  )
}
