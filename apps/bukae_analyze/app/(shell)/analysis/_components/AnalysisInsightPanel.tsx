import { EvidenceList } from './AnalysisPrimitives'

interface Props {
  evidence: string[]
}

export function AnalysisInsightPanel({ evidence }: Props) {
  return (
    <div className="w-full mt-10">
      <div className="flex flex-col gap-6">
        <p className="font-fluid-20-md text-white/60">분석 근거</p>
        <EvidenceList items={evidence} />
      </div>
    </div>
  )
}
