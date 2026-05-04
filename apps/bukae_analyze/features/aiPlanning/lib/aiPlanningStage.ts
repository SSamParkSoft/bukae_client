import type { AiPlanningStage, PlanningSession } from '@/lib/types/domain'
import type { ReadyBriefViewModel } from '../types/chatbotViewModel'
import {
  canFinalizePlanning,
  hasFinalizePlanningStarted,
} from './planningPredicates'

export function isAiPlanningStageProceedable(stage: AiPlanningStage): boolean {
  return (
    stage === 'pt1_ready_for_chatbot' ||
    stage === 'pt1_ready_for_generation' ||
    stage === 'chatbot_ready_for_generation'
  )
}

export function getAiPlanningStageNextTarget(
  stage: AiPlanningStage
): 'chatbot' | 'shooting-guide' | null {
  if (stage === 'pt1_ready_for_chatbot') return 'chatbot'
  if (
    stage === 'pt1_ready_for_generation' ||
    stage === 'chatbot_ready_for_generation'
  ) {
    return 'shooting-guide'
  }

  return null
}

export function getAnsweredPt1QuestionIds(session: PlanningSession | null): string[] {
  return session?.clarifyingQuestions.map((question) => question.questionId) ?? []
}

export function deriveAiPlanningStage(params: {
  isChatbotMode: boolean
  session: PlanningSession | null
  isLoadingPt1Questions: boolean
  pt1QuestionCount: number
  hasSavedAllPt1Answers: boolean
  hasPendingPt1Save: boolean
  hasPt1SaveError: boolean
  chatbotQuestionCount: number
  isSubmittingChatbotAnswer: boolean
  readyBrief: ReadyBriefViewModel | null
}): AiPlanningStage {
  const {
    isChatbotMode,
    session,
    isLoadingPt1Questions,
    pt1QuestionCount,
    hasSavedAllPt1Answers,
    hasPendingPt1Save,
    hasPt1SaveError,
    chatbotQuestionCount,
    isSubmittingChatbotAnswer,
    readyBrief,
  } = params

  if (isChatbotMode) {
    if (readyBrief) return 'chatbot_ready_for_generation'
    if (isSubmittingChatbotAnswer && chatbotQuestionCount > 0) return 'chatbot_saving_answer'

    if (session?.planningMode === 'revise' && chatbotQuestionCount > 0) {
      return 'chatbot_answering_revision_questions'
    }

    if (chatbotQuestionCount > 0) return 'chatbot_answering_questions'

    if (session?.planningMode === 'revise' && hasFinalizePlanningStarted(session)) {
      return 'chatbot_waiting_revision'
    }

    if (session && (canFinalizePlanning(session) || session.readyForApproval || isSubmittingChatbotAnswer)) {
      return 'chatbot_finalizing'
    }

    return 'chatbot_preparing_questions'
  }

  if (isLoadingPt1Questions) return 'pt1_preparing_questions'
  if (!session || pt1QuestionCount === 0) return 'planning_unavailable'
  if (hasPendingPt1Save) return 'pt1_saving_answers'
  if (hasPt1SaveError) return 'pt1_answering_questions'
  if (session.readyForApproval) return 'pt1_ready_for_generation'
  if (hasSavedAllPt1Answers) return 'pt1_ready_for_chatbot'

  return 'pt1_answering_questions'
}
