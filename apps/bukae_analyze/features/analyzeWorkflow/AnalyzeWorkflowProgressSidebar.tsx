'use client'

import { useRouter } from 'next/navigation'
import { LAYOUT } from '@/lib/config/layout'
import { useAnalyzeWorkflowRouteState } from '@/features/analyzeWorkflow/hooks/useAnalyzeWorkflowRouteState'
import { useAnalyzeWorkflowStepAccess } from '@/features/analyzeWorkflow/hooks/useAnalyzeWorkflowStepAccess'
import { buildAnalyzeWorkflowStepPath } from '@/features/analyzeWorkflow/lib/analyzeWorkflowSteps'
import { AnalyzeWorkflowStepList } from '@/features/analyzeWorkflow/ui/AnalyzeWorkflowStepList'
import { WorkflowStepArrowButton } from '@/features/analyzeWorkflow/ui/WorkflowStepArrowButton'

export function AnalyzeWorkflowProgressSidebar() {
  const router = useRouter()
  const routeState = useAnalyzeWorkflowRouteState()
  const {
    projectId,
    generationRequestId,
    previousStep,
    isHomePage,
    isFirstStep,
    isChatbotMode,
  } = routeState
  const { canOpenPreviousStep } = useAnalyzeWorkflowStepAccess(routeState)

  if (isHomePage) return null

  const openPreviousWorkflowStep = () => {
    if (!canOpenPreviousStep) return
    if (isFirstStep || !previousStep) return
    if (previousStep) {
      router.push(buildAnalyzeWorkflowStepPath(previousStep.path, { projectId, generationRequestId }))
    }
  }

  return (
    <aside
      className="relative shrink-0"
      style={{ width: LAYOUT.SIDEBAR_WIDTH }}
    >
      {/* 스텝 인디케이터 */}
      <div style={{ marginTop: LAYOUT.STEP_INDICATOR_TOP, paddingLeft: 'clamp(32px,1.88vw,40px)', paddingRight: '40px' }}>
        <AnalyzeWorkflowStepList />
      </div>

      {/* 이전 버튼 */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: LAYOUT.NAV_BUTTON_BOTTOM }}
      >
        <WorkflowStepArrowButton
          direction="prev"
          onClick={openPreviousWorkflowStep}
          hidden={isFirstStep || isChatbotMode}
          disabled={!canOpenPreviousStep}
        />
      </div>
    </aside>
  )
}
