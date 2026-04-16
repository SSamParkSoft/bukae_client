import type { ThumbnailAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { WhyBox, SectionLabel, EvidenceList /*, CrossValidationBox */ } from '../shared'
import { ThumbnailImage } from './ThumbnailImage'
import { ThumbnailFields } from './ThumbnailFields'

interface Props {
  data: ThumbnailAnalysisViewModel
}

export function ThumbnailAnalysisTab({ data }: Props) {
  return (
    <div className="py-8 space-y-8">
      <div className="flex gap-6 items-stretch">
        <ThumbnailImage imageUrl={data.imageUrl} />
        <ThumbnailFields data={data} />
      </div>

      <WhyBox>{data.why}</WhyBox>

      <div>
        <SectionLabel>분석 근거</SectionLabel>
        <EvidenceList items={data.evidence} />
      </div>

      {/* MVP 제외: 댓글 교차 검증
      <div>
        <SectionLabel>댓글 교차 검증</SectionLabel>
        <CrossValidationBox
          match={data.crossValidation.match}
          evidence={data.crossValidation.evidence}
        />
      </div>
      */}
    </div>
  )
}
