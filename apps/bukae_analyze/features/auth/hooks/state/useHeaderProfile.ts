'use client'

import { useRouter } from 'next/navigation'
import type { CurrentUser } from '@/lib/services/auth'
import { useAuthStore } from '@/store/useAuthStore'
import { logout } from '@/lib/services/auth'
import { clearServerAccessToken } from '@/lib/services/authSession'

export interface HeaderProfileState {
  name: string
  profileImageUrl: string | null
  handleLogout: () => Promise<void>
}

export function useHeaderProfile(
  initialUser: CurrentUser | null = null
): HeaderProfileState {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { accessToken, clearAnalyzeWorkflow, clearToken } = useAuthStore.getState()
  const resolvedUser = user ?? initialUser

  const handleLogout = async () => {
    if (accessToken) {
      await logout(accessToken).catch(() => {})
    }
    await clearServerAccessToken().catch(() => {})
    clearAnalyzeWorkflow()
    clearToken()
    router.replace('/login')
  }

  return {
    name: resolvedUser?.name ?? '',
    profileImageUrl: resolvedUser?.profileImageUrl ?? null,
    handleLogout,
  }
}
