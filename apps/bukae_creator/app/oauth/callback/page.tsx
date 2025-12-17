'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { authStorage } from '@/lib/api/auth-storage'
import { useUserStore } from '@/store/useUserStore'
import { authApi } from '@/lib/api/auth'

export default function OAuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useUserStore((state) => state.setUser)
  const checkAuth = useUserStore((state) => state.checkAuth)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL 파라미터에서 토큰 추출 (백엔드가 리다이렉트할 때 전달)
        const accessToken = searchParams.get('accessToken')
        const refreshToken = searchParams.get('refreshToken')
        const errorParam = searchParams.get('error')

        // 에러가 있는 경우
        if (errorParam) {
          throw new Error(errorParam || '로그인 중 오류가 발생했습니다.')
        }

        // 토큰이 URL 파라미터로 전달된 경우
        if (accessToken && refreshToken) {
          authStorage.setTokens(accessToken, refreshToken, { source: 'backend' })
        } else if (accessToken) {
          // accessToken만 있는 경우: refreshToken 없이 저장 (재발급 불가하므로 추후 만료 시 재로그인 필요)
          authStorage.setTokens(accessToken, null, { source: 'backend' })
        } else {
          // 쿠키에서 토큰을 확인하거나, 백엔드가 다른 방식으로 전달할 수 있음
          // 여기서는 URL 파라미터를 우선으로 하고, 없으면 에러 처리
          throw new Error('토큰 정보를 찾을 수 없습니다. 다시 로그인해주세요.')
        }

        // 토큰 저장 후 즉시 인증 상태 업데이트
        checkAuth()

        // 백엔드 API로 사용자 정보 조회
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

          // 사용자 정보 설정 후 다시 한 번 인증 상태 확인
          checkAuth()
        } catch (userInfoError) {
          // 사용자 정보 조회 실패 시에도 토큰은 저장되어 있으므로 계속 진행
          console.error('[OAuth Callback] 사용자 정보 조회 실패:', userInfoError)
          // 토큰은 저장되어 있으므로 인증 상태만 업데이트하고 진행
          checkAuth()
        }

        // URL 파라미터 제거하고 홈으로 리다이렉트
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
  }, [router, setUser, checkAuth, searchParams])

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

