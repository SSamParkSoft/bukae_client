import type { AiPlanningStage, PlanningSession } from '@/lib/types/domain'
import type { ReadyBriefViewModel } from '../types/chatbotViewModel'
import {
  getAiPlanningStageNextTarget,
  isAiPlanningStageProceedable,
} from './aiPlanningStage'

export type AiPlanningNextTarget = 'chatbot' | 'shooting-guide' | null

export interface AiPlanningNavigationState {
  stage: AiPlanningStage
  canProceed: boolean
  nextTarget: AiPlanningNextTarget
  planningSessionId: string | null
  briefVersionId: string | null
  briefStatus: string | null
  answeredQuestionIds: string[]
  isSavingPt1Answers: boolean
}

export function createAiPlanningNavigationState(params: {
  stage: AiPlanningStage
  readyBrief: ReadyBriefViewModel | null
  session: PlanningSession | null
  answeredQuestionIds: string[]
  isSavingPt1Answers: boolean
}): AiPlanningNavigationState {
  const {
    stage,
    readyBrief,
    session,
    answeredQuestionIds,
    isSavingPt1Answers,
  } = params

  return {
    stage,
    canProceed: isAiPlanningStageProceedable(stage),
    nextTarget: getAiPlanningStageNextTarget(stage),
    planningSessionId: session?.planningSessionId ?? null,
    briefVersionId: readyBrief?.briefVersionId ?? null,
    briefStatus: readyBrief?.status ?? null,
    answeredQuestionIds,
    isSavingPt1Answers,
  }
}
