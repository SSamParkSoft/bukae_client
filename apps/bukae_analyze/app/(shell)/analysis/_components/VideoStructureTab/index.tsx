import type { VideoStructureViewModel } from '@/features/videoAnalysis/types/viewModel'
import { VideoOverviewCard } from './VideoOverviewCard'
import { DirectorComment } from './DirectorComment'
import { VideoTargetCard } from './VideoTargetCard'
import { StoryStructureSection } from './StoryStructureSection'
import { EditingPointsSection } from './EditingPointsSection'
import { ViralPointsSection } from './ViralPointsSection'
import { TrendContextSection } from './TrendContextSection'
import { CtaStrategySection } from './CtaStrategySection'

interface Props {
  data: VideoStructureViewModel
}

/** 탭 우측 패널: 오버뷰 + 타겟 카드 */
export function VideoStructureTab({ data }: Props) {
  return (
    <div className="flex flex-col gap-12">
      <VideoOverviewCard overview={data.overview} />
      <DirectorComment comment={data.directorComment} />
      <VideoTargetCard
        description={data.targetAudienceDescription}
        attributes={data.targetAudienceAttributes}
      />
    </div>
  )
}

/** 비디오 패널 아래 전폭: 스토리 + 편집/바이럴 + 트렌드/CTA */
export function VideoStructureDetailSections({ data }: Props) {
  return (
    <div className="mt-8 flex flex-col gap-8">
      <StoryStructureSection segments={data.storyStructure} />

      <div className="flex min-h-0 w-full items-stretch gap-10">
        <EditingPointsSection points={data.editingPoints} />
        <ViralPointsSection points={data.viralPoints} />
      </div>

      <div className="flex min-h-0 w-full items-stretch gap-10">
        <TrendContextSection description={data.trendContextDescription} insights={data.trendInsights} />
        <CtaStrategySection items={data.ctaStrategy} />
      </div>
    </div>
  )
}
