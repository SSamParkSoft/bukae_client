import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SERVER_ACCESS_TOKEN_COOKIE } from '@/lib/auth/sessionCookie'
import { captureAppError, classifyApiError } from '@/lib/monitoring/sentry'

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

  if (accessToken && UPSTREAM_BASE) {
    const logoutUrl = `${UPSTREAM_BASE}/api/v1/auth/logout`
    await fetch(logoutUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch((error) => {
      captureAppError(error, {
        flow: 'auth',
        operation: 'upstream_logout',
        errorKind: classifyApiError(error),
        level: 'warning',
        tags: {
          endpoint_group: 'auth_logout',
          method: 'POST',
        },
        context: {
          endpoint_group: 'auth_logout',
          method: 'POST',
        },
      })
      console.warn('[auth/logout] upstream logout failed:', error)
    })
  } else if (accessToken) {
    captureAppError(new Error('Logout API base URL is not configured'), {
      flow: 'auth',
      operation: 'upstream_logout',
      errorKind: 'unexpected_error',
      level: 'warning',
      tags: {
        endpoint_group: 'auth_logout',
        method: 'POST',
      },
      context: {
        endpoint_group: 'auth_logout',
        method: 'POST',
      },
    })
    console.warn('[auth/logout] NEXT_PUBLIC_API_BASE_URL is not configured')
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SERVER_ACCESS_TOKEN_COOKIE, '', {
    ...createCookieOptions(),
    maxAge: 0,
  })
  return response
}
