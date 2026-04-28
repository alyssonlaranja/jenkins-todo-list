/**
 * Test script for Generator
 * Run with: npx tsx packages/mcp-builder/test-generator.ts
 */

import { resolve } from 'path'

import { config } from 'dotenv'

import { createGenerator, jobManager } from './src/core/index.js'

// Load from project root .env.local
config({ path: resolve(process.cwd(), '.env.local') })

console.log('=== Testing MCP Builder Generator ===\n')

// Check env vars
console.log('Environment:')
console.log(
  `  ANTHROPIC_BASE_URL: ${process.env.ANTHROPIC_BASE_URL || '(not set)'}`
)
console.log(
  `  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '(set)' : '(not set)'}`
)
console.log(`  ANTHROPIC_MODEL: ${process.env.ANTHROPIC_MODEL || '(not set)'}`)
console.log('')

// Create a simple test job
const job = jobManager.createJob(
  'test-mcp',
  'Create a simple MCP server with a hello_world tool that returns a greeting',
  {}, // No external slots for simple test
  'storage'
)

console.log(`Created job: ${job.id}`)
console.log(`Status: ${job.status}`)
console.log('')

// Run generator
const generator = createGenerator()

console.log('Starting generation...\n')

// Poll for status updates
const interval = setInterval(() => {
  const current = jobManager.getJob(job.id)
  if (current) {
    console.log(
      `[${new Date().toISOString()}] Status: ${current.status} | Phase: ${current.progress?.phase || 'N/A'} | Files: ${current.progress?.filesGenerated?.length || 0}`
    )
  }
}, 3000)

try {
  await generator.runJob(job)
  clearInterval(interval)

  const finalJob = jobManager.getJob(job.id)
  console.log('\n=== Final Status ===')
  console.log(`Status: ${finalJob?.status}`)

  if (finalJob?.result) {
    console.log(`Duration: ${(finalJob.result.durationMs / 1000).toFixed(1)}s`)
    console.log(`Files generated: ${finalJob.result.files.length}`)
    finalJob.result.files.forEach(f => console.log(`  - ${f}`))
  }

  if (finalJob?.error) {
    console.log(`Error Phase: ${finalJob.error.phase}`)
    console.log(`Error: ${finalJob.error.message}`)
  }
} catch (error) {
  console.error('Generator threw error:', error)
}
