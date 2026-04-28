'use client'

import { Bot, ChevronDown, LogOut, Menu, X } from 'lucide-react'

import { LanguageSelector } from '@/shared/components/language-selector'
import { LicenseSelector } from '@/shared/components/license-selector'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/shared/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useI18n } from '@/shared/hooks/use-i18n'

import type { User } from '../../types'

interface HeaderProps {
  user: User | null
  onLogout: () => void
  title?: string
  onClose?: () => void
  onToggleSidebar?: () => void
  isSidebarOpen?: boolean
  copilotEnabled?: boolean // Indica se CopilotKit está ativo
  /** Se deve mostrar o botão de toggle da sidebar (default: true quando onToggleSidebar é fornecido) */
  showSidebarToggle?: boolean
}

export function Header({
  user,
  onLogout,
  title,
  onToggleSidebar,
  isSidebarOpen = true,
  copilotEnabled = false,
  showSidebarToggle,
}: HeaderProps) {
  const { t } = useI18n('pages')
  // Mostrar toggle apenas se explicitamente true OU se onToggleSidebar fornecido e showSidebarToggle não é false
  const shouldShowToggle =
    showSidebarToggle ??
    (onToggleSidebar !== undefined && onToggleSidebar.toString() !== '() => {}')

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <header className="flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {shouldShowToggle && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              aria-label={
                isSidebarOpen
                  ? 'Esconder barra lateral'
                  : 'Mostrar barra lateral'
              }
              className="text-gray-400 transition-colors hover:text-gray-600"
            >
              {isSidebarOpen ? (
                <X className="size-3.5" />
              ) : (
                <Menu className="size-3.5" />
              )}
            </button>
          )}
          {title && (
            <span className="text-xs font-medium text-gray-800">{title}</span>
          )}
        </div>
        {copilotEnabled && (
          <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
            <Bot className="size-2.5" />
            <span>AI Enhanced</span>
          </div>
        )}
      </div>

      {/* Center: Language + License/Namespace Selector */}
      <div className="flex items-center gap-2">
        <LanguageSelector />
        <LicenseSelector readOnly />
      </div>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 hover:bg-gray-100">
          <Avatar className="size-6">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-green-500 text-[10px] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-medium text-gray-700">{user?.name}</p>
            <p className="text-[10px] text-gray-500">{user?.email}</p>
          </div>
          <ChevronDown className="size-3 text-gray-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-gray-700">{user?.name}</p>
            <p className="text-[10px] text-gray-500">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onLogout}
            className="cursor-pointer text-red-600"
          >
            <LogOut className="mr-2 size-4" />
            {t('sda2.workspace.logout' as any)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
