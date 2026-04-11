import type { VideoCategory, FaceExposure, VideoLength, ShootingAvailability } from '@/lib/types/domain'

export interface QuestionSectionViewModel<T extends string> {
  selected: T | 'custom' | null
  customValue: string
  onSelect: (value: T | 'custom') => void
  onCustomChange: (value: string) => void
}

export interface ShootingViewModel {
  selected: ShootingAvailability | null
  onSelect: (value: ShootingAvailability) => void
  environment: string
  onEnvironmentChange: (value: string) => void
}

export interface PlanningSetupViewModel {
  category: QuestionSectionViewModel<VideoCategory>
  faceExposure: QuestionSectionViewModel<FaceExposure>
  videoLength: QuestionSectionViewModel<VideoLength>
  shooting: ShootingViewModel
}
