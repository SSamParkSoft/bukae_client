'use client'

import { ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type NextStepButtonState = 
  | 'default' 
  | 'disabled' 
  | 'ai-script' 
  | 'ai-script-loading'

interface NextStepButtonProps {
  state?: NextStepButtonState
  onClick?: () => void
  className?: string
  children?: React.ReactNode
}

export default function NextStepButton({
  state = 'default',
  onClick,
  className,
  children,
}: NextStepButtonProps) {
  const getButtonContent = () => {
    switch (state) {
      case 'ai-script':
        return (
          <>
            <Sparkles className="w-6 h-6" />
            <span className="text-2xl font-bold">AI 스크립트 생성</span>
          </>
        )
      case 'ai-script-loading':
        return (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-2xl font-bold">AI 스크립트 생성 중</span>
          </>
        )
      case 'disabled':
        return (
          <>
            <span className="text-2xl font-bold text-[#234b60]">다음 단계</span>
            <ArrowRight className="w-6 h-6 text-[#234b60]" />
          </>
        )
      default:
        return (
          <>
            <span className="text-2xl font-bold text-white">다음 단계</span>
            <ArrowRight className="w-6 h-6 text-white" />
          </>
        )
    }
  }

  return (
    <Button
      onClick={onClick}
      disabled={state === 'disabled' || state === 'ai-script-loading'}
      className={cn(
        'w-full h-[82px] rounded-2xl gap-2',
        state === 'default' || state === 'ai-script'
          ? 'bg-[#5e8790] text-white hover:bg-[#5e8790]/90'
          : 'bg-[#e4eeed] text-[#234b60] hover:bg-[#e4eeed]/90 opacity-70 cursor-not-allowed',
        className
      )}
    >
      {children || getButtonContent()}
    </Button>
  )
}
