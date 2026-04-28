/**
 * Cockpit Environment Detector
 *
 * Automatically detects which Cockpit environment (DEV/QA/HML/PROD)
 * based on MCP server URLs
 */

export type CockpitEnvironment = 'dev' | 'qa' | 'hml' | 'prod' | 'unknown'

export interface DetectedEnvironment {
  environment: CockpitEnvironment
  urlPatterns: Record<string, string>
  confidence: number
  warnings: string[]
  detectedServers: string[]
}

export interface CockpitMcpServer {
  url: string
  headers?: Record<string, string>
  type?: 'http'
}

/**
 * Detects Cockpit environment from MCP server URLs
 */
export function detectCockpitEnvironment(
  servers: Record<string, CockpitMcpServer>
): DetectedEnvironment {
  const urls = Object.entries(servers).map(([key, server]) => ({
    key,
    url: server.url,
  }))

  // Check if URLs have environment prefix
  const hasDevPrefix = urls.some(({ url }) => url.includes('-dev.'))
  const hasQaPrefix = urls.some(({ url }) => url.includes('-qa.'))
  const hasHmlPrefix = urls.some(({ url }) => url.includes('-hml.'))

  // PROD: No prefix
  if (!hasDevPrefix && !hasQaPrefix && !hasHmlPrefix) {
    return {
      environment: 'prod',
      urlPatterns: {
        'connection-mcp-server-legacy': 'https://mcp.cockpit.avanade.ai/mcp',
        'connection-mcp-utility-agents':
          'https://mcp-utility-agents.cockpit.avanade.ai/mcp',
        'mcp-suite': 'https://mcp-suite.cockpit.avanade.ai/mcp',
        'mcp-metrics': 'https://mcp-metrics.cockpit.avanade.ai/mcp',
        'mcp-telemetry': 'https://mcp-telemetry.cockpit.avanade.ai/mcp',
      },
      confidence: 1.0,
      warnings: [],
      detectedServers: urls.map(({ key }) => key),
    }
  }

  // DEV
  if (hasDevPrefix) {
    const allUrlsMatchDev = urls.every(({ url }) => url.includes('-dev.'))

    if (allUrlsMatchDev) {
      return {
        environment: 'dev',
        urlPatterns: {
          'connection-mcp-server-legacy':
            'https://mcp-dev.cockpit.avanade.ai/mcp',
          'connection-mcp-utility-agents':
            'https://mcp-utility-agents-dev.cockpit.avanade.ai/mcp',
          'mcp-suite': 'https://mcp-suite-dev.cockpit.avanade.ai/mcp',
          'mcp-metrics': 'https://mcp-metrics-dev.cockpit.avanade.ai/mcp',
          'mcp-telemetry': 'https://mcp-telemetry-dev.cockpit.avanade.ai/mcp',
        },
        confidence: 1.0,
        warnings: [],
        detectedServers: urls.map(({ key }) => key),
      }
    }

    return {
      environment: 'dev',
      urlPatterns: {},
      confidence: 0.5,
      warnings: ['Nem todas as URLs têm o prefixo -dev. Mix de ambientes?'],
      detectedServers: urls.map(({ key }) => key),
    }
  }

  // QA
  if (hasQaPrefix) {
    const allUrlsMatchQa = urls.every(({ url }) => url.includes('-qa.'))

    if (allUrlsMatchQa) {
      return {
        environment: 'qa',
        urlPatterns: {
          'connection-mcp-server-legacy':
            'https://mcp-qa.cockpit.avanade.ai/mcp',
          'connection-mcp-utility-agents':
            'https://mcp-utility-agents-qa.cockpit.avanade.ai/mcp',
          'mcp-suite': 'https://mcp-suite-qa.cockpit.avanade.ai/mcp',
          'mcp-metrics': 'https://mcp-metrics-qa.cockpit.avanade.ai/mcp',
          'mcp-telemetry': 'https://mcp-telemetry-qa.cockpit.avanade.ai/mcp',
        },
        confidence: 1.0,
        warnings: [],
        detectedServers: urls.map(({ key }) => key),
      }
    }

    return {
      environment: 'qa',
      urlPatterns: {},
      confidence: 0.5,
      warnings: ['Nem todas as URLs têm o prefixo -qa. Mix de ambientes?'],
      detectedServers: urls.map(({ key }) => key),
    }
  }

  // HML
  if (hasHmlPrefix) {
    const allUrlsMatchHml = urls.every(({ url }) => url.includes('-hml.'))

    if (allUrlsMatchHml) {
      return {
        environment: 'hml',
        urlPatterns: {
          'connection-mcp-server-legacy':
            'https://mcp-hml.cockpit.avanade.ai/mcp',
          'connection-mcp-utility-agents':
            'https://mcp-utility-agents-hml.cockpit.avanade.ai/mcp',
          'mcp-suite': 'https://mcp-suite-hml.cockpit.avanade.ai/mcp',
          'mcp-metrics': 'https://mcp-metrics-hml.cockpit.avanade.ai/mcp',
          'mcp-telemetry': 'https://mcp-telemetry-hml.cockpit.avanade.ai/mcp',
        },
        confidence: 1.0,
        warnings: [],
        detectedServers: urls.map(({ key }) => key),
      }
    }

    return {
      environment: 'hml',
      urlPatterns: {},
      confidence: 0.5,
      warnings: ['Nem todas as URLs têm o prefixo -hml. Mix de ambientes?'],
      detectedServers: urls.map(({ key }) => key),
    }
  }

  return {
    environment: 'unknown',
    urlPatterns: {},
    confidence: 0,
    warnings: ['Não foi possível detectar o ambiente automaticamente'],
    detectedServers: urls.map(({ key }) => key),
  }
}

