// 공통 API 클라이언트

import { authStorage } from './auth-storage'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

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

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
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

    // 네트워크 에러 또는 서버 미실행 시 사용자 친화적 메시지
    if (response.status === 0 || response.type === 'opaque') {
      errorMessage = '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.'
    } else if (response.status >= 500) {
      errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
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

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: initHeaders, ...fetchOptions } = options

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

    return handleResponse<T>(response)
  } catch (error) {
    // 네트워크 에러 처리
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.',
        0,
        'Network Error'
      )
    }

    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
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

