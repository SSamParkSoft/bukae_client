import type { HookAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { AiBadge, SectionLabel } from '../shared'

const PACING_DOTS: Record<'fast' | 'medium' | 'slow', number> = {
  fast: 3,
  medium: 2,
  slow: 1,
}

function PacingVisual({ pacing, label }: { pacing: 'fast' | 'medium' | 'slow'; label: string }) {
  const filled = PACING_DOTS[pacing]
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full ${i <= filled ? 'bg-black' : 'bg-black/15'}`} />
        ))}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

export function HookMetrics({ data }: { data: HookAnalysisViewModel }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="rounded-xl border border-black/10 p-4 text-center">
        <p className="text-2xl font-bold">{data.durationLabel}</p>
        <SectionLabel>훅 구간</SectionLabel>
      </div>
      <div className="rounded-xl border border-black/10 p-4 col-span-2 md:col-span-1">
        <div className="flex items-center gap-1.5 mb-1">
          <SectionLabel>오프닝 유형</SectionLabel>
          <AiBadge />
        </div>
        <p className="text-sm font-semibold">{data.openingType}</p>
      </div>
      <div className="rounded-xl border border-black/10 p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <SectionLabel>감정 자극</SectionLabel>
          <AiBadge />
        </div>
        <p className="text-sm font-semibold">{data.emotionTrigger}</p>
      </div>
      <div className="rounded-xl border border-black/10 p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <SectionLabel>페이싱</SectionLabel>
          <AiBadge />
        </div>
        <PacingVisual pacing={data.pacing} label={data.pacingLabel} />
      </div>
    </div>
  )
}
