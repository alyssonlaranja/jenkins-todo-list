/**
 * Smart Cockpit Import System
 *
 * Intelligently imports Cockpit configurations with environment detection,
 * merge capabilities, and validation
 */
import {
  detectCockpitEnvironment,
  validateServerConsistency,
  type CockpitEnvironment,
  type CockpitMcpServer,
  type DetectedEnvironment,
} from './environment-detector'
import {
  getEnvironmentTemplate,
  type EnvironmentTemplate,
} from './environment-templates'

export type ImportMode = 'create' | 'merge' | 'update' | 'skip'

export interface ImportOptions {
  mode: ImportMode
  overwriteHeaders?: boolean
  addMissingServers?: boolean
  updateExistingServers?: boolean
}

export interface ImportResult {
  success: boolean
  mode: ImportMode
  environment: CockpitEnvironment
  environmentName: string
  serversProcessed: number
  serversAdded: number
  serversUpdated: number
  serversSkipped: number
  warnings: string[]
  errors: string[]
}

export interface ParsedCockpitConfig {
  servers: Record<string, CockpitMcpServer>
  credentials: {
    licenseId: string
    namespaceId: string
    apiKey: string
    cockpitApiKey?: string
    utilityAgentId?: string
  }
  // Full license/namespace structure for adding to existing environments
  licenses?: Record<
    string,
    {
      licenseId: string
      licenseName?: string
      namespaces: Record<
        string,
        {
          namespaceId: string
          namespaceName?: string
          commonHeaders: Record<string, string>
          utilityAgents?: Array<{
            id: string
            name?: string
            type: 'Supervisor' | 'Standard'
          }>
        }
      >
    }
  >
}

/**
 * Parse Cockpit JSON configuration from Claude Desktop format
 */
