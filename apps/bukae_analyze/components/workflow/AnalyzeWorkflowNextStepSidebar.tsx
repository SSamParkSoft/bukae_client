'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { LAYOUT } from '@/components/layout/layout-constants'
import { useAnalyzeWorkflowNextStep } from '@/components/workflow/useAnalyzeWorkflowNextStep'
import { WorkflowStepArrowButton } from '@/components/workflow/ui/WorkflowStepArrowButton'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'

const PT1_SAVE_STATUS_CARDS = [
  {
    title: '답변을 저장하고 있어요.',
    description: '잠시만 기다려주세요.',
  },
  {
    title: '다음 단계를 준비하고 있어요.',
    description: '저장이 끝나면 바로 이동할 수 있어요.',
  },
]

export function AnalyzeWorkflowNextStepSidebar() {
  const {
    shouldRenderNextStepButton,
    isNextStepButtonDisabled,
    advanceToNextWorkflowStep,
  } = useAnalyzeWorkflowNextStep()
  const isSavingPt1Answers = useAiPlanningStore((state) => state.isSavingPt1Answers)

  if (!shouldRenderNextStepButton) return null

  return (
    <aside
      className="relative shrink-0"
      style={{ width: LAYOUT.SIDEBAR_WIDTH }}
    >
      <div
        className="absolute left-0 right-0 flex flex-col items-center gap-3"
        style={{ bottom: LAYOUT.NAV_BUTTON_BOTTOM }}
      >
        <AnimatePresence>
          {isSavingPt1Answers ? (
            <motion.div
              key="pt1-save-status"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex w-[232px] flex-col gap-2"
            >
              {PT1_SAVE_STATUS_CARDS.map((card, index) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2, delay: index * 0.06, ease: 'easeOut' }}
                  className="rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-white shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur-md"
                >
                  <p className="font-14-md">{card.title}</p>
                  <p className="mt-1 font-12-rg text-white/60">{card.description}</p>
                </motion.div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <WorkflowStepArrowButton
          direction="next"
          onClick={() => {
            void advanceToNextWorkflowStep()
          }}
          disabled={isNextStepButtonDisabled}
        />
      </div>
    </aside>
  )
}
