import type { CommentAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { SectionLabel } from '../AnalysisPrimitives'
import { SentimentBar } from './SentimentBar'

export function CommentSentiment({ data }: { data: CommentAnalysisViewModel }) {
  return (
    <div>
      <SectionLabel>감성 비율</SectionLabel>
      <SentimentBar {...data.sentimentBar} />
      {data.conversionComments !== undefined && (
        <p className="mt-3 text-sm text-white/60">
          전환 댓글(구매/결정 완료){' '}
          <span className="font-bold text-white">{data.conversionComments}개</span>
        </p>
      )}
    </div>
  )
}
