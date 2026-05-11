import { useAuthStore } from '@/store/useAuthStore'
import { ApiResponseError, refreshToken } from './auth'
import { syncServerAccessToken, clearServerAccessToken } from './authSession'
import { apiFetchViaProxy } from './apiFetchCore'
import type { ApiFetcher } from './apiFetchCore'

let _refreshingPromise: Promise<void> | null = null

async function refreshAndSync(): Promise<void> {
  if (_refreshingPromise) return _refreshingPromise
  _refreshingPromise = (async () => {
    try {
      const refreshed = await refreshToken()
      const user = await syncServerAccessToken(refreshed.accessToken)
      useAuthStore.getState().setUser(user)
    } finally {
      _refreshingPromise = null
    }
  })()
  return _refreshingPromise
}

function isAuthError(error: unknown): boolean {
  return (
    error instanceof ApiResponseError &&
    (error.status === 401 || error.status === 403)
  )
}

export const apiFetch: ApiFetcher = async (
  url: string,
  options: RequestInit = {}
) => {
  const res = await apiFetchViaProxy(url, options)

  if (res.status !== 401) return res

  try {
    await refreshAndSync()
    const retryRes = await apiFetchViaProxy(url, options)
    if (retryRes.status === 401) {
      throw new ApiResponseError(
        '인증이 만료되었습니다. 다시 로그인해주세요',
        retryRes.status
      )
    }
    return retryRes
  } catch (err) {
    if (isAuthError(err)) {
      await clearServerAccessToken().catch(() => {})
      useAuthStore.getState().clearToken()
    }
    throw err
  }
}
