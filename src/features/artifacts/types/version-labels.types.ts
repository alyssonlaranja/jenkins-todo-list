/**
 * Version Labels Types
 *
 * Tipos para suporte a nomes customizados de versões de artefatos.
 * Os labels são armazenados no metadata do artefato pai, pois a API
 * do Cockpit não suporta update direto de versões.
 *
 * @see US-01.02 - Renomear versões de artefatos
 */

// ============================================================================
// VERSION LABEL INTERFACES
// ============================================================================

/**
 * Informação de renomeação de uma versão específica
 * Armazena o label customizado + auditoria completa
 */
export interface VersionLabelInfo {
  /** Nome/label customizado da versão (3-60 caracteres) */
  label: string

  /** ISO timestamp de quando foi renomeado */
  renamedAt: string

  /** ID do usuário que renomeou */
  renamedBy: string

  /** Nome do usuário que renomeou */
  renamedByName: string

  /** Label anterior (para auditoria de alterações) */
  previousLabel?: string
}

/**
 * Mapa de labels de versão indexado por versionId
 * Armazenado no metadata do artefato
 */
export interface VersionLabelsMap {
  [versionId: string]: VersionLabelInfo
}

/**
 * Extensão do metadata do artefato para incluir version labels
 */
export interface ArtifactMetadataWithLabels {
  /** Outros campos de metadata existentes */
  [key: string]: unknown

  /** Mapa de labels customizados por versionId */
  versionLabels?: VersionLabelsMap
}

// ============================================================================
// RENAME REQUEST/RESPONSE
// ============================================================================

/**
 * Payload para requisição de renomeação de versão
 */
export interface RenameVersionRequest {
  /** ID do artefato pai */
  artifactId: string

  /** ID da versão a renomear */
  versionId: string

  /** Novo nome/label (3-60 caracteres) */
  newLabel: string
}

/**
 * Resposta da operação de renomeação
 */
export interface RenameVersionResponse {
  success: boolean
  data?: {
    versionId: string
    newLabel: string
    previousLabel?: string
    renamedAt: string
    renamedBy: string
    renamedByName: string
  }
  error?: string
}

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * Entrada de log de auditoria para renomeação
 */
export interface VersionRenameAuditEntry {
  /** Timestamp da ação */
  timestamp: string

  /** ID da versão afetada */
  versionId: string

  /** Label antes da mudança */
  previousLabel: string

  /** Label após a mudança */
  newLabel: string

  /** ID do usuário que executou */
  userId: string

  /** Nome do usuário que executou */
  userName: string

  /** ID do artefato pai */
  artifactId: string

  /** Key do artefato para referência */
  artifactKey: string
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Constantes de validação para labels de versão
 */
export const VERSION_LABEL_VALIDATION = {
  /** Tamanho mínimo do label */
  MIN_LENGTH: 3,

  /** Tamanho máximo do label */
  MAX_LENGTH: 60,

  /** Regex para caracteres permitidos (alfanuméricos, espaços, pontos, hífens) */
  ALLOWED_PATTERN: /^[\w\s.\-àáâãéêíóôõúçÀÁÂÃÉÊÍÓÔÕÚÇ]+$/,

  /** Mensagens de erro */
  ERRORS: {
    TOO_SHORT: 'O nome deve ter no mínimo 3 caracteres',
    TOO_LONG: 'O nome deve ter no máximo 60 caracteres',
    INVALID_CHARS: 'O nome contém caracteres não permitidos',
    DUPLICATE: 'Já existe uma versão com este nome',
    EMPTY: 'O nome não pode estar vazio',
  },
} as const

/**
 * Valida um label de versão
 * @param label - Label a validar
 * @param existingLabels - Labels existentes no mesmo artefato (para checar duplicados)
 * @param currentVersionId - ID da versão atual (para permitir manter o mesmo nome)
 * @returns Objeto com resultado da validação
 */
export function validateVersionLabel(
  label: string,
  existingLabels?: VersionLabelsMap,
  currentVersionId?: string
): { valid: boolean; error?: string } {
  const trimmedLabel = label.trim()

  // Vazio
  if (!trimmedLabel) {
    return { valid: false, error: VERSION_LABEL_VALIDATION.ERRORS.EMPTY }
  }

  // Muito curto
  if (trimmedLabel.length < VERSION_LABEL_VALIDATION.MIN_LENGTH) {
    return { valid: false, error: VERSION_LABEL_VALIDATION.ERRORS.TOO_SHORT }
  }

  // Muito longo
  if (trimmedLabel.length > VERSION_LABEL_VALIDATION.MAX_LENGTH) {
    return { valid: false, error: VERSION_LABEL_VALIDATION.ERRORS.TOO_LONG }
  }

  // Caracteres inválidos
  if (!VERSION_LABEL_VALIDATION.ALLOWED_PATTERN.test(trimmedLabel)) {
    return {
      valid: false,
      error: VERSION_LABEL_VALIDATION.ERRORS.INVALID_CHARS,
    }
  }

  // Duplicado (ignorando a versão atual)
  if (existingLabels) {
    const isDuplicate = Object.entries(existingLabels).some(
      ([versionId, info]) =>
        versionId !== currentVersionId &&
        info.label.toLowerCase() === trimmedLabel.toLowerCase()
    )
    if (isDuplicate) {
      return { valid: false, error: VERSION_LABEL_VALIDATION.ERRORS.DUPLICATE }
    }
  }

  return { valid: true }
}

/**
 * Gera o label padrão para uma versão baseado no número
 * @param versionNumber - Número da versão (ex: "1", "2")
 * @returns Label formatado (ex: "Versão 1.0")
 */
export function getDefaultVersionLabel(versionNumber: string | null): string {
  const num = parseInt(versionNumber || '1', 10)
  return `Versão ${num}.0`
}

/**
 * Obtém o label de exibição para uma versão
 * Retorna o label customizado se existir, senão o padrão
 */
export function getVersionDisplayLabel(
  versionId: string,
  versionNumber: string | null,
  versionLabels?: VersionLabelsMap
): string {
  if (versionLabels && versionLabels[versionId]) {
    return versionLabels[versionId].label
  }
  return getDefaultVersionLabel(versionNumber)
}
