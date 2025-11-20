// Auth API React Query Hooks

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api/auth'
import type {
  EmailVerificationRequest,
  EmailVerifyRequest,
  SignUpRequest,
  LoginRequest,
} from '@/lib/types/api/auth'

export const useSendVerificationEmail = () => {
  return useMutation({
    mutationFn: (email: string) => authApi.sendVerificationEmail(email),
  })
}

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      authApi.verifyEmail(email, code),
  })
}

export const useSignUp = () => {
  return useMutation({
    mutationFn: (data: SignUpRequest) => authApi.signUp(data),
  })
}

export const useLogin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: () => {
      // 로그인 성공 시 관련 쿼리 무효화
      queryClient.invalidateQueries()
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()

  return () => {
    authApi.logout()
    // 모든 쿼리 무효화 및 캐시 클리어
    queryClient.clear()
  }
}

