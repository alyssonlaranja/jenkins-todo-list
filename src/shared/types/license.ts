/**
 * License type definition
 * Represents a license in the Cockpit system
 */
export interface License {
  id: string
  name: string
  description?: string
}

/**
 * Namespace type definition
 * Represents a namespace within a license
 */
export interface Namespace {
  id: string
  name: string
  licenseId: string
  description?: string
  disabled: boolean
}

/**
 * Namespace User Role type
 * Represents a user's role within a namespace
 */
export interface NamespaceUserRole {
  namespaceId: string
  userId: string
  roleId: string
  roleName?: string
  namespaceName?: string
}
