import dotenv from 'dotenv'
import { FastMCP } from 'fastmcp'
import { z } from 'zod'

dotenv.config()

const server = new FastMCP({
  name: process.env.SERVER_NAME || 'simple-test-mcp-server',
  version: process.env.SERVER_VERSION || '1.0.0',
})

server.addTool({
  name: 'echo',
  description: 'Echoes the input string',
  parameters: z.object({
    message: z.string().describe('The message to echo'),
  }),
  execute: async ({ message }) => {
    return message
  },
})

server.addTool({
  name: 'reverse',
  description: 'Reverses the input string',
  parameters: z.object({
    text: z.string().describe('The text to reverse'),
  }),
  execute: async ({ text }) => {
    return text.split('').reverse().join('')
  },
})

server.start({ transportType: process.env.TRANSPORT_TYPE || 'stdio' })
