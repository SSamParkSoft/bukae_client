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
      authStorage.setTokens(data.session.access_token, data.session.refresh_token)
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

    authStorage.setTokens(session.access_token, session.refresh_token)

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    }
  },

  /**
   * Supabase 로그아웃
   */
  logout: async (): Promise<void> => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    authStorage.clearTokens()
  },

  /**
   * Google OAuth 로그인 시작
   * Supabase OAuth → /login/callback 으로 리다이렉트
   */
  loginWithGoogle: async (): Promise<void> => {
    const supabase = getSupabaseClient()

    let redirectTo: string | undefined
    if (typeof window !== 'undefined' && window.location.origin) {
      redirectTo = `${window.location.origin}/login/callback`
    } else {
      redirectTo = process.env.NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_URL
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    if (error) {
      throw new Error(mapErrorMessage(error.message))
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
}

