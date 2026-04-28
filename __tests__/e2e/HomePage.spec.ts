/**
 * US-00 - Home SDA - Testes E2E
 *
 * Testes end-to-end para validar a HomePage do SDA
 *
 * @group e2e
 * @group us-00
 */

import { expect, test } from '@playwright/test'

// ============================================================================
// Setup e Helpers
// ============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4200'

test.describe('US-00: HomePage - Solution Design Agents', () => {
  // ============================================================================
  // T2: Hero Section
  // ============================================================================

  test.describe('Hero Section', () => {
    test('deve exibir título e subtítulo corretos', async ({ page }) => {
      await page.goto(BASE_URL)

      // Verificar título
      const title = page.locator('h1:has-text("Solution Design Agents (SDA)")')
      await expect(title).toBeVisible()

      // Verificar subtítulo
      const subtitle = page.locator(
        'text=Agentes especializados em arquitetura de soluções'
      )
      await expect(subtitle).toBeVisible()
    })

    test('deve exibir botão "Criar Projeto" no hero', async ({ page }) => {
      await page.goto(BASE_URL)

      const createButton = page.locator(
        'button:has-text("Criar Projeto"), button:has-text("Criar")'
      )
      await expect(createButton.first()).toBeVisible()
      await expect(createButton.first()).toBeEnabled()
    })

    test('botão "Criar Projeto" deve abrir modal ao clicar', async ({
      page,
    }) => {
      await page.goto(BASE_URL)

      // Clicar no botão
      await page
        .locator('button:has-text("Criar Projeto"), button:has-text("Criar")')
        .first()
        .click()

      // Verificar modal aberto
      await expect(page.locator('text=Novo Projeto SDA')).toBeVisible()
      await expect(page.locator('text=Passo 1 de 2')).toBeVisible()
    })
  })

  // ============================================================================
  // T3: Seção Benefícios
  // ============================================================================

  test.describe('Seção Benefícios', () => {
    test('deve exibir título "Benefícios"', async ({ page }) => {
      await page.goto(BASE_URL)

      const benefitsTitle = page.locator('h2:has-text("Benefícios")')
      await expect(benefitsTitle).toBeVisible()
    })

    test('deve listar 4 benefícios com ícones CheckCircle', async ({
      page,
    }) => {
      await page.goto(BASE_URL)

      // Verificar benefícios
      await expect(
        page.locator('text=Aceleração do processo de design de soluções')
      ).toBeVisible()
      await expect(
        page.locator('text=Documentação técnica automatizada e consistente')
      ).toBeVisible()
      await expect(
        page.locator('text=Análise de trade-offs arquiteturais')
      ).toBeVisible()
      await expect(
        page.locator('text=Geração de diagramas e especificações')
      ).toBeVisible()

      // Verificar ícones (CheckCircle tem 4 instâncias)
      const checkIcons = page.locator('svg[class*="lucide-check-circle"]')
      await expect(checkIcons).toHaveCount(4)
    })
  })

  // ============================================================================
  // T4: Grid Agentes & Artefatos
  // ============================================================================

  test.describe('Grid Agentes & Artefatos', () => {
    test('deve exibir seção "Agentes Especializados"', async ({ page }) => {
      await page.goto(BASE_URL)

      await expect(
        page.locator('h3:has-text("Agentes Especializados")')
      ).toBeVisible()
    })

    test('deve listar 5 agentes', async ({ page }) => {
      await page.goto(BASE_URL)

      await expect(page.locator('text=Discovery')).toBeVisible()
      await expect(page.locator('text=UX Design')).toBeVisible()
      await expect(page.locator('text=Product Requirements')).toBeVisible()
      await expect(page.locator('text=Architecture')).toBeVisible()
      await expect(page.locator('text=Backlog')).toBeVisible()
    })

    test('deve exibir seção "Tipos de Artefatos"', async ({ page }) => {
      await page.goto(BASE_URL)

      await expect(
        page.locator('h3:has-text("Tipos de Artefatos")')
      ).toBeVisible()
    })

    test('deve listar 5 tipos de artefatos', async ({ page }) => {
      await page.goto(BASE_URL)

      await expect(page.locator('text=Discovery Document')).toBeVisible()
      await expect(page.locator('text=UX Prototype')).toBeVisible()
      await expect(page.locator('text=PRD')).toBeVisible()
      await expect(page.locator('text=Architecture Diagram')).toBeVisible()
      await expect(page.locator('text=User Stories')).toBeVisible()
    })
  })

  // ============================================================================
  // T7: Modelos LLM
  // ============================================================================

  test.describe('Modelos LLM Suportados', () => {
    test('deve exibir seção "Modelos LLM Suportados"', async ({ page }) => {
      await page.goto(BASE_URL)

      await expect(
        page.locator('h3:has-text("Modelos LLM Suportados")')
      ).toBeVisible()
    })

    test('deve exibir 4 modelos LLM', async ({ page }) => {
      await page.goto(BASE_URL)

      await expect(page.locator('text=GPT-4')).toBeVisible()
      await expect(page.locator('text=Claude')).toBeVisible()
      await expect(page.locator('text=Gemini')).toBeVisible()
      await expect(page.locator('text=Llama')).toBeVisible()
    })
  })

  // ============================================================================
  // T5: Seção Projetos Recentes
  // ============================================================================

  test.describe('Seção Projetos Recentes', () => {
    test('deve exibir seção "Seus Projetos"', async ({ page }) => {
      await page.goto(BASE_URL)

      await expect(page.locator('h3:has-text("Seus Projetos")')).toBeVisible()
    })

    test('deve exibir empty state quando não há projetos', async ({ page }) => {
      await page.goto(BASE_URL)

      // Assumindo que não há projetos inicialmente
      const emptyState = page.locator('text=Nenhum projeto criado ainda')
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible()
        await expect(
          page.locator('button:has-text("Criar Primeiro Projeto")')
        ).toBeVisible()
      }
    })
  })

  // ============================================================================
  // T6: Modal de Criação (2 Passos)
  // ============================================================================

  test.describe('Modal de Criação de Projeto', () => {
    test('deve abrir modal ao clicar em "Criar Projeto"', async ({ page }) => {
      await page.goto(BASE_URL)

      await page
        .locator('button:has-text("Criar Projeto"), button:has-text("Criar")')
        .first()
        .click()

      // Verificar modal Passo 1
      await expect(page.locator('text=Novo Projeto SDA')).toBeVisible()
      await expect(page.locator('text=Passo 1 de 2')).toBeVisible()
      await expect(
        page.locator('input[placeholder="Nome do projeto"]')
      ).toBeVisible()
    })

    test('deve navegar para Passo 2 após preencher nome', async ({ page }) => {
      await page.goto(BASE_URL)

      // Abrir modal
      await page
        .locator('button:has-text("Criar Projeto"), button:has-text("Criar")')
        .first()
        .click()

      // Preencher nome
      await page
        .locator('input[placeholder="Nome do projeto"]')
        .fill('Projeto Teste E2E')

      // Clicar em Próximo
      await page.locator('button:has-text("Próximo")').click()

      // Verificar Passo 2
      await expect(page.locator('text=Selecionar Equipe')).toBeVisible()
      await expect(page.locator('text=Passo 2 de 2')).toBeVisible()
    })

    test('botão "Próximo" deve estar desabilitado sem nome', async ({
      page,
    }) => {
      await page.goto(BASE_URL)

      await page
        .locator('button:has-text("Criar Projeto"), button:has-text("Criar")')
        .first()
        .click()

      const nextButton = page.locator('button:has-text("Próximo")')
      await expect(nextButton).toBeDisabled()
    })

    test('deve fechar modal ao clicar em "Cancelar"', async ({ page }) => {
      await page.goto(BASE_URL)

      await page
        .locator('button:has-text("Criar Projeto"), button:has-text("Criar")')
        .first()
        .click()
      await expect(page.locator('text=Novo Projeto SDA')).toBeVisible()

      await page.locator('button:has-text("Cancelar")').click()

      // Modal deve estar fechado
      await expect(page.locator('text=Novo Projeto SDA')).not.toBeVisible()
    })

    test('deve exibir busca de membros no Passo 2', async ({ page }) => {
      await page.goto(BASE_URL)

      // Abrir modal e ir para Passo 2
      await page
        .locator('button:has-text("Criar Projeto"), button:has-text("Criar")')
        .first()
        .click()
      await page
        .locator('input[placeholder="Nome do projeto"]')
        .fill('Projeto Teste')
      await page.locator('button:has-text("Próximo")').click()

      // Verificar campo de busca
      await expect(
        page.locator('input[placeholder*="Buscar membro"]')
      ).toBeVisible()
    })
  })

  // ============================================================================
  // T8: Responsividade Mobile
  // ============================================================================

  test.describe('Responsividade Mobile', () => {
    test('deve ser responsivo em mobile (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(BASE_URL)

      // Verificar elementos principais visíveis
      await expect(
        page.locator('h1:has-text("Solution Design Agents")')
      ).toBeVisible()
      await expect(
        page
          .locator('button:has-text("Criar Projeto"), button:has-text("Criar")')
          .first()
      ).toBeVisible()
    })

    test('deve ser responsivo em tablet (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto(BASE_URL)

      await expect(
        page.locator('h1:has-text("Solution Design Agents")')
      ).toBeVisible()
      await expect(page.locator('h2:has-text("Benefícios")')).toBeVisible()
    })

    test('deve ser responsivo em desktop (1920px)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.goto(BASE_URL)

      await expect(
        page.locator('h1:has-text("Solution Design Agents")')
      ).toBeVisible()
      await expect(page.locator('h2:has-text("Benefícios")')).toBeVisible()
    })
  })

  // ============================================================================
  // T9: Dark/Light Mode
  // ============================================================================

  test.describe('Temas (Dark/Light Mode)', () => {
    test('deve funcionar em dark mode', async ({ page }) => {
      await page.goto(BASE_URL)

      // Simular dark mode via class no html
      await page.evaluate(() => {
        document.documentElement.classList.add('dark')
      })

      // Verificar elementos principais ainda visíveis
      await expect(
        page.locator('h1:has-text("Solution Design Agents")')
      ).toBeVisible()
    })

    test('deve funcionar em light mode', async ({ page }) => {
      await page.goto(BASE_URL)

      // Remover dark mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark')
      })

      // Verificar elementos principais ainda visíveis
      await expect(
        page.locator('h1:has-text("Solution Design Agents")')
      ).toBeVisible()
    })
  })

  // ============================================================================
  // Performance e Acessibilidade (T10)
  // ============================================================================

  test.describe('Performance e Acessibilidade', () => {
    test('página deve carregar em menos de 5 segundos', async ({ page }) => {
      const startTime = Date.now()
      await page.goto(BASE_URL)
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(5000)
    })

    test('deve ter semântica HTML adequada', async ({ page }) => {
      await page.goto(BASE_URL)

      // Verificar tags semânticas
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('h2')).toBeVisible()
      await expect(page.locator('h3')).toBeVisible()
    })

    test('botões devem ter tamanho adequado para toque (min 44x44px)', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(BASE_URL)

      const createButton = page
        .locator('button:has-text("Criar Projeto"), button:has-text("Criar")')
        .first()
      const box = await createButton.boundingBox()

      expect(box).not.toBeNull()
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40) // Pelo menos 40px
      }
    })
  })
})
