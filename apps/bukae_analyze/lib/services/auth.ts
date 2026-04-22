import { z } from 'zod'
import { TokenResponseSchema, type ApiTokenResponse } from '@/lib/types/api/auth'
import { API_ENDPOINTS } from './endpoints'

export async function logout(accessToken: string): Promise<void> {
  const res = await fetch(API_ENDPOINTS.auth.logout, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('로그아웃 실패')
}

export async function refreshToken(): Promise<ApiTokenResponse> {
  const res = await fetch(API_ENDPOINTS.auth.refresh, { method: 'POST' })
  if (!res.ok) throw new Error('토큰 재발급 실패')
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

export async function fetchCurrentUser(accessToken: string): Promise<CurrentUser> {
  const res = await fetch(API_ENDPOINTS.users.me, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('사용자 정보 조회 실패')
  const data = CurrentUserSchema.parse(await res.json())
  return {
    name: data.nickname ?? data.name,
    profileImageUrl: data.profileImageUrl ?? null,
  }
}
