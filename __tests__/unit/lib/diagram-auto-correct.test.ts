/**
 * Tests for diagram type auto-correction logic AND Mermaid code sanitization
 * in the /api/diagram route.
 *
 * Validates:
 *   1. Type mismatch auto-correction (e.g. type="bpmn" but code is Mermaid)
 *   2. Multiple diagram declarations in one block → keeps only first
 *   3. Literal \n in node labels → replaced with <br/>
 *   4. Unquoted parentheses in [] labels → auto-quoted
 */

import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// We replicate the auto-correction logic here to unit-test it in isolation,
// since the Next.js route handler requires request/response infrastructure.
// ---------------------------------------------------------------------------

const MERMAID_SYNTAX_RE =
  /^\s*(flowchart|graph)\s+(TD|TB|BT|RL|LR)\b|^\s*(sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph|C4Context|C4Container|C4Component|C4Deployment|requirementDiagram|block-beta|sankey-beta|xychart-beta|quadrantChart|zenuml)\b/m

/**
 * Simulates the auto-correction logic from /api/diagram route.ts
 * Returns the resolved diagram type after auto-corrections.
 */
function autoCorrectDiagramType(
  declaredType: string,
  code: string
): { resolvedType: string; rejected?: string } {
  let resolvedType = declaredType.toLowerCase().trim()

  // Check 1: PlantUML BPMN macros → reject
  if (
    (resolvedType === 'bpmn' || resolvedType === 'plantuml') &&
    (code.includes('!include <bpmn>') || code.includes('!include <BPMN>'))
  ) {
    return { resolvedType, rejected: 'unsupported_syntax' }
  }

  // Check 2: bpmn with PlantUML markers → plantuml
  if (
    resolvedType === 'bpmn' &&
    (code.includes('@startuml') || code.includes('@enduml'))
  ) {
    resolvedType = 'plantuml'
  }

  // Check 3: ANY non-mermaid type with Mermaid syntax → mermaid
  if (
    resolvedType !== 'mermaid' &&
    !code.includes('@startuml') &&
    !code.includes('@startmindmap') &&
    !code.includes('<definitions') &&
    !code.includes('<bpmn:definitions') &&
    MERMAID_SYNTAX_RE.test(code)
  ) {
    resolvedType = 'mermaid'
  }

  return { resolvedType }
}

// ---------------------------------------------------------------------------
// Mermaid code sanitization — mirrors sanitizeMermaidCode from route.ts
// ---------------------------------------------------------------------------

const MERMAID_DIAGRAM_START_RE =
  /^\s*(flowchart|graph)\s+(TD|TB|BT|RL|LR)\b|^\s*(sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph|C4Context|C4Container|C4Component|C4Deployment|requirementDiagram|block-beta|sankey-beta|xychart-beta|quadrantChart|zenuml)\b/

