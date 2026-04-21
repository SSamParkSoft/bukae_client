import { EvidenceList } from './AnalysisPrimitives'

interface Props {
  evidence: string[]
}

export function AnalysisInsightPanel({ evidence }: Props) {
  return (
    <div className="w-full mt-10">
      <div className="flex flex-col gap-6">
        <p className="font-medium tracking-[-0.04em] leading-none text-white/60" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>분석 근거</p>
        <EvidenceList items={evidence} />
      </div>
    </div>
  )
}
