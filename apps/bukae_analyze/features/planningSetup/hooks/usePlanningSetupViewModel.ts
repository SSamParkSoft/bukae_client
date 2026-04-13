'use client'

import { useMemo } from 'react'
import type { VideoCategory, FaceExposure, VideoLength, ShootingAvailability } from '@/lib/types/domain'
import type { PlanningSetupViewModel } from '../types/viewModel'
import type { PlanningSetupForm } from './usePlanningSetupForm'

export function usePlanningSetupViewModel(form: PlanningSetupForm): PlanningSetupViewModel {
  const { answers, update } = form

  return useMemo((): PlanningSetupViewModel => ({
    category: {
      selected: answers.category,
      customValue: answers.categoryCustom,
      onSelect: (value: VideoCategory | 'custom') => update({ category: value }),
      onCustomChange: (value: string) => update({ categoryCustom: value }),
    },
    faceExposure: {
      selected: answers.faceExposure,
      customValue: answers.faceExposureCustom,
      onSelect: (value: FaceExposure | 'custom') => update({ faceExposure: value }),
      onCustomChange: (value: string) => update({ faceExposureCustom: value }),
    },
    videoLength: {
      selected: answers.videoLength,
      customValue: answers.videoLengthCustom,
      onSelect: (value: VideoLength | 'custom') => update({ videoLength: value }),
      onCustomChange: (value: string) => update({ videoLengthCustom: value }),
    },
    shooting: {
      selected: answers.shooting,
      onSelect: (value: ShootingAvailability) => update({ shooting: value }),
      environment: answers.shootingEnvironment,
      onEnvironmentChange: (value: string) => update({ shootingEnvironment: value }),
    },
    coreMaterial: {
      value: answers.coreMaterial,
      onChange: (value: string) => update({ coreMaterial: value }),
    },
  }), [answers, update])
}
