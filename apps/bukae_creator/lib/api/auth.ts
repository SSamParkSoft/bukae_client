// Auth API 함수

import { getSupabaseClient } from '@/lib/supabase/client'
import { authStorage } from './auth-storage'
import { api } from './client'
import type { SignUpRequest, LoginRequest, TokenResponse } from '@/lib/types/api/auth'

const getEmailRedirectUrl = () => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return (
      process.env.NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_URL ?? `${window.location.origin}/login`
    )
  }
  return process.env.NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_URL ?? 'http://localhost:3000/login'
}

const mapErrorMessage = (message: string) => {
  if (message.includes('Invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
  if (message.includes('User already registered')) {
    return '이미 가입된 이메일입니다.'
  }
  return message
}

function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url.trim())
}

function isRunningOnLocalhost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

export const authApi = {
  /**
   * Supabase 회원가입
   */
  signUp: async ({ email, name, password }: SignUpRequest): Promise<void> => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getEmailRedirectUrl(),
        data: {
          full_name: name,
        },
      },
    })

    if (error) {
      throw new Error(mapErrorMessage(error.message))
    }

    if (data.session) {
      authStorage.setTokens(data.session.access_token, data.session.refresh_token, {
        source: 'supabase',
      })
    }
  },

  /**
   * Supabase 이메일/비밀번호 로그인
   */
  login: async ({ email, password }: LoginRequest): Promise<TokenResponse> => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(mapErrorMessage(error.message))
    }

    const session = data.session
    if (!session) {
      throw new Error('세션 정보를 가져오지 못했습니다. 다시 시도해주세요.')
    }

    authStorage.setTokens(session.access_token, session.refresh_token, {
      source: 'supabase',
    })

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    }
  },

  /**
   * 로그아웃
   * 백엔드 API를 사용하거나, 토큰만 삭제
   */
  logout: async (): Promise<void> => {
    try {
      // 백엔드에 로그아웃 요청 (선택적)
      // await api.post('/api/v1/auth/logout', {}, { skipAuth: false })
    } catch (error) {
      // 백엔드 로그아웃 실패해도 토큰은 삭제
      console.error('로그아웃 API 호출 실패:', error)
    } finally {
      // 토큰 삭제
      authStorage.clearTokens()
    }
  },

  /**
   * Google OAuth 로그인 시작
   * 백엔드 OAuth2 엔드포인트로 리다이렉트
   * 프론트엔드 콜백 URL을 redirect_uri로 전달
   */
  loginWithGoogle: async (): Promise<void> => {
    // API 서버 주소 (도메인 + 포트까지만, path 제외)
    // 환경 변수가 없으면 기본값 사용
    // 예: http://15.164.220.105.nip.io:8080
    const API_BASE_URL =
      (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://15.164.220.105.nip.io:8080').trim()

    // 배포 환경에서 env가 localhost로 잘못 들어간 경우를 즉시 감지해서 안내
    if (!isRunningOnLocalhost() && isLocalhostUrl(API_BASE_URL)) {
      throw new Error(
        '배포 환경 설정 오류: NEXT_PUBLIC_API_BASE_URL이 localhost로 설정되어 있습니다. 배포 환경 변수 값을 실제 백엔드 주소로 변경 후 재배포해주세요.'
      )
    }
    
    // 프론트엔드 콜백 URL 생성
    // 환경 변수가 있으면 우선 사용, 없으면 현재 origin 사용
    let redirectUri = ''
    const envRedirect = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI?.trim()
    if (envRedirect) {
      // 배포에서 실수로 localhost가 박힌 경우는 현재 origin 기반으로 무시
      if (!isRunningOnLocalhost() && isLocalhostUrl(envRedirect) && typeof window !== 'undefined') {
        redirectUri = `${window.location.origin}/oauth/callback`
      } else {
        redirectUri = envRedirect
      }
    } else if (typeof window !== 'undefined' && window.location.origin) {
      redirectUri = `${window.location.origin}/oauth/callback`
    } else {
      redirectUri = 'http://localhost:3000/oauth/callback'
    }
    
    // 백엔드 OAuth2 엔드포인트로 리다이렉트 (redirect_uri 파라미터 포함)
    const oauthUrl = `${API_BASE_URL}/oauth2/authorization/google?redirect_uri=${encodeURIComponent(redirectUri)}`
    
    if (typeof window !== 'undefined') {
      // 타임아웃 방지를 위해 새 창에서 열거나, 직접 리다이렉트
      console.log('[OAuth] 리다이렉트 URL:', oauthUrl)
      window.location.href = oauthUrl
    } else {
      throw new Error('브라우저 환경에서만 사용할 수 있습니다.')
    }
  },

  /**
   * 액세스 토큰 재발급
   * POST /api/v1/auth/refresh
   */
  refreshToken: async (): Promise<TokenResponse> => {
    const refreshToken = authStorage.getRefreshToken()
    if (!refreshToken) {
      throw new Error('리프레시 토큰이 없습니다. 다시 로그인해주세요.')
    }

    const response = await api.post<TokenResponse>(
      '/api/v1/auth/refresh',
      { refreshToken },
      { skipAuth: true }
    )

    // 백엔드에서 반환한 토큰으로 갱신
    authStorage.setTokens(response.accessToken, response.refreshToken)
    return response
  },

  /**
   * 현재 로그인한 사용자 정보 조회
   * GET /api/v1/users/me
   */
  getCurrentUser: async (): Promise<{
    id: string
    name: string
    email: string
    profileImage?: string
    createdAt: string
  }> => {
    return api.get<{
      id: string
      name: string
      email: string
      profileImage?: string
      createdAt: string
    }>('/api/v1/users/me')
  },
}

