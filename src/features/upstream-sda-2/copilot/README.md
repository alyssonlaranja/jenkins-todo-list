# CopilotKit Integration - Upstream SDA 2.0

## 📋 Visão Rápida

Esta pasta contém a integração completa do **CopilotKit** no Upstream-SDA-2, permitindo orquestração via IA conversacional.

## 🚀 Quick Start

```tsx
import { SDA2CopilotProvider } from './copilot'

;<CopilotKit runtimeUrl="/api/copilotkit">
  <SDA2CopilotProvider
    project={currentProject}
    currentConversation={currentConversation}
    artifacts={artifacts}
    setProject={setCurrentProject}
    setCurrentConversation={setCurrentConversation}
    setArtifacts={setArtifacts}
    projectService={services.projectService}
    chatService={services.chatService}
    artifactService={services.artifactService}
  >
    <YourApp />
  </SDA2CopilotProvider>
</CopilotKit>
```

## 📁 Estrutura

```
copilot/
├── types.ts                      # TypeScript types
├── sda2-handlers.ts              # 14 action handlers
├── sda2-mcp-integration.tsx      # 5 MCP actions
├── sda2-context-readables.tsx    # 6 context readables
├── sda2-copilot-provider.tsx     # Main provider
├── index.ts                      # Exports
├── README.md                     # Este arquivo
└── COPILOTKIT-IMPLEMENTATION.md  # Documentação completa
```

## 🎯 Handlers Disponíveis (14)

### Project (4)

- `sda2_project_create` - Criar projeto
- `sda2_project_select` - Selecionar projeto
- `sda2_project_update` - Atualizar projeto
- `sda2_project_list` - Listar projetos

### Conversation (4)

- `sda2_conversation_create` - Criar conversa
- `sda2_conversation_select` - Selecionar conversa
- `sda2_conversation_addMessage` - Adicionar mensagem
- `sda2_conversation_list` - Listar conversas

### Artifact (4)

- `sda2_artifact_create` - Criar artifact
- `sda2_artifact_update` - Atualizar artifact
- `sda2_artifact_search` - Buscar artifacts
- `sda2_artifact_view` - Visualizar artifact

### Agent (1)

- `sda2_agent_select` - Selecionar agente

### MCP Actions (5)

- `sda2_mcp_searchArtifacts` - Buscar no MCP
- `sda2_mcp_getTemplate` - Recuperar template
- `sda2_mcp_persistProject` - Persistir projeto
- `sda2_mcp_listProjects` - Listar projetos MCP
- `sda2_mcp_getMethodologyGuidance` - Buscar orientações

## 💬 Exemplos de Uso

```
User: "Cria um projeto chamado 'Portal Modernization'"
Assistant: "✅ Projeto 'Portal Modernization' criado!"

User: "Inicia conversa com a Maria sobre requisitos"
Assistant: "✅ Conversa criada com Maria - Business Analyst!"

User: "Gera um PRD greenfield"
Assistant: "✅ PRD criado baseado no projeto!"

User: "Busca template de arquitetura"
Assistant: "📄 Template de Architecture Document carregado!"
```

## 🔄 Fluxo de Dados

```
User Input → CopilotKit LLM → Handler → Service → MCP (ou localStorage)
                                                       ↓
                                                  React State Update
                                                       ↓
                                                   UI Re-render
```

## 📊 Context Readables (6)

1. **Current Project** - Projeto selecionado
2. **Current Conversation** - Conversa ativa
3. **Available Artifacts** - Artifacts do projeto
4. **Available Agents** - Agentes Avanade
5. **Artifact Types** - Tipos disponíveis
6. **Session State** - Estado e ações sugeridas

## 🔧 Persistência

**Híbrida:** MCP Server (remoto) + localStorage (fallback)

```typescript
if (mcpReady) {
  await callMCPTool('create_artifact', { key, value })
  // ✅ Persistido no MCP
} else {
  localStorage.setItem(key, value)
  // ⚠️ Persistido localmente
}
```

## 📚 Documentação Completa

Ver: [COPILOTKIT-IMPLEMENTATION.md](./COPILOTKIT-IMPLEMENTATION.md)

## 🧪 Testes

```bash
# Iniciar desenvolvimento
pnpm run dev

# Testar comandos na sidebar Copilot:
"cria projeto teste"
"lista projetos"
"inicia chat com wilson"
"gera prd greenfield"
"busca template de arquitetura"
```

## 🎯 Features

- ✅ 14 handlers organizados por categoria
- ✅ 5 MCP actions para knowledge base
- ✅ 6 context readables para LLM
- ✅ Persistência híbrida (MCP + local)
- ✅ Fallback automático quando offline
- ✅ TypeScript completo
- ✅ Documentação extensiva

---

**Implementado por:** Tiago Costa - Developer  
**Versão:** 1.0.0  
**Data:** Janeiro 2026
