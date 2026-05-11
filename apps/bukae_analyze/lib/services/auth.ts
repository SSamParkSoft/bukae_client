import { z } from 'zod'
import { TokenResponseSchema, type ApiTokenResponse } from '@/lib/types/api/auth'
import { apiFetchWithToken } from './apiFetchCore'
import { API_ENDPOINTS } from './endpoints'

function resolveAuthEndpoint(path: string): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

  if (!apiBaseUrl) return path

  return new URL(path, apiBaseUrl).toString()
}

export async function logout(): Promise<void> {
  const res = await fetch('/api/auth/logout', { method: 'POST' })
  if (!res.ok) throw new Error('로그아웃 실패')
}

export async function refreshToken(): Promise<ApiTokenResponse> {
  const res = await fetch(resolveAuthEndpoint(API_ENDPOINTS.auth.refresh), {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) throw new ApiResponseError('토큰 재발급 실패', res.status)
  return TokenResponseSchema.parse(await res.json())
}

const CurrentUserSchema = z.object({
  name: z.string().optional().default(''),
  nickname: z.string().optional(),
  profileImageUrl: z.string().nullable().optional(),
})

export interface CurrentUser {
  name: string
  profileImageUrl: string | null
}

export class ApiResponseError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiResponseError'
    this.status = status
  }
}

function mapCurrentUser(data: z.infer<typeof CurrentUserSchema>): CurrentUser {
  return {
    name: data.nickname ?? data.name,
    profileImageUrl: data.profileImageUrl ?? null,
  }
}

export async function fetchCurrentUserWithToken(
  accessToken: string
): Promise<CurrentUser> {
  const res = await apiFetchWithToken(accessToken, API_ENDPOINTS.users.me)
  if (!res.ok) throw new ApiResponseError('사용자 정보 조회 실패', res.status)
  return mapCurrentUser(CurrentUserSchema.parse(await res.json()))
}

export async function fetchCurrentUser(accessToken: string): Promise<CurrentUser> {
  return fetchCurrentUserWithToken(accessToken)
}
