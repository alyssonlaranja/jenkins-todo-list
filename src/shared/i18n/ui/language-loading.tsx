'use client'

/**
 * Minimal loading UI while i18n initializes to avoid layout shift / flash.
 */
export function LanguageLoading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex items-center space-x-1 opacity-30">
        <div className="size-1 animate-pulse rounded-full bg-muted-foreground" />
        <div className="animation-delay-200 size-1 animate-pulse rounded-full bg-muted-foreground" />
        <div className="animation-delay-400 size-1 animate-pulse rounded-full bg-muted-foreground" />
      </div>
    </div>
  )
}
