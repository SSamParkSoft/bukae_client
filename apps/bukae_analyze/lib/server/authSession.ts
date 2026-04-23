import 'server-only'

import { cookies } from 'next/headers'
import type { CurrentUser } from '@/lib/services/auth'
import { fetchCurrentUserWithToken } from '@/lib/services/auth'
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
  } catch {
    return null
  }
}
