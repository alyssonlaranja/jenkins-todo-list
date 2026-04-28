/**
 * Dynamic Agents Module - Utilities
 *
 * Helper functions for:
 * - Resolving artifact placeholders ${KEY} → value
 * - Parsing YAML front matter from instructions
 * - Exponential backoff for retries
 *
 * @see DYNAMIC_AGENTS_MODULE_PROPOSAL.md
 */
import type { ArtifactsCatalog, ParsedFrontMatter } from './types'

// ============================================================================
// ARTIFACT RESOLVER
// ============================================================================

/**
 * Resolve artifact placeholders ${KEY} with actual values from catalog
 *
 * @param instruction - Raw instruction with ${KEY} placeholders
 * @param catalog - Artifacts catalog object (indexed by key)
 * @returns Instruction with resolved values
 *
 * @example
 * ```ts
 * const resolved = resolveArtifacts(
 *   'Use these rules: ${CONTEXT_RULES}',
 *   { CONTEXT_RULES: { key: 'CONTEXT_RULES', value: '...' } }
 * )
 * ```
 */
export function resolveArtifacts(
  instruction: string,
  catalog: ArtifactsCatalog
): string {
  if (!instruction || !catalog) {
    return instruction || ''
  }

  // Regex to find ${KEY} patterns
  const artifactPattern = /\$\{([A-Z0-9_]+)\}/g

  return instruction.replace(artifactPattern, (match, key: string) => {
    // Access directly by key (catalog is object, not array!)
    const artifact = catalog[key]

    if (artifact && artifact.value) {
      return artifact.value
    }

    console.warn(`[resolveArtifacts] Artifact not found: ${key}`)
    return match // Keep original if not found
  })
}

/**
 * Extract artifact keys referenced in an instruction
 *
 * @param instruction - Instruction text
 * @returns Array of artifact keys
 */
export function extractArtifactKeys(instruction: string): string[] {
  if (!instruction) return []

  const artifactPattern = /\$\{([A-Z0-9_]+)\}/g
  const keys: string[] = []
  let match

  while ((match = artifactPattern.exec(instruction)) !== null) {
    const key = match[1]
    if (key && !keys.includes(key)) {
      keys.push(key)
    }
  }

  return keys
}

// ============================================================================
// FRONT MATTER PARSER
// ============================================================================

/**
 * Parse YAML front matter from instruction
 *
 * Front matter format:
 * ```
 * ---
 * temperature: 0.7
 * max_tokens: 4000
 * ---
 *
 * # Instruction content here
 * ```
 *
 * @param instruction - Full instruction with possible front matter
 * @returns Parsed front matter and remaining content
 */
export function parseFrontMatter(instruction: string): {
  frontMatter: ParsedFrontMatter
  content: string
  hasFrontMatter: boolean
} {
  if (!instruction) {
    return { frontMatter: {}, content: '', hasFrontMatter: false }
  }

  // Regex to match YAML front matter block
  const frontMatterPattern = /^---\n([\s\S]*?)\n---\n/

  const match = instruction.match(frontMatterPattern)

  if (!match) {
    return { frontMatter: {}, content: instruction, hasFrontMatter: false }
  }

  try {
    // Parse YAML manually (simple key-value pairs)
    const yamlContent = match[1]!
    const frontMatter = parseSimpleYaml(yamlContent)
    const content = instruction.slice(match[0].length)

    return { frontMatter, content, hasFrontMatter: true }
  } catch (e) {
    console.error('[parseFrontMatter] Invalid YAML:', e)
    return { frontMatter: {}, content: instruction, hasFrontMatter: false }
  }
}

/**
 * Simple YAML parser for front matter
 * Handles basic key-value pairs and nested objects
 *
 * @param yaml - YAML string to parse
 * @returns Parsed object
 */
function parseSimpleYaml(yaml: string): ParsedFrontMatter {
  const result: ParsedFrontMatter = {}
  const lines = yaml.split('\n')
  const stack: { obj: Record<string, unknown>; indent: number }[] = [
    { obj: result, indent: -1 },
  ]

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue

    // Calculate indentation
    const indent = line.search(/\S/)
    const trimmed = line.trim()

    // Parse key-value
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.slice(0, colonIndex).trim()
    const rawValue = trimmed.slice(colonIndex + 1).trim()

    // Pop stack to find parent
    while (stack.length > 1 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop()
    }

    const parent = stack[stack.length - 1]!.obj

    if (rawValue === '' || rawValue === '|' || rawValue === '>') {
      // Nested object
      const nested: Record<string, unknown> = {}
      parent[key] = nested
      stack.push({ obj: nested, indent })
    } else {
      // Simple value
      parent[key] = parseYamlValue(rawValue)
    }
  }

  return result
}

/**
 * Parse a YAML value (string, number, boolean)
 */
function parseYamlValue(value: string): unknown {
  // Remove quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  // Boolean
  if (value.toLowerCase() === 'true') return true
  if (value.toLowerCase() === 'false') return false

  // Python-style boolean
  if (value === 'True') return true
  if (value === 'False') return false

  // Null
  if (value === 'null' || value === '~' || value === 'None') return null

  // Number
  const num = Number(value)
  if (!isNaN(num)) return num

  // String
  return value
}

// ============================================================================
// RETRY UTILITIES
// ============================================================================

/**
 * Delay execution for a specified time
 *
 * @param ms - Milliseconds to delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a function with exponential backoff retry
 *
 * @param fn - Function to execute
 * @param options - Retry options
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T | null>,
  options: {
    maxRetries?: number
    initialDelayMs?: number
    shouldRetry?: (result: T | null) => boolean
    onRetry?: (attempt: number, delayMs: number) => void
  } = {}
): Promise<T | null> {
  const {
    maxRetries = 5,
    initialDelayMs = 500,
    shouldRetry = result => result === null,
    onRetry,
  } = options

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 500ms, 1000ms, 2000ms, 4000ms
      const delayMs = initialDelayMs * Math.pow(2, attempt - 1)
      onRetry?.(attempt, delayMs)
      await delay(delayMs)
    }

    const result = await fn()

    if (!shouldRetry(result)) {
      return result
    }
  }

  return null
}

// ============================================================================
// MCP HELPERS
// ============================================================================

/**
 * Parse MCP response with nested structure
 *
 * @param result - Raw MCP response
 * @returns Parsed response data
 */
export function parseMCPResponse<T>(result: unknown): T {
  const r = result as Record<string, unknown>

  // Handle nested content[0].text structure
  if (r.content && Array.isArray(r.content) && r.content[0]?.text) {
    try {
      const parsed = JSON.parse(r.content[0].text as string)
      if (parsed.success) {
        return parsed as T
      }
      throw new Error(parsed.error || parsed.message || 'MCP call failed')
    } catch (parseError) {
      console.error('[parseMCPResponse] Parse error:', parseError)
      throw parseError
    }
  }

  // Direct response format
  if (r.success) {
    return r as T
  }

  throw new Error((r.error as string) || 'MCP call failed')
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a string looks like a valid UUID
 */
export function isValidUUID(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}

/**
 * Validate agent name format
 */
export function isValidAgentName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  // Must be 3-100 chars, alphanumeric with underscores/hyphens/spaces
  return /^[A-Za-z0-9_\- ]{3,100}$/.test(name)
}
