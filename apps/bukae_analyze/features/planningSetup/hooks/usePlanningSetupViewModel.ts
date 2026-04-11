'use client'

import { useState, useMemo } from 'react'
import type { VideoCategory, FaceExposure, VideoLength, ShootingAvailability, PlanningSetupAnswers } from '@/lib/types/domain'
import type { PlanningSetupViewModel } from '../types/viewModel'

const INITIAL_ANSWERS: PlanningSetupAnswers = {
  category: null,
  categoryCustom: '',
  faceExposure: null,
  faceExposureCustom: '',
  videoLength: null,
  videoLengthCustom: '',
  shooting: null,
  shootingEnvironment: '',
}

export function usePlanningSetupViewModel(): PlanningSetupViewModel {
  const [answers, setAnswers] = useState<PlanningSetupAnswers>(INITIAL_ANSWERS)

  return useMemo((): PlanningSetupViewModel => ({
    category: {
      selected: answers.category,
      customValue: answers.categoryCustom,
      onSelect: (value: VideoCategory | 'custom') =>
        setAnswers(prev => ({ ...prev, category: value })),
      onCustomChange: (value: string) =>
        setAnswers(prev => ({ ...prev, categoryCustom: value })),
    },
    faceExposure: {
      selected: answers.faceExposure,
      customValue: answers.faceExposureCustom,
      onSelect: (value: FaceExposure | 'custom') =>
        setAnswers(prev => ({ ...prev, faceExposure: value })),
      onCustomChange: (value: string) =>
        setAnswers(prev => ({ ...prev, faceExposureCustom: value })),
    },
    videoLength: {
      selected: answers.videoLength,
      customValue: answers.videoLengthCustom,
      onSelect: (value: VideoLength | 'custom') =>
        setAnswers(prev => ({ ...prev, videoLength: value })),
      onCustomChange: (value: string) =>
        setAnswers(prev => ({ ...prev, videoLengthCustom: value })),
    },
    shooting: {
      selected: answers.shooting,
      onSelect: (value: ShootingAvailability) =>
        setAnswers(prev => ({ ...prev, shooting: value })),
      environment: answers.shootingEnvironment,
      onEnvironmentChange: (value: string) =>
        setAnswers(prev => ({ ...prev, shootingEnvironment: value })),
    },
  }), [answers])
}
