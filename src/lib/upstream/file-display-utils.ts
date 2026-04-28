/**
 * Utilities for formatting file display in chat
 */

import { ProcessedFile } from './client-file-processor'

/**
 * Format files for display in chat messages
 * Always shows only metadata (silent mode by default)
 */
export function formatFilesForChatDisplay(files: ProcessedFile[]): string {
  if (files.length === 0) return ''

  let result = '\n\n📎 **Arquivos Anexados:**\n\n'

  for (const file of files) {
    result += `### 📄 ${file.name}\n`
    result += `**Tipo:** ${file.type}\n`
    result += `**Tamanho:** ${formatBytes(file.size)}\n\n`
    // Sempre modo silencioso - apenas metadados no chat
    // Agentes recebem conteúdo completo através de formatFilesForAgent()
  }

  return result.trim()
}

/**
 * Format files for agent consumption (always full content)
 */
export function formatFilesForAgent(files: ProcessedFile[]): string {
  if (files.length === 0) return ''

  let result = '\n\n📎 **Arquivos Anexados para Análise:**\n\n'

  for (const file of files) {
    result += `### 📄 ${file.name}\n`
    result += `**Tipo:** ${file.type}\n`
    result += `**Tamanho:** ${formatBytes(file.size)}\n\n`
    result += `**Conteúdo Completo:**\n\`\`\`\n${file.content}\n\`\`\`\n\n`
  }

  return result
}

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Create summary of attached files
 */
export function createFilesSummary(files: ProcessedFile[]): string {
  if (files.length === 0) return ''

  const fileTypes = files.reduce(
    (acc, file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown'
      acc[extension] = (acc[extension] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const totalSize = files.reduce((acc, file) => acc + file.size, 0)

  let summary = `📎 **${files.length} arquivo(s) anexado(s)**`
  summary += `\n**Tamanho total:** ${formatBytes(totalSize)}`

  const typesList = Object.entries(fileTypes)
    .map(([ext, count]) => `${count} ${ext.toUpperCase()}`)
    .join(', ')

  summary += `\n**Tipos:** ${typesList}`

  return summary
}
