'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '../store/useUserStore'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const { isAuthenticated, checkAuth: _checkAuth } = useUserStore()

  useEffect(() => {
    // 초기 로드 시 자동 인증 확인하지 않음
    // 인증이 필요한 페이지는 명시적으로 로그인 상태를 확인해야 함
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [router, isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

