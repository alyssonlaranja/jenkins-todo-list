// test-real-job.js
// Script para testar execução real de um job e identificar onde falha

import * as fs from 'fs/promises'
import * as path from 'path'

import { createGenerator, jobManager } from './dist/core/index.js'

async function testRealJobExecution() {
  console.log('🚀 Testing REAL Job Execution...')

  try {
    // Simula uma função callTool do useProxyMCP
    const mockCallTool = async (toolName, args) => {
      console.log(`[Mock MCP] Called tool: ${toolName}`, Object.keys(args))
      return { success: true, result: 'Mock response' }
    }

    // Cria generator
    const generator = createGenerator({
      callTool: mockCallTool,
      enableArtifactPersistence: false, // Desabilita para focar no core
      azureApiKey: process.env.AZURE_OPENAI_API_KEY || 'test-key',
      azureResourceName: process.env.AZURE_RESOURCE_NAME || 'test-resource',
      azureDeploymentName: 'gpt-4o',
      outputBaseDir: './test-output',
      temperature: 0.3,
    })

    console.log('✅ Generator created')

    // Cria job SEM slots conectados para testar isoladamente
    const job = jobManager.createJob(
      'simple-test-mcp-server',
      'A simple MCP server for testing basic functionality',
      {}, // sem slots
      'storage',
      'test-playground-456'
    )

    console.log('✅ Job created:', job.id)
    console.log(
      '📁 Output directory will be:',
      path.join('./test-output', job.playgroundId, job.projectName)
    )

    // Verifica se diretório de output existe
    const outputPath = path.join(
      './test-output',
      job.playgroundId,
      job.projectName
    )
    await fs.mkdir(outputPath, { recursive: true })
    console.log('✅ Output directory created')

    // Executa o job
    console.log('🎯 Starting job execution...')
    await generator.runJob(job)

    console.log('🎉 Job completed successfully!')

    // Verifica arquivos gerados
    try {
      const files = await fs.readdir(outputPath, { recursive: true })
      console.log('📁 Generated files:', files)
    } catch (error) {
      console.log('📁 No files found or directory error:', error.message)
    }
  } catch (error) {
    console.error('❌ Real job execution failed:')
    console.error('Error name:', error.constructor.name)
    console.error('Error message:', error.message)
    if (error.stack) {
      console.error('Stack trace (first 10 lines):')
      console.error(error.stack.split('\n').slice(0, 10).join('\n'))
    }

    // Log job status
    const jobs = jobManager.getAllJobs()
    console.log('\n📊 Current jobs status:')
    jobs.forEach(job => {
      console.log(`  - ${job.id}: ${job.status} (${job.projectName})`)
      if (job.error) {
        console.log(`    Error: ${job.error.message}`)
      }
    })
  }
}

// Executa teste
testRealJobExecution().catch(console.error)
