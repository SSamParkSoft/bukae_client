import type { HookAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { HookMetrics } from './HookMetrics'
import { HookOptionalFields } from './HookOptionalFields'

interface Props {
  data: HookAnalysisViewModel
}

export function HookAnalysisTab({ data }: Props) {
  return (
    <div className="flex flex-col">
      <HookMetrics data={data} />
      <HookOptionalFields data={data} />
    </div>
  )
}
