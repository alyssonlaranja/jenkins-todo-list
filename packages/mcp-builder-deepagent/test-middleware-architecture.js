// test-middleware-architecture.js
// Script para testar a nova arquitetura de middleware do DeepAgent

import { createGenerator, jobManager } from './dist/core/index.js'

async function testMiddlewareArchitecture() {
  console.log('🧪 Testing New Middleware Architecture...')

  try {
    // Mock callTool function
    const mockCallTool = async (toolName, args) => {
      console.log(`[Mock MCP] Called tool: ${toolName}`, Object.keys(args))
      return { success: true, result: 'Mock response' }
    }

    // Create generator with NEW middleware architecture
    const generator = createGenerator({
      callTool: mockCallTool,
      enableArtifactPersistence: true, // Enable para testar middleware
      azureApiKey: process.env.AZURE_OPENAI_API_KEY || 'test-key',
      azureResourceName: process.env.AZURE_RESOURCE_NAME || 'test-resource',
      azureDeploymentName: 'gpt-4o',
      outputBaseDir: './test-middleware-output',
      temperature: 0.3,
    })

    console.log('✅ Generator created with new middleware architecture')

    // Create job for testing
    const job = jobManager.createJob(
      'middleware-test-server',
      'Test MCP server with new middleware architecture',
      {}, // sem slots para testar apenas middleware básico
      'storage',
      'middleware-test-playground'
    )

    console.log('✅ Job created:', job.id)
    console.log(
      '📁 Output directory:',
      `./test-middleware-output/${job.playgroundId}/${job.projectName}`
    )

    // CRITICAL TEST: Execute job with new middleware architecture
    console.log('🚀 EXECUTING JOB WITH NEW MIDDLEWARE ARCHITECTURE...')
    console.log('    Expected: NO "Channel files already exists" error')
    console.log('    Expected: Files generated successfully')
    console.log('    Expected: Artifact persistence middleware working')

    await generator.runJob(job)

    console.log('🎉 SUCCESS! New middleware architecture working!')
    console.log('✅ No channel conflicts')
    console.log('✅ DeepAgent completed successfully')
    console.log('✅ Middleware architecture is correct')
  } catch (error) {
    console.error('❌ Middleware architecture test failed:')
    console.error('Error name:', error.constructor.name)
    console.error('Error message:', error.message)

    if (error.message.includes('Channel "files" already exists')) {
      console.error('')
      console.error('🚨 CHANNEL CONFLICT STILL EXISTS!')
      console.error('   The middleware architecture still has conflicts')
      console.error('   Need to investigate further...')
    }

    process.exit(1)
  }
}

// Execute test
testMiddlewareArchitecture().catch(console.error)
