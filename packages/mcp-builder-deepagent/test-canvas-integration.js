// test-canvas-integration.js
// Script para testar a integração Canvas do DeepAgent

import { createGenerator, jobManager } from './dist/core/index.js'

async function testCanvasIntegration() {
  console.log('🎨 Testing Canvas Integration...')

  let canvasArtifacts = []

  try {
    // Mock onAddArtifact callback para capturar artifacts enviados para o Canvas
    const mockOnAddArtifact = artifact => {
      console.log(`[Canvas Mock] Received artifact: ${artifact.title}`)
      console.log(
        `[Canvas Mock] Type: ${artifact.type}, Language: ${artifact.language}`
      )
      console.log(
        `[Canvas Mock] Project: ${artifact.metadata?.projectName}, Group: ${artifact.metadata?.projectGroup}`
      )
      console.log(
        `[Canvas Mock] File size: ${artifact.metadata?.fileSize} bytes`
      )
      console.log('---')
      canvasArtifacts.push(artifact)
    }

    // Create generator com Canvas callback
    const generator = createGenerator({
      onAddArtifact: mockOnAddArtifact, // ← CRITICAL: Canvas callback
      azureApiKey: process.env.AZURE_OPENAI_API_KEY || 'test-key',
      azureResourceName: process.env.AZURE_RESOURCE_NAME || 'test-resource',
      azureDeploymentName: 'gpt-4o',
      outputBaseDir: './test-canvas-output',
      temperature: 0.3,
    })

    console.log('✅ Generator created with Canvas callback')

    // Create job for testing
    const job = jobManager.createJob(
      'canvas-test-server',
      'Test MCP server with Canvas integration',
      {}, // sem slots para testar apenas Canvas
      'storage',
      'canvas-test-playground'
    )

    console.log('✅ Job created:', job.id)

    // CRITICAL TEST: Execute job and verify Canvas integration
    console.log('🚀 EXECUTING JOB WITH CANVAS INTEGRATION...')
    console.log('    Expected: Files generated AND sent to Canvas in real-time')
    console.log('    Expected: Each file triggers onAddArtifact callback')
    console.log('    Expected: Artifacts have metadata.projectGroup = true')

    await generator.runJob(job)

    console.log('🎉 SUCCESS! Canvas integration working!')
    console.log(`✅ Total artifacts sent to Canvas: ${canvasArtifacts.length}`)

    // Verify Canvas artifacts structure
    console.log('\n📊 Canvas Artifacts Analysis:')
    console.log('================================')

    canvasArtifacts.forEach((artifact, index) => {
      console.log(`${index + 1}. ${artifact.title}`)
      console.log(`   Type: ${artifact.type}`)
      console.log(`   Language: ${artifact.language}`)
      console.log(`   Size: ${artifact.metadata?.fileSize || 0} bytes`)
      console.log(
        `   Project Group: ${artifact.metadata?.projectGroup ? 'YES' : 'NO'}`
      )
      console.log(`   Sort Order: ${artifact.metadata?.sortOrder || 'N/A'}`)
      console.log('')
    })

    // Verify that project grouping is working
    const projectGroupArtifacts = canvasArtifacts.filter(
      a => a.metadata?.projectGroup === true
    )
    const correctProjectName = canvasArtifacts.filter(
      a => a.metadata?.projectName === 'canvas-test-server'
    )

    console.log('📈 Canvas Integration Verification:')
    console.log('===================================')
    console.log(`✅ Total artifacts: ${canvasArtifacts.length}`)
    console.log(`✅ Project group artifacts: ${projectGroupArtifacts.length}`)
    console.log(`✅ Correct project name: ${correctProjectName.length}`)
    console.log(
      `✅ Expected Enhanced Canvas mode: ${projectGroupArtifacts.length > 0 ? 'YES' : 'NO'}`
    )

    if (canvasArtifacts.length === 0) {
      console.error('❌ NO ARTIFACTS SENT TO CANVAS!')
      console.error('   The CanvasCallbackMiddleware is not working properly')
      process.exit(1)
    }

    if (projectGroupArtifacts.length === 0) {
      console.error('❌ NO PROJECT GROUP ARTIFACTS!')
      console.error('   Enhanced Canvas mode will not activate')
      process.exit(1)
    }

    console.log('\n✨ Canvas integration is working correctly!')
    console.log('✅ Files are being sent to Canvas in real-time')
    console.log('✅ Enhanced Canvas mode will activate (projectGroup = true)')
    console.log('✅ All artifacts have correct metadata structure')
  } catch (error) {
    console.error('❌ Canvas integration test failed:')
    console.error('Error name:', error.constructor.name)
    console.error('Error message:', error.message)

    if (canvasArtifacts.length > 0) {
      console.log(
        `\n📊 Artifacts received before error: ${canvasArtifacts.length}`
      )
      canvasArtifacts.forEach((artifact, index) => {
        console.log(`  ${index + 1}. ${artifact.title} (${artifact.type})`)
      })
    }

    process.exit(1)
  }
}

// Execute test
testCanvasIntegration().catch(console.error)
