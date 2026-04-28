# Module Manifest System

## Visão Geral

O sistema de manifestos define tudo sobre cada módulo do Cockpit Portal:

- Metadata (nome, versão, ícone, grupo)
- Controle de acesso (papéis, requisitos de onboarding)
- Passos de onboarding (documentos, quizzes)
- Feature flags
- Requisitos de MCP

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    MANIFESTOS LOCAIS                        │
│              (src/manifests/{module}/)                      │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ manifest.yaml   │  │ manifest.en-US  │  (conteúdo)      │
│  │    (pt-BR)      │  │    .yaml        │                  │
│  └─────────────────┘  └─────────────────┘                  │
│            │                   │                            │
│            └─────────┬─────────┘                            │
│                      ▼                                      │
│              Lidos no build/runtime                         │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    ARTEFATOS MCP                            │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ USER_ONBOARDING_PROGRESS_{user}_{mod}│  (progresso)     │
│  │ - stepProgress                       │                   │
│  │ - certification                      │                   │
│  └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## O que fica LOCAL vs MCP

| Local (Manifestos)      | MCP (Artefatos)                     |
| ----------------------- | ----------------------------------- |
| Definição do módulo     | Progresso do usuário                |
| Passos de onboarding    | Certificações                       |
| Quizzes e perguntas     | Configurações por License/Namespace |
| Documentação (markdown) | Overrides de acesso                 |
| Feature flags padrão    | Feature flags customizados          |

## Estrutura de Arquivos

```
src/manifests/
├── {module-id}/
│   ├── manifest.yaml         # Manifest principal (pt-BR)
│   ├── manifest.en-US.yaml   # Tradução inglês
│   └── docs/
│       ├── 01-introducao.md  # Conteúdo markdown
│       └── 02-fluxo.md
```

## Schema do Manifest

```yaml
$schema: "cockpit://manifest/v1"

# Metadata do módulo
module:
  id: string              # ID único (e.g., 'migration')
  version: string         # Semver (e.g., '1.0.0')
  name: string            # Nome de exibição
  description: string     # Descrição curta
  icon: string            # Nome do ícone Lucide
  group: string           # 'setup' | 'operations' | 'communication' | 'admin'

# Controle de acesso
access:
  defaultRoles:           # Papéis com acesso por padrão
    - globaladmin
    - admin
  requiresOnboarding: boolean
  requiresCertification: boolean
  certificationValidityDays: number  # 0 = nunca expira

# Configuração de onboarding (opcional)
onboarding:
  title: string
  description: string
  certificationTitle: string
  estimatedTotalMinutes: number
  steps:
    - id: string
      type: 'document' | 'quiz' | 'acknowledgment' | 'video' | 'interactive'
      title: string
      description: string
      required: boolean
      estimatedMinutes: number
      # Campos específicos por tipo...

# Feature flags
features:
  - id: string
    name: string
    description: string
    default: boolean
    requiresRoles: string[]

# Requisitos MCP
mcp:
  requiredServers: string[]
  optionalServers: string[]
  requiredTools: string[]
```

## Internacionalização (i18n)

O manifest principal (`manifest.yaml`) contém o conteúdo em pt-BR (padrão).

Arquivos de locale (`manifest.{locale}.yaml`) contêm apenas strings traduzíveis:

```yaml
# manifest.en-US.yaml
locale: en-US

name: 'Migration'
description: 'Complete migration module...'

onboarding:
  title: 'Migration Training'
  steps:
    - id: step-intro
      title: 'Introduction'
      description: 'Learn about...'
```

## Módulos Disponíveis

| ID              | Nome                      | Grupo         | Requer Onboarding |
| --------------- | ------------------------- | ------------- | ----------------- |
| environments    | Ambientes                 | setup         | ❌                |
| connections     | Conexões                  | setup         | ❌                |
| migration       | Migração                  | operations    | ✅ (certificação) |
| migrationWizard | Assistente de Migração    | operations    | ✅ (certificação) |
| upstream        | Upstream                  | operations    | ✅                |
| downstream      | Downstream                | operations    | ❌                |
| feedbackHub     | Central de Feedbacks      | operations    | ✅                |
| messages        | Mensagens                 | communication | ❌                |
| onboarding      | Onboarding & Certificação | admin         | ❌                |
| moduleConfig    | Configuração de Módulos   | admin         | ✅ (certificação) |

## Uso no Código

```typescript
import type { ModuleManifest } from '@/shared/manifest'

// Os manifestos são carregados estaticamente
// O progresso/certificação vem dos artefatos MCP

// Hook para carregar progresso do usuário
const { progress, isCertified } = useUserOnboarding(
  connection,
  moduleId,
  userId,
  userEmail
)
```
