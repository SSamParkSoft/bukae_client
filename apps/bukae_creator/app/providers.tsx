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

function AuthSync() {
  const router = useRouter()
  const resetUser = useUserStore((state) => state.reset)
  const resetVideoCreate = useVideoCreateStore((state) => state.reset)
  const setProductUrl = useAppStore((state) => state.setProductUrl)
  const checkAuth = useUserStore((state) => state.checkAuth)
  const setUser = useUserStore((state) => state.setUser)
  const user = useUserStore((state) => state.user)

  useEffect(() => {
    const handleAuthExpired = () => {
      // 토큰 정리
      authStorage.clearTokens()
      // 사용자 상태 초기화
      resetUser()
      // 비디오 생성 관련 store 초기화
      resetVideoCreate()
      // 앱 store 초기화
      setProductUrl('')
      // 즉시 로그인 페이지로 리다이렉트 (현재 경로와 다를 때만)
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        router.replace('/login')
      }
    }

    // 토큰 만료 이벤트 리스너 등록
    window.addEventListener('auth:expired', handleAuthExpired)

    // 초기 로드 시 토큰이 있으면 인증 상태 확인 및 사용자 정보 복원
    const restoreAuth = async () => {
      const hasTokens = checkAuth()
      if (hasTokens && !user) {
        // 토큰이 있고 사용자 정보가 없으면 사용자 정보 가져오기
        try {
          const userInfo = await authApi.getCurrentUser()
          setUser({
            id: userInfo.id,
            name: userInfo.name,
            email: userInfo.email,
            profileImage: userInfo.profileImage,
            createdAt: userInfo.createdAt,
            accountStatus: 'active',
          })
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
          resetUser()
          resetVideoCreate()
          setProductUrl('')
        }
      }
    }

    restoreAuth()

    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired)
    }
  }, [router, resetUser, resetVideoCreate, setProductUrl, checkAuth, setUser, user])

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