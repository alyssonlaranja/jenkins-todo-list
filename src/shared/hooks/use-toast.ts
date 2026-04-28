'use client'

import { toast as sonnerToast } from 'sonner'

type ToastProps = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'info' | 'warning'
}

/**
 * Enhanced toast function that provides better visual feedback with different variants
 * @param title - The title of the toast
 * @param description - The description/message of the toast
 * @param variant - The variant of the toast (default, destructive, success, info, warning)
 * @returns The toast instance
 */
export function toast({
  title,
  description,
  variant = 'default',
}: ToastProps = {}) {
  let toastType: keyof typeof sonnerToast = 'message'

  // Map variant to sonner toast type
  switch (variant) {
    case 'destructive':
      toastType = 'error'
      break
    case 'success':
      toastType = 'success'
      break
    case 'info':
      toastType = 'info'
      break
    case 'warning':
      toastType = 'warning'
      break
    default:
      toastType = 'message'
  }

  // Call the appropriate toast function based on the variant
  return sonnerToast[toastType](title || '', {
    description,
    // Any additional classNames can be applied here if needed
    className: '',
  })
}

/**
 * Hook that returns toast function for component usage
 * Usage: const { toast } = useToast()
 */
export function useToast() {
  return { toast }
}
