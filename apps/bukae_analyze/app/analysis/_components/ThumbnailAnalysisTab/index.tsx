import type { ThumbnailAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { ThumbnailFields } from './ThumbnailFields'

interface Props {
  data: ThumbnailAnalysisViewModel
}

export function ThumbnailAnalysisTab({ data }: Props) {
  return (
    <div className="py-8">
      <ThumbnailFields data={data} />
    </div>
  )
}
