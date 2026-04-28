'use client'

import { useMemo } from 'react'
import { useCopilotReadable } from '@copilotkit/react-core'

import type { ReadableDescription } from '@/agents/shared/types/unified-config'

export type ReadableDataProvider<T = unknown> = () => T

export type ReadableDataProviderRegistry = Record<string, ReadableDataProvider>

interface CopilotReadablesRegistrarProps {
  descriptions: ReadableDescription[]
  dataProviders: ReadableDataProviderRegistry
}

export function CopilotReadablesRegistrar({
  descriptions,
  dataProviders,
}: CopilotReadablesRegistrarProps) {
  const readablesToRegister = useMemo(() => {
    return descriptions.filter(desc => dataProviders[desc.contextKey])
  }, [descriptions, dataProviders])

  return (
    <>
      {readablesToRegister.map(desc => (
        <ReadableRegistration
          key={desc.key}
          description={desc}
          dataProvider={dataProviders[desc.contextKey]}
        />
      ))}
    </>
  )
}

function ReadableRegistration({
  description,
  dataProvider,
}: {
  description: ReadableDescription
  dataProvider: ReadableDataProvider
}) {
  const value = dataProvider()

  useCopilotReadable({
    description: description.description,
    value,
  })

  return null
}

export default CopilotReadablesRegistrar
