'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { usePlanningStore } from '@/store/usePlanningStore'
import { useAiPlanningForm } from '@/features/aiPlanning/hooks/form/useAiPlanningForm'
import { useAiPlanningViewModel } from '@/features/aiPlanning/hooks/viewmodel/useAiPlanningViewModel'
import { useFollowUpChatbot } from '@/features/aiPlanning/hooks/state/useFollowUpChatbot'
import { usePlanningSession } from '@/features/aiPlanning/hooks/state/usePlanningSession'
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

  const questions = useMemo(
    () => planningSessionState.session?.clarifyingQuestions ?? [],
    [planningSessionState.session]
  )

  const questionColumns = useMemo(() => {
    const left: typeof questions = []
    const right: typeof questions = []

    questions.forEach((question, index) => {
      if (index % 2 === 0) {
        left.push(question)
      } else {
        right.push(question)
      }
    })

    return [left, right] as const
  }, [questions])

  const enterChatbotMode = () => {
    router.push(buildAiPlanningHref(projectId, 'chatbot', planningParam))
  }

  const exitChatbotMode = () => {
    router.push(buildAiPlanningHref(projectId, 'default', planningParam))
  }

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
          questionColumns.map((column, columnIndex) => (
            <div key={columnIndex} className="flex min-w-0 flex-col gap-10 px-6">
              {column.map((question, questionIndex) => {
                const absoluteIndex = columnIndex === 0 ? questionIndex * 2 : questionIndex * 2 + 1

                return (
                  <PlanningQuestionCard
                    key={question.questionId}
                    question={question}
                    index={absoluteIndex}
                    selectedValue={selectedAnswers[question.questionId] ?? null}
                    customValue={customAnswers[question.questionId] ?? ''}
                    fieldValues={fieldAnswers[question.questionId] ?? {}}
                    onSelect={(value) => {
                      setSelectedAnswers((prev) => ({ ...prev, [question.questionId]: value }))
                    }}
                    onCustomChange={(value) => {
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
                  />
                )
              })}
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
