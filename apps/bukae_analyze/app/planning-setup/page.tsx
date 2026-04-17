'use client'

import { usePlanningSetupForm } from '@/features/planningSetup/hooks/form/usePlanningSetupForm'
import { usePlanningSetupViewModel } from '@/features/planningSetup/hooks/viewmodel/usePlanningSetupViewModel'
import { CategoryQuestion } from './_components/CategoryQuestion'
import { FaceExposureQuestion } from './_components/FaceExposureQuestion'
import { VideoLengthQuestion } from './_components/VideoLengthQuestion'
import { ShootingQuestion } from './_components/ShootingQuestion'
import { CoreMaterialQuestion } from './_components/CoreMaterialQuestion'
import { PageTitle } from '@/components/pageShared/PageTitle'

export default function PlanningSetupPage() {
  const form = usePlanningSetupForm()
  const viewModel = usePlanningSetupViewModel(form)

  return (
    <div className="pt-10 pb-32">
      <PageTitle
        title="기획 프리세팅"
        description="영상을 기획하기 전에 사전 설정하면, AI가 더 정확한 기획안을 제안해드릴 수 있어요."
      />

      {/* 구분선 */}
      <div className="mx-6 mt-6 mb-10 h-px bg-white/40" />

      {/* 두 컬럼 레이아웃 */}
      <div className="flex">
        {/* 왼쪽: 카테고리 + 영상 길이 */}
        <div className="flex-1 min-w-0 px-6 flex flex-col gap-10">
          <CategoryQuestion data={viewModel.category} />
          <div className="h-px bg-white/20" />
          <VideoLengthQuestion data={viewModel.videoLength} />
        </div>

        {/* 오른쪽: 노출 범위 + 촬영 방식 + 영상 소스 */}
        <div className="flex-1 min-w-0 px-6 flex flex-col gap-10">
          <FaceExposureQuestion data={viewModel.faceExposure} />
          <div className="h-px bg-white/20" />
          <ShootingQuestion data={viewModel.shooting} />
          <div className="h-px bg-white/20" />
          <CoreMaterialQuestion data={viewModel.coreMaterial} />
        </div>
      </div>
    </div>
  )
}
