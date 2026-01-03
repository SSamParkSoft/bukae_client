/**
 * Auth API DTO (Data Transfer Object) 정의
 * 
 * 이 파일의 타입들은 백엔드 API와의 통신을 위한 DTO입니다.
 */

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

