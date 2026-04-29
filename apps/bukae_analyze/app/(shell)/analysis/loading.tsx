import { AnalysisLoadingOverlay } from '@/components/loading/AnalysisLoadingOverlay'

export default function AnalysisLoading() {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col pt-10 pb-32">
      <AnalysisLoadingOverlay visible />
    </div>
  )
}
