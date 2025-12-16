'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { authStorage } from '@/lib/api/auth-storage'
import { useUserStore } from '@/store/useUserStore'

export default function LoginCallbackPage() {
  const router = useRouter()
  const setUser = useUserStore((state) => state.setUser)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabaseClient()

        // 세션 가져오기
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          throw sessionError
        }

        const session = sessionData.session
        if (!session) {
          throw new Error('로그인 세션을 찾을 수 없습니다. 다시 시도해주세요.')
        }

        const accessToken = session.access_token
        const refreshToken = session.refresh_token

        if (accessToken && refreshToken) {
          authStorage.setTokens(accessToken, refreshToken)
        } else {
          throw new Error('토큰 정보를 가져오지 못했습니다. 다시 로그인해주세요.')
        }

        // 사용자 정보 동기화
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) {
          throw userError
        }

        const user = userData.user
        if (user) {
          const fullName =
            (user.user_metadata?.full_name as string | undefined) ?? ''
          const fallbackName = user.email?.split('@')[0] ?? '사용자'

          setUser({
            id: user.id,
            name: fullName || fallbackName,
            email: user.email ?? '',
            profileImage: user.user_metadata?.avatar_url as string | undefined,
            createdAt: user.created_at ?? new Date().toISOString(),
            accountStatus: 'active',
          })
        }

        router.replace('/')
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : '로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.'
        setError(message)
      }
    }

    void handleCallback()
  }, [router, setUser])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        {!error ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
            <p className="text-gray-600">구글 로그인 정보를 확인하는 중입니다...</p>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">로그인 실패</p>
            </div>
            <p className="text-sm text-gray-600 max-w-xs mx-auto">{error}</p>
            <button
              type="button"
              className="mt-2 px-4 py-2 rounded-md bg-purple-600 text-white text-sm"
              onClick={() => router.replace('/login')}
            >
              로그인 페이지로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


