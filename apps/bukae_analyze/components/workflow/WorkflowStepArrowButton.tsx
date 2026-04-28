'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'

type Props = {
  direction: 'prev' | 'next'
  onClick?: () => void
  hidden?: boolean
  disabled?: boolean
}

export function WorkflowStepArrowButton({
  direction,
  onClick,
  hidden = false,
  disabled = false,
}: Props) {
  const label = direction === 'prev' ? '이전 단계' : '다음 단계'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-normal tracking-[-0.04em] leading-[1.4] text-white transition-colors hover:bg-white/8 focus-visible:outline-white/30"
      style={{
        fontSize: 'clamp(14px, 1.04vw, 20px)',
        width: 'clamp(160px, 6.25vw + 112px, 232px)',
        height: 'clamp(44px, 1.39vw + 33px, 60px)',
        opacity: hidden ? 0 : disabled ? 0.45 : 1,
        pointerEvents: hidden || disabled ? 'none' : 'auto',
      }}
      tabIndex={hidden ? -1 : 0}
    >
      {direction === 'prev' && <ArrowLeft style={{ width: 'clamp(16px,1.25vw,24px)', height: 'clamp(16px,1.25vw,24px)' }} className="shrink-0" strokeWidth={1.5} aria-hidden />}
      <span>{label}</span>
      {direction === 'next' && <ArrowRight style={{ width: 'clamp(16px,1.25vw,24px)', height: 'clamp(16px,1.25vw,24px)' }} className="shrink-0" strokeWidth={1.5} aria-hidden />}
    </button>
  )
}
