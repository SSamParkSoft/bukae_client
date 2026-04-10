import type { CommentAnalysisViewModel } from '../types/viewModel'
import { SectionLabel, WhyBox, EvidenceList } from './shared'

interface Props {
  data: CommentAnalysisViewModel
}

function SentimentBar({
  positivePercent,
  negativePercent,
  neutralPercent,
}: {
  positivePercent: number
  negativePercent: number
  neutralPercent: number
}) {
  return (
    <div className="space-y-2">
      {/* 바 */}
      <div className="flex w-full h-4 rounded-full overflow-hidden">
        <div
          className="bg-black transition-all"
          style={{ width: `${positivePercent}%` }}
        />
        <div
          className="bg-black/20 transition-all"
          style={{ width: `${neutralPercent}%` }}
        />
        <div
          className="bg-black/10 transition-all"
          style={{ width: `${negativePercent}%` }}
        />
      </div>
      {/* 범례 */}
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

export function CommentAnalysisTab({ data }: Props) {
  return (
    <div className="py-8 space-y-8">
      {/* 타겟 신호 */}
      <div>
        <SectionLabel>실제 타겟 신호</SectionLabel>
        <p className="text-sm leading-relaxed text-black/80">{data.targetAudienceSignal}</p>
      </div>

      {/* 감성 비율 */}
      <div>
        <SectionLabel>감성 비율</SectionLabel>
        <SentimentBar
          positivePercent={data.sentimentBar.positivePercent}
          negativePercent={data.sentimentBar.negativePercent}
          neutralPercent={data.sentimentBar.neutralPercent}
        />
        {data.conversionComments !== undefined && (
          <p className="mt-3 text-sm text-black/60">
            전환 댓글(구매/결정 완료){' '}
            <span className="font-bold text-black">{data.conversionComments}개</span>
          </p>
        )}
      </div>

      {/* TOP 3 주제 */}
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

      {/* 칭찬 키워드 */}
      <div>
        <SectionLabel>칭찬 키워드</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {data.praiseKeywords.map((kw) => (
            <span
              key={kw}
              className="text-sm border border-black/20 rounded-full px-3 py-1"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* 요청 패턴 + 혼란 포인트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <SectionLabel>요청 패턴</SectionLabel>
          <ul className="space-y-1.5">
            {data.requestPatterns.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-black/60">
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
              <li key={i} className="flex items-start gap-2 text-sm text-black/60">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ★ 핵심 분석 */}
      <WhyBox>{data.why}</WhyBox>

      {/* 근거 */}
      <div>
        <SectionLabel>분석 근거</SectionLabel>
        <EvidenceList items={data.evidence} />
      </div>
    </div>
  )
}
