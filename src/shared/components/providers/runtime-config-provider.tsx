'use client'

import { useEffect, useState } from 'react'

import type { RuntimeConfig } from '@/shared/types/runtime-config'

interface RuntimeConfigProviderProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

// Traduções locais para o provider de configuração (renderiza antes do i18n)
const translations = {
  en: {
    configError: 'Configuration Error',
    configErrorDesc: 'Could not load system configuration.',
    tryAgain: 'Try again',
    loadingConfig: 'Loading configuration...',
  },
  'pt-BR': {
    configError: 'Erro de Configuração',
    configErrorDesc: 'Não foi possível carregar a configuração do sistema.',
    tryAgain: 'Tentar novamente',
    loadingConfig: 'Carregando configuração...',
  },
}

// Detectar idioma do cookie ou usar pt-BR como padrão
function detectLanguage(): 'en' | 'pt-BR' {
  if (typeof document === 'undefined') return 'pt-BR'
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('i18next-language='))
  const lang = cookie?.split('=')[1]
  return lang === 'en' ? 'en' : 'pt-BR'
}

/**
 * Provider que garante que a configuração runtime está carregada antes de renderizar os filhos.
 *
 * Em produção com Next.js standalone, as variáveis NEXT_PUBLIC_* são embutidas no build-time.
 * Este provider carrega as configurações do endpoint /api/config que lê as variáveis em runtime.
 *
 * Isso resolve o problema de variáveis de ambiente não estarem disponíveis no cliente
 * quando o container é iniciado com variáveis definidas após o build.
 */
export function RuntimeConfigProvider({
  children,
  fallback,
}: RuntimeConfigProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lang = detectLanguage()
  const t = translations[lang]

  useEffect(() => {
    async function loadConfig() {
      // Verificar se já tem config no sessionStorage
      const cachedConfig = sessionStorage.getItem('runtime-config')
      if (cachedConfig) {
        try {
          const config = JSON.parse(cachedConfig) as RuntimeConfig
          if (config.apiUrl) {
            setIsReady(true)
            return
          }
        } catch {
          // Cache inválido, limpar e buscar novamente
          sessionStorage.removeItem('runtime-config')
        }
      }

      // Buscar config do endpoint
      try {
        const response = await fetch('/api/config')
        if (!response.ok) {
          throw new Error(`Failed to load config: ${response.status}`)
        }

        const config = (await response.json()) as RuntimeConfig

        // Validar que temos pelo menos a URL da API
        if (!config.apiUrl) {
          console.warn(
            '[RuntimeConfigProvider] apiUrl não configurada no servidor'
          )
        }

        // Cachear no sessionStorage
        sessionStorage.setItem('runtime-config', JSON.stringify(config))
        setIsReady(true)
      } catch (err) {
        console.error('[RuntimeConfigProvider] Erro ao carregar config:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      }
    }

    loadConfig()
  }, [])

  // Mostrar erro se falhou ao carregar
  if (error) {
    return (
      fallback || (
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-600">
              {t.configError}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{t.configErrorDesc}</p>
            <p className="mt-1 text-xs text-gray-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {t.tryAgain}
            </button>
          </div>
        </div>
      )
    )
  }

  // Mostrar loading enquanto carrega
  if (!isReady) {
    return (
      fallback || (
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mx-auto size-8 animate-spin rounded-full border-b-2 border-[#FF6600]" />
            <p className="mt-2 text-sm text-gray-600">{t.loadingConfig}</p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
