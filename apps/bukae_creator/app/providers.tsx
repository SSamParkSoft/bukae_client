'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authStorage } from '@/lib/api/auth-storage'
import { useUserStore } from '@/store/useUserStore'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useAppStore } from '@/store/useAppStore'
import { authApi } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { getMallConfigs } from '@/lib/api/mall-configs'

function AuthSync() {
  const router = useRouter()
  const user = useUserStore((state) => state.user)

  useEffect(() => {
    const handleAuthExpired = () => {
      // 토큰 정리
      authStorage.clearTokens()
      // 사용자 상태 초기화
      useUserStore.getState().reset()
      // 비디오 생성 관련 store 초기화
      useVideoCreateStore.getState().reset()
      // 앱 store 초기화
      useAppStore.getState().setProductUrl('')
      // 즉시 로그인 페이지로 리다이렉트 (현재 경로와 다를 때만)
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        router.replace('/login')
      }
    }

    // 토큰 만료 이벤트 리스너 등록
    window.addEventListener('auth:expired', handleAuthExpired)

    // 초기 로드 시 토큰이 있으면 인증 상태 확인 및 사용자 정보 복원
    const restoreAuth = async () => {
      const hasTokens = useUserStore.getState().checkAuth()
      const currentUser = useUserStore.getState().user
      
      if (hasTokens && !currentUser) {
        // 토큰이 있고 사용자 정보가 없으면 사용자 정보 가져오기
        try {
          const userInfo = await authApi.getCurrentUser()
          const fallbackName = userInfo.name ?? userInfo.nickname ?? '사용자'
          const fallbackProfileImage = userInfo.profileImage ?? userInfo.profileImageUrl
          useUserStore.getState().setUser({
            id: userInfo.id,
            name: fallbackName,
            email: userInfo.email,
            profileImage: fallbackProfileImage,
            createdAt: userInfo.createdAt,
            accountStatus: 'active',
          })
          
          // 추적 ID 복원 (에러 발생해도 로그인은 계속 진행)
          try {
            const mallConfigs = await getMallConfigs()
            useUserStore.getState().setPlatformTrackingIds(mallConfigs)
          } catch (trackingIdError) {
            console.error('[AuthSync] 트래킹 ID 복원 실패:', trackingIdError)
            // 트래킹 ID 복원 실패해도 로그인은 정상 진행
          }
        } catch (error) {
          // 사용자 정보 가져오기 실패 시 처리
          if (error instanceof ApiError && error.status === 401) {
            // 401 에러인 경우: apiRequest에서 이미 auth:expired 이벤트를 발생시켰으므로
            // handleAuthExpired가 자동으로 처리함 (토큰 정리 + 로그인 페이지 리다이렉트)
            // 여기서는 조용히 처리
            return
          }
          
          // 401이 아닌 다른 에러인 경우에만 로그 출력 및 상태 초기화
          console.error('사용자 정보 복원 실패:', error)
          useUserStore.getState().reset()
          useVideoCreateStore.getState().reset()
          useAppStore.getState().setProductUrl('')
        }
      } else if (hasTokens && currentUser) {
        // 토큰이 있고 사용자 정보도 있지만, 추적 ID가 없을 수 있으므로 복원 시도
        const currentTrackingIds = useUserStore.getState().platformTrackingIds
        const hasAnyTrackingId = Object.values(currentTrackingIds).some(id => id !== null)
        
        if (!hasAnyTrackingId) {
          // 추적 ID가 하나도 없으면 복원 시도
          try {
            const mallConfigs = await getMallConfigs()
            useUserStore.getState().setPlatformTrackingIds(mallConfigs)
          } catch (trackingIdError) {
            console.error('[AuthSync] 트래킹 ID 복원 실패:', trackingIdError)
            // 실패해도 계속 진행
          }
        }
      }
    }

    restoreAuth()

    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired)
    }
  }, [router, user])

  return null
}

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <AuthSync />
      {children}
    </QueryClientProvider>
  )
}