import { PageTitle } from '@/components/page/PageTitle'
import { AnalysisLoadingOverlay } from '@/components/loading/AnalysisLoadingOverlay'

export default function ShootingGuideLoading() {
  return (
    <div className="px-8 pt-10 pb-16 space-y-4">
      <PageTitle
        title="촬영가이드 & 스크립트"
        description="분석 결과를 바탕으로 촬영 가이드와 스크립트를 제공해요."
      />
      <div className="relative min-h-[640px]">
        <AnalysisLoadingOverlay
          visible
          label="촬영가이드와 스크립트를 불러오는 중입니다."
        />
      </div>
    </div>
  )
}
