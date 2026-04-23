import { AnalysisLoadingOverlay } from '@/components/loading/AnalysisLoadingOverlay'
import { PageTitle } from '@/components/page/PageTitle'

export default function AnalysisLoading() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
      <PageTitle title="AI 분석" description="원본 영상의 핵심 요소를 파악했습니다" />
      <hr className="mb-10 border-b border-white/10" />

      <div className="relative flex min-w-0 flex-1 flex-col pt-10 pb-32">
        <AnalysisLoadingOverlay visible />
      </div>
    </div>
  )
}
