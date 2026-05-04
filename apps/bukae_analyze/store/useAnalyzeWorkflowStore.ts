import type { PlanningSession } from '@/lib/types/domain'
import { create } from 'zustand'

export interface Pt1AnswerDraftCache {
  selectedAnswers: Record<string, string>
  customAnswers: Record<string, string>
  fieldAnswers: Record<string, Record<string, string>>
}

interface AnalyzeWorkflowStore {
  analysisCompletedByProjectId: Record<string, boolean>
  planningSessionByProjectId: Record<string, PlanningSession>
  pt1AnswerDraftByKey: Record<string, Pt1AnswerDraftCache>
  chatbotSessionByPlanningSessionId: Record<string, PlanningSession>
  generationRequestIdByBriefVersionId: Record<string, string>
  isAnalysisCompleted: (projectId: string) => boolean
  markAnalysisCompleted: (projectId: string) => void
  getCachedPlanningSession: (projectId: string) => PlanningSession | null
  cachePlanningSession: (projectId: string, session: PlanningSession) => void
  getCachedPt1AnswerDraft: (key: string) => Pt1AnswerDraftCache | null
  cachePt1AnswerDraft: (key: string, draft: Pt1AnswerDraftCache) => void
  getCachedChatbotSession: (planningSessionId: string) => PlanningSession | null
  cacheChatbotSession: (planningSessionId: string, session: PlanningSession) => void
  getCachedGenerationRequestId: (briefVersionId: string) => string | null
  cacheGenerationRequestId: (briefVersionId: string, generationRequestId: string) => void
  resetWorkflowCache: () => void
}

const INITIAL_STATE = {
  analysisCompletedByProjectId: {} as Record<string, boolean>,
  planningSessionByProjectId: {} as Record<string, PlanningSession>,
  pt1AnswerDraftByKey: {} as Record<string, Pt1AnswerDraftCache>,
  chatbotSessionByPlanningSessionId: {} as Record<string, PlanningSession>,
  generationRequestIdByBriefVersionId: {} as Record<string, string>,
}

export const useAnalyzeWorkflowStore = create<AnalyzeWorkflowStore>()((set, get) => ({
  ...INITIAL_STATE,
  isAnalysisCompleted: (projectId) => (
    get().analysisCompletedByProjectId[projectId] ?? false
  ),
  markAnalysisCompleted: (projectId) => {
    set((state) => ({
      analysisCompletedByProjectId: {
        ...state.analysisCompletedByProjectId,
        [projectId]: true,
      },
    }))
  },
  getCachedPlanningSession: (projectId) => (
    get().planningSessionByProjectId[projectId] ?? null
  ),
  cachePlanningSession: (projectId, session) => {
    set((state) => ({
      planningSessionByProjectId: {
        ...state.planningSessionByProjectId,
        [projectId]: session,
      },
    }))
  },
  getCachedPt1AnswerDraft: (key) => (
    get().pt1AnswerDraftByKey[key] ?? null
  ),
  cachePt1AnswerDraft: (key, draft) => {
    set((state) => ({
      pt1AnswerDraftByKey: {
        ...state.pt1AnswerDraftByKey,
        [key]: draft,
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
