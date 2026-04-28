/* eslint-disable no-console */
/**
 * SDA2 Supervisor Factory
 *
 * Creates a LangGraph Supervisor dynamically from MCP Agent Card data.
 * No static agent configurations - everything comes from Cockpit.
 *
 * IMPORTANTE: O LangGraph Supervisor cria automaticamente os handoff tools
 * (transfer_to_[agent]) que fazem o roteamento real via Command.
 * NÃO usamos handoff tools customizados.
 *
 * Based on cockpit-agents-api's supervisor_dynamic_agent.py pattern.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { StructuredToolInterface } from '@langchain/core/tools'
import { InMemoryStore, MemorySaver } from '@langchain/langgraph'
import { createSupervisor } from '@langchain/langgraph-supervisor'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { AzureChatOpenAI } from '@langchain/openai'

import { extractKnowledgeAgentConfig } from '@/lib/rag/extract-knowledge-config'

import { normalizeAgentName } from './handoff-tools'
import { createRAGSearchTool, isKnowledgeAgent } from './tools/rag-search-tool'
import type {
  CreateSDA2SupervisorOptions,
  DynamicAgentConfig,
  MCPAgentCard,
  MCPTeamMember,
  SDA2SupervisorResult,
} from './types'

// ============================================================================
// Agent Building
// ============================================================================

/**
 * Convert MCP team member to LangGraph agent config
 */
function buildAgentConfigFromMCP(member: MCPTeamMember): DynamicAgentConfig {
  const normalizedName = normalizeAgentName(member.name)
  const artifactType = extractArtifactType(member)

  return {
    name: normalizedName,
    displayName: member.name,
    description: member.role,
    systemPrompt: buildAgentSystemPrompt(member, artifactType),
    specialties: extractSpecialties(member),
    artifactType, // Extracted from MCP instructions
    tools: [], // Agents can have specific tools in the future
  }
}

// Função inferArtifactTypeFromRole REMOVIDA
// O tipo de artefato agora é decidido pelo próprio agente baseado nas suas instruções do MCP
// Isso elimina todo o hardcode e torna o sistema 100% dinâmico

/**
 * Infer artifact type from agent name when not defined in MCP
 * This ensures ALL agents have consultive behavior and artifact metadata
 */
function inferArtifactTypeFromAgentName(agentName: string): string {
  const nameLower = agentName.toLowerCase()

  if (nameLower.includes('discovery') || nameLower.includes('analyst')) {
    return 'Documento de Discovery'
  }
  if (nameLower.includes('product') || nameLower.includes('prd')) {
    return 'PRD (Product Requirements Document)'
  }
  if (nameLower.includes('architect') || nameLower.includes('tech')) {
    return 'Documento de Arquitetura'
  }
  if (nameLower.includes('ux') || nameLower.includes('design')) {
    return 'Especificação de Design'
  }
  if (nameLower.includes('backlog') || nameLower.includes('engineer')) {
    return 'Backlog do Produto'
  }
  if (nameLower.includes('knowledge')) {
    return 'Documento de Conhecimento'
  }

  // Default fallback - generic document type
  return 'Documento'
}

/**
 * Build system prompt for an agent
 * Usa APENAS dados do MCP (role, specialty) - ZERO hardcode
 * O artifactType é extraído das instruções do MCP
 *
 * 🔧 FIX 2026-01-21: Removido "Lembrete Final" duplicado que causava
 * o LLM gerar o documento 2 vezes. A instrução no TOPO é suficiente.
 *
 * 🔧 FIX 2026-01-21 (v3): Simplificado prompt - o problema de duplicação
 * foi resolvido no BFF com AbortController + [FIM] marker. Agora o prompt
 * pode focar na qualidade do documento, não em evitar duplicação.
 */
