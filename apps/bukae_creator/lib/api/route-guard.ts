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

function strEnv(name: string, fallback: string): string {
  const raw = process.env[name]
  return raw?.trim() ? raw.trim() : fallback
}

async function getBackendUserIdFromAccessToken(accessToken: string): Promise<string | null> {
  // 프론트에서 쓰는 base url과 동일 규칙 사용(없으면 기존 기본값 유지)
  const API_BASE_URL =
    strEnv('NEXT_PUBLIC_API_BASE_URL', 'http://15.164.220.105.nip.io:8080')

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json().catch(() => null)) as { id?: unknown } | null
    const id = typeof data?.id === 'string' ? data.id : null
    return id && id.trim() ? id.trim() : null
  } catch {
    return null
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


