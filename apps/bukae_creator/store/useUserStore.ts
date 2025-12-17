import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { authStorage } from '@/lib/api/auth-storage'

export interface User {
  id: string
  name: string
  email: string
  profileImage?: string
  createdAt: string
  accountStatus: 'active' | 'inactive'
}

export interface ConnectedService {
  platform: 'coupang' | 'youtube'
  isConnected: boolean
  connectedAt?: string
  channelName?: string
  subscriberCount?: number
}

export interface NotificationSettings {
  videoComplete: boolean
  revenueAlert: boolean
  weeklyReport: boolean
  emailNotifications: boolean
  pushNotifications: boolean
}

interface UserState {
  user: User | null
  connectedServices: ConnectedService[]
  notificationSettings: NotificationSettings
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  updateUser: (updates: Partial<User>) => void
  setConnectedService: (service: ConnectedService) => void
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void
  checkAuth: () => boolean
  reset: () => void
}

const defaultUser: User = {
  id: '1',
  name: '사용자',
  email: 'user@example.com',
  createdAt: '2024-01-01T00:00:00Z',
  accountStatus: 'active',
}

const defaultConnectedServices: ConnectedService[] = [
  {
    platform: 'coupang',
    isConnected: false,
  },
  {
    platform: 'youtube',
    isConnected: false,
  },
]

const defaultNotificationSettings: NotificationSettings = {
  videoComplete: true,
  revenueAlert: true,
  weeklyReport: false,
  emailNotifications: true,
  pushNotifications: false,
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: defaultUser,
      connectedServices: defaultConnectedServices,
      notificationSettings: defaultNotificationSettings,
      isAuthenticated: typeof window !== 'undefined' ? authStorage.hasTokens() : false,
      setUser: (user) => {
        if (typeof window === 'undefined') {
          set({ user, isAuthenticated: false })
          return
        }
        // 토큰이 있는지 확인하고 인증 상태 업데이트
        const hasTokens = authStorage.hasTokens()
        set({ user, isAuthenticated: hasTokens })
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      setConnectedService: (service) =>
        set((state) => {
          const existingIndex = state.connectedServices.findIndex(
            (s) => s.platform === service.platform
          )
          if (existingIndex >= 0) {
            const updated = [...state.connectedServices]
            updated[existingIndex] = service
            return { connectedServices: updated }
          }
          return {
            connectedServices: [...state.connectedServices, service],
          }
        }),
      updateNotificationSettings: (settings) =>
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            ...settings,
          },
        })),
      checkAuth: () => {
        if (typeof window === 'undefined') return false
        const hasTokens = authStorage.hasTokens()
        set({ isAuthenticated: hasTokens })
        return hasTokens
      },
      reset: () => {
        authStorage.clearTokens()
        set({
          user: defaultUser,
          connectedServices: defaultConnectedServices,
          notificationSettings: defaultNotificationSettings,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'bookae-user-storage',
      storage: createJSONStorage(() => localStorage),
      // persist된 상태가 복원된 후 인증 상태 동기화
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          const hasTokens = authStorage.hasTokens()
          state.isAuthenticated = hasTokens
          // 토큰이 있으면 사용자 정보도 유지
          if (hasTokens && !state.user) {
            // 사용자 정보가 없으면 기본값 유지 (나중에 API로 조회)
          }
        }
      },
    }
  )
)