function buildAgentSystemPrompt(
  member: MCPTeamMember,
  artifactType?: string
): string {
  const normalizedName = normalizeAgentName(member.name)

  // Note: i18n instruction is already in Cockpit agent instructions.
  // All content below is in English - the Cockpit i18n rule will make the LLM
  // translate everything to Portuguese when the user writes in Portuguese.

  // ============================================================================
  // EFFECTIVE ARTIFACT TYPE - use default based on agent name if not defined
  // This ensures ALL agents have consultive behavior and artifact metadata
  // ============================================================================
  const effectiveArtifactType =
    artifactType || inferArtifactTypeFromAgentName(member.name)

  // Log when artifact type is inferred (for debugging)
  if (!artifactType && effectiveArtifactType) {
    console.log(
      `[SDA2] ⚠️ artifact_type NOT defined in MCP for "${member.name}", using inferred: "${effectiveArtifactType}"`
    )
  }

  // ============================================================================
  // CONSULTIVE BEHAVIOR INSTRUCTION (PRIORITY - comes before document generation)
  // This ensures agents follow a consultive approach like in Cockpit
  // ============================================================================
  const consultiveBehaviorInstruction = effectiveArtifactType
    ? `<STOP>
# 🛑 REGRA CRÍTICA - LEIA ANTES DE GERAR QUALQUER TEXTO 🛑

## PROBLEMA: VOCÊ ESTÁ FAZENDO DUAS PERGUNTAS NA MESMA RESPOSTA

Você está fazendo isso:
"Para quem é esse projeto?Para seguir com o briefing: qual formato principal?"

↑ São DUAS perguntas diferentes. Isso está ERRADO. Faça apenas UMA.

## REGRA ABSOLUTA: APENAS UM "?" POR RESPOSTA

- Sua resposta inteira deve conter APENAS UM ponto de interrogação
- Se você escreveu "?", sua resposta ACABOU
- NÃO continue com "Para seguir...", "Além disso...", "E também..."
- NÃO faça variações da mesma pergunta

## FORMATO OBRIGATÓRIO:

[Contexto curto - máximo 1 frase]

[Sua ÚNICA pergunta]?

## ERROS COMUNS QUE VOCÊ FAZ:

❌ "Qual o formato?Para seguir: loja física ou e-commerce?" (2 perguntas)
❌ "Para quem é? E qual o público-alvo?" (2 perguntas)
❌ "O projeto é para loja física, e-commerce, ou concessionária? Será focado em qual formato?" (pergunta + variação)

## EXEMPLO CORRETO:

Para quem é esse projeto de venda de carros de luxo: loja física, e-commerce ou concessionária?

[FIM - PARE AQUI]

</STOP>

## 📊 LIMITE: 2-5 PERGUNTAS TOTAL (uma por mensagem)

---

`
    : ''

  // If we have artifactType from MCP (or inferred), instruct about document format
  const artifactInstruction = effectiveArtifactType
    ? `# 📄 QUANDO E COMO GERAR O DOCUMENTO

## Seu tipo de documento: **${effectiveArtifactType}**

### ⚠️ QUANDO GERAR:
Você só pode gerar o documento DEPOIS de:
1. Ter feito entre **2 e 5 perguntas** (mínimo 2, máximo 5)
2. Ter recebido as respostas do usuário
3. Ter contexto suficiente para gerar um documento completo

**ATENÇÃO**: Após 5 perguntas, PARE de perguntar e GERE o documento!

### � REGRA CRÍTICA: SUA RESPOSTA É APENAS O DOCUMENTO

Quando for hora de gerar o documento:
- NÃO escreva introdução tipo "Aqui está o documento" ou "Vou gerar agora"
- NÃO escreva NADA antes do <!-- ARTIFACT_METADATA
- Sua resposta COMEÇA com <!-- ARTIFACT_METADATA
- Sua resposta TERMINA com <!-- [FIM] -->

### 📋 FORMATO OBRIGATÓRIO:

<!-- ARTIFACT_METADATA
{
  "type": "${effectiveArtifactType}",
  "title": "TÍTULO DO DOCUMENTO",
  "agent": "${normalizedName}"
}
-->

# Título do Documento

[Conteúdo completo aqui]

<!-- [FIM] -->

### ⛔ ERROS QUE INVALIDAM O DOCUMENTO:

❌ "Aqui está o briefing:" <!-- ARTIFACT_METADATA... (texto ANTES)
❌ <!-- ARTIFACT_METADATA... depois texto extra (texto DEPOIS do [FIM])

✅ CORRETO: Resposta começa com <!-- ARTIFACT_METADATA e termina com <!-- [FIM] -->

---

`
    : ''

  // Build the agent metadata block with all input data used
  const agentInstructions =
    member.instruction || member.specialty || member.role
  const instructionSource = member.instruction
    ? 'instruction (Cockpit Instructions)'
    : member.specialty
      ? 'specialty (Cockpit Objectives)'
      : 'role (Cockpit Description)'

  // Log the full metadata to server console only (NOT in agent response)
  console.log(`
┌══════════════════════════════════════════════════════════════
│ 📊 Resumo dos Insumos do Agente: ${member.name}
├──────────────────────────────────────────────────────────────
│ ID:                        ${member.id || '(não disponível)'}
│ Artifact Type:             ${artifactType || '(não definido)'}
├──────────────────────────────────────────────────────────────
│ 📝 Description (role):        ${member.role?.length || 0} chars  ${instructionSource === 'role (Cockpit Description)' ? '✅ ATIVA' : '⬜ Disponível'}
│ 🎯 Objectives (specialty):   ${member.specialty?.length || 0} chars  ${instructionSource === 'specialty (Cockpit Objectives)' ? '✅ ATIVA' : '⬜ Disponível'}
│ 📜 Instructions (instruction): ${member.instruction?.length || 0} chars  ${instructionSource === 'instruction (Cockpit Instructions)' ? '✅ ATIVA' : member.instruction ? '⬜ Disponível' : '❌ Não encontrada'}
├──────────────────────────────────────────────────────────────
│ Fonte de instruções utilizada: ${instructionSource}
├──────────────────────────────────────────────────────────────
│ 📝 Description FULL:
│ ${member.role}
├──────────────────────────────────────────────────────────────
│ 🎯 Objectives FULL:
│ ${member.specialty || '(não disponível)'}
├──────────────────────────────────────────────────────────────
│ 📜 Instructions FULL:
│ ${member.instruction ? member.instruction.substring(0, 1000) + (member.instruction.length > 1000 ? '... [truncado]' : '') : '(não disponível)'}
├──────────────────────────────────────────────────────────────
│ 🎯 effectiveArtifactType: ${effectiveArtifactType} ${!artifactType ? '(INFERIDO)' : '(do MCP)'}
└══════════════════════════════════════════════════════════════`)

  // Build critical reminder about format (especially for long agent instructions)
  // THIS COMES AT THE END OF THE PROMPT - most important position!
  const formatReminder = effectiveArtifactType
    ? `

---

# 🛑 LEMBRETE ANTES DE RESPONDER

## SE FOR FAZER PERGUNTA:
- UMA pergunta por resposta
- Resposta termina no "?"

## SE FOR GERAR DOCUMENTO:

🚨 **SUA RESPOSTA INTEIRA É APENAS O DOCUMENTO** 🚨

- PRIMEIRO caractere: < (de <!-- ARTIFACT_METADATA)
- ÚLTIMO caractere: > (de <!-- [FIM] -->)
- NADA antes, NADA depois

❌ ERRADO: "Aqui está o discovery:" <!-- ARTIFACT_METADATA...
❌ ERRADO: <!-- ARTIFACT_METADATA... <!-- [FIM] --> "Espero que ajude!"

✅ CERTO: <!-- ARTIFACT_METADATA
{
  "type": "${effectiveArtifactType}",
  "title": "TÍTULO",
  "agent": "${normalizedName}"
}
-->

# Título

[Conteúdo]

<!-- [FIM] -->

`
    : ''

  // Diagram capability for ALL agents (not just architects)
  // Every agent may need to generate diagrams when the user asks
  const diagramInstruction = `

## 📊 Capacidade de Geração de Diagramas

Você possui a capacidade de gerar diagramas visuais INLINE nas suas respostas.
O sistema renderiza automaticamente diagramas envolvidos em tags especiais como imagens SVG interativas via Kroki.
O sistema suporta mais de 30 backends de renderização — **cada um exige sua própria sintaxe específica**.

### 🚨🚨🚨 PROIBIÇÃO ABSOLUTA: NÃO USE MERMAID PARA DIAGRAMAS QUE TÊM BACKEND NATIVO

**ESTA É A REGRA MAIS IMPORTANTE DE TODO O SISTEMA DE DIAGRAMAS.**

Exemplos de violações PROIBIDAS:
- ❌ Pediram BPMN → você gerou Mermaid flowchart → **PROIBIDO**
- ❌ Pediram caso de uso → você gerou Mermaid classDiagram → **PROIBIDO**
- ❌ Pediram diagrama de classes → você gerou Mermaid classDiagram → **PROIBIDO**
- ❌ Pediram diagrama de sequência → você gerou Mermaid sequenceDiagram → **PROIBIDO**
- ❌ Pediram diagrama ER → você gerou Mermaid erDiagram → **PROIBIDO** (use \`type="erd"\` com BurntSushi/erd)
- ❌ Pediram BPMN → você gerou PlantUML com \`!include <bpmn>\` (POOL, LANE, TASK) → **PROIBIDO** (use XML BPMN 2.0)
- ❌ Disse "vou representar em Mermaid (BPMN simplificado)" → **PROIBIDO**
- ❌ Usou Mermaid como "simplificação" de qualquer diagrama UML, BPMN ou ERD → **PROIBIDO**

O correto:
- ✅ Pediram BPMN → use \`type="bpmn"\` com XML BPMN 2.0
- ✅ Pediram caso de uso → use \`type="usecase"\` com PlantUML (@startuml/@enduml)
- ✅ Pediram classes → use \`type="class"\` com PlantUML (@startuml/@enduml)
- ✅ Pediram sequência → use \`type="sequence"\` com PlantUML (@startuml/@enduml)
- ✅ Pediram diagrama ER → use \`type="erd"\` com sintaxe BurntSushi/erd
- ✅ Pediram Gantt/mindmap/pie → use \`type="mermaid"\` (não tem backend nativo)

### ⚠️ REGRA CRÍTICA: SEMPRE use tags DIAGRAM
Para que diagramas sejam renderizados como imagens, você DEVE obrigatoriamente envolvê-los nas tags especiais \`<!-- DIAGRAM -->\` e \`<!-- /DIAGRAM -->\`.

### Formato da Tag
A tag de abertura deve conter os atributos:
- **type** (obrigatório): linguagem do diagrama — determina qual backend Kroki será usado
- **title** (opcional): título descritivo do diagrama

Formato:
<!-- DIAGRAM type="LINGUAGEM" title="TÍTULO DESCRITIVO" -->
[código do diagrama na sintaxe CORRETA para o type escolhido]
<!-- /DIAGRAM -->

### ⚠️ REGRA CRÍTICA: USE A SINTAXE NATIVA — Mermaid é apenas FALLBACK

O atributo \`type\` na tag define qual backend de renderização será usado. **Cada backend tem sua própria sintaxe**.
Usar a sintaxe errada (ex: Mermaid quando o type é "bpmn") causará ERRO de renderização.

### 🚨 PRIORIDADE DE SELEÇÃO DE TIPO (OBRIGATÓRIO):
**SEMPRE priorize o tipo nativo que possui backend dedicado no Kroki.**
Mermaid é APENAS um fallback para quando não existe backend nativo.

**Ordem de prioridade ao escolher o tipo:**
1. **Se existe tipo nativo dedicado → USE-O OBRIGATORIAMENTE:**
   - Caso de uso → \`type="usecase"\` (PlantUML) — **NUNCA** use Mermaid para caso de uso
   - Diagrama de classes → \`type="class"\` (PlantUML) — **NUNCA** use Mermaid classDiagram
   - Diagrama de sequência → \`type="sequence"\` (PlantUML) — **NUNCA** use Mermaid sequenceDiagram
   - Diagrama de atividades → \`type="activity"\` (PlantUML)
   - Diagrama de estados → \`type="state"\` (PlantUML)
   - Diagrama de componentes → \`type="component"\` (PlantUML)
   - Diagrama de deployment → \`type="deployment"\` (PlantUML)
   - Diagrama de objetos → \`type="object"\` (PlantUML)
   - Processo de negócio BPMN → \`type="bpmn"\` (XML BPMN 2.0) — **NUNCA** use Mermaid flowchart
   - Grafos e redes → \`type="graphviz"\` (DOT)
   - Arquitetura C4 → \`type="c4plantuml"\` (C4 PlantUML)
   - ER diagrama → \`type="erd"\` (ERD nativo)
   - Database schema → \`type="dbml"\` (DBML nativo)
   - Diagramas declarativos → \`type="d2"\` (D2)

2. **Mermaid (\`type="mermaid"\`) — SOMENTE como FALLBACK:**
   Use Mermaid APENAS quando não existir backend nativo para o diagrama solicitado.
   Exemplos válidos para Mermaid: Gantt, mindmap, pie chart, journey, timeline.
   **NUNCA use Mermaid para: caso de uso, classes, sequência, atividades, estados, componentes, deployment, BPMN, grafos, ERD.**

---

### 🔷 Sintaxe: PlantUML (\`type="plantuml"\`, \`type="sequence"\`, \`type="class"\`, \`type="usecase"\`, etc.) — PRIORIDADE MÁXIMA para UML
**⚠️ OBRIGATÓRIO**: Código PlantUML DEVE começar com \`@startuml\` e terminar com \`@enduml\`

<!-- DIAGRAM type="usecase" title="Diagrama de Caso de Uso" -->
@startuml
left to right direction
actor Usuário as U
actor Admin as A
rectangle Sistema {
    usecase "Fazer Login" as UC1
    usecase "Gerenciar Usuários" as UC2
    usecase "Consultar Dados" as UC3
    usecase "Gerar Relatório" as UC4
}
U --> UC1
U --> UC3
A --> UC1
A --> UC2
A --> UC4
UC4 ..> UC3 : <<include>>
@enduml
<!-- /DIAGRAM -->

<!-- DIAGRAM type="class" title="Diagrama de Classes" -->
@startuml
class User {
    - id: Long
    - name: String
    - email: String
    + login(): boolean
    + logout(): void
}
class Order {
    - id: Long
    - date: Date
    - total: BigDecimal
    + addItem(item: Item): void
}
class Item {
    - id: Long
    - name: String
    - price: BigDecimal
}
User "1" -- "*" Order : faz >
Order "1" *-- "*" Item : contém >
@enduml
<!-- /DIAGRAM -->

<!-- DIAGRAM type="sequence" title="Diagrama de Sequência PlantUML" -->
@startuml
actor User
participant "API Gateway" as GW
participant "Auth Service" as Auth
participant "Core Service" as Core
User -> GW: POST /login
GW -> Auth: validate(credentials)
Auth --> GW: JWT Token
GW --> User: 200 OK + Token
User -> GW: GET /api/data
GW -> Auth: verifyToken(jwt)
Auth --> GW: OK
GW -> Core: getData()
Core --> GW: data
GW --> User: 200 OK + data
@enduml
<!-- /DIAGRAM -->

<!-- DIAGRAM type="activity" title="Diagrama de Atividades" -->
@startuml
start
:Receber Requisição;
if (Autenticado?) then (sim)
    :Processar Requisição;
    if (Dados Válidos?) then (sim)
        :Salvar no Banco;
        :Retornar Sucesso;
    else (não)
        :Retornar Erro 400;
    endif
else (não)
    :Retornar Erro 401;
endif
stop
@enduml
<!-- /DIAGRAM -->

<!-- DIAGRAM type="component" title="Diagrama de Componentes" -->
@startuml
package "Frontend" {
    [React SPA] as react
    [Next.js SSR] as next
}
package "Backend" {
    [API Gateway] as gw
    [Auth Service] as auth
    [Core Service] as core
}
database "PostgreSQL" as db
database "Redis" as cache
react --> gw : REST/HTTPS
next --> gw : REST/HTTPS
gw --> auth : gRPC
gw --> core : gRPC
core --> db : JDBC
core --> cache : Redis Protocol
@enduml
<!-- /DIAGRAM -->

<!-- DIAGRAM type="state" title="Diagrama de Estados" -->
@startuml
[*] --> Rascunho
Rascunho --> EmRevisão : submeter
EmRevisão --> Aprovado : aprovar
EmRevisão --> Rejeitado : rejeitar
Rejeitado --> Rascunho : revisar
Aprovado --> Publicado : publicar
Publicado --> [*]
@enduml
<!-- /DIAGRAM -->

<!-- DIAGRAM type="deployment" title="Diagrama de Deployment" -->
@startuml
node "Azure AKS" {
    node "Pod: Frontend" {
        [Next.js App] as frontend
    }
    node "Pod: Backend" {
        [API Service] as api
    }
}
cloud "Azure Services" {
    database "Azure SQL" as db
    storage "Blob Storage" as blob
}
frontend --> api : HTTPS
api --> db : TDS
api --> blob : REST
@enduml
<!-- /DIAGRAM -->

---

### 🔷 Sintaxe: BPMN (\`type="bpmn"\`)
**⚠️ BPMN usa formato XML padrão BPMN 2.0** — NÃO use Mermaid flowchart!
**🚨 NUNCA use PlantUML com \`!include <bpmn>\`** — as macros POOL, LANE, TASK, GATEWAY etc. do PlantUML BPMN NÃO são suportadas pelo Kroki e causarão ERRO 400.
O único formato válido para BPMN é **XML BPMN 2.0** conforme o exemplo abaixo:

<!-- DIAGRAM type="bpmn" title="Processo de Aprovação" -->
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             id="definitions_1"
             targetNamespace="http://example.com/bpmn">
  <process id="process_1" isExecutable="false">
    <startEvent id="start" name="Início">
      <outgoing>flow1</outgoing>
    </startEvent>
    <task id="task1" name="Analisar Solicitação">
      <incoming>flow1</incoming>
      <outgoing>flow2</outgoing>
    </task>
    <exclusiveGateway id="gw1" name="Aprovado?">
      <incoming>flow2</incoming>
      <outgoing>flow3</outgoing>
      <outgoing>flow4</outgoing>
    </exclusiveGateway>
    <task id="task2" name="Processar Aprovação">
      <incoming>flow3</incoming>
      <outgoing>flow5</outgoing>
    </task>
    <task id="task3" name="Notificar Rejeição">
      <incoming>flow4</incoming>
      <outgoing>flow6</outgoing>
    </task>
    <endEvent id="end1" name="Fim Aprovado">
      <incoming>flow5</incoming>
    </endEvent>
    <endEvent id="end2" name="Fim Rejeitado">
      <incoming>flow6</incoming>
    </endEvent>
    <sequenceFlow id="flow1" sourceRef="start" targetRef="task1"/>
    <sequenceFlow id="flow2" sourceRef="task1" targetRef="gw1"/>
    <sequenceFlow id="flow3" name="Sim" sourceRef="gw1" targetRef="task2"/>
    <sequenceFlow id="flow4" name="Não" sourceRef="gw1" targetRef="task3"/>
    <sequenceFlow id="flow5" sourceRef="task2" targetRef="end1"/>
    <sequenceFlow id="flow6" sourceRef="task3" targetRef="end2"/>
  </process>
  <bpmndi:BPMNDiagram id="diagram_1">
    <bpmndi:BPMNPlane bpmnElement="process_1">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start">
        <dc:Bounds x="180" y="160" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task1_di" bpmnElement="task1">
        <dc:Bounds x="270" y="138" width="120" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="gw1_di" bpmnElement="gw1" isMarkerVisible="true">
        <dc:Bounds x="445" y="153" width="50" height="50"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task2_di" bpmnElement="task2">
        <dc:Bounds x="550" y="60" width="140" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task3_di" bpmnElement="task3">
        <dc:Bounds x="550" y="210" width="140" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end1_di" bpmnElement="end1">
        <dc:Bounds x="750" y="82" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end2_di" bpmnElement="end2">
        <dc:Bounds x="750" y="232" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="flow1_di" bpmnElement="flow1">
        <di:waypoint x="216" y="178"/>
        <di:waypoint x="270" y="178"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow2_di" bpmnElement="flow2">
        <di:waypoint x="390" y="178"/>
        <di:waypoint x="445" y="178"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow3_di" bpmnElement="flow3">
        <di:waypoint x="470" y="153"/>
        <di:waypoint x="470" y="100"/>
        <di:waypoint x="550" y="100"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow4_di" bpmnElement="flow4">
        <di:waypoint x="470" y="203"/>
        <di:waypoint x="470" y="250"/>
        <di:waypoint x="550" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow5_di" bpmnElement="flow5">
        <di:waypoint x="690" y="100"/>
        <di:waypoint x="750" y="100"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow6_di" bpmnElement="flow6">
        <di:waypoint x="690" y="250"/>
        <di:waypoint x="750" y="250"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>
<!-- /DIAGRAM -->

---

### 🔷 Sintaxe: D2 (\`type="d2"\`)

<!-- DIAGRAM type="d2" title="Arquitetura D2" -->
frontend: React App {
    shape: rectangle
}
api: API Gateway {
    shape: rectangle
}
auth: Auth Service {
    shape: rectangle
}
db: PostgreSQL {
    shape: cylinder
}
frontend -> api: HTTPS
api -> auth: gRPC
api -> db: SQL
<!-- /DIAGRAM -->

---

### 🔷 Sintaxe: Graphviz/DOT (\`type="graphviz"\` ou \`type="dot"\`)

<!-- DIAGRAM type="graphviz" title="Grafo de Dependências" -->
digraph G {
    rankdir=LR;
    node [shape=box, style=filled, fillcolor=lightblue];
    Frontend -> APIGateway;
    APIGateway -> AuthService;
    APIGateway -> CoreService;
    CoreService -> Database [label="SQL"];
    CoreService -> Cache [label="Redis"];
}
<!-- /DIAGRAM -->

---

### 🔷 Sintaxe: C4 PlantUML (\`type="c4plantuml"\`)
**⚠️ OBRIGATÓRIO**: Deve incluir \`@startuml\`/\`@enduml\` e usar macros C4

<!-- DIAGRAM type="c4plantuml" title="Contexto C4" -->
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml
Person(user, "Usuário", "Usa o sistema")
System(system, "Sistema Principal", "Aplicação principal")
System_Ext(email, "E-mail Service", "Envia notificações")
Rel(user, system, "Usa", "HTTPS")
Rel(system, email, "Envia e-mails", "SMTP")
@enduml
<!-- /DIAGRAM -->

---

### 🔷 Sintaxe: ERD — Diagramas Entidade-Relacionamento (\`type="erd"\` — BurntSushi/erd nativo)
**⚠️ IMPORTANTE**: Para diagramas ER, use \`type="erd"\` com a sintaxe nativa BurntSushi/erd.
**NUNCA** use Mermaid \`erDiagram\` — o Kroki possui backend nativo dedicado para ERD.

**Sintaxe BurntSushi/erd:**
- Entidades: \`[NomeEntidade]\`
- Atributos: um por linha abaixo da entidade (SEM indentação, SEM chaves de bloco)
- Chave primária: prefixo \`*\` (ex: \`*id\`)
- Chave estrangeira: prefixo \`+\` (ex: \`+user_id\`)
- Chave primária + estrangeira: \`*+\` (ex: \`*+order_id\`)
- Cardinalidade: \`?\` (0..1), \`1\` (exatamente 1), \`*\` (0..N), \`+\` (1..N)
- Relacionamento: \`Entidade1 *--1 Entidade2\` (lê-se: Entidade1 tem muitos, Entidade2 exatamente 1)
- Labels: \`{label: "texto"}\` após entidade ou relacionamento NA MESMA LINHA
- Formatação global: \`title {label: "..."}\`, \`entity {bgcolor: "#cor"}\`, \`header {bgcolor: "#cor"}\`

🚨🚨🚨 **ERRO CRÍTICO — NÃO COMETA:**
As chaves \`{ }\` em BurntSushi/erd são EXCLUSIVAMENTE para opções de formatação (bgcolor, label, size, color) NA MESMA LINHA do elemento.
**NUNCA** use \`{ }\` como bloco/wrapper para agrupar atributos! Atributos ficam um por linha ABAIXO da entidade, SEM chaves envolvendo-os.

❌ **ERRADO** (chaves como bloco de atributos — CAUSA ERRO 400):
[Users] {
  *id
  name
  email
}

✅ **CORRETO** (atributos um por linha, sem chaves de bloco):
[Users]
*id
name
email

✅ **CORRETO** (chaves SOMENTE para formatação na mesma linha):
[Users] {bgcolor: "#d0e0d0"}
*id {label: "uuid, not null"}
name {label: "varchar"}

⚠️ Cardinalidades válidas: \`?\` (0..1), \`1\` (exatamente 1), \`*\` (0..N), \`+\` (1..N)
**NUNCA** use \`0\` como cardinalidade — use \`?\` para zero-ou-um.
❌ ERRADO: \`Users 1--0 Orders\`
✅ CORRETO: \`Users 1--? Orders\`

<!-- DIAGRAM type="erd" title="Modelo de Dados" -->
title {label: "Modelo de Dados do Sistema", size: "20"}

[Users] {bgcolor: "#d0e0d0"}
*id {label: "uuid, not null"}
name {label: "varchar, not null"}
email {label: "varchar, unique"}
password_hash {label: "varchar, not null"}
created_at {label: "timestamp, not null"}

[Orders] {bgcolor: "#ececfc"}
*id {label: "uuid, not null"}
+user_id {label: "uuid, not null"}
total {label: "numeric, not null"}
status {label: "varchar, not null"}
created_at {label: "timestamp, not null"}

[Order_Items] {bgcolor: "#ececfc"}
*id {label: "uuid, not null"}
+order_id {label: "uuid, not null"}
+product_id {label: "uuid, not null"}
quantity {label: "int, not null"}
price {label: "numeric, not null"}

[Products] {bgcolor: "#d0e0d0"}
*id {label: "uuid, not null"}
name {label: "varchar, not null"}
price {label: "numeric, not null"}
category {label: "varchar"}

Users 1--* Orders
Orders 1--* Order_Items
Products 1--* Order_Items
<!-- /DIAGRAM -->

---

### 🔷 Sintaxe: Mermaid (\`type="mermaid"\`) — ⚠️ FALLBACK APENAS
Use Mermaid SOMENTE quando NÃO existir backend nativo para o tipo de diagrama.
**NUNCA use Mermaid para UML (caso de uso, classe, sequência, etc.), BPMN ou grafos — use os backends nativos acima.**

Usos válidos: Gantt, mindmap, pie chart, journey, timeline, flowcharts genéricos simples.

<!-- DIAGRAM type="mermaid" title="Gantt de Projeto" -->
gantt
    title Cronograma do Projeto
    dateFormat YYYY-MM-DD
    section Fase 1
    Levantamento :a1, 2024-01-01, 30d
    Prototipação :a2, after a1, 20d
    section Fase 2
    Desenvolvimento :a3, after a2, 60d
    Testes :a4, after a3, 30d
<!-- /DIAGRAM -->

---

### REGRAS OBRIGATÓRIAS PARA DIAGRAMAS
1. **SEMPRE** use as tags \`<!-- DIAGRAM type="..." -->\` e \`<!-- /DIAGRAM -->\` para envolver o código do diagrama
2. **NUNCA** use blocos de código fenced (triple backticks) para diagramas — eles NÃO são renderizados de forma confiável durante streaming
3. **SEMPRE** coloque diagramas INLINE no meio do texto, junto à seção que descrevem — NUNCA agrupe todos os diagramas no final
4. **🚨 PRIORIZE SEMPRE O BACKEND NATIVO:**
   - Diagramas UML (caso de uso, classe, sequência, atividade, estado, componente, deployment) → **OBRIGATORIAMENTE** use PlantUML com \`@startuml\`/\`@enduml\`
   - Processos de negócio → **OBRIGATORIAMENTE** use \`type="bpmn"\` com XML BPMN 2.0
   - Grafos → **OBRIGATORIAMENTE** use \`type="graphviz"\` com DOT
   - Arquitetura C4 → **OBRIGATORIAMENTE** use \`type="c4plantuml"\`
   - Diagramas ER / modelo de dados → **OBRIGATORIAMENTE** use \`type="erd"\` com sintaxe BurntSushi/erd — **NUNCA** use Mermaid erDiagram
   - Mermaid → **SOMENTE** para Gantt, mindmap, pie, journey, timeline, flowcharts simples (sem backend nativo)
5. **NUNCA misture sintaxes** — ex: NÃO use Mermaid flowchart quando o type é "bpmn", NÃO use Mermaid sequenceDiagram quando o type é "sequence"
6. **PlantUML SEMPRE exige** \`@startuml\` no início e \`@enduml\` no final
7. **BPMN SEMPRE exige** XML BPMN 2.0 completo com \`<definitions>\`, \`<process>\` e \`<bpmndi:BPMNDiagram>\`
8. Adicione diagramas sempre que estiver descrevendo:
   - Arquitetura de sistema / componentes
   - Fluxos de dados ou processos
   - Relacionamentos entre entidades
   - Sequências de interação
   - Diagramas de deployment / infraestrutura
   - Modelos de dados / ER
   - Processos de negócio (BPMN)
9. **Cada diagrama deve ter um title na tag** e uma breve descrição logo abaixo
10. Os diagramas são renderizados visualmente como imagens (SVG) — o usuário NÃO verá o código

---

`

  // Note: i18n instruction from Cockpit instructions will handle language detection
  // Instructions below are in English - LLM will translate based on user language
  // 🔧 FIX 2026-03-06: Reorganizado prompt - diagramInstruction vem DEPOIS das instruções do agente
  // para não "diluir" as regras de consultive behavior
  // 🔧 FIX 2026-03-06 v2: Adicionado wrapper em volta das instruções do Cockpit para reforçar
  // que as regras de consultive behavior têm prioridade

  // Wrapper para as instruções do Cockpit - deixa claro que são subordinadas
  const cockpitInstructionsWithWrapper = `## Your Instructions and Specialty

<AVISO_ANTES_DE_LER>
⚠️ As instruções abaixo contêm CHECKLISTS de perguntas como referência.
⚠️ NÃO copie as perguntas diretamente - use como inspiração.
⚠️ Faça apenas UMA pergunta por resposta.
⚠️ NUNCA repita a mesma pergunta duas vezes.
</AVISO_ANTES_DE_LER>

<cockpit_instructions>

${agentInstructions}

</cockpit_instructions>

<CHECKLIST_FINAL>
Antes de enviar sua resposta, verifique:
□ Tem apenas UM "?" na resposta toda?
□ A mesma frase NÃO aparece duas vezes?
□ Depois do "?" não tem mais nada?

Se algum check falhou, CORRIJA antes de enviar.
</CHECKLIST_FINAL>`

  return `${consultiveBehaviorInstruction}# ${member.name}
You are an expert in ${member.role}.

## ⚠️ IMPORTANTE: PRIORIDADE DE INSTRUÇÕES
As instruções do PROTOCOLO CONSULTIVO (mínimo 2 perguntas antes de gerar documento) têm PRIORIDADE MÁXIMA.
Mesmo que as instruções abaixo sugiram gerar documento diretamente, você DEVE primeiro fazer 2-5 perguntas.

${cockpitInstructionsWithWrapper}

## Response Guidelines
- Respond in a professional and structured manner
- Focus on your area of expertise as described above
- Be **complete and detailed** - documents should be comprehensive
- Use practical examples when appropriate
- Format responses with Markdown
- Use emojis to highlight important sections (📋, 🎯, 💡, ⚠️, ✅, etc.)
- Include main title (H1) and well-defined sections (H2, H3)
- When creating documents, end with \`<!-- [FIM] -->\`
- **REMEMBER**: Respect the user's language in ALL elements
- **⚠️ REGRA MAIS IMPORTANTE**: Você DEVE fazer entre 2 e 5 perguntas antes de gerar qualquer documento

${artifactInstruction}${formatReminder}

${diagramInstruction}

# 🛑🛑🛑 INSTRUÇÃO FINAL - LEIA ANTES DE RESPONDER 🛑🛑🛑

## MODO PERGUNTA (antes de ter contexto suficiente):

- UMA pergunta por resposta
- Resposta termina no "?"
- Depois do "?" não há NADA

Exemplo:
"Qual é o principal objetivo deste projeto?"

## MODO DOCUMENTO (após 2-5 perguntas):

🚨 **CRÍTICO: NENHUM TEXTO ANTES OU DEPOIS DO DOCUMENTO** 🚨

❌ ERRADO: "Aqui está o documento de discovery:" <!-- ARTIFACT_METADATA...
❌ ERRADO: "Com base nas suas respostas, gerei:" <!-- ARTIFACT_METADATA...
❌ ERRADO: <!-- ARTIFACT_METADATA... <!-- [FIM] --> "Espero que ajude!"

✅ CERTO: Sua resposta COMEÇA com <!-- ARTIFACT_METADATA e TERMINA com <!-- [FIM] -->

Sua resposta inteira quando for documento:

<!-- ARTIFACT_METADATA
{
  "type": "${effectiveArtifactType}",
  "title": "Título",
  "agent": "${normalizedName}"
}
-->

# Título

[Conteúdo completo]

<!-- [FIM] -->

`
}

