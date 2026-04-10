import type { ThumbnailAnalysisViewModel } from '../types/viewModel'

interface Props {
  data: ThumbnailAnalysisViewModel
}

function AiBadge() {
  return (
    <span className="inline-block text-[10px] font-medium text-black/40 border border-black/20 rounded px-1.5 py-0.5 leading-none">
      AI 추정
    </span>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <p className="text-xs font-semibold text-black/40 uppercase tracking-wider mb-1">{children}</p>
}

function WhyBox({ children }: { children: string }) {
  return (
    <div className="border-2 border-black rounded-xl p-5">
      <p className="text-xs font-bold text-black/50 mb-2">★ 핵심 분석</p>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  )
}

function EvidenceList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-black/60">
          <span className="mt-0.5 shrink-0 text-black/30">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function CrossValidationBox({ match, evidence }: { match: boolean; evidence: string }) {
  return (
    <div className={`rounded-xl p-4 ${match ? 'bg-black/5' : 'bg-black/5'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{match ? '✓' : '✗'}</span>
        <p className="text-xs font-semibold">{match ? '댓글 데이터와 일치' : '댓글 데이터와 불일치'}</p>
      </div>
      <p className="text-sm text-black/60">{evidence}</p>
    </div>
  )
}

export function ThumbnailAnalysisTab({ data }: Props) {
  return (
    <div className="py-8 space-y-8">
      {/* 썸네일 이미지 + 기본 필드 */}
      <div className="flex gap-6 items-stretch">
        {/* 썸네일 이미지 */}
        <div className="shrink-0 aspect-[9/16] rounded-xl overflow-hidden bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.imageUrl}
            alt="썸네일"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 메인 텍스트 ~ 주요 색상 */}
        <div className="flex-1 flex flex-col gap-5">
          {/* 메인 텍스트 */}
          <div>
            <SectionLabel>메인 텍스트</SectionLabel>
            <p className="text-sm font-medium">{data.mainText}</p>
          </div>

          {/* 텍스트 비율 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SectionLabel>텍스트 비율</SectionLabel>
              <AiBadge />
            </div>
            <p className="text-sm font-medium">{data.textRatioPercent}</p>
          </div>

          {/* 레이아웃 구성 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SectionLabel>레이아웃 구성</SectionLabel>
              <AiBadge />
            </div>
            <p className="text-sm text-black/70 leading-relaxed">{data.layoutComposition}</p>
          </div>

          {/* CTR 등급 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SectionLabel>CTR 등급</SectionLabel>
              <AiBadge />
            </div>
            <p className="text-sm font-semibold">{data.ctrGrade}</p>
          </div>

          {/* 주요 색상 */}
          <div>
            <SectionLabel>주요 색상</SectionLabel>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {data.colors.map((color) => (
                <div key={color} className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-black/50 font-mono">{color}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 선택 필드 */}
      {(data.facePresence || data.numberEmphasis || data.emotionTrigger) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-black/[0.03] border border-black/[0.06]">
          {data.facePresence && (
            <div>
              <SectionLabel>얼굴 노출</SectionLabel>
              <p className="text-sm">{data.facePresence}</p>
            </div>
          )}
          {data.numberEmphasis && (
            <div>
              <SectionLabel>숫자 강조</SectionLabel>
              <p className="text-sm">{data.numberEmphasis}</p>
            </div>
          )}
          {data.emotionTrigger && (
            <div>
              <SectionLabel>감정 유발</SectionLabel>
              <p className="text-sm">{data.emotionTrigger}</p>
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
