'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { mapPlanningSetupAnswersToIntakeRequest, validatePlanningSetupAnswers } from '@/features/planningSetup/lib/intakeRequest'
import { submitIntake } from '@/lib/services/planning'
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
  const isSubmitting = usePlanningStore((state) => state.isSubmitting)
  const lastSubmittedIntakeKey = usePlanningStore((state) => state.lastSubmittedIntakeKey)
  const setSubmitting = usePlanningStore((state) => state.setSubmitting)
  const setSubmitError = usePlanningStore((state) => state.setSubmitError)
  const markIntakeSubmitted = usePlanningStore((state) => state.markIntakeSubmitted)
  const isPlanningSetup = pathname.startsWith('/planning-setup')
  const planning =
    isPlanningSetup
      ? serializePlanningSetupAnswers(planningAnswers)
      : planningFromQuery

  if (pathname === '/') return null

  const currentIndex = getCurrentStepIndex(pathname)
  const isLast = currentIndex === STEPS.length - 1
  const planningValidationError = isPlanningSetup
    ? validatePlanningSetupAnswers(planningAnswers)
    : null

  const handleNext = async () => {
    if (isLast) return
    const nextStep = STEPS[currentIndex + 1]
    if (!nextStep) return

    if (isPlanningSetup) {
      if (!projectId || isSubmitting) return

      if (planningValidationError) {
        setSubmitError(planningValidationError)
        return
      }

      const intakeSubmissionKey = `${projectId}:${planning ?? ''}`

      if (lastSubmittedIntakeKey === intakeSubmissionKey) {
        router.push(buildStepPath(nextStep.path, { projectId, planning }))
        return
      }

      setSubmitting(true)
      setSubmitError(null)

      try {
        await submitIntake(projectId, mapPlanningSetupAnswersToIntakeRequest(planningAnswers))
        markIntakeSubmitted(intakeSubmissionKey)
        router.push(buildStepPath(nextStep.path, { projectId, planning }))
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : '기획 프리세팅 제출에 실패했습니다.'
        )
      } finally {
        setSubmitting(false)
      }

      return
    }

    router.push(buildStepPath(nextStep.path, { projectId, planning }))
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
        <StepNavButton
          direction="next"
          onClick={() => {
            void handleNext()
          }}
          hidden={isLast}
          disabled={isSubmitting}
        />
      </div>
    </aside>
  )
}
