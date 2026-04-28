'use client'

import { useRouter } from 'next/navigation'
import { mapPlanningSetupAnswersToIntakeRequest, validatePlanningSetupAnswers } from '@/features/planningSetup/lib/intakeRequest'
import { submitIntakeCommand } from '@/lib/services/planning'
import { useAnalyzeWorkflowStore } from '@/store/useAnalyzeWorkflowStore'
import { usePlanningStore } from '@/store/usePlanningStore'
import { buildAnalyzeWorkflowStepPath } from '../lib/analyzeWorkflowSteps'
import type { AnalyzeWorkflowRouteState } from '../hooks/useAnalyzeWorkflowRouteState'

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
  const legacyLastSubmittedIntakeKey = usePlanningStore((state) => state.lastSubmittedIntakeKey)
  const markLegacyIntakeSubmitted = usePlanningStore((state) => state.markIntakeSubmitted)
  const hasSubmittedIntake = useAnalyzeWorkflowStore((state) => state.hasSubmittedIntake)
  const markIntakeSubmitted = useAnalyzeWorkflowStore((state) => state.markIntakeSubmitted)

  async function submitPlanningSetupOnceAndOpenNextStep(nextPath: string) {
    if (!projectId || isSubmittingPlanningSetup) return

    const validationError = validatePlanningSetupAnswers(planningAnswers)
    if (validationError) {
      setSubmitError(validationError)
      return
    }

    const intakeSubmissionKey = `${projectId}:${planning ?? ''}`
    const nextHref = buildAnalyzeWorkflowStepPath(nextPath, { projectId, planning })
    if (
      hasSubmittedIntake(intakeSubmissionKey) ||
      legacyLastSubmittedIntakeKey === intakeSubmissionKey
    ) {
      router.push(nextHref)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      await submitIntakeCommand(projectId, mapPlanningSetupAnswersToIntakeRequest(planningAnswers))
      markIntakeSubmitted(intakeSubmissionKey)
      markLegacyIntakeSubmitted(intakeSubmissionKey)
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
