import { WhyBox, EvidenceList } from './shared'

interface Props {
  why: string
  evidence: string[]
}

export function AnalysisInsightPanel({ why, evidence }: Props) {
  return (
    <div className="w-full space-y-16 mt-10">
      <WhyBox>{why}</WhyBox>
      <div className="flex flex-col gap-6">
        <p className="font-20-md leading-none text-white/60">분석 근거</p>
        <EvidenceList items={evidence} />
      </div>
    </div>
  )
}
