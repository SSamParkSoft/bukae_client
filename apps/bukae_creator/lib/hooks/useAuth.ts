// Auth API React Query Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api/auth'
import type { SignUpRequest, LoginRequest } from '@/lib/types/api/auth'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useAppStore } from '@/store/useAppStore'
import { authStorage } from '@/lib/api/auth-storage'

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
  const resetVideoCreate = useVideoCreateStore((state) => state.reset)
  const setProductUrl = useAppStore((state) => state.setProductUrl)

  return async () => {
    await authApi.logout()
    resetUser()
    resetVideoCreate()
    setProductUrl('')
    queryClient.clear()
  }
}

/**
 * 현재 로그인한 사용자 정보 조회
 * React Query를 사용하여 중복 호출 방지 및 캐싱
 */
export const useCurrentUser = (options?: { enabled?: boolean }) => {
  const hasTokens = authStorage.hasTokens()
  
  return useQuery({
    queryKey: ['current-user'],
    queryFn: () => authApi.getCurrentUser(),
    enabled: options?.enabled !== false && hasTokens,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // 401 에러는 재시도하지 않음
      if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
        return false
      }
      return failureCount < 2
    },
  })
}
