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

    // 초기 로드 시 자동 인증 확인하지 않음 (로그인 안된 상태로 시작)
    // 사용자가 명시적으로 로그인할 때만 인증 상태가 활성화됨

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