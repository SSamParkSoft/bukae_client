'use client'

import type { PlanningSetupAnswers } from '@/lib/types/domain'
import { usePlanningSetupForm } from '@/features/planningSetup/hooks/form/usePlanningSetupForm'
import { createPlanningSetupViewModel } from '@/features/planningSetup/lib/createPlanningSetupViewModel'
import { usePlanningStore } from '@/store/usePlanningStore'
import { CategoryQuestion } from './CategoryQuestion'
import { CoreMaterialQuestion } from './CoreMaterialQuestion'
import { FaceExposureQuestion } from './FaceExposureQuestion'
import { ShootingQuestion } from './ShootingQuestion'
import { VideoLengthQuestion } from './VideoLengthQuestion'

export function PlanningSetupPageClient({
  initialAnswers,
}: {
  initialAnswers: PlanningSetupAnswers
}) {
  const form = usePlanningSetupForm(initialAnswers)
  const viewModel = createPlanningSetupViewModel(form)
  const isSubmitting = usePlanningStore((state) => state.isSubmitting)
  const submitError = usePlanningStore((state) => state.submitError)

  return (
    <div className="pb-32">
      {submitError ? (
        <div
          role="alert"
          aria-live="polite"
          className="mx-6 mb-6 rounded-lg border border-highlight/30 bg-white/8 px-5 py-4 font-16-rg text-highlight"
        >
          {submitError}
        </div>
      ) : null}

      {isSubmitting ? (
        <div
          role="status"
          aria-live="polite"
          className="mx-6 mb-6 rounded-lg border border-white/15 bg-white/8 px-5 py-4 font-16-rg text-white/80"
        >
          기획 프리세팅을 저장하는 중입니다.
        </div>
      ) : null}

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
