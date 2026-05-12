'use client'

import { useRouter } from 'next/navigation'
import { mapPlanningSetupAnswersToIntakeRequest, validatePlanningSetupAnswers } from '@/features/planningSetup/lib/intakeRequest'
import { resolveAppError } from '@/lib/errors/appError'
import { submitIntakeCommand } from '@/lib/services/planning'
import { usePlanningStore } from '@/store/usePlanningStore'
import type { AnalyzeWorkflowRouteState } from '@/features/analyzeWorkflow/hooks/useAnalyzeWorkflowRouteState'
import { buildAnalyzeWorkflowStepPath } from '@/features/analyzeWorkflow/lib/analyzeWorkflowSteps'
import { getPlanningSetupAnswerSnapshot } from '@/features/planningSetup/lib/planningSetupAnswerStorage'
import {
  hasSubmittedIntake,
  hasCompletedStep,
  markIntakeSubmitted,
  markWorkflowStepCompleted,
} from '@/lib/storage/workflowStepCompletionStorage'

function getPlanningSetupSubmitErrorMessage(error: unknown): string {
  return resolveAppError(error, 'planning_setup_submit').message
}

export interface PlanningSetupStepSubmissionState {
  isSubmittingPlanningSetup: boolean
  submitPlanningSetupOnceAndOpenNextStep: (nextPath: string) => Promise<void>
}

export function usePlanningSetupStepSubmission(
  routeState: AnalyzeWorkflowRouteState
): PlanningSetupStepSubmissionState {
  const router = useRouter()
  const { projectId, generationRequestId } = routeState
  const isSubmittingPlanningSetup = usePlanningStore((state) => state.isSubmitting)
  const setSubmitting = usePlanningStore((state) => state.setSubmitting)
  const setSubmitError = usePlanningStore((state) => state.setSubmitError)

  async function submitPlanningSetupOnceAndOpenNextStep(nextPath: string) {
    if (!projectId || isSubmittingPlanningSetup) return

    const planningAnswers = getPlanningSetupAnswerSnapshot(projectId)
    const validationError = validatePlanningSetupAnswers(planningAnswers)
    if (validationError) {
      setSubmitError(validationError)
      return
    }

    const nextHref = buildAnalyzeWorkflowStepPath(nextPath, { projectId, generationRequestId })
    if (hasSubmittedIntake(projectId) || hasCompletedStep(projectId, 'planning')) {
      markWorkflowStepCompleted(projectId, 'planning')
      setSubmitError(null)
      router.push(nextHref)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      await submitIntakeCommand(projectId, mapPlanningSetupAnswersToIntakeRequest(planningAnswers))
      markIntakeSubmitted(projectId)
      markWorkflowStepCompleted(projectId, 'planning')
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
