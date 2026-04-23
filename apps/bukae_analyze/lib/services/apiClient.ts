import { useAuthStore } from '@/store/useAuthStore'
import { refreshToken } from './auth'
import { clearServerAccessToken, syncServerAccessToken } from './authSession'
import { apiFetchWithToken } from './apiFetchCore'
import type { ApiFetcher } from './apiFetchCore'

export const apiFetch: ApiFetcher = async (
  url: string,
  options: RequestInit = {}
) => {
  const { accessToken, setAccessToken, clearToken } = useAuthStore.getState()

  if (!accessToken) throw new Error('인증 토큰이 없습니다')

  const res = await apiFetchWithToken(accessToken, url, options)

  if (res.status !== 401) return res

  // 401 → 토큰 재발급 후 1회 재시도
  try {
    const refreshed = await refreshToken()
    setAccessToken(refreshed.accessToken)
    await syncServerAccessToken(refreshed.accessToken).catch(() => {})
    const retryRes = await apiFetchWithToken(refreshed.accessToken, url, options)
    if (retryRes.status === 401) {
      await clearServerAccessToken().catch(() => {})
      clearToken()
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요')
    }
    return retryRes
  } catch (err) {
    await clearServerAccessToken().catch(() => {})
    clearToken()
    throw err
  }
}
