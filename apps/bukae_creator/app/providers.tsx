'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { authStorage } from '@/lib/api/auth-storage'
import { useUserStore } from '@/store/useUserStore'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useAppStore } from '@/store/useAppStore'
import { useCurrentUser } from '@/lib/hooks/useAuth'
import { getMallConfigs } from '@/lib/api/mall-configs'
import { startTokenRefreshScheduler, stopTokenRefreshScheduler } from '@/lib/api/client'

function AuthSync() {
  const router = useRouter()
  const hasTokens = authStorage.hasTokens()
  const currentUser = useUserStore((state) => state.user)
  const mallConfigsFetchedRef = useRef(false) // 중복 호출 방지
  
  // React Query를 사용하여 사용자 정보 조회 (중복 호출 방지)
  const { data: userInfo, error: userError, isError } = useCurrentUser({
    enabled: hasTokens && !currentUser, // 토큰이 있고 사용자 정보가 없을 때만 조회
  })

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

    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired)
    }
  }, [router])

  // 사용자 정보가 로드되면 store에 동기화
  useEffect(() => {
    if (userInfo) {
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
    }
  }, [userInfo])

  // 에러 처리 (401은 apiRequest에서 이미 처리됨)
  useEffect(() => {
    if (isError && userError) {
      // 401이 아닌 다른 에러인 경우에만 로그 출력 및 상태 초기화
      const is401 = userError && typeof userError === 'object' && 'status' in userError && userError.status === 401
      if (!is401) {
        console.error('사용자 정보 복원 실패:', userError)
        useUserStore.getState().reset()
        useVideoCreateStore.getState().reset()
        useAppStore.getState().setProductUrl('')
      }
    }
  }, [isError, userError])

  // 토큰이 있고 사용자 정보도 있지만, 추적 ID가 없을 수 있으므로 복원 시도
  // 중복 호출 방지를 위해 ref를 사용하여 한 번만 실행되도록 함
  useEffect(() => {
    if (hasTokens && currentUser && !mallConfigsFetchedRef.current) {
      const currentTrackingIds = useUserStore.getState().platformTrackingIds
      const hasAnyTrackingId = Object.values(currentTrackingIds).some(id => id !== null)
      
      if (!hasAnyTrackingId) {
        mallConfigsFetchedRef.current = true // 호출 시작 표시
        // 추적 ID가 하나도 없으면 복원 시도
        getMallConfigs()
          .then((mallConfigs) => {
            useUserStore.getState().setPlatformTrackingIds(mallConfigs)
          })
          .catch((trackingIdError) => {
            console.error('[AuthSync] 트래킹 ID 복원 실패:', trackingIdError)
            mallConfigsFetchedRef.current = false // 실패 시 재시도 가능하도록
            // 실패해도 계속 진행
          })
      }
    }
  }, [hasTokens, currentUser])

  // 토큰 사전 리프레시 스케줄러 관리
  useEffect(() => {
    if (hasTokens) {
      // 토큰이 있으면 스케줄러 시작
      startTokenRefreshScheduler()
    } else {
      // 토큰이 없으면 스케줄러 중지
      stopTokenRefreshScheduler()
    }

    return () => {
      stopTokenRefreshScheduler()
    }
  }, [hasTokens])

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