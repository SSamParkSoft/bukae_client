'use client'

import { useAnalyzeWorkflowNextStep } from './useAnalyzeWorkflowNextStep'
import { LAYOUT } from '../layout/layout-constants'
import { WorkflowStepArrowButton } from './ui/WorkflowStepArrowButton'

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
