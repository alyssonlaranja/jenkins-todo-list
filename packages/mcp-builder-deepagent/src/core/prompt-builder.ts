// src/core/prompt-builder.ts

import type { ConnectedSlot } from './types.js'

/**
 * Base system prompt for MCP server generation
 *
 * Note: DeepAgent has built-in filesystem tools (write_file, edit_file, etc.)
 * so we use those instead of Claude's Write tool.
 */
const BASE_SYSTEM_PROMPT = `You are an expert MCP (Model Context Protocol) server developer.
Your job is to create complete, production-ready MCP servers using FastMCP for TypeScript.

## CRITICAL RULES - Use the CORRECT FastMCP API:
1. Constructor requires name AND version: new FastMCP({ name: "...", version: "1.0.0" })
2. Parameters MUST use Zod: parameters: z.object({ param: z.string().describe("...") })
3. Import zod: import { z } from 'zod';
4. For tools with no params: parameters: z.object({})
5. Start with: server.start({ transportType: "stdio" })

## Your Workflow:
1. **FIRST**: Use connected MCP slots to gather REAL information (if available)
2. **THEN**: Generate code based on REAL data, not assumptions
3. **FINALLY**: Save all files using the write_file tool

## Code Requirements:
- Generate REAL implementations with proper error handling
- Use TypeScript types derived from actual schemas
- NO TODOs or placeholders - implement real functionality
- Include proper validation and error messages

## File System Instructions:
Since file system tools are not available through the backend, create files by providing their complete content in your response.

**FORMAT FOR EACH FILE:**
\`\`\`
File: [relative-path]
\`\`\`
[complete file content]
\`\`\`

**EXAMPLE:**
\`\`\`
File: package.json
\`\`\`
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/server.js"
}
\`\`\`

**REQUIREMENTS:**
- Include ALL necessary files for a complete MCP server project
- Use relative paths from the project root
- Provide complete, working implementations (no TODOs)
- Follow the MCP specification exactly`

/**
 * Build system prompt with slot context
 */
export function buildSystemPrompt(
  slots: Record<string, ConnectedSlot>
): string {
  const slotEntries = Object.entries(slots).filter(
    ([_, slot]) => slot.status === 'connected'
  )

  if (slotEntries.length === 0) {
    return BASE_SYSTEM_PROMPT
  }

  let prompt = BASE_SYSTEM_PROMPT + '\n\n## Connected MCP Slots\n'
  prompt += 'You have access to tools from the following MCP servers:\n'

  for (const [name, slot] of slotEntries) {
    prompt += `\n### ${name}\n\n`
    prompt += `${slot.instruction}\n\n`

    if (slot.tools.length > 0) {
      prompt += `**Tools disponíveis (prefixed with "${name}__"):**\n\n`

      for (const tool of slot.tools) {
        prompt += `- **${name}__${tool.name}**`
        if (tool.description) {
          prompt += ` - ${tool.description}`
        }
        prompt += '\n'

        // Add custom instruction if exists
        const customInstruction = slot.toolInstructions?.[tool.name]
        if (customInstruction) {
          prompt += `  → ${customInstruction.instruction}\n`
        }

        // Add schema summary
        prompt += `  Schema: ${formatSchema(tool.inputSchema)}\n`
      }
    }
  }

  return prompt
}

/**
 * Build user prompt for project generation
 *
 * Uses DeepAgent's built-in write_file tool for saving files.
 */
export function buildUserPrompt(
  projectName: string,
  description: string,
  outputDir: string,
  hasSlots: boolean = false
): string {
  const gatherInfo = hasSlots
    ? `1. FIRST - Use connected MCP slot tools to gather real information:
   - Query database schemas to get real table structures
   - Read API docs to understand real endpoints
   - Search for code examples of similar implementations

`
    : ''

  return `Create a complete MCP server project.

## Project: ${projectName}

## Output Directory: ${outputDir}

## Requirements:
${description}

## Steps:
${gatherInfo}2. Generate the project with these files:
   - ${outputDir}/package.json with dependencies: fastmcp, zod, dotenv
   - ${outputDir}/tsconfig.json for TypeScript
   - ${outputDir}/.env.example with required environment variables
   - ${outputDir}/src/main.ts with FastMCP server and ALL tools
   - Additional modules as needed in ${outputDir}/src/

3. FINALLY - Save all files using the write_file tool:
   - Use the write_file tool for each file
   - Use the full path: ${outputDir}/filename

## IMPORTANT:
- Generate accurate TypeScript types
- Implement complete functionality - NO TODOs or placeholders
- Write ALL files immediately using write_file - do not just describe them
- Use the exact paths shown above with the ${outputDir} prefix`
}

/**
 * Format schema for display
 */
function formatSchema(schema: Record<string, unknown>): string {
  if (!schema || typeof schema !== 'object') {
    return '{}'
  }

  const props = schema.properties as Record<string, unknown> | undefined
  if (!props) {
    return '{}'
  }

  const parts: string[] = []
  for (const [key, value] of Object.entries(props)) {
    const type = (value as { type?: string })?.type || 'unknown'
    parts.push(`${key}: ${type}`)
  }

  return `{ ${parts.join(', ')} }`
}
