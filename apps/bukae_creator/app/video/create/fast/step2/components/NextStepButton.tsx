'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'

interface NextStepButtonProps {
  onClick: () => void
  state?: 'default' | 'disabled' | 'ai-script-loading'
}

export const NextStepButton = memo(function NextStepButton({
  onClick,
  state = 'default',
}: NextStepButtonProps) {
  const isDisabled = state === 'disabled' || state === 'ai-script-loading'
  const isLoading = state === 'ai-script-loading'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-end pt-4"
    >
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        className="w-full h-14 sm:h-[82px] rounded-2xl bg-[#5e8790] text-white hover:bg-[#5e8790]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[var(--shadow-card-default)]"
        data-next-step-button
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <span 
              className="font-bold tracking-[-0.48px]"
              style={{ 
                fontSize: 'var(--font-size-24)',
                lineHeight: '33.6px'
              }}
            >
              다음 단계
            </span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </motion.div>
  )
})
