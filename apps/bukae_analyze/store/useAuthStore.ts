import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearWorkflowStepCompletions } from '@/components/workflow/lib/workflowStepCompletionStorage'
import { clearStoredPt1PlanningSnapshots } from '@/features/aiPlanning/lib/pt1PlanningSnapshotStorage'
import { clearStoredFollowUpChatHistories } from '@/features/aiPlanning/lib/followUpChatbot/chatHistoryStorage'
import { clearStoredPlanningSetupAnswers } from '@/features/planningSetup/lib/planningSetupAnswerStorage'

interface AuthUser {
  name: string
  profileImageUrl: string | null
}

interface AuthStore {
  accessToken: string | null
  user: AuthUser | null
  setAccessToken: (token: string) => void
  setUser: (user: AuthUser) => void
  clearToken: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),
      clearToken: () => {
        clearWorkflowStepCompletions()
        clearStoredPlanningSetupAnswers()
        clearStoredPt1PlanningSnapshots()
        clearStoredFollowUpChatHistories()
        set({ accessToken: null, user: null })
      },
    }),
    { name: 'bukae-auth' }
  )
)
