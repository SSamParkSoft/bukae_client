import type { PlanningQuestion, PlanningSession } from '@/lib/types/domain'
import type { ReadyBriefViewModel } from '../types/chatbotViewModel'

export type AiPlanningNextTarget = 'chatbot' | 'shooting-guide' | null

export interface AiPlanningNavigationState {
  canProceed: boolean
  nextTarget: AiPlanningNextTarget
  planningSessionId: string | null
  briefVersionId: string | null
  briefStatus: string | null
  answeredQuestionIds: string[]
  isSavingPt1Answers: boolean
}

export function createAiPlanningNavigationState(params: {
  isChatbotMode: boolean
  readyBrief: ReadyBriefViewModel | null
  session: PlanningSession | null
  questions: PlanningQuestion[]
  canEnterPt2: boolean
  hasPendingSave: boolean
  hasSaveError: boolean
}): AiPlanningNavigationState {
  const {
    isChatbotMode,
    readyBrief,
    session,
    questions,
    canEnterPt2,
    hasPendingSave,
    hasSaveError,
  } = params
  const answeredQuestionIds = questions.map((question) => question.questionId)

  if (isChatbotMode) {
    return {
      canProceed: Boolean(readyBrief),
      nextTarget: readyBrief ? 'shooting-guide' : null,
      planningSessionId: session?.planningSessionId ?? null,
      briefVersionId: readyBrief?.briefVersionId ?? null,
      briefStatus: readyBrief?.status ?? null,
      answeredQuestionIds,
      isSavingPt1Answers: false,
    }
  }

  return {
    canProceed: Boolean(canEnterPt2) && !hasPendingSave && !hasSaveError,
    nextTarget: session?.readyForApproval ? 'shooting-guide' : 'chatbot',
    planningSessionId: session?.planningSessionId ?? null,
    briefVersionId: null,
    briefStatus: null,
    answeredQuestionIds,
    isSavingPt1Answers: hasPendingSave,
  }
}
