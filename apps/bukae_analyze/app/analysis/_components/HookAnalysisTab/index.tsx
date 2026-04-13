import type { HookAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { WhyBox, SectionLabel, EvidenceList, CrossValidationBox } from '../shared'
import { HookMetrics } from './HookMetrics'
import { HookOptionalFields } from './HookOptionalFields'

interface Props {
  data: HookAnalysisViewModel
}

export function HookAnalysisTab({ data }: Props) {
  return (
    <div className="py-8 space-y-8">
      <HookMetrics data={data} />
      <HookOptionalFields data={data} />
      <WhyBox>{data.why}</WhyBox>
      <div>
        <SectionLabel>분석 근거</SectionLabel>
        <EvidenceList items={data.evidence} />
      </div>
      <div>
        <SectionLabel>댓글 교차 검증</SectionLabel>
        <CrossValidationBox match={data.crossValidation.match} evidence={data.crossValidation.evidence} />
      </div>
    </div>
  )
}
