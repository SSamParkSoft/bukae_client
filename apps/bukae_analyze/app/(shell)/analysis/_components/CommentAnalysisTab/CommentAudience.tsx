import type { CommentAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { SectionLabel } from '../AnalysisPrimitives'

export function CommentAudience({ data }: { data: CommentAnalysisViewModel }) {
  return (
    <div>
      <SectionLabel>실제 타겟 신호</SectionLabel>
      <p className="text-sm leading-relaxed text-white/80">{data.targetAudienceSignal}</p>
    </div>
  )
}
