/**
 * Validador de Formato de Backlog
 *
 * Garante que backlogs sigam o formato canônico:
 * ## 🎯 ÉPICO N: → ### 🚀 Feature N.M: → #### 📝 US N.M.P:
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    epicsCount: number
    featuresCount: number
    userStoriesCount: number
    hierarchyDepth: number
  }
}

/**
 * Valida se um backlog segue o formato canônico obrigatório
 */
export function validateBacklogStructure(content: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Validar presença de épicos (H2 apenas)
  const epics = content.match(/^##\s*🎯\s*ÉPICO\s+\d+:/gm) || []
  if (epics.length === 0) {
    errors.push(
      '❌ Nenhum épico encontrado. Use formato: ## 🎯 ÉPICO N: Título'
    )
  }

  // 1.1 Detectar épicos em níveis errados
  const wrongLevelEpics = content.match(
    /^#\s+(?:🎯\s*)?(?:ÉPICO|EPICO|Epic|EPIC)|^###\s+(?:🎯\s*)?(?:ÉPICO|EPICO|Epic|EPIC)|^####\s+(?:🎯\s*)?(?:ÉPICO|EPICO|Epic|EPIC)/gm
  )
  if (wrongLevelEpics && wrongLevelEpics.length > 0) {
    wrongLevelEpics.forEach(epic => {
      errors.push(
        `❌ Épico com nível errado encontrado: "${epic.substring(0, 50)}...". Épicos DEVEM ser H2 (##)`
      )
    })
  }

  // 1.2 Detectar épicos sem emoji
  const epicsWithoutEmoji = content.match(
    /^##\s*(?:ÉPICO|EPICO|Epic|EPIC)\s+\d+:(?!.*🎯)/gm
  )
  if (epicsWithoutEmoji && epicsWithoutEmoji.length > 0) {
    epicsWithoutEmoji.forEach(epic => {
      warnings.push(
        `⚠️ Épico sem emoji 🎯: "${epic.substring(0, 50)}...". Adicione o emoji para melhor visualização.`
      )
    })
  }

  // 2. Validar presença de features (H3 apenas)
  const features = content.match(/^###\s*🚀\s*Feature\s+[\d.]+:/gm) || []
  if (features.length === 0) {
    errors.push(
      '❌ Nenhuma feature encontrada. Use formato: ### 🚀 Feature N.M: Título'
    )
  }

  // 2.1 Detectar features em níveis errados
  const wrongLevelFeatures = content.match(
    /^##\s+(?:🚀\s*)?Feature|^####\s+(?:🚀\s*)?Feature|^#\s+(?:🚀\s*)?Feature/gm
  )
  if (wrongLevelFeatures && wrongLevelFeatures.length > 0) {
    wrongLevelFeatures.forEach(feature => {
      errors.push(
        `❌ Feature com nível errado: "${feature.substring(0, 50)}...". Features DEVEM ser H3 (###)`
      )
    })
  }

  // 2.2 Detectar features sem emoji
  const featuresWithoutEmoji = content.match(
    /^###\s*Feature\s+[\d.]+:(?!.*🚀)/gm
  )
  if (featuresWithoutEmoji && featuresWithoutEmoji.length > 0) {
    featuresWithoutEmoji.forEach(feature => {
      warnings.push(
        `⚠️ Feature sem emoji 🚀: "${feature.substring(0, 50)}...". Adicione o emoji para melhor visualização.`
      )
    })
  }

  // 3. Validar presença de user stories (H4 apenas)
  const userStories = content.match(/^####\s*📝\s*US\s+[\d.]+:/gm) || []
  if (userStories.length === 0) {
    errors.push(
      '❌ Nenhuma user story encontrada. Use formato: #### 📝 US N.M.P: Como...'
    )
  }

  // 3.1 Detectar user stories em níveis errados
  const wrongLevelUS = content.match(
    /^##\s+(?:📝\s*)?(?:US|User Story)|^###\s+(?:📝\s*)?(?:US|User Story)|^#\s+(?:📝\s*)?(?:US|User Story)/gm
  )
  if (wrongLevelUS && wrongLevelUS.length > 0) {
    wrongLevelUS.forEach(us => {
      errors.push(
        `❌ User Story com nível errado: "${us.substring(0, 50)}...". US DEVEM ser H4 (####)`
      )
    })
  }

  // 3.2 Detectar US sem emoji
  const usWithoutEmoji = content.match(/^####\s*US\s+[\d.]+:(?!.*📝)/gm)
  if (usWithoutEmoji && usWithoutEmoji.length > 0) {
    usWithoutEmoji.forEach(us => {
      warnings.push(
        `⚠️ User Story sem emoji 📝: "${us.substring(0, 50)}...". Adicione o emoji para melhor visualização.`
      )
    })
  }

  // 3.3 Validar formato "Como... quero... para..."
  const usWithoutFormat = []
  const allUSLines = content
    .split('\n')
    .filter(line => line.match(/^####\s*📝\s*US\s+[\d.]+:/))

  for (const usLine of allUSLines) {
    if (!usLine.toLowerCase().includes('como')) {
      usWithoutFormat.push(usLine.substring(0, 60))
    }
  }

  if (usWithoutFormat.length > 0) {
    usWithoutFormat.forEach(us => {
      warnings.push(
        `⚠️ User Story sem formato "Como... quero... para...": "${us}..."`
      )
    })
  }

  // 4. Validar hierarquia (épico antes de features)
  const lines = content.split('\n')
  let lastEpicLine = -1
  let lastFeatureLine = -1

  lines.forEach((line, index) => {
    if (line.match(/^##\s*🎯\s*ÉPICO/)) {
      lastEpicLine = index
    } else if (line.match(/^###\s*🚀\s*Feature/)) {
      if (lastEpicLine === -1) {
        errors.push(
          `❌ Feature encontrada antes de qualquer épico (linha ${index + 1}): "${line.substring(0, 60)}..."`
        )
      }
      lastFeatureLine = index
    } else if (line.match(/^####\s*📝\s*US/)) {
      if (lastFeatureLine === -1) {
        errors.push(
          `❌ User Story encontrada antes de qualquer feature (linha ${index + 1}): "${line.substring(0, 60)}..."`
        )
      }
    }
  })

  // 5. Validar critérios de aceitação
  const usBlocks = content.split(/^####\s*📝\s*US\s+[\d.]+:/gm)

  for (let i = 1; i < usBlocks.length; i++) {
    const block = usBlocks[i] || ''
    const nextUSIndex = block.search(
      /^####\s*📝\s*US|^###\s*🚀\s*Feature|^##\s*🎯\s*ÉPICO/m
    )
    const usContent = nextUSIndex > 0 ? block.substring(0, nextUSIndex) : block

    if (
      !usContent.includes('Critérios de Aceitação:') &&
      !usContent.includes('Critérios de aceitação:')
    ) {
      warnings.push(`⚠️ User Story ${i} sem seção "Critérios de Aceitação"`)
    } else {
      // Contar critérios
      const criteriaMatches = usContent.match(/^[\s]*-\s*\[\s*\]\s*.+$/gm) || []
      if (criteriaMatches.length < 3) {
        warnings.push(
          `⚠️ User Story ${i} tem apenas ${criteriaMatches.length} critério(s) de aceitação. Recomendado: mínimo 3`
        )
      }
    }

    // Validar prioridade
    if (!usContent.match(/\*\*Prioridade:\*\*\s*(High|Medium|Low)/i)) {
      warnings.push(`⚠️ User Story ${i} sem prioridade definida`)
    }

    // Validar story points
    if (!usContent.match(/\*\*Story Points:\*\*\s*\d+/i)) {
      warnings.push(`⚠️ User Story ${i} sem story points estimados`)
    }
  }

  // 6. Calcular estatísticas
  const epicPositions = [...content.matchAll(/^##\s*🎯\s*ÉPICO/gm)].map(
    m => m.index!
  )
  const featurePositions = [...content.matchAll(/^###\s*🚀\s*Feature/gm)].map(
    m => m.index!
  )
  const usPositions = [...content.matchAll(/^####\s*📝\s*US/gm)].map(
    m => m.index!
  )

  const stats = {
    epicsCount: epics.length,
    featuresCount: features.length,
    userStoriesCount: userStories.length,
    hierarchyDepth: Math.max(
      epics.length > 0 ? 2 : 0,
      features.length > 0 ? 3 : 0,
      userStories.length > 0 ? 4 : 0
    ),
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats,
  }
}

/**
 * Valida numeração hierárquica (1, 1.1, 1.1.1, 1.1.2, 1.2, 2, 2.1...)
 */
export function validateNumbering(content: string): {
  isValid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Extrair todos os números dos épicos, features e US
  const epicNumbers = [...content.matchAll(/^##\s*🎯\s*ÉPICO\s+(\d+):/gm)].map(
    m => parseInt(m[1] || '0')
  )
  const featureNumbers = [
    ...content.matchAll(/^###\s*🚀\s*Feature\s+([\d.]+):/gm),
  ].map(m => m[1])
  const usNumbers = [...content.matchAll(/^####\s*📝\s*US\s+([\d.]+):/gm)].map(
    m => m[1]
  )

  // Validar épicos (deve ser 1, 2, 3...)
  for (let i = 0; i < epicNumbers.length; i++) {
    if (epicNumbers[i] !== i + 1) {
      issues.push(
        `⚠️ Numeração de épico incorreta: esperado ÉPICO ${i + 1}, encontrado ÉPICO ${epicNumbers[i]}`
      )
    }
  }

  // Validar features (deve ser 1.1, 1.2, 2.1, 2.2...)
  const expectedFeatures: string[] = []
  epicNumbers.forEach(epicNum => {
    let featureCount = 0
    featureNumbers.forEach(featNum => {
      if (featNum?.startsWith(`${epicNum}.`)) {
        featureCount++
      }
    })

    for (let i = 1; i <= featureCount; i++) {
      expectedFeatures.push(`${epicNum}.${i}`)
    }
  })

  // Comparar com features encontradas
  featureNumbers.forEach((found, idx) => {
    if (found && !expectedFeatures.includes(found)) {
      issues.push(
        `⚠️ Numeração de feature possivelmente incorreta: Feature ${found}`
      )
    }
  })

  return {
    isValid: issues.length === 0,
    issues,
  }
}

/**
 * Gera relatório de validação em formato legível
 */
export function generateValidationReport(validation: ValidationResult): string {
  const lines: string[] = []

  lines.push('# 📊 Relatório de Validação de Backlog\n')
  lines.push(
    `**Status:** ${validation.isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}\n`
  )

  lines.push('## 📈 Estatísticas\n')
  lines.push(`- **Épicos:** ${validation.stats.epicsCount}`)
  lines.push(`- **Features:** ${validation.stats.featuresCount}`)
  lines.push(`- **User Stories:** ${validation.stats.userStoriesCount}`)
  lines.push(
    `- **Profundidade da Hierarquia:** ${validation.stats.hierarchyDepth}\n`
  )

  if (validation.errors.length > 0) {
    lines.push('## ❌ Erros (Bloqueantes)\n')
    validation.errors.forEach(error => lines.push(`- ${error}`))
    lines.push('')
  }

  if (validation.warnings.length > 0) {
    lines.push('## ⚠️ Avisos (Recomendações)\n')
    validation.warnings.forEach(warning => lines.push(`- ${warning}`))
    lines.push('')
  }

  if (validation.isValid && validation.warnings.length === 0) {
    lines.push('## ✅ Backlog em perfeitas condições!\n')
    lines.push('Todas as validações passaram. Pode prosseguir para o handoff.')
  }

  return lines.join('\n')
}
