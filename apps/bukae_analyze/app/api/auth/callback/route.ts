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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const accessToken = searchParams.get('accessToken')

  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const redirectUrl = new URL('/oauth/finalize', request.url)

  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set(
    SERVER_ACCESS_TOKEN_COOKIE,
    accessToken,
    createCookieOptions()
  )

  return response
}
