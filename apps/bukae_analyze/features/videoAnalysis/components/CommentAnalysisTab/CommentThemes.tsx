import type { CommentAnalysisViewModel } from '../../types/viewModel'
import { SectionLabel } from '../shared'

export function CommentThemes({ data }: { data: CommentAnalysisViewModel }) {
  return (
    <div>
      <SectionLabel>댓글 TOP 3 주제</SectionLabel>
      <ol className="space-y-2">
        {data.topThemes.map((theme, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <p className="text-sm text-black/70">{theme}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
