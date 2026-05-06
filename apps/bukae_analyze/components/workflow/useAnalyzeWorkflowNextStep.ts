'use client'

import { useRouter } from 'next/navigation'
import { useAiPlanningStepAdvance } from '@/components/workflow/commands/useAiPlanningStepAdvance'
import { usePlanningSetupStepSubmission } from '@/components/workflow/commands/usePlanningSetupStepSubmission'
import { useAnalyzeWorkflowRouteState } from '@/components/workflow/hooks/useAnalyzeWorkflowRouteState'
import { useAnalyzeWorkflowStepAccess } from '@/components/workflow/hooks/useAnalyzeWorkflowStepAccess'
import { buildAnalyzeWorkflowStepPath } from '@/components/workflow/lib/analyzeWorkflowSteps'
import { markWorkflowStepCompleted } from '@/components/workflow/lib/workflowStepCompletionStorage'

export interface AnalyzeWorkflowNextStepState {
  shouldRenderNextStepButton: boolean
  isNextStepButtonDisabled: boolean
  isSubmittingPlanningSetup: boolean
  advanceToNextWorkflowStep: () => Promise<void>
}

export function useAnalyzeWorkflowNextStep(): AnalyzeWorkflowNextStepState {
  const router = useRouter()
  const routeState = useAnalyzeWorkflowRouteState()
  const {
    projectId,
    generationRequestId,
    nextStep,
    isHomePage,
    isLastStep,
    isPlanningSetupStep,
    isAiPlanningStep,
  } = routeState
  const { canOpenNextStep } = useAnalyzeWorkflowStepAccess(routeState)
  const {
    isSubmittingPlanningSetup,
    submitPlanningSetupOnceAndOpenNextStep,
  } = usePlanningSetupStepSubmission(routeState)
  const {
    advanceAiPlanningToNextWorkflowStep,
  } = useAiPlanningStepAdvance(routeState)

  const shouldRenderNextStepButton = !isHomePage && !isLastStep
  const isNextStepButtonDisabled = !canOpenNextStep || isSubmittingPlanningSetup

  async function advanceToNextWorkflowStep() {
    if (isLastStep || !nextStep) return
    if (!canOpenNextStep) return

    if (isPlanningSetupStep) {
      await submitPlanningSetupOnceAndOpenNextStep(nextStep.path)
      return
    }

    if (isAiPlanningStep) {
      await advanceAiPlanningToNextWorkflowStep(nextStep.path)
      return
    }

    if (projectId && nextStep.path === '/planning-setup') {
      markWorkflowStepCompleted(projectId, 'intake')
    }

    router.push(buildAnalyzeWorkflowStepPath(nextStep.path, { projectId, generationRequestId }))
  }

  return {
    shouldRenderNextStepButton,
    isNextStepButtonDisabled,
    isSubmittingPlanningSetup,
    advanceToNextWorkflowStep,
  }
}
