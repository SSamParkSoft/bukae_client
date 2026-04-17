import type { VideoStructureViewModel } from '@/features/videoAnalysis/types/viewModel'
import { VideoOverviewCard } from './VideoOverviewCard'
import { VideoTargetCard } from './VideoTargetCard'

interface Props {
  data: VideoStructureViewModel
}

export function VideoStructureTab({ data }: Props) {
  return (
    <div className="flex flex-col gap-8 mt-10">
      <VideoOverviewCard overview={data.overview} />
      <VideoTargetCard
        description={data.targetAudienceDescription}
        attributes={data.targetAudienceAttributes}
      />
    </div>
  )
}
