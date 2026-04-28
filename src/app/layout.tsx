import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import localFont from 'next/font/local'
import { headers } from 'next/headers'

import { DynamicTitle } from '@/shared/components/dynamic-title'
import { AuthProvider } from '@/shared/components/providers/auth-provider'
import { RuntimeConfigProvider } from '@/shared/components/providers/runtime-config-provider'
import { ThemeProvider } from '@/shared/components/providers/theme-provider'
import { SessionEnvironmentCleanup } from '@/shared/components/session-environment-cleanup'
import { Toaster } from '@/shared/components/ui/sonner'
import type { SupportedLanguage } from '@/shared/i18n'
import { I18nProvider } from '@/shared/i18n/core/provider'
import { detectServerLanguage } from '@/shared/i18n/server/language-detector'

import './globals.css'

const segoeUI = localFont({
  src: [
    {
      path: '../shared/fonts/segoe-ui.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../shared/fonts/segoe-ui-bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-segoe-ui',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s',
    default: 'Avanade SDA2',
  },
  description: 'Avanade SDA2 - Software Development Assistant',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Get initial language from server-side header detection (Next.js 15 compatible)
  let initialLanguage: SupportedLanguage = 'en' // Default fallback

  try {
    const headersList = await headers()
    const cookieHeader = headersList.get('cookie')

    // Only call detectServerLanguage if we have a valid cookie header
    if (cookieHeader) {
      initialLanguage = detectServerLanguage(cookieHeader)
    }
  } catch {
    // Silent fallback to default language
    // Headers may not be available in all contexts (e.g., during build)
    initialLanguage = 'en'
  }

  return (
    <html lang={initialLanguage} suppressHydrationWarning>
      <body
        className={`${segoeUI.variable} ${geistMono.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <I18nProvider initialLanguage={initialLanguage}>
          <RuntimeConfigProvider>
            <AuthProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="avanade"
                enableSystem={false}
                disableTransitionOnChange
                storageKey="cockpit-mcp-theme"
                themes={['light', 'dark', 'avanade', 'bv']}
              >
                <DynamicTitle />
                <SessionEnvironmentCleanup />
                {children}
                <Toaster />
              </ThemeProvider>
            </AuthProvider>
          </RuntimeConfigProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
