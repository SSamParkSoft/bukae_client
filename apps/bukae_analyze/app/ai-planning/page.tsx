'use client'

import { MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { usePlanningStore } from '@/store/usePlanningStore'
import { useAiPlanningViewModel } from '@/features/aiPlanning/hooks/useAiPlanningViewModel'
import { HookingQuestion } from '@/features/aiPlanning/components/HookingQuestion'
import { StoryDirectionQuestion } from '@/features/aiPlanning/components/StoryDirectionQuestion'
import { CoreMessageQuestion } from '@/features/aiPlanning/components/CoreMessageQuestion'
import { AudienceReactionQuestion } from '@/features/aiPlanning/components/AudienceReactionQuestion'
import { CtaQuestion } from '@/features/aiPlanning/components/CtaQuestion'
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
  const planningAnswers = usePlanningStore(state => state.answers)

  const input: AiPlanningInput = {
    category: (planningAnswers.category === 'custom' || planningAnswers.category === null)
      ? 'self-narrative'
      : planningAnswers.category,
    coreMaterial: planningAnswers.coreMaterial,
    referenceContext: buildReferenceContext(MOCK_VIDEO_ANALYSIS),
  }

  const viewModel = useAiPlanningViewModel(input)

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
    </div>
  )
}
