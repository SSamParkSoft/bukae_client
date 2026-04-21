import type { SentimentBarViewModel } from '@/features/videoAnalysis/types/viewModel'

export function SentimentBar({ positivePercent, negativePercent, neutralPercent }: SentimentBarViewModel) {
  return (
    <div className="space-y-2">
      <div className="flex w-full h-4 rounded-full overflow-hidden">
        <div className="bg-white transition-all" style={{ width: `${positivePercent}%` }} />
        <div className="bg-white/35 transition-all" style={{ width: `${neutralPercent}%` }} />
        <div className="bg-white/20 transition-all" style={{ width: `${negativePercent}%` }} />
      </div>
      <div className="flex gap-4 text-xs text-white/60">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white inline-block" />
          긍정 {positivePercent}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white/35 inline-block" />
          중립 {neutralPercent}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white/20 border border-white/30 inline-block" />
          부정 {negativePercent}%
        </span>
      </div>
    </div>
  )
}
