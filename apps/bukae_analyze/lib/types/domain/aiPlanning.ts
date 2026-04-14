import type { VideoCategory } from './planningSetup'

export interface AiPlanningReferenceContext {
  hookingStyleLabel: string
  storyPatternLabel: string
  emotionTriggerLabel: string
  ctaStyleLabel: string
}

export interface AiPlanningAnswers {
  hooking: string | null
  hookingCustom: string
  storyDirection: string | null
  coreMessage: string | null
  coreMessageCustom: string
  audienceReaction: string | null
  cta: string | null
}

export interface AiPlanningInput {
  category: VideoCategory
  coreMaterial: string
  referenceContext: AiPlanningReferenceContext
}
