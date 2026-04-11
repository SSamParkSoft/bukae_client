'use client'

import { useState } from 'react'
import type { VideoCategory, FaceExposure, VideoLength, ShootingAvailability, PlanningSetupAnswers } from '@/lib/types/domain'
import type { PlanningSetupViewModel } from '../types/viewModel'
import { usePlanningStore } from '@/store/usePlanningStore'

const INITIAL_ANSWERS: PlanningSetupAnswers = {
  category: null,
  categoryCustom: '',
  faceExposure: null,
  faceExposureCustom: '',
  videoLength: null,
  videoLengthCustom: '',
  shooting: null,
  shootingEnvironment: '',
  coreMaterial: '',
}

export function usePlanningSetupViewModel(): PlanningSetupViewModel {
  const [answers, setAnswers] = useState<PlanningSetupAnswers>(INITIAL_ANSWERS)
  const setStoreAnswers = usePlanningStore(state => state.setAnswers)

  function update(partial: Partial<PlanningSetupAnswers>) {
    setAnswers(prev => {
      const next = { ...prev, ...partial }
      setStoreAnswers(next)
      return next
    })
  }

  return {
    category: {
      selected: answers.category,
      customValue: answers.categoryCustom,
      onSelect: (value: VideoCategory | 'custom') =>
        update({ category: value }),
      onCustomChange: (value: string) =>
        update({ categoryCustom: value }),
    },
    faceExposure: {
      selected: answers.faceExposure,
      customValue: answers.faceExposureCustom,
      onSelect: (value: FaceExposure | 'custom') =>
        update({ faceExposure: value }),
      onCustomChange: (value: string) =>
        update({ faceExposureCustom: value }),
    },
    videoLength: {
      selected: answers.videoLength,
      customValue: answers.videoLengthCustom,
      onSelect: (value: VideoLength | 'custom') =>
        update({ videoLength: value }),
      onCustomChange: (value: string) =>
        update({ videoLengthCustom: value }),
    },
    shooting: {
      selected: answers.shooting,
      onSelect: (value: ShootingAvailability) =>
        update({ shooting: value }),
      environment: answers.shootingEnvironment,
      onEnvironmentChange: (value: string) =>
        update({ shootingEnvironment: value }),
    },
    coreMaterial: {
      value: answers.coreMaterial,
      onChange: (value: string) =>
        update({ coreMaterial: value }),
    },
  }
}
