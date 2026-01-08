'use client'

import { memo } from 'react'
import { Loader2 } from 'lucide-react'

export const LoadingIndicator = memo(function LoadingIndicator() {
  return (
    <div className="my-20 flex items-center justify-center gap-6">
      <Loader2 className="w-6 h-6 animate-spin text-[#15252c]" />
      <span 
        className="font-bold text-[#15252c] tracking-[-0.64px] leading-[var(--line-height-32-140)]"
        style={{ fontSize: 'var(--font-size-32)' }}
      >
        AI가 상품을 분석중이에요
      </span>
    </div>
  )
})
