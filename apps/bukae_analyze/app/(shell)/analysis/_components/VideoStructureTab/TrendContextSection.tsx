import type { TrendInsightViewModel } from '@/features/videoAnalysis/types/viewModel'
import { BulletSentenceList, glassPanelClass, SectionTitle } from './VideoStructurePrimitives'

interface Props {
  description: string[]
  insights: TrendInsightViewModel[]
}

export function TrendContextSection({ description, insights }: Props) {
  return (
    <div
      className={`${glassPanelClass} flex h-full min-h-0 shrink-0 flex-col items-start px-6 pb-[35px] pt-6`}
      style={{ width: 'clamp(400px, 26.67vw, 560px)' }}
    >
      <div className="flex h-full min-h-0 w-full flex-col items-start gap-4">
        <SectionTitle>현재 트렌드 맥락</SectionTitle>
        <div className="flex w-full flex-col gap-4 rounded-lg px-6 py-4">
          <div className="min-w-0 p-2">
            <BulletSentenceList
              sentences={description}
              itemClassName="whitespace-pre-line font-fluid-16-md text-white/80"
            />
          </div>
          <div className="flex w-full items-center justify-between gap-4">
            {insights.map((insight) => (
              <div
                key={insight.label}
                className="min-w-0 flex-1 rounded-lg bg-white/10 px-6 py-4"
              >
                <div className="flex max-h-[65px] min-w-0 flex-col">
                  <p className="min-w-0 font-fluid-20-sm text-white">
                    {insight.value}
                  </p>
                  <p className="min-w-0 font-fluid-16-md text-white/60">
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
