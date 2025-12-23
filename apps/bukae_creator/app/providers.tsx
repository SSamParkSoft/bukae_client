'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authStorage } from '@/lib/api/auth-storage'
import { useUserStore } from '@/store/useUserStore'
import { authApi } from '@/lib/api/auth'

function AuthSync() {
  const router = useRouter()
  const resetUser = useUserStore((state) => state.reset)
  const checkAuth = useUserStore((state) => state.checkAuth)
  const setUser = useUserStore((state) => state.setUser)
  const user = useUserStore((state) => state.user)

  useEffect(() => {
    const handleAuthExpired = () => {
      // 토큰 정리
      authStorage.clearTokens()
      // 사용자 상태 초기화
      resetUser()
      // 로그인 페이지로 리다이렉트
      router.replace('/login')
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
          // 사용자 정보 가져오기 실패 시 토큰이 만료되었을 수 있음
          console.error('사용자 정보 복원 실패:', error)
          resetUser()
        }
      }
    }

    restoreAuth()

    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired)
    }
  }, [router, resetUser, checkAuth, setUser, user])

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