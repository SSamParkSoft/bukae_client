'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useProjectStore } from '@/store/useProjectStore'
import { logout } from '@/lib/services/auth'

export interface HeaderProfileState {
  name: string
  profileImageUrl: string | null
  handleLogout: () => Promise<void>
}

export function useHeaderProfile(): HeaderProfileState {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { accessToken, clearToken } = useAuthStore.getState()
  const clearProject = useProjectStore((s) => s.clearProject)

  const handleLogout = async () => {
    if (accessToken) {
      await logout(accessToken).catch(() => {})
    }
    clearToken()
    clearProject()
    router.replace('/login')
  }

  return {
    name: user?.name ?? '',
    profileImageUrl: user?.profileImageUrl ?? null,
    handleLogout,
  }
}
