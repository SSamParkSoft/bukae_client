'use client'

import { useRouter } from 'next/navigation'
import { useAiPlanningStepAdvance } from '@/components/workflow/commands/useAiPlanningStepAdvance'
import { usePlanningSetupStepSubmission } from '@/components/workflow/commands/usePlanningSetupStepSubmission'
import { useAnalyzeWorkflowRouteState } from '@/components/workflow/hooks/useAnalyzeWorkflowRouteState'
import { useAnalyzeWorkflowStepAccess } from '@/components/workflow/hooks/useAnalyzeWorkflowStepAccess'
import { buildAnalyzeWorkflowStepPath } from '@/components/workflow/lib/analyzeWorkflowSteps'

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
  const { canOpenNextStep } = useAnalyzeWorkflowStepAccess(routeState)
  const {
    submitPlanningSetupOnceAndOpenNextStep,
  } = usePlanningSetupStepSubmission(routeState)
  const {
    advanceAiPlanningToNextWorkflowStep,
  } = useAiPlanningStepAdvance(routeState)

  const shouldRenderNextStepButton = !isHomePage && !isLastStep
  const isNextStepButtonDisabled = !canOpenNextStep

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

    router.push(buildAnalyzeWorkflowStepPath(nextStep.path, { projectId, planning, generationRequestId }))
  }

  return {
    shouldRenderNextStepButton,
    isNextStepButtonDisabled,
    advanceToNextWorkflowStep,
  }
}