function sanitizeMermaidCode(code: string): string {
  let sanitized = code.trim()

  // 1. Split multiple diagram declarations — keep only the first one.
  const lines = sanitized.split('\n')
  let firstDiagramStartIdx = -1

  for (let i = 0; i < lines.length; i++) {
    if (MERMAID_DIAGRAM_START_RE.test(lines[i]!)) {
      if (firstDiagramStartIdx === -1) {
        firstDiagramStartIdx = i
      } else {
        sanitized = lines.slice(firstDiagramStartIdx, i).join('\n').trimEnd()
        break
      }
    }
  }

  // 2. GLOBAL: Replace all literal \n with <br/>.
  sanitized = sanitized.replace(/\\n/g, '<br/>')

  // 3. Fix square-bracket node labels that contain special characters.
  sanitized = sanitized.replace(
    /(\b\w+)\[([^\]]+)\]/g,
    (_match, nodeId: string, label: string) => {
      if (label.startsWith('"') && label.endsWith('"')) {
        return `${nodeId}[${label}]`
      }

      const hasParentheses = /[()]/.test(label)
      const hasDoubleQuotes = /"/.test(label)

      if (hasParentheses || hasDoubleQuotes) {
        const cleaned = label.replace(/"/g, "'")
        return `${nodeId}["${cleaned}"]`
      }

      return `${nodeId}[${label}]`
    }
  )

  return sanitized
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Diagram type auto-correction', () => {
  describe('BPMN type with Mermaid syntax', () => {
    it('should auto-correct bpmn → mermaid when code is flowchart TD', () => {
      const code = `flowchart TD
    A[Start] --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[End]
    C -->|No| B`

      const result = autoCorrectDiagramType('bpmn', code)
      expect(result.resolvedType).toBe('mermaid')
    })

    it('should auto-correct bpmn → mermaid when code is graph LR', () => {
      const code = `graph LR
    Start --> Process1
    Process1 --> Gateway{Decision}
    Gateway -->|Approved| Task1
    Gateway -->|Rejected| Task2`

      const result = autoCorrectDiagramType('bpmn', code)
      expect(result.resolvedType).toBe('mermaid')
    })

    it('should auto-correct bpmn → mermaid for sequenceDiagram', () => {
      const code = `sequenceDiagram
    participant User
    participant System
    User->>System: Request
    System-->>User: Response`

      const result = autoCorrectDiagramType('bpmn', code)
      expect(result.resolvedType).toBe('mermaid')
    })

    it('should NOT auto-correct bpmn when code is genuine BPMN XML', () => {
      const code = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="process_1" isExecutable="false">
    <startEvent id="start"/>
    <task id="task1" name="Do something"/>
    <endEvent id="end"/>
  </process>
</definitions>`

      const result = autoCorrectDiagramType('bpmn', code)
      expect(result.resolvedType).toBe('bpmn')
    })

    it('should NOT auto-correct bpmn when code is prefixed BPMN XML', () => {
      const code = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="process_1">
    <bpmn:startEvent id="start"/>
  </bpmn:process>
</bpmn:definitions>`

      const result = autoCorrectDiagramType('bpmn', code)
      expect(result.resolvedType).toBe('bpmn')
    })
  })

  describe('Other types with Mermaid syntax', () => {
    it('should auto-correct erd → mermaid when code is erDiagram', () => {
      const code = `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains`

      const result = autoCorrectDiagramType('erd', code)
      expect(result.resolvedType).toBe('mermaid')
    })

    it('should auto-correct sequence → mermaid when code is sequenceDiagram', () => {
      const code = `sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob-->>Alice: Hi Alice`

      const result = autoCorrectDiagramType('sequence', code)
      expect(result.resolvedType).toBe('mermaid')
    })

    it('should auto-correct class → mermaid when code is classDiagram', () => {
      const code = `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish`

      const result = autoCorrectDiagramType('class', code)
      expect(result.resolvedType).toBe('mermaid')
    })

    it('should auto-correct state → mermaid when code is stateDiagram-v2', () => {
      const code = `stateDiagram-v2
    [*] --> Active
    Active --> Inactive`

      const result = autoCorrectDiagramType('state', code)
      expect(result.resolvedType).toBe('mermaid')
    })

    it('should auto-correct plantuml → mermaid when code is gantt', () => {
      const code = `gantt
    title A Gantt Diagram
    section Section
    A task : a1, 2024-01-01, 30d`

      const result = autoCorrectDiagramType('plantuml', code)
      expect(result.resolvedType).toBe('mermaid')
    })

    it('should auto-correct d2 → mermaid when code is pie chart', () => {
      const code = `pie
    title Key elements in Product X
    "Calcium" : 42.96
    "Potassium" : 50.05`

      const result = autoCorrectDiagramType('d2', code)
      expect(result.resolvedType).toBe('mermaid')
    })

    it('should auto-correct activity → mermaid when code is journey', () => {
      const code = `journey
    title My working day
    section Go to work
      Make tea: 5: Me`

      const result = autoCorrectDiagramType('activity', code)
      expect(result.resolvedType).toBe('mermaid')
    })
  })

  describe('Correct types should NOT be changed', () => {
    it('should keep mermaid as mermaid', () => {
      const code = `flowchart TD
    A --> B`

      const result = autoCorrectDiagramType('mermaid', code)
      expect(result.resolvedType).toBe('mermaid')
    })

    it('should keep plantuml with @startuml as plantuml', () => {
      const code = `@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
@enduml`

      const result = autoCorrectDiagramType('plantuml', code)
      expect(result.resolvedType).toBe('plantuml')
    })

    it('should keep d2 with valid d2 syntax as d2', () => {
      const code = `x -> y: hello
y -> z: world`

      const result = autoCorrectDiagramType('d2', code)
      expect(result.resolvedType).toBe('d2')
    })
  })

  describe('BPMN-specific rejections', () => {
    it('should reject bpmn with PlantUML BPMN macros', () => {
      const code = `@startuml
!include <bpmn>
POOL("Main Process")
LANE("Lane 1")
TASK("Do something")
@enduml`

      const result = autoCorrectDiagramType('bpmn', code)
      expect(result.rejected).toBe('unsupported_syntax')
    })

    it('should reject plantuml with BPMN macros', () => {
      const code = `@startuml
!include <BPMN>
POOL("Main Process")
@enduml`

      const result = autoCorrectDiagramType('plantuml', code)
      expect(result.rejected).toBe('unsupported_syntax')
    })
  })

  describe('BPMN with PlantUML markers (non-macro)', () => {
    it('should reroute bpmn + @startuml to plantuml', () => {
      const code = `@startuml
start
:Step 1;
:Step 2;
stop
@enduml`

      const result = autoCorrectDiagramType('bpmn', code)
      expect(result.resolvedType).toBe('plantuml')
    })
  })
})

