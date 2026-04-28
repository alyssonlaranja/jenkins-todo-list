# GitFlow - AvanadeSDA-Cockpit

## Visão Geral

O repositório **AvanadeSDA-Cockpit** segue um modelo de branching baseado em GitFlow adaptado, com deploy automatizado via **GitHub Actions** para **Azure Container Apps (ACA)**. O pipeline CI/CD é definido no workflow `ci-cd-aca-o2m.yaml`.

---

## Branches

| Branch | Propósito | Deploy Automático | Ambiente |
|--------|-----------|:-----------------:|----------|
| `main` | Código estável em produção (mirror) | Não | — |
| `develop` | Integração contínua de features | Sim | **Development** |
| `release/vX.Y.Z` | Preparação de release (ex: `release/v1.2.0`) | Sim | **Staging → Production** |
| `hotfix/*` | Correções críticas em produção | Sim | **Production** (direto) |
| `feature/*` | Desenvolvimento de funcionalidades | Não | — |
| `bugfix/*` | Correções de bugs não-críticos | Não | — |

---

## Fluxo Visual

```
main ─────────────────────────────────────────────────────────
      ↑                                               ↑
      │ merge (fast-forward após release)             │
      │                                               │
release/v1.2.0 ────► Build ──► Staging ──► Production ┘
      ↑                             ✅ GitHub Release criada
      │                             ✅ Mirror para main
      │ PR (merge)
      │
develop ──────────► Build ──► Development (Container Apps)
      ↑                        ❌ Sem release
      │ PR (merge)
      │
feature/minha-feature
bugfix/correcao-xyz
```

---

## Ambientes e Configuração

| Ambiente | Config File | Resource Group | Trigger |
|----------|-------------|----------------|---------|
| **Development** | `infrastructure/config/env/dev.json` | `rg-sda-dev` | Push em `develop` |
| **Staging** | `infrastructure/config/env/stg.json` | `rg-sda-stg` | PR merged em `release/v*` |
| **Production** | `infrastructure/config/env/prd.json` | `rg-cockpit-br-prd` | Sucesso do staging |

### Infraestrutura
- **Container Registry:** Azure Container Registry (`o2mavanadecr`)
- **Runtime:** Azure Container Apps
- **Deploy Script:** `infrastructure/scripts/deploy-container-app.sh`

---

## Pipeline CI/CD - Stages e Dependências

### Fluxo de Jobs

```
┌──────────────────┐
│ validate-inputs  │ Validação de inputs, formato de branch
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ quality-and-build    │ Quality gates, build Docker, push ACR
└────────┬─────────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼ (is_release == false)                ▼ (is_release == true)
┌────────────────────┐              ┌──────────────────┐
│ deploy-development │              │  deploy-staging   │
│ (develop branch)   │              │ (release branch)  │
└────────────────────┘              └────────┬─────────┘
                                             │ ✅ Aprovação manual
                                             ▼
                                    ┌──────────────────┐
                                    │ deploy-production │
                                    │ (needs staging)   │
                                    └────────┬─────────┘
                                             │ ✅ Aprovação manual
                                             ▼
                                    ┌──────────────────────────┐
                                    │ release                   │
                                    │ (tag, GitHub Release,     │
                                    │  mirror to main)          │
                                    └──────────────────────────┘
```

### Detalhes dos Stages

| Stage | Depende de | Condição | Aprovação Manual | Ambiente GitHub |
|-------|-----------|----------|:----------------:|-----------------|
| **validate-inputs** | — | Sempre | Não | — |
| **quality-and-build** | `validate-inputs` | Push, workflow_dispatch, ou PR merged | Não | — |
| **deploy-development** | `quality-and-build` ✅ | `is_release == false` (branch `develop`) | Não | `development` |
| **deploy-staging** | `quality-and-build` ✅ | `is_release == true` (branch `release/v*`) | **Sim** ¹ | `staging` |
| **deploy-production** | `deploy-staging` ✅ | `deploy-staging` com sucesso | **Sim** ¹ | `production` |
| **release** | `deploy-production` ✅ | `deploy-production` com sucesso | Não | — |

> ¹ Aprovações manuais são configuradas via **GitHub Environment Protection Rules** nos ambientes `staging` e `production`.

---

