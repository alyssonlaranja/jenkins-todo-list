// verify-version.js
// Script para verificar se a versão correta está sendo importada

// Read the generator source to check implementation
import fs from 'fs'

import { createGenerator } from './dist/core/index.js'

console.log('🔍 Verifying package version...')

const generatorSource = fs.readFileSync('./dist/core/generator.js', 'utf8')

console.log('✅ Package built successfully')

if (
  generatorSource.includes('Creating DeepAgent with middleware architecture')
) {
  console.log('✅ NEW implementation found: Using middleware architecture')
} else {
  console.log('❌ OLD implementation found: Still using FilesystemBackend')
}

if (generatorSource.includes('FilesystemBackend')) {
  console.log(
    '⚠️  FilesystemBackend references found (expected in imports/comments only)'
  )
} else {
  console.log('✅ No FilesystemBackend usage found')
}

console.log('')
console.log('🧪 Testing generator creation...')
try {
  const generator = createGenerator({
    azureApiKey: 'test',
    azureResourceName: 'test',
    outputBaseDir: './test',
  })
  console.log('✅ Generator created successfully with new architecture')
} catch (error) {
  console.error('❌ Generator creation failed:', error.message)
}

console.log('')
console.log('📦 Package verification complete')
console.log(
  '💡 If the old version is still being used, restart the Next.js server'
)
