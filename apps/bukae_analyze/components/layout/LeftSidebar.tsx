'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { serializePlanningSetupAnswers } from '@/lib/utils/planningSetupQuery'
import { usePlanningStore } from '@/store/usePlanningStore'
import { LAYOUT } from './layout-constants'
import { STEPS, buildStepPath, getCurrentStepIndex } from '../_utils/stepNavigation'
import { StepIndicator } from './StepIndicator'
import { StepNavButton } from '../buttons/StepNavButton'

export function LeftSidebar() {
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

  const currentIndex = getCurrentStepIndex(pathname)
  const isFirst = currentIndex === 0

  const handlePrev = () => {
    if (isFirst) return
    const prevStep = STEPS[currentIndex - 1]
    if (prevStep) {
      router.push(buildStepPath(prevStep.path, { projectId, planning }))
    }
  }

  return (
    <aside
      className="relative shrink-0"
      style={{ width: LAYOUT.SIDEBAR_WIDTH }}
    >
      {/* 스텝 인디케이터 */}
      <div style={{ marginTop: LAYOUT.STEP_INDICATOR_TOP, paddingLeft: 'clamp(32px,1.88vw,40px)', paddingRight: '40px' }}>
        <StepIndicator />
      </div>

      {/* 이전 버튼 */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: LAYOUT.NAV_BUTTON_BOTTOM }}
      >
        <StepNavButton direction="prev" onClick={handlePrev} hidden={isFirst} />
      </div>
    </aside>
  )
}
