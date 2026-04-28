import type { PlanningQuestion, PlanningSession } from '@/lib/types/domain'
import { getActivePlanningQuestions } from './planningPredicates'

export interface ActiveFollowUpQuestion {
  questionId: string
  title: string
  question: string
  referenceInsight: string | null
  reasonWhyAsked: string | null
  slotKey: string
}

function mapPlanningQuestion(question: PlanningQuestion): ActiveFollowUpQuestion {
  return {
    questionId: question.questionId,
    title: question.title,
    question: question.question,
    referenceInsight: question.referenceInsight,
    reasonWhyAsked: question.reasonWhyAsked,
    slotKey: question.slotKey,
  }
}

export function mapSessionQuestions(session: PlanningSession | null): ActiveFollowUpQuestion[] {
  return getActivePlanningQuestions(session).map(mapPlanningQuestion)
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
