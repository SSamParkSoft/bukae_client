import type { ThumbnailAnalysisViewModel } from '../types/viewModel'
import { AiBadge, SectionLabel, WhyBox, EvidenceList, CrossValidationBox } from './shared'

interface Props {
  data: ThumbnailAnalysisViewModel
}

function ThumbnailImage({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="shrink-0 aspect-[9/16] rounded-xl overflow-hidden bg-black/5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="썸네일" className="w-full h-full object-cover" />
    </div>
  )
}

function ThumbnailFields({ data }: Props) {
  return (
    <div className="flex-1 flex flex-col gap-5">
      <div>
        <SectionLabel>메인 텍스트</SectionLabel>
        <p className="text-sm font-medium">{data.mainText}</p>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SectionLabel>텍스트 비율</SectionLabel>
          <AiBadge />
        </div>
        <p className="text-sm font-medium">{data.textRatioPercent}</p>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SectionLabel>레이아웃 구성</SectionLabel>
          <AiBadge />
        </div>
        <p className="text-sm text-black/70 leading-relaxed">{data.layoutComposition}</p>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SectionLabel>CTR 등급</SectionLabel>
          <AiBadge />
        </div>
        <p className="text-sm font-semibold">{data.ctrGrade}</p>
      </div>
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
  )
}

export function ThumbnailAnalysisTab({ data }: Props) {
  return (
    <div className="py-8 space-y-8">
      <div className="flex gap-6 items-stretch">
        <ThumbnailImage imageUrl={data.imageUrl} />
        <ThumbnailFields data={data} />
      </div>
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
