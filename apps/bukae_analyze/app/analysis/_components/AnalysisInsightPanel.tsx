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
        <p className="font-medium tracking-[-0.04em] leading-none text-white/60" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>분석 근거</p>
        <EvidenceList items={evidence} />
      </div>
    </div>
  )
}
