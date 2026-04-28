'use client'

import { useRouter } from 'next/navigation'
import { enterPlanningWorkspace } from '@/lib/services/planning'
import { startGenerationFromCommand } from '@/lib/services/generations'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { buildAnalyzeWorkflowStepPath } from './analyzeWorkflowSteps'
import { useAnalyzeWorkflowRouteState } from './useAnalyzeWorkflowRouteState'
import { usePlanningSetupStepSubmission } from './usePlanningSetupStepSubmission'

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
    nextStep,
    isHomePage,
    isLastStep,
    isPlanningSetupStep,
    isAiPlanningStep,
    isChatbotMode,
  } = routeState
  const {
    isSubmittingPlanningSetup,
    submitPlanningSetupOnceAndOpenNextStep,
  } = usePlanningSetupStepSubmission(routeState)

  const canProceedAiPlanning = useAiPlanningStore((state) => state.canProceed)
  const isAdvancingAiPlanning = useAiPlanningStore((state) => state.isAdvancing)
  const aiPlanningNextTarget = useAiPlanningStore((state) => state.nextTarget)
  const planningSessionId = useAiPlanningStore((state) => state.planningSessionId)
  const briefVersionId = useAiPlanningStore((state) => state.briefVersionId)
  const answeredQuestionIds = useAiPlanningStore((state) => state.answeredQuestionIds)
  const setAdvancingAiPlanning = useAiPlanningStore((state) => state.setAdvancing)
  const setChatbotInitialSession = useAiPlanningStore((state) => state.setChatbotInitialSession)

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
      await advanceAiPlanningToChatbotOrGuide(nextStep.path)
      return
    }

    router.push(buildAnalyzeWorkflowStepPath(nextStep.path, { projectId, planning }))
  }

  async function advanceAiPlanningToChatbotOrGuide(nextPath: string) {
    if (!projectId || !canProceedAiPlanning || isAdvancingAiPlanning) return

    setAdvancingAiPlanning(true)

    try {
      if (aiPlanningNextTarget === 'chatbot') {
        await enterFollowUpChatbotMode()
        return
      }

      if (aiPlanningNextTarget === 'shooting-guide') {
        await startGenerationAndOpenShootingGuide(nextPath)
        return
      }
    } finally {
      setAdvancingAiPlanning(false)
    }
  }

  async function enterFollowUpChatbotMode() {
    if (planningSessionId) {
      const chatbotSession = await enterPlanningWorkspace(projectId!, {
        planningSessionId,
        answeredQuestionIds,
        answeredCount: answeredQuestionIds.length,
      }).catch(() => null)

      if (chatbotSession) {
        setChatbotInitialSession(chatbotSession)
      }
    }

    const params = new URLSearchParams({ projectId: projectId! })
    if (planning) params.set('planning', planning)
    params.set('mode', 'chatbot')
    router.push(`/ai-planning?${params.toString()}`)
  }

  async function startGenerationAndOpenShootingGuide(nextPath: string) {
    if (isChatbotMode && briefVersionId) {
      const generation = await startGenerationFromCommand(projectId!, {
        briefVersionId,
        generationMode: 'single',
        variantCount: 1,
      })
      const params = new URLSearchParams({
        projectId: projectId!,
        generationRequestId: generation.generationRequestId,
      })
      if (planning) params.set('planning', planning)
      router.push(`${nextPath}?${params.toString()}`)
      return
    }

    router.push(buildAnalyzeWorkflowStepPath(nextPath, { projectId, planning }))
  }

  return {
    shouldRenderNextStepButton,
    isNextStepButtonDisabled,
    advanceToNextWorkflowStep,
  }
}
