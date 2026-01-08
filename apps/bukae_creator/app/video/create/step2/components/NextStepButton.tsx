'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NextStepButtonProps {
  onClick: () => void
}

export const NextStepButton = memo(function NextStepButton({
  onClick,
}: NextStepButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-end pt-4"
    >
      <Button
        onClick={onClick}
        size="lg"
        className="gap-2"
        data-next-step-button
      >
        다음 단계
        <ArrowRight className="w-5 h-5" />
      </Button>
    </motion.div>
  )
})
