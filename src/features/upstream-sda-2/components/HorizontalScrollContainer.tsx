'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

interface HorizontalScrollContainerProps {
  children: React.ReactNode
  className?: string
  arrowClassName?: string
  scrollAmount?: number
}

/**
 * Container com scroll horizontal e setas de navegação
 * As setas aparecem apenas quando há conteúdo para scrollar
 */
export function HorizontalScrollContainer({
  children,
  className,
  arrowClassName,
  scrollAmount = 200,
}: HorizontalScrollContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    // Verificar inicialmente
    checkScroll()

    // Observer para mudanças de tamanho
    const resizeObserver = new ResizeObserver(checkScroll)
    resizeObserver.observe(el)

    // Mutation observer para mudanças de conteúdo
    const mutationObserver = new MutationObserver(checkScroll)
    mutationObserver.observe(el, { childList: true, subtree: true })

    // Listener de scroll
    el.addEventListener('scroll', checkScroll)

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      el.removeEventListener('scroll', checkScroll)
    }
  }, [checkScroll])

  const scrollTo = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return

    const amount = direction === 'left' ? -scrollAmount : scrollAmount
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }

  const arrowButtonClass = cn(
    'absolute top-1/2 z-10 -translate-y-1/2 flex size-7 items-center justify-center rounded-full bg-background/90 shadow-md border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background transition-all',
    arrowClassName
  )

  return (
    <div className="relative flex items-center">
      {/* Seta esquerda */}
      {canScrollLeft && (
        <button
          onClick={() => scrollTo('left')}
          className={cn(arrowButtonClass, 'left-0')}
          aria-label="Scroll para esquerda"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}

      {/* Container de scroll */}
      <div
        ref={scrollRef}
        className={cn(
          'scrollbar-hide flex items-center gap-1 overflow-x-auto',
          canScrollLeft && 'pl-8',
          canScrollRight && 'pr-8',
          className
        )}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {children}
      </div>

      {/* Seta direita */}
      {canScrollRight && (
        <button
          onClick={() => scrollTo('right')}
          className={cn(arrowButtonClass, 'right-0')}
          aria-label="Scroll para direita"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  )
}
