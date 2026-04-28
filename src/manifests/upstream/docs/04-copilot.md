# Assistente IA (Copilot)

## Visão Geral

O **Copilot** é o assistente de IA integrado ao Wizard do Upstream. Ele utiliza CopilotKit para fornecer sugestões contextuais, gerar conteúdo e automatizar tarefas durante a criação de macroiniciativas.

## Acessando o Copilot

O Copilot está disponível como uma sidebar colapsável no wizard:

```
┌────────────────────────────────────────────────────────────────┐
│  Wizard                                          [🤖 Copilot] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Conteúdo da etapa                    │  ┌─────────────────┐  │
│                                       │  │ 🤖 Copilot      │  │
│                                       │  │                 │  │
│                                       │  │ Como posso      │  │
│                                       │  │ ajudar?         │  │
│                                       │  │                 │  │
│                                       │  │ [Chat input]    │  │
│                                       │  └─────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## Funcionalidades

### 1. Chat Contextual

O Copilot entende o contexto atual:

- Etapa em que você está
- Dados já preenchidos
- Documentos da Knowledge Base

```
💬 Você: "Sugira hipóteses para este problema"

🤖 Copilot: "Com base no problema declarado sobre
reduzir tempo de onboarding, sugiro 3 hipóteses:

1. Acreditamos que usuários abandonam por complexidade
2. Acreditamos que falta feedback de progresso
3. Acreditamos que o fluxo tem etapas desnecessárias

Deseja que eu adicione alguma delas?"
```

### 2. Ações Automáticas

O Copilot pode executar ações no wizard:

| Ação                | Comando            | Resultado            |
| ------------------- | ------------------ | -------------------- |
| Criar hipótese      | `useCopilotAction` | Adiciona hipótese    |
| Adicionar evidência | `useCopilotAction` | Cria evidência       |
| Gerar features      | `useCopilotAction` | Cria features MoSCoW |
| Rascunhar handoff   | `useCopilotAction` | Gera documento       |

### 3. Sugestões Contextuais

Baseado na etapa atual, o Copilot sugere:

```
┌─────────────────────────────────────────────────┐
│  💡 Sugestões para Etapa 2 (Imersão)            │
├─────────────────────────────────────────────────┤
│                                                 │
│  📝 "Gerar Matriz CSD baseada no problema"      │
│  👥 "Sugerir stakeholders relevantes"           │
│  📊 "Recomendar fontes de dados"                │
│                                                 │
│  [Executar]                                     │
└─────────────────────────────────────────────────┘
```

## Actions Disponíveis

### Por Etapa

#### Etapa 1: Ideação

- Sugerir OKRs relacionados
- Melhorar declaração do problema
- Refinar alinhamento estratégico

#### Etapa 2: Imersão

- Gerar itens da Matriz CSD
- Mapear stakeholders
- Identificar oportunidades
- Sugerir fontes de dados

#### Etapa 3: Validação

- Recomendar método de validação
- Analisar força das evidências
- Sugerir conclusão baseada em dados

#### Etapa 4: Exploração

- Gerar macro requisitos
- Criar diagrama de fluxo Mermaid
- Mapear jornada do usuário

#### Etapa 5: Análise

- Gerar blueprint de arquitetura
- Identificar gaps
- Listar dependências

#### Etapa 6: Priorização

- Sugerir KPIs
- Calcular valor vs esforço
- Rascunhar memo QBR

#### Etapa 7: Transição

- Gerar Business Epics
- Criar features com MoSCoW
- Rascunhar documento de handoff

## Integração com Knowledge Base

O Copilot acessa documentos da Knowledge Base para:

```typescript
// Documentos disponíveis para contexto
const knowledgeSlots = [
  { type: 'market', docs: ['Pesquisa.pdf', 'Tendencias.xlsx'] },
  { type: 'financial', docs: ['Budget2024.pdf'] },
  { type: 'technical', docs: ['Arquitetura.md', 'APIs.json'] },
]
```

### Exemplo de Uso

```
💬 Você: "Com base nos documentos de mercado,
quais são as principais dores dos usuários?"

🤖 Copilot: "Analisando o documento 'Pesquisa.pdf',
identifiquei as seguintes dores:

1. Tempo de espera (mencionado 45 vezes)
2. Complexidade do processo (32 menções)
3. Falta de feedback (28 menções)

Fonte: Pesquisa.pdf, páginas 12-15"
```

## Comandos de Chat

### Comandos Rápidos

| Comando     | Descrição                      |
| ----------- | ------------------------------ |
| `/sugerir`  | Sugestões para etapa atual     |
| `/gerar`    | Gerar conteúdo automaticamente |
| `/analisar` | Analisar dados existentes      |
| `/resumir`  | Resumir informações            |
| `/ajuda`    | Listar comandos                |

### Exemplos

```
💬 /sugerir hipóteses

💬 /gerar matriz-csd

💬 /analisar evidências

💬 /resumir etapa-1
```

## Configurações

### Personalização

```typescript
// Em upstream-wizard-with-copilot.tsx
<CopilotSidebar
  instructions="Você é um especialista em descoberta..."
  labels={{
    title: "Copilot Upstream",
    initial: "Como posso ajudar com sua macroiniciativa?"
  }}
  defaultOpen={false}
/>
```

### Comportamento

| Configuração          | Valor | Descrição                  |
| --------------------- | ----- | -------------------------- |
| `defaultOpen`         | false | Sidebar fechada por padrão |
| `clickOutsideToClose` | false | Não fecha ao clicar fora   |
| `showDevConsole`      | false | Console de debug oculto    |

## Boas Práticas

### Quando Usar o Copilot

✅ **Recomendado:**

- Brainstorming inicial
- Geração de alternativas
- Análise de documentos
- Criação de rascunhos

❌ **Evitar:**

- Dados sensíveis sem revisão
- Decisões finais sem validação
- Conteúdo para compliance

### Revisão Humana

Sempre revise conteúdo gerado:

```
┌─────────────────────────────────────────────────┐
│  ⚠️ Conteúdo gerado por IA                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  O Copilot gerou 3 hipóteses.                   │
│                                                 │
│  [✓ Revisar e Aprovar]  [✗ Descartar]          │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    CopilotKit Integration                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │ CopilotSidebar   │    │ useCopilotAction │               │
│  │ (Chat UI)        │    │ (Actions)        │               │
│  └────────┬─────────┘    └────────┬─────────┘               │
│           │                        │                         │
│           └──────────┬─────────────┘                         │
│                      ▼                                       │
│           ┌──────────────────┐                               │
│           │ /api/copilotkit  │                               │
│           │ (Runtime)        │                               │
│           └────────┬─────────┘                               │
│                    ▼                                         │
│           ┌──────────────────┐                               │
│           │ OpenAI / Azure   │                               │
│           │ (LLM Provider)   │                               │
│           └──────────────────┘                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Copilot Não Responde

1. Verifique conexão MCP
2. Confira ambiente selecionado
3. Recarregue a página

### Ações Não Executam

1. Verifique permissões
2. Confira dados obrigatórios
3. Veja console de erros

### Conteúdo Incorreto

1. Adicione mais contexto
2. Seja mais específico
3. Forneça exemplos
