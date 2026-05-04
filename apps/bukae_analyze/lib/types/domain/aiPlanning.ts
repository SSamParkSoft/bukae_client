import type { VideoCategory } from './planningSetup'

export type AiPlanningStage =
  | 'pt1_preparing_questions'
  | 'pt1_answering_questions'
  | 'pt1_saving_answers'
  | 'pt1_ready_for_chatbot'
  | 'pt1_ready_for_generation'
  | 'chatbot_preparing_questions'
  | 'chatbot_answering_questions'
  | 'chatbot_saving_answer'
  | 'chatbot_waiting_revision'
  | 'chatbot_answering_revision_questions'
  | 'chatbot_finalizing'
  | 'chatbot_ready_for_generation'
  | 'planning_unavailable'

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
