// Auth API 타입 정의

export interface EmailVerificationRequest {
  email: string
}

export interface EmailVerifyRequest {
  email: string
  code: string
}

export interface SignUpRequest {
  email: string
  name: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
}

