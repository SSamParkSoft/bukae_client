'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { mapPlanningSetupAnswersToIntakeRequest, validatePlanningSetupAnswers } from '@/features/planningSetup/lib/intakeRequest'
import { startGeneration } from '@/lib/services/generations'
import { postPlanningMessage, submitIntake } from '@/lib/services/planning'
import { serializePlanningSetupAnswers } from '@/lib/utils/planningSetupQuery'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { usePlanningStore } from '@/store/usePlanningStore'
import { LAYOUT } from './layout-constants'
import { STEPS, buildStepPath, getCurrentStepIndex } from '../_utils/stepNavigation'
import { StepNavButton } from '../buttons/StepNavButton'

export function RightSidebar() {
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
  const planning =
    isPlanningSetup
      ? serializePlanningSetupAnswers(planningAnswers)
      : planningFromQuery

  if (pathname === '/') return null

  const currentIndex = getCurrentStepIndex(pathname)
  const isLast = currentIndex === STEPS.length - 1
  const planningValidationError = isPlanningSetup
    ? validatePlanningSetupAnswers(planningAnswers)
    : null

  const handleNext = async () => {
    if (isLast) return
    const nextStep = STEPS[currentIndex + 1]
    if (!nextStep) return

    if (isPlanningSetup) {
      if (!projectId || isSubmitting) return

      if (planningValidationError) {
        setSubmitError(planningValidationError)
        return
      }

      const intakeSubmissionKey = `${projectId}:${planning ?? ''}`

      if (lastSubmittedIntakeKey === intakeSubmissionKey) {
        router.push(buildStepPath(nextStep.path, { projectId, planning }))
        return
      }

      setSubmitting(true)
      setSubmitError(null)

      try {
        await submitIntake(projectId, mapPlanningSetupAnswersToIntakeRequest(planningAnswers))
        markIntakeSubmitted(intakeSubmissionKey)
        router.push(buildStepPath(nextStep.path, { projectId, planning }))
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : '기획 프리세팅 제출에 실패했습니다.'
        )
      } finally {
        setSubmitting(false)
      }

      return
    }

    if (isAiPlanning) {
      if (!projectId || !canProceedAiPlanning || isAdvancingAiPlanning) {
        return
      }

      setAdvancingAiPlanning(true)

      try {
        if (aiPlanningNextTarget === 'chatbot') {
          if (planningSessionId) {
            const chatbotSession = await postPlanningMessage(projectId, {
              message: [
                'AI 기획 pt.1 질문 답변을 마치고 pt.2 대화 단계로 진입합니다.',
                `answered_count=${answeredQuestionIds.length}`,
                '이전 slot_answer payload들을 기준으로 다음 대화와 최종 기획안 생성을 이어가 주세요.',
              ].join('\n'),
              messageType: 'planning_workspace_entered',
              payload: {
                event_type: 'planning_workspace_entered',
                planning_session_id: planningSessionId,
                answer_source: 'planning_pt1',
                answered_question_ids: answeredQuestionIds,
                answered_count: answeredQuestionIds.length,
                selected_angle_id: null,
              },
            }).catch(() => null)

            if (chatbotSession) {
              setChatbotInitialSession(chatbotSession)
            }
          }

          const params = new URLSearchParams({ projectId })
          if (planning) {
            params.set('planning', planning)
          }
          params.set('mode', 'chatbot')
          router.push(`/ai-planning?${params.toString()}`)
          return
        }

        if (aiPlanningNextTarget === 'shooting-guide') {
          if (isChatbotMode && briefVersionId) {
            const generation = await startGeneration(projectId, {
              briefVersionId,
              generationMode: 'single',
              variantCount: 1,
            })
            const params = new URLSearchParams({
              projectId,
              generationRequestId: generation.generationRequestId,
            })
            if (planning) {
              params.set('planning', planning)
            }
            router.push(`${nextStep.path}?${params.toString()}`)
            return
          }

          router.push(buildStepPath(nextStep.path, { projectId, planning }))
          return
        }
      } finally {
        setAdvancingAiPlanning(false)
      }

      return
    }

    router.push(buildStepPath(nextStep.path, { projectId, planning }))
  }

  return (
    <aside
      className="relative shrink-0"
      style={{ width: LAYOUT.SIDEBAR_WIDTH }}
    >
      {/* 다음 버튼 */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: LAYOUT.NAV_BUTTON_BOTTOM }}
      >
        <StepNavButton
          direction="next"
          onClick={() => {
            void handleNext()
          }}
          hidden={isLast}
          disabled={
            isSubmitting ||
            (isAiPlanning &&
              (!canProceedAiPlanning || isAdvancingAiPlanning))
          }
        />
      </div>
    </aside>
  )
}
