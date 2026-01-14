// 토큰 저장소 관리

const ACCESS_TOKEN_KEY = 'bookae_access_token'
const REFRESH_TOKEN_KEY = 'bookae_refresh_token'
const AUTH_SOURCE_KEY = 'bookae_auth_source'
const TOKEN_TIMESTAMP_KEY = 'bookae_token_timestamp'

// 액세스 토큰 만료 시간 (6분 = 360000ms)
export const TOKEN_EXPIRY_MS = 360000

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
    
    // 토큰 저장 시점 기록 (리프레시용)
    localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString())

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
    localStorage.removeItem(TOKEN_TIMESTAMP_KEY)
  },

  hasTokens(): boolean {
    return !!this.getAccessToken()
  },

  /**
   * 토큰이 저장된 후 경과한 시간(ms) 반환
   */
  getTokenAge(): number | null {
    if (typeof window === 'undefined') return null
    const timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY)
    if (!timestamp) return null
    return Date.now() - parseInt(timestamp, 10)
  },

  /**
   * 토큰이 곧 만료될 예정인지 확인 (5분 경과 시 true)
   */
  shouldRefreshToken(): boolean {
    const age = this.getTokenAge()
    if (age === null) return false
    // 5분 = 300000ms 경과 시 리프레시 필요
    return age >= 300000
  },

  /**
   * 토큰이 이미 만료되었는지 확인 (6분 이상 경과 시 true)
   */
  isTokenExpired(): boolean {
    const age = this.getTokenAge()
    if (age === null) return false
    // 6분 = 360000ms 이상 경과 시 만료
    return age >= TOKEN_EXPIRY_MS
  },

  /**
   * 토큰 타임스탬프만 업데이트 (리프레시 실패 시 무한 루프 방지용)
   * 토큰은 그대로 유지하고 타임스탬프만 현재 시간으로 갱신
   */
  updateTokenTimestamp(): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString())
  },
}

