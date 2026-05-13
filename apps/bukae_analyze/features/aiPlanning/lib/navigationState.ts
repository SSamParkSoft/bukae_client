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
  const nextTarget = getAiPlanningStageNextTarget(stage)
  const briefVersionId = readyBrief?.briefVersionId.trim() || null
  const canProceed =
    isAiPlanningStageProceedable(stage) &&
    (
      nextTarget !== 'shooting-guide' ||
      stage === 'pt1_ready_for_generation' ||
      Boolean(briefVersionId)
    )

  return {
    stage,
    canProceed,
    nextTarget,
    planningSessionId: session?.planningSessionId ?? null,
    briefVersionId,
    briefStatus: readyBrief?.status ?? null,
    answeredQuestionIds,
    isSavingPt1Answers,
  }
}
