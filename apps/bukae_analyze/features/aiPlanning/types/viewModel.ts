import type { VideoCategory } from '@/lib/types/domain'

export interface AiQuestionOption {
  value: string
  label: string
}

export interface AiQuestionViewModel {
  sectionTitle: string
  referenceInsight: string
  options: AiQuestionOption[]
  selected: string | null
  customValue: string
  hasCustomOption: boolean
  onSelect: (value: string) => void
  onCustomChange: (value: string) => void
}

export interface AiPlanningViewModel {
  category: VideoCategory
  coreMaterial: string
  hooking: AiQuestionViewModel
  storyDirection: AiQuestionViewModel
  coreMessage: AiQuestionViewModel
  audienceReaction: AiQuestionViewModel
  cta: AiQuestionViewModel
}