/**
 * Generates expected URL for a server type in a specific environment
 */
export function generateServerUrl(
  serverKey: string,
  environment: CockpitEnvironment
): string {
  if (environment === 'unknown') {
    return ''
  }

  const envSuffix = environment === 'prod' ? '' : `-${environment}`

  const serverPatterns: Record<string, string> = {
    'connection-mcp-server-legacy': `https://mcp${envSuffix}.cockpit.avanade.ai/mcp`,
    'connection-mcp-utility-agents': `https://mcp-utility-agents${envSuffix}.cockpit.avanade.ai/mcp`,
    'mcp-suite': `https://mcp-suite${envSuffix}.cockpit.avanade.ai/mcp`,
    'mcp-metrics': `https://mcp-metrics${envSuffix}.cockpit.avanade.ai/mcp`,
    'mcp-telemetry': `https://mcp-telemetry${envSuffix}.cockpit.avanade.ai/mcp`,
  }

  return serverPatterns[serverKey] || ''
}

/**
 * Validates if all servers in a configuration are consistent
 */
export function validateServerConsistency(
  servers: Record<string, CockpitMcpServer>
): {
  isConsistent: boolean
  environment: CockpitEnvironment
  errors: string[]
} {
  const detected = detectCockpitEnvironment(servers)

  const errors: string[] = []

  // Check confidence
  if (detected.confidence < 0.8) {
    errors.push(
      'Baixa confiança na detecção do ambiente. Verifique as URLs dos servers.'
    )
  }

  // Check if all expected servers are present
  const expectedServers = [
    'connection-mcp-server-legacy',
    'connection-mcp-utility-agents',
  ]

  const presentServers = Object.keys(servers)

  expectedServers.forEach(expectedServer => {
    if (!presentServers.includes(expectedServer)) {
      errors.push(`Server obrigatório ausente: ${expectedServer}`)
    }
  })

  // Check if URLs match expected pattern
  Object.entries(servers).forEach(([key, server]) => {
    const expectedUrl = generateServerUrl(key, detected.environment)
    if (expectedUrl && server.url !== expectedUrl) {
      errors.push(
        `URL do server '${key}' não corresponde ao padrão esperado para ${detected.environment.toUpperCase()}`
      )
    }
  })

  return {
    isConsistent: errors.length === 0 && detected.confidence >= 0.8,
    environment: detected.environment,
    errors,
  }
}
