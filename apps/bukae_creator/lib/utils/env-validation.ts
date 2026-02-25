// 환경 변수 검증 유틸리티
// 프로덕션 환경에서 필수 환경 변수가 설정되어 있는지 확인

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function _isLocalhost(): boolean {
  // 서버 사이드에서는 환경 변수로 판단
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'development'
  }
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

/**
 * 프로덕션 환경에서 필수 환경 변수를 검증합니다.
 * 환경 변수가 없으면 에러를 throw합니다.
 */
export function validateRequiredEnvVars(): void {
  if (!isProduction()) {
    // 개발 환경에서는 검증하지 않음
    return
  }

  const requiredVars: Array<{ name: string; value: string | undefined }> = [
    { name: 'NEXT_PUBLIC_API_BASE_URL', value: process.env.NEXT_PUBLIC_API_BASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  ]

  const missingVars = requiredVars
    .filter(({ value }) => !value || !value.trim())
    .map(({ name }) => name)

  if (missingVars.length > 0) {
    throw new Error(
      `프로덕션 환경에서 필수 환경 변수가 설정되어 있지 않습니다: ${missingVars.join(', ')}`
    )
  }
}

/**
 * API 라우트에서 사용할 수 있는 환경 변수 검증 미들웨어
 * 프로덕션 환경에서만 검증합니다.
 */
export function requireEnvVars(): void {
  validateRequiredEnvVars()
}

