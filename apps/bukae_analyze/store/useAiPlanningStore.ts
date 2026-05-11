import type { AiPlanningStage, PlanningSession } from '@/lib/types/domain'
import type { ResolvedAppError } from '@/lib/errors/appError'
import { create } from 'zustand'

type AiPlanningNextTarget = 'chatbot' | 'shooting-guide' | null

interface AiPlanningStore {
  stage: AiPlanningStage
  canProceed: boolean
  isAdvancing: boolean
  advanceError: ResolvedAppError | null
  isSavingPt1Answers: boolean
  nextTarget: AiPlanningNextTarget
  planningSessionId: string | null
  briefVersionId: string | null
  briefStatus: string | null
  answeredQuestionIds: string[]
  chatbotInitialSession: PlanningSession | null
  setNavigationState: (params: {
    stage: AiPlanningStage
    canProceed: boolean
    nextTarget: AiPlanningNextTarget
    planningSessionId: string | null
    briefVersionId?: string | null
    briefStatus?: string | null
    answeredQuestionIds?: string[]
    isSavingPt1Answers?: boolean
  }) => void
  setAdvancing: (isAdvancing: boolean) => void
  setAdvanceError: (error: ResolvedAppError | null) => void
  setChatbotInitialSession: (session: PlanningSession | null) => void
  reset: () => void
}

const INITIAL_STATE = {
  stage: 'pt1_preparing_questions' as AiPlanningStage,
  canProceed: false,
  isAdvancing: false,
  advanceError: null,
  isSavingPt1Answers: false,
  nextTarget: null as AiPlanningNextTarget,
  planningSessionId: null as string | null,
  briefVersionId: null as string | null,
  briefStatus: null as string | null,
  answeredQuestionIds: [] as string[],
  chatbotInitialSession: null as PlanningSession | null,
}

export const useAiPlanningStore = create<AiPlanningStore>()((set) => ({
  ...INITIAL_STATE,
  setNavigationState: ({
    stage,
    canProceed,
    nextTarget,
    planningSessionId,
    briefVersionId,
    briefStatus,
    answeredQuestionIds,
    isSavingPt1Answers,
  }) =>
    set((state) => ({
      stage,
      canProceed,
      nextTarget,
      planningSessionId,
      briefVersionId: briefVersionId === undefined ? state.briefVersionId : briefVersionId,
      briefStatus: briefStatus === undefined ? state.briefStatus : briefStatus,
      answeredQuestionIds: answeredQuestionIds ?? state.answeredQuestionIds,
      isSavingPt1Answers: isSavingPt1Answers ?? state.isSavingPt1Answers,
    })),
  setAdvancing: (isAdvancing) => set({ isAdvancing }),
  setAdvanceError: (advanceError) => set({ advanceError }),
  setChatbotInitialSession: (session) => set({ chatbotInitialSession: session }),
  reset: () => set(INITIAL_STATE),
}))
