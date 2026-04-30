import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearStoredIntakeSubmissions } from '@/components/workflow/lib/intakeSubmissionStorage'

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
        clearStoredIntakeSubmissions()
        set({ accessToken: null, user: null })
      },
    }),
    { name: 'bukae-auth' }
  )
)
