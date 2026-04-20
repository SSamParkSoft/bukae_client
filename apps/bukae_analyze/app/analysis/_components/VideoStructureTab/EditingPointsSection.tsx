import type { LabeledItemViewModel } from '@/features/videoAnalysis/types/viewModel'
import { glassPanelClass, LabeledRow, SectionTitle } from './shared'

interface Props {
  points: LabeledItemViewModel[]
}

export function EditingPointsSection({ points }: Props) {
  return (
    <div
      className={`${glassPanelClass} flex h-full min-h-0 shrink-0 flex-col items-start p-6`}
      style={{ width: 'clamp(400px, 26.67vw, 560px)' }}
    >
      <div className="flex h-full min-h-0 w-full flex-col items-start gap-4">
        <SectionTitle>편집 및 연출 포인트</SectionTitle>
        <div className="flex w-full flex-col items-start">
          {points.map((pt) => (
            <LabeledRow key={pt.label} {...pt} />
          ))}
        </div>
      </div>
    </div>
  )
}
