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
  // 예: http://15.164.220.105.nip.io:8080
  const base =
    (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://15.164.220.105.nip.io:8080').trim()

  // 배포 환경에서 env가 localhost로 잘못 들어간 경우를 즉시 감지해서 안내
  // (Next.js NEXT_PUBLIC_* 는 빌드 타임에 번들에 박히기 쉬워 실수가 잦음)
  if (!isRunningOnLocalhost() && isLocalhostUrl(base)) {
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

      const data = (await response.json()) as Partial<TokenResponse> | null
      if (!data?.accessToken) return null

      // refreshToken이 없으면 기존 refreshToken 유지 (백엔드가 rotation을 안 할 수도 있음)
      authStorage.setTokens(data.accessToken, data.refreshToken ?? refreshToken)
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
  const { skipAuth = false, autoRefresh = true, headers: initHeaders, ...fetchOptions } = options

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

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    // 토큰 만료(401) 시 1회 자동 재발급 후 재시도
    if (response.status === 401 && !skipAuth && autoRefresh) {
      const newAccessToken = await refreshAccessToken()

      if (newAccessToken) {
        headers.set('Authorization', `Bearer ${newAccessToken}`)
        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers,
        })
        
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
    // ApiError가 이미 발생한 경우 (401 포함) 그대로 throw
    if (error instanceof ApiError) {
      throw error
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

