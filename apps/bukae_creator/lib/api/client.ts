// 공통 API 클라이언트

import { authStorage } from './auth-storage'
import type { TokenResponse } from '@/lib/types/api/auth'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url.trim())
}

function isRunningOnLocalhost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function getApiBaseUrl(): string {
  // 백엔드 API 서버 기본 주소 (도메인 + 포트까지, path 제외)
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  
  // 로컬 개발 환경에서만 기본값 허용
  const isLocal = isRunningOnLocalhost()
  const base = envUrl || (isLocal ? 'http://15.164.220.105.nip.io:8080' : null)

  if (!base) {
    throw new ApiError(
      '환경 변수 NEXT_PUBLIC_API_BASE_URL이 설정되어 있지 않습니다. 프로덕션 환경에서는 반드시 설정해야 합니다.',
      0,
      'Config Error'
    )
  }

  // 배포 환경에서 env가 localhost로 잘못 들어간 경우를 즉시 감지해서 안내
  // (Next.js NEXT_PUBLIC_* 는 빌드 타임에 번들에 박히기 쉬워 실수가 잦음)
  if (!isLocal && isLocalhostUrl(base)) {
    throw new ApiError(
      '배포 환경 설정 오류: NEXT_PUBLIC_API_BASE_URL이 localhost로 설정되어 있습니다. 배포 환경 변수 값을 실제 백엔드 주소로 변경 후 재배포해주세요.',
      0,
      'Config Error'
    )
  }

  return base
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
  autoRefresh?: boolean
  timeout?: number // 타임아웃 시간 (밀리초, 기본값: 60000ms = 60초)
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `요청 실패: ${response.status} ${response.statusText}`
    let errorData: unknown

    try {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        errorData = await response.json()
        if (typeof errorData === 'object' && errorData !== null) {
          if ('message' in errorData && typeof errorData.message === 'string') {
            errorMessage = errorData.message
          } else if ('error' in errorData && typeof errorData.error === 'string') {
            errorMessage = errorData.error
          }
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        }
      } else {
        errorData = await response.text()
        if (typeof errorData === 'string' && errorData) {
          errorMessage = errorData
        }
      }
    } catch {
      // 응답 파싱 실패 시 기본 메시지 사용
    }

    // 401 에러인 경우 즉시 로그아웃 처리
    if (response.status === 401) {
      authStorage.clearTokens()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'))
      }
    }

    // 네트워크 에러 또는 서버 미실행 시 사용자 친화적 메시지
    if (response.status === 0 || response.type === 'opaque') {
      errorMessage = '서버에 연결할 수 없어요. 백엔드 서버가 실행 중인지 확인해주세요.'
    } else if (response.status >= 500) {
      errorMessage = '서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
    }

    throw new ApiError(errorMessage, response.status, response.statusText, errorData)
  }

  // 204 No Content 등 빈 응답 처리
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return response.json()
  }

  return response.text() as T
}

let refreshInFlight: Promise<string | null> | null = null
let refreshIntervalId: NodeJS.Timeout | null = null
let refreshFocusHandler: (() => void) | null = null
let refreshVisibilityHandler: (() => void) | null = null
let consecutiveRefreshFailures = 0 // 연속 리프레시 실패 횟수

// 사전 리프레시 체크 간격 (1분마다 체크)
const REFRESH_CHECK_INTERVAL = 60000
// 최대 연속 실패 횟수 (3회 실패 시 로그아웃)
const MAX_CONSECUTIVE_FAILURES = 3

/**
 * 토큰 리프레시 체크 및 실행
 */
