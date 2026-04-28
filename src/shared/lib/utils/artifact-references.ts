/**
 * Artifact Reference Detection Utilities
 *
 * Detects artifact references in Utility Agent instructions using two patterns:
 * 1. ${KEY} - Simple placeholder syntax
 * 2. <cockpit-artifact key="KEY" accessibility="LICENSE|NAMESPACE"> - XML tag syntax
 *
 * Used for migration to identify artifact dependencies
 */

/**
 * Extracts artifact keys from XML <cockpit-artifact> tags
 *
 * @param instruction - The instruction text containing XML tags
 * @returns Array of unique artifact keys from XML tags
 *
 * @example
 * ```typescript
 * const instruction = `
 * Use this artifact:
 * <cockpit-artifact key="AVANADE_MASTER_FULL_PROMPT_MD" accessibility="LICENSE">
 * </cockpit-artifact>
 * And this one:
 * <cockpit-artifact key="AZURE_DEVOPS_CONFIG" accessibility="NAMESPACE">
 * </cockpit-artifact>
 * `
 *
 * const refs = extractXmlArtifactReferences(instruction)
 * // refs = ['AVANADE_MASTER_FULL_PROMPT_MD', 'AZURE_DEVOPS_CONFIG']
 * ```
 */
export function extractXmlArtifactReferences(instruction: string): string[] {
  const keys = new Set<string>()

  // Regex to find <cockpit-artifact key="ANYTHING_HERE" accessibility="LICENSE|NAMESPACE">
  // Captures the key attribute value
  // Handles both self-closing tags and tags with closing tags
  const regex =
    /<cockpit-artifact\s+key="([^"]+)"\s+accessibility="(?:LICENSE|NAMESPACE)"[^>]*>/gi

  let match: RegExpExecArray | null
  while ((match = regex.exec(instruction)) !== null) {
    if (match[1]) {
      keys.add(match[1].trim())
    }
  }

  return Array.from(keys).sort()
}

/**
 * Extracts all ${KEY} references from an instruction
 * Works with Front Matter and instruction body
 *
 * @param instruction - The full instruction text (including Front Matter)
 * @returns Array of unique artifact keys referenced
 *
 * @example
 * ```typescript
 * const instruction = `
 * ---
 * azure_devops_pat: \${AZURE_DEVOPS_PAT}
 * url_neo4j: \${url-neo4j}
 * ---
 * Follow these guidelines:
 * \${CODE_REVIEW_GUIDELINES}
 * `
 *
 * const refs = extractDollarSignArtifactReferences(instruction)
 * // refs = ['AZURE_DEVOPS_PAT', 'CODE_REVIEW_GUIDELINES', 'url-neo4j']
 * ```
 */
export function extractDollarSignArtifactReferences(
  instruction: string
): string[] {
  const keys = new Set<string>()

  // Regex to find ${ANYTHING_HERE}
  // Captures: ANY characters except closing brace
  // Compatible with backend Python string.replace() behavior
  // Accepts: UPPERCASE, lowercase, hyphens, underscores, numbers, etc.
  const regex = /\$\{([^}]+)\}/g

  let match: RegExpExecArray | null
  while ((match = regex.exec(instruction)) !== null) {
    if (match[1]) {
      keys.add(match[1].trim()) // Add content inside ${}, trimmed
    }
  }

  return Array.from(keys).sort() // Sort alphabetically for consistency
}

/**
 * Extracts ALL artifact references from an instruction
 * Combines both ${KEY} and <cockpit-artifact> XML tag patterns
 *
 * @param instruction - The full instruction text
 * @returns Array of unique artifact keys from both patterns
 *
 * @example
 * ```typescript
 * const instruction = `
 * ---
 * azure_pat: \${AZURE_DEVOPS_PAT}
 * ---
 * <cockpit-artifact key="MASTER_PROMPT" accessibility="LICENSE">
 * </cockpit-artifact>
 * Follow: \${CODE_REVIEW_GUIDELINES}
 * `
 *
 * const refs = extractArtifactReferences(instruction)
 * // refs = ['AZURE_DEVOPS_PAT', 'CODE_REVIEW_GUIDELINES', 'MASTER_PROMPT']
 * ```
 */
export function extractArtifactReferences(instruction: string): string[] {
  const dollarSignRefs = extractDollarSignArtifactReferences(instruction)
  const xmlRefs = extractXmlArtifactReferences(instruction)

  // Merge and deduplicate
  const allKeys = new Set([...dollarSignRefs, ...xmlRefs])

  return Array.from(allKeys).sort()
}

/**
 * Checks if an instruction has XML artifact references
 *
 * @param instruction - The instruction text to check
 * @returns true if at least one <cockpit-artifact> tag exists
 */
export function hasXmlArtifactReferences(instruction: string): boolean {
  return /<cockpit-artifact\s+key="[^"]+"\s+accessibility="(?:LICENSE|NAMESPACE)"[^>]*>/i.test(
    instruction
  )
}

/**
 * Checks if an instruction has ${KEY} artifact references
 *
 * @param instruction - The instruction text to check
 * @returns true if at least one ${KEY} reference exists
 */
export function hasDollarSignArtifactReferences(instruction: string): boolean {
  return /\$\{[^}]+\}/.test(instruction)
}

