import type { HookAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { HookMetrics } from './HookMetrics'
import { HookOptionalFields } from './HookOptionalFields'
import { WhyBox } from '../AnalysisPrimitives'

interface Props {
  data: HookAnalysisViewModel
}

export function HookAnalysisTab({ data }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col">
        <HookOptionalFields data={data} />
        <HookMetrics data={data} />
      </div>
      {data.why.length > 0 ? <WhyBox sentences={data.why} /> : null}
    </div>
  )
}
