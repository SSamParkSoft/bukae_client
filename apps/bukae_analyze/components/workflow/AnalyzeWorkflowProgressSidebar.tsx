'use client'

import { useRouter } from 'next/navigation'
import { LAYOUT } from '@/components/layout/layout-constants'
import { useAnalyzeWorkflowRouteState } from '@/components/workflow/hooks/useAnalyzeWorkflowRouteState'
import { useAnalyzeWorkflowStepAccess } from '@/components/workflow/hooks/useAnalyzeWorkflowStepAccess'
import { buildAnalyzeWorkflowStepPath } from '@/components/workflow/lib/analyzeWorkflowSteps'
import { AnalyzeWorkflowStepList } from '@/components/workflow/ui/AnalyzeWorkflowStepList'
import { WorkflowStepArrowButton } from '@/components/workflow/ui/WorkflowStepArrowButton'

export function AnalyzeWorkflowProgressSidebar() {
  const router = useRouter()
  const routeState = useAnalyzeWorkflowRouteState()
  const {
    projectId,
    planning,
    generationRequestId,
    previousStep,
    isHomePage,
    isFirstStep,
  } = routeState
  const { canOpenPreviousStep } = useAnalyzeWorkflowStepAccess(routeState)

  if (isHomePage) return null

  const openPreviousWorkflowStep = () => {
    if (!canOpenPreviousStep) return
    if (isFirstStep || !previousStep) return
    if (previousStep) {
      router.push(buildAnalyzeWorkflowStepPath(previousStep.path, { projectId, planning, generationRequestId }))
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
          hidden={isFirstStep}
          disabled={!canOpenPreviousStep}
        />
      </div>
    </aside>
  )
}
