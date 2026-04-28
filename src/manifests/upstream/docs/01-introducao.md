# O que é Upstream?

## Conceito

O módulo **Upstream** é a plataforma de descoberta e validação de **Macroiniciativas de Negócio** usando o **BV Framework**:

- 🎯 **Macroiniciativas**: Grandes iniciativas estratégicas de negócio
- 🔬 **Hipóteses**: Proposições a serem validadas com evidências
- 📊 **Business Epics**: Épicos prontos para transição ao Downstream
- 📚 **Knowledge Base**: Documentos e insights para fundamentar decisões

## Por que "Upstream"?

O nome vem do conceito de fluxo de desenvolvimento de produto:

```
UPSTREAM (descoberta)  →  DOWNSTREAM (execução)
     ↓                       ↓
  Validar hipóteses      Executar sprints
  Explorar soluções      Desenvolver features
  Priorizar valor        Entregar incrementos
```

## BV Framework - 7 Etapas

O Upstream segue o **BV Framework** com 7 etapas estruturadas:

### 1. Ideação (Epic-level)

- Definição da Macroiniciativa
- Alinhamento com OKRs estratégicos
- Estimativa inicial de valor de negócio

### 2. Imersão (Por Hipótese)

- Matriz CSD (Certezas, Suposições, Dúvidas)
- Mapeamento de Stakeholders
- Identificação de fontes de dados

### 3. Validação (Por Hipótese)

- Coleta de evidências qualitativas/quantitativas
- Validação ou rejeição de hipóteses
- Decisão de pivôt se necessário

### 4. Exploração (Epic-level)

- Design da solução consolidada
- Fluxo de negócio e jornada do usuário
- Testes de usabilidade

### 5. Análise (Epic-level)

- Blueprint de arquitetura
- Análise de impacto e gaps
- Planos de mitigação de riscos

### 6. Priorização (Epic-level)

- Refinamento de valor de negócio
- Estimativa de esforço
- Preparação para QBR

### 7. Transição (Epic-level)

- Geração de Business Epics (1:N)
- Features com priorização MoSCoW
- Documento de handoff para Downstream

## Funcionalidades Principais

### 1. Wizard de 7 Etapas

Interface guiada que leva você por todas as etapas do BV Framework:

- Navegação por sidebar com progresso visual
- Auto-save automático
- Versionamento de artifacts

### 2. Gestão de Hipóteses

Cada Macroiniciativa pode ter múltiplas hipóteses:

- Ownership individual por hipótese
- Etapas 2 e 3 são executadas POR HIPÓTESE
- Rastreamento de evidências e validação

### 3. Knowledge Base Integrada

Sistema de slots tipados para documentos:

- Market Insights
- Financial Analysis
- Technical Documentation
- Upload com extração de embeddings

### 4. Assistente IA (Copilot)

Copilot integrado que ajuda em todas as etapas:

- Sugestão de hipóteses
- Validação de evidências
- Geração de features
- Rascunho de handoff

### 5. Armazenamento em Artifacts

Todos os dados são armazenados como artifacts versionados:

- `UPSTREAM_EPIC_{id}` - Macroiniciativas
- `UPSTREAM_FEATURE_{epicId}_{featureId}` - Features
- `UPSTREAM_STORY_{featureId}_{storyId}` - User Stories
- Soft delete e versionamento automático

## Próximos Passos

Continue para:

- **02-bv-framework.md**: Entenda cada etapa do framework em detalhes
- **03-wizard.md**: Aprenda a usar o wizard de criação
- **04-copilot.md**: Descubra como o Copilot pode ajudá-lo
