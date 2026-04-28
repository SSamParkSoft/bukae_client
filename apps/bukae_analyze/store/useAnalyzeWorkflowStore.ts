import type { PlanningSession } from '@/lib/types/domain'
import { create } from 'zustand'

interface AnalyzeWorkflowStore {
  submittedIntakeKeys: Record<string, true>
  chatbotSessionByPlanningSessionId: Record<string, PlanningSession>
  generationRequestIdByBriefVersionId: Record<string, string>
  hasSubmittedIntake: (key: string) => boolean
  markIntakeSubmitted: (key: string) => void
  getCachedChatbotSession: (planningSessionId: string) => PlanningSession | null
  cacheChatbotSession: (planningSessionId: string, session: PlanningSession) => void
  getCachedGenerationRequestId: (briefVersionId: string) => string | null
  cacheGenerationRequestId: (briefVersionId: string, generationRequestId: string) => void
  resetWorkflowCache: () => void
}

const INITIAL_STATE = {
  submittedIntakeKeys: {} as Record<string, true>,
  chatbotSessionByPlanningSessionId: {} as Record<string, PlanningSession>,
  generationRequestIdByBriefVersionId: {} as Record<string, string>,
}

export const useAnalyzeWorkflowStore = create<AnalyzeWorkflowStore>()((set, get) => ({
  ...INITIAL_STATE,
  hasSubmittedIntake: (key) => Boolean(get().submittedIntakeKeys[key]),
  markIntakeSubmitted: (key) => {
    set((state) => ({
      submittedIntakeKeys: {
        ...state.submittedIntakeKeys,
        [key]: true,
      },
    }))
  },
  getCachedChatbotSession: (planningSessionId) => (
    get().chatbotSessionByPlanningSessionId[planningSessionId] ?? null
  ),
  cacheChatbotSession: (planningSessionId, session) => {
    set((state) => ({
      chatbotSessionByPlanningSessionId: {
        ...state.chatbotSessionByPlanningSessionId,
        [planningSessionId]: session,
      },
    }))
  },
  getCachedGenerationRequestId: (briefVersionId) => (
    get().generationRequestIdByBriefVersionId[briefVersionId] ?? null
  ),
  cacheGenerationRequestId: (briefVersionId, generationRequestId) => {
    set((state) => ({
      generationRequestIdByBriefVersionId: {
        ...state.generationRequestIdByBriefVersionId,
        [briefVersionId]: generationRequestId,
      },
    }))
  },
  resetWorkflowCache: () => set(INITIAL_STATE),
}))
