import type { PlanningQuestionOption, PlanningSession } from '@/lib/types/domain'
import { createFollowUpQuestionWorkflow } from './workflow'

export interface ActiveFollowUpQuestion {
  questionId: string
  title: string
  question: string
  referenceInsight: string | null
  reasonWhyAsked: string | null
  slotKey: string
  responseType: string
  allowCustom: boolean
  customPlaceholder: string | null
  options: PlanningQuestionOption[]
}

export function mapSessionQuestions(session: PlanningSession | null): ActiveFollowUpQuestion[] {
  return createFollowUpQuestionWorkflow(session).activeQuestions
}

export function getUnresolvedNextQuestions(
  nextSession: PlanningSession,
  answeredQuestion: ActiveFollowUpQuestion
): ActiveFollowUpQuestion[] {
  return mapSessionQuestions(nextSession).filter((nextQuestion) => (
    nextQuestion.questionId !== answeredQuestion.questionId ||
    nextQuestion.question !== answeredQuestion.question
  ))
}
