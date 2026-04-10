import type { SentimentBarViewModel } from '../../types/viewModel'

export function SentimentBar({ positivePercent, negativePercent, neutralPercent }: SentimentBarViewModel) {
  return (
    <div className="space-y-2">
      <div className="flex w-full h-4 rounded-full overflow-hidden">
        <div className="bg-black transition-all" style={{ width: `${positivePercent}%` }} />
        <div className="bg-black/20 transition-all" style={{ width: `${neutralPercent}%` }} />
        <div className="bg-black/10 transition-all" style={{ width: `${negativePercent}%` }} />
      </div>
      <div className="flex gap-4 text-xs text-black/60">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-black inline-block" />
          긍정 {positivePercent}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-black/20 inline-block" />
          중립 {neutralPercent}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-black/10 border border-black/20 inline-block" />
          부정 {negativePercent}%
        </span>
      </div>
    </div>
  )
}
