'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { useI18n } from '@/shared/hooks/use-i18n'
import { getApiBaseUrl } from '@/shared/lib/api-helpers'
import { cockpitApiClient } from '@/shared/lib/cockpit/api-client'

interface ApiKeyValidationModalProps {
  userId: string
  onKeyCreated: () => void
}

/**
 * Modal to handle User Personal API Key creation
 * Blocks environment creation until key exists
 */
export function ApiKeyValidationModal({
  userId,
  onKeyCreated,
}: ApiKeyValidationModalProps) {
  const [isCreating, setIsCreating] = useState(false)
  const { t } = useI18n('common')

  const handleCreateKey = async () => {
    setIsCreating(true)
    try {
      await cockpitApiClient.createUserApiKey({
        fk_user: userId,
        description: t('apiKeyModal.autoCreatedDescription'),
      })
      toast.success(t('apiKeyModal.successMessage'))
      onKeyCreated()
    } catch (error) {
      console.error('Failed to create API key:', error)
      toast.error(
        error instanceof Error ? error.message : t('apiKeyModal.errorMessage')
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleGoToCockpitPortal = () => {
    try {
      const apiUrl = getApiBaseUrl()
      const cockpitPortalUrl = apiUrl.replace('/api', '')
      if (cockpitPortalUrl) {
        window.open(`${cockpitPortalUrl}/profile/api-keys`, '_blank')
      }
    } catch (error) {
      console.error('Failed to get Cockpit Portal URL:', error)
      toast.error(t('apiKeyModal.portalErrorMessage'))
    }
  }

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('apiKeyModal.title')}</DialogTitle>
          <DialogDescription>{t('apiKeyModal.description')}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            {t('apiKeyModal.instructions')}
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoToCockpitPortal}
            className="w-full sm:w-auto"
          >
            {t('apiKeyModal.goToPortalButton')}
          </Button>
          <Button
            type="button"
            onClick={handleCreateKey}
            disabled={isCreating}
            className="w-full sm:w-auto"
          >
            {isCreating
              ? t('apiKeyModal.creatingButton')
              : t('apiKeyModal.createButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
