import { NextResponse } from 'next/server'
import { SERVER_ACCESS_TOKEN_COOKIE } from '@/lib/auth/sessionCookie'

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

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SERVER_ACCESS_TOKEN_COOKIE, accessToken, createCookieOptions())
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SERVER_ACCESS_TOKEN_COOKIE, '', {
    ...createCookieOptions(),
    maxAge: 0,
  })
  return response
}
