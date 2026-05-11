import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SERVER_ACCESS_TOKEN_COOKIE } from '@/lib/auth/sessionCookie'
import { fetchCurrentUserWithToken } from '@/lib/services/auth'

function createCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const accessToken =
    body && typeof body === 'object' && 'accessToken' in body
      ? body.accessToken
      : null

  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    return NextResponse.json(
      { message: '유효한 accessToken이 필요합니다.' },
      { status: 400 }
    )
  }

  try {
    const user = await fetchCurrentUserWithToken(accessToken)
    const response = NextResponse.json({ ok: true, user })
    response.cookies.set(SERVER_ACCESS_TOKEN_COOKIE, accessToken, createCookieOptions())
    return response
  } catch {
    return NextResponse.json(
      { message: '사용자 정보를 불러오지 못했습니다.' },
      { status: 401 }
    )
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(SERVER_ACCESS_TOKEN_COOKIE)?.value ?? null

  if (!accessToken) {
    return NextResponse.json(
      { message: '인증 토큰이 없습니다.' },
      { status: 401 }
    )
  }

  try {
    const user = await fetchCurrentUserWithToken(accessToken)
    return NextResponse.json(
      { user },
      { headers: { 'cache-control': 'no-store' } }
    )
  } catch {
    return NextResponse.json(
      { message: '사용자 정보를 불러오지 못했습니다.' },
      { status: 401 }
    )
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SERVER_ACCESS_TOKEN_COOKIE, '', {
    ...createCookieOptions(),
    maxAge: 0,
  })
  return response
}
