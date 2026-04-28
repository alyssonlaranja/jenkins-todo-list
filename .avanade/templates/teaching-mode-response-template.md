## 🎓 Formato de Resposta em Teaching Mode

Quando detectar **GitHub Copilot Mode**, retorne no seguinte formato estruturado:

```markdown
# Avanade Method: [Nome da Tarefa]

## 📦 Artifacts Necessários

Liste todos os artifacts que GitHub Copilot precisará buscar:

- **Template Principal**: `AVANADE_[NOME]_TEMPLATE_YAML`
  - Buscar via: `get_artifact({key_pattern: "AVANADE_[NOME]_TEMPLATE_YAML"})`
  
- **Checklist de Qualidade**: `AVANADE_[NOME]_CHECKLIST_MD`
  - Buscar via: `get_artifact({key_pattern: "AVANADE_[NOME]_CHECKLIST_MD"})`

- **[Outros artifacts relevantes]**

---

## 📋 Passos Metodológicos Avanade

Detalhe o processo passo a passo seguindo Avanade Method:

### Passo 1: [Nome do Passo]
**Objetivo:** [O que deve ser alcançado]

**Ações:**
- [Ação específica 1]
- [Ação específica 2]

**Metodologia Avanade:**
- [Princípio ou padrão aplicado]

---

### Passo 2: [Nome do Passo]
[Mesmo formato do passo 1]

---

## 🔧 Operações para GitHub Copilot Executar

Forneça instruções técnicas precisas:

### 1. Obter Templates e Referencias
```javascript
// Buscar template principal
const template = await get_artifact({
  key_pattern: "AVANADE_[NOME]_TEMPLATE_YAML"
});

// Buscar checklist de validação
const checklist = await get_artifact({
  key_pattern: "AVANADE_[NOME]_CHECKLIST_MD"
});
```

### 2. [Processar/Conduzir/Executar Etapa]
[Instruções específicas do que fazer com os artifacts]

### 3. Criar Arquivo Local
```javascript
await create_file({
  filePath: "docs/[nome-arquivo].md",
  content: [conteúdo processado seguindo template]
});
```

### 4. Sincronizar Azure DevOps (se aplicável)
```javascript
await mcp_azuredevops_create_wiki_page({
  organization: "[org]",
  project: "[project]",
  path: "/[caminho]",
  content: [conteúdo]
});
```

### 5. Persistir Conhecimento Customizado
```javascript
await create_artifact({
  key: "PROJECT_[NOME_PROJETO]_[TIPO_DOC]_CUSTOMIZED",
  value: [versão customizada do documento],
  description: "[Descrição do artifact customizado]",
  accessibility: "Namespace",
  secret: false
});
```

---

## ✅ Validação Avanade Method

Checklist de qualidade que GitHub Copilot deve verificar:

- [ ] [Critério de qualidade 1]
- [ ] [Critério de qualidade 2]
- [ ] [Critério de qualidade 3]
- [ ] Todos os campos obrigatórios preenchidos
- [ ] Formato segue padrão Avanade
- [ ] Documentação clara e completa

---

## 🎯 Resultado Esperado

**Deliverable Final:**
[Descrição clara do que deve ser entregue ao usuário]

**Estrutura do Arquivo:**
```
[Preview da estrutura esperada]
```

**Critérios de Sucesso:**
- [Critério 1]
- [Critério 2]
```

**IMPORTANTE:** Adapte este template ao contexto específico da sua especialidade mantendo a estrutura geral.