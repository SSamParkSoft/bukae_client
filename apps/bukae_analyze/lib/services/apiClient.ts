import { useAuthStore } from '@/store/useAuthStore'
import { refreshToken } from './auth'
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
    const retryRes = await apiFetchWithToken(refreshed.accessToken, url, options)
    if (retryRes.status === 401) {
      clearToken()
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요')
    }
    return retryRes
  } catch (err) {
    clearToken()
    throw err
  }
}
