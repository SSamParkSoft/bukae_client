import type { CommentAnalysisViewModel } from '../../types/viewModel'
import { SectionLabel } from '../shared'

export function CommentAudience({ data }: { data: CommentAnalysisViewModel }) {
  return (
    <div>
      <SectionLabel>실제 타겟 신호</SectionLabel>
      <p className="text-sm leading-relaxed text-black/80">{data.targetAudienceSignal}</p>
    </div>
  )
}
