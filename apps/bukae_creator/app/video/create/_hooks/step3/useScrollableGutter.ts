'use client'

import { useEffect, useRef, useState } from 'react'

interface UseScrollableGutterOptions {
  scrollThreshold?: number
}

export function useScrollableGutter(options?: UseScrollableGutterOptions) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [showScrollGutter, setShowScrollGutter] = useState(false)
  const scrollThreshold = options?.scrollThreshold ?? 1

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const updateGutterVisibility = () => {
      const hasScrollableContent = el.scrollHeight > el.clientHeight + scrollThreshold
      const isActuallyScrolled = el.scrollTop > 0
      setShowScrollGutter(hasScrollableContent && isActuallyScrolled)
    }

    updateGutterVisibility()

    el.addEventListener('scroll', updateGutterVisibility)

    const resizeObserver = new ResizeObserver(() => {
      updateGutterVisibility()
    })
    resizeObserver.observe(el)

    return () => {
      el.removeEventListener('scroll', updateGutterVisibility)
      resizeObserver.disconnect()
    }
  }, [scrollThreshold])

  return {
    scrollContainerRef,
    showScrollGutter,
  }
}