async function checkAndRefreshToken(): Promise<void> {
  if (!authStorage.hasTokens()) {
    stopTokenRefreshScheduler()
    consecutiveRefreshFailures = 0
    return
  }

  const age = authStorage.getTokenAge()
  
  // 토큰이 이미 만료된 경우 즉시 리프레시 시도
  if (age !== null && authStorage.isTokenExpired()) {
    console.log(`[Token Refresh] 토큰 만료 감지 - 즉시 리프레시 시도 (${Math.floor(age / 1000)}초 경과)`)
    const result = await refreshAccessToken()
    if (!result) {
      consecutiveRefreshFailures++
      console.log(`[Token Refresh] 리프레시 실패 (${consecutiveRefreshFailures}/${MAX_CONSECUTIVE_FAILURES})`)
      
      // 연속 실패 횟수가 최대치를 넘으면 로그아웃 처리
      if (consecutiveRefreshFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.log('[Token Refresh] 연속 리프레시 실패로 인한 로그아웃 처리')
        authStorage.clearTokens()
        consecutiveRefreshFailures = 0
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:expired'))
        }
        return
      }
      
      // 실패했지만 아직 재시도 가능한 경우, 타임스탬프를 현재 시간으로 업데이트하여
      // 다음 체크까지 최소한의 시간이 지나도록 함 (무한 루프 방지)
      // 현재 토큰을 유지하되 타임스탬프만 업데이트
      const currentToken = authStorage.getAccessToken()
      const currentRefreshToken = authStorage.getRefreshToken()
      if (currentToken && currentRefreshToken) {
        // 타임스탬프만 업데이트 (토큰은 그대로 유지)
        authStorage.updateTokenTimestamp()
      }
    } else {
      // 리프레시 성공 시 실패 횟수 리셋
      consecutiveRefreshFailures = 0
    }
    return
  }
  
  // 토큰이 5분 경과했는지 확인 (사전 리프레시)
  if (age !== null && age >= 300000) {
    console.log(`[Token Refresh] 사전 리프레시 시작 (${Math.floor(age / 1000)}초 경과)`)
    const result = await refreshAccessToken()
    if (!result) {
      consecutiveRefreshFailures++
      console.log(`[Token Refresh] 리프레시 실패 (${consecutiveRefreshFailures}/${MAX_CONSECUTIVE_FAILURES}) - 다음 체크에서 재시도합니다.`)
      
      // 연속 실패 횟수가 최대치를 넘으면 로그아웃 처리
      if (consecutiveRefreshFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.log('[Token Refresh] 연속 리프레시 실패로 인한 로그아웃 처리')
        authStorage.clearTokens()
        consecutiveRefreshFailures = 0
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:expired'))
        }
        return
      }
      
      // 실패했지만 아직 재시도 가능한 경우, 타임스탬프를 현재 시간으로 업데이트하여
      // 다음 체크까지 최소한의 시간이 지나도록 함 (무한 루프 방지)
      const currentToken = authStorage.getAccessToken()
      const currentRefreshToken = authStorage.getRefreshToken()
      if (currentToken && currentRefreshToken) {
        // 타임스탬프만 업데이트 (토큰은 그대로 유지)
        if (typeof window !== 'undefined') {
          localStorage.setItem('bookae_token_timestamp', Date.now().toString())
        }
      }
    } else {
      // 리프레시 성공 시 실패 횟수 리셋
      consecutiveRefreshFailures = 0
    }
  }
}

/**
 * 토큰 사전 리프레시 스케줄러 시작
 */
export function startTokenRefreshScheduler(): void {
  if (typeof window === 'undefined') return
  if (refreshIntervalId) return // 이미 실행 중

  // 즉시 한 번 체크 (페이지 로드 시 또는 돌아왔을 때)
  void checkAndRefreshToken()

  // 주기적으로 체크
  refreshIntervalId = setInterval(() => {
    void checkAndRefreshToken()
  }, REFRESH_CHECK_INTERVAL)

  // 페이지 포커스 시 즉시 체크 (탭 전환 후 돌아왔을 때)
  refreshFocusHandler = () => {
    void checkAndRefreshToken()
  }

  // 페이지 visibility 변경 시 체크 (백그라운드에서 돌아왔을 때)
  refreshVisibilityHandler = () => {
    if (!document.hidden) {
      void checkAndRefreshToken()
    }
  }

  window.addEventListener('focus', refreshFocusHandler)
  document.addEventListener('visibilitychange', refreshVisibilityHandler)
}

/**
 * 토큰 사전 리프레시 스케줄러 중지
 */
