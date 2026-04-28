'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { mapPlanningSetupAnswersToIntakeRequest, validatePlanningSetupAnswers } from '@/features/planningSetup/lib/intakeRequest'
import { submitIntakeCommand, enterPlanningWorkspace } from '@/lib/services/planning'
import { startGenerationFromCommand } from '@/lib/services/generations'
import { serializePlanningSetupAnswers } from '@/lib/utils/planningSetupQuery'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { usePlanningStore } from '@/store/usePlanningStore'
import { STEPS, buildStepPath, getCurrentStepIndex } from '../_utils/stepNavigation'

export interface StepNavigationState {
  isHidden: boolean
  isDisabled: boolean
  handleNext: () => Promise<void>
}

export function useStepNavigation(): StepNavigationState {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const projectId = searchParams.get('projectId')
  const planningFromQuery = searchParams.get('planning')
  const mode = searchParams.get('mode')

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

  const isPlanningSetup = pathname.startsWith('/planning-setup')
  const isAiPlanning = pathname.startsWith('/ai-planning')
  const isChatbotMode = mode === 'chatbot'
  const planning = isPlanningSetup
    ? serializePlanningSetupAnswers(planningAnswers)
    : planningFromQuery

  const currentIndex = getCurrentStepIndex(pathname)
  const isLast = currentIndex === STEPS.length - 1
  const isHidden = pathname === '/' || isLast
  const isDisabled =
    isSubmitting ||
    (isAiPlanning && (!canProceedAiPlanning || isAdvancingAiPlanning))

  async function handleNext() {
    if (isLast) return
    const nextStep = STEPS[currentIndex + 1]
    if (!nextStep) return

    if (isPlanningSetup) {
      await handlePlanningSetupNext(nextStep.path)
      return
    }

    if (isAiPlanning) {
      await handleAiPlanningNext(nextStep.path)
      return
    }

    router.push(buildStepPath(nextStep.path, { projectId, planning }))
  }

  async function handlePlanningSetupNext(nextPath: string) {
    if (!projectId || isSubmitting) return

    const validationError = validatePlanningSetupAnswers(planningAnswers)
    if (validationError) {
      setSubmitError(validationError)
      return
    }

    const intakeSubmissionKey = `${projectId}:${planning ?? ''}`
    if (lastSubmittedIntakeKey === intakeSubmissionKey) {
      router.push(buildStepPath(nextPath, { projectId, planning }))
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      await submitIntakeCommand(projectId, mapPlanningSetupAnswersToIntakeRequest(planningAnswers))
      markIntakeSubmitted(intakeSubmissionKey)
      router.push(buildStepPath(nextPath, { projectId, planning }))
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

  async function handleAiPlanningNext(nextPath: string) {
    if (!projectId || !canProceedAiPlanning || isAdvancingAiPlanning) return

    setAdvancingAiPlanning(true)

    try {
      if (aiPlanningNextTarget === 'chatbot') {
        await enterChatbotMode()
        return
      }

      if (aiPlanningNextTarget === 'shooting-guide') {
        await goToShootingGuide(nextPath)
        return
      }
    } finally {
      setAdvancingAiPlanning(false)
    }
  }

  async function enterChatbotMode() {
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

  async function goToShootingGuide(nextPath: string) {
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

    router.push(buildStepPath(nextPath, { projectId, planning }))
  }

  return { isHidden, isDisabled, handleNext }
}