/**
 * Checks if an instruction has any artifact references (both patterns)
 *
 * @param instruction - The instruction text to check
 * @returns true if at least one artifact reference exists (${KEY} or XML)
 */
export function hasArtifactReferences(instruction: string): boolean {
  return (
    hasDollarSignArtifactReferences(instruction) ||
    hasXmlArtifactReferences(instruction)
  )
}

/**
 * Counts how many unique XML artifact references exist
 *
 * @param instruction - The instruction text
 * @returns Number of unique <cockpit-artifact> tags
 */
export function countXmlArtifactReferences(instruction: string): number {
  return extractXmlArtifactReferences(instruction).length
}

/**
 * Counts how many unique ${KEY} artifact references exist
 *
 * @param instruction - The instruction text
 * @returns Number of unique ${KEY} references
 */
export function countDollarSignArtifactReferences(instruction: string): number {
  return extractDollarSignArtifactReferences(instruction).length
}

/**
 * Counts how many unique artifact references exist (both patterns)
 *
 * @param instruction - The instruction text
 * @returns Number of unique artifact references (${KEY} and XML combined)
 */
export function countArtifactReferences(instruction: string): number {
  return extractArtifactReferences(instruction).length
}

/**
 * Replaces ${KEY} references with actual values (for preview)
 * NOTE: This is for UI preview only. Actual replacement happens in backend.
 *
 * @param instruction - Instruction with ${KEY} references
 * @param artifacts - Map of key -> value
 * @returns Instruction with placeholders replaced
 */
export function previewArtifactSubstitution(
  instruction: string,
  artifacts: Record<string, string>
): string {
  let result = instruction

  Object.entries(artifacts).forEach(([key, value]) => {
    // Replace all occurrences of ${key} with value
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value)
  })

  return result
}

/**
 * Checks artifact references against recommended naming convention
 * Recommended: UPPERCASE_WITH_UNDERSCORES (e.g., API_KEY, AZURE_PAT)
 * But accepts any pattern for compatibility with backend
 *
 * @param instruction - Instruction to check
 * @returns References categorized by convention adherence
 */
export function validateArtifactReferences(instruction: string): {
  conventional: string[]
  nonConventional: string[]
  allReferences: string[]
} {
  const allMatches = instruction.match(/\$\{([^}]+)\}/g) || []
  const conventional: string[] = []
  const nonConventional: string[] = []

  allMatches.forEach(match => {
    const key = match.slice(2, -1).trim() // Remove ${ and }, trim spaces

    // Recommended convention: UPPERCASE, numbers, underscore only
    if (/^[A-Z0-9_]+$/.test(key)) {
      conventional.push(key)
    } else {
      nonConventional.push(key)
    }
  })

  return {
    conventional,
    nonConventional,
    allReferences: [...conventional, ...nonConventional],
  }
}

/**
 * Finds ${KEY} references in Front Matter specifically
 *
 * @param instruction - Full instruction with Front Matter
 * @returns Keys referenced in Front Matter only
 */
export function extractFrontMatterArtifactReferences(
  instruction: string
): string[] {
  // Extract Front Matter block
  const frontMatterMatch = instruction.match(/^---\n([\s\S]*?)\n---/)
  if (!frontMatterMatch || !frontMatterMatch[1]) return []

  const frontMatter = frontMatterMatch[1]
  return extractArtifactReferences(frontMatter)
}

/**
 * Finds ${KEY} references in instruction body (excluding Front Matter)
 *
 * @param instruction - Full instruction with Front Matter
 * @returns Keys referenced in instruction body only
 */
export function extractInstructionBodyArtifactReferences(
  instruction: string
): string[] {
  // Remove Front Matter block
  const withoutFrontMatter = instruction.replace(/^---\n[\s\S]*?\n---\n/, '')
  return extractArtifactReferences(withoutFrontMatter)
}

/**
 * Categorizes artifact references by location
 *
 * @param instruction - Full instruction
 * @returns References categorized by Front Matter vs body
 */
export function categorizeArtifactReferences(instruction: string): {
  frontMatter: string[]
  instructionBody: string[]
  both: string[]
  total: string[]
} {
  const frontMatterRefs = extractFrontMatterArtifactReferences(instruction)
  const bodyRefs = extractInstructionBodyArtifactReferences(instruction)
  const allRefs = extractArtifactReferences(instruction)

  const frontMatterSet = new Set(frontMatterRefs)
  const bodySet = new Set(bodyRefs)

  const both = allRefs.filter(
    ref => frontMatterSet.has(ref) && bodySet.has(ref)
  )

  return {
    frontMatter: frontMatterRefs.filter(ref => !bodySet.has(ref)),
    instructionBody: bodyRefs.filter(ref => !frontMatterSet.has(ref)),
    both,
    total: allRefs,
  }
}

/**
 * Categorizes artifact references by pattern type
 *
 * @param instruction - Full instruction
 * @returns References categorized by ${KEY} vs <cockpit-artifact> pattern
 */
export function categorizeArtifactReferencesByType(instruction: string): {
  dollarSign: string[]
  xml: string[]
  total: string[]
} {
  const dollarSignRefs = extractDollarSignArtifactReferences(instruction)
  const xmlRefs = extractXmlArtifactReferences(instruction)
  const allRefs = extractArtifactReferences(instruction)

  return {
    dollarSign: dollarSignRefs,
    xml: xmlRefs,
    total: allRefs,
  }
}
