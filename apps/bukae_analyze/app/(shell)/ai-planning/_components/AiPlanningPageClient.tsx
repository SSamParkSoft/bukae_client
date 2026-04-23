'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { postPlanningMessage } from '@/lib/services/planning'
import { usePlanningStore } from '@/store/usePlanningStore'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { useAiPlanningForm } from '@/features/aiPlanning/hooks/form/useAiPlanningForm'
import { useAiPlanningViewModel } from '@/features/aiPlanning/hooks/viewmodel/useAiPlanningViewModel'
import { useFollowUpChatbot } from '@/features/aiPlanning/hooks/state/useFollowUpChatbot'
import { usePlanningSession } from '@/features/aiPlanning/hooks/state/usePlanningSession'
import {
  buildSlotAnswerRequest,
  getDraftAnswerText,
  isQuestionAnswered,
  type PlanningQuestionDraft,
} from '@/features/aiPlanning/lib/planningAnswers'
import { FollowUpChatbot } from './chatbotComponents'
import { PlanningQuestionCard } from './PlanningQuestionCard'
import { PlanningSessionError } from './PlanningSessionError'
import { PlanningSessionLoading } from './PlanningSessionLoading'
import { QuestionBlock } from './AiPlanningQuestionPrimitives'
import type {
  AiPlanningInput,
  PlanningSession,
  PlanningSetupAnswers,
  VideoAnalysis,
} from '@/lib/types/domain'
import { EMPTY_PLANNING_SETUP_ANSWERS } from '@/lib/utils/planningSetupQuery'

type AiPlanningMode = 'default' | 'chatbot'

