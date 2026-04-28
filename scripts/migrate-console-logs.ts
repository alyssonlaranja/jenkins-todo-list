import fs from 'fs'
import path from 'path'

const TARGET_DIR = path.join(process.cwd(), 'src')
const LOGGER_IMPORT = "import Logger from '@/shared/lib/logger'"

function walk(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      walk(filePath, fileList)
    } else {
      if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        fileList.push(filePath)
      }
    }
  })
  return fileList
}

function migrate() {
  console.log('Starting migration of console.log to Logger.debug...')
  const files = walk(TARGET_DIR)
  let modifiedCount = 0

  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8')

    // Skip if no console.log
    if (!content.includes('console.log')) return
    // Skip the logger itself
    if (file.endsWith('logger.ts')) return

    // Replace console.log with Logger.debug
    // We use a simple regex. Be careful with comments or strings containing "console.log"
    // This is a "safe" heuristic for code, but manual review is recommended.
    const newContent = content.replace(/console\.log/g, 'Logger.debug')

    if (newContent !== content) {
      let finalContent = newContent

      // Add import if not present
      if (!finalContent.includes('@/shared/lib/logger')) {
        // Find the last import to append after it
        const lastImportMatch = [
          ...finalContent.matchAll(/^import .*$/gm),
        ].pop()

        if (lastImportMatch) {
          const lastImportIndex =
            lastImportMatch.index! + lastImportMatch[0].length
          finalContent =
            finalContent.slice(0, lastImportIndex) +
            '\n' +
            LOGGER_IMPORT +
            finalContent.slice(lastImportIndex)
        } else {
          // No imports, add to top
          finalContent = LOGGER_IMPORT + '\n\n' + finalContent
        }
      }

      fs.writeFileSync(file, finalContent)
      console.log(`Migrated: ${path.relative(process.cwd(), file)}`)
      modifiedCount++
    }
  })

  console.log(`Migration complete. Modified ${modifiedCount} files.`)
}

migrate()
