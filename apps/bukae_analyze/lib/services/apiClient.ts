import { useAuthStore } from '@/store/useAuthStore'
import { ApiResponseError, refreshToken } from './auth'
import { clearServerAccessToken, syncServerAccessToken } from './authSession'
import { apiFetchWithToken } from './apiFetchCore'
import type { ApiFetcher } from './apiFetchCore'

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
  const { accessToken, setAccessToken, clearToken } = useAuthStore.getState()

  if (!accessToken) throw new Error('인증 토큰이 없습니다')

  const res = await apiFetchWithToken(accessToken, url, options)

  if (res.status !== 401) return res

  // 401 → 토큰 재발급 후 1회 재시도
  // TODO(analyze-auth): cookie-first로 전환하면 refresh와 재시도도 서버/BFF 쪽으로 옮기고,
  // 클라이언트 store accessToken 의존을 줄인다.
  try {
    const refreshed = await refreshToken()
    setAccessToken(refreshed.accessToken)
    await syncServerAccessToken(refreshed.accessToken).catch(() => {})
    const retryRes = await apiFetchWithToken(refreshed.accessToken, url, options)
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
      clearToken()
    }
    throw err
  }
}
