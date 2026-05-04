'use client'

import { useRouter } from 'next/navigation'
import { mapPlanningSetupAnswersToIntakeRequest, validatePlanningSetupAnswers } from '@/features/planningSetup/lib/intakeRequest'
import { submitIntakeCommand } from '@/lib/services/planning'
import { usePlanningStore } from '@/store/usePlanningStore'
import type { AnalyzeWorkflowRouteState } from '@/components/workflow/hooks/useAnalyzeWorkflowRouteState'
import { buildAnalyzeWorkflowStepPath } from '@/components/workflow/lib/analyzeWorkflowSteps'
import {
  hasSubmittedIntake,
  hasCompletedStep,
  markIntakeSubmitted,
  markWorkflowStepCompleted,
} from '@/components/workflow/lib/workflowStepCompletionStorage'

const INTAKE_SESSION_EXPIRED_MESSAGE = '세션이 만료되었습니다. 로그아웃 후 다시 로그인하여 새로운 프로젝트로 시작해 주세요.'

function getPlanningSetupSubmitErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '기획 프리세팅 제출에 실패했습니다.'
  }

  const message = error.message
  const isIntakeBadRequest =
    message.includes('기획 프리세팅 제출 실패 (400)') ||
    (message.includes('"status":400') && message.includes('/intake'))

  if (isIntakeBadRequest) {
    return INTAKE_SESSION_EXPIRED_MESSAGE
  }

  return message
}

export interface PlanningSetupStepSubmissionState {
  isSubmittingPlanningSetup: boolean
  submitPlanningSetupOnceAndOpenNextStep: (nextPath: string) => Promise<void>
}

export function usePlanningSetupStepSubmission(
  routeState: AnalyzeWorkflowRouteState
): PlanningSetupStepSubmissionState {
  const router = useRouter()
  const { projectId } = routeState
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

    const nextHref = buildAnalyzeWorkflowStepPath(nextPath, { projectId })
    if (hasSubmittedIntake(projectId) || hasCompletedStep(projectId, 'planning')) {
      setSubmitError(null)
      router.push(nextHref)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      await submitIntakeCommand(projectId, mapPlanningSetupAnswersToIntakeRequest(planningAnswers))
      markIntakeSubmitted(projectId)
      markWorkflowStepCompleted(projectId, 'intake')
      router.push(nextHref)
    } catch (error) {
      setSubmitError(getPlanningSetupSubmitErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    isSubmittingPlanningSetup,
    submitPlanningSetupOnceAndOpenNextStep,
  }
}
