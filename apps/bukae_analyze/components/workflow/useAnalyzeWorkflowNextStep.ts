'use client'

import { useRouter } from 'next/navigation'
import { mapPlanningSetupAnswersToIntakeRequest, validatePlanningSetupAnswers } from '@/features/planningSetup/lib/intakeRequest'
import { submitIntakeCommand, enterPlanningWorkspace } from '@/lib/services/planning'
import { startGenerationFromCommand } from '@/lib/services/generations'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { usePlanningStore } from '@/store/usePlanningStore'
import { buildAnalyzeWorkflowStepPath } from './analyzeWorkflowSteps'
import { useAnalyzeWorkflowRouteState } from './useAnalyzeWorkflowRouteState'

export interface AnalyzeWorkflowNextStepState {
  shouldRenderNextStepButton: boolean
  isNextStepButtonDisabled: boolean
  advanceToNextWorkflowStep: () => Promise<void>
}

export function useAnalyzeWorkflowNextStep(): AnalyzeWorkflowNextStepState {
  const router = useRouter()
  const {
    projectId,
    planning,
    nextStep,
    isHomePage,
    isLastStep,
    isPlanningSetupStep,
    isAiPlanningStep,
    isChatbotMode,
  } = useAnalyzeWorkflowRouteState()

  const planningAnswers = usePlanningStore((state) => state.answers)
  const isSubmitting = usePlanningStore((state) => state.isSubmitting)
  const lastSubmittedIntakeKey = usePlanningStore((state) => state.lastSubmittedIntakeKey)
  const setSubmitting = usePlanningStore((state) => state.setSubmitting)
  const setSubmitError = usePlanningStore((state) => state.setSubmitError)
  const markIntakeSubmitted = usePlanningStore((state) => state.markIntakeSubmitted)

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
    isSubmitting ||
    (isAiPlanningStep && (!canProceedAiPlanning || isAdvancingAiPlanning))

  async function advanceToNextWorkflowStep() {
    if (isLastStep || !nextStep) return

    if (isPlanningSetupStep) {
      await submitPlanningSetupAndOpenNextStep(nextStep.path)
      return
    }

    if (isAiPlanningStep) {
      await advanceAiPlanningToChatbotOrGuide(nextStep.path)
      return
    }

    router.push(buildAnalyzeWorkflowStepPath(nextStep.path, { projectId, planning }))
  }

  async function submitPlanningSetupAndOpenNextStep(nextPath: string) {
    if (!projectId || isSubmitting) return

    const validationError = validatePlanningSetupAnswers(planningAnswers)
    if (validationError) {
      setSubmitError(validationError)
      return
    }

    const intakeSubmissionKey = `${projectId}:${planning ?? ''}`
    if (lastSubmittedIntakeKey === intakeSubmissionKey) {
      router.push(buildAnalyzeWorkflowStepPath(nextPath, { projectId, planning }))
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      await submitIntakeCommand(projectId, mapPlanningSetupAnswersToIntakeRequest(planningAnswers))
      markIntakeSubmitted(intakeSubmissionKey)
      router.push(buildAnalyzeWorkflowStepPath(nextPath, { projectId, planning }))
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
