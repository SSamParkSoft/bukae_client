import type { HookAnalysisViewModel } from '../types/viewModel'
import { AiBadge, SectionLabel, WhyBox, EvidenceList, CrossValidationBox } from './shared'

interface Props {
  data: HookAnalysisViewModel
}

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
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full ${i <= filled ? 'bg-black' : 'bg-black/15'}`}
          />
        ))}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

export function HookAnalysisTab({ data }: Props) {
  return (
    <div className="py-8 space-y-8">
      {/* 핵심 수치 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 훅 길이 */}
        <div className="rounded-xl border border-black/10 p-4 text-center">
          <p className="text-2xl font-bold">{data.durationLabel}</p>
          <SectionLabel>훅 구간</SectionLabel>
        </div>

        {/* 오프닝 유형 */}
        <div className="rounded-xl border border-black/10 p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-1.5 mb-1">
            <SectionLabel>오프닝 유형</SectionLabel>
            <AiBadge />
          </div>
          <p className="text-sm font-semibold">{data.openingType}</p>
        </div>

        {/* 감정 자극 */}
        <div className="rounded-xl border border-black/10 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <SectionLabel>감정 자극</SectionLabel>
            <AiBadge />
          </div>
          <p className="text-sm font-semibold">{data.emotionTrigger}</p>
        </div>

        {/* 페이싱 */}
        <div className="rounded-xl border border-black/10 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <SectionLabel>페이싱</SectionLabel>
            <AiBadge />
          </div>
          <PacingVisual pacing={data.pacing} label={data.pacingLabel} />
        </div>
      </div>

      {/* 선택 필드 */}
      {(data.viewerPositioning || data.visualHook || data.firstSentence) && (
        <div className="space-y-4 p-4 rounded-xl bg-black/[0.03] border border-black/[0.06]">
          {data.viewerPositioning && (
            <div>
              <SectionLabel>시청자 포지셔닝</SectionLabel>
              <p className="text-sm">{data.viewerPositioning}</p>
            </div>
          )}
          {data.visualHook && (
            <div>
              <SectionLabel>시각적 훅</SectionLabel>
              <p className="text-sm">{data.visualHook}</p>
            </div>
          )}
          {data.firstSentence && (
            <div>
              <SectionLabel>첫 문장</SectionLabel>
              <p className="text-sm italic text-black/70">{`"${data.firstSentence}"`}</p>
            </div>
          )}
        </div>
      )}

      {/* ★ 핵심 분석 */}
      <WhyBox>{data.why}</WhyBox>

      {/* 근거 */}
      <div>
        <SectionLabel>분석 근거</SectionLabel>
        <EvidenceList items={data.evidence} />
      </div>

      {/* 교차 검증 */}
      <div>
        <SectionLabel>댓글 교차 검증</SectionLabel>
        <CrossValidationBox
          match={data.crossValidation.match}
          evidence={data.crossValidation.evidence}
        />
      </div>
    </div>
  )
}
