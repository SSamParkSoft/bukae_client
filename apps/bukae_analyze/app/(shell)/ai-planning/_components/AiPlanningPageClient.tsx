'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { useAiPlanningNavigationStateSync } from '@/features/aiPlanning/hooks/state/useAiPlanningNavigationStateSync'
import { useFollowUpChatbot } from '@/features/aiPlanning/hooks/state/useFollowUpChatbot'
import { usePlanningSession } from '@/features/aiPlanning/hooks/state/usePlanningSession'
import { usePt1AnswerAutoSubmission } from '@/features/aiPlanning/hooks/state/usePt1AnswerAutoSubmission'
import { usePt1AnswerDrafts } from '@/features/aiPlanning/hooks/state/usePt1AnswerDrafts'
import { useAnalyzeWorkflowStore } from '@/store/useAnalyzeWorkflowStore'
import { FollowUpChatbot } from './chatbotComponents'
import { PlanningQuestionCard } from './PlanningQuestionCard'
import { PlanningSessionError } from './PlanningSessionError'
import { PlanningSessionLoading } from './PlanningSessionLoading'
import type { PlanningSession } from '@/lib/types/domain'

type AiPlanningMode = 'default' | 'chatbot'

function buildAiPlanningHref(
  projectId: string,
  mode: AiPlanningMode,
  planning: string | null
): string {
  const params = new URLSearchParams({ projectId })

  if (planning) {
    params.set('planning', planning)
  }

  if (mode === 'chatbot') {
    params.set('mode', 'chatbot')
  }

  return `/ai-planning?${params.toString()}`
}

export function AiPlanningPageClient({
  projectId,
  mode,
  planningParam,
  generationRequestId,
  initialPlanningSession,
}: {
  projectId: string
  mode: AiPlanningMode
  planningParam: string | null
  generationRequestId: string | null
  initialPlanningSession: PlanningSession | null
}) {
  const router = useRouter()
  const isChatbotMode = mode === 'chatbot'
  const pt1CacheKey = `${projectId}:${planningParam ?? ''}`
  const cachedPlanningSession = useAnalyzeWorkflowStore((state) => state.getCachedPlanningSession(projectId))
  const cachePlanningSession = useAnalyzeWorkflowStore((state) => state.cachePlanningSession)
  const planningInitialSession = initialPlanningSession ?? cachedPlanningSession
  const shouldFetchPlanningSession = !isChatbotMode && !generationRequestId

  const planningSessionState = usePlanningSession(projectId, planningInitialSession, shouldFetchPlanningSession)
  const {
    selectedAnswers,
    customAnswers,
    fieldAnswers,
    selectAnswer,
    changeCustomAnswer,
    changeFieldAnswer,
  } = usePt1AnswerDrafts(pt1CacheKey)
  const resetAiPlanningStore = useAiPlanningStore((state) => state.reset)
  const chatbotInitialSession = useAiPlanningStore((state) => state.chatbotInitialSession)
  const replacePlanningSession = planningSessionState.replaceSession
  const chatbotViewModel = useFollowUpChatbot({
    projectId,
    initialSession: isChatbotMode && chatbotInitialSession ? chatbotInitialSession : planningSessionState.session,
    enabled: isChatbotMode,
    onSessionChange: replacePlanningSession,
  })

  const questions = useMemo(
    () => planningSessionState.session?.clarifyingQuestions ?? [],
    [planningSessionState.session]
  )

  useEffect(() => {
    return () => {
      resetAiPlanningStore()
    }
  }, [resetAiPlanningStore])

  useEffect(() => {
    if (!planningSessionState.session) return

    cachePlanningSession(projectId, planningSessionState.session)
  }, [cachePlanningSession, planningSessionState.session, projectId])

  const enterChatbotMode = () => {
    router.push(buildAiPlanningHref(projectId, 'chatbot', planningParam))
  }

  const exitChatbotMode = () => {
    router.push(buildAiPlanningHref(projectId, 'default', planningParam))
  }

  const pt1AnswerSubmission = usePt1AnswerAutoSubmission({
    projectId,
    enabled: !generationRequestId,
    questions,
    selectedAnswers,
    customAnswers,
    fieldAnswers,
    readyForApproval: Boolean(planningSessionState.session?.readyForApproval),
    onSessionChange: replacePlanningSession,
  })
  const canEnterPt2 =
    planningSessionState.session?.readyForApproval ||
    pt1AnswerSubmission.hasSavedAllAnswers

  useAiPlanningNavigationStateSync({
    isChatbotMode,
    readyBrief: chatbotViewModel.readyBrief,
    session: planningSessionState.session,
    questions,
    canEnterPt2: Boolean(canEnterPt2),
    hasPendingSave: pt1AnswerSubmission.hasPendingSave,
    hasSaveError: pt1AnswerSubmission.hasSaveError,
  })

  if (isChatbotMode) {
    return (
      <div className="relative h-full flex flex-col">
        <FollowUpChatbot data={chatbotViewModel} />
        <button
          type="button"
          onClick={exitChatbotMode}
          className="absolute top-4 right-4 z-10 text-[10px] text-white/25 transition-colors hover:text-white/50"
        >
          [DEV] 나가기
        </button>
      </div>
    )
  }

  if (planningSessionState.errorMessage) {
    return <PlanningSessionError message={planningSessionState.errorMessage} />
  }

  if (planningSessionState.isLoading && questions.length === 0) {
    return <PlanningSessionLoading />
  }

  if (questions.length === 0) {
    return (
      <PlanningSessionError message="생성된 PT1 질문이 없습니다. 기획 프리세팅 제출 상태를 확인해 주세요." />
    )
  }

  return (
    <div className="pb-32">
      <div className="grid grid-cols-2 gap-y-10">
        {questions.map((question, index) => (
          <div key={question.questionId} className="px-6 min-w-0">
            <PlanningQuestionCard
              question={question}
              index={index}
              selectedValue={selectedAnswers[question.questionId] ?? null}
              customValue={customAnswers[question.questionId] ?? ''}
              fieldValues={fieldAnswers[question.questionId] ?? {}}
              onSelect={(value) => selectAnswer(question.questionId, value)}
              onCustomChange={(value) => changeCustomAnswer(question.questionId, value)}
              onFieldChange={(fieldKey, value) => changeFieldAnswer(question.questionId, fieldKey, value)}
              onCustomBlur={() => undefined}
              onFieldBlur={() => undefined}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={enterChatbotMode}
        className="mt-10 mx-6 text-xs text-white/40 underline underline-offset-2"
      >
        [DEV] 정보 부족 → 챗봇 모드 테스트
      </button>
    </div>
  )
}
