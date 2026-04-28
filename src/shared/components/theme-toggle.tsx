'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Check, Moon, Palette, Sun } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevents hydration error by mounting the component only on the client
  useEffect(() => {
    setMounted(true)
  }, [])

  // If not mounted, render a placeholder with the same dimensions
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-9">
        <div className="size-5" />
        <span className="sr-only">Loading theme</span>
      </Button>
    )
  }

  // Get current icon based on theme
  const getCurrentIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="size-5" />
      case 'bv':
        return <Palette className="size-5" />
      default:
        return <Sun className="size-5" />
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="px-2 text-foreground transition-colors hover:bg-accent"
          title="Toggle theme"
        >
          {getCurrentIcon()}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 size-4" />
          <span>Light</span>
          {theme === 'light' && <Check className="ml-2 size-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 size-4" />
          <span>Dark</span>
          {theme === 'dark' && <Check className="ml-2 size-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme('bv')}>
          <Palette className="mr-2 size-4" />
          <span>BV</span>
          {theme === 'bv' && <Check className="ml-2 size-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
