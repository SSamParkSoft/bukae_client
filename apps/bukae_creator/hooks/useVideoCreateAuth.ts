'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authStorage } from '@/lib/api/auth-storage'
import { authApi } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'

/**
 * 비디오 생성 페이지에서 사용하는 공통 인증 hook
 * 모든 step(step1~step5)에서 동일하게 사용
 * 
 * @returns isValidatingToken - 토큰 검증 중인지 여부
 */
export function useVideoCreateAuth() {
  const router = useRouter()
  const [isValidatingToken, setIsValidatingToken] = useState(true)

  useEffect(() => {
    const validateToken = async () => {
      try {
        const token = authStorage.getAccessToken()
        if (!token) {
          router.replace('/login')
          return
        }

        // 토큰 유효성 검증
        await authApi.getCurrentUser()
        setIsValidatingToken(false)
      } catch (error) {
        // ApiError인 경우에만 상태 코드 확인
        if (error instanceof ApiError && error.status === 401) {
          // 401 에러인 경우: apiRequest에서 이미 auth:expired 이벤트를 발생시켰으므로
          // AuthSync가 자동으로 처리함 (토큰 정리 + 로그인 페이지 리다이렉트)
          // 여기서는 조용히 처리하고 검증 상태는 유지 (AuthSync가 리다이렉트할 것임)
          // 하지만 리다이렉트가 즉시 일어나지 않을 수 있으므로 짧은 딜레이 후에도 리다이렉트되지 않으면 검증 상태 해제
          setTimeout(() => {
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
              setIsValidatingToken(false)
            }
          }, 1000)
          return
        }
        
        // 401이 아닌 에러 (네트워크 에러, 타임아웃 등)는 검증 상태만 해제
        // 사용자가 계속 시도할 수 있도록 페이지는 표시
        console.error('[useVideoCreateAuth] 토큰 검증 실패 (401 아님):', error)
        setIsValidatingToken(false)
      }
    }

    validateToken()
  }, [router])

  return {
    isValidatingToken,
  }
}

