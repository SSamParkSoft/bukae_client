'use client'

import { useRouter } from 'next/navigation'
import { useAiPlanningStepAdvance } from './commands/useAiPlanningStepAdvance'
import { usePlanningSetupStepSubmission } from './commands/usePlanningSetupStepSubmission'
import { useAnalyzeWorkflowRouteState } from './hooks/useAnalyzeWorkflowRouteState'
import { buildAnalyzeWorkflowStepPath } from './lib/analyzeWorkflowSteps'

export interface AnalyzeWorkflowNextStepState {
  shouldRenderNextStepButton: boolean
  isNextStepButtonDisabled: boolean
  advanceToNextWorkflowStep: () => Promise<void>
}

export function useAnalyzeWorkflowNextStep(): AnalyzeWorkflowNextStepState {
  const router = useRouter()
  const routeState = useAnalyzeWorkflowRouteState()
  const {
    projectId,
    planning,
    generationRequestId,
    nextStep,
    isHomePage,
    isLastStep,
    isPlanningSetupStep,
    isAiPlanningStep,
  } = routeState
  const {
    isSubmittingPlanningSetup,
    submitPlanningSetupOnceAndOpenNextStep,
  } = usePlanningSetupStepSubmission(routeState)
  const {
    canProceedAiPlanning,
    isAdvancingAiPlanning,
    advanceAiPlanningToNextWorkflowStep,
  } = useAiPlanningStepAdvance(routeState)

  const shouldRenderNextStepButton = !isHomePage && !isLastStep
  const isNextStepButtonDisabled =
    isSubmittingPlanningSetup ||
    (isAiPlanningStep && (!canProceedAiPlanning || isAdvancingAiPlanning))

  async function advanceToNextWorkflowStep() {
    if (isLastStep || !nextStep) return

    if (isPlanningSetupStep) {
      await submitPlanningSetupOnceAndOpenNextStep(nextStep.path)
      return
    }

    if (isAiPlanningStep) {
      await advanceAiPlanningToNextWorkflowStep(nextStep.path)
      return
    }

    router.push(buildAnalyzeWorkflowStepPath(nextStep.path, { projectId, planning, generationRequestId }))
  }

  return {
    shouldRenderNextStepButton,
    isNextStepButtonDisabled,
    advanceToNextWorkflowStep,
  }
}
