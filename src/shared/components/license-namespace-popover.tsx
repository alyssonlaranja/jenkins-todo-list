'use client'

import React, { useState } from 'react'
import { MapPin, Save, User, X } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { CustomCombobox } from '@/shared/components/ui/custom-combobox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { useCurrentNamespaceRole } from '@/shared/hooks/use-current-namespace-role'
import { useI18n } from '@/shared/hooks/use-i18n'

interface LicenseNamespacePopoverProps {
  licenses: string[]
  namespaces: string[]
  selectedLicense: string
  selectedNamespace: string
  onLicenseChange: (license: string) => void
  onNamespaceChange: (namespace: string) => void
  /** When true, always shows the label text (not hidden on small screens) */
  showLabelAlways?: boolean
  /** When true, the selector is informational only (no popover, no interaction) */
  readOnly?: boolean
}

export function LicenseNamespacePopover({
  licenses,
  namespaces,
  selectedLicense,
  selectedNamespace,
  onLicenseChange,
  onNamespaceChange,
  showLabelAlways = false,
  readOnly = false,
}: LicenseNamespacePopoverProps) {
  const { t } = useI18n('pages')
  const [open, setOpen] = useState(false)
  const { currentRole } = useCurrentNamespaceRole()

  // Prevent popover from closing when selecting license/namespace
  const handleOpenChange = (nextOpen: boolean) => {
    // Only allow closing if focus is outside popover
    if (!nextOpen) {
      // Check if the active element is inside the popover content
      const popoverContent = document.querySelector(
        '[data-component-popover-content]'
      )
      if (popoverContent && popoverContent.contains(document.activeElement)) {
        // Do not close if focus is still inside
        return
      }
    }
    setOpen(nextOpen)
  }

  // Custom handlers for Combobox to keep popover open
  const handleLicenseChange = (license: string) => {
    onLicenseChange(license)
    // Don't close popover
  }

  const handleNamespaceChange = (namespace: string) => {
    onNamespaceChange(namespace)
    // Don't close popover
  }

  // Read-only mode: just display the info, no popover interaction
  if (readOnly) {
    return (
      <div
        className={
          showLabelAlways
            ? 'flex w-full flex-col gap-1 rounded-md p-2 text-left text-foreground'
            : 'flex items-center gap-2 rounded-md p-2 text-foreground'
        }
      >
        {showLabelAlways ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                {t('sda2.workspace.license' as any)}
              </span>
              <span className="text-sm font-medium">
                {selectedLicense || t('sda2.workspace.noneF' as any)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                {t('sda2.workspace.namespace' as any)}
              </span>
              <span className="text-sm font-medium">
                {selectedNamespace || t('sda2.workspace.none' as any)}
              </span>
            </div>
          </>
        ) : (
          <>
            <MapPin className="size-4" />
            <span className="hidden text-sm font-medium lg:inline">
              {selectedLicense || 'No License'} ·{' '}
              {selectedNamespace || 'No Namespace'}
              {currentRole && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
                  <User className="size-3" />
                  {currentRole}
                </span>
              )}
            </span>
          </>
        )}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Select license and namespace"
          className={
            showLabelAlways
              ? 'flex w-full flex-col gap-1 rounded-md p-2 text-left text-foreground transition-colors hover:bg-accent'
              : 'flex items-center gap-2 rounded-md p-2 text-foreground transition-colors hover:bg-accent'
          }
        >
          {showLabelAlways ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                  {t('sda2.workspace.license' as any)}
                </span>
                <span className="text-sm font-medium">
                  {selectedLicense || t('sda2.workspace.noneF' as any)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                  {t('sda2.workspace.namespace' as any)}
                </span>
                <span className="text-sm font-medium">
                  {selectedNamespace || t('sda2.workspace.none' as any)}
                </span>
              </div>
            </>
          ) : (
            <>
              <MapPin className="size-4" />
              <span className="hidden text-sm font-medium lg:inline">
                {selectedLicense || 'No License'} ·{' '}
                {selectedNamespace || 'No Namespace'}
                {currentRole && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
                    <User className="size-3" />
                    {currentRole}
                  </span>
                )}
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        data-component-popover-content
        className="flex w-72 flex-col gap-4 rounded-lg border border-border bg-background p-4 shadow-lg"
        align="end"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">License</label>
          {licenses.length <= 1 ? (
            <div className="flex h-10 w-full cursor-not-allowed items-center rounded-md border border-input bg-muted p-2 text-sm disabled:opacity-50">
              {selectedLicense || 'You have no licenses assigned'}
            </div>
          ) : (
            <CustomCombobox
              options={licenses.map(license => ({
                label: license,
                value: license,
              }))}
              value={selectedLicense}
              onValueChange={handleLicenseChange}
              placeholder="Select license"
              className="w-full"
            />
          )}
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            htmlFor="namespace-select"
          >
            Namespace
          </label>
          {namespaces.length === 0 ? (
            <div className="flex h-10 w-full cursor-not-allowed items-center rounded-md border border-input bg-muted p-2 text-sm disabled:opacity-50">
              No namespaces available
            </div>
          ) : (
            <CustomCombobox
              options={namespaces.map(ns => ({ label: ns, value: ns }))}
              value={selectedNamespace}
              onValueChange={handleNamespaceChange}
              placeholder="Select namespace"
              className="w-full"
            />
          )}
        </div>

        <div className="mt-2 flex justify-between gap-2">
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            <X className="mr-2 size-4" />
            Cancel
          </Button>
          <Button
            className="w-full"
            variant="default"
            onClick={() => setOpen(false)}
          >
            <Save className="mr-2 size-4" />
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