function buildInput(
  answers: PlanningSetupAnswers,
  analysis: VideoAnalysis
): AiPlanningInput {
  return {
    category:
      answers.category === 'custom' || answers.category === null
        ? 'self-narrative'
        : answers.category,
    coreMaterial: answers.coreMaterial,
    referenceContext: {
      hookingStyleLabel: `${analysis.hook.openingType} — ${(analysis.hook.firstSentence ?? '').slice(0, 20)}…`,
      storyPatternLabel: `${analysis.structure.storyStructure.slice(0, 40)}…`,
      emotionTriggerLabel: analysis.hook.emotionTrigger,
      ctaStyleLabel: `${
        analysis.structure.ctaStrategy?.[0]?.label ??
        analysis.structure.storyStructure.slice(0, 30)
      }…`,
    },
  }
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
  initialPlanningAnswers,
  planningParam,
  initialPlanningSession,
}: {
  projectId: string
  mode: AiPlanningMode
  initialPlanningAnswers: PlanningSetupAnswers
  planningParam: string | null
  initialPlanningSession: PlanningSession | null
}) {
  const router = useRouter()
  const isChatbotMode = mode === 'chatbot'

  const storedPlanningAnswers = usePlanningStore((state) => state.answers)
  const planningAnswers =
    planningParam !== null
      ? initialPlanningAnswers
      : storedPlanningAnswers ?? EMPTY_PLANNING_SETUP_ANSWERS
  const input = buildInput(planningAnswers, MOCK_VIDEO_ANALYSIS)

  const form = useAiPlanningForm()
  const viewModel = useAiPlanningViewModel(input, form)
  const chatbotViewModel = useFollowUpChatbot()
  const planningSessionState = usePlanningSession(projectId, initialPlanningSession)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})
  const [fieldAnswers, setFieldAnswers] = useState<Record<string, Record<string, string>>>({})
  const [saveStatusByQuestionId, setSaveStatusByQuestionId] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({})
  const saveTimersRef = useRef<Record<string, number>>({})
  const lastSubmittedSignatureRef = useRef<Record<string, string>>({})
  const setNavigationState = useAiPlanningStore((state) => state.setNavigationState)
  const resetAiPlanningStore = useAiPlanningStore((state) => state.reset)

  const questions = useMemo(
    () => planningSessionState.session?.clarifyingQuestions ?? [],
    [planningSessionState.session]
  )

  function getDraft(questionId: string, overrides?: Partial<PlanningQuestionDraft>): PlanningQuestionDraft {
    return {
      selectedValue: selectedAnswers[questionId] ?? null,
      customValue: customAnswers[questionId] ?? '',
      fieldValues: fieldAnswers[questionId] ?? {},
      ...overrides,
    }
  }

  async function submitQuestionAnswer(
    questionId: string,
    draftOverride?: Partial<PlanningQuestionDraft>
  ): Promise<void> {
    const question = questions.find((item) => item.questionId === questionId)
    if (!question) return

    const draft = getDraft(questionId, draftOverride)
    const request = buildSlotAnswerRequest(question, draft)

    if (!request) return

    const signature = JSON.stringify(request)
    if (lastSubmittedSignatureRef.current[questionId] === signature) {
      return
    }

    setSaveStatusByQuestionId((prev) => ({ ...prev, [questionId]: 'saving' }))

    try {
      const nextSession = await postPlanningMessage(projectId, request)
      lastSubmittedSignatureRef.current[questionId] = signature
      planningSessionState.replaceSession(nextSession)
      setSaveStatusByQuestionId((prev) => ({ ...prev, [questionId]: 'saved' }))
    } catch {
      setSaveStatusByQuestionId((prev) => ({ ...prev, [questionId]: 'error' }))
    }
  }

  function scheduleQuestionSubmit(
    questionId: string,
    draftOverride?: Partial<PlanningQuestionDraft>
  ) {
    const existingTimer = saveTimersRef.current[questionId]
    if (existingTimer) {
      window.clearTimeout(existingTimer)
    }

    saveTimersRef.current[questionId] = window.setTimeout(() => {
      void submitQuestionAnswer(questionId, draftOverride)
    }, 800)
  }

  useEffect(() => {
    const timerEntries = saveTimersRef.current

    return () => {
      Object.values(timerEntries).forEach((timerId) => {
        window.clearTimeout(timerId)
      })
      resetAiPlanningStore()
    }
  }, [resetAiPlanningStore])

  const enterChatbotMode = () => {
    router.push(buildAiPlanningHref(projectId, 'chatbot', planningParam))
  }

  const exitChatbotMode = () => {
    router.push(buildAiPlanningHref(projectId, 'default', planningParam))
  }

  const answersByQuestionId = questions.reduce<Record<string, string>>((acc, question) => {
    const draft = getDraft(question.questionId)
    if (isQuestionAnswered(question, draft)) {
      acc[question.questionId] = getDraftAnswerText(question, draft)
    }
    return acc
  }, {})

  const hasPendingSave = Object.values(saveStatusByQuestionId).some((status) => status === 'saving')
  const canEnterPt2 =
    planningSessionState.session?.readyForApproval ||
    (questions.length > 0 &&
      questions.every((question) => {
        return Boolean(answersByQuestionId[question.questionId]?.trim())
      }))

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
      canProceed: Boolean(canEnterPt2) && !hasPendingSave,
      nextTarget: planningSessionState.session?.readyForApproval ? 'shooting-guide' : 'chatbot',
      planningSessionId: planningSessionState.session?.planningSessionId ?? null,
    })
  }, [
    canEnterPt2,
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

  return (
    <div className="pb-32">
      <div className="grid grid-cols-2 gap-y-10">
        {questions.length > 0 ? (
          questions.map((question, index) => (
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
                    void submitQuestionAnswer(question.questionId, {
                      selectedValue: value,
                      customValue: '',
                    })
                  }
                }}
                onCustomChange={(value) => {
                  setCustomAnswers((prev) => ({ ...prev, [question.questionId]: value }))
                  scheduleQuestionSubmit(question.questionId, {
                    selectedValue: 'custom',
                    customValue: value,
                  })
                }}
                onFieldChange={(fieldKey, value) => {
                  setFieldAnswers((prev) => ({
                    ...prev,
                    [question.questionId]: {
                      ...(prev[question.questionId] ?? {}),
                      [fieldKey]: value,
                    },
                  }))
                  scheduleQuestionSubmit(question.questionId, {
                    fieldValues: {
                      ...(fieldAnswers[question.questionId] ?? {}),
                      [fieldKey]: value,
                    },
                  })
                }}
                onCustomBlur={() => {
                  void submitQuestionAnswer(question.questionId)
                }}
                onFieldBlur={(_fieldKey) => {
                  void submitQuestionAnswer(question.questionId)
                }}
              />
            </div>
          ))
        ) : (
          viewModel.questions.map((q) => (
            <div key={q.questionNumber} className="px-6 min-w-0">
              <QuestionBlock data={q} />
            </div>
          ))
        )}
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
