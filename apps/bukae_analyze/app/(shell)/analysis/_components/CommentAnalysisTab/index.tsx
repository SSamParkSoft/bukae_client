import type { CommentAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { WhyBox, EvidenceList } from '../shared'
import { CommentAudience } from './CommentAudience'
import { CommentSentiment } from './CommentSentiment'
import { CommentThemes } from './CommentThemes'
import { CommentKeywords } from './CommentKeywords'
import { CommentPatterns } from './CommentPatterns'

interface Props {
  data: CommentAnalysisViewModel
}

export function CommentAnalysisTab({ data }: Props) {
  return (
    <div className="py-8 space-y-8">
      <CommentAudience data={data} />
      <CommentSentiment data={data} />
      <CommentThemes data={data} />
      <CommentKeywords data={data} />
      <CommentPatterns data={data} />
      <WhyBox>{data.why}</WhyBox>
      <div className="flex flex-col gap-6">
        <p className="font-20-md leading-none text-white/60">분석 근거</p>
        <EvidenceList items={data.evidence} />
      </div>
    </div>
  )
}
