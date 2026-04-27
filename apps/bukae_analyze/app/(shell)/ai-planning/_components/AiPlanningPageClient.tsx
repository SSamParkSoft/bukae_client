'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { postPlanningMessage } from '@/lib/services/planning'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { useFollowUpChatbot } from '@/features/aiPlanning/hooks/state/useFollowUpChatbot'
import { usePlanningSession } from '@/features/aiPlanning/hooks/state/usePlanningSession'
import { buildSlotAnswerRequest } from '@/features/aiPlanning/lib/planningAnswers'
import { FollowUpChatbot } from './chatbotComponents'
import { PlanningQuestionCard } from './PlanningQuestionCard'
import { PlanningSessionError } from './PlanningSessionError'
import { PlanningSessionLoading } from './PlanningSessionLoading'
import type { PlanningMessageRequestDto } from '@/lib/types/api'
import type { PlanningSession } from '@/lib/types/domain'

type AiPlanningMode = 'default' | 'chatbot'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AnswerRequest {
  questionId: string
  request: PlanningMessageRequestDto
  signature: string
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

  const chatbotViewModel = useFollowUpChatbot()
  const planningSessionState = usePlanningSession(projectId, initialPlanningSession)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})
  const [fieldAnswers, setFieldAnswers] = useState<Record<string, Record<string, string>>>({})
  const [saveStatusByQuestionId, setSaveStatusByQuestionId] = useState<Record<string, SaveStatus>>({})
  const lastSubmittedSignatureRef = useRef<Record<string, string>>({})
  const isSubmittingAnswersRef = useRef(false)
  const setNavigationState = useAiPlanningStore((state) => state.setNavigationState)
  const resetAiPlanningStore = useAiPlanningStore((state) => state.reset)
  const replacePlanningSession = planningSessionState.replaceSession

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

  const answerRequests = useMemo((): AnswerRequest[] => {
    if (questions.length === 0) return []

    const requests = questions.map((question) => {
      const request = buildSlotAnswerRequest(question, {
        selectedValue: selectedAnswers[question.questionId] ?? null,
        customValue: customAnswers[question.questionId] ?? '',
        fieldValues: fieldAnswers[question.questionId] ?? {},
      })
      if (!request) return null

      return {
        questionId: question.questionId,
        request,
        signature: JSON.stringify(request),
      }
    })

    if (requests.some((request) => request === null)) {
      return []
    }

    return requests as AnswerRequest[]
  }, [questions, selectedAnswers, customAnswers, fieldAnswers])

  const hasAnsweredAllQuestions =
    questions.length > 0 && answerRequests.length === questions.length
  const hasPendingSave = Object.values(saveStatusByQuestionId).some((status) => status === 'saving')
  const hasSaveError = Object.values(saveStatusByQuestionId).some((status) => status === 'error')
  const canEnterPt2 =
    planningSessionState.session?.readyForApproval ||
    hasAnsweredAllQuestions

  useEffect(() => {
    if (!hasAnsweredAllQuestions || planningSessionState.session?.readyForApproval) {
      return
    }

    if (isSubmittingAnswersRef.current) {
      return
    }

    const unsavedRequests = answerRequests.filter(({ questionId, signature }) => {
      return lastSubmittedSignatureRef.current[questionId] !== signature
    })

    if (unsavedRequests.length === 0) {
      return
    }

    let cancelled = false
    isSubmittingAnswersRef.current = true

    async function submitAllAnswers() {
      setSaveStatusByQuestionId((prev) => {
        const next = { ...prev }
        unsavedRequests.forEach(({ questionId }) => {
          next[questionId] = 'saving'
        })
        return next
      })

      let latestSession: PlanningSession | null = null

      for (const { questionId, request, signature } of unsavedRequests) {
        if (cancelled) return

        try {
          latestSession = await postPlanningMessage(projectId, request)
          lastSubmittedSignatureRef.current[questionId] = signature
          setSaveStatusByQuestionId((prev) => ({ ...prev, [questionId]: 'saved' }))
        } catch {
          setSaveStatusByQuestionId((prev) => ({ ...prev, [questionId]: 'error' }))
          return
        }
      }

      if (latestSession && !cancelled) {
        replacePlanningSession(latestSession)
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
    planningSessionState.session?.readyForApproval,
    projectId,
    replacePlanningSession,
  ])

  useEffect(() => {
    if (isChatbotMode) {
      setNavigationState({
        canProceed: false,
        nextTarget: null,
        planningSessionId: planningSessionState.session?.planningSessionId ?? null,
      })
      return
    }

    setNavigationState({
      canProceed: Boolean(canEnterPt2) && !hasPendingSave && !hasSaveError,
      nextTarget: planningSessionState.session?.readyForApproval ? 'shooting-guide' : 'chatbot',
      planningSessionId: planningSessionState.session?.planningSessionId ?? null,
    })
  }, [
    canEnterPt2,
    hasSaveError,
    hasPendingSave,
    isChatbotMode,
    planningSessionState.session?.planningSessionId,
    planningSessionState.session?.readyForApproval,
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
              onSelect={(value) => {
                setSelectedAnswers((prev) => ({ ...prev, [question.questionId]: value }))
                if (value !== 'custom') {
                  setCustomAnswers((prev) => ({ ...prev, [question.questionId]: '' }))
                }
              }}
              onCustomChange={(value) => {
                setSelectedAnswers((prev) => ({ ...prev, [question.questionId]: 'custom' }))
                setCustomAnswers((prev) => ({ ...prev, [question.questionId]: value }))
              }}
              onFieldChange={(fieldKey, value) => {
                setFieldAnswers((prev) => ({
                  ...prev,
                  [question.questionId]: {
                    ...(prev[question.questionId] ?? {}),
                    [fieldKey]: value,
                  },
                }))
              }}
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
