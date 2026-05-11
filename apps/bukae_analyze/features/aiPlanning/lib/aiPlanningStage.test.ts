import { describe, expect, it } from 'vitest'
import type { PlanningSession } from '@/lib/types/domain'
import { deriveAiPlanningStage } from './aiPlanningStage'

function createPlanningSession(overrides: Partial<PlanningSession> = {}): PlanningSession {
  return {
    planningSessionId: 'planning-session-id',
    planningStatus: 'WAITING_FOR_USER',
    planningMode: 'pt1',
    clarifyingQuestions: [
      {
        questionId: 'question-1',
        slotKey: 'slot',
        title: '질문',
        question: '질문',
        referenceInsight: null,
        reasonWhyAsked: null,
        responseType: 'single_select',
        required: true,
        allowCustom: false,
        customPlaceholder: null,
        options: [],
        fields: [],
      },
    ],
    canonicalSlotState: null,
    candidateAngles: [],
    messages: [],
    planningSurface: null,
    planningArtifacts: null,
    readyForApproval: false,
    failure: null,
    projectStatus: null,
    currentStep: null,
    ...overrides,
  }
}

describe('deriveAiPlanningStage', () => {
  it('returns preparing while PT1 questions are loading', () => {
    expect(deriveAiPlanningStage({
      isChatbotMode: false,
      session: null,
      isLoadingPt1Questions: true,
      pt1QuestionCount: 0,
      hasSavedAllPt1Answers: false,
      hasPendingPt1Save: false,
      hasPt1SaveError: false,
      chatbotQuestionCount: 0,
      isSubmittingChatbotAnswer: false,
      readyBrief: null,
    })).toBe('pt1_preparing_questions')
  })

  it('moves to chatbot when all PT1 answers are saved', () => {
    expect(deriveAiPlanningStage({
      isChatbotMode: false,
      session: createPlanningSession(),
      isLoadingPt1Questions: false,
      pt1QuestionCount: 1,
      hasSavedAllPt1Answers: true,
      hasPendingPt1Save: false,
      hasPt1SaveError: false,
      chatbotQuestionCount: 0,
      isSubmittingChatbotAnswer: false,
      readyBrief: null,
    })).toBe('pt1_ready_for_chatbot')
  })

  it('moves directly to generation when PT1 session is ready for approval', () => {
    expect(deriveAiPlanningStage({
      isChatbotMode: false,
      session: createPlanningSession({ readyForApproval: true }),
      isLoadingPt1Questions: false,
      pt1QuestionCount: 1,
      hasSavedAllPt1Answers: false,
      hasPendingPt1Save: false,
      hasPt1SaveError: false,
      chatbotQuestionCount: 0,
      isSubmittingChatbotAnswer: false,
      readyBrief: null,
    })).toBe('pt1_ready_for_generation')
  })
})
