'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  MapPin,
  Moon,
  Save,
  Sun,
  X,
} from 'lucide-react'
import { mutate } from 'swr'

import { Button } from '@/shared/components/ui/button'
import { CustomCombobox } from '@/shared/components/ui/custom-combobox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { useActiveLicense } from '@/shared/hooks/use-active-license'
import { useActiveNamespace } from '@/shared/hooks/use-active-namespace'
import { useI18n } from '@/shared/hooks/use-i18n'

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

interface HomeSidebarProps {
  collapsed: boolean
  onToggle: () => void
  onLogout: () => void
}

export function HomeSidebar({
  collapsed,
  onToggle,
  onLogout,
}: HomeSidebarProps) {
  const { t } = useI18n('pages')
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // License/Namespace hooks
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

  useEffect(() => {
    setMounted(true)
  }, [])

  // Set default namespace when namespaces are available
  useEffect(() => {
    if (hasNamespaces && namespaces.length > 0 && !activeNamespace) {
      if (namespaces[0]) {
        setActiveNamespace(namespaces[0].id)
      }
    }
  }, [hasNamespaces, namespaces, activeNamespace, setActiveNamespace])

  // Set default license when licenses are available
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
      setActiveLicense(selectedLicense.id)
      setActiveNamespace(null)
      knownSWRKeys.forEach(key => {
        mutate(key)
      })
    }
  }

  const handleNamespaceChange = (namespaceName: string) => {
    const selectedNamespace = namespaces.find(ns => ns.name === namespaceName)
    if (selectedNamespace) {
      setActiveNamespace(selectedNamespace.id)
      knownSWRKeys.forEach(key => {
        mutate(key)
      })
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const isDark = theme === 'dark'
  const [licensePopoverOpen, setLicensePopoverOpen] = useState(false)

  const licenseOptions: string[] = licenses.map(license => license.name)
  const namespaceOptions: string[] = namespaces.map(ns => ns.name)

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo - removido, apenas espaço */}
      <div className="h-16" />

      {/* Spacer para empurrar items para baixo */}
      <div className="flex-1" />

      {/* Bottom controls */}
      <div className="space-y-1 p-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={isDark ? 'Modo Claro' : 'Modo Escuro'}
        >
          {mounted ? (
            isDark ? (
              <Sun className="size-5 shrink-0" />
            ) : (
              <Moon className="size-5 shrink-0" />
            )
          ) : (
            <div className="size-5 shrink-0" />
          )}
          {!collapsed && (
            <span>{mounted && isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
          )}
        </button>

        {/* License/Namespace Selector */}
        {!isLoadingLicense && !isLoadingNamespace && hasLicenses && (
          <Popover
            open={licensePopoverOpen}
            onOpenChange={setLicensePopoverOpen}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                title="Selecionar Licença e Namespace"
              >
                <MapPin className="size-5 shrink-0" />
                {!collapsed && (
                  <span className="truncate text-left">
                    {activeLicense?.name || 'Licença'} ·{' '}
                    {activeNamespace?.name || 'Namespace'}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="flex w-72 flex-col gap-4 rounded-lg bg-popover p-4 shadow-lg"
              side="right"
              align="end"
            >
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Licença
                </label>
                {licenseOptions.length <= 1 ? (
                  <div className="flex h-10 w-full cursor-not-allowed items-center rounded-md border border-input bg-muted p-2 text-sm disabled:opacity-50">
                    {activeLicense?.name || 'Nenhuma licença'}
                  </div>
                ) : (
                  <CustomCombobox
                    options={licenseOptions.map(license => ({
                      label: license,
                      value: license,
                    }))}
                    value={activeLicense?.name || ''}
                    onValueChange={handleLicenseChange}
                    placeholder="Selecionar licença"
                    className="w-full"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Namespace
                </label>
                {namespaceOptions.length === 0 ? (
                  <div className="flex h-10 w-full cursor-not-allowed items-center rounded-md border border-input bg-muted p-2 text-sm disabled:opacity-50">
                    Nenhum namespace disponível
                  </div>
                ) : (
                  <CustomCombobox
                    options={namespaceOptions.map(ns => ({
                      label: ns,
                      value: ns,
                    }))}
                    value={activeNamespace?.name || ''}
                    onValueChange={handleNamespaceChange}
                    placeholder="Selecionar namespace"
                    className="w-full"
                  />
                )}
              </div>

              <div className="mt-2 flex justify-between gap-2">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setLicensePopoverOpen(false)}
                >
                  <X className="mr-2 size-4" />
                  Cancelar
                </Button>
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => setLicensePopoverOpen(false)}
                >
                  <Save className="mr-2 size-4" />
                  Salvar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title={t('sda2.workspace.logout' as any) as string}
        >
          <LogOut className="size-5 shrink-0" />
          {!collapsed && <span>{t('sda2.workspace.logout' as any)}</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={
            collapsed
              ? (t('sda2.workspace.expand' as any) as string)
              : (t('sda2.workspace.collapse' as any) as string)
          }
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
