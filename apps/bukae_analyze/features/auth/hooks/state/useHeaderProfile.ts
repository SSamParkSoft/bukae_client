'use client'

import { useRouter } from 'next/navigation'
import type { CurrentUser } from '@/lib/services/auth'
import { useAuthStore } from '@/store/useAuthStore'
import { logout } from '@/lib/services/auth'
import { clearAnalyzeWorkflowStorage } from '@/lib/storage/analyzeWorkflowStorage'

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
  const resolvedUser = user ?? initialUser

  const handleLogout = async () => {
    const { clearUser } = useAuthStore.getState()

    await logout().catch(() => {})
    clearAnalyzeWorkflowStorage()
    clearUser()
    router.replace('/login')
  }

  return {
    name: resolvedUser?.name ?? '',
    profileImageUrl: resolvedUser?.profileImageUrl ?? null,
    handleLogout,
  }
}
