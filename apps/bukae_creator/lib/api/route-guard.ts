import { NextResponse } from 'next/server'
import { getUserFromAccessToken } from '@/lib/api/supabase-server'

export type RequireUserResult = {
  userId: string
  accessToken: string
  authSource: 'supabase' | 'backend'
}

export function getBearerToken(request: Request): string | null {
  const raw = request.headers.get('authorization') ?? request.headers.get('Authorization')
  if (!raw) return null
  const m = raw.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() || null
}

export function getRequestIp(request: Request): string | null {
  // Vercel/Proxy 환경에서 가장 흔한 헤더 우선순위
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const fwd = request.headers.get('x-forwarded-for')
  if (!fwd) return null
  const first = fwd.split(',')[0]?.trim()
  return first || null
}

function isRunningOnLocalhost(): boolean {
  // 서버 사이드에서는 환경 변수로 판단
  if (typeof window === 'undefined') {
    const nodeEnv = process.env.NODE_ENV
    return nodeEnv === 'development'
  }
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function strEnv(name: string, fallback: string): string {
  const raw = process.env[name]
  return raw?.trim() ? raw.trim() : fallback
}

// 토큰 기반 캐시 (같은 요청 내에서 중복 호출 방지)
// 짧은 시간(1초) 동안 같은 토큰에 대한 결과를 캐싱
const tokenCache = new Map<string, { userId: string | null; timestamp: number }>()

async function getBackendUserIdFromAccessToken(accessToken: string): Promise<string | null> {
  // 개발 환경에서 mock 테스트 계정 토큰 허용
  if (isRunningOnLocalhost() && accessToken.startsWith('dev_test_admin_token_')) {
    return 'dev-test-admin-id'
  }

  // 캐시 확인 (1초 이내의 결과 재사용)
  const cached = tokenCache.get(accessToken)
  if (cached && Date.now() - cached.timestamp < 1000) {
    return cached.userId
  }

  // 프론트에서 쓰는 base url과 동일 규칙 사용
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  
  // 로컬 개발 환경에서만 기본값 허용
  const isLocal = isRunningOnLocalhost()
  const API_BASE_URL = envUrl || (isLocal ? 'http://15.164.220.105.nip.io:8080' : null)

  if (!API_BASE_URL) {
    throw new Error(
      '환경 변수 NEXT_PUBLIC_API_BASE_URL이 설정되어 있지 않습니다. 프로덕션 환경에서는 반드시 설정해야 합니다.'
    )
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      // 실패한 경우도 캐시에 저장하여 짧은 시간 동안 재시도 방지
      tokenCache.set(accessToken, { userId: null, timestamp: Date.now() })
      return null
    }
    const data = (await res.json().catch(() => null)) as { id?: unknown } | null
    const id = typeof data?.id === 'string' ? data.id : null
    const userId = id && id.trim() ? id.trim() : null
    
    // 캐시에 저장
    tokenCache.set(accessToken, { userId, timestamp: Date.now() })
    
    return userId
  } catch {
    // 에러 발생 시에도 캐시에 저장하여 짧은 시간 동안 재시도 방지
    tokenCache.set(accessToken, { userId: null, timestamp: Date.now() })
    return null
  }
}

// 주기적으로 오래된 캐시 항목 정리 (메모리 누수 방지)
if (typeof globalThis !== 'undefined') {
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [token, value] of tokenCache.entries()) {
      if (now - value.timestamp > 5000) {
        // 5초 이상 된 캐시 항목 삭제
        tokenCache.delete(token)
      }
    }
  }, 10000) // 10초마다 정리

  // Node.js 환경에서만 clearInterval 사용 가능
  if (typeof process !== 'undefined' && process.on) {
    process.on('SIGTERM', () => clearInterval(cleanupInterval))
    process.on('SIGINT', () => clearInterval(cleanupInterval))
  }
}

export async function requireUser(request: Request): Promise<RequireUserResult | NextResponse> {
  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
    )
  }

  // 개발 환경에서는 Supabase 검증을 건너뛰고 백엔드 OAuth 토큰만 사용
  if (isRunningOnLocalhost()) {
    // 백엔드 OAuth 토큰 검증만 수행 (구글 계정의 실제 토큰)
    const backendUserId = await getBackendUserIdFromAccessToken(token)
    if (backendUserId) {
      return { userId: backendUserId, accessToken: token, authSource: 'backend' }
    }
    
    // 개발 환경에서 백엔드 토큰 검증 실패 시 에러
    return NextResponse.json(
      { error: '인증 정보가 유효하지 않습니다. 다시 로그인해주세요.' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' } }
    )
  }

  // 프로덕션 환경에서는 기존 로직 유지
  // 1) Supabase 토큰 검증 우선
  const supabaseUser = await getUserFromAccessToken(token)
  if (supabaseUser) {
    return { userId: supabaseUser.id, accessToken: token, authSource: 'supabase' }
  }

  // 2) 백엔드 OAuth 토큰 검증(backend authStorage source 대응)
  const backendUserId = await getBackendUserIdFromAccessToken(token)
  if (backendUserId) {
    return { userId: backendUserId, accessToken: token, authSource: 'backend' }
  }

  return NextResponse.json(
    { error: '인증 정보가 유효하지 않습니다. 다시 로그인해주세요.' },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' } }
  )
}


