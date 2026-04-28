/**
 * Serviços do SDA2
 *
 * Exporta todos os serviços para gerenciamento de projetos, chats e artefatos
 */

// Serviço de detecção de artefatos em mensagens
export * from './artifact.service'

// Serviços de persistência (Project → Chat → History → Documents)
export * from './project.service'
export * from './chat.service'

// Serviço de integração com Azure DevOps
export * from './azure-devops.service'

// Serviço de detecção de processo do Azure DevOps
export * from './azure-devops-process.service'

// Parser de backlog markdown para hierarquia de work items
export * from './backlog-parser.service'