export function stopTokenRefreshScheduler(): void {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId)
    refreshIntervalId = null
  }

  // 이벤트 리스너 정리
  if (refreshFocusHandler) {
    window.removeEventListener('focus', refreshFocusHandler)
    refreshFocusHandler = null
  }

  if (refreshVisibilityHandler) {
    document.removeEventListener('visibilitychange', refreshVisibilityHandler)
    refreshVisibilityHandler = null
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const API_BASE_URL = getApiBaseUrl()
    const refreshToken = authStorage.getRefreshToken()
    if (!refreshToken) return null

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) return null

      const data = (await response.json()) as TokenResponse | null
      if (!data?.accessToken || !data?.refreshToken) {
        // RTR 정책에 따라 refreshToken이 필수이므로 없으면 실패 처리
        console.error('[Token Refresh] RTR 정책 위반: 새 refreshToken이 반환되지 않았습니다.')
        return null
      }

      // RTR 정책: 두 토큰을 모두 갱신
      authStorage.setTokens(data.accessToken, data.refreshToken)
      return data.accessToken
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, autoRefresh = true, timeout = 60000, headers: initHeaders, ...fetchOptions } = options

  const API_BASE_URL = getApiBaseUrl()
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

  const headers = new Headers({
    'Content-Type': 'application/json',
  })

  if (initHeaders) {
    new Headers(initHeaders).forEach((value, key) => {
      headers.set(key, value)
    })
  }

  // 인증 토큰 추가
  if (!skipAuth) {
    const accessToken = authStorage.getAccessToken()
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
  }

  // AbortController를 사용한 타임아웃 설정
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })

    // 타임아웃 정리
    clearTimeout(timeoutId)

    // 토큰 만료(401) 시 1회 자동 재발급 후 재시도
    if (response.status === 401 && !skipAuth && autoRefresh) {
      const newAccessToken = await refreshAccessToken()

      if (newAccessToken) {
        headers.set('Authorization', `Bearer ${newAccessToken}`)
        // 재시도 시에도 타임아웃 설정
        const retryController = new AbortController()
        const retryTimeoutId = setTimeout(() => retryController.abort(), timeout)
        try {
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers,
            signal: retryController.signal,
          })
          clearTimeout(retryTimeoutId)
        
          // 재시도 후에도 401이면 토큰 만료로 처리
          if (retryResponse.status === 401) {
            authStorage.clearTokens()
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:expired'))
            }
            throw new ApiError(
              '인증이 만료되었어요. 다시 로그인해주세요.',
              401,
              'Unauthorized'
            )
          }
          
          return handleResponse<T>(retryResponse)
        } catch (retryError) {
          clearTimeout(retryTimeoutId)
          if (retryError instanceof ApiError) {
            throw retryError
          }
          // AbortError (타임아웃) 처리
          if (retryError instanceof Error && retryError.name === 'AbortError') {
            throw new ApiError(
              `요청 시간이 초과되었어요. (${timeout / 1000}초)`,
              0,
              'Timeout'
            )
          }
          throw retryError
        }
      }

      // 재발급 실패: 토큰 정리 + 전역 이벤트로 로그인 유도
      authStorage.clearTokens()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'))
      }
      
      throw new ApiError(
        '인증이 만료되었습니다. 다시 로그인해주세요.',
        401,
        'Unauthorized'
      )
    }

    // 401 에러인데 재발급을 시도하지 않은 경우 (skipAuth=true 또는 autoRefresh=false)
    // handleResponse에서 처리하므로 여기서는 바로 넘김
    return handleResponse<T>(response)
  } catch (error) {
    // 타임아웃 정리 (에러 발생 시에도)
    clearTimeout(timeoutId)

    // ApiError가 이미 발생한 경우 (401 포함) 그대로 throw
    if (error instanceof ApiError) {
      throw error
    }

    // AbortError (타임아웃) 처리
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        `요청 시간이 초과되었어요. (${timeout / 1000}초)`,
        0,
        'Timeout'
      )
    }

    // 네트워크 에러 처리
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        '서버에 연결할 수 없어요. 백엔드 서버가 실행 중인지 확인해주세요.',
        0,
        'Network Error'
      )
    }

    // 예상치 못한 에러 로깅
    console.error('[API Client] 예상치 못한 에러:', error)
    
    throw new ApiError(
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      0,
      'Unknown Error'
    )
  }
}

// 편의 메서드들
export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}