// ===========================================================================
// sanitizeMermaidCode tests
// ===========================================================================

describe('Mermaid code sanitization', () => {
  describe('Multiple diagram declarations in one block', () => {
    it('should keep only the first flowchart when two are present', () => {
      const code = `flowchart TD
    A[Start] --> B[Process]
    B --> C[End]

    flowchart LR
    subgraph U[Journey]
        D --> E
    end`

      const result = sanitizeMermaidCode(code)
      expect(result).toContain('flowchart TD')
      expect(result).not.toContain('flowchart LR')
      expect(result).toContain('A[Start]')
      expect(result).not.toContain('subgraph U')
    })

    it('should keep only the first when flowchart + sequenceDiagram are combined', () => {
      const code = `flowchart TD
    A --> B
sequenceDiagram
    Alice->>Bob: Hello`

      const result = sanitizeMermaidCode(code)
      expect(result).toContain('flowchart TD')
      expect(result).not.toContain('sequenceDiagram')
    })

    it('should not modify a single diagram declaration', () => {
      const code = `flowchart TD
    A[Start] --> B[End]`

      const result = sanitizeMermaidCode(code)
      expect(result).toBe(code)
    })
  })

  describe('Global \\n replacement', () => {
    it('should replace \\n with <br/> inside [] node labels', () => {
      const code = `flowchart TD
    R --> S[Formalização de contrato e pagamento final\\n(realizado fora do MVP)]`

      const result = sanitizeMermaidCode(code)
      expect(result).toContain('<br/>')
      expect(result).not.toContain('\\n')
    })

    it('should replace \\n with <br/> inside {} decision labels', () => {
      const code = `flowchart TD
    G{Score >= limiar de\\nAlta Qualidade?}`

      const result = sanitizeMermaidCode(code)
      expect(result).toContain('G{Score >= limiar de<br/>Alta Qualidade?}')
      expect(result).not.toContain('\\n')
    })

    it('should replace \\n with <br/> inside () node labels', () => {
      const code = `flowchart TD
    A(Step one\\nstep two) --> B[End]`

      const result = sanitizeMermaidCode(code)
      expect(result).toContain('A(Step one<br/>step two)')
    })

    it('should replace ALL \\n occurrences in a single label', () => {
      const code = `flowchart TD
    A[Line1\\nLine2\\nLine3] --> B[End]`

      const result = sanitizeMermaidCode(code)
      expect(result).toContain('A[Line1<br/>Line2<br/>Line3]')
      expect(result).not.toContain('\\n')
    })

    it('should replace \\n across multiple labels in same code', () => {
      const code = `flowchart TD
    A[Hello\\nWorld] --> B{Check\\nStatus?}
    B --> C[Done\\nOK]`

      const result = sanitizeMermaidCode(code)
      expect(result).not.toContain('\\n')
      expect(result).toContain('A[Hello<br/>World]')
      expect(result).toContain('B{Check<br/>Status?}')
      expect(result).toContain('C[Done<br/>OK]')
    })
  })

  describe('Parentheses quoting in [] labels', () => {
    it('should quote labels containing parentheses', () => {
      const code = `flowchart TD
    I[Contact (chat/phone)] --> J[Next]`

      const result = sanitizeMermaidCode(code)
      expect(result).toContain('I["Contact (chat/phone)"]')
    })

    it('should not double-quote already quoted labels', () => {
      const code = `flowchart TD
    I["Contact (chat/phone)"] --> J[Next]`

      const result = sanitizeMermaidCode(code)
      expect(result).not.toMatch(/\[""/)
      expect(result).toContain('I["Contact (chat/phone)"]')
    })

    it('should not quote labels without special characters', () => {
      const code = `flowchart TD
    A[Simple label] --> B[Another label]`

      const result = sanitizeMermaidCode(code)
      expect(result).toBe(code)
    })
  })

  describe('Double quotes inside [] labels', () => {
    it('should convert inner double quotes to single quotes and wrap in outer quotes', () => {
      const code = `flowchart TD
    D[Clica em "Conversar" ou "Agendar"]`

      const result = sanitizeMermaidCode(code)
      expect(result).toContain(`D["Clica em 'Conversar' ou 'Agendar'"]`)
    })

    it('should handle labels with both \\n, quotes, and parentheses', () => {
      const code = `flowchart TD
    H[Lead entra como\\n"Lead Moderado" no CRM]`

      const result = sanitizeMermaidCode(code)
      // \n → <br/>, " → ', then wrap in ""
      expect(result).toContain(
        `H["Lead entra como<br/>'Lead Moderado' no CRM"]`
      )
    })
  })

  describe('Combined real-world AI output (exact reproduction of user bug)', () => {
    it('should sanitize the exact code from the first user report (multi-diagram)', () => {
      const code = `flowchart TD
    A[Início] --> B[Comprador acessa plataforma]
    B --> C[Busca e filtra carros de luxo]
    R --> S[Formalização de contrato e pagamento final\\n(realizado fora do MVP)]
    S --> T[Fim – Venda concluída]

    flowchart LR
    subgraph U[Journey do Comprador - To Be]
        A[Descobre a plataforma<br/>via anúncio ou indicação] --> B[Acessa homepage]
    end`

      const result = sanitizeMermaidCode(code)

      expect(result).toContain('flowchart TD')
      expect(result).not.toContain('flowchart LR')
      expect(result).not.toContain('\\n')
      expect(result).toContain('<br/>')
      expect(result).toContain(
        `S["Formalização de contrato e pagamento final<br/>(realizado fora do MVP)"]`
      )
    })

    it('should sanitize the exact code from the second user report (TO-BE flow)', () => {
      const code = `flowchart TD
    %% TO-BE Visual Flow
    A([Início]) --> B[Usuário acessa plataforma\\nde carros de luxo]
    B --> C[Explora catálogo\\n(elege 1 ou mais veículos de interesse)]
    C --> D[Usuário clica em\\n"Quero conversar" ou "Agendar visita"]
    D --> E[Preenche formulário premium\\n(dados + perfil financeiro + interesse)]
    E --> F[Sistema calcula score do lead\\ncom base nas respostas]
    F --> G{Score >= limiar de\\nAlta Qualidade?}
    G -- "Não (Baixo/Moderado)" --> H[Lead entra como\\n"Lead Moderado" no CRM]
    H --> I[Atendimento em fila secundária\\n(prioridade menor / contato futuro)]
    I --> J([Fim - Lead em nutrição])
    G -- "Sim (Lead Qualificado)" --> K[Lead entra como\\n"Alta Prioridade" no CRM]
    K --> L[Vendedor recebe notificação\\n(completo com dados e interesses)]
    L --> M[Vendedor sugere horários\\npara atendimento consultivo]
    M --> N[Cliente confirma dia e hora\\npara visita ou videochamada]
    N --> O[Atendimento consultivo\\n(apresentação personalizada)]
    O --> P{Cliente interessado em\\nproposta formal?}
    P -- "Não" --> Q[Registrar motivo e\\nclassificar como "Não agora"]
    Q --> R([Fim - Lead encerrado ou em acompanhamento])
    P -- "Sim" --> S[Elaboração e envio da proposta\\n(valores, condições, opções)]
    S --> T{Proposta aceita?}
    T -- "Não" --> U[Follow-up estruturado\\n(com lembretes e histórico)]
    U --> R
    T -- "Sim" --> V[Processo de venda formal:\\ncontrato, documentação, pagamento]
    V --> W[Entrega do veículo\\n(agendada com experiência premium)]
    W --> X[Coleta de feedback/NPS\\nda experiência digital + atendimento]
    X --> Y([Fim - Venda concluída + feedback])`

      const result = sanitizeMermaidCode(code)

      // No literal \n should remain
      expect(result).not.toContain('\\n')

      // All \n should have been converted to <br/>
      expect(result).toContain('<br/>')

      // {} labels should have <br/> not \n
      expect(result).toContain('G{Score >= limiar de<br/>Alta Qualidade?}')
      expect(result).toContain('P{Cliente interessado em<br/>proposta formal?}')

      // [] labels with parentheses should be quoted
      expect(result).toContain(
        `C["Explora catálogo<br/>(elege 1 ou mais veículos de interesse)"]`
      )
      expect(result).toContain(
        `E["Preenche formulário premium<br/>(dados + perfil financeiro + interesse)"]`
      )

      // [] labels with inner quotes should have " → ' and be quoted
      expect(result).toContain(
        `D["Usuário clica em<br/>'Quero conversar' ou 'Agendar visita'"]`
      )
      expect(result).toContain(
        `H["Lead entra como<br/>'Lead Moderado' no CRM"]`
      )
      expect(result).toContain(
        `K["Lead entra como<br/>'Alta Prioridade' no CRM"]`
      )
      expect(result).toContain(
        `Q["Registrar motivo e<br/>classificar como 'Não agora'"]`
      )

      // Simple labels without special chars should NOT be quoted
      expect(result).toContain(
        'B[Usuário acessa plataforma<br/>de carros de luxo]'
      )
      expect(result).toContain(
        'F[Sistema calcula score do lead<br/>com base nas respostas]'
      )

      // Stadium-shaped nodes ([...]) should not be broken
      expect(result).toContain('A([Início])')

      // Only one diagram declaration
      const flowchartCount = (result.match(/^flowchart\s/gm) || []).length
      expect(flowchartCount).toBe(1)
    })
  })
})
