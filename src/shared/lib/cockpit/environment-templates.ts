/**
 * Cockpit Environment Templates
 *
 * Pre-configured templates for all Cockpit environments with
 * correct URL patterns and server configurations
 */
import type { CockpitEnvironment } from './environment-detector'

export interface EnvironmentTemplate {
  environment: CockpitEnvironment
  displayName: string
  description: string
  color: string
  icon: string
  servers: {
    key: string
    url: string
    required: boolean
    description: string
  }[]
}

export const COCKPIT_ENVIRONMENT_TEMPLATES: EnvironmentTemplate[] = [
  {
    environment: 'prod',
    displayName: 'Production',
    description: 'Ambiente de produção com todos os servidores MCP ativos',
    color: 'bg-green-500',
    icon: '🚀',
    servers: [
      {
        key: 'connection-mcp-server-legacy',
        url: 'https://mcp.cockpit.avanade.ai/mcp',
        required: true,
        description: 'MCP Server Legacy (Avanade Cockpit)',
      },
      {
        key: 'connection-mcp-utility-agents',
        url: 'https://mcp-utility-agents.cockpit.avanade.ai/mcp',
        required: true,
        description: 'Utility Agents API (Gerenciamento de Agentes)',
      },
      {
        key: 'mcp-suite',
        url: 'https://mcp-suite.cockpit.avanade.ai/mcp',
        required: false,
        description: 'MCP Suite (Artifacts + Admin Tools)',
      },
      {
        key: 'mcp-metrics',
        url: 'https://mcp-metrics.cockpit.avanade.ai/mcp',
        required: false,
        description: 'MCP Metrics (Monitoramento e Analytics)',
      },
      {
        key: 'mcp-telemetry',
        url: 'https://mcp-telemetry.cockpit.avanade.ai/mcp',
        required: false,
        description: 'MCP Telemetry (Logs e Traces)',
      },
    ],
  },
  {
    environment: 'dev',
    displayName: 'Development',
    description: 'Ambiente de desenvolvimento para testes e experimentação',
    color: 'bg-blue-500',
    icon: '🔧',
    servers: [
      {
        key: 'connection-mcp-server-legacy',
        url: 'https://mcp-dev.cockpit.avanade.ai/mcp',
        required: true,
        description: 'MCP Server Legacy (Avanade Cockpit)',
      },
      {
        key: 'connection-mcp-utility-agents',
        url: 'https://mcp-utility-agents-dev.cockpit.avanade.ai/mcp',
        required: true,
        description: 'Utility Agents API (Gerenciamento de Agentes)',
      },
      {
        key: 'mcp-suite',
        url: 'https://mcp-suite-dev.cockpit.avanade.ai/mcp',
        required: false,
        description: 'MCP Suite (Artifacts + Admin Tools)',
      },
      {
        key: 'mcp-metrics',
        url: 'https://mcp-metrics-dev.cockpit.avanade.ai/mcp',
        required: false,
        description: 'MCP Metrics (Monitoramento e Analytics)',
      },
      {
        key: 'mcp-telemetry',
        url: 'https://mcp-telemetry-dev.cockpit.avanade.ai/mcp',
        required: false,
        description: 'MCP Telemetry (Logs e Traces)',
      },
    ],
  },
  {
    environment: 'qa',
    displayName: 'Quality Assurance',
    description: 'Ambiente de testes e validação de qualidade',
    color: 'bg-purple-500',
    icon: '🧪',
    servers: [
      {
        key: 'connection-mcp-server-legacy',
        url: 'https://mcp-qa.cockpit.avanade.ai/mcp',
        required: true,
        description: 'MCP Server Legacy (Avanade Cockpit)',
      },
      {
        key: 'connection-mcp-utility-agents',
        url: 'https://mcp-utility-agents-qa.cockpit.avanade.ai/mcp',
        required: true,
        description: 'Utility Agents API (Gerenciamento de Agentes)',
      },
      {
        key: 'mcp-suite',
        url: 'https://mcp-suite-qa.cockpit.avanade.ai/mcp',
        required: false,
        description: 'MCP Suite (Artifacts + Admin Tools)',
      },
      {
        key: 'mcp-metrics',
        url: 'https://mcp-metrics-qa.cockpit.avanade.ai/mcp',
        required: false,
        description: 'MCP Metrics (Monitoramento e Analytics)',
      },
      {
        key: 'mcp-telemetry',
        url: 'https://mcp-telemetry-qa.cockpit.avanade.ai/mcp',
        required: false,
        description: 'MCP Telemetry (Logs e Traces)',
      },
    ],
  },
  {
    environment: 'hml',
    displayName: 'Homologation',
    description: 'Ambiente de homologação pré-produção',
    color: 'bg-amber-500',
    icon: '📋',
    servers: [
      {
        key: 'connection-mcp-server-legacy',
        url: 'https://mcp-hml.cockpit.avanade.ai/mcp',
        required: true,
        description: 'MCP Server Legacy (Avanade Cockpit)',
      },
      {
        key: 'connection-mcp-utility-agents',
        url: 'https://mcp-utility-agents-hml.cockpit.avanade.ai/mcp',
        required: true,
        description: 'Utility Agents API (Gerenciamento de Agentes)',
      },
      {
        key: 'mcp-suite',
        url: 'https://mcp-suite-hml.cockpit.avanade.ai/mcp',
        required: false,
        description: 'MCP Suite (Artifacts + Admin Tools)',
      },
      {
        key: 'mcp-metrics',
        url: 'https://mcp-metrics-hml.cockpit.avanade.ai/mcp',
        required: false,
        description: 'MCP Metrics (Monitoramento e Analytics)',
      },
      {
        key: 'mcp-telemetry',
        url: 'https://mcp-telemetry-hml.cockpit.avanade.ai/mcp',
        required: false,
        description: 'MCP Telemetry (Logs e Traces)',
      },
    ],
  },
]

/**
 * Get template for specific environment
 */
export function getEnvironmentTemplate(
  environment: CockpitEnvironment
): EnvironmentTemplate | undefined {
  return COCKPIT_ENVIRONMENT_TEMPLATES.find(
    template => template.environment === environment
  )
}

/**
 * Get all environment names
 */
export function getAllEnvironmentNames(): string[] {
  return COCKPIT_ENVIRONMENT_TEMPLATES.map(template => template.displayName)
}

/**
 * Get environment by display name
 */
export function getEnvironmentByDisplayName(
  displayName: string
): EnvironmentTemplate | undefined {
  return COCKPIT_ENVIRONMENT_TEMPLATES.find(
    template => template.displayName === displayName
  )
}
