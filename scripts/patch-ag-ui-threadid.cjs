#!/usr/bin/env node
/**
 * Patch all @ag-ui/core and @ag-ui/client instances to make threadId optional.
 *
 * This fixes CopilotKit bug #2624 where threadId is not passed to agent.run()
 * causing Zod validation to fail with "threadId: Required".
 *
 * @see https://github.com/CopilotKit/CopilotKit/issues/2624
 */

const fs = require('fs')
const path = require('path')

// Match patterns like:
// - threadId:z.string()        (ESM)
// - threadId: z2.string()      (ESM events)
// - threadId:import_zod.z.string() (CJS)
// - threadId:f.z.string()      (minified)
const SEARCH_PATTERN =
  /threadId:\s*((?:import_zod\d?\.z|[a-zA-Z]\d*\.z|z\d*))\.string\(\)(?!\.optional)/g
const REPLACEMENT = (match, zodRef) => {
  // zodRef is captured group 1 (e.g., "import_zod.z", "f.z", "z", "z2")
  return `threadId: ${zodRef}.string().optional().default(() => crypto.randomUUID())`
}

function findAllFiles(dir, pattern, files = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        findAllFiles(fullPath, pattern, files)
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath)
      }
    }
  } catch (err) {
    // Ignore permission errors
  }
  return files
}

function patchFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    const matches = content.match(SEARCH_PATTERN)

    if (matches && matches.length > 0) {
      const newContent = content.replace(SEARCH_PATTERN, REPLACEMENT)
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent)
        console.log(`  Patched: ${filePath} (${matches.length} occurrences)`)
        return true
      }
    }
  } catch (err) {
    console.error(`  Error patching ${filePath}:`, err.message)
  }
  return false
}

function main() {
  console.log('Patching @ag-ui threadId validation...\n')

  const nodeModulesDir = path.join(process.cwd(), 'node_modules')

  // Find all potential files to patch
  const patterns = [
    /@ag-ui[/\\](core|client)[/\\]dist[/\\].*\.js$/,
    /@copilotkit[/\\].*[/\\]@ag-ui[/\\](core|client)[/\\]dist[/\\].*\.js$/,
  ]

  let patchedCount = 0

  // Search for @ag-ui packages in node_modules (including nested)
  // Include both .js and .mjs files (ESM)
  const allFiles = findAllFiles(nodeModulesDir, /\.(js|mjs)$/)

  for (const file of allFiles) {
    // Only patch files in @ag-ui/core or @ag-ui/client dist directories
    if (
      file.includes('@ag-ui') &&
      file.includes('dist') &&
      (file.endsWith('.js') || file.endsWith('.mjs'))
    ) {
      if (patchFile(file)) {
        patchedCount++
      }
    }
  }

  console.log(`\nDone! Patched ${patchedCount} file(s).`)
}

main()
