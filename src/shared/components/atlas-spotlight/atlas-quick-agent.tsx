'use client'

/**
 * AtlasQuickAgent
 *
 * A floating CopilotKit-powered agent that can be opened from anywhere.
 * Has its own isolated CopilotKit provider to avoid conflicts with module providers.
 *
 * NOTE: Context is gathered OUTSIDE CopilotKit and passed via instructions
 * to avoid infinite re-render loops from hooks inside the provider.
 *
 * IMPORTANT: Uses useProxyMCP hook for proper MCP connection handling.
 * The callTool function is injected into actions to ensure headers are always available.
 *
 * ACTIONS: The agent can:
 * - Navigate to different pages/modules
 * - Create signals (insights, feedbacks, alerts)
 * - Search and read MCP artifacts
 */
import { useCallback, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { CopilotKit } from '@copilotkit/react-core'
import { CopilotChat } from '@copilotkit/react-ui'

import '@copilotkit/react-ui/styles.css'

import { Globe } from 'lucide-react'

import { useConnectionManager } from '@/features/connections/hooks/use-connection-manager'
import { useProxyMCP } from '@/shared/hooks/use-proxy-mcp'
import { cn } from '@/shared/lib/utils'

import { Button } from '../ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { AtlasQuickAgentActions } from './copilot-actions'

// ============================================================================
// MAIN COMPONENT - Context gathered BEFORE CopilotKit
// ============================================================================

interface AtlasQuickAgentProps {
  className?: string
}

export function AtlasQuickAgent({ className }: AtlasQuickAgentProps) {
  const { connections } = useConnectionManager()
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [signalCount, setSignalCount] = useState(0)

  const isConnected = connections.some(c => c.id === 'session-connection')
  const connection = connections.find(c => c.id === 'session-connection')

  // Use useProxyMCP hook for proper connection handling
  // This ensures headers are built correctly from the environment store
  const { callTool, connected: mcpConnected } = useProxyMCP({
    namespace: connection?.environmentRef?.namespaceName || 'disabled',
    autoConnect: true,
    skipToolsDiscovery: true, // Skip tools/list to save latency
    connection: connection || null,
  })

  // Detect current module from pathname
  const currentModule = useMemo(() => {
    if (pathname.includes('/upstream')) return 'upstream'
    if (pathname.includes('/downstream')) return 'downstream'
    if (pathname.includes('/migration')) return 'migration'
    if (pathname.includes('/onboarding')) return 'onboarding'
    if (pathname.includes('/atlas')) return 'atlas'
    if (pathname.includes('/messages')) return 'messages'
    return 'dashboard'
  }, [pathname])

  // Build dynamic instructions with context
  const instructions = useMemo(() => {
    const userName = session?.user?.name || 'Usuario'
    const userEmail = session?.user?.email || ''
    const namespace = connection?.environmentRef?.namespaceName || ''
    const license = connection?.environmentRef?.licenseName || ''

    return `Voce e o Atlas, um assistente pessoal inteligente com capacidades avancadas.

CONTEXTO ATUAL:
- Usuario: ${userName} (${userEmail})
- Modulo atual: ${currentModule}
- Pagina: ${pathname}
- Namespace: ${namespace}
- License: ${license}

SUAS CAPACIDADES (use as actions disponiveis!):

1. TAREFAS PESSOAIS (Kanban pessoal - NOVIDADE!)
   - createTask: Cria uma tarefa pessoal (titulo, descricao, prioridade, data)
   - listMyTasks: Lista suas tarefas, opcionalmente filtrando por status
   - completeTask: Marca uma tarefa como concluida
   - moveTask: Move tarefa para outro status (backlog, todo, in_progress, review, done)
   - deleteTask: Remove uma tarefa
   
   EXEMPLOS:
   - "Criar tarefa para revisar documento" -> use createTask
   - "Quais sao minhas tarefas?" -> use listMyTasks
   - "Terminei a tarefa de revisar" -> use completeTask
   - "Mover tarefa X para em progresso" -> use moveTask

2. NAVEGACAO (navigateToPage)
   - Leve o usuario para qualquer modulo: dashboard, upstream, downstream, migration, onboarding, atlas, messages, settings
   - Exemplo: "Me leve para o upstream" -> use navigateToPage

3. CRIAR SIGNALS (createSignal)
   - Capture insights, feedbacks ou alertas do usuario
   - Tipos: insight, feedback, message
   - Categorias: discovery, pattern, opportunity, risk, bug, feature, improvement, innovation, note, alert
   - Prioridades: low, medium, high, critical
   - SEMPRE use esta action quando o usuario compartilhar algo que merece ser registrado

4. ARTEFATOS MCP
   - listArtifacts: Liste todos artefatos do namespace
   - searchArtifacts: Busque artefatos por termo
   - readArtifact: Leia o conteudo de um artefato

5. LISTAR SIGNALS (listSignals)
   - Liste signals existentes, filtrando por tipo se necessario

6. LISTAR FEEDBACKS (listFeedbacks)
   - Liste feedbacks do Feedback Hub com cards visuais
   - Pode filtrar por status, categoria, severidade

SUGESTOES POR MODULO:
${
  currentModule === 'upstream'
    ? '- Capture insights de produto, ideias de features, descobertas de pesquisa\n- Crie tarefas para acompanhar proximos passos'
    : currentModule === 'downstream'
      ? '- Capture feedback de implementacao, issues tecnicos, melhorias de processo\n- Crie tarefas para itens a resolver'
      : currentModule === 'migration'
        ? '- Capture blockers de migracao, riscos, aprendizados\n- Crie tarefas para acompanhar progresso'
        : currentModule === 'onboarding'
          ? '- Capture feedback de treinamento, gaps de documentacao\n- Crie tarefas para revisar conteudos'
          : '- Capture feedback geral, ideias, ou questoes\n- Crie tarefas para organizar seu dia'
}

IMPORTANTE:
- Responda sempre em portugues
- Seja proativo: quando o usuario mencionar algo para fazer, ofereca criar uma tarefa
- Quando detectar algo que merece ser registrado, use createSignal
- Use navigateToPage quando o usuario pedir para ir a algum lugar
- Use as actions de artefatos quando o usuario perguntar sobre documentos/templates
- Tarefas sao PESSOAIS - so o usuario ve as proprias tarefas`
  }, [
    session?.user?.name,
    session?.user?.email,
    currentModule,
    pathname,
    connection?.environmentRef?.namespaceName,
    connection?.environmentRef?.licenseName,
  ])

  const handleSignalCreated = useCallback(() => {
    setSignalCount(prev => prev + 1)
  }, [])

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path)
      setIsOpen(false)
    },
    [router]
  )

  // Stable props for actions component (gathered OUTSIDE CopilotKit)
  // Key change: Pass callTool from useProxyMCP instead of building headers manually
  const actionsProps = useMemo(
    () => ({
      userName: session?.user?.name || 'Usuario',
      userEmail: session?.user?.email || '',
      currentModule,
      pathname,
      isConnected: isConnected && mcpConnected,
      namespaceId: connection?.environmentRef?.namespaceId,
      namespaceName: connection?.environmentRef?.namespaceName,
      licenseId: connection?.environmentRef?.licenseId,
      licenseName: connection?.environmentRef?.licenseName,
      callMCPTool: mcpConnected ? callTool : undefined, // Inject callTool from useProxyMCP
      onNavigate: handleNavigate,
      onSignalCreated: handleSignalCreated,
    }),
    [
      session?.user?.name,
      session?.user?.email,
      currentModule,
      pathname,
      isConnected,
      mcpConnected,
      callTool,
      connection?.environmentRef?.namespaceId,
      connection?.environmentRef?.namespaceName,
      connection?.environmentRef?.licenseId,
      connection?.environmentRef?.licenseName,
      handleNavigate,
      handleSignalCreated,
    ]
  )

  if (!isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('size-9 cursor-not-allowed opacity-50', className)}
              disabled
            >
              <Globe className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Conecte-se para usar o Atlas Agent
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button
                variant={isOpen ? 'default' : 'ghost'}
                size="icon"
                className={cn('relative size-9', className)}
              >
                <Globe className="size-5" />
                {signalCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {signalCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Atlas Quick Agent</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SheetContent
        side="right"
        className="flex w-[550px] flex-col p-0 sm:w-[600px] lg:w-[700px]"
      >
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Globe className="size-5 text-primary" />
            <SheetTitle>Atlas Quick Agent</SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Capture insights, feedbacks e ideias
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden pb-4">
          {isOpen && (
            <CopilotKit runtimeUrl="/api/copilotkit" showDevConsole={false}>
              {/* Register actions - receives context as props to avoid loops */}
              <AtlasQuickAgentActions {...actionsProps} />
              <CopilotChat
                className="h-full px-2"
                instructions={instructions}
                labels={{
                  title: 'Atlas',
                  initial:
                    'Ola! Sou o Atlas, seu assistente pessoal. Posso ajudar voce a:\n\n✅ Gerenciar suas tarefas pessoais (criar, listar, completar)\n📝 Capturar insights, feedbacks ou ideias\n🧭 Navegar para outras paginas\n📚 Buscar e ler artefatos\n\nO que gostaria de fazer?',
                }}
              />
            </CopilotKit>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default AtlasQuickAgent
