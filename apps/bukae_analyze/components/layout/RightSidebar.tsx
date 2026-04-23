'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { serializePlanningSetupAnswers } from '@/lib/utils/planningSetupQuery'
import { usePlanningStore } from '@/store/usePlanningStore'
import { LAYOUT } from './layout-constants'
import { STEPS, buildStepPath, getCurrentStepIndex } from '../_utils/stepNavigation'
import { StepNavButton } from '../buttons/StepNavButton'

export function RightSidebar() {
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
  const isLast = currentIndex === STEPS.length - 1

  const handleNext = () => {
    if (isLast) return
    const nextStep = STEPS[currentIndex + 1]
    if (nextStep) {
      router.push(buildStepPath(nextStep.path, { projectId, planning }))
    }
  }

  return (
    <aside
      className="relative shrink-0"
      style={{ width: LAYOUT.SIDEBAR_WIDTH }}
    >
      {/* 다음 버튼 */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: LAYOUT.NAV_BUTTON_BOTTOM }}
      >
        <StepNavButton direction="next" onClick={handleNext} hidden={isLast} />
      </div>
    </aside>
  )
}
