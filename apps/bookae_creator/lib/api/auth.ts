// Auth API 함수

import { api } from './client'
import { authStorage } from './auth-storage'
import type {
  EmailVerificationRequest,
  EmailVerifyRequest,
  SignUpRequest,
  LoginRequest,
  TokenResponse,
} from '@/lib/types/api/auth'

export const authApi = {
  /**
   * 인증코드 이메일 발송
   * POST /api/email/send-verification
   */
  sendVerificationEmail: async (email: string): Promise<void> => {
    const data: EmailVerificationRequest = { email }
    return api.post<void>('/api/email/send-verification', data, { skipAuth: true })
  },

  /**
   * 이메일 인증코드 확인
   * POST /api/email/verify
   */
  verifyEmail: async (email: string, code: string): Promise<void> => {
    const data: EmailVerifyRequest = { email, code }
    return api.post<void>('/api/email/verify', data, { skipAuth: true })
  },

  /**
   * 회원가입
   * POST /api/auth/signup
   */
  signUp: async (data: SignUpRequest): Promise<void> => {
    return api.post<void>('/api/auth/signup', data, { skipAuth: true })
  },

  /**
   * 로그인
   * POST /api/auth/login
   */
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/api/auth/login', data, { skipAuth: true })
    // 로그인 성공 시 토큰 저장
    if (response.accessToken && response.refreshToken) {
      authStorage.setTokens(response.accessToken, response.refreshToken)
    }
    return response
  },

  /**
   * 로그아웃
   */
  logout: (): void => {
    authStorage.clearTokens()
  },
}

