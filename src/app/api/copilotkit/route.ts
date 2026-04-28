import { NextRequest } from 'next/server'
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  OpenAIAdapter,
} from '@copilotkit/runtime'
import OpenAI from 'openai'

import {
  analyzeFeedback,
  calculatePriority,
  checkDuplicates,
  detectPatterns,
  suggestResolution,
} from '@/features/atlas/api/feedback-backend-actions'

export async function POST(req: NextRequest) {
  // Validate Azure OpenAI configuration
  if (!process.env.AZURE_RESOURCE_NAME || !process.env.AZURE_OPENAI_API_KEY) {
    // eslint-disable-next-line no-console
    console.error('Azure OpenAI credentials are not configured')
    return new Response(
      JSON.stringify({
        error:
          'Azure OpenAI is not configured. Please set AZURE_RESOURCE_NAME and AZURE_OPENAI_API_KEY.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const instance = process.env.AZURE_RESOURCE_NAME
  const model = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'

  // Create Azure OpenAI client according to CopilotKit docs
  const openai = new OpenAI({
    apiKey,
    baseURL: `https://${instance}.openai.azure.com/openai/deployments/${model}`,
    defaultQuery: { 'api-version': apiVersion },
    defaultHeaders: { 'api-key': apiKey },
  })

  // Create adapter with Azure OpenAI client
  const serviceAdapter = new OpenAIAdapter({ openai })

  // Create runtime with backend actions for Feedback Hub
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feedbackActions: any[] = [
    {
      name: 'analyzeFeedback',
      description:
        'Analisa o conteúdo de um feedback e sugere categoria e severidade apropriadas',
      parameters: [
        {
          name: 'title',
          type: 'string',
          description: 'Título do feedback',
          required: true,
        },
        {
          name: 'description',
          type: 'string',
          description: 'Descrição detalhada do feedback',
          required: true,
        },
        {
          name: 'currentCategory',
          type: 'string',
          description: 'Categoria atual (se já definida)',
          required: false,
        },
      ],
      handler: async (args: {
        title: string
        description: string
        currentCategory?: string
      }) => {
        return await analyzeFeedback(
          args as Parameters<typeof analyzeFeedback>[0]
        )
      },
    },
    {
      name: 'detectFeedbackPatterns',
      description: 'Detecta padrões e tendências em uma lista de feedbacks',
      parameters: [
        {
          name: 'feedbacksJson',
          type: 'string',
          description:
            'JSON string com lista de feedbacks (array de objetos com id, title, description, category, createdAt)',
          required: true,
        },
      ],
      handler: async (args: { feedbacksJson: string }) => {
        const feedbacks = JSON.parse(args.feedbacksJson)
        return await detectPatterns({ feedbacks })
      },
    },
    {
      name: 'checkFeedbackDuplicates',
      description: 'Verifica se há feedbacks duplicados ou similares',
      parameters: [
        {
          name: 'title',
          type: 'string',
          description: 'Título do novo feedback',
          required: true,
        },
        {
          name: 'description',
          type: 'string',
          description: 'Descrição do novo feedback',
          required: true,
        },
        {
          name: 'existingFeedbacksJson',
          type: 'string',
          description:
            'JSON string com lista de feedbacks existentes (array de objetos com id, title, description)',
          required: true,
        },
      ],
      handler: async (args: {
        title: string
        description: string
        existingFeedbacksJson: string
      }) => {
        const existingFeedbacks = JSON.parse(args.existingFeedbacksJson)
        return await checkDuplicates({
          title: args.title,
          description: args.description,
          existingFeedbacks,
        })
      },
    },
    {
      name: 'calculateFeedbackPriority',
      description:
        'Calcula a prioridade de um feedback baseado em múltiplos fatores',
      parameters: [
        {
          name: 'category',
          type: 'string',
          description: 'Categoria do feedback',
          required: true,
        },
        {
          name: 'severity',
          type: 'string',
          description: 'Severidade (critical, high, medium, low)',
          required: true,
        },
        {
          name: 'impact',
          type: 'string',
          description: 'Impacto (organization, department, team, individual)',
          required: true,
        },
        {
          name: 'title',
          type: 'string',
          description: 'Título do feedback',
          required: true,
        },
        {
          name: 'description',
          type: 'string',
          description: 'Descrição do feedback',
          required: true,
        },
        {
          name: 'affectedUsers',
          type: 'number',
          description: 'Número de usuários afetados',
          required: false,
        },
        {
          name: 'isBlocking',
          type: 'boolean',
          description: 'Se é bloqueante',
          required: false,
        },
      ],
      handler: async (args: {
        category: string
        severity: string
        impact: string
        title: string
        description: string
        affectedUsers?: number
        isBlocking?: boolean
      }) => {
        return await calculatePriority(
          args as Parameters<typeof calculatePriority>[0]
        )
      },
    },
    {
      name: 'suggestFeedbackResolution',
      description:
        'Sugere passos de resolução para um feedback baseado em sua categoria',
      parameters: [
        {
          name: 'category',
          type: 'string',
          description: 'Categoria do feedback',
          required: true,
        },
        {
          name: 'severity',
          type: 'string',
          description: 'Severidade do feedback',
          required: true,
        },
        {
          name: 'title',
          type: 'string',
          description: 'Título do feedback',
          required: true,
        },
        {
          name: 'description',
          type: 'string',
          description: 'Descrição do feedback',
          required: true,
        },
      ],
      handler: async (args: {
        category: string
        severity: string
        title: string
        description: string
      }) => {
        return await suggestResolution(
          args as Parameters<typeof suggestResolution>[0]
        )
      },
    },
  ]

  const runtime = new CopilotRuntime({
    actions: feedbackActions,
  })

  // Use the correct endpoint handler
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  })

  return handleRequest(req)
}
