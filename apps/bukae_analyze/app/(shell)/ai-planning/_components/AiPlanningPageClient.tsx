'use client'

import { useRouter } from 'next/navigation'
import { MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { usePlanningStore } from '@/store/usePlanningStore'
import { useAiPlanningForm } from '@/features/aiPlanning/hooks/form/useAiPlanningForm'
import { useAiPlanningViewModel } from '@/features/aiPlanning/hooks/viewmodel/useAiPlanningViewModel'
import { useFollowUpChatbot } from '@/features/aiPlanning/hooks/state/useFollowUpChatbot'
import { FollowUpChatbot } from './chatbotComponents'
import { QuestionBlock } from './AiPlanningQuestionPrimitives'
import type {
  AiPlanningInput,
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
}: {
  projectId: string
  mode: AiPlanningMode
  initialPlanningAnswers: PlanningSetupAnswers
  planningParam: string | null
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

  return (
    <div className="pb-32">
      <div className="grid grid-cols-2 gap-y-10">
        {viewModel.questions.map((q) => (
          <div key={q.questionNumber} className="px-6 min-w-0">
            <QuestionBlock data={q} />
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
