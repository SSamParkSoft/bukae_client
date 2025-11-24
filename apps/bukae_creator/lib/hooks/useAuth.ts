// Auth API React Query Hooks

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api/auth'
import type { SignUpRequest, LoginRequest } from '@/lib/types/api/auth'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'

const mapSupabaseUser = (user: {
  id: string
  email?: string
  created_at?: string
  user_metadata?: Record<string, unknown>
}) => {
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? ''
  const fallbackName = user.email?.split('@')[0] ?? '사용자'

  return {
    id: user.id,
    name: fullName || fallbackName,
    email: user.email ?? '',
    profileImage: user.user_metadata?.avatar_url as string | undefined,
    createdAt: user.created_at ?? new Date().toISOString(),
    accountStatus: 'active' as const,
  }
}

export const useSignUp = () => {
  return useMutation({
    mutationFn: (data: SignUpRequest) => authApi.signUp(data),
  })
}

export const useLogin = () => {
  const queryClient = useQueryClient()
  const setUser = useUserStore((state) => state.setUser)

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: async () => {
      queryClient.invalidateQueries()
      const supabase = getSupabaseClient()
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        setUser(mapSupabaseUser(userData.user))
      }
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  const resetUser = useUserStore((state) => state.reset)

  return async () => {
    await authApi.logout()
    resetUser()
    queryClient.clear()
  }
}

