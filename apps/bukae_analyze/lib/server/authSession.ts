import 'server-only'

import { cookies } from 'next/headers'
import type { CurrentUser } from '@/lib/services/auth'
import { ApiResponseError, fetchCurrentUserWithToken } from '@/lib/services/auth'
import { SERVER_ACCESS_TOKEN_COOKIE } from '@/lib/auth/sessionCookie'

export async function getServerAccessToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SERVER_ACCESS_TOKEN_COOKIE)?.value ?? null
}

export async function getServerCurrentUser(): Promise<CurrentUser | null> {
  const accessToken = await getServerAccessToken()

  if (!accessToken) {
    return null
  }

  try {
    return await fetchCurrentUserWithToken(accessToken)
  } catch (error) {
    if (
      error instanceof ApiResponseError &&
      (error.status === 401 || error.status === 403)
    ) {
      return null
    }

    console.error('[getServerCurrentUser] failed:', error)
    throw error
  }
}
