'use client'

import { ChevronDown, Globe, Languages } from 'lucide-react'

import { ClientOnly } from '@/shared/components/client-only'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useI18n } from '@/shared/hooks/use-i18n'
import type { SupportedLanguage } from '@/shared/i18n'

const LANGUAGES = {
  en: { name: 'English', flag: '🇺🇸' },
  'pt-BR': { name: 'Português', flag: '🇧🇷' },
} as const

function LanguageSelectorContent() {
  const { currentLanguage, changeLanguage, supportedLanguages } = useI18n()

  const handleLanguageChange = (language: SupportedLanguage) => {
    changeLanguage(language)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-start gap-2 rounded-md border bg-background text-foreground hover:bg-accent"
        >
          <Globe className="size-5 text-foreground" />
          <span className="hidden md:inline">
            {LANGUAGES[currentLanguage]?.name || 'Language'}
          </span>
          <ChevronDown className="ml-auto hidden size-4 md:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-40 rounded-md border-border"
      >
        {supportedLanguages.map(lang => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className={`flex items-center gap-2 ${currentLanguage === lang ? 'bg-accent' : ''}`}
          >
            <span className="text-base">{LANGUAGES[lang]?.flag}</span>
            <span>{LANGUAGES[lang]?.name}</span>
            {currentLanguage === lang && (
              <span className="ml-auto text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function LanguageSelector() {
  return (
    <ClientOnly
      fallback={
        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-start gap-2 rounded-md border bg-background text-foreground hover:bg-accent"
        >
          <Languages className="size-5 text-foreground" />
          <span className="sr-only">Toggle language</span>
        </Button>
      }
    >
      <LanguageSelectorContent />
    </ClientOnly>
  )
}
