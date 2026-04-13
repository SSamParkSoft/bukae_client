import type { CommentAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { SectionLabel } from '../shared'

export function CommentKeywords({ data }: { data: CommentAnalysisViewModel }) {
  return (
    <div>
      <SectionLabel>키워드</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {data.keywords.map((kw) => (
          <span key={kw} className="text-sm border border-black/20 rounded-full px-3 py-1">
            {kw}
          </span>
        ))}
      </div>
    </div>
  )
}
