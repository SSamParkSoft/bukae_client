'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { authStorage } from '@/lib/api/auth-storage'
import { useUserStore } from '@/store/useUserStore'
import { useCurrentUser } from '@/lib/hooks/useAuth'
import { getMallConfigs } from '@/lib/api/mall-configs'

export default function LoginCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useUserStore((state) => state.setUser)
  const checkAuth = useUserStore((state) => state.checkAuth)
  const setPlatformTrackingIds = useUserStore((state) => state.setPlatformTrackingIds)
  const [error, setError] = useState<string | null>(null)
  const isProcessingRef = useRef(false)

  // 토큰 저장 후 사용자 정보 조회 (React Query 사용)
  const { data: userInfo, error: userError, isError, refetch: refetchUser } = useCurrentUser({
    enabled: false, // 수동으로 refetch 호출
  })

  useEffect(() => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    const handleCallback = async () => {
      try {
        // URL 파라미터에서 토큰 추출 (한 번만 읽기)
        const accessToken = searchParams.get('accessToken')
        const refreshToken = searchParams.get('refreshToken')
        const errorParam = searchParams.get('error')

        // 에러 파라미터 확인
        if (errorParam) {
          throw new Error(errorParam || '로그인 중 오류가 발생했어요.')
        }

        // 토큰이 URL 파라미터에 없으면 에러
        if (!accessToken) {
          // 이미 처리된 경우가 아니면 에러
          if (!authStorage.hasTokens()) {
            throw new Error('토큰 정보를 찾을 수 없어요. 다시 로그인해주세요.')
          }
          // 이미 토큰이 있으면 성공으로 처리
          // 사용자 정보 조회
          try {
            await refetchUser()
          } catch (refetchError) {
            console.error('[Login Callback] 사용자 정보 조회 실패:', refetchError)
          }
          return
        }

        // 토큰 저장
        authStorage.setTokens(accessToken, refreshToken || null, { source: 'backend' })

        // 보안: 토큰을 저장한 후 URL에서 제거 (비동기 작업 전에 먼저 제거)
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.delete('accessToken')
          url.searchParams.delete('refreshToken')
          url.searchParams.delete('error')
          window.history.replaceState({}, '', url.toString())
        }

        // 인증 상태 업데이트
        checkAuth()

        // React Query를 사용하여 사용자 정보 조회 (명시적으로 refetch)
        // 토큰이 저장된 후이므로 refetch 실행
        try {
          await refetchUser()
        } catch (refetchError) {
          console.error('[Login Callback] 사용자 정보 조회 실패:', refetchError)
        }
      } catch (err) {
        isProcessingRef.current = false
        const message =
          err instanceof Error
            ? err.message
            : '로그인 처리 중 오류가 발생했어요. 다시 시도해주세요.'
        setError(message)
      }
    }

    void handleCallback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // searchParams를 dependency에서 제거하여 한 번만 실행

  // 사용자 정보가 로드되면 store에 동기화
  useEffect(() => {
    if (userInfo) {
      const fallbackName = userInfo.name ?? userInfo.nickname ?? '사용자'
      const fallbackProfileImage = userInfo.profileImage ?? userInfo.profileImageUrl
      setUser({
        id: userInfo.id,
        name: fallbackName,
        email: userInfo.email,
        profileImage: fallbackProfileImage,
        createdAt: userInfo.createdAt,
        accountStatus: 'active',
      })
      checkAuth()

      // 트래킹 ID 자동 조회 (에러 발생해도 로그인은 계속 진행)
      getMallConfigs()
        .then((mallConfigs) => {
          setPlatformTrackingIds(mallConfigs)
        })
        .catch((trackingIdError) => {
          console.error('[Login Callback] 트래킹 ID 조회 실패:', trackingIdError)
          // 트래킹 ID 조회 실패해도 로그인은 정상 진행
        })

      // 홈으로 리다이렉트
      router.replace('/')
    }
  }, [userInfo, setUser, checkAuth, setPlatformTrackingIds, router])

  // 에러 처리
  useEffect(() => {
    if (isError && userError) {
      console.error('[Login Callback] 사용자 정보 조회 실패:', userError)
      checkAuth()
    }
  }, [isError, userError, checkAuth])

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


