import type { StorySegmentViewModel } from '@/features/videoAnalysis/types/viewModel'
import { glassPanelClass, SectionTitle, StoryRow } from './VideoStructurePrimitives'

interface Props {
  segments: StorySegmentViewModel[]
}

export function StoryStructureSection({ segments }: Props) {
  return (
    <div className={`${glassPanelClass} flex w-full flex-col items-start p-6`}>
      <div className="flex w-full flex-col items-start gap-4">
        <SectionTitle>스토리 전개 구성</SectionTitle>
        <div className="flex w-full flex-col items-start">
          {segments.map((seg) => (
            <StoryRow key={seg.timeframe} {...seg} />
          ))}
        </div>
      </div>
    </div>
  )
}
