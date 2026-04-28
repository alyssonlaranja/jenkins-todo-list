import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Escapes special characters in strings used in regular expressions.
 * Important for security when dynamic variables (like basePath)
 * are inserted into RegExp patterns to prevent unexpected behavior
 * or potential vulnerabilities.
 *
 * @param string - The string to escape
 * @returns String with escaped regex special characters
 */
export function escapeRegex(string: string): string {
  if (string === null || string === undefined) return ''
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
