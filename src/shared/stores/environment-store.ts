import { create } from 'zustand'

import {
  Environment,
  EnvironmentStats,
  FlattenedNamespace,
  LicenseConfig,
  NamespaceConfig,
  UtilityAgentReference,
} from '@/shared/lib/types/environment'

interface EnvironmentStore {
  environments: Environment[]

  // Environment CRUD
  addEnvironment: (environment: Environment) => void
  updateEnvironment: (id: string, updates: Partial<Environment>) => void
  deleteEnvironment: (id: string) => void
  getEnvironmentById: (id: string) => Environment | undefined

  // License operations
  addLicense: (environmentId: string, license: LicenseConfig) => void
  updateLicense: (
    environmentId: string,
    licenseId: string,
    updates: Partial<LicenseConfig>
  ) => void
  deleteLicense: (environmentId: string, licenseId: string) => void
  getLicense: (
    environmentId: string,
    licenseId: string
  ) => LicenseConfig | undefined

  // Namespace operations
  addNamespace: (
    environmentId: string,
    licenseId: string,
    namespace: NamespaceConfig
  ) => void
  updateNamespace: (
    environmentId: string,
    licenseId: string,
    namespaceId: string,
    updates: Partial<NamespaceConfig>
  ) => void
  deleteNamespace: (
    environmentId: string,
    licenseId: string,
    namespaceId: string
  ) => void
  getNamespace: (
    environmentId: string,
    licenseId: string,
    namespaceId: string
  ) => NamespaceConfig | undefined

  // Utility Agent operations
  addUtilityAgent: (
    environmentId: string,
    licenseId: string,
    namespaceId: string,
    agent: UtilityAgentReference
  ) => void
  updateUtilityAgent: (
    environmentId: string,
    licenseId: string,
    namespaceId: string,
    agentId: string,
    updates: Partial<UtilityAgentReference>
  ) => void
  removeUtilityAgent: (
    environmentId: string,
    licenseId: string,
    namespaceId: string,
    agentId: string
  ) => void

  // Utility methods
  getAllNamespaces: (environmentId: string) => FlattenedNamespace[]
  getEnvironmentStats: (environmentId: string) => EnvironmentStats
  clearAll: () => void
}

