'use client'

import { usePlanningSetupViewModel } from '@/features/planningSetup/hooks/usePlanningSetupViewModel'
import { CategoryQuestion } from './_components/CategoryQuestion'
import { FaceExposureQuestion } from './_components/FaceExposureQuestion'
import { VideoLengthQuestion } from './_components/VideoLengthQuestion'
import { ShootingQuestion } from './_components/ShootingQuestion'
import { CoreMaterialQuestion } from './_components/CoreMaterialQuestion'
import { PageTitle } from '@/components/pageShared/PageTitle'

export default function PlanningSetupPage() {
  const viewModel = usePlanningSetupViewModel()

  return (
    <div className="px-8 pt-10 pb-16">
      <PageTitle
        title="기획 설정"
        description={[
          '영상을 기획하기 전, 몇 가지 질문에 답해 주세요.',
          'AI가 더 정확한 기획안을 제안해 드릴 수 있어요.',
        ]}
      />
      <div className="mt-10 flex flex-col gap-10">
        <CategoryQuestion data={viewModel.category} />
        <FaceExposureQuestion data={viewModel.faceExposure} />
        <VideoLengthQuestion data={viewModel.videoLength} />
        <ShootingQuestion data={viewModel.shooting} />
        <CoreMaterialQuestion data={viewModel.coreMaterial} />
      </div>
    </div>
  )
}
