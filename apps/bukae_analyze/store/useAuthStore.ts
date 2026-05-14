import { create } from 'zustand'

interface AuthUser {
  email: string | null
  name: string
  profileImageUrl: string | null
}

interface AuthStore {
  user: AuthUser | null
  setUser: (user: AuthUser) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))
