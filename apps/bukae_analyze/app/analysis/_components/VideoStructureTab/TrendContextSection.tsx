import type { TrendInsightViewModel } from '@/features/videoAnalysis/types/viewModel'
import { glassPanelClass, SectionTitle } from './shared'

interface Props {
  description: string
  insights: TrendInsightViewModel[]
}

export function TrendContextSection({ description, insights }: Props) {
  return (
    <div
      className={`${glassPanelClass} flex h-full min-h-0 w-[clamp(400px,26.67vw,560px)] shrink-0 flex-col items-start px-6 pb-[35px] pt-6`}
    >
      <div className="flex h-full min-h-0 w-full flex-col items-start gap-4">
        <SectionTitle>현재 트렌드 맥락</SectionTitle>
        <div className="flex w-full flex-col gap-4 rounded-lg px-6 py-4">
          <div className="min-w-0 p-2">
            <p className="line-clamp-2 text-[clamp(16px,1.17vw,20px)] font-medium leading-[1.4] tracking-[-0.04em] text-white/80">
              {description}
            </p>
          </div>
          <div className="flex w-full items-center justify-between gap-4">
            {insights.map((insight) => (
              <div
                key={insight.label}
                className="min-w-0 flex-1 rounded-lg bg-white/10 px-6 py-4 backdrop-glass-strong"
              >
                <div className="flex max-h-[65px] min-w-0 flex-col">
                  <p className="min-w-0 truncate text-[clamp(20px,1.17vw,28px)] font-semibold tracking-[-0.04em] text-white">
                    {insight.value}
                  </p>
                  <p className="min-w-0 truncate text-[clamp(16px,1.17vw,20px)] font-medium tracking-[-0.04em] text-white/60">
                    {insight.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
