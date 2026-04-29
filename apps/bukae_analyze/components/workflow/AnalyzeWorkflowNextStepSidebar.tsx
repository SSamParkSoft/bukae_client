'use client'

import { LAYOUT } from '@/components/layout/layout-constants'
import { useAnalyzeWorkflowNextStep } from '@/components/workflow/useAnalyzeWorkflowNextStep'
import { WorkflowStepArrowButton } from '@/components/workflow/ui/WorkflowStepArrowButton'

export function AnalyzeWorkflowNextStepSidebar() {
  const {
    shouldRenderNextStepButton,
    isNextStepButtonDisabled,
    advanceToNextWorkflowStep,
  } = useAnalyzeWorkflowNextStep()

  if (!shouldRenderNextStepButton) return null

  return (
    <aside
      className="relative shrink-0"
      style={{ width: LAYOUT.SIDEBAR_WIDTH }}
    >
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: LAYOUT.NAV_BUTTON_BOTTOM }}
      >
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
