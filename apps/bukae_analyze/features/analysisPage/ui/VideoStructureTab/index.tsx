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

function EmptySectionCard({ title }: { title: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center rounded-[32px] border border-white/10 bg-white/3 px-6 py-10 text-center">
      <div className="flex flex-col gap-2">
        <p className="font-16-md text-white/80">{title}</p>
        <p className="font-14-rg text-white/45">현재 응답에 표시할 데이터가 없습니다.</p>
      </div>
    </div>
  )
}

/** 탭 우측 패널: 오버뷰 + 타겟 카드 */
export function VideoStructureTab({ data }: Props) {
  return (
    <div className="flex flex-col gap-12">
      <VideoOverviewCard overview={data.overview} />
      {data.directorComment && data.directorComment.length > 0
        ? <DirectorComment comment={data.directorComment} />
        : <EmptySectionCard title="디렉터 코멘트" />}
      <VideoTargetCard
        description={data.targetAudienceDescription}
        attributes={data.targetAudienceAttributes}
      />
    </div>
  )
}

/** 비디오 패널 아래 전폭: 스토리 + 편집/바이럴 + 트렌드/CTA */
export function VideoStructureDetailSections({ data }: Props) {
  const hasEditingPoints = data.editingPoints && data.editingPoints.length > 0
  const hasTrend = data.trendContextDescription && data.trendContextDescription.length > 0
  const hasCta = data.ctaStrategy && data.ctaStrategy.length > 0

  return (
    <div className="mt-8 flex flex-col gap-8">
      <StoryStructureSection segments={data.storyStructure} />

      <div className="flex min-h-0 w-full items-stretch gap-10">
        {hasEditingPoints
          ? <EditingPointsSection points={data.editingPoints!} />
          : <EmptySectionCard title="편집 및 연출 포인트" />}
        <ViralPointsSection points={data.viralPoints} />
      </div>

      <div className="flex min-h-0 w-full items-stretch gap-10">
        {hasTrend
          ? (
            <TrendContextSection
              description={data.trendContextDescription!}
              insights={data.trendInsights ?? []}
            />
          )
          : <EmptySectionCard title="현재 트렌드 맥락" />}
        {hasCta
          ? <CtaStrategySection items={data.ctaStrategy!} />
          : <EmptySectionCard title="CTA 전략" />}
      </div>
    </div>
  )
}
