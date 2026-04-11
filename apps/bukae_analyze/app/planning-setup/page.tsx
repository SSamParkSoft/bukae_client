'use client'

import { usePlanningSetupViewModel } from '@/features/planningSetup/hooks/usePlanningSetupViewModel'
import { CategoryQuestion } from '@/features/planningSetup/components/CategoryQuestion'
import { FaceExposureQuestion } from '@/features/planningSetup/components/FaceExposureQuestion'
import { VideoLengthQuestion } from '@/features/planningSetup/components/VideoLengthQuestion'
import { ShootingQuestion } from '@/features/planningSetup/components/ShootingQuestion'
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
      </div>
    </div>
  )
}
