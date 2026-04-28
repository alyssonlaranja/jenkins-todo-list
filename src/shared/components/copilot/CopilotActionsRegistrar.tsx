'use client'

import { useMemo } from 'react'
import { useCopilotAction } from '@copilotkit/react-core'

import type { ActionDescription } from '@/agents/shared/types/unified-config'

export type ActionHandler<T = unknown> = (args: T) => Promise<string> | string

export type ActionRender<T = unknown> = (props: {
  args: Partial<T>
  status: 'executing' | 'complete'
  result?: string
}) => React.ReactNode

export type ActionRenderHITL<T = unknown> = (props: {
  args: Partial<T>
  status: 'executing' | 'complete'
  respond?: (response: unknown) => void
}) => React.ReactNode

export interface ActionHandlerEntry<T = unknown> {
  execute: ActionHandler<T>
  render?: ActionRender<T>
  renderHITL?: ActionRenderHITL<T>
}

export type ActionHandlerRegistry = Record<string, ActionHandlerEntry>

interface CopilotActionsRegistrarProps {
  descriptions: ActionDescription[]
  handlers: ActionHandlerRegistry
}

export function CopilotActionsRegistrar({
  descriptions,
  handlers,
}: CopilotActionsRegistrarProps) {
  const actionsToRegister = useMemo(() => {
    return descriptions.filter(desc => handlers[desc.name])
  }, [descriptions, handlers])

  return (
    <>
      {actionsToRegister.map(desc => (
        <ActionRegistration
          key={desc.name}
          description={desc}
          handler={handlers[desc.name]}
        />
      ))}
    </>
  )
}

function ActionRegistration({
  description,
  handler,
}: {
  description: ActionDescription
  handler: ActionHandlerEntry
}) {
  useCopilotAction({
    name: description.name,
    description: description.description,
    parameters: description.parameters.map(p => ({
      name: p.name,
      type: p.type as 'string' | 'number' | 'boolean' | 'object' | 'string[]',
      description: p.description,
      required: p.required,
      enum: p.enum,
      attributes: p.attributes?.map(a => ({
        name: a.name,
        type: a.type as 'string' | 'number' | 'boolean',
        description: a.description,
        required: a.required,
      })),
    })),
    handler: async args => {
      return handler.execute(args)
    },
    render: handler.render
      ? ({ args, status, result }) => handler.render!({ args, status, result })
      : undefined,
    renderAndWaitForResponse:
      description.isHITL && handler.renderHITL
        ? ({ args, status, respond }) =>
            handler.renderHITL!({ args, status, respond })
        : undefined,
  })

  return null
}

export default CopilotActionsRegistrar
