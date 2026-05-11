import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SERVER_ACCESS_TOKEN_COOKIE } from '@/lib/auth/sessionCookie'

const UPSTREAM_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

function createCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}

export async function POST() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(SERVER_ACCESS_TOKEN_COOKIE)?.value

  if (accessToken) {
    await fetch(`${UPSTREAM_BASE}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {})
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SERVER_ACCESS_TOKEN_COOKIE, '', {
    ...createCookieOptions(),
    maxAge: 0,
  })
  return response
}
