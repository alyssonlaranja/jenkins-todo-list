#!/usr/bin/env npx ts-node
/**
 * Script para gerar tipos TypeScript automaticamente a partir dos arquivos JSON de tradução.
 *
 * Uso: npx ts-node scripts/generate-i18n-types.ts
 * Ou adicione ao package.json: "generate:i18n-types": "ts-node scripts/generate-i18n-types.ts"
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ESM compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCALES_DIR = path.join(
  __dirname,
  '../src/shared/i18n/locales/en' // Usamos EN como base
)
const OUTPUT_FILE = path.join(
  __dirname,
  '../src/shared/i18n/core/generated-types.ts'
)

// Função para gerar interface TypeScript a partir de um objeto JSON
function generateInterface(
  obj: Record<string, unknown>,
  interfaceName: string,
  indent = ''
): string {
  const lines: string[] = []
  lines.push(`${indent}export interface ${interfaceName} {`)

  for (const [key, value] of Object.entries(obj)) {
    // Escapa chaves que não são identificadores válidos
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`

    if (typeof value === 'string') {
      lines.push(`${indent}  ${safeKey}: string`)
    } else if (typeof value === 'object' && value !== null) {
      // Gera tipo inline para objetos aninhados
      const nestedType = generateInlineType(
        value as Record<string, unknown>,
        indent + '  '
      )
      lines.push(`${indent}  ${safeKey}: ${nestedType}`)
    }
  }

  lines.push(`${indent}}`)
  return lines.join('\n')
}

// Função para gerar tipo inline (para objetos aninhados)
function generateInlineType(obj: Record<string, unknown>, indent = ''): string {
  const lines: string[] = []
  lines.push('{')

  for (const [key, value] of Object.entries(obj)) {
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`

    if (typeof value === 'string') {
      lines.push(`${indent}  ${safeKey}: string`)
    } else if (typeof value === 'object' && value !== null) {
      const nestedType = generateInlineType(
        value as Record<string, unknown>,
        indent + '  '
      )
      lines.push(`${indent}  ${safeKey}: ${nestedType}`)
    }
  }

  lines.push(`${indent}}`)
  return lines.join('\n')
}

// Função para converter nome do arquivo para PascalCase
function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

// Função principal
async function main() {
  console.log('🌐 Generating i18n types from JSON files...\n')

  // Lê todos os arquivos JSON no diretório de locales
  const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'))

  const namespaces: string[] = []
  const interfaces: string[] = []

  for (const file of files) {
    const filePath = path.join(LOCALES_DIR, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    try {
      const json = JSON.parse(content)
      const baseName = path.basename(file, '.json')
      const interfaceName = `${toPascalCase(baseName)}Translation`

      namespaces.push(baseName)
      interfaces.push(generateInterface(json, interfaceName))

      console.log(`  ✅ ${file} → ${interfaceName}`)
    } catch (error) {
      console.error(`  ❌ Error parsing ${file}:`, error)
    }
  }

  // Gera o arquivo de tipos
  const output = `// ⚠️ ARQUIVO GERADO AUTOMATICAMENTE - NÃO EDITAR MANUALMENTE
// Gerado por: scripts/generate-i18n-types.ts
// Para regenerar: npm run generate:i18n-types

${interfaces.join('\n\n')}

export interface GeneratedTranslationResources {
${namespaces.map(ns => `  ${ns}: ${toPascalCase(ns)}Translation`).join('\n')}
}

export type GeneratedNamespaceKey = keyof GeneratedTranslationResources

// Flatten all translation keys for type checking
type FlattenKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? FlattenKeys<T[K], \`\${Prefix}\${K}.\`>
          : \`\${Prefix}\${K}\`
        : never
    }[keyof T]
  : never

export type AllTranslationKeys<NS extends GeneratedNamespaceKey> = FlattenKeys<
  GeneratedTranslationResources[NS]
>
`

  // Escreve o arquivo
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8')

  console.log(`\n✨ Generated ${OUTPUT_FILE}`)
  console.log(`   ${namespaces.length} namespaces: ${namespaces.join(', ')}`)
}

main().catch(console.error)
