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
  const base = envUrl || (isLocal ? process.env.NEXT_PUBLIC_API_BASE_URL : null)

  return base ?? ''
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

// 사전 리프레시 체크 간격 (5분마다 체크)
const REFRESH_CHECK_INTERVAL = 300000
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
  const expiresIn = authStorage.getTokenExpiresIn()
  
  // 디버그: 체크 상태 로그
  if (age !== null) {
    const _ageSeconds = Math.floor(age / 1000)
    const _expiresInSeconds = expiresIn || 1800
    const _shouldRefresh = authStorage.shouldRefreshToken()
    const _isExpired = authStorage.isTokenExpired()
  }
  
  // 토큰이 이미 만료된 경우 즉시 리프레시 시도
  if (age !== null && authStorage.isTokenExpired()) {
    const result = await refreshAccessToken()
    if (!result) {
      consecutiveRefreshFailures++
      
      // 연속 실패 횟수가 최대치를 넘으면 로그아웃 처리
      if (consecutiveRefreshFailures >= MAX_CONSECUTIVE_FAILURES) {
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
      if (currentToken) {
        authStorage.updateTokenTimestamp()
      }
    } else {
      consecutiveRefreshFailures = 0
    }
    return
  }
  
  // 토큰이 5분 경과했는지 확인 (사전 리프레시)
  if (age !== null && authStorage.shouldRefreshToken()) {
    const result = await refreshAccessToken()
    if (!result) {
      consecutiveRefreshFailures++
      
      // 연속 실패 횟수가 최대치를 넘으면 로그아웃 처리
      if (consecutiveRefreshFailures >= MAX_CONSECUTIVE_FAILURES) {
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
      if (currentToken) {
        authStorage.updateTokenTimestamp()
      }
    } else {
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

    if (!API_BASE_URL) {
      console.error('[Token Refresh] API_BASE_URL이 설정되지 않았습니다.')
      return null
    }

    try {
      // 로컬 개발 환경: 프록시 사용 (HTTP → HTTPS 크로스 오리진 쿠키 문제 해결)
      // 프로덕션: 직접 호출 (같은 HTTPS 도메인)
      const isLocal = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      
      const refreshUrl = isLocal 
        ? '/api/auth/refresh' // 로컬: 프록시 사용
        : `${API_BASE_URL}/api/v1/auth/refresh` // 프로덕션: 직접 호출
      
      
      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 쿠키 포함
        // body 없음 - 백엔드가 쿠키에서 refreshToken을 읽음
      })


      if (!response.ok) {
        const errorText = await response.text().catch(() => '응답을 읽을 수 없습니다.')
        console.error(`[Token Refresh] 리프레시 실패: ${response.status} ${response.statusText}`, errorText)
        return null
      }

      const data = (await response.json()) as TokenResponse | null
      if (!data?.accessToken) {
        console.error('[Token Refresh] 응답에 accessToken이 없습니다.')
        return null
      }

      // RTR 정책: 두 토큰을 모두 갱신
      // accessToken은 localStorage에 저장하고, refreshToken은 Set-Cookie 헤더로 HttpOnly 쿠키에 자동 설정됨
      // 보안: refreshToken은 localStorage에 저장하지 않음 (XSS 공격 방지)
      // 응답 body에 refreshToken이 포함되어 있지만, 쿠키로만 관리하므로 무시
      authStorage.setTokens(data.accessToken, null, {
        source: 'backend',
        expiresIn: data.accessExpiresIn,
      })
      
      
      return data.accessToken
    } catch (error) {
      console.error('[Token Refresh] 리프레시 중 예외 발생:', error)
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
      credentials: 'include', // 쿠키 포함 (refreshToken 등)
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
            credentials: 'include', // 쿠키 포함 (refreshToken 등)
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
