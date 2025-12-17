// 토큰 저장소 관리

const ACCESS_TOKEN_KEY = 'bookae_access_token'
const REFRESH_TOKEN_KEY = 'bookae_refresh_token'
const AUTH_SOURCE_KEY = 'bookae_auth_source'

export type AuthSource = 'supabase' | 'backend'

export const authStorage = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  getAuthSource(): AuthSource | null {
    if (typeof window === 'undefined') return null
    const value = localStorage.getItem(AUTH_SOURCE_KEY)
    if (value === 'supabase' || value === 'backend') return value
    return null
  },

  setAuthSource(source: AuthSource): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(AUTH_SOURCE_KEY, source)
  },

  setTokens(
    accessToken: string,
    refreshToken?: string | null,
    options?: { source?: AuthSource }
  ): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)

    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }

    if (options?.source) {
      localStorage.setItem(AUTH_SOURCE_KEY, options.source)
    }
  },

  clearTokens(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(AUTH_SOURCE_KEY)
  },

  hasTokens(): boolean {
    return !!this.getAccessToken()
  },
}

