'use client'

import { usePlanningSetupForm } from '@/features/planningSetup/hooks/form/usePlanningSetupForm'
import { usePlanningSetupViewModel } from '@/features/planningSetup/hooks/viewmodel/usePlanningSetupViewModel'
import { CategoryQuestion } from './CategoryQuestion'
import { CoreMaterialQuestion } from './CoreMaterialQuestion'
import { FaceExposureQuestion } from './FaceExposureQuestion'
import { ShootingQuestion } from './ShootingQuestion'
import { VideoLengthQuestion } from './VideoLengthQuestion'

export function PlanningSetupPageClient() {
  const form = usePlanningSetupForm()
  const viewModel = usePlanningSetupViewModel(form)

  return (
    <div className="pb-32">
      <div className="flex">
        <div className="flex flex-1 min-w-0 flex-col gap-10 px-6">
          <CategoryQuestion data={viewModel.category} />
          <div className="h-px bg-white/20" />
          <VideoLengthQuestion data={viewModel.videoLength} />
        </div>

        <div className="flex flex-1 min-w-0 flex-col gap-10 px-6">
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
