'use client'

import { signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { CircleUser, Database, KeyRound, LogOut, Shield } from 'lucide-react'

import { AtlasSpotlight } from '@/shared/components/atlas-spotlight'
import { LanguageSelector } from '@/shared/components/language-selector'
import { LicenseSelector } from '@/shared/components/license-selector'
import { ThemeToggle } from '@/shared/components/theme-toggle'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Separator } from '@/shared/components/ui/separator'
import { Skeleton } from '@/shared/components/ui/skeleton'

import { AvanadeLogo } from './ui/avanade-logo'

export function TopHeader() {
  const { data: session, status } = useSession()
  const { theme } = useTheme()
  const isLoading = status === 'loading'
  const DASHBOARD_URL = '/dashboard'

  // Function to get user's initials
  const getUserInitials = () => {
    if (!session?.user?.name) return '...'

    const nameParts = session.user.name.split(' ').filter(Boolean)

    if (!nameParts.length) return '...'

    if (nameParts.length === 1 && nameParts[0]) {
      // If only one name exists, take the first letter
      return nameParts[0].charAt(0).toUpperCase()
    } else if (nameParts.length > 1) {
      // Take the first letter of the first and last names
      const firstPart = nameParts[0]
      const lastPart = nameParts[nameParts.length - 1]

      if (firstPart && lastPart) {
        const firstInitial = firstPart.charAt(0)
        const lastInitial = lastPart.charAt(0)
        return (firstInitial + lastInitial).toUpperCase()
      }
    }

    // Fallback
    return '...'
  }

  // Function to log out using NextAuth.js
  const handleLogout = () => {
    signOut({
      callbackUrl: `${process.env.NEXT_PUBLIC_CUSTOM_BASE_PATH || ''}/login`,
      redirect: true,
    })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-1 border-b bg-background px-2 text-foreground md:gap-2 md:px-4">
      <Link
        href={DASHBOARD_URL}
        className="flex items-center gap-1 px-2 md:gap-3"
      >
        <AvanadeLogo
          size="lg"
          className="h-8 w-auto transition-all duration-200 hover:scale-105 md:h-10"
          aria-label="Avanade - Logotipo oficial, navegar para dashboard"
        />
        <span className="font-sans text-lg font-bold leading-6 text-avanade-orange md:text-xl">
          avanade.ai
        </span>
      </Link>

      {/* Flexible spacer with Atlas Spotlight */}
      <div className="flex flex-1 items-center justify-center px-4">
        <AtlasSpotlight />
      </div>

      {/* Language selector */}
      <LanguageSelector />

      {/* License selector */}
      <LicenseSelector />

      {/* Theme toggle button */}
      <ThemeToggle />

      {/* User avatar with dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="flex items-center gap-2 rounded-lg bg-card p-2 font-inter text-base font-medium leading-6 text-card-foreground shadow-none md:px-4"
            title={session?.user?.name || 'User menu'}
          >
            <CircleUser className="size-5 text-card-foreground" />
            {isLoading ? (
              <Skeleton className="h-5 w-20 rounded-md" />
            ) : (
              <span>{getUserInitials()}</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isLoading ? (
            <div className="px-2 py-1.5">
              <Skeleton className="h-4 w-24" />
            </div>
          ) : (
            session?.user?.name && (
              <>
                <div className="px-2 py-1.5 text-sm font-medium text-foreground">
                  {session.user.name}
                </div>

                <DropdownMenuItem asChild>
                  <Link
                    href="/profile/environment-export"
                    className="flex cursor-pointer items-center text-foreground"
                  >
                    <Database className="mr-2 size-4" />
                    <span>Environment Export</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/profile/api-key"
                    className="flex cursor-pointer items-center text-foreground"
                  >
                    <KeyRound className="mr-2 size-4" />
                    <span>Personal Token</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/profile/service-api-key"
                    className="flex cursor-pointer items-center text-foreground"
                  >
                    <Shield className="mr-2 size-4" />
                    <span>Service API Key</span>
                  </Link>
                </DropdownMenuItem>

                <Separator className="my-1" />
              </>
            )
          )}
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
            <LogOut className="mr-2 size-4" />
            <span className="text-foreground">Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
