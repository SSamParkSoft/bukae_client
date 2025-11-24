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
  const { isAuthenticated, checkAuth } = useUserStore()

  useEffect(() => {
    const hasAuth = checkAuth()

    if (!hasAuth) {
      router.replace('/login')
    }
  }, [router, checkAuth])

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

