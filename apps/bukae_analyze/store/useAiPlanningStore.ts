import { create } from 'zustand'

type AiPlanningNextTarget = 'chatbot' | 'shooting-guide' | null

interface AiPlanningStore {
  canProceed: boolean
  isAdvancing: boolean
  nextTarget: AiPlanningNextTarget
  planningSessionId: string | null
  briefVersionId: string | null
  briefStatus: string | null
  answeredQuestionIds: string[]
  setNavigationState: (params: {
    canProceed: boolean
    nextTarget: AiPlanningNextTarget
    planningSessionId: string | null
    briefVersionId?: string | null
    briefStatus?: string | null
    answeredQuestionIds?: string[]
  }) => void
  setAdvancing: (isAdvancing: boolean) => void
  reset: () => void
}

const INITIAL_STATE = {
  canProceed: false,
  isAdvancing: false,
  nextTarget: null as AiPlanningNextTarget,
  planningSessionId: null as string | null,
  briefVersionId: null as string | null,
  briefStatus: null as string | null,
  answeredQuestionIds: [] as string[],
}

export const useAiPlanningStore = create<AiPlanningStore>()((set) => ({
  ...INITIAL_STATE,
  setNavigationState: ({ canProceed, nextTarget, planningSessionId, briefVersionId, briefStatus, answeredQuestionIds }) =>
    set((state) => ({
      canProceed,
      nextTarget,
      planningSessionId,
      briefVersionId: briefVersionId === undefined ? state.briefVersionId : briefVersionId,
      briefStatus: briefStatus === undefined ? state.briefStatus : briefStatus,
      answeredQuestionIds: answeredQuestionIds ?? state.answeredQuestionIds,
    })),
  setAdvancing: (isAdvancing) => set({ isAdvancing }),
  reset: () => set(INITIAL_STATE),
}))
