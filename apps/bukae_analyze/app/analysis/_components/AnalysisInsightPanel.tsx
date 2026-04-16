import { WhyBox, SectionLabel, EvidenceList } from './shared'

interface Props {
  why: string
  evidence: string[]
}

export function AnalysisInsightPanel({ why, evidence }: Props) {
  return (
    <div className="w-full space-y-8">
      <WhyBox>{why}</WhyBox>
      <div>
        <SectionLabel>분석 근거</SectionLabel>
        <EvidenceList items={evidence} />
      </div>
    </div>
  )
}
