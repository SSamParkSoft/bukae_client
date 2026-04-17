'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'

type Props = {
  direction: 'prev' | 'next'
  onClick?: () => void
  hidden?: boolean
}

export function StepNavButton({ direction, onClick, hidden = false }: Props) {
  const label = direction === 'prev' ? '이전 단계' : '다음 단계'

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-20-rg text-white transition-colors hover:bg-white/8 focus-visible:outline-white/30"
      style={{
        width: 'clamp(160px, 6.25vw + 112px, 232px)',
        height: 'clamp(44px, 1.39vw + 33px, 60px)',
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
      }}
      tabIndex={hidden ? -1 : 0}
    >
      {direction === 'prev' && <ArrowLeft className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />}
      <span>{label}</span>
      {direction === 'next' && <ArrowRight className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />}
    </button>
  )
}
