import type { LabeledItemViewModel } from '@/features/videoAnalysis/types/viewModel'
import { glassPanelClass, LabeledRow, SectionTitle } from './shared'

interface Props {
  items: LabeledItemViewModel[]
}

export function CtaStrategySection({ items }: Props) {
  return (
    <div
      className={`${glassPanelClass} flex h-full min-h-0 min-w-0 flex-1 flex-col items-start p-6`}
    >
      <div className="flex h-full min-h-0 w-full flex-col items-start gap-4">
        <SectionTitle>CTA 전략</SectionTitle>
        <div className="flex w-full flex-col items-start">
          {items.map((item) => (
            <LabeledRow key={item.label} {...item} />
          ))}
        </div>
      </div>
    </div>
  )
}
