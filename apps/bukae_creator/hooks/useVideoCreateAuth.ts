'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authStorage } from '@/lib/api/auth-storage'
import { useCurrentUser } from '@/lib/hooks/useAuth'

/**
 * 비디오 생성 페이지에서 사용하는 공통 인증 hook
 * 모든 step(step1~step4)에서 동일하게 사용
 * 
 * @returns isValidatingToken - 토큰 검증 중인지 여부
 */
export function useVideoCreateAuth() {
  const router = useRouter()
  const hasTokens = authStorage.hasTokens()
  
  // React Query를 사용하여 토큰 검증 (중복 호출 방지)
  const { isLoading, isError, error } = useCurrentUser({
    enabled: hasTokens, // 토큰이 있을 때만 검증
  })

  useEffect(() => {
    // 토큰이 없으면 로그인 페이지로 리다이렉트
    if (!hasTokens) {
      router.replace('/login')
    }
  }, [hasTokens, router])

  // 401 에러는 apiRequest에서 이미 auth:expired 이벤트를 발생시켰으므로
  // AuthSync가 자동으로 처리함 (토큰 정리 + 로그인 페이지 리다이렉트)
  // 여기서는 조용히 처리
  useEffect(() => {
    if (isError && error) {
      const is401 = error && typeof error === 'object' && 'status' in error && error.status === 401
      if (!is401) {
        // 401이 아닌 에러 (네트워크 에러, 타임아웃 등)는 로그만 출력
        // 사용자가 계속 시도할 수 있도록 페이지는 표시
        console.error('[useVideoCreateAuth] 토큰 검증 실패 (401 아님):', error)
      }
    }
  }, [isError, error])

  return {
    isValidatingToken: hasTokens ? isLoading : false, // 토큰이 없으면 검증 완료로 처리
  }
}

