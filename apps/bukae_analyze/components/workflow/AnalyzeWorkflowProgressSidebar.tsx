'use client'

import { useRouter } from 'next/navigation'
import { LAYOUT } from '../layout/layout-constants'
import { buildAnalyzeWorkflowStepPath } from './analyzeWorkflowSteps'
import { AnalyzeWorkflowStepList } from './AnalyzeWorkflowStepList'
import { WorkflowStepArrowButton } from './WorkflowStepArrowButton'
import { useAnalyzeWorkflowRouteState } from './useAnalyzeWorkflowRouteState'

export function AnalyzeWorkflowProgressSidebar() {
  const router = useRouter()
  const {
    projectId,
    planning,
    previousStep,
    isHomePage,
    isFirstStep,
  } = useAnalyzeWorkflowRouteState()

  if (isHomePage) return null

  const openPreviousWorkflowStep = () => {
    if (isFirstStep || !previousStep) return
    if (previousStep) {
      router.push(buildAnalyzeWorkflowStepPath(previousStep.path, { projectId, planning }))
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
        <WorkflowStepArrowButton direction="prev" onClick={openPreviousWorkflowStep} hidden={isFirstStep} />
      </div>
    </aside>
  )
}
