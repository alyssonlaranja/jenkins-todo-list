'use client'

import { Languages } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useI18n } from '@/shared/hooks/use-i18n'

export function LanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useI18n('common')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 text-white transition-colors hover:bg-accent/20"
        >
          <Languages className="size-5 text-white" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage('en')}>
          🇺🇸 English {currentLanguage === 'en' && '✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('pt-BR')}>
          🇧🇷 Português {currentLanguage === 'pt-BR' && '✓'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
