'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
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

  const handleLogout = async () => {
    if (accessToken) {
      await logout(accessToken).catch(() => {})
    }
    clearToken()
    router.replace('/login')
  }

  return {
    name: user?.name ?? '',
    profileImageUrl: user?.profileImageUrl ?? null,
    handleLogout,
  }
}
