'use client'

import { AlertTriangle } from 'lucide-react'

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

interface DeleteProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  onConfirm: () => void | Promise<void>
  isDeleting?: boolean
}

export function DeleteProjectModal({
  open,
  onOpenChange,
  projectName,
  onConfirm,
  isDeleting = false,
}: DeleteProjectModalProps) {
  const { t } = useI18n('pages')

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="size-5" />
            {t('sda2.deleteProject.title' as any)}
          </DialogTitle>
          <DialogDescription>
            {t('sda2.deleteProject.confirmation' as any)}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-lg bg-red-50 p-4 dark:bg-red-950/30">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('sda2.deleteProject.projectToDelete' as any)}:
          </p>
          <p className="mt-1 text-lg font-semibold text-red-600">
            {projectName}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            {t('sda2.deleteProject.cancel' as any)}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting
              ? t('sda2.deleteProject.deleting' as any)
              : t('sda2.deleteProject.delete' as any)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
