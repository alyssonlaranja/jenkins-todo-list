# SDA2-BFF: Backend for Frontend

## 📋 Visão Geral

O **sda2-bff** é o Backend for Frontend especializado para o Upstream-SDA-2, implementando o protocolo AG-UI para integração com CopilotKit.

## 🎯 Diferenças do supervisor-bff

| Aspecto          | supervisor-bff                 | sda2-bff                          |
| ---------------- | ------------------------------ | --------------------------------- |
| **Foco**         | Multi-agent orchestration      | Single LLM + Context              |
| **Complexity**   | Alto (team members, MCP tools) | Baixo (direto ao LLM)             |
| **Agents**       | Dinâmico via MCP               | Contextualizado via system prompt |
| **Tools**        | Carrega ferramentas MCP        | Sem ferramentas (contexto puro)   |
| **Orquestração** | LangGraph multi-agent          | LangChain streaming simples       |
| **Use Case**     | Upstream-SDA (initiatives)     | Upstream-SDA-2 (projects)         |

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                   Client (ChatArea)                  │
└───────────────────┬─────────────────────────────────┘
                    │ POST /api/sda2-bff
                    │ { runId, threadId, messages, context }
                    ↓
┌─────────────────────────────────────────────────────┐
│                     SDA2-BFF                         │
│                                                      │
│  1. Build System Prompt                             │
│     - Contexto do projeto                           │
│     - Agentes disponíveis                           │
│     - Artifacts possíveis                           │
│     - Guidelines de resposta                        │
│                                                      │
│  2. Convert Messages                                │
│     - user → HumanMessage                           │
│     - assistant → AIMessage                         │
│     - system → SystemMessage                        │
│                                                      │
│  3. Call Azure OpenAI (streaming)                   │
│     - LangChain AzureChatOpenAI                     │
│     - Temperature: 0.7                              │
│     - Streaming: true                               │
│                                                      │
│  4. Stream SSE Events                               │
│     - RUN_START                                     │
│     - TEXT_MESSAGE_CONTENT (chunks)                 │
│     - RUN_END / RUN_ERROR                          │
│     - [DONE]                                        │
└───────────────────┬─────────────────────────────────┘
                    │ SSE Stream
                    ↓
┌─────────────────────────────────────────────────────┐
│              useSupervisorChat (Client)              │
│  - Processa stream SSE                              │
│  - Atualiza streamingContent                        │
│  - Retorna response completa                        │
└─────────────────────────────────────────────────────┘
```

## 📊 Protocolo AG-UI

### Request Format

```typescript
interface RunAgentInput {
  runId: string // Unique run identifier
  threadId: string // Conversation thread ID
  messages: Message[] // Chat history
  context?: ContextItem[] // Additional context
  forwardedProps?: {
    // CopilotKit properties
    utilityAgentId?: string
    mcpHeaders?: Record<string, string>
    mcpServerUrl?: string
    supervisorName?: string
    projectId?: string
    projectName?: string
    conversationId?: string
  }
}
```

### Response Format (SSE)

```
data: {"type":"RUN_START","runId":"..."}

data: {"type":"TEXT_MESSAGE_CONTENT","delta":"Olá","messageId":"..."}

data: {"type":"TEXT_MESSAGE_CONTENT","delta":", como","messageId":"..."}

data: {"type":"TEXT_MESSAGE_CONTENT","delta":" posso ajudar?","messageId":"..."}

data: {"type":"RUN_END","runId":"..."}

data: [DONE]
```

## 🔧 System Prompt Dinâmico

O BFF constrói um system prompt rico em contexto:

```typescript
function buildSDA2SystemPrompt(context?: ContextItem[]): string {
  const projectName = context?.find(c => c.key === 'projeto_nome')?.value
  const conversationTitle = context?.find(
    c => c.key === 'conversa_titulo'
  )?.value

  return `Você é o Avanade Supervisor para o sistema Upstream SDA-2.

**Contexto Atual:**
- Projeto: ${projectName}
- Conversa: ${conversationTitle}

**Suas Responsabilidades:**
1. Ajudar o usuário a gerenciar projetos SDA-2
2. Criar e atualizar artefatos (PRD, Arquitetura, Epics, Stories)
3. Facilitar conversas com agentes especializados
4. Buscar templates e orientações da Avanade Method
5. Orquestrar workflows de desenvolvimento

**Agentes Disponíveis:**
- João (PM), Wilson (Architect), Maria (Analyst), Paula (PO), Sofia (UX)

**Guidelines:**
- Seja direto e objetivo
- Use markdown para formatar respostas
- Sugira próximos passos quando apropriado
- Use emojis para melhor comunicação
...`
}
```

## 🎯 Vantagens

### 1. **Simplicidade**

- Sem complexidade de multi-agent orchestration
- Direto: contexto → LLM → resposta
- Fácil de debugar e manter

### 2. **Performance**

- Latência menor (sem MCP tool loading)
- Streaming direto do Azure OpenAI
- Sem overhead de LangGraph

### 3. **Contexto Rico**

- System prompt dinâmico baseado no projeto
- Informações de agentes embutidas
- Artifacts e templates no prompt

### 4. **Integração CopilotKit**

- Protocolo AG-UI nativo
- Suporte a forwardedProps
- Compatible com CopilotKit handlers (futuro)

## 🔄 Fluxo Completo

### 1. Cliente Envia Mensagem

```typescript
const requestBody = {
  runId: `run-${Date.now()}`,
  threadId: conversation?.id || `thread-${project.id}-${Date.now()}`,
  messages: [
    {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: 'Cria um PRD para o projeto',
    },
  ],
  context: [
    { key: 'projeto_id', value: project.id },
    { key: 'projeto_nome', value: project.name },
    { key: 'conversa_id', value: conversation?.id },
  ],
  forwardedProps: {
    utilityAgentId: SUPERVISOR_ID,
    supervisorName: 'Avanade Supervisor SDA2',
    mcpServerUrl: MCP_SERVER_URL,
    projectId: project.id,
    projectName: project.name,
  },
}

