'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { serializePlanningSetupAnswers } from '@/lib/utils/planningSetupQuery'
import { usePlanningStore } from '@/store/usePlanningStore'
import { LAYOUT } from '../layout/layout-constants'
import {
  ANALYZE_WORKFLOW_STEPS,
  buildAnalyzeWorkflowStepPath,
  getAnalyzeWorkflowStepIndex,
} from './analyzeWorkflowSteps'
import { AnalyzeWorkflowStepList } from './AnalyzeWorkflowStepList'
import { WorkflowStepArrowButton } from './WorkflowStepArrowButton'

export function AnalyzeWorkflowProgressSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const planningFromQuery = searchParams.get('planning')
  const planningAnswers = usePlanningStore((state) => state.answers)
  const planning =
    pathname.startsWith('/planning-setup')
      ? serializePlanningSetupAnswers(planningAnswers)
      : planningFromQuery

  if (pathname === '/') return null

  const currentIndex = getAnalyzeWorkflowStepIndex(pathname)
  const isFirst = currentIndex === 0

  const openPreviousWorkflowStep = () => {
    if (isFirst) return
    const prevStep = ANALYZE_WORKFLOW_STEPS[currentIndex - 1]
    if (prevStep) {
      router.push(buildAnalyzeWorkflowStepPath(prevStep.path, { projectId, planning }))
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
        <WorkflowStepArrowButton direction="prev" onClick={openPreviousWorkflowStep} hidden={isFirst} />
      </div>
    </aside>
  )
}
