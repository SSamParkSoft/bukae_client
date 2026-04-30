'use client'

import { useRouter } from 'next/navigation'
import { mapPlanningSetupAnswersToIntakeRequest, validatePlanningSetupAnswers } from '@/features/planningSetup/lib/intakeRequest'
import { submitIntakeCommand } from '@/lib/services/planning'
import { usePlanningStore } from '@/store/usePlanningStore'
import type { AnalyzeWorkflowRouteState } from '@/components/workflow/hooks/useAnalyzeWorkflowRouteState'
import { buildAnalyzeWorkflowStepPath } from '@/components/workflow/lib/analyzeWorkflowSteps'
import {
  hasStoredIntakeSubmission,
  storeIntakeSubmission,
} from '@/components/workflow/lib/intakeSubmissionStorage'

export interface PlanningSetupStepSubmissionState {
  isSubmittingPlanningSetup: boolean
  submitPlanningSetupOnceAndOpenNextStep: (nextPath: string) => Promise<void>
}

export function usePlanningSetupStepSubmission(
  routeState: AnalyzeWorkflowRouteState
): PlanningSetupStepSubmissionState {
  const router = useRouter()
  const { projectId, planning } = routeState
  const planningAnswers = usePlanningStore((state) => state.answers)
  const isSubmittingPlanningSetup = usePlanningStore((state) => state.isSubmitting)
  const setSubmitting = usePlanningStore((state) => state.setSubmitting)
  const setSubmitError = usePlanningStore((state) => state.setSubmitError)

  async function submitPlanningSetupOnceAndOpenNextStep(nextPath: string) {
    if (!projectId || isSubmittingPlanningSetup) return

    const validationError = validatePlanningSetupAnswers(planningAnswers)
    if (validationError) {
      setSubmitError(validationError)
      return
    }

    const nextHref = buildAnalyzeWorkflowStepPath(nextPath, { projectId, planning })
    if (hasStoredIntakeSubmission(projectId)) {
      setSubmitError(null)
      router.push(nextHref)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      await submitIntakeCommand(projectId, mapPlanningSetupAnswersToIntakeRequest(planningAnswers))
      storeIntakeSubmission(projectId)
      router.push(nextHref)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : '기획 프리세팅 제출에 실패했습니다.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return {
    isSubmittingPlanningSetup,
    submitPlanningSetupOnceAndOpenNextStep,
  }
}
