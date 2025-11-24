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
    (set, get) => ({
      user: defaultUser,
      connectedServices: defaultConnectedServices,
      notificationSettings: defaultNotificationSettings,
      isAuthenticated: authStorage.hasTokens(),
      setUser: (user) => set({ user, isAuthenticated: authStorage.hasTokens() }),
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
    }
  )
)