// ❌ REMOVED persist() middleware
// Reason: Custom environments now loaded from MCP artifacts via useLoadCustomEnvironments
// All environments (session + custom) are now in-memory only
// localStorage is NO LONGER used for environment storage (compliance)
export const useEnvironmentStore = create<EnvironmentStore>()((set, get) => ({
  environments: [],

  // ========== Environment CRUD ==========

  addEnvironment: environment => {
    set(state => {
      // Remove existing environment with same ID (prevent duplicates)
      const filtered = state.environments.filter(
        env => env.id !== environment.id
      )
      return {
        environments: [...filtered, environment],
      }
    })
  },

  updateEnvironment: (id, updates) => {
    set(state => ({
      environments: state.environments.map(env =>
        env.id === id ? { ...env, ...updates, updatedAt: new Date() } : env
      ),
    }))
  },

  deleteEnvironment: id => {
    set(state => ({
      environments: state.environments.filter(env => env.id !== id),
    }))
  },

  getEnvironmentById: id => {
    return get().environments.find(env => env.id === id)
  },

  // ========== License Operations ==========

  addLicense: (environmentId, license) => {
    set(state => ({
      environments: state.environments.map(env =>
        env.id === environmentId
          ? {
              ...env,
              licenses: {
                ...env.licenses,
                [license.licenseId]: license,
              },
              updatedAt: new Date(),
            }
          : env
      ),
    }))
  },

  updateLicense: (environmentId, licenseId, updates) => {
    set(state => ({
      environments: state.environments.map(env => {
        if (env.id !== environmentId) return env
        const existingLicense = env.licenses[licenseId]
        if (!existingLicense) return env

        return {
          ...env,
          licenses: {
            ...env.licenses,
            [licenseId]: {
              ...existingLicense,
              ...updates,
            },
          },
          updatedAt: new Date(),
        }
      }),
    }))
  },

  deleteLicense: (environmentId, licenseId) => {
    set(state => ({
      environments: state.environments.map(env => {
        if (env.id !== environmentId) return env

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [licenseId]: _removed, ...remainingLicenses } = env.licenses

        return {
          ...env,
          licenses: remainingLicenses,
          updatedAt: new Date(),
        }
      }),
    }))
  },

  getLicense: (environmentId, licenseId) => {
    const env = get().getEnvironmentById(environmentId)
    return env?.licenses[licenseId]
  },

  // ========== Namespace Operations ==========

  addNamespace: (environmentId, licenseId, namespace) => {
    set(state => ({
      environments: state.environments.map(env => {
        if (env.id !== environmentId) return env
        const existingLicense = env.licenses[licenseId]
        if (!existingLicense) return env

        return {
          ...env,
          licenses: {
            ...env.licenses,
            [licenseId]: {
              ...existingLicense,
              namespaces: {
                ...existingLicense.namespaces,
                [namespace.namespaceId]: namespace,
              },
            },
          },
          updatedAt: new Date(),
        }
      }),
    }))
  },

  updateNamespace: (environmentId, licenseId, namespaceId, updates) => {
    set(state => ({
      environments: state.environments.map(env => {
        if (env.id !== environmentId) return env
        const existingLicense = env.licenses[licenseId]
        if (!existingLicense) return env
        const existingNamespace = existingLicense.namespaces[namespaceId]
        if (!existingNamespace) return env

        return {
          ...env,
          licenses: {
            ...env.licenses,
            [licenseId]: {
              ...existingLicense,
              namespaces: {
                ...existingLicense.namespaces,
                [namespaceId]: {
                  ...existingNamespace,
                  ...updates,
                },
              },
            },
          },
          updatedAt: new Date(),
        }
      }),
    }))
  },

  deleteNamespace: (environmentId, licenseId, namespaceId) => {
    set(state => ({
      environments: state.environments.map(env => {
        if (env.id !== environmentId) return env

        const license = env.licenses[licenseId]
        if (!license) return env

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [namespaceId]: _removed, ...remainingNamespaces } =
          license.namespaces

        return {
          ...env,
          licenses: {
            ...env.licenses,
            [licenseId]: {
              ...license,
              namespaces: remainingNamespaces,
            },
          },
          updatedAt: new Date(),
        }
      }),
    }))
  },

  getNamespace: (environmentId, licenseId, namespaceId) => {
    const license = get().getLicense(environmentId, licenseId)
    return license?.namespaces[namespaceId]
  },

  // ========== Utility Agent Operations ==========

  addUtilityAgent: (environmentId, licenseId, namespaceId, agent) => {
    set(state => ({
      environments: state.environments.map(env => {
        if (env.id !== environmentId) return env

        const license = env.licenses[licenseId]
        if (!license) return env

        const namespace = license.namespaces[namespaceId]
        if (!namespace) return env

        return {
          ...env,
          licenses: {
            ...env.licenses,
            [licenseId]: {
              ...license,
              namespaces: {
                ...license.namespaces,
                [namespaceId]: {
                  ...namespace,
                  utilityAgents: [...namespace.utilityAgents, agent],
                },
              },
            },
          },
          updatedAt: new Date(),
        }
      }),
    }))
  },

  updateUtilityAgent: (
    environmentId,
    licenseId,
    namespaceId,
    agentId,
    updates
  ) => {
    set(state => ({
      environments: state.environments.map(env => {
        if (env.id !== environmentId) return env

        const license = env.licenses[licenseId]
        if (!license) return env

        const namespace = license.namespaces[namespaceId]
        if (!namespace) return env

        return {
          ...env,
          licenses: {
            ...env.licenses,
            [licenseId]: {
              ...license,
              namespaces: {
                ...license.namespaces,
                [namespaceId]: {
                  ...namespace,
                  utilityAgents: namespace.utilityAgents.map(agent =>
                    agent.id === agentId ? { ...agent, ...updates } : agent
                  ),
                },
              },
            },
          },
          updatedAt: new Date(),
        }
      }),
    }))
  },

  removeUtilityAgent: (environmentId, licenseId, namespaceId, agentId) => {
    set(state => ({
      environments: state.environments.map(env => {
        if (env.id !== environmentId) return env

        const license = env.licenses[licenseId]
        if (!license) return env

        const namespace = license.namespaces[namespaceId]
        if (!namespace) return env

        return {
          ...env,
          licenses: {
            ...env.licenses,
            [licenseId]: {
              ...license,
              namespaces: {
                ...license.namespaces,
                [namespaceId]: {
                  ...namespace,
                  utilityAgents: namespace.utilityAgents.filter(
                    agent => agent.id !== agentId
                  ),
                },
              },
            },
          },
          updatedAt: new Date(),
        }
      }),
    }))
  },

  // ========== Utility Methods ==========

  getAllNamespaces: environmentId => {
    const env = get().getEnvironmentById(environmentId)
    if (!env) return []

    const result: FlattenedNamespace[] = []

    Object.values(env.licenses).forEach(license => {
      Object.values(license.namespaces).forEach(namespace => {
        result.push({
          environment: env,
          license,
          namespace,
        })
      })
    })

    return result
  },

  getEnvironmentStats: environmentId => {
    const env = get().getEnvironmentById(environmentId)
    if (!env) {
      return {
        licenseCount: 0,
        namespaceCount: 0,
        utilityAgentCount: 0,
        mcpServerCount: 0,
      }
    }

    const licenseCount = Object.keys(env.licenses).length
    let namespaceCount = 0
    let utilityAgentCount = 0

    Object.values(env.licenses).forEach(license => {
      namespaceCount += Object.keys(license.namespaces).length
      Object.values(license.namespaces).forEach(namespace => {
        utilityAgentCount += namespace.utilityAgents.length
      })
    })

    const mcpServerCount = Object.keys(env.mcpServers).length

    return {
      licenseCount,
      namespaceCount,
      utilityAgentCount,
      mcpServerCount,
    }
  },

  clearAll: () => {
    set({ environments: [] })
  },
}))
