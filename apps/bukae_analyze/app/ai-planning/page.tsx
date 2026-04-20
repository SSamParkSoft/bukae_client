'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { usePlanningStore } from '@/store/usePlanningStore'
import { useAiPlanningForm } from '@/features/aiPlanning/hooks/form/useAiPlanningForm'
import { useAiPlanningViewModel } from '@/features/aiPlanning/hooks/viewmodel/useAiPlanningViewModel'
import { useFollowUpChatbot } from '@/features/aiPlanning/hooks/state/useFollowUpChatbot'
import { FollowUpChatbot } from './_components/chatbotComponents'
import { QuestionBlock } from './_components/shared'
import { PageTitle } from '@/components/pageShared/PageTitle'
import type { AiPlanningInput, PlanningSetupAnswers, VideoAnalysis } from '@/lib/types/domain'

function buildInput(answers: PlanningSetupAnswers, analysis: VideoAnalysis): AiPlanningInput {
  return {
    category: (answers.category === 'custom' || answers.category === null)
      ? 'self-narrative'
      : answers.category,
    coreMaterial: answers.coreMaterial,
    referenceContext: {
      hookingStyleLabel: `${analysis.hook.openingType} — ${(analysis.hook.firstSentence ?? '').slice(0, 20)}…`,
      storyPatternLabel: analysis.structure.storyStructure.slice(0, 40) + '…',
      emotionTriggerLabel: analysis.hook.emotionTrigger,
      ctaStyleLabel: analysis.structure.ctaStrategy.slice(0, 30) + '…',
    },
  }
}

function AiPlanningContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isChatbotMode = searchParams.get('mode') === 'chatbot'

  const planningAnswers = usePlanningStore(state => state.answers)
  const input = buildInput(planningAnswers, MOCK_VIDEO_ANALYSIS)

  const form = useAiPlanningForm()
  const viewModel = useAiPlanningViewModel(input, form)
  const chatbotViewModel = useFollowUpChatbot()

  const enterChatbotMode = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('mode', 'chatbot')
    router.push(`/ai-planning?${params.toString()}`)
  }

  const exitChatbotMode = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('mode')
    router.push(`/ai-planning?${params.toString()}`)
  }

  if (isChatbotMode) {
    return (
      <div className="relative h-full flex flex-col">
        <FollowUpChatbot data={chatbotViewModel} />
        {/* 서버 미연동 시 개발용 토글 */}
        <button
          type="button"
          onClick={exitChatbotMode}
          className="absolute top-4 right-4 text-[10px] text-white/25 hover:text-white/50 transition-colors z-10"
        >
          [DEV] 나가기
        </button>
      </div>
    )
  }

  return (
    <div className="pt-10 pb-32">
      <PageTitle
        title="AI 기획"
        description="레퍼런스 영상 분석을 바탕으로 질문에 답해 주세요. AI가 다음 영상의 기획 방향을 제안해 드릴게요."
      />
      <div className="mx-6 mt-6 mb-10 h-px bg-white/40" />
      <div className="grid grid-cols-2 gap-y-10">
        {viewModel.questions.map(q => (
          <div key={q.questionNumber} className="px-6 min-w-0">
            <QuestionBlock data={q} />
          </div>
        ))}
      </div>
      {/* 서버 미연동 시 개발용 토글 */}
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

export default function AiPlanningPage() {
  return (
    <Suspense>
      <AiPlanningContent />
    </Suspense>
  )
}