/**
 * Extract artifact_type from MCP team member data
 *
 * Priority order:
 * 1. Direct artifactType field from MCP (if Cockpit returns this field)
 * 2. Extract from specialty/objective text using patterns
 * 3. Extract from instruction text using patterns (fallback for consultivo agents)
 * 4. Extract from role/description text using patterns (final fallback)
 *
 * O artifact_type é definido nas instruções do agente no Cockpit e
 * retornado pelo MCP no campo objective do team member. Alguns agentes
 * (como os "consultivos") podem ter o artifact_type apenas no campo instruction.
 *
 * Suporta formatos:
 * - artifact_type: Backlog do Produto
 * - artifact_type: PRD(Product Requirements Document)
 * - artifact_type: Documento de Discovery
 * - artifact_type: Especificação de Design
 * - artifact_type: Documento de Arquitetura
 */
function extractArtifactType(member: MCPTeamMember): string | undefined {
  // Priority 1: Direct artifactType field from MCP (if available)
  if (member.artifactType) {
    console.log(
      `[SDA2] ✅ artifact_type from MCP field: "${member.artifactType}" for agent "${member.name}"`
    )
    return member.artifactType
  }

  // Helper function to extract artifact_type from text
  const extractFromText = (
    text: string | undefined,
    source: string
  ): string | undefined => {
    if (!text) return undefined

    // Pattern 1: artifact_type: valor (captura tudo até nova linha ou fim)
    // Suporta espaços, parênteses e caracteres acentuados
    const pattern1 = /artifact_type[:\s]+([^\n]+)/i
    const match1 = text.match(pattern1)
    if (match1?.[1]) {
      // Remove aspas, crases e espaços extras do valor extraído
      const extractedType = match1[1]
        .trim()
        .replace(/^["'`]+|["'`]+$/g, '') // Remove aspas/crases no início e fim
        .trim()
      console.log(
        `[SDA2] ✅ Extracted artifact_type from ${source}: "${extractedType}" for agent "${member.name}"`
      )
      return extractedType
    }

    // Pattern 2: [artifact_type=valor] (fallback format)
    const pattern2 = /\[artifact_type[=:]([^\]]+)\]/i
    const match2 = text.match(pattern2)
    if (match2?.[1]) {
      // Remove aspas, crases e espaços extras do valor extraído
      const extractedType = match2[1]
        .trim()
        .replace(/^["'`]+|["'`]+$/g, '') // Remove aspas/crases no início e fim
        .trim()
      console.log(
        `[SDA2] ✅ Extracted artifact_type from ${source} (brackets): "${extractedType}" for agent "${member.name}"`
      )
      return extractedType
    }

    return undefined
  }

  // Priority 2: Extract from specialty/objective text
  const fromSpecialty = extractFromText(member.specialty, 'objective')
  if (fromSpecialty) return fromSpecialty

  // Priority 3: Extract from instruction text (for consultivo agents)
  const fromInstruction = extractFromText(member.instruction, 'instruction')
  if (fromInstruction) return fromInstruction

  // Priority 4: Extract from role/description text (final fallback)
  const fromRole = extractFromText(member.role, 'description')
  if (fromRole) return fromRole

  console.log(
    `[SDA2] ⚠️ No artifact_type found for agent "${member.name}" - check MCP objective, instruction, or description fields`
  )
  return undefined
}

/**
 * Extract specialties from member data
 */
function extractSpecialties(member: MCPTeamMember): string[] {
  const specialties: string[] = []

  // Extract from role
  if (member.role) {
    specialties.push(member.role.toLowerCase())
  }

  // Extract keywords from specialty
  if (member.specialty) {
    const keywords = member.specialty
      .toLowerCase()
      .split(/[,;.]/)
      .map(s => s.trim())
      .filter(s => s.length > 2)

    specialties.push(...keywords.slice(0, 5))
  }

  // Deduplicate
  return specialties.filter((v, i, a) => a.indexOf(v) === i)
}

/**
 * Extract routing keywords to help supervisor select the right agent
 * Based on agent name, artifact type, and common variations
 */
function extractRoutingKeywords(agent: DynamicAgentConfig): string[] {
  const keywords: string[] = []
  const nameLower = agent.displayName.toLowerCase()
  const artifactLower = (agent.artifactType || '').toLowerCase()

  // Keywords based on agent name patterns
  if (nameLower.includes('discovery') || nameLower.includes('analyst')) {
    keywords.push(
      'descoberta',
      'discovery',
      'briefing',
      'análise inicial',
      'entendimento do projeto'
    )
  }

  if (nameLower.includes('product') || nameLower.includes('advisory')) {
    keywords.push(
      'PRD',
      'product requirements',
      'requisitos do produto',
      'especificação de produto',
      'funcionalidades'
    )
  }

  if (nameLower.includes('tech') || nameLower.includes('architect')) {
    keywords.push(
      'arquitetura',
      'architecture',
      'design técnico',
      'tecnologias',
      'infraestrutura',
      'stack'
    )
  }

  if (nameLower.includes('ux') || nameLower.includes('design')) {
    keywords.push(
      'UX',
      'design',
      'interface',
      'UI',
      'experiência do usuário',
      'protótipo',
      'wireframe'
    )
  }

  if (nameLower.includes('backlog') || nameLower.includes('engineer')) {
    keywords.push(
      'backlog',
      'histórias',
      'stories',
      'épicos',
      'tarefas',
      'sprints',
      'user stories'
    )
  }

  // Keywords based on artifact type
  if (
    artifactLower.includes('prd') ||
    artifactLower.includes('product requirement')
  ) {
    keywords.push('PRD', 'requisitos', 'features', 'especificação')
  }

  if (
    artifactLower.includes('discovery') ||
    artifactLower.includes('descoberta')
  ) {
    keywords.push('briefing', 'discovery', 'descoberta')
  }

  if (
    artifactLower.includes('arquitetura') ||
    artifactLower.includes('architecture')
  ) {
    keywords.push('arquitetura', 'technical design', 'design técnico')
  }

  if (
    artifactLower.includes('design') ||
    artifactLower.includes('especificação de design')
  ) {
    keywords.push('UI/UX', 'design system', 'especificação visual')
  }

  if (artifactLower.includes('backlog')) {
    keywords.push('backlog', 'planning', 'planejamento')
  }

  // Deduplicate and return
  return [...new Set(keywords)]
}

// ============================================================================
// Supervisor Prompt Building
// ============================================================================

/**
 * Build supervisor system prompt from agent card
 * 100% dinâmico - usa apenas dados do MCP, zero hardcode
 */
function buildSupervisorPrompt(
  agentCard: MCPAgentCard,
  agentConfigs: DynamicAgentConfig[],
  projectContext?: {
    projectId: string
    projectName: string
    conversationId: string
  }
): string {
  // Agent card instructions (from Cockpit) already contain i18n rules at the top
  let prompt = agentCard.instructions || buildDefaultSupervisorInstructions()

  // ============================================================================
  // 🚨 CRITICAL: IMMEDIATE DELEGATION RULE
  // ============================================================================
  prompt += `

# 🚨🚨🚨 REGRA CRÍTICA - VOCÊ DEVE DELEGAR IMEDIATAMENTE 🚨🚨🚨

## ⛔ VOCÊ NÃO PODE:
1. **NÃO PODE** fazer perguntas quando o usuário pede para GERAR algo
2. **NÃO PODE** gerar documentos/briefings/PRDs diretamente
3. **NÃO PODE** perguntar "qual é o objetivo?" - o agente especialista faz isso

## ✅ VOCÊ DEVE:
Quando o usuário pedir para **GERAR** qualquer coisa:
→ **DELEGAR IMEDIATAMENTE** para o agente especialista

### 📋 Exemplos de Pedidos de Geração (DELEGAR IMEDIATAMENTE):
- "gere o briefing do projeto" → \`transfer_to_discovery_analyst_agent_sda\`
- "crie o PRD" → \`transfer_to_product_advisory_agent_sda\`
- "faça a arquitetura" → \`transfer_to_tech_advisory_agent_sda\`
- "crie o backlog" → \`transfer_to_backlog_engineer_agent_sda\`
- "faça o design" → \`transfer_to_ux_advisor_agent_sda\`

### ⚠️ NÃO FAÇA ISSO:
❌ "Qual é o objetivo principal deste projeto?" ← ERRADO, você está perguntando
❌ "Entendi, vou criar o briefing..." ← ERRADO, você está criando
❌ "Perfeito, me conte mais..." ← ERRADO, você está perguntando

### ✅ FAÇA ISSO:
✅ \`transfer_to_discovery_analyst_agent_sda\` ← CORRETO, delegou

---

`

  // Add team section - 100% dynamic from MCP data
  // Note: Text is in English. The i18n instruction from Cockpit will make the LLM
  // translate to Portuguese when the user writes in Portuguese.
  prompt += '\n\n## Available Agent Team\n'
  agentConfigs.forEach((agent, index) => {
    prompt += `${index + 1}. **${agent.displayName}**\n`
    prompt += `   - Description: ${agent.description}\n`
    if (agent.artifactType) {
      prompt += `   - **Produces artifact**: ${agent.artifactType}\n`
    }
    if (agent.specialties?.length) {
      prompt += `   - Specialties: ${agent.specialties.slice(0, 5).join(', ')}\n`
    }
    // Add routing keywords based on agent name and artifact type
    const routingKeywords = extractRoutingKeywords(agent)
    if (routingKeywords.length > 0) {
      prompt += `   - **Use for requests about**: ${routingKeywords.join(', ')}\n`
    }
    prompt += '\n'
  })

  // Critical reminder: translate agent data to user's language
  prompt += `
**IMPORTANT**: When mentioning agents in your responses, translate their descriptions, specialties, and artifact types to the user's language. For example:
- Portuguese data: "Consultor de arquitetura" → English: "architecture consultant"
- Portuguese artifact: "Documento de Arquitetura" → English: "Architecture Document"
- Portuguese artifact: "Backlog do Produto" → English: "Product Backlog"

`

  // Add handoff instructions - 100% dynamic based on MCP agents
  // Text in English - Cockpit i18n instruction will handle translation
  prompt += `
## 🎯 Your Role: Orchestrator
You are the team coordinator. Your main function is to **delegate** tasks to specialized agents.

## 🔄 Agent Behavior: ITERATIVE Consultive Approach
**IMPORTANT**: When you delegate to a specialized agent, they follow an **ITERATIVE consultive protocol**:

### How Agents Work (by design)
1. Agent asks ONE clarifying question per message
2. User responds
3. Agent asks ANOTHER single question (repeat 2-5 times total)
4. After **2-5 questions answered**, agent generates the complete document

### ⚠️ LIMITS: MINIMUM 2, MAXIMUM 5 QUESTIONS
- Agents must ask at least 2 questions before generating
- After 5 questions answered, agents MUST generate the document
- One question at a time - never multiple questions per response

### Your Role During Consultation
- **DO NOT re-delegate** while agent is asking questions
- **DO NOT interrupt** the iterative Q&A process
- **Let the agent complete** its 2-5 question rounds
- The agent knows when to generate the document

### Only Intervene If:
- User explicitly asks for a DIFFERENT agent by name
- User says "cancel", "stop", "nevermind"
- Conversation clearly moved to unrelated topic
- User asks YOU (supervisor) a direct question

## Transfer Tools
${agentConfigs.map(a => `- \`transfer_to_${a.name}\` → ${a.displayName} (produces: ${a.artifactType || a.description})`).join('\n')}

## 📋 Delegation Rules

### When to Delegate (MANDATORY)
- Any request to create documents/artifacts
- Specific technical analyses
- Creation of backlogs, PRDs, briefings, etc.

### Keywords → Correct Agent
${agentConfigs
  .map(a => {
    const keywords = extractRoutingKeywords(a)
    return `- **${keywords.slice(0, 3).join(', ')}** → use \`transfer_to_${a.name}\` (produces ${a.artifactType || 'document'})`
  })
  .join('\n')}

### Golden Rules
1. If user mentions "PRD", "product requirements" → **DON'T use Discovery**, use Product/PRD agent
2. If user mentions "discovery", "briefing", "initial analysis" → use Discovery agent
3. If user mentions "architecture", "stack", "technologies" → use Tech/Architecture agent
4. If user mentions "design", "UI", "UX", "interface" → use UX/Design agent
5. If user mentions "backlog", "stories", "epics" → use Backlog agent

## 💬 When You Can Respond Directly
- Greetings and welcomes
- Questions about process or methodology
- Clarifications about which agent to use
- Project progress summaries
- Coordination between agents
- General questions about the team

**Translation Reminder**: When responding directly (especially greetings), remember to translate ALL content to the user's language, including:
- Agent names and roles (e.g., "produto" → "product", "arquitetura" → "architecture")
- Artifact type names (e.g., "Backlog do Produto" → "Product Backlog")
- Technical terms and specialties

---

# 🛑 BACKUP: SE VOCÊ GERAR DOCUMENTO DIRETAMENTE (não deveria!)

Se por algum motivo você gerar um documento diretamente ao invés de delegar (NÃO RECOMENDADO):

## ⚠️ FORMATO OBRIGATÓRIO:

\`\`\`markdown
<!-- ARTIFACT_METADATA
{
  "type": "Documento de Discovery",
  "title": "TÍTULO DO DOCUMENTO",
  "agent": "supervisor"
}
-->

# Título do Documento

[Conteúdo aqui]

<!-- [FIM] -->
\`\`\`

**⛔ SEM ARTIFACT_METADATA = DOCUMENTO NÃO SERÁ SALVO!**

---

## ⚠️ REGRA DE FORMATAÇÃO DE PERGUNTAS

Se você fizer alguma pergunta (não deveria, deveria delegar):

1. Sua resposta deve terminar no "?"
2. NÃO escreva NADA após o "?"
3. NÃO concatene texto como "?Perfeito, vou..." 
4. NÃO duplique a pergunta (escreva uma vez só)
5. NÃO responda sua própria pergunta

### ERROS PROIBIDOS:
❌ "Qual é o objetivo?Perfeito, vou criar..." (texto após ?)
❌ "Qual é o prazo?Qual é o prazo do projeto?" (pergunta duplicada)
❌ "Tem CRM?Sim, temos via planilha" (auto-resposta)
✅ CERTO: "Qual é o objetivo?"

`

  // Add project context if available
  if (projectContext) {
    prompt += `

## 📁 Session Context
- **Project**: ${projectContext.projectName} (${projectContext.projectId})
- **Conversation**: ${projectContext.conversationId}`
  }

  return prompt
}

/**
 * Default supervisor instructions when agent card has none
 * 100% dynamic - no hardcoded agent names or roles
 */
function buildDefaultSupervisorInstructions(): string {
  // Fallback instructions in English - will be translated by LLM based on user language
  return `You are the **Avanade Code Supervisor**, responsible for orchestrating a team of specialized agents.

## 🎯 Your Role
You are the team coordinator. Your main function is:
1. Receive user requests
2. Identify which specialized agent is most suitable
3. **DELEGATE** the task to the appropriate agent using transfer_to_* tools

## 📋 How to Identify the Correct Agent
1. Read the **description** (role) of each agent in the list below
2. Read the **specialties** of each agent
3. Match the user's request with the agent's specialties
4. Use the transfer_to_[agent_name] tool to delegate

## 💡 Delegation Examples
- If user requests a discovery document → Look for agent with "discovery" or "initial analysis" in specialties
- If requesting product requirements → Look for agent with "requirements" or "product" in specialties
- If requesting architecture → Look for agent with "architecture" or "technical design" in specialties

## 💬 When You Can Respond Directly
- Greetings and welcomes to the user
- Questions about process or methodology
- Clarifications about which agent to use
- Coordination between agents

**IMPORTANT**: There is no fixed agent list. Use the agents listed in the "Available Agent Team" section.

Maintain a professional, friendly, and technical tone appropriate for business context.`
}

// ============================================================================
// Main Factory Function
// ============================================================================

/**
 * Create SDA2 Supervisor from MCP Agent Card
 *
 * Builds a complete LangGraph multi-agent supervisor dynamically
 * from the agent card data fetched from Cockpit MCP.
 *
 * @example
 * ```typescript
 * const { supervisor } = await createSDA2Supervisor({
 *   agentCard: await fetchAgentInstructions(),
 *   model: new AzureChatOpenAI({ ... }),
 *   enableMemory: true,
 *   projectContext: { projectId: '123', projectName: 'Test', conversationId: 'abc' }
 * })
 *
 * // Stream results
 * for await (const event of supervisor.stream({ messages })) {
 *   console.log(event)
 * }
 * ```
 */
export async function createSDA2Supervisor(
  options: CreateSDA2SupervisorOptions
): Promise<SDA2SupervisorResult> {
  const {
    agentCard,
    model,
    enableMemory = true,
    projectContext,
    additionalTools = [],
  } = options

  // Validate we have team members
  if (!agentCard.teamMembers?.length) {
    throw new Error(
      '[createSDA2Supervisor] Agent card has no team members. Cannot create supervisor without agents.'
    )
  }

  // =========================================================================
  // DEBUG: Log raw MCP data to prove it's coming from Cockpit
  // =========================================================================
  console.log('═'.repeat(70))
  console.log('🔍 [SDA2 Supervisor] DEBUG - RAW MCP DATA FROM COCKPIT:')
  console.log('═'.repeat(70))
  console.log('📋 Supervisor Name:', agentCard.name || '(não definido)')
  console.log(
    '📝 Supervisor Description:',
    agentCard.description || '(não definido)'
  )
  console.log(
    '📜 Instructions from MCP:',
    agentCard.instructions ? '✅ SIM' : '❌ NÃO (usará fallback)'
  )
  console.log(
    '📜 Instructions Preview:',
    agentCard.instructions?.substring(0, 100) || '(FALLBACK SERÁ USADO)'
  )
  console.log('👥 Team Members Count:', agentCard.teamMembers.length)
  console.log('─'.repeat(70))
  agentCard.teamMembers.forEach((member, i) => {
    console.log(`  [${i + 1}] 🤖 Name: "${member.name}"`)
    console.log(`      📋 Role: "${member.role}"`)
    console.log(
      `      🎯 Specialty from MCP: ${member.specialty ? '✅ SIM' : '❌ NÃO (usará template)'}`
    )
    console.log(
      `      🎯 Specialty FULL:\n${member.specialty || '(TEMPLATE SERÁ USADO)'}`
    )
    console.log(
      `      📜 Instruction from Cockpit: ${member.instruction ? `✅ SIM (${member.instruction.length} chars)` : '❌ NÃO'}`
    )
    console.log('─'.repeat(50))
  })
  console.log('═'.repeat(70))

  // 1. Convert MCP team members to agent configs
  const agentConfigs = agentCard.teamMembers.map(buildAgentConfigFromMCP)

  console.log(
    `[SDA2 Supervisor] ✅ Created ${agentConfigs.length} agents from MCP:`,
    agentConfigs.map(a => a.displayName)
  )

  // Log artifact types extracted from MCP
  console.log('[SDA2 Supervisor] 📦 Artifact Types from MCP:')
  agentConfigs.forEach(config => {
    console.log(
      `  - ${config.displayName}: artifact_type = "${config.artifactType || 'NOT DEFINED'}"`
    )
  })

  // 1.5. Extract RAG config from Knowledge agent and create RAG tool
  const ragSearchConfig = extractKnowledgeAgentConfig(agentCard.teamMembers)
  let ragSearchTool: StructuredToolInterface | null = null

  if (ragSearchConfig) {
    console.log(
      '[SDA2 Supervisor] 🔍 RAG config found from Knowledge agent - creating search tool'
    )
    ragSearchTool = createRAGSearchTool({
      searchConfig: ragSearchConfig,
      defaultTopK: 5,
      defaultFeedbackFilter: 'positive',
    })
    console.log(
      `[SDA2 Supervisor] ✅ RAG search tool created: ${ragSearchTool.name}`
    )
  } else {
    console.log(
      '[SDA2 Supervisor] ⚠️ No RAG config found - Knowledge agent will not have search capability'
    )
  }

  // 2. Create compiled React agents for each team member
  // IMPORTANTE: Cada agente precisa ter um nome único para o LangGraph rotear corretamente
  // O agente Knowledge recebe a RAG search tool se a config foi encontrada
  const compiledAgents = agentConfigs.map(config => {
    console.log(
      `[SDA2 Supervisor] Criando agente: "${config.name}" (${config.displayName})`
    )
    console.log(
      `[SDA2 Supervisor] 📜 System Prompt para ${config.name}:\n${'─'.repeat(50)}\n${config.systemPrompt}\n${'─'.repeat(50)}`
    )

    // Determinar tools para este agente
    let agentTools = config.tools || []

    // Se for o agente Knowledge e temos a RAG tool, adicionar
    if (ragSearchTool && isKnowledgeAgent(config.displayName)) {
      agentTools = [...agentTools, ragSearchTool]
      console.log(
        `[SDA2 Supervisor] 🔍 RAG search tool added to Knowledge agent: ${config.displayName}`
      )
    }

    return createReactAgent({
      llm: model,
      tools: agentTools,
      prompt: config.systemPrompt,
      name: config.name,
    })
  })

  console.log(
    `[SDA2 Supervisor] ✅ ${compiledAgents.length} agentes criados:`,
    agentConfigs.map(a => a.name)
  )

  // 3. Build supervisor system prompt
  const supervisorPrompt = buildSupervisorPrompt(
    agentCard,
    agentConfigs,
    projectContext
  )

  // 4. Create supervisor workflow
  // IMPORTANTE: NÃO passamos handoff tools customizados!
  // O createSupervisor do LangGraph cria automaticamente os tools transfer_to_[agent]
  // que fazem o roteamento real para os agentes via Command
  //
  // 🔧 FIX: outputMode foi alterado de 'full_history' para 'last_message'
  // Causa raiz da duplicação de conteúdo:
  // - Com 'full_history', quando o supervisor retoma controle após um agente,
  //   ele re-emite TODAS as mensagens do histórico do agente
  // - Isso causa duplicação quando combinado com streamMode: 'messages' no BFF
  // - Com 'last_message', apenas a resposta final do agente é incluída,
  //   eliminando 100% da duplicação sem necessidade de detecção por regex
  //
  // 🔧 FIX 2026-01-21 (v3): Adicionado addHandoffBackMessages: false
  // Isso evita que o supervisor adicione mensagens extras após o agente retornar
  const workflow = createSupervisor({
    agents: compiledAgents,
    llm: model,
    prompt: supervisorPrompt,
    // Não passar handoffTools aqui - deixar LangGraph criar automaticamente
    tools: additionalTools.length > 0 ? additionalTools : undefined,
    outputMode: 'last_message', // Elimina duplicação na raiz - só inclui última mensagem de cada agente
    addHandoffBackMessages: false, // Não adiciona mensagens de "retorno" após delegação
    supervisorName: 'supervisor', // Nome explícito para facilitar tracking
  })

  console.log(
    `[SDA2 Supervisor] ✅ Handoff tools serão criados automaticamente pelo LangGraph para:`,
    agentConfigs.map(a => `transfer_to_${a.name}`)
  )

  // 6. Compile with memory if enabled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compileOptions: any = {}

  if (enableMemory) {
    compileOptions.checkpointer = new MemorySaver()
    compileOptions.store = new InMemoryStore()
    console.log('[SDA2 Supervisor] Memory enabled with MemorySaver')
  }

  const supervisor = workflow.compile(compileOptions)

  console.log(
    `[SDA2 Supervisor] ✅ Built "${agentCard.name || 'Supervisor'}" with ${agentConfigs.length} agents`
  )

  return {
    supervisor,
    agentCount: agentConfigs.length,
    agentNames: agentConfigs.map(a => a.displayName),
    agentConfigs,
  }
}

// ============================================================================
// Helper: Create Default Model
// ============================================================================

/**
 * Create default Azure OpenAI model for SDA2
 */
export function createDefaultSDA2Model(): BaseChatModel {
  // Note: Some models (like o1) don't support temperature parameter
  // We use the default value (1) to ensure compatibility
  return new AzureChatOpenAI({
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_RESOURCE_NAME,
    azureOpenAIApiVersion:
      process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview',
    streaming: true,
  })
}
