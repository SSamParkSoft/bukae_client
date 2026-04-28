'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitPt1SlotAnswer } from '@/lib/services/planning'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { useFollowUpChatbot } from '@/features/aiPlanning/hooks/state/useFollowUpChatbot'
import { usePlanningSession } from '@/features/aiPlanning/hooks/state/usePlanningSession'
import { usePt1AnswerDrafts } from '@/features/aiPlanning/hooks/state/usePt1AnswerDrafts'
import { createAiPlanningNavigationState } from '@/features/aiPlanning/lib/navigationState'
import {
  buildPt1AnswerRequests,
  getUnsavedPt1AnswerRequests,
  hasSavedAllPt1Answers,
  submitPt1AnswerRequests,
} from '@/features/aiPlanning/lib/pt1AnswerRequests'
import { FollowUpChatbot } from './chatbotComponents'
import { PlanningQuestionCard } from './PlanningQuestionCard'
import { PlanningSessionError } from './PlanningSessionError'
import { PlanningSessionLoading } from './PlanningSessionLoading'
import type { PlanningQuestion, PlanningSession } from '@/lib/types/domain'

type AiPlanningMode = 'default' | 'chatbot'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UsePt1AnswerAutoSubmissionParams {
  projectId: string
  questions: PlanningQuestion[]
  selectedAnswers: Record<string, string>
  customAnswers: Record<string, string>
  fieldAnswers: Record<string, Record<string, string>>
  readyForApproval: boolean
  onSessionChange: (nextSession: PlanningSession) => void
}

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

function shouldReplacePlanningSessionAfterPt1Submission(
  session: PlanningSession
): boolean {
  return (
    session.clarifyingQuestions.length > 0 ||
    session.readyForApproval ||
    Boolean(session.failure)
  )
}

function usePt1AnswerAutoSubmission({
  projectId,
  questions,
  selectedAnswers,
  customAnswers,
  fieldAnswers,
  readyForApproval,
  onSessionChange,
}: UsePt1AnswerAutoSubmissionParams) {
  const [saveStatusByQuestionId, setSaveStatusByQuestionId] = useState<Record<string, SaveStatus>>({})
  const [submittedSignatureByQuestionId, setSubmittedSignatureByQuestionId] = useState<Record<string, string>>({})
  const isSubmittingAnswersRef = useRef(false)

  const answerRequests = useMemo(() => {
    return buildPt1AnswerRequests(questions, {
      selectedAnswers,
      customAnswers,
      fieldAnswers,
    })
  }, [questions, selectedAnswers, customAnswers, fieldAnswers])

  const hasAnsweredAllQuestions =
    questions.length > 0 && answerRequests.length === questions.length
  const hasSavedAllAnswers =
    hasAnsweredAllQuestions &&
    hasSavedAllPt1Answers(answerRequests, submittedSignatureByQuestionId)
  const hasPendingSave = Object.values(saveStatusByQuestionId).some((status) => status === 'saving')
  const hasSaveError = Object.values(saveStatusByQuestionId).some((status) => status === 'error')

  useEffect(() => {
    if (!hasAnsweredAllQuestions || readyForApproval) {
      return
    }

    if (isSubmittingAnswersRef.current) {
      return
    }

    const unsavedRequests = getUnsavedPt1AnswerRequests(
      answerRequests,
      submittedSignatureByQuestionId
    )

    if (unsavedRequests.length === 0) {
      return
    }

    let cancelled = false
    isSubmittingAnswersRef.current = true

    async function submitAllAnswers() {
      const latestSession = await submitPt1AnswerRequests({
        projectId,
        requests: unsavedRequests,
        submitAnswer: submitPt1SlotAnswer,
        isCancelled: () => cancelled,
        onQuestionSaving: (questionId) => {
          setSaveStatusByQuestionId((prev) => ({ ...prev, [questionId]: 'saving' }))
        },
        onQuestionSaved: (questionId, signature) => {
          setSubmittedSignatureByQuestionId((prev) => ({ ...prev, [questionId]: signature }))
          setSaveStatusByQuestionId((prev) => ({ ...prev, [questionId]: 'saved' }))
        },
        onQuestionError: (questionId) => {
          setSaveStatusByQuestionId((prev) => ({ ...prev, [questionId]: 'error' }))
        },
      })

      if (
        latestSession &&
        !cancelled &&
        shouldReplacePlanningSessionAfterPt1Submission(latestSession)
      ) {
        onSessionChange(latestSession)
      }
    }

    void submitAllAnswers().finally(() => {
      isSubmittingAnswersRef.current = false
    })

    return () => {
      cancelled = true
    }
  }, [
    answerRequests,
    hasAnsweredAllQuestions,
    onSessionChange,
    projectId,
    readyForApproval,
    submittedSignatureByQuestionId,
  ])

  return {
    hasSavedAllAnswers,
    hasPendingSave,
    hasSaveError,
  }
}

export function AiPlanningPageClient({
  projectId,
  mode,
  planningParam,
  initialPlanningSession,
}: {
  projectId: string
  mode: AiPlanningMode
  planningParam: string | null
  initialPlanningSession: PlanningSession | null
}) {
  const router = useRouter()
  const isChatbotMode = mode === 'chatbot'

  const planningSessionState = usePlanningSession(projectId, initialPlanningSession, !isChatbotMode)
  const {
    selectedAnswers,
    customAnswers,
    fieldAnswers,
    selectAnswer,
    changeCustomAnswer,
    changeFieldAnswer,
  } = usePt1AnswerDrafts()
  const setNavigationState = useAiPlanningStore((state) => state.setNavigationState)
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

  const enterChatbotMode = () => {
    router.push(buildAiPlanningHref(projectId, 'chatbot', planningParam))
  }

  const exitChatbotMode = () => {
    router.push(buildAiPlanningHref(projectId, 'default', planningParam))
  }

  const pt1AnswerSubmission = usePt1AnswerAutoSubmission({
    projectId,
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

  useEffect(() => {
    setNavigationState(createAiPlanningNavigationState({
      isChatbotMode,
      readyBrief: chatbotViewModel.readyBrief,
      session: planningSessionState.session,
      questions,
      canEnterPt2: Boolean(canEnterPt2),
      hasPendingSave: pt1AnswerSubmission.hasPendingSave,
      hasSaveError: pt1AnswerSubmission.hasSaveError,
    }))
  }, [
    canEnterPt2,
    chatbotViewModel.readyBrief,
    isChatbotMode,
    questions,
    planningSessionState.session,
    pt1AnswerSubmission.hasPendingSave,
    pt1AnswerSubmission.hasSaveError,
    setNavigationState,
  ])

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
