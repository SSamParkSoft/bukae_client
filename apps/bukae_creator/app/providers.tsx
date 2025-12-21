'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authStorage } from '@/lib/api/auth-storage'
import { useUserStore } from '@/store/useUserStore'

function AuthSync() {
  const router = useRouter()
  const resetUser = useUserStore((state) => state.reset)
  const checkAuth = useUserStore((state) => state.checkAuth)

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

    // 초기 인증 상태 확인 (백엔드 토큰이 있으면 사용자 정보 조회)
    if (authStorage.hasTokens()) {
      checkAuth()
    }

    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired)
    }
  }, [router, resetUser, checkAuth])

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