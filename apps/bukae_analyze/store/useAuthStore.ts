import { create } from 'zustand'
import { clearAnalyzeWorkflowStorage } from '@/lib/storage/analyzeWorkflowStorage'

interface AuthUser {
  name: string
  profileImageUrl: string | null
}

interface AuthStore {
  user: AuthUser | null
  setUser: (user: AuthUser) => void
  clearToken: () => void
  clearAnalyzeWorkflow: () => void
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearToken: () => set({ user: null }),
  clearAnalyzeWorkflow: () => {
    clearAnalyzeWorkflowStorage()
  },
}))