export function parseCockpitConfig(jsonContent: string): ParsedCockpitConfig {
  try {
    const config = JSON.parse(jsonContent)

    // Extract servers from either "servers" or "mcpServers" object
    const servers: Record<string, CockpitMcpServer> = {}

    // Smart format detection and support for multiple formats
    let sourceToUse: Record<string, any> = {}

    // Priority 1: "servers" (most common format from Claude Desktop)
    if (config.servers && Object.keys(config.servers).length > 0) {
      sourceToUse = config.servers
    }
    // Priority 2: "mcpServers" (export format)
    else if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
      sourceToUse = config.mcpServers
    }
    // Priority 3: Try to find any object with "url" and "headers" properties
    else {
      // Look for any nested object that looks like a server config
      const findServerConfigs = (obj: any, depth = 0): Record<string, any> => {
        if (depth > 3) return {} // Prevent infinite recursion

        const result: Record<string, any> = {}

        for (const [key, value] of Object.entries(obj || {})) {
          const val = value as any

          // If this looks like a server config
          if (val && typeof val === 'object' && val.url && val.headers) {
            result[key] = val
          }
          // If this is a nested object, search recursively
          else if (val && typeof val === 'object' && !Array.isArray(val)) {
            const nested = findServerConfigs(val, depth + 1)
            Object.assign(result, nested)
          }
        }

        return result
      }

      sourceToUse = findServerConfigs(config)
    }

    Object.entries(sourceToUse).forEach(([key, value]) => {
      const serverValue = value as Record<string, unknown>
      if (serverValue.url) {
        servers[key] = {
          url: serverValue.url as string,
          headers: (serverValue.headers as Record<string, string>) || {},
          type: (serverValue.type as 'http') || 'http',
        }
      }
    })

    // Enhanced error detection
    if (Object.keys(servers).length === 0) {
      throw new Error(
        'Nenhum servidor MCP encontrado no JSON. Verifique se o JSON contém "servers" ou "mcpServers' +
          ' com objetos que tenham "url" e "headers". Formatos esperados:\n' +
          '{"servers": {"server-name": {"url": "...", "headers": {...}}}}\n' +
          'ou\n' +
          '{"mcpServers": {"server-name": {"url": "...", "headers": {...}}}}'
      )
    }

    // Extract credentials from first server with headers
    let credentials = {
      licenseId: '',
      namespaceId: '',
      apiKey: '',
      cockpitApiKey: '',
      utilityAgentId: '',
    }

    // Find first server with headers
    const firstServerWithHeaders = Object.values(servers).find(
      server => server.headers && Object.keys(server.headers).length > 0
    )

    if (firstServerWithHeaders?.headers) {
      const headers = firstServerWithHeaders.headers
      credentials = {
        licenseId: headers['x-cockpit-license-id'] || '',
        namespaceId: headers['x-cockpit-namespace-id'] || '',
        apiKey: headers['x-api-key'] || '',
        cockpitApiKey: headers['x-cockpit-api-key'] || '',
        utilityAgentId: headers['x-cockpit-utility-agent-id'] || '',
      }
    }

    // Extract licenses/namespaces if available (for adding to existing environments)
    let licenses: ParsedCockpitConfig['licenses'] = undefined

    // Try to extract from exported format first
    if (config.licenses && typeof config.licenses === 'object') {
      licenses = {}

      Object.entries(config.licenses).forEach(
        ([licenseId, licenseData]: [string, any]) => {
          if (licenseData && typeof licenseData === 'object') {
            const license: any = {
              licenseId,
              licenseName:
                licenseData.licenseName || `License ${licenseId.slice(0, 8)}`,
              namespaces: {},
            }

            // Extract namespaces
            if (
              licenseData.namespaces &&
              typeof licenseData.namespaces === 'object'
            ) {
              Object.entries(licenseData.namespaces).forEach(
                ([namespaceId, namespaceData]: [string, any]) => {
                  if (namespaceData && typeof namespaceData === 'object') {
                    license.namespaces[namespaceId] = {
                      namespaceId,
                      namespaceName:
                        namespaceData.namespaceName ||
                        `Namespace ${namespaceId.slice(0, 8)}`,
                      commonHeaders: namespaceData.commonHeaders || {},
                      utilityAgents: [],
                    }

                    // Extract utility agents
                    if (
                      namespaceData.utilityAgents &&
                      Array.isArray(namespaceData.utilityAgents)
                    ) {
                      license.namespaces[namespaceId].utilityAgents =
                        namespaceData.utilityAgents.map((agent: any) => ({
                          id: agent.id,
                          name: agent.name || agent.id,
                          type: agent.type || 'Standard',
                        }))
                    }
                  }
                }
              )
            }

            // Only add license if it has namespaces
            if (Object.keys(license.namespaces || {}).length > 0) {
              licenses![licenseId] = license
            }
          }
        }
      )
    } else {
      // NEW: Auto-generate licenses from server headers (for user's format)
      licenses = {}
      const processedLicenses = new Set<string>()
      const processedNamespaces = new Set<string>()

      Object.entries(servers).forEach(([serverKey, server]) => {
        if (server.headers) {
          const headers = server.headers
          const licenseId = headers['x-cockpit-license-id']
          const namespaceId = headers['x-cockpit-namespace-id']
          const utilityAgentId = headers['x-cockpit-utility-agent-id']

          if (licenseId && namespaceId) {
            const licenseKey = `${licenseId}-${namespaceId}`

            // Create license if not exists
            if (!processedLicenses.has(licenseId)) {
              licenses![licenseId] = {
                licenseId,
                licenseName: `License ${licenseId.slice(0, 8)}`,
                namespaces: {},
              }
              processedLicenses.add(licenseId)
            }

            // Create namespace if not exists
            if (!processedNamespaces.has(licenseKey)) {
              licenses![licenseId]!.namespaces[namespaceId] = {
                namespaceId,
                namespaceName: `Namespace ${namespaceId.slice(0, 8)}`,
                commonHeaders: {
                  'x-api-key': headers['x-api-key'] || '',
                  'x-cockpit-api-key': headers['x-cockpit-api-key'] || '',
                  'x-cockpit-license-id': licenseId,
                  'x-cockpit-namespace-id': namespaceId,
                },
                utilityAgents: [],
              }
              processedNamespaces.add(licenseKey)

              // Add utility agent if present
              if (utilityAgentId) {
                const namespace = licenses![licenseId]!.namespaces[namespaceId]
                if (namespace?.utilityAgents) {
                  namespace.utilityAgents.push({
                    id: utilityAgentId,
                    name: `Agent ${utilityAgentId.slice(0, 8)}`,
                    type:
                      serverKey === 'connection-mcp-server-legacy'
                        ? 'Supervisor'
                        : 'Standard',
                  })
                }
              }
            }
          }
        }
      })
    }

    return { servers, credentials, licenses }
  } catch (error) {
    throw new Error(
      `Erro ao fazer parse do JSON: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Analyze Cockpit configuration and determine import strategy
 */
export function analyzeCockpitConfig(parsed: ParsedCockpitConfig): {
  detected: DetectedEnvironment
  template: EnvironmentTemplate | undefined
  validation: {
    isConsistent: boolean
    errors: string[]
  }
  suggestions: {
    mode: ImportMode
    reason: string
  }[]
} {
  const detected = detectCockpitEnvironment(parsed.servers)
  const template = getEnvironmentTemplate(detected.environment)
  const validation = validateServerConsistency(parsed.servers)

  // Generate suggestions
  const suggestions: { mode: ImportMode; reason: string }[] = []

  if (validation.isConsistent && detected.confidence >= 0.8) {
    suggestions.push({
      mode: 'create',
      reason: 'Configuração consistente, criar novo ambiente',
    })
  }

  if (detected.environment !== 'unknown') {
    suggestions.push({
      mode: 'merge',
      reason: 'Adicionar servidores faltantes ao ambiente existente',
    })
    suggestions.push({
      mode: 'update',
      reason: 'Atualizar URLs e headers dos servidores existentes',
    })
  }

  suggestions.push({
    mode: 'skip',
    reason: 'Não importar esta configuração',
  })

  return {
    detected,
    template,
    validation,
    suggestions,
  }
}

/**
 * Build environment name from detected configuration
 */
export function buildEnvironmentName(
  detected: DetectedEnvironment,
  credentials: ParsedCockpitConfig['credentials']
): string {
  const envPrefix = detected.environment.toUpperCase()
  const namespace = credentials.namespaceId
    ? ` - ${credentials.namespaceId.slice(0, 8)}`
    : ''

  return `Cockpit ${envPrefix}${namespace}`
}

/**
 * Smart import: Create new environment from Cockpit config
 */
export function createEnvironmentFromCockpit(
  parsed: ParsedCockpitConfig,
  customName?: string
): {
  name: string
  connections: Array<{
    name: string
    url: string
    headers: Record<string, string>
  }>
} {
  const { detected } = analyzeCockpitConfig(parsed)
  const template = getEnvironmentTemplate(detected.environment)

  const environmentName =
    customName || buildEnvironmentName(detected, parsed.credentials)

  // Build headers from credentials
  const headers: Record<string, string> = {}

  if (parsed.credentials.licenseId) {
    headers['x-cockpit-license-id'] = parsed.credentials.licenseId
  }
  if (parsed.credentials.namespaceId) {
    headers['x-cockpit-namespace-id'] = parsed.credentials.namespaceId
  }
  if (parsed.credentials.apiKey) {
    headers['x-api-key'] = parsed.credentials.apiKey
  }
  if (parsed.credentials.cockpitApiKey) {
    headers['x-cockpit-api-key'] = parsed.credentials.cockpitApiKey
  }
  if (parsed.credentials.utilityAgentId) {
    headers['x-cockpit-utility-agent-id'] = parsed.credentials.utilityAgentId
  }

  // Build connections using template
  const connections: Array<{
    name: string
    url: string
    headers: Record<string, string>
  }> = []

  if (template) {
    template.servers.forEach(serverDef => {
      const existingServer = parsed.servers[serverDef.key]

      connections.push({
        name: serverDef.key,
        url: existingServer?.url || serverDef.url,
        headers: existingServer?.headers || headers,
      })
    })
  } else {
    // Fallback: use servers from parsed config
    Object.entries(parsed.servers).forEach(([key, server]) => {
      connections.push({
        name: key,
        url: server.url,
        headers: server.headers || headers,
      })
    })
  }

  return {
    name: environmentName,
    connections,
  }
}

/**
 * Smart import: Merge servers into existing environment
 */
export function mergeServersIntoEnvironment(
  existingConnections: Array<{
    name: string
    url: string
    headers: Record<string, string>
  }>,
  parsed: ParsedCockpitConfig,
  options: ImportOptions
): {
  added: Array<{ name: string; url: string; headers: Record<string, string> }>
  updated: Array<{ name: string; url: string; headers: Record<string, string> }>
  skipped: Array<string>
} {
  const added: Array<{
    name: string
    url: string
    headers: Record<string, string>
  }> = []
  const updated: Array<{
    name: string
    url: string
    headers: Record<string, string>
  }> = []
  const skipped: string[] = []

  const existingServerNames = new Set(
    existingConnections.map(conn => conn.name)
  )

  // Build headers from credentials
  const headers: Record<string, string> = {}

  if (parsed.credentials.licenseId) {
    headers['x-cockpit-license-id'] = parsed.credentials.licenseId
  }
  if (parsed.credentials.namespaceId) {
    headers['x-cockpit-namespace-id'] = parsed.credentials.namespaceId
  }
  if (parsed.credentials.apiKey) {
    headers['x-api-key'] = parsed.credentials.apiKey
  }
  if (parsed.credentials.cockpitApiKey) {
    headers['x-cockpit-api-key'] = parsed.credentials.cockpitApiKey
  }
  if (parsed.credentials.utilityAgentId) {
    headers['x-cockpit-utility-agent-id'] = parsed.credentials.utilityAgentId
  }

  Object.entries(parsed.servers).forEach(([key, server]) => {
    if (!existingServerNames.has(key)) {
      // Add new server
      if (options.addMissingServers) {
        added.push({
          name: key,
          url: server.url,
          headers: server.headers || headers,
        })
      } else {
        skipped.push(key)
      }
    } else {
      // Update existing server
      if (options.updateExistingServers) {
        updated.push({
          name: key,
          url: server.url,
          headers:
            options.overwriteHeaders && server.headers
              ? server.headers
              : headers,
        })
      } else {
        skipped.push(key)
      }
    }
  })

  return { added, updated, skipped }
}

/**
 * Complete smart import workflow
 */
export function smartImportCockpitConfig(
  jsonContent: string,
  existingEnvironments: Array<{
    name: string
    connections: Array<{
      name: string
      url: string
      headers: Record<string, string>
    }>
  }>,
  options: ImportOptions,
  customEnvironmentName?: string
): ImportResult {
  try {
    const parsed = parseCockpitConfig(jsonContent)
    const analysis = analyzeCockpitConfig(parsed)

    const result: ImportResult = {
      success: false,
      mode: options.mode,
      environment: analysis.detected.environment,
      environmentName: '',
      serversProcessed: Object.keys(parsed.servers).length,
      serversAdded: 0,
      serversUpdated: 0,
      serversSkipped: 0,
      warnings: [...analysis.detected.warnings],
      errors: [...analysis.validation.errors],
    }

    // Skip mode
    if (options.mode === 'skip') {
      result.success = true
      result.serversSkipped = result.serversProcessed
      return result
    }

    // Create mode
    if (options.mode === 'create') {
      const newEnvironment = createEnvironmentFromCockpit(
        parsed,
        customEnvironmentName
      )
      result.environmentName = newEnvironment.name
      result.serversAdded = newEnvironment.connections.length
      result.success = true
      return result
    }

    // Merge/Update modes - find existing environment
    const environmentName =
      customEnvironmentName ||
      buildEnvironmentName(analysis.detected, parsed.credentials)

    const existingEnv = existingEnvironments.find(
      env => env.name === environmentName
    )

    if (!existingEnv) {
      result.errors.push(`Ambiente "${environmentName}" não encontrado`)
      return result
    }

    const mergeResult = mergeServersIntoEnvironment(
      existingEnv.connections,
      parsed,
      options
    )

    result.environmentName = environmentName
    result.serversAdded = mergeResult.added.length
    result.serversUpdated = mergeResult.updated.length
    result.serversSkipped = mergeResult.skipped.length
    result.success = true

    return result
  } catch (error) {
    return {
      success: false,
      mode: options.mode,
      environment: 'unknown',
      environmentName: '',
      serversProcessed: 0,
      serversAdded: 0,
      serversUpdated: 0,
      serversSkipped: 0,
      warnings: [],
      errors: [error instanceof Error ? error.message : String(error)],
    }
  }
}
