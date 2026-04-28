// src/core/prompt-builder.ts

import type { ConnectedSlot, DiscoveredTool } from './types.js'

const BASE_SYSTEM_PROMPT = `You are an expert MCP (Model Context Protocol) server developer.
Your job is to create complete, production-ready MCP servers using FastMCP for TypeScript.

## CRITICAL RULES - Use the CORRECT FastMCP API:
1. Constructor requires name AND version: new FastMCP({ name: "...", version: "1.0.0" })
2. Parameters MUST use Zod: parameters: z.object({ param: z.string().describe("...") })
3. Import zod: import { z } from 'zod';
4. For tools with no params: parameters: z.object({})
5. Start with: server.start({ transportType: "stdio" })

## Your Workflow:
1. **FIRST**: Use connected MCP slots to gather REAL information
2. **THEN**: Generate code based on REAL data, not assumptions
3. **FINALLY**: Save files using the storage slot

## Code Requirements:
- Generate REAL implementations with proper error handling
- Use TypeScript types derived from actual schemas
- NO TODOs or placeholders - implement real functionality
- Include proper validation and error messages`

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

  for (const [name, slot] of slotEntries) {
    prompt += `\n### ${name}\n\n`
    prompt += `${slot.instruction}\n\n`

    if (slot.tools.length > 0) {
      prompt += `**Tools disponíveis:**\n\n`

      for (const tool of slot.tools) {
        prompt += `- **${tool.name}**`
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
 */
export function buildUserPrompt(
  projectName: string,
  description: string,
  storageSlot: string,
  hasSlots: boolean = false
): string {
  const storageInstructions =
    hasSlots && storageSlot
      ? `3. FINALLY - Save all files using the "${storageSlot}" slot:
   - First call storage_create_project to create the project
   - Then call storage_save_file for each file`
      : `3. FINALLY - Write all files to the current directory using the Write tool:
   - Write each file using the Write tool
   - Use relative paths like "package.json", "src/main.ts", etc.`

  const gatherInfo = hasSlots
    ? `1. FIRST - Use connected MCP slots to gather real information:
   - Query database schemas to get real table structures
   - Read API docs to understand real endpoints
   - Search for code examples of similar implementations

`
    : ''

  return `Create a complete MCP server project.

## Project: ${projectName}

## Requirements:
${description}

## Steps:
${gatherInfo}2. Generate the project with these files:
   - package.json with dependencies: fastmcp, zod, dotenv
   - tsconfig.json for TypeScript
   - .env.example with required environment variables
   - src/main.ts with FastMCP server and ALL tools
   - Additional modules as needed

${storageInstructions}

## IMPORTANT:
- Generate accurate TypeScript types
- Implement complete functionality - NO TODOs or placeholders
- Write ALL files immediately - do not just describe them`
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
