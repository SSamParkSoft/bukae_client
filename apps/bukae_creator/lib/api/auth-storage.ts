// 토큰 저장소 관리

const ACCESS_TOKEN_KEY = 'bookae_access_token'
const REFRESH_TOKEN_KEY = 'bookae_refresh_token'
const AUTH_SOURCE_KEY = 'bookae_auth_source'
const TOKEN_TIMESTAMP_KEY = 'bookae_token_timestamp'
const VIDEO_CREATE_STORAGE_KEY = 'bookae-video-create-storage'
const CURRENT_VIDEO_JOB_ID_KEY = 'currentVideoJobId'

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
    options?: { source?: AuthSource; expiresIn?: number }
  ): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    
    // 토큰 저장 시점 기록 (리프레시용)
    localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString())
    
    // 토큰 만료 시간 저장 (초 단위, 선택적)
    if (options?.expiresIn) {
      localStorage.setItem('bookae_token_expires_in', options.expiresIn.toString())
    } else {
      // 기본값: 30분 (1800초) - 백엔드 응답에 없을 경우
      localStorage.setItem('bookae_token_expires_in', '1800')
    }

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
    // 인증이 해제되면 creator 임시 상태도 함께 정리
    localStorage.removeItem(VIDEO_CREATE_STORAGE_KEY)
    localStorage.removeItem(CURRENT_VIDEO_JOB_ID_KEY)
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
   * 토큰이 곧 만료될 예정인지 확인
   * accessExpiresIn을 사용하여 정확한 만료 시간 계산
   */
  shouldRefreshToken(): boolean {
    const age = this.getTokenAge()
    if (age === null) return false
    
    // 저장된 만료 시간(초) 가져오기
    const expiresInSeconds = this.getTokenExpiresIn()
    if (expiresInSeconds) {
      // 만료 시간의 80% 경과 시 리프레시 필요 (5분 전에 리프레시)
      const expiresInMs = expiresInSeconds * 1000
      return age >= expiresInMs * 0.8
    }
    
    // 만료 시간이 없으면 기본값 사용 (5분 = 300000ms)
    return age >= 300000
  },

  /**
   * 토큰이 이미 만료되었는지 확인
   * accessExpiresIn을 사용하여 정확한 만료 시간 계산
   */
  isTokenExpired(): boolean {
    const age = this.getTokenAge()
    if (age === null) return false
    
    // 저장된 만료 시간(초) 가져오기
    const expiresInSeconds = this.getTokenExpiresIn()
    if (expiresInSeconds) {
      // 만료 시간의 90% 경과 시 만료로 간주 (안전 마진)
      const expiresInMs = expiresInSeconds * 1000
      return age >= expiresInMs * 0.9
    }
    
    // 만료 시간이 없으면 기본값 사용 (6분 = 360000ms)
    return age >= TOKEN_EXPIRY_MS
  },
  
  /**
   * 토큰 만료 시간(초) 가져오기
   */
  getTokenExpiresIn(): number | null {
    if (typeof window === 'undefined') return null
    const expiresIn = localStorage.getItem('bookae_token_expires_in')
    if (!expiresIn) return null
    const seconds = parseInt(expiresIn, 10)
    return isNaN(seconds) ? null : seconds
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