await fetch('/api/sda2-bff', {
  method: 'POST',
  body: JSON.stringify(requestBody),
})
```

### 2. BFF Processa

```typescript
// 1. Build system prompt com contexto
const systemPrompt = buildSDA2SystemPrompt(input.context)

// 2. Convert messages
const messages = [
  new SystemMessage({ content: systemPrompt }),
  ...convertMessages(input.messages),
]

// 3. Stream LLM
const response = await model.stream(messages)

// 4. Stream events
for await (const chunk of response) {
  streamEvent(writer, encoder, {
    type: 'TEXT_MESSAGE_CONTENT',
    delta: chunk.content,
    messageId: generateId(),
  })
}
```

### 3. Cliente Recebe Stream

```typescript
const reader = response.body?.getReader()
const decoder = new TextDecoder()

while (!done) {
  const { value, done: readerDone } = await reader.read()
  const chunk = decoder.decode(value)

  // Parse SSE events
  if (chunk.startsWith('data: ')) {
    const data = JSON.parse(chunk.slice(6))

    if (data.type === 'TEXT_MESSAGE_CONTENT') {
      supervisorResponse += data.delta
      onProgress?.(data.delta)
    }
  }
}
```

## 🧪 Testes

### Teste Manual

```bash
# Iniciar aplicação
pnpm run dev

# Abrir Upstream-SDA-2
http://localhost:3000/sda2

# Criar projeto e testar mensagens:
"Olá, cria um projeto de modernização mobile"
"Preciso de um PRD para este projeto"
"Me sugere próximos passos"
```

### Verificar Logs

```bash
# Console do navegador:
📤 [SDA2] Enviando para sda2-bff: {...}
✅ [SDA2] Resposta do supervisor recebida: {...}

# Terminal do servidor:
📨 [SDA2-BFF] Received request
📋 [SDA2-BFF] Request: {...}
🤖 [SDA2-BFF] Azure OpenAI configured: {...}
💬 [SDA2-BFF] Processing with N messages
✅ [SDA2-BFF] Response generated: {...}
```

## 🔍 Debugging

### Ver Request Completo

Adicione breakpoint em `sda2-bff/route.ts`:

```typescript
export async function POST(req: NextRequest) {
  const input = (await req.json()) as RunAgentInput

  console.log('🔍 [DEBUG] Full request:', JSON.stringify(input, null, 2))
  // <- BREAKPOINT AQUI
}
```

### Ver System Prompt

```typescript
const systemPrompt = buildSDA2SystemPrompt(input.context)

console.log('🔍 [DEBUG] System prompt:', systemPrompt)
// <- BREAKPOINT AQUI
```

### Ver Stream Events

```typescript
streamEvent(writer, encoder, {
  type: 'TEXT_MESSAGE_CONTENT',
  delta: content,
  messageId: generateId(),
})

console.log('🔍 [DEBUG] Streamed:', content)
// <- BREAKPOINT AQUI
```

## 📚 Comparação: supervisor-bff vs sda2-bff

### supervisor-bff (Upstream-SDA)

```
Client → supervisor-bff
       → Load MCP agent info
       → Load team members
       → Create delegation tools
       → LangGraph multi-agent execution
       → Stream complex orchestration
       → Client
```

**Prós:**

- ✅ Multi-agent orchestration
- ✅ Ferramentas MCP dinâmicas
- ✅ Team member delegation

**Contras:**

- ❌ Complexidade alta
- ❌ Latência maior
- ❌ Harder to debug

### sda2-bff (Upstream-SDA-2)

```
Client → sda2-bff
       → Build system prompt
       → LangChain single LLM
       → Stream response
       → Client
```

**Prós:**

- ✅ Simplicidade
- ✅ Latência baixa
- ✅ Fácil de debugar
- ✅ Contexto rico via prompt

**Contras:**

- ❌ Sem multi-agent (mas não precisa!)
- ❌ Sem ferramentas dinâmicas

## 🚀 Próximos Passos

### Fase 1: Básico ✅

- [x] BFF implementado
- [x] System prompt dinâmico
- [x] Streaming SSE
- [x] Integração com useSupervisorChat

### Fase 2: Enriquecimento (Futuro)

- [ ] Adicionar mais contexto no prompt (artifacts, history)
- [ ] Implementar rate limiting
- [ ] Adicionar métricas de uso
- [ ] Cache de respostas similares

### Fase 3: Handlers Integration (Futuro)

- [ ] Integrar com CopilotKit handlers
- [ ] Detectar intenções e executar actions
- [ ] Feedback loop para melhorar prompts

---

**Status**: ✅ Implementado e Funcionando  
**Endpoint**: `/api/sda2-bff`  
**Versão**: 1.0.0  
**Data**: 2026-01-08