## Pull Requests e Aprovadores

### CODEOWNERS

O arquivo `.github/CODEOWNERS` define os aprovadores automáticos de PR:

```
# Default owners para todo o repositório
* @ava-group-brazilcopilotpro/sda-approvers
```

**Todos os PRs** requerem review do grupo **`sda-approvers`** antes do merge.

### Regras de PR por Branch

| PR Destino | Origem Esperada | Revisores | Observação |
|------------|-----------------|-----------|------------|
| `develop` | `feature/*`, `bugfix/*` | `sda-approvers` | Code review obrigatório |
| `release/vX.Y.Z` | `develop` | `sda-approvers` | Inicia fluxo de staging → production |
| `main` | `release/vX.Y.Z` | Automático (bot) | Merge automático via pipeline (mirror) |

### Fluxo de Aprovação

1. **Feature/Bugfix → develop**: Developer abre PR, `sda-approvers` revisa e aprova
2. **develop → release/vX.Y.Z**: PR merged dispara build + deploy staging
3. **Staging → Production**: Requer aprovação no GitHub Environment `staging`, depois `production`
4. **release → main**: Mirror automático via `git merge --ff-only` pelo pipeline

---

## Processo Completo por Cenário

### 1. Desenvolvimento Normal (Feature)

```
1. git checkout -b feature/nova-funcionalidade develop
2. Desenvolve e commita
3. Abre PR: feature/nova-funcionalidade → develop
4. Review por sda-approvers
5. Merge → Push em develop → Build → Deploy em DEV (automático)
```

### 2. Release (Staging + Production)

```
1. Cria branch release/v1.2.0 a partir de develop
2. Abre PR: develop → release/v1.2.0 (ou push direto)
3. PR merged em release/v* dispara pipeline:
   a. Build + push imagem (tag: YYYYMMDD.buildnumber + v1.2.0 + latest)
   b. Deploy em Staging → Aguarda aprovação no environment
   c. Deploy em Production → Aguarda aprovação no environment
   d. Cria git tag v1.2.0
   e. Cria GitHub Release com changelog
   f. Mirror: merge release/v1.2.0 → main (fast-forward)
```

### 3. Hotfix (Correção Crítica)

```
1. git checkout -b hotfix/critical-fix main
2. Corrige o problema
3. Deploy direto em Production (via pipeline)
4. Hotfix Release é criada automaticamente
```

---

## Versionamento

| Tipo | Formato de Tag | Exemplo | Origem |
|------|---------------|---------|--------|
| Release | Extraído do nome da branch | `v1.2.0` | `release/v1.2.0` |
| Hotfix | Patch increment | `v1.2.1` | `hotfix/critical-fix` |
| Dev build | Data + build number | `20260306.42` | `develop` |

### Tags Docker

| Ambiente | Tags da Imagem |
|----------|---------------|
| Development | `YYYYMMDD.<build_number>` |
| Staging/Production | `YYYYMMDD.<build_number>`, `vX.Y.Z`, `latest` |

---

## Resumo de Dependências entre Stages

```
                    ┌─── DEV (automático, sem gate)
                    │
validate → build ──┤
                    │
                    └─── STG (aprovação) → PRD (aprovação) → Release + Mirror main
```

| De | Para | Requer Sucesso? | Requer Aprovação? |
|----|------|:---------------:|:-----------------:|
| `validate-inputs` | `quality-and-build` | Sim | Não |
| `quality-and-build` | `deploy-development` | Sim | Não |
| `quality-and-build` | `deploy-staging` | Sim | **Sim** (environment gate) |
| `deploy-staging` | `deploy-production` | Sim | **Sim** (environment gate) |
| `deploy-production` | `release` | Sim | Não |

---

## Concorrência

```yaml
concurrency:
  group: deploy-${{ github.ref_name }}
  cancel-in-progress: false
```

- Deploys na **mesma branch** são serializados (não cancelam em progresso)
- Branches diferentes rodam em paralelo

---

## Referências

- Workflow: `.github/workflows/ci-cd-aca-o2m.yaml`
- CODEOWNERS: `.github/CODEOWNERS`
- Config de ambientes: `infrastructure/config/env/`
- Script de deploy: `infrastructure/scripts/deploy-container-app.sh`
