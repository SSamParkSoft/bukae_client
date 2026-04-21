import type { CommentAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { SectionLabel } from '../shared'

export function CommentPatterns({ data }: { data: CommentAnalysisViewModel }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <SectionLabel>요청 패턴</SectionLabel>
        <ul className="space-y-1.5">
          {data.requestPatterns.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/60">
              <span className="mt-0.5 shrink-0">•</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <SectionLabel>혼란 포인트</SectionLabel>
        <ul className="space-y-1.5">
          {data.confusionPoints.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/60">
              <span className="mt-0.5 shrink-0">•</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
