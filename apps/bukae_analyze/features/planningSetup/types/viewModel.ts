import type { VideoCategory, FaceExposure, VideoLength, ShootingAvailability } from '@/lib/types/domain'

export interface QuestionSectionViewModel<T extends string> {
  selected: T | 'custom' | null
  customValue: string
  onSelect: (value: T | 'custom') => void
  onCustomChange: (value: string) => void
}

export interface FaceExposureQuestionViewModel {
  selected: FaceExposure | null
  customValue: string
  onSelect: (value: FaceExposure) => void
  onCustomChange: (value: string) => void
}

export interface ShootingViewModel {
  selected: ShootingAvailability | null
  onSelect: (value: ShootingAvailability | null) => void
  environment: string
  onEnvironmentChange: (value: string) => void
}

export interface TextQuestionViewModel {
  value: string
  onChange: (value: string) => void
}

export interface PlanningSetupViewModel {
  category: QuestionSectionViewModel<VideoCategory>
  faceExposure: FaceExposureQuestionViewModel
  videoLength: QuestionSectionViewModel<VideoLength>
  shooting: ShootingViewModel
  coreMaterial: TextQuestionViewModel
}
