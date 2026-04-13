'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { usePlanningStore } from '@/store/usePlanningStore'
import { useAiPlanningForm } from '@/features/aiPlanning/hooks/form/useAiPlanningForm'
import { useAiPlanningViewModel } from '@/features/aiPlanning/hooks/viewmodel/useAiPlanningViewModel'
import { useFollowUpChatbot } from '@/features/aiPlanning/hooks/state/useFollowUpChatbot'
import { HookingQuestion } from './_components/HookingQuestion'
import { StoryDirectionQuestion } from './_components/StoryDirectionQuestion'
import { CoreMessageQuestion } from './_components/CoreMessageQuestion'
import { AudienceReactionQuestion } from './_components/AudienceReactionQuestion'
import { CtaQuestion } from './_components/CtaQuestion'
import { FollowUpChatbot } from './_components/chatbotComponents'
import { PageTitle } from '@/components/pageShared/PageTitle'
import type { AiPlanningInput } from '@/lib/types/domain'

function buildReferenceContext(analysis: typeof MOCK_VIDEO_ANALYSIS) {
  return {
    hookingStyleLabel: `${analysis.hook.openingType} — ${(analysis.hook.firstSentence ?? '').slice(0, 20)}…`,
    storyPatternLabel: analysis.structure.storyStructure.slice(0, 40) + '…',
    emotionTriggerLabel: analysis.hook.emotionTrigger,
    ctaStyleLabel: analysis.structure.ctaStrategy.slice(0, 30) + '…',
  }
}

export default function AiPlanningPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isChatbotMode = searchParams.get('mode') === 'chatbot'

  const planningAnswers = usePlanningStore(state => state.answers)

  const input: AiPlanningInput = {
    category: (planningAnswers.category === 'custom' || planningAnswers.category === null)
      ? 'self-narrative'
      : planningAnswers.category,
    coreMaterial: planningAnswers.coreMaterial,
    referenceContext: buildReferenceContext(MOCK_VIDEO_ANALYSIS),
  }

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
          className="absolute top-4 right-4 text-[10px] text-black/20 hover:text-black/40 transition-colors z-10"
        >
          [DEV] 나가기
        </button>
      </div>
    )
  }

  return (
    <div className="px-8 pt-10 pb-16">
      <PageTitle
        title="AI 기획"
        description={[
          '레퍼런스 영상 분석을 바탕으로 질문에 답해 주세요.',
          'AI가 다음 영상의 기획 방향을 제안해 드릴게요.',
        ]}
      />
      <div className="mt-10 flex flex-col gap-10">
        <HookingQuestion data={viewModel.hooking} />
        <StoryDirectionQuestion data={viewModel.storyDirection} />
        <CoreMessageQuestion data={viewModel.coreMessage} />
        <AudienceReactionQuestion data={viewModel.audienceReaction} />
        <CtaQuestion data={viewModel.cta} />
      </div>
      {/* 서버 미연동 시 개발용 토글 */}
      <button
        type="button"
        onClick={enterChatbotMode}
        className="mt-10 text-xs text-black/30 underline underline-offset-2"
      >
        [DEV] 정보 부족 → 챗봇 모드 테스트
      </button>
    </div>
  )
}
