import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { authStorage } from '@/lib/api/auth-storage'
import { useVideoCreateStore } from './useVideoCreateStore'
import { useAppStore } from './useAppStore'
import type { TargetMall } from '@/lib/types/products'
import type { MallConfig } from '@/lib/types/api/mall-configs'

export interface User {
  id: string
  name: string
  email: string
  profileImage?: string
  createdAt: string
  accountStatus: 'active' | 'inactive'
  subscriptionPlan?: string | null
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
  platformTrackingIds: Record<TargetMall, string | null>
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  updateUser: (updates: Partial<User>) => void
  setConnectedService: (service: ConnectedService) => void
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void
  setPlatformTrackingId: (platform: TargetMall, trackingId: string | null) => void
  setPlatformTrackingIds: (configs: MallConfig[]) => void
  getPlatformTrackingId: (platform: TargetMall) => string | null
  checkAuth: () => boolean
  reset: () => void
}

const _defaultUser: User = {
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

const defaultPlatformTrackingIds: Record<TargetMall, string | null> = {
  ALI_EXPRESS: null,
  COUPANG: null,
  AMAZON: null,
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      connectedServices: defaultConnectedServices,
      notificationSettings: defaultNotificationSettings,
      platformTrackingIds: defaultPlatformTrackingIds,
      isAuthenticated: false,
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
      setPlatformTrackingId: (platform, trackingId) =>
        set((state) => ({
          platformTrackingIds: {
            ...state.platformTrackingIds,
            [platform]: trackingId,
          },
        })),
      setPlatformTrackingIds: (configs) => {
        // API 응답 배열을 Record<TargetMall, string | null> 형태로 변환
        const trackingIds: Record<TargetMall, string | null> = {
          ...defaultPlatformTrackingIds,
        }
        
        configs.forEach((config) => {
          if (config.mallType in trackingIds) {
            trackingIds[config.mallType] = config.trackingId || null
          }
        })
        
        set({ platformTrackingIds: trackingIds })
      },
      getPlatformTrackingId: (platform) => {
        return get().platformTrackingIds[platform] || null
      },
      checkAuth: () => {
        if (typeof window === 'undefined') return false
        const hasTokens = authStorage.hasTokens()
        set({ isAuthenticated: hasTokens })
        return hasTokens
      },
      reset: () => {
        authStorage.clearTokens()
        set({
          user: null,
          connectedServices: defaultConnectedServices,
          notificationSettings: defaultNotificationSettings,
          platformTrackingIds: defaultPlatformTrackingIds,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'bookae-user-storage',
      storage: createJSONStorage(() => localStorage),
      // persist된 상태가 복원된 후 토큰이 있으면 인증 상태 복원
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          // 토큰이 있으면 인증 상태 확인
          const hasTokens = authStorage.hasTokens()
          if (hasTokens) {
            state.isAuthenticated = true
          } else {
            // 토큰이 없으면 인증 상태 및 다른 store 초기화
            state.isAuthenticated = false
            state.user = null
            // 다른 store들도 초기화
            useVideoCreateStore.getState().reset()
            useAppStore.getState().setProductUrl('')
          }
        }
      },
    }
  )
)

